
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
    <div className="flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Panel - Brand & Institutional */}
        <div className="lg:w-2/5 bg-gradient-to-br from-indigo-900 to-slate-900 p-10 text-white flex flex-col justify-center items-center relative overflow-hidden text-center">
          {/* Decorative Pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg width="100%" height="100%">
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col items-center">
             <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight mb-4 tracking-wide shadow-black drop-shadow-lg">
               ESCOLA ESTADUAL <br/> FREDERICO JOSÉ <br/> PEDREIRA NETO
             </h2>
             <div className="h-1 w-32 bg-indigo-500 rounded mb-6 shadow-lg"></div>
             <p className="text-indigo-100 text-lg font-light leading-relaxed max-w-xs mx-auto">
               Sistema de Avaliação de Ciências Humanas e Sociais Aplicadas.
             </p>
          </div>

          <div className="relative z-10 mt-12 w-full flex flex-col items-center">
             <div className="flex items-center gap-3 bg-black/30 p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-lg w-fit">
                <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="text-left">
                   <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Ambiente Monitorado</p>
                   <p className="text-xs text-indigo-200">Tecnologia Anti-Fraude Ativa</p>
                </div>
             </div>
             
             <button 
                onClick={onTeacherLogin}
                className="mt-8 text-xs text-indigo-300 hover:text-white transition flex items-center gap-2 group border border-transparent hover:border-indigo-400/30 px-4 py-2 rounded-full"
             >
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                Acesso Administrativo (Professor)
             </button>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="lg:w-3/5 p-10 bg-white">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Iniciar Avaliação</h1>
            <p className="text-slate-500 text-sm mt-1">Preencha seus dados corretamente para acessar a prova.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Student Info Group */}
            <div className="space-y-4">
               <div className="relative">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nome Completo</label>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white"
                      placeholder="Ex: João da Silva"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                    />
                 </div>
               </div>

               <div className="relative">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Turma</label>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white uppercase"
                      placeholder="Ex: 3A"
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value.toUpperCase())}
                    />
                 </div>
               </div>
            </div>

            <div className="h-px bg-slate-100 my-4"></div>

            {/* Context Info Group */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Disciplina</label>
                  <div className="relative">
                     <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value as Subject)}
                        className="w-full pl-3 pr-8 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                     >
                        <option value="História">História</option>
                        <option value="Geografia">Geografia</option>
                        <option value="Filosofia">Filosofia</option>
                        <option value="Sociologia">Sociologia</option>
                     </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Bimestre</label>
                  <div className="relative">
                     <select
                        value={bimester}
                        onChange={(e) => setBimester(e.target.value as Bimester)}
                        className="w-full pl-3 pr-8 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 focus:bg-white appearance-none cursor-pointer"
                     >
                        <option value="1º Bimestre">1º Bimestre</option>
                        <option value="2º Bimestre">2º Bimestre</option>
                        <option value="3º Bimestre">3º Bimestre</option>
                        <option value="4º Bimestre">4º Bimestre</option>
                     </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                     </div>
                  </div>
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Formato</label>
               <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode(ExamMode.WRITTEN)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      mode === ExamMode.WRITTEN 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Prova Escrita
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode(ExamMode.ORAL)}
                    className={`py-3 px-4 rounded-xl text-sm font-medium border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                      mode === ExamMode.ORAL 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    Prova Oral
                  </button>
               </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-indigo-200 transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Acessar Avaliação</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 Sistema pronto. Nível: Padrão ENEM.
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
