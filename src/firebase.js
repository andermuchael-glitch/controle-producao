import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração do aplicativo Web Firebase.
// Estas informações são públicas no frontend; a segurança dos dados
// deve ser feita pelas regras do Firestore.
const firebaseConfig = {
  apiKey: "AIzaSyDgsPDlc0EoNAxg1VdDGlAswBFBuayBHEE",
  authDomain: "controleproducao-54d30.firebaseapp.com",
  projectId: "controleproducao-54d30",
  storageBucket: "controleproducao-54d30.firebasestorage.app",
  messagingSenderId: "1050330222691",
  appId: "1:1050330222691:web:58127dc993d3698e456856",
};

export const firebaseConfigurado = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export const app = firebaseConfigurado
  ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig))
  : null;

export const db = firebaseConfigurado ? getFirestore(app) : null;
