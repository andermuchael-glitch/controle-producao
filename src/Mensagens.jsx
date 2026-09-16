import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    if (!db || !usuarioAtual) return;
    const q = query(collection(db, "usuarios"), limit(100));
    return onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== usuarioAtual.uid);
      setUsuarios(lista);
    }, () => setErro("Não foi possível carregar os usuários."));
  }, [usuarioAtual?.uid]);

  useEffect(() => {
    if (!db || !usuarioAtual || !selecionado) {
      setMensagens([]);
      return;
    }
    const conversaId = chaveConversa(usuarioAtual.uid, selecionado.id);
    const q = query(
      collection(db, "conversas", conversaId, "mensagens"),
      orderBy("criadoEm", "asc"),
      limit(200)
    );
    return onSnapshot(q, (snap) => {
      setMensagens(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setErro("Não foi possível carregar esta conversa."));
  }, [usuarioAtual?.uid, selecionado?.id]);

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
      await setDoc(doc(db, "conversas", conversaId), {
        participantes: [usuarioAtual.uid, selecionado.id],
        atualizadoEm: serverTimestamp(),
      }, { merge: true });
      await addDoc(collection(db, "conversas", conversaId, "mensagens"), {
        texto: mensagem,
        remetenteId: usuarioAtual.uid,
        remetenteEmail: usuarioAtual.email || "",
        criadoEm: serverTimestamp(),
      });
      setTexto("");
    } catch {
      setErro("Não foi possível enviar a mensagem.");
    }
  };

  if (!db || !usuarioAtual) return null;

  return (
    <div className="mensagens-overlay">
      <section className="mensagens-modal">
        <header className="mensagens-header">
          <div><strong>💬 Mensagens</strong><small>Comunicação interna</small></div>
          <button onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <div className="mensagens-corpo">
          <aside className="mensagens-usuarios">
            <h3>Usuários</h3>
            {usuarios.length === 0 && <p className="mensagens-vazio">Nenhum outro usuário encontrado.</p>}
            {usuarios.map((u) => {
              const nome = u.nome || u.displayName || u.email || "Usuário";
              return (
                <button key={u.id} className={selecionado?.id === u.id ? "usuario ativo" : "usuario"} onClick={() => setSelecionado(u)}>
                  <span className="avatar">{nome.charAt(0).toUpperCase()}</span>
                  <span><b>{nome}</b><small>{u.email || ""}</small></span>
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
                    return <div key={m.id} className={minha ? "bolha minha" : "bolha"}><div>{m.texto}</div><small>{data ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora"}</small></div>;
                  })}
                </div>
                <form className="chat-envio" onSubmit={enviar}>
                  <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite uma mensagem..." maxLength={2000} />
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
