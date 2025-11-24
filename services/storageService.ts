import { StudentResult, TeacherConfig, Subject, Bimester, User, UserRole } from "../types";

const RESULTS_KEY = 'veritas_results';
const CONFIG_KEY = 'veritas_configs';
const USERS_KEY = 'veritas_users';

// Initialize Default Admin if not exists
export const initializeAuth = () => {
  const users = getUsers();
  if (users.length === 0) {
    const adminUser: User = {
      username: 'diretor',
      password: 'Matuto@84', // Initial password
      name: 'Diretor Geral',
      role: 'DIRECTOR'
    };
    saveUser(adminUser);
    console.log("Admin user initialized");
  }
};

// --- USER MANAGEMENT ---

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User) => {
  const users = getUsers();
  // Check if username exists
  if (users.find(u => u.username === user.username)) {
    throw new Error("Nome de usuário já existe.");
  }
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const updateUserPassword = (username: string, currentPass: string, newPass: string) => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    throw new Error("Usuário não encontrado.");
  }

  if (users[userIndex].password !== currentPass) {
    throw new Error("A senha atual está incorreta.");
  }

  users[userIndex].password = newPass;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (username: string) => {
  let users = getUsers();
  // Prevent deleting the last Director
  const user = users.find(u => u.username === username);
  if (user?.role === 'DIRECTOR' && users.filter(u => u.role === 'DIRECTOR').length <= 1) {
     throw new Error("Não é possível remover o último Diretor.");
  }
  users = users.filter(u => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const authenticateUser = (username: string, password: string): User | null => {
  initializeAuth(); // Ensure at least one user exists
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

// --- CONFIG MANAGEMENT ---

export const saveTeacherConfig = (config: TeacherConfig) => {
  const configs = getTeacherConfigs();
  const filtered = configs.filter(c => !(c.subject === config.subject && c.bimester === config.bimester));
  filtered.push(config);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(filtered));
};

export const getTeacherConfigs = (): TeacherConfig[] => {
  const data = localStorage.getItem(CONFIG_KEY);
  return data ? JSON.parse(data) : [];
};

export const getSpecificConfig = (subject: Subject, bimester: Bimester): TeacherConfig | undefined => {
  const configs = getTeacherConfigs();
  return configs.find(c => c.subject === subject && c.bimester === bimester);
};

// --- RESULTS MANAGEMENT ---

export const saveStudentResult = (result: StudentResult) => {
  const results = getStudentResults();
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
};

export const getStudentResults = (): StudentResult[] => {
  const data = localStorage.getItem(RESULTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getResultsBySubject = (subject: Subject): StudentResult[] => {
  return getStudentResults().filter(r => r.subject === subject);
};

// --- BACKUP SYSTEM ---

export const exportDatabase = (): string => {
  const data = {
    users: getUsers(),
    configs: getTeacherConfigs(),
    results: getStudentResults(),
    timestamp: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabase = (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.users) localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
    if (data.configs) localStorage.setItem(CONFIG_KEY, JSON.stringify(data.configs));
    if (data.results) localStorage.setItem(RESULTS_KEY, JSON.stringify(data.results));
    return true;
  } catch (e) {
    console.error("Invalid backup file", e);
    return false;
  }
};