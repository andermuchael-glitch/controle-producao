import { addDoc, collection, doc, onSnapshot, query, orderBy, limit, onSnapshot as onSnapshotQuery, setDoc, runTransaction } from "firebase/firestore";
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

export async function salvarListaSegura(key, baseValue, nextValue) {
  if (!firebaseConfigurado) {
    try {
      window.localStorage.setItem(key, nextValue);
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    const ref = doc(db, COLECAO, key);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const servidor = snap.exists() ? snap.data().value : null;
      let base = [];
      let local = [];
      let remoto = [];
      try { base = JSON.parse(baseValue || "[]"); } catch {}
      try { local = JSON.parse(nextValue || "[]"); } catch {}
      try { remoto = JSON.parse(servidor || "[]"); } catch {}

      const chave = (item) => String(
        item?.id || `${item?.pedido || ""}||${item?.produto || ""}||${item?.criadoEm || ""}`
      );

      const mapear = (lista) => new Map(
        (Array.isArray(lista) ? lista : []).map(item => [chave(item), item])
      );
      const mb = mapear(base);
      const ml = mapear(local);
      const mr = mapear(remoto);

      const iguais = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const chaves = new Set([...mb.keys(), ...ml.keys(), ...mr.keys()]);
      const resultado = [];

      for (const k of chaves) {
        const b = mb.get(k);
        const l = ml.get(k);
        const r = mr.get(k);

        if (l === undefined) {
          if (r === undefined) continue;
          if (b === undefined || iguais(r, b)) continue;
          resultado.push(r);
          continue;
        }

        if (r === undefined) {
          if (b === undefined || iguais(l, b)) {
            resultado.push(l);
          } else {
            resultado.push(l);
          }
          continue;
        }

        if (b === undefined) {
          resultado.push(l);
          continue;
        }

        if (iguais(l, b)) {
          resultado.push(r);
          continue;
        }

        if (iguais(r, b)) {
          resultado.push(l);
          continue;
        }

        // Um pedido arquivado é terminal: uma versão antiga de outro
        // dispositivo nunca deve ressuscitá-lo ao salvar outra alteração.
        if (r.etapa === "arquivado" && l.etapa !== "arquivado") {
          resultado.push(r);
        } else {
          resultado.push(l);
        }
      }

      tx.set(ref, { value: JSON.stringify(resultado), atualizadoEm: Date.now() });
    });
    return true;
  } catch (e) {
    console.error("Erro ao salvar lista com proteção contra conflito", e);
    return false;
  }
}

export async function atualizarEstoqueSeguro(key, produto, valor, modo = "definir") {
  const nome = String(produto || "").trim();
  const quantidade = Math.max(0, Number(valor) || 0);
  if (!nome) return { ok: false, estoque: 0 };

  if (!firebaseConfigurado) {
    try {
      const atual = JSON.parse(window.localStorage.getItem(key) || "{}");
      const estoqueAtual = Math.max(0, Number(atual[nome]) || 0);
      const novoEstoque = modo === "somar" ? estoqueAtual + quantidade : quantidade;
      atual[nome] = novoEstoque;
      window.localStorage.setItem(key, JSON.stringify(atual));
      return { ok: true, estoque: novoEstoque };
    } catch (e) {
      return { ok: false, estoque: 0 };
    }
  }

  try {
    const ref = doc(db, COLECAO, key);
    let resultado = { ok: false, estoque: 0 };
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      let mapa = {};
      try { mapa = JSON.parse(snap.exists() ? (snap.data().value || "{}") : "{}"); } catch {}
      const estoqueAtual = Math.max(0, Number(mapa[nome]) || 0);
      const novoEstoque = modo === "somar" ? estoqueAtual + quantidade : quantidade;
      mapa[nome] = novoEstoque;
      tx.set(ref, { value: JSON.stringify(mapa), atualizadoEm: Date.now() });
      resultado = { ok: true, estoque: novoEstoque };
    });
    return resultado;
  } catch (e) {
    console.error("Erro ao atualizar estoque", e);
    return { ok: false, estoque: 0 };
  }
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
