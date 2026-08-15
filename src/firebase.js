import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do aplicativo Web Firebase.
// No Netlify, os valores são fornecidos pelas variáveis VITE_FIREBASE_*.
// Para desenvolvimento local, crie um arquivo .env.local com os mesmos nomes.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigurado = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

export const app = firebaseConfigurado
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const db = firebaseConfigurado ? getFirestore(app) : null;
export const auth = firebaseConfigurado ? getAuth(app) : null;
