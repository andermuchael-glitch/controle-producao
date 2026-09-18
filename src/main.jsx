import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import Mensagens from "./Mensagens.jsx";
import { auth, db } from "./firebase.js";
import {
  collection,
  limit,
  onSnapshot,
  query,
} from "firebase/firestore";
import "../public/grid-cartoes-etapas.css";
import "./fix-cartoes-costura.css";

function chaveConversa(a, b) {
  return [a, b].sort().join("__");
}

function tocarAviso(ctx) {
  try {
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

function notificarNavegador(nome, resumo) {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Nova mensagem — NeoCooler", {
        body: resumo ? nome + ": " + resumo : "Nova mensagem de " + nome,
        tag: "neocooler-mensagem",
      });
    }
  } catch {}
}

function ComunicacaoInterna() {
  const [aberto, setAberto] = useState(false);
  const [autenticado, setAutenticado] = useState(Boolean(auth?.currentUser));
  const [naoLidas, setNaoLidas] = useState(0);
  const [aviso, setAviso] = useState("");
  const audioContextRef = useRef(null);
  const ultimaMensagemRef = useRef(new Map());
  const conversasRef = useRef([]);
  const inicializadoRef = useRef(false);

  const recalcularNaoLidas = () => {
    const uid = auth?.currentUser?.uid;
    if (!uid) {
      setNaoLidas(0);
      return;
    }
    let novas = 0;
    conversasRef.current.forEach((data) => {
      if (!data.participantes?.includes(uid)) return;
      const ultima = data.ultimaMensagemEm?.toMillis
        ? data.ultimaMensagemEm.toMillis()
        : 0;
      const lida = Number(
        localStorage.getItem("neo-chat-lida-" + data.id) || 0
      );
      if (
        data.ultimaMensagemRemetenteId &&
        data.ultimaMensagemRemetenteId !== uid &&
        ultima > lida
      ) {
        novas += 1;
      }
    });
    setNaoLidas(novas);
  };

  useEffect(() => {
    if (!auth) return;
    return auth.onAuthStateChanged((user) => {
      setAutenticado(Boolean(user));
      ultimaMensagemRef.current = new Map();
      inicializadoRef.current = false;
      setNaoLidas(0);
    });
  }, []);

  useEffect(() => {
    if (!db || !auth?.currentUser) return;

    const uid = auth.currentUser.uid;
    const q = query(collection(db, "conversas"), limit(100));

    return onSnapshot(q, (snap) => {
      const conversas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      conversasRef.current = conversas;

      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.participantes?.includes(uid)) return;

        const ultima = data.ultimaMensagemEm?.toMillis
          ? data.ultimaMensagemEm.toMillis()
          : 0;
        const anterior = ultimaMensagemRef.current.get(d.id) || 0;

        if (
          inicializadoRef.current &&
          ultima > 0 &&
          ultima > anterior &&
          data.ultimaMensagemRemetenteId &&
          data.ultimaMensagemRemetenteId !== uid
        ) {
          const nome = data.ultimaMensagemRemetenteEmail || "Usuário";
          const resumo = data.ultimaMensagemResumo || "Nova mensagem";
          tocarAviso(audioContextRef.current);
          notificarNavegador(nome, resumo);
          setAviso(nome + ": " + resumo);
          window.clearTimeout(window.__neoChatAvisoTimer);
          window.__neoChatAvisoTimer = window.setTimeout(() => setAviso(""), 5000);
        }

        ultimaMensagemRef.current.set(d.id, ultima);
      });

      inicializadoRef.current = true;
      recalcularNaoLidas();
    }, () => {});
  }, [autenticado]);

  useEffect(() => {
    const evento = () => recalcularNaoLidas();
    window.addEventListener("neo-chat-lidas", evento);
    return () => window.removeEventListener("neo-chat-lidas", evento);
  }, [autenticado]);

  if (!autenticado || !db) return null;

  const abrirMensagens = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }
      }
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {}
    setAberto(true);
  };

  return (
    <>
      <button
        type="button"
        className="neo-mensagens-fab"
        onClick={abrirMensagens}
        aria-label="Abrir mensagens internas"
        title={naoLidas ? "Você tem " + naoLidas + " nova(s) mensagem(ns)" : "Mensagens internas"}
      >
        <span>💬</span>
        <b>Mensagens</b>
        {naoLidas > 0 && (
          <i className="neo-mensagens-badge" aria-label={naoLidas + " novas mensagens"}>
            {naoLidas > 99 ? "99+" : naoLidas}
          </i>
        )}
      </button>

      {aberto && <Mensagens onClose={() => setAberto(false)} />}

      {aviso && !aberto && (
        <button type="button" className="neo-mensagens-toast" onClick={abrirMensagens}>
          <span>🔔</span>
          <span><b>Nova mensagem</b><small>{aviso}</small></span>
          <i>›</i>
        </button>
      )}

      <style>{`
        .neo-mensagens-toast{
          position:fixed;right:20px;bottom:78px;z-index:1110;
          display:flex;align-items:center;gap:10px;min-width:270px;max-width:360px;
          border:1px solid rgba(255,255,255,.7);border-radius:16px;padding:12px 14px;
          background:#fff;color:#17212b;box-shadow:0 16px 40px rgba(0,0,0,.22);
          text-align:left;cursor:pointer;animation:neoChatEntrada .22s ease-out;
        }
        .neo-mensagens-toast>span:first-child{font-size:22px}
        .neo-mensagens-toast span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:3px}
        .neo-mensagens-toast b{font-size:12px}.neo-mensagens-toast small{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .neo-mensagens-toast i{margin-left:auto;font-size:22px;font-style:normal;color:#d8622c}
        @keyframes neoChatEntrada{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
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
        .neo-mensagens-badge{
          display:inline-grid;
          place-items:center;
          min-width:20px;
          height:20px;
          padding:0 6px;
          border-radius:999px;
          background:#d8622c;
          color:#fff;
          font-size:11px;
          font-style:normal;
          line-height:1;
        }
        @media(max-width:600px){
          .neo-mensagens-toast{
            left:12px;right:12px;bottom:72px;min-width:0;max-width:none;
          }
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
          .neo-mensagens-badge{
            position:absolute;
            right:-2px;
            top:-2px;
          }
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
