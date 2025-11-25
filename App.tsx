
import React, { useState, useEffect } from 'react';
import { ExamSetup } from './components/ExamSetup';
import { WrittenExam } from './components/WrittenExam';
import { OralExam } from './components/OralExam';
import { TeacherDashboard } from './components/TeacherDashboard';
import { ExamConfig, ExamMode } from './types';
import { initializeAuth } from './services/storageService';

function App() {
  const [examConfig, setExamConfig] = useState<ExamConfig | null>(null);
  const [isTeacherMode, setIsTeacherMode] = useState(false);
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    // Ensure default admin exists on app load
    initializeAuth().then(() => setInitDone(true));
  }, []);

  const handleStart = (config: ExamConfig) => {
    setExamConfig(config);
  };

  const handleFinish = () => {
    setExamConfig(null);
  };

  if (!initDone) {
      return (
          <div className="flex h-screen items-center justify-center bg-slate-100">
              <div className="text-indigo-900 font-bold animate-pulse">Conectando ao Sistema Escolar...</div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-10 font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => { setExamConfig(null); setIsTeacherMode(false); }}
          >
            <div className="w-10 h-10 bg-indigo-900 rounded flex items-center justify-center text-white font-serif font-bold text-xl shrink-0">CH</div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 leading-tight">
              Sistema de Avaliação <br className="sm:hidden" />
              <span className="text-slate-500 font-normal">de Ciências Humanas e Sociais Aplicadas</span>
            </h1>
          </div>
          <div className="text-xs md:text-sm text-slate-500 hidden lg:block">
             Plataforma de Integridade Acadêmica
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        {isTeacherMode ? (
          <TeacherDashboard onBack={() => setIsTeacherMode(false)} />
        ) : !examConfig ? (
          <ExamSetup 
            onStart={handleStart} 
            onTeacherLogin={() => setIsTeacherMode(true)}
          />
        ) : (
          <>
            {examConfig.mode === ExamMode.WRITTEN ? (
              <WrittenExam config={examConfig} onFinish={handleFinish} />
            ) : (
              <OralExam config={examConfig} onFinish={handleFinish} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
