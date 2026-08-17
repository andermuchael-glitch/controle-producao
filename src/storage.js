import { addDoc, collection, doc, onSnapshot, query, orderBy, limit, onSnapshot as onSnapshotQuery, setDoc } from "firebase/firestore";
import { db, firebaseConfigurado } from "./firebase.js";

const COLECAO = "controleProducao";

// Camada de persistência com dois modos:
//  - Firebase configurado: dados ficam no Firestore e sincronizam em tempo
//    real entre todos os dispositivos/pessoas usando o app.
//  - Firebase NÃO configurado: cai para localStorage (só no próprio
//    navegador), como fallback — assim o app continua funcionando mesmo
//    sem Firebase, só sem sincronizar entre pessoas.

export function inscrever(key, callback) {
  if (firebaseConfigurado) {
    const ref = doc(db, COLECAO, key);
    return onSnapshot(
      ref,
      (snap) => callback(snap.exists() ? snap.data().value : null, null),
      (erro) => callback(null, erro)
    );
  }
  try {
    const raw = window.localStorage.getItem(key);
    callback(raw, null);
  } catch (e) {
    callback(null, e);
  }
  return () => {};
}

export async function salvarValor(key, value) {
  if (firebaseConfigurado) {
    const ref = doc(db, COLECAO, key);
    await setDoc(ref, { value, atualizadoEm: Date.now() });
    return true;
  }
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}


// PRE_CORTE_AUDIT_V1
const AUDIT_COLLECTION = "auditoriaProducao";

export async function registrarAuditoria(registro) {
  if (!firebaseConfigurado) return false;
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...registro,
      criadoEm: Date.now(),
    });
    return true;
  } catch (e) {
    return false;
  }
}

export function inscreverAuditoria(callback) {
  if (!firebaseConfigurado) {
    callback([], null);
    return () => {};
  }
  const q = query(collection(db, AUDIT_COLLECTION), orderBy("criadoEm", "desc"), limit(300));
  return onSnapshotQuery(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })), null);
  }, (erro) => callback([], erro));
}
