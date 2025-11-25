
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBGNzN5e6VdNpg2UJEQEmXE1sk1yGoQl7Q",
  authDomain: "sistema-avalicao.firebaseapp.com",
  projectId: "sistema-avalicao"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
