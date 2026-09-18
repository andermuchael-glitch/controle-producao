import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "./firebase.js";
import "./mensagens.css";

function chaveConversa(a, b) {
  return [a, b].sort().join("__");
}

export default function Mensagens({ onClose }) {
  const usuarioAtual = auth?.currentUser;
  const [usuarios, setUsuarios] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [naoLidas, setNaoLidas] = useState({});
  const fimChatRef = useRef(null);

  useEffect(() => {
    if (!db || !usuarioAtual) return;
    const perfil = {
      uid: usuarioAtual.uid,
      email: usuarioAtual.email || "",
      nome: usuarioAtual.displayName || usuarioAtual.email || "Usuário",
      displayName: usuarioAtual.displayName || "",
      atualizadoEm: serverTimestamp(),
    };
    setDoc(doc(db, "usuarios", usuarioAtual.uid), perfil, { merge: true }).catch(() => {});
  }, [usuarioAtual?.uid]);

  useEffect(() => {
    if (!db || !usuarioAtual) return;
    const q = query(collection(db, "usuarios"), limit(100));
    return onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== usuarioAtual.uid)
        .sort((a, b) => String(a.nome || a.email || "").localeCompare(String(b.nome || b.email || ""), "pt-BR"));
      setUsuarios(lista);
    }, () => setErro("Não foi possível carregar os usuários."));
  }, [usuarioAtual?.uid]);

  useEffect(() => {
    if (!db || !usuarioAtual) return;
    const q = query(
      collection(db, "conversas"),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      const novas = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.participantes?.includes(usuarioAtual.uid)) return;
        if (data.ultimaMensagemRemetenteId && data.ultimaMensagemRemetenteId !== usuarioAtual.uid) {
          const ultima = data.ultimaMensagemEm?.toMillis ? data.ultimaMensagemEm.toMillis() : 0;
          const lidas = Number(localStorage.getItem("neo-chat-lida-" + d.id) || 0);
          if (ultima > lidas) novas[d.id] = true;
        }
      });
      setNaoLidas(novas);
    }, () => {});
  }, [usuarioAtual?.uid]);

  useEffect(() => {
    if (!db || !usuarioAtual || !selecionado) {
      setMensagens([]);
      return;
    }
    setErro("");
    const conversaId = chaveConversa(usuarioAtual.uid, selecionado.id);
    const q = query(
      collection(db, "conversas", conversaId, "mensagens"),
      orderBy("criadoEm", "asc"),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMensagens(lista);
      const conversaIdAtual = chaveConversa(usuarioAtual.uid, selecionado.id);
      localStorage.setItem("neo-chat-lida-" + conversaIdAtual, String(Date.now()));
      window.dispatchEvent(new CustomEvent("neo-chat-lidas", {
        detail: { conversaId: conversaIdAtual },
      }));
      setNaoLidas((atual) => {
        const copia = { ...atual };
        delete copia[conversaIdAtual];
        return copia;
      });
    }, () => setErro("Não foi possível carregar esta conversa."));
  }, [usuarioAtual?.uid, selecionado?.id]);

  useEffect(() => {
    fimChatRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  const nomeSelecionado = useMemo(() => {
    if (!selecionado) return "";
    return selecionado.nome || selecionado.displayName || selecionado.email || "Usuário";
  }, [selecionado]);

  const enviar = async (e) => {
    e.preventDefault();
    const mensagem = texto.trim();
    if (!db || !usuarioAtual || !selecionado || !mensagem) return;
    setErro("");
    try {
      const conversaId = chaveConversa(usuarioAtual.uid, selecionado.id);
      if (!mensagem) return;

      const resumo = mensagem;
      await setDoc(doc(db, "conversas", conversaId), {
        participantes: [usuarioAtual.uid, selecionado.id],
        atualizadoEm: serverTimestamp(),
        ultimaMensagemEm: serverTimestamp(),
        ultimaMensagemRemetenteId: usuarioAtual.uid,
        ultimaMensagemRemetenteEmail: usuarioAtual.email || "",
        ultimaMensagemResumo: resumo.slice(0, 120),
      }, { merge: true });

      await addDoc(collection(db, "conversas", conversaId, "mensagens"), {
        texto: mensagem,
        remetenteId: usuarioAtual.uid,
        remetenteEmail: usuarioAtual.email || "",
        criadoEm: serverTimestamp(),
      });
      setTexto("");
    } catch {
      setErro("Não foi possível enviar. Verifique o Firebase e tente novamente.");
    }
  };

  if (!db || !usuarioAtual) return null;

  const totalNaoLidas = Object.keys(naoLidas).length;

  return (
    <div className="mensagens-overlay" role="dialog" aria-modal="true" aria-label="Mensagens internas">
      <section className="mensagens-modal">
        <header className="mensagens-header">
          <div><strong>💬 Mensagens {totalNaoLidas > 0 && <span className="mensagens-badge">{totalNaoLidas}</span>}</strong><small>Chat interno em tempo real</small></div>
          <button type="button" onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <div className="mensagens-corpo">
          <aside className="mensagens-usuarios">
            <h3>Usuários</h3>
            {usuarios.length === 0 && <p className="mensagens-vazio">Nenhum outro usuário encontrado.</p>}
            {usuarios.map((u) => {
              const nome = u.nome || u.displayName || u.email || "Usuário";
              const cid = chaveConversa(usuarioAtual.uid, u.id);
              return (
                <button type="button" key={u.id} className={selecionado?.id === u.id ? "usuario ativo" : "usuario"} onClick={() => { setSelecionado(u); }}>
                  <span className="avatar">{nome.charAt(0).toUpperCase()}</span>
                  <span><b>{nome}</b><small>{u.email || ""}</small></span>
                  {naoLidas[cid] && <i className="usuario-nova" title="Nova mensagem">nova</i>}
                </button>
              );
            })}
          </aside>

          <div className="mensagens-chat">
            {!selecionado ? (
              <div className="mensagens-vazio grande">Selecione um usuário para iniciar uma conversa.</div>
            ) : (
              <>
                <div className="chat-top"><b>{nomeSelecionado}</b><span>{selecionado.email || ""}</span></div>
                <div className="chat-lista">
                  {mensagens.length === 0 && <div className="mensagens-vazio">Nenhuma mensagem ainda.</div>}
                  {mensagens.map((m) => {
                    const minha = m.remetenteId === usuarioAtual.uid;
                    const data = m.criadoEm?.toDate ? m.criadoEm.toDate() : null;
                    return (
                      <div key={m.id} className={minha ? "bolha minha" : "bolha"}>
                        {m.texto && <div>{m.texto}</div>}
                        <small>{data ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora"}</small>
                      </div>
                    );
                  })}
                  <div ref={fimChatRef} />
                </div>
                <form className="chat-envio" onSubmit={enviar}>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma mensagem..." maxLength={2000} autoComplete="off" />
                  <button type="submit" disabled={!texto.trim()}>Enviar</button>
                </form>
              </>
            )}
          </div>
        </div>
        {erro && <div className="mensagens-erro">{erro}</div>}
      </section>
    </div>
  );
}
