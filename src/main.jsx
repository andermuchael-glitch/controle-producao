import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AuthGate from "./AuthGate.jsx";
import Mensagens from "./Mensagens.jsx";
import { supabase } from "./supabase.js";
import "../public/grid-cartoes-etapas.css";
import "./fix-cartoes-costura.css";
import "./mobile.css";

function ComunicacaoInterna() {
  const [usuario, setUsuario] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(({ data }) => { if (ativo) setUsuario(data?.user || null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUsuario(session?.user || null));
    return () => { ativo = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!usuario) { setNaoLidas(0); return; }
    let inicializado = false;
    const atualizar = async () => {
      const { data, error } = await supabase.from("conversas").select("*").contains("participantes", [usuario.id]);
      if (error) return;
      let total = 0;
      for (const c of data || []) {
        if (!c.ultima_mensagem_id || c.ultima_mensagem_remetente_id === usuario.id) continue;
        const lida = localStorage.getItem("neo-chat-lida-" + c.id) || "";
        if (c.ultima_mensagem_id !== lida) {
          total += 1;
          if (inicializado && c.ultima_mensagem_remetente_email) {
            const texto = c.ultima_mensagem_resumo || "Nova mensagem";
            setAviso(c.ultima_mensagem_remetente_email + ": " + texto);
            window.clearTimeout(window.__neoChatAvisoTimer);
            window.__neoChatAvisoTimer = window.setTimeout(() => setAviso(""), 5000);
          }
        }
      }
      setNaoLidas(total);
      inicializado = true;
    };
    atualizar();
    const canal = supabase.channel("notificacoes-chat-" + usuario.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, atualizar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [usuario?.id, aberto]);

  if (!usuario) return null;
  return <>
    <button type="button" className="neo-mensagens-fab" onClick={() => setAberto(true)} aria-label="Abrir mensagens internas" title={naoLidas ? `Você tem ${naoLidas} nova(s) mensagem(ns)` : "Mensagens internas"}>
      <span>💬</span><b>Mensagens</b>{naoLidas > 0 && <i className="neo-mensagens-badge">{naoLidas > 99 ? "99+" : naoLidas}</i>}
    </button>
    {aberto && <Mensagens onClose={() => setAberto(false)} />}
    {aviso && !aberto && <button type="button" className="neo-mensagens-toast" onClick={() => setAberto(true)}><span>🔔</span><span><b>Nova mensagem</b><small>{aviso}</small></span><i>›</i></button>}
    <style>{`
      .neo-mensagens-toast{position:fixed;right:20px;bottom:78px;z-index:1110;display:flex;align-items:center;gap:10px;min-width:270px;max-width:360px;border:1px solid rgba(255,255,255,.7);border-radius:16px;padding:12px 14px;background:#fff;color:#17212b;box-shadow:0 16px 40px rgba(0,0,0,.22);text-align:left;cursor:pointer}
      .neo-mensagens-toast>span:first-child{font-size:22px}.neo-mensagens-toast span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:3px}.neo-mensagens-toast b{font-size:12px}.neo-mensagens-toast small{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.neo-mensagens-toast i{margin-left:auto;font-size:22px;font-style:normal;color:#d8622c}
      .neo-mensagens-fab{position:fixed;right:20px;bottom:20px;z-index:1100;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 16px;background:#1c2a3a;color:#fff;box-shadow:0 8px 24px rgba(20,34,52,.24);font:700 13px Arial,sans-serif;cursor:pointer}
      .neo-mensagens-fab span{font-size:18px;line-height:1}.neo-mensagens-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#d8622c;color:#fff;font-size:11px;font-style:normal;line-height:1}
      @media(max-width:600px){.neo-mensagens-toast{left:12px;right:12px;bottom:72px;min-width:0;max-width:none}.neo-mensagens-fab{right:12px;bottom:12px;width:50px;height:50px;padding:0;justify-content:center}.neo-mensagens-fab b{display:none}.neo-mensagens-fab span{font-size:21px}.neo-mensagens-badge{position:absolute;right:-2px;top:-2px}}
    `}</style>
  </>;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`, { scope: import.meta.env.BASE_URL }).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><AuthGate><App /><ComunicacaoInterna /></AuthGate></React.StrictMode>
);
