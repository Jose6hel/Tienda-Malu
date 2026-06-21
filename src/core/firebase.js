import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZx0EMgYDaGEvWCxAVigBoeY3nWW30E_o",
  authDomain: "tienda-malu.firebaseapp.com",
  projectId: "tienda-malu",
  storageBucket: "tienda-malu.firebasestorage.app",
  messagingSenderId: "1090253775209",
  appId: "1:1090253775209:web:2048afa8c32ad31b051df8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);