import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, firebaseConfigurado } from "./firebase.js";

export default function AuthGate({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    if (!firebaseConfigurado || !auth) {
      setCarregando(false);
      setErro("Firebase não configurado.");
      return () => {};
    }
    return onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });
  }, []);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setEntrando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (error) {
      const mensagens = {
        "auth/invalid-credential": "E-mail ou senha incorretos.",
        "auth/invalid-email": "Digite um e-mail válido.",
        "auth/user-disabled": "Este usuário está desativado.",
        "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      };
      setErro(mensagens[error.code] || "Não foi possível entrar. Verifique o e-mail e a senha.");
    } finally {
      setEntrando(false);
    }
  };

  if (carregando) return <div style={styles.full}>Verificando acesso...</div>;

  if (usuario) {
    return (
      <>
        <div style={styles.userBar}>
          <span>Conectado: <b>{usuario.email}</b></span>
          <button style={styles.sair} onClick={() => signOut(auth)}>Sair</button>
        </div>
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
        {erro && <div style={styles.erro}>{erro}</div>}
        <button style={styles.entrar} disabled={entrando}>{entrando ? "Entrando..." : "Entrar"}</button>
        <p style={styles.info}>Acesso restrito aos usuários cadastrados no Firebase.</p>
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
  info: { margin: "14px 0 0", textAlign: "center", fontSize: 11.5, color: "#948a76" },
  userBar: { position: "fixed", right: 12, top: 10, zIndex: 100, display: "flex", gap: 8, alignItems: "center", background: "#1c2a3a", color: "#fff", padding: "6px 8px 6px 11px", borderRadius: 20, fontFamily: "Arial, sans-serif", fontSize: 11 },
  sair: { border: 0, borderRadius: 14, padding: "5px 9px", background: "#d8622c", color: "#fff", fontWeight: 700, cursor: "pointer" },
};
