import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ExamConfig, ExamStatus } from '../types';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from '../services/audioUtils';

interface Props {
  config: ExamConfig;
  onFinish: () => void;
}

export const OralExam: React.FC<Props> = ({ config, onFinish }) => {
  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [transcript, setTranscript] = useState<{sender: 'ai' | 'user', text: string}[]>([]);
  const [status, setStatus] = useState<ExamStatus>(ExamStatus.IDLE);
  
  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Gemini Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  // Start the session
  const startSession = async () => {
    try {
      setStatus(ExamStatus.LOADING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // Audio Setup
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setConnected(true);
            setMicActive(true);
            setStatus(ExamStatus.IN_PROGRESS);
            console.log("Gemini Live Connected");
            
            // Start Audio Streaming logic
            const ctx = inputAudioContextRef.current!;
            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(processor);
            processor.connect(ctx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcriptions
             if (message.serverContent?.outputTranscription) {
               currentOutputTranscription.current += message.serverContent.outputTranscription.text;
             } else if (message.serverContent?.inputTranscription) {
               currentInputTranscription.current += message.serverContent.inputTranscription.text;
             }
             
             if (message.serverContent?.turnComplete) {
                if (currentInputTranscription.current) {
                    setTranscript(prev => [...prev, { sender: 'user', text: currentInputTranscription.current }]);
                    currentInputTranscription.current = '';
                }
                if (currentOutputTranscription.current) {
                    setTranscript(prev => [...prev, { sender: 'ai', text: currentOutputTranscription.current }]);
                    currentOutputTranscription.current = '';
                }
             }

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
               const ctx = outputAudioContextRef.current;
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const audioBuffer = await decodeAudioData(
                 base64ToUint8Array(base64Audio),
                 ctx
               );
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(ctx.destination);
               source.onended = () => {
                 audioSourcesRef.current.delete(source);
               };
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               audioSourcesRef.current.add(source);
             }
          },
          onclose: () => {
            setConnected(false);
            console.log("Session closed");
          },
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            alert("Erro de conexão. Por favor reinicie.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
          },
          inputAudioTranscription: { model: "google_default" },
          outputAudioTranscription: { model: "google_default" },
          systemInstruction: `
            Você é o Professor Veritas, um examinador acadêmico rigoroso mas justo na área de Humanas.
            O aluno está realizando uma prova oral (sabatina).
            Disciplina: "${config.subject}".
            Período: "${config.bimester}".
            Nível: ${config.difficulty}.
            
            Seu objetivo é avaliar o pensamento crítico, não apenas a memória.
            
            INSTRUÇÕES:
            1. Fale APENAS PORTUGUÊS.
            2. Comece saudando o aluno "${config.studentName}" e faça uma pergunta inicial pertinente ao currículo típico do ${config.bimester} de ${config.subject}.
            3. Ouça a resposta. Se for rasa, peça para ele elaborar ou defender o ponto ("Por que você diz isso?", "Qual evidência histórica/social apoia isso?").
            4. Se a resposta for correta e profunda, passe para um conceito mais difícil ou relacionado.
            5. Mantenha a conversa profissional e acadêmica.
            6. Após cerca de 5 a 10 turnos de conversa, ou se eu disser "Encerrar Prova", conclua a avaliação e dê um resumo verbal da nota (0-100) e do desempenho.
          `
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setStatus(ExamStatus.IDLE);
    }
  };

  const stopSession = () => {
    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    // Disconnect audio nodes
    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
    }
    // Close audio context
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    // Close Gemini session
    if (sessionPromiseRef.current) {
       sessionPromiseRef.current.then(session => session.close());
    }
    
    setStatus(ExamStatus.COMPLETED);
  };

  // Auto-scroll transcript
  const transcriptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col">
       <div className="bg-slate-900 text-white p-4 rounded-t-xl flex justify-between items-center shadow-md z-10">
          <div>
            <h2 className="text-xl serif font-bold">Prova Oral: {config.subject}</h2>
            <p className="text-slate-400 text-sm">Aluno: {config.studentName} | Status: {connected ? 'Conectado' : 'Desconectado'}</p>
          </div>
          <div>
             {status === ExamStatus.IDLE && (
               <button onClick={startSession} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-bold transition">
                 Iniciar Sabatina
               </button>
             )}
             {status === ExamStatus.IN_PROGRESS && (
               <button onClick={stopSession} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold transition animate-pulse">
                 Encerrar Prova
               </button>
             )}
             {status === ExamStatus.COMPLETED && (
               <button onClick={onFinish} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-full font-bold transition">
                 Voltar ao Menu
               </button>
             )}
          </div>
       </div>

       {/* Visualizer Area */}
       <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
          {status === ExamStatus.IDLE && (
             <div className="absolute inset-0 flex items-center justify-center flex-col opacity-50">
                <svg className="w-24 h-24 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                <p className="text-xl font-serif text-slate-500">Pronto para iniciar a avaliação oral.</p>
                <p className="text-sm text-slate-400">Acesso ao microfone necessário.</p>
             </div>
          )}

          {/* Transcript Log */}
          <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-4">
             {transcript.map((t, i) => (
                <div key={i} className={`flex ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[80%] p-4 rounded-xl shadow-sm ${
                      t.sender === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                   }`}>
                      <span className="text-xs opacity-50 block mb-1 uppercase tracking-wider">{t.sender === 'user' ? config.studentName : 'Professor Veritas'}</span>
                      <p className="leading-relaxed">{t.text}</p>
                   </div>
                </div>
             ))}
             {/* Live Indicator */}
             {status === ExamStatus.IN_PROGRESS && (
                <div className="flex justify-start">
                   <div className="bg-slate-200 text-slate-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                      </span>
                      Ouvindo / Processando...
                   </div>
                </div>
             )}
          </div>
       </div>
    </div>
  );
};