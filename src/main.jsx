import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import Mensagens from "./Mensagens.jsx";
import { auth, db } from "./firebase.js";
import "../public/grid-cartoes-etapas.css";
import "./fix-cartoes-costura.css";

function ComunicacaoInterna() {
  const [aberto, setAberto] = useState(false);
  const [autenticado, setAutenticado] = useState(Boolean(auth?.currentUser));

  useEffect(() => {
    if (!auth) return;
    return auth.onAuthStateChanged((user) => setAutenticado(Boolean(user)));
  }, []);

  if (!autenticado || !db) return null;

  return (
    <>
      <button
        type="button"
        className="neo-mensagens-fab"
        onClick={() => setAberto(true)}
        aria-label="Abrir mensagens internas"
        title="Mensagens internas"
      >
        <span>💬</span>
        <b>Mensagens</b>
      </button>
      {aberto && <Mensagens onClose={() => setAberto(false)} />}
      <style>{`
        .neo-mensagens-fab{
          position:fixed;
          right:20px;
          bottom:20px;
          z-index:1100;
          display:flex;
          align-items:center;
          gap:8px;
          border:0;
          border-radius:999px;
          padding:12px 16px;
          background:#1c2a3a;
          color:#fff;
          box-shadow:0 8px 24px rgba(20,34,52,.24);
          font:700 13px Arial,sans-serif;
          cursor:pointer;
          transition:transform .16s ease,box-shadow .16s ease;
        }
        .neo-mensagens-fab:hover{
          transform:translateY(-2px);
          box-shadow:0 12px 28px rgba(20,34,52,.3);
        }
        .neo-mensagens-fab span{font-size:18px;line-height:1}
        @media(max-width:600px){
          .neo-mensagens-fab{
            right:12px;
            bottom:12px;
            width:50px;
            height:50px;
            padding:0;
            justify-content:center;
          }
          .neo-mensagens-fab b{display:none}
          .neo-mensagens-fab span{font-size:21px}
        }
      `}</style>
    </>
  );
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <App />
      <ComunicacaoInterna />
    </AuthGate>
  </React.StrictMode>
);
