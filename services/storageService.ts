
import { StudentResult, TeacherConfig, Subject, Bimester, User } from "../types";
import { db } from "./firebaseConfig";
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

const RESULTS_KEY = 'veritas_results';
const CONFIG_KEY = 'veritas_configs';
const USERS_KEY = 'veritas_users';

// --- CIRCUIT BREAKER ---
// Se o Firebase falhar uma vez, mudamos para false e usamos só LocalStorage
let isCloudAvailable = true;

const handleCloudError = (e: any) => {
  const msg = e?.message || '';
  console.warn("Erro no Firebase. Mudando para Offline.", msg);
  
  // Se o erro for especificamente "não encontrado", desligamos permanentemente para esta sessão
  if (msg.includes("not-found") || msg.includes("does not exist") || msg.includes("Service firestore is not available")) {
    isCloudAvailable = false;
  } else {
    // Outros erros de rede podem ser temporários, mas por segurança, desligamos para evitar lag
    isCloudAvailable = false;
  }
};

// Check Status Helper
export const isSystemOffline = () => !isCloudAvailable || !db;

export const retryCloudConnection = async (): Promise<{success: boolean; error?: string}> => {
  if (!db) {
    return { success: false, error: "Serviço Firebase não foi carregado corretamente (Erro fatal de script)." };
  }
  try {
    isCloudAvailable = true; // Reset flag to try again
    await getDocs(collection(db, 'users'));
    return { success: true };
  } catch (e: any) {
    isCloudAvailable = false;
    let errorMsg = e.message || 'Erro desconhecido';
    if (errorMsg.includes('does not exist')) {
        errorMsg = "Banco de Dados não encontrado (Database ID mismatch ou não criado).";
    }
    return { success: false, error: errorMsg };
  }
};

// --- INITIALIZATION ---

export const initializeAuth = async () => {
  // Se db for null (falha no firebaseConfig), nem tenta conectar
  if (!db) {
    console.warn("Firebase DB instance is null. Running in strict Offline Mode.");
    isCloudAvailable = false;
    
    // Create admin user locally just in case
    const users = await getUsers();
    if (users.length === 0) {
       await saveUser({
        username: 'diretor',
        password: 'Matuto@84', 
        name: 'Diretor Geral',
        role: 'DIRECTOR'
      });
    }
    return;
  }

  // Reduzido para 2 segundos para liberar o usuário mais rápido
  const TIMEOUT_MS = 2000;

  const performInitialCheck = async () => {
      // Tenta conectar. Se falhar aqui (rejeição da promise), vai pro catch
      if (!db) throw new Error("DB not initialized");
      const p = await getDocs(collection(db, 'users'));
      return p;
  };

  try {
    // 1. Tenta conectar na nuvem com timeout
    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Connection Timeout")), TIMEOUT_MS)
    );

    try {
        await Promise.race([performInitialCheck(), timeout]);
        console.log("Firebase conectado com sucesso.");
        isCloudAvailable = true;
    } catch (e: any) {
        console.warn("Falha ou demora na conexão com nuvem:", e.message);
        isCloudAvailable = false;
    }

    // 2. Garante a existência do usuário admin (seja na nuvem ou local)
    const users = await getUsers();
    
    if (users.length === 0) {
      const adminUser: User = {
        username: 'diretor',
        password: 'Matuto@84', 
        name: 'Diretor Geral',
        role: 'DIRECTOR'
      };
      // Força salvar onde estiver disponível
      await saveUser(adminUser);
      console.log("Usuário Admin inicializado.");
    }
  } catch (e) {
    console.error("Erro crítico no initializeAuth (não deve bloquear o app)", e);
  }
};

// --- USER MANAGEMENT ---

export const getUsers = async (): Promise<User[]> => {
  if (isCloudAvailable && db) {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (e) {
      handleCloudError(e);
      // Fallback
    }
  }

  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = async (user: User) => {
  // Check duplicates locally first to be fast
  const users = await getUsers();
  if (users.find(u => u.username === user.username)) {
    return; 
  }

  if (isCloudAvailable && db) {
    try {
      await setDoc(doc(db, 'users', user.username), user);
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  if (!localUsers.find((u: User) => u.username === user.username)) {
      localUsers.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
  }
};

export const updateUserPassword = async (username: string, currentPass: string, newPass: string) => {
  const users = await getUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) throw new Error("Usuário não encontrado.");
  if (user.password !== currentPass) throw new Error("A senha atual está incorreta.");

  if (isCloudAvailable && db) {
    try {
      await updateDoc(doc(db, 'users', username), { password: newPass });
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

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

  if (isCloudAvailable && db) {
    try {
      await deleteDoc(doc(db, 'users', username));
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  let localUsers: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  localUsers = localUsers.filter(u => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
};

export const authenticateUser = async (username: string, password: string): Promise<User | null> => {
  const users = await getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  return user || null;
};

// --- CONFIG MANAGEMENT ---

export const saveTeacherConfig = async (config: TeacherConfig) => {
  const docId = `${config.subject}-${config.bimester}`.replace(/\s+/g, '_');
  
  if (isCloudAvailable && db) {
    try {
      await setDoc(doc(db, 'configs', docId), config);
      return;
    } catch (e) {
      handleCloudError(e);
    }
  }

  const configs = JSON.parse(localStorage.getItem(CONFIG_KEY) || '[]');
  const filtered = configs.filter((c: TeacherConfig) => !(c.subject === config.subject && c.bimester === config.bimester));
  filtered.push(config);
  localStorage.setItem(CONFIG_KEY, JSON.stringify(filtered));
};

export const getTeacherConfigs = async (): Promise<TeacherConfig[]> => {
  if (isCloudAvailable && db) {
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
  if (isCloudAvailable && db) {
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
  if (isCloudAvailable && db) {
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

// --- BACKUP SYSTEM ---

export const exportDatabase = async (): Promise<string> => {
  const users = await getUsers();
  const configs = await getTeacherConfigs();
  const results = await getStudentResults();
  
  const data = {
    users,
    configs,
    results,
    timestamp: new Date().toISOString(),
    source: (isCloudAvailable && db) ? 'firebase_cloud' : 'local_storage'
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabase = async (jsonString: string) => {
  try {
    const data = JSON.parse(jsonString);
    if (data.users) {
      for (const u of data.users) {
         try { await saveUser(u); } catch {}
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
