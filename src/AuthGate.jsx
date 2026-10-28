import { useEffect, useState } from "react";
import { supabase, supabaseConfigurado } from "./supabase.js";

export default function AuthGate({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado || !supabase) {
      setCarregando(false);
      setErro("Supabase não configurado. Verifique as variáveis de ambiente.");
      return () => {};
    }

    let ativo = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) return;
      if (error) setErro("Não foi possível verificar a sessão.");
      setUsuario(data?.session?.user || null);
      setCarregando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user || null);
      setCarregando(false);
    });

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!usuario || !supabase) return;
    const nome = usuario.user_metadata?.full_name || usuario.email || "Usuário";
    supabase.from("usuarios").upsert({
      id: usuario.id,
      email: usuario.email || "",
      nome,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "id" }).then(({ error }) => {
      if (error) console.warn("Perfil Supabase não atualizado:", error.message);
    });
  }, [usuario?.id]);

  const entrar = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setErro("");
    setEntrando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });
      if (error) throw error;
    } catch (error) {
      const mensagem = String(error?.message || "").toLowerCase();
      if (mensagem.includes("invalid login credentials")) {
        setErro("E-mail ou senha incorretos. Confira se o usuário já foi cadastrado no Supabase Auth.");
      } else if (mensagem.includes("email not confirmed")) {
        setErro("Confirme o e-mail cadastrado no Supabase antes de entrar.");
      } else {
        setErro(error?.message || "Não foi possível entrar. Tente novamente.");
      }
    } finally {
      setEntrando(false);
    }
  };

  const sair = async () => {
    setErro("");
    const { error } = await supabase.auth.signOut();
    if (error) setErro("Não foi possível encerrar a sessão: " + error.message);
  };

  if (carregando) return <div style={styles.full}>Verificando acesso...</div>;

  if (usuario) {
    return (
      <>
        <div style={styles.userBar}>
          <span>Conectado: <b>{usuario.email}</b></span>
          <button style={styles.sair} onClick={sair}>Sair</button>
        </div>
        {erro && <div role="alert" style={styles.alerta}>{erro}</div>}
        {children}
      </>
    );
  }

  return (
    <div style={styles.full}>
      <form onSubmit={entrar} style={styles.card}>
        <div style={styles.logo}>N</div>
        <h1 style={styles.title}>NeoCooler</h1>
        <p style={styles.subtitle}>Controle de Produção</p>
        <label style={styles.label}>E-mail</label>
        <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        <label style={styles.label}>Senha</label>
        <input style={styles.input} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
        {erro && <div role="alert" style={styles.erro}>{erro}</div>}
        <button style={styles.entrar} disabled={entrando}>{entrando ? "Entrando..." : "Entrar"}</button>
        <p style={styles.info}>Acesso restrito aos usuários autorizados no Supabase.</p>
      </form>
    </div>
  );
}

const styles = {
  full: { minHeight: "100vh", background: "#f2ede2", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "Arial, sans-serif", color: "#231f1a" },
  card: { width: "100%", maxWidth: 390, background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 16, padding: 28, boxShadow: "0 8px 30px #00000012" },
  logo: { width: 48, height: 48, borderRadius: "50%", background: "#1c2a3a", color: "#d8622c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, margin: "0 auto 12px" },
  title: { textAlign: "center", margin: 0, fontFamily: "Georgia, serif", fontSize: 25 },
  subtitle: { textAlign: "center", color: "#7a7160", margin: "5px 0 24px" },
  label: { display: "block", fontSize: 12, fontWeight: 700, color: "#7a7160", margin: "12px 0 5px", textTransform: "uppercase" },
  input: { width: "100%", padding: "11px 12px", border: "1px solid #ddd3bd", borderRadius: 8, fontSize: 16, boxSizing: "border-box" },
  entrar: { width: "100%", marginTop: 18, padding: "12px", border: 0, borderRadius: 9, background: "#d8622c", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  erro: { marginTop: 12, padding: "9px 10px", borderRadius: 8, background: "#fde8e8", color: "#a51d2d", fontSize: 13 },
  alerta: { position: "fixed", top: 54, right: 12, zIndex: 200, padding: 10, borderRadius: 8, background: "#fde8e8", color: "#a51d2d", fontSize: 12 },
  info: { margin: "14px 0 0", textAlign: "center", fontSize: 11.5, color: "#948a76" },
  userBar: { position: "fixed", right: 12, top: 10, zIndex: 100, display: "flex", gap: 8, alignItems: "center", background: "#1c2a3a", color: "#fff", padding: "6px 8px 6px 11px", borderRadius: 20, fontFamily: "Arial, sans-serif", fontSize: 11 },
  sair: { border: 0, borderRadius: 14, padding: "5px 9px", background: "#d8622c", color: "#fff", fontWeight: 700, cursor: "pointer" },
};
