
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ExamConfig, Question, ExamStatus, ViolationLog } from '../types';
import { generateWrittenExamQuestions } from '../services/geminiService';
import { saveStudentResult } from '../services/storageService';

interface Props {
  config: ExamConfig;
  onFinish: () => void;
}

// Utility to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export const WrittenExam: React.FC<Props> = ({ config, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  // Store the shuffled options order for each question to map back to original index
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<{[key: number]: number[]}>({});
  
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({}); // questionId -> selectedOptionIndex (visual)
  const [status, setStatus] = useState<ExamStatus>(ExamStatus.LOADING);
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [result, setResult] = useState<{score: number, details: any[]} | null>(null);
  
  const violationsRef = useRef<ViolationLog[]>([]);

  // Load and Randomize Questions
  useEffect(() => {
    generateWrittenExamQuestions(config.subject, config.bimester, config.difficulty, config.topics)
      .then(rawQuestions => {
        // 1. Shuffle Questions Order
        const shuffledQuestions = shuffleArray(rawQuestions);
        
        // 2. Shuffle Options for each question
        const optionsMap: {[key: number]: number[]} = {};
        const fullyShuffled = shuffledQuestions.map(q => {
           // Create array of original indices [0, 1, 2, 3, 4]
           const indices = [0, 1, 2, 3, 4];
           const shuffledIndices = shuffleArray(indices);
           optionsMap[q.id] = shuffledIndices;
           
           // Reorder options based on shuffled indices
           const newOptions = shuffledIndices.map(i => q.options[i]);
           return { ...q, options: newOptions };
        });

        setQuestions(fullyShuffled);
        setShuffledOptionsMap(optionsMap);
        setStatus(ExamStatus.IN_PROGRESS);
      })
      .catch((e) => {
        console.error(e);
        alert("Falha ao gerar a prova. Verifique a conexão.");
        onFinish();
      });
  }, [config, onFinish]);

  // Anti-cheat Mechanism
  const handleViolation = useCallback(() => {
    if (status !== ExamStatus.IN_PROGRESS) return;

    const newViolation = { timestamp: new Date(), reason: 'Perda de foco / Troca de aba' };
    const updated = [...violationsRef.current, newViolation];
    violationsRef.current = updated;
    setViolations(updated);

    if (updated.length >= 3) {
      // Auto-submit with zero grade or just terminate? 
      // User said "resetaria ou zerava". Let's terminate with 0.
      finishExam(0, true);
    }
  }, [status]);

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.hidden) handleViolation(); };
    const handleBlur = () => { handleViolation(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [handleViolation]);

  const calculateScore = () => {
    let correctCount = 0;
    const details = questions.map(q => {
       const visualSelection = userAnswers[q.id]; // The index in the shuffled array (0-4)
       // Map visual selection back to original index
       const originalIndexMap = shuffledOptionsMap[q.id];
       // The user selected option at visual index X. originalIndexMap[X] gives the true index.
       const actualSelectedOriginalIndex = visualSelection !== undefined ? originalIndexMap[visualSelection] : -1;
       
       const isCorrect = actualSelectedOriginalIndex === q.correctIndex;
       if (isCorrect) correctCount++;
       
       return {
         question: q,
         isCorrect,
         userSelected: visualSelection !== undefined ? q.options[visualSelection] : "Não respondida",
         correctOption: rawOriginalOption(q, originalIndexMap)
       };
    });
    
    return {
       score: (correctCount / questions.length) * 100,
       details
    };
  };

  // Helper to find the correct text string given the mix
  const rawOriginalOption = (q: Question, map: number[]) => {
      // q.options is currently shuffled. 
      // We know q.correctIndex is the index in the ORIGINAL list.
      // We need to find which visual index points to q.correctIndex
      // map[visualIndex] = originalIndex. 
      // Find visualIndex where map[visualIndex] === q.correctIndex
      const visualIndex = map.indexOf(q.correctIndex);
      return q.options[visualIndex];
  };

  const finishExam = (forcedScore?: number, terminated: boolean = false) => {
      const finalResult = calculateScore();
      const score = forcedScore !== undefined ? forcedScore : finalResult.score;
      
      setResult({ score, details: finalResult.details });
      setStatus(terminated ? ExamStatus.TERMINATED : ExamStatus.COMPLETED);

      // Save to "Database"
      saveStudentResult({
        id: Date.now().toString(),
        studentName: config.studentName,
        studentClass: config.studentClass, // NEW FIELD
        subject: config.subject,
        bimester: config.bimester,
        score: score,
        date: new Date().toISOString(),
        violations: violationsRef.current.length
      });
  };

  const handleSubmit = () => {
    if (Object.keys(userAnswers).length < questions.length) {
        if (!confirm("Existem questões em branco. Deseja finalizar mesmo assim?")) return;
    }
    finishExam();
  };

  if (status === ExamStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-slate-600 font-medium">O Sistema está embaralhando as questões...</p>
        <p className="text-slate-400 text-sm mt-2">ID Único da Sessão: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </div>
    );
  }

  if (status === ExamStatus.TERMINATED) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-red-50 border border-red-200 rounded-xl text-center">
        <h2 className="text-3xl text-red-700 font-bold mb-4 serif">Prova Zerada Automaticamente</h2>
        <div className="text-6xl mb-6">🚫</div>
        <p className="text-lg text-red-800 mb-6">
          O sistema detectou múltiplas tentativas de sair da tela da prova. 
          Sua avaliação foi encerrada e a nota 0 foi atribuída.
        </p>
        <button onClick={onFinish} className="bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800">Voltar</button>
      </div>
    );
  }

  if (status === ExamStatus.COMPLETED && result) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-xl shadow border-t-8 border-indigo-500">
           <h2 className="text-3xl serif font-bold text-slate-800 mb-2">Resultado Final</h2>
           <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-lg">
             <div>
               <p className="font-bold text-slate-700 text-lg">{config.studentName} ({config.studentClass})</p>
               <p className="text-slate-500">{config.subject} - {config.bimester}</p>
             </div>
             <div className="text-right">
                <span className="block text-sm text-slate-400 uppercase tracking-wide">Nota Final</span>
                <span className={`text-5xl font-bold ${result.score >= 60 ? 'text-green-600' : 'text-red-500'}`}>{result.score.toFixed(1)}</span>
             </div>
           </div>
           
           <h3 className="font-bold text-xl text-slate-800 mb-4">Gabarito Comentado</h3>
           <div className="space-y-6">
              {result.details.map((item, idx) => (
                <div key={idx} className={`p-4 border rounded-lg ${item.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                   <div className="flex gap-3 mb-2">
                      <span className={`font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs text-white ${item.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                        {idx + 1}
                      </span>
                      <p className="font-medium text-slate-800 whitespace-pre-line">{item.question.text}</p>
                   </div>
                   
                   <div className="ml-9 text-sm space-y-2">
                      <p className={item.isCorrect ? 'text-green-700' : 'text-red-700'}>
                        <strong>Sua resposta:</strong> {item.userSelected}
                      </p>
                      {!item.isCorrect && (
                        <p className="text-green-700">
                          <strong>Resposta Correta:</strong> {item.correctOption}
                        </p>
                      )}
                      <div className="mt-2 p-2 bg-white/50 rounded text-slate-600 italic">
                         <strong>Explicação:</strong> {item.question.explanation}
                      </div>
                   </div>
                </div>
              ))}
           </div>
           
           <button onClick={onFinish} className="mt-8 w-full bg-slate-900 text-white py-3 rounded hover:bg-slate-800 font-bold">
             Finalizar Sessão
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with warnings */}
      <div className="sticky top-4 z-50 mb-6 flex items-center justify-between bg-white/95 backdrop-blur shadow-lg border-b border-slate-200 p-4 rounded-lg">
         <div>
           <h3 className="font-bold text-slate-800">{config.subject}</h3>
           <span className="text-xs text-slate-500">{config.bimester} • {config.studentClass}</span>
         </div>
         <div className="flex items-center space-x-4">
            <div className="text-xs font-mono bg-slate-100 p-1 rounded">
               Tentativas de Cola: <span className={`font-bold ${violations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{violations.length}/3</span>
            </div>
            <button onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow transition-transform active:scale-95">
               Entregar Prova
            </button>
         </div>
      </div>

      <div className="space-y-8 pb-20 select-none">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-start gap-4">
                <span className="bg-slate-800 text-white font-bold w-8 h-8 flex items-center justify-center rounded-full shrink-0 text-sm">
                  {idx + 1}
                </span>
                <div className="flex-1">
                   <p className="text-lg text-slate-800 font-serif leading-relaxed whitespace-pre-line mb-6 border-l-4 border-indigo-200 pl-4">
                     {q.text}
                   </p>
                   
                   <div className="space-y-3">
                      {q.options.map((opt, optIdx) => (
                        <label 
                          key={optIdx} 
                          className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                            userAnswers[q.id] === optIdx 
                              ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                              : 'hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                           <input 
                             type="radio" 
                             name={`q-${q.id}`} 
                             className="mt-1 mr-3 text-indigo-600"
                             checked={userAnswers[q.id] === optIdx}
                             onChange={() => setUserAnswers(prev => ({...prev, [q.id]: optIdx}))}
                           />
                           <span className="text-slate-700">
                             <span className="font-bold mr-2 text-slate-400">
                               {String.fromCharCode(65 + optIdx)})
                             </span>
                             {opt}
                           </span>
                        </label>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
