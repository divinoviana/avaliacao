
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBGNzN5e6VdNpg2UJEQEmXE1sk1yGoQl7Q",
  authDomain: "sistema-avalicao.firebaseapp.com",
  projectId: "sistema-avalicao" 
};

let app: FirebaseApp | undefined;
let db: Firestore | null = null;

try {
  // Singleton: Verifica se o app já foi inicializado para evitar crash em recarregamentos
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Tenta inicializar o Firestore
  db = getFirestore(app);
} catch (e) {
  console.error("Erro crítico ao inicializar Firebase (App ou Firestore):", e);
  // Define db como null para que o storageService saiba que deve operar offline
  db = null;
}

export { db };
