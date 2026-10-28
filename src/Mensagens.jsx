import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase.js";
import "./mensagens.css";

function chaveConversa(a, b) {
  return [a, b].sort().join("__");
}

export default function Mensagens({ onClose }) {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [naoLidas, setNaoLidas] = useState({});
  const [novaMensagem, setNovaMensagem] = useState("");
  const fimChatRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getUser().then(({ data }) => { if (ativo) setUsuarioAtual(data?.user || null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUsuarioAtual(session?.user || null));
    return () => { ativo = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!usuarioAtual) return;
    const atualizarUsuarios = async () => {
      const { data, error } = await supabase.from("usuarios").select("id,email,nome").order("nome").limit(100);
      if (error) { setErro("Não foi possível carregar usuários. Confira as políticas RLS."); return; }
      setUsuarios((data || []).filter(u => u.id !== usuarioAtual.id));
    };
    atualizarUsuarios();
    const canal = supabase.channel("usuarios-chat")
      .on("postgres_changes", { event: "*", schema: "public", table: "usuarios" }, atualizarUsuarios)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [usuarioAtual?.id]);

  useEffect(() => {
    if (!usuarioAtual) return;
    const atualizarConversas = async () => {
      const { data, error } = await supabase.from("conversas").select("*").contains("participantes", [usuarioAtual.id]);
      if (error) return;
      const novas = {};
      (data || []).forEach(c => {
        if (c.ultima_mensagem_remetente_id && c.ultima_mensagem_remetente_id !== usuarioAtual.id) {
          const lida = localStorage.getItem("neo-chat-lida-" + c.id) || "";
          if (c.ultima_mensagem_id && c.ultima_mensagem_id !== lida) novas[c.id] = true;
        }
      });
      setNaoLidas(novas);
    };
    atualizarConversas();
    const canal = supabase.channel("conversas-chat-" + usuarioAtual.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversas" }, atualizarConversas)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [usuarioAtual?.id]);

  useEffect(() => {
    if (!usuarioAtual || !selecionado) { setMensagens([]); return; }
    let ativo = true;
    const conversaId = chaveConversa(usuarioAtual.id, selecionado.id);
    const carregar = async () => {
      const { data, error } = await supabase.from("mensagens").select("*").eq("conversa_id", conversaId).order("criado_em", { ascending: true }).limit(200);
      if (!ativo) return;
      if (error) { setErro("Não foi possível carregar esta conversa. Confira as permissões do Supabase."); return; }
      setMensagens(data || []);
      const ultima = data?.[data.length - 1];
      if (ultima?.id) {
        localStorage.setItem("neo-chat-lida-" + conversaId, ultima.id);
        setNaoLidas(prev => { const copia = { ...prev }; delete copia[conversaId]; return copia; });
      }
    };
    setErro("");
    carregar();
    const canal = supabase.channel("mensagens-" + conversaId)
      .on("postgres_changes", { event: "*", schema: "public", table: "mensagens", filter: "conversa_id=eq." + conversaId }, carregar)
      .subscribe();
    return () => { ativo = false; supabase.removeChannel(canal); };
  }, [usuarioAtual?.id, selecionado?.id]);

  useEffect(() => { fimChatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens.length]);

  const nomeSelecionado = useMemo(() => selecionado?.nome || selecionado?.email || "Usuário", [selecionado]);
  const enviar = async (e) => {
    e.preventDefault();
    const mensagem = texto.trim();
    if (!usuarioAtual || !selecionado || !mensagem) return;
    setErro("");
    try {
      const conversaId = chaveConversa(usuarioAtual.id, selecionado.id);
      const participantes = [usuarioAtual.id, selecionado.id].sort();
      const { error: erroConversa } = await supabase.from("conversas").upsert({
        id: conversaId,
        participantes,
        ultima_mensagem_em: new Date().toISOString(),
        ultima_mensagem_remetente_id: usuarioAtual.id,
        ultima_mensagem_remetente_email: usuarioAtual.email || "",
        ultima_mensagem_resumo: mensagem.slice(0, 120),
      }, { onConflict: "id" });
      if (erroConversa) throw erroConversa;

      const { data: nova, error: erroMensagem } = await supabase.from("mensagens").insert({
        conversa_id: conversaId,
        remetente_id: usuarioAtual.id,
        remetente_email: usuarioAtual.email || "",
        conteudo: mensagem,
      }).select("id").single();
      if (erroMensagem) throw erroMensagem;

      await supabase.from("conversas").update({
        ultima_mensagem_id: nova.id,
        ultima_mensagem_em: new Date().toISOString(),
        ultima_mensagem_remetente_id: usuarioAtual.id,
        ultima_mensagem_remetente_email: usuarioAtual.email || "",
        ultima_mensagem_resumo: mensagem.slice(0, 120),
      }).eq("id", conversaId);
      setTexto("");
    } catch (e) {
      setErro("Não foi possível enviar. Confira se o esquema SQL do Supabase foi aplicado e se as políticas RLS estão ativas.");
    }
  };

  if (!usuarioAtual) return null;
  const totalNaoLidas = Object.keys(naoLidas).length;

  return (
    <div className="mensagens-overlay" role="dialog" aria-modal="true" aria-label="Mensagens internas">
      <section className="mensagens-modal">
        <header className="mensagens-header">
          <div><strong>💬 Mensagens {totalNaoLidas > 0 && <span className="mensagens-badge">{totalNaoLidas}</span>}</strong><small>Chat interno em tempo real — Supabase</small></div>
          <button className="mensagens-fechar" type="button" onClick={onClose} aria-label="Fechar chat">✕ <span>Fechar</span></button>
        </header>
        <div className="mensagens-corpo">
          <aside className="mensagens-usuarios">
            <h3>Usuários</h3>
            {usuarios.length === 0 && <p className="mensagens-vazio">Nenhum outro usuário encontrado.</p>}
            {usuarios.map((u) => {
              const nome = u.nome || u.email || "Usuário";
              const cid = chaveConversa(usuarioAtual.id, u.id);
              return <button type="button" key={u.id} className={selecionado?.id === u.id ? "usuario ativo" : "usuario"} onClick={() => setSelecionado(u)}>
                <span className="avatar">{nome.charAt(0).toUpperCase()}</span><span><b>{nome}</b><small>{u.email || ""}</small></span>
                {naoLidas[cid] && <i className="usuario-nova" title="Nova mensagem">nova</i>}
              </button>;
            })}
          </aside>
          <div className="mensagens-chat">
            {novaMensagem && <div className="chat-nova-mensagem" role="status">{novaMensagem}<button type="button" onClick={() => setNovaMensagem("")}>✕</button></div>}
            {!selecionado ? <div className="mensagens-vazio grande">Selecione um usuário para iniciar uma conversa.</div> : <>
              <div className="chat-top"><div><b>{nomeSelecionado}</b><span>{selecionado.email || ""}</span></div><button type="button" className="chat-fechar" onClick={onClose}>✕</button></div>
              <div className="chat-lista">
                {mensagens.length === 0 && <div className="mensagens-vazio">Nenhuma mensagem ainda.</div>}
                {mensagens.map(m => <div key={m.id} className={m.remetente_id === usuarioAtual.id ? "bolha minha" : "bolha"}>
                  <div>{m.conteudo}</div><small>{new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                </div>)}
                <div ref={fimChatRef} />
              </div>
              <form className="chat-envio" onSubmit={enviar}>
                <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Digite uma mensagem..." maxLength={2000} autoComplete="off" />
                <button type="submit" disabled={!texto.trim()}>Enviar</button>
              </form>
            </>}
          </div>
        </div>
        {erro && <div className="mensagens-erro">{erro}</div>}
      </section>
    </div>
  );
}
