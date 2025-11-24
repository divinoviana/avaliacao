
export enum ExamMode {
  WRITTEN = 'WRITTEN',
  ORAL = 'ORAL',
}

export enum ExamStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  TERMINATED = 'TERMINATED', // Due to cheating
}

export type Subject = 'Geografia' | 'História' | 'Sociologia' | 'Filosofia';
export type Bimester = '1º Bimestre' | '2º Bimestre' | '3º Bimestre' | '4º Bimestre';

export type UserRole = 'DIRECTOR' | 'TEACHER';

export interface User {
  username: string;
  name: string;
  password: string; // In real app, this would be hashed
  role: UserRole;
  subject?: Subject; // Optional, to lock teacher to a subject if needed later
}

// Teacher Configuration
export interface TeacherConfig {
  subject: Subject;
  bimester: Bimester;
  topics: string; // The specific content the teacher wants to test
  isActive: boolean;
  lastModifiedBy?: string;
}

// Student Result
export interface StudentResult {
  id: string;
  studentName: string;
  studentClass: string; // Turma (Ex: 3A, 1B)
  subject: Subject;
  bimester: Bimester;
  score: number;
  date: string;
  violations: number;
}

export interface Question {
  id: number;
  text: string; // Context text + Question statement
  type: 'multiple_choice';
  options: string[];
  correctIndex: number; // 0-4
  explanation?: string; // For feedback
}

export interface ExamConfig {
  studentName: string;
  studentClass: string; // Added field
  subject: Subject;
  bimester: Bimester;
  mode: ExamMode;
  topics?: string; // Injected from Teacher Config
  difficulty: 'Ensino Médio' | 'Pré-Vestibular' | 'Nível Superior';
}

export interface ViolationLog {
  timestamp: Date;
  reason: string;
}
