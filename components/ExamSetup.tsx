
import React, { useState } from 'react';
import { ExamConfig, ExamMode, Subject, Bimester } from '../types';
import { getSpecificConfig } from '../services/storageService';

interface Props {
  onStart: (config: ExamConfig) => void;
  onTeacherLogin: () => void;
}

export const ExamSetup: React.FC<Props> = ({ onStart, onTeacherLogin }) => {
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [subject, setSubject] = useState<Subject>('História');
  const [bimester, setBimester] = useState<Bimester>('1º Bimestre');
  const [mode, setMode] = useState<ExamMode>(ExamMode.WRITTEN);
  
  // Dificuldade fixa
  const difficulty = 'Pré-Vestibular';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentName && studentClass) {
      // Check if teacher has defined specific topics for this selection
      const teacherConfig = getSpecificConfig(subject, bimester);
      const topics = teacherConfig?.topics;

      onStart({ 
        studentName, 
        studentClass,
        subject, 
        bimester, 
        mode, 
        difficulty,
        topics // Pass topics to the exam engine
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-10 relative">
      <div className="absolute top-4 right-4">
        <button 
          onClick={onTeacherLogin}
          className="text-xs text-indigo-200 hover:text-white bg-white/10 px-3 py-1 rounded hover:bg-white/20 transition"
        >
          Área do Professor
        </button>
      </div>

      <div className="bg-slate-900 p-8 text-white text-center">
        <h2 className="text-2xl serif font-bold">ESCOLA ESTADUAL FREDERICO JOSÉ PEDREIRA NETO</h2>
        <p className="opacity-80 mt-2">Sistema de Avaliação de Ciências Humanas e Sociais Aplicadas</p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo do Estudante</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              placeholder="Ex: João da Silva"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Turma</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition uppercase"
              placeholder="Ex: 3A"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="História">História</option>
              <option value="Geografia">Geografia</option>
              <option value="Filosofia">Filosofia</option>
              <option value="Sociologia">Sociologia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Período Letivo</label>
            <select
              value={bimester}
              onChange={(e) => setBimester(e.target.value as Bimester)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="1º Bimestre">1º Bimestre</option>
              <option value="2º Bimestre">2º Bimestre</option>
              <option value="3º Bimestre">3º Bimestre</option>
              <option value="4º Bimestre">4º Bimestre</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nível de Dificuldade</label>
            <div className="w-full px-4 py-3 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-medium text-center">
               Padrão ENEM / Pré-Vestibular
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Formato da Prova</label>
             <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setMode(ExamMode.WRITTEN)}
                  className={`flex-1 py-2 px-2 rounded-lg border text-sm font-medium transition-all ${
                    mode === ExamMode.WRITTEN 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Prova Escrita
                </button>
                <button
                  type="button"
                  onClick={() => setMode(ExamMode.ORAL)}
                  className={`flex-1 py-2 px-2 rounded-lg border text-sm font-medium transition-all ${
                    mode === ExamMode.ORAL 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Prova Oral
                </button>
             </div>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded text-xs text-slate-500 border border-slate-200">
           <p><strong>Nota:</strong> A prova será gerada dinamicamente com base nos tópicos definidos pelo professor e no padrão ENEM. As questões são embaralhadas para cada aluno.</p>
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-200"
        >
          Iniciar Avaliação Agora
        </button>
      </form>
    </div>
  );
};
