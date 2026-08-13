import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// As chaves vêm das variáveis de ambiente (configuradas no Netlify em
// produção, ou no arquivo .env localmente). Elas NÃO são segredo — quem
// protege os dados de verdade são as regras de segurança do Firestore.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = firebaseConfigurado
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const db = firebaseConfigurado ? getFirestore(app) : null;
