
import { StudentResult, TeacherConfig, Subject, Bimester, User } from "../types";
import { db } from "./firebaseConfig";
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const RESULTS_KEY = 'veritas_results';
const CONFIG_KEY = 'veritas_configs';
const USERS_KEY = 'veritas_users';

// --- CIRCUIT BREAKER ---
// Se o Firebase falhar uma vez (ex: banco não criado), mudamos para false e usamos só LocalStorage
let isCloudAvailable = true;

const handleCloudError = (e: any) => {
  console.warn("Falha na conexão com Firebase. Mudando para modo Offline (LocalStorage).", e.message);
  isCloudAvailable = false;
};

// Check Status Helper
export const isSystemOffline = () => !isCloudAvailable;

// --- INITIALIZATION ---

export const initializeAuth = async () => {
  try {
    // Tenta uma leitura simples para testar a conexão logo no início
    await getUsers();
    
    const users = await getUsers();
    // Se não houver usuários, cria o admin padrão
    if (users.length === 0) {
      const adminUser: User = {
        username: 'diretor',
        password: 'Matuto@84', 
        name: 'Diretor Geral',
        role: 'DIRECTOR'
      };
      await saveUser(adminUser);
      console.log("Admin user initialized");
    }
  } catch (e) {
    console.error("Auth init failed", e);
  }
};

// --- USER MANAGEMENT ---

export const getUsers = async (): Promise<User[]> => {
  // Tenta Cloud primeiro
  if (isCloudAvailable) {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (e) {
      handleCloudError(e);
      // Fallback imediato para LocalStorage abaixo
    }
  }

  // LocalStorage Fallback
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = async (user: User) => {
  // Verifica duplicidade (lógica agnóstica de fonte)
  const users = await getUsers();
  if (users.find(u => u.username === user.username)) {
    throw new Error("Nome de usuário já existe.");
  }

  if (isCloudAvailable) {
    try {
      await setDoc(doc(db, 'users', user.username), user);
      return; // Sucesso na nuvem
    } catch (e) {
      handleCloudError(e);
    }
  }

  // LocalStorage
  const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  localUsers.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
};

export const updateUserPassword = async (username: string, currentPass: string, newPass: string) => {
  const users = await getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) throw new Error("Usuário não encontrado.");
  if (user.password !== currentPass) throw new Error("A senha atual está incorreta.");

  if (isCloudAvailable) {
    try {
      await updateDoc(doc(db, 'users', username), { password: newPass });
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  // LocalStorage Update
  const localUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const index = localUsers.findIndex(u => u.username === username);
  if (index !== -1) {
    localUsers[index].password = newPass;
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }
};

export const deleteUser = async (username: string) => {
  const users = await getUsers();
  const user = users.find(u => u.username === username);
  
  if (user?.role === 'DIRECTOR') {
    const directors = users.filter(u => u.role === 'DIRECTOR');
    if (directors.length <= 1) throw new Error("Não é possível remover o último Diretor.");
  }

  if (isCloudAvailable) {
    try {
      await deleteDoc(doc(db, 'users', username));
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  // LocalStorage Delete
  let localUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  localUsers = localUsers.filter(u => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  // Garante que a auth foi inicializada (cria admin se necessário) antes de checar
  await initializeAuth(); 
  
  const users = await getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

// --- CONFIG MANAGEMENT ---

export const saveTeacherConfig = async (config: TeacherConfig) => {
  const docId = `${config.subject}-${config.bimester}`.replace(/\s+/g, '_');
  
  if (isCloudAvailable) {
    try {
      await setDoc(doc(db, 'configs', docId), config);
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  // LocalStorage
  const configs = JSON.parse(localStorage.getItem(CONFIG_KEY) || '[]');
  // Remove existing config for this subject/bimester to overwrite
  const filtered = configs.filter((c: TeacherConfig) => !(c.subject === config.subject && c.bimester === config.bimester));
  filtered.push(config);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(filtered));
};

export const getTeacherConfigs = async (): Promise<TeacherConfig[]> => {
  if (isCloudAvailable) {
    try {
      const sn = await getDocs(collection(db, 'configs'));
      return sn.docs.map(d => d.data() as TeacherConfig);
    } catch (e) {
      handleCloudError(e);
    }
  }

  const data = localStorage.getItem(CONFIG_KEY);
  return data ? JSON.parse(data) : [];
};

export const getSpecificConfig = async (subject: Subject, bimester: Bimester): Promise<TeacherConfig | undefined> => {
  const configs = await getTeacherConfigs();
  return configs.find(c => c.subject === subject && c.bimester === bimester);
};

// --- RESULTS MANAGEMENT ---

export const saveStudentResult = async (result: StudentResult) => {
  if (isCloudAvailable) {
    try {
      await addDoc(collection(db, 'results'), result);
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  const results = JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
  results.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
};

export const getStudentResults = async (): Promise<StudentResult[]> => {
  if (isCloudAvailable) {
    try {
      const sn = await getDocs(collection(db, 'results'));
      return sn.docs.map(d => d.data() as StudentResult);
    } catch (e) {
      handleCloudError(e);
    }
  }

  const data = localStorage.getItem(RESULTS_KEY);
  return data ? JSON.parse(data) : [];
};

// --- BACKUP SYSTEM (Uses whatever abstraction provides the data) ---

export const exportDatabase = async (): Promise<string> => {
  const users = await getUsers();
  const configs = await getTeacherConfigs();
  const results = await getStudentResults();
  
  const data = {
    users,
    configs,
    results,
    timestamp: new Date().toISOString(),
    source: isCloudAvailable ? 'firebase_cloud' : 'local_storage'
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabase = async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    
    // We import into whatever system is active (Cloud or Local)
    // Note: This might take time if cloud is active due to multiple await calls
    
    if (data.users) {
      for (const u of data.users) {
        // Avoid overwriting admin if it exists, logic handled in saveUser check
        try { await saveUser(u); } catch (e) {} 
      }
    }
    if (data.configs) {
      for (const c of data.configs) await saveTeacherConfig(c);
    }
    if (data.results) {
       for (const r of data.results) await saveStudentResult(r);
    }
    return true;
  } catch (e) {
    console.error("Invalid backup file", e);
    return false;
  }
};
