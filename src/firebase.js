import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do aplicativo Web Firebase.
// Estas chaves identificam o projeto; a proteção dos dados é feita pelo
// Firebase Authentication e pelas regras de segurança do Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyDgsPDlc0EoNAxg1VdDGlAswBFBuayBHEE",
  authDomain: "controleproducao-54d30.firebaseapp.com",
  projectId: "controleproducao-54d30",
  storageBucket: "controleproducao-54d30.firebasestorage.app",
  messagingSenderId: "1050330222691",
  appId: "1:1050330222691:web:58127dc993d3698e456856",
  measurementId: "G-C24WJW6VWN",
};

export const firebaseConfigurado = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = firebaseConfigurado
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const db = firebaseConfigurado ? getFirestore(app) : null;
export const auth = firebaseConfigurado ? getAuth(app) : null;
