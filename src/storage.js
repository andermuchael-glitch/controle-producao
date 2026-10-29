import { supabase, supabaseConfigurado } from "./supabase.js";

const STATE_TABLE = "controle_producao_state";
const AUDIT_TABLE = "auditoria_producao";

function parseJson(value, fallback) {
  try { return typeof value === "string" ? JSON.parse(value || "") : (value ?? fallback); }
  catch { return fallback; }
}

function localGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function inscrever(key, callback) {
  if (!supabaseConfigurado || !supabase) {
    callback(null, new Error("Supabase não configurado."));
    return () => {};
  }

  let ativo = true;
  const carregar = async () => {
    const { data, error } = await supabase.from(STATE_TABLE).select("value").eq("key", key).maybeSingle();
    if (!ativo) return;
    if (error) callback(null, error);
    else callback(data ? (typeof data.value === "string" ? data.value : JSON.stringify(data.value)) : null, null);
  };
  carregar();

  const canal = supabase.channel("state-" + key)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: STATE_TABLE,
      filter: "key=eq." + key,
    }, (payload) => {
      if (!ativo) return;
      const row = payload.new;
      callback(row ? (typeof row.value === "string" ? row.value : JSON.stringify(row.value)) : null, null);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") carregar();
    });

  return () => {
    ativo = false;
    supabase.removeChannel(canal);
  };
}

function mergeListas(baseValue, nextValue, serverValue) {
  const base = parseJson(baseValue, []);
  const local = parseJson(nextValue, []);
  const remoto = parseJson(serverValue, []);
  const chave = (item) => String(item?.id || `${item?.pedido || ""}||${item?.produto || ""}||${item?.criadoEm || ""}`);
  const mapear = (lista) => new Map((Array.isArray(lista) ? lista : []).map(item => [chave(item), item]));
  const mb = mapear(base), ml = mapear(local), mr = mapear(remoto);
  const iguais = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const resultado = [];

  for (const k of new Set([...mb.keys(), ...ml.keys(), ...mr.keys()])) {
    const b = mb.get(k), l = ml.get(k), r = mr.get(k);
    if (l === undefined) {
      if (r === undefined || b === undefined || iguais(r, b)) continue;
      resultado.push(r); continue;
    }
    if (r === undefined) { resultado.push(l); continue; }
    if (b === undefined) { resultado.push(l); continue; }
    if (iguais(l, b)) { resultado.push(r); continue; }
    if (iguais(r, b)) { resultado.push(l); continue; }
    if (r.etapa === "arquivado" && l.etapa !== "arquivado") resultado.push(r);
    else resultado.push(l);
  }
  return resultado;
}

export async function salvarListaSegura(key, baseValue, nextValue) {
  if (!supabaseConfigurado || !supabase) return false;
  try {
    const { data: existente, error: erroLeitura } = await supabase
      .from(STATE_TABLE).select("value").eq("key", key).maybeSingle();
    if (erroLeitura) throw erroLeitura;

    const servidor = existente?.value;
    const resultado = mergeListas(baseValue, nextValue, servidor);
    const { error } = await supabase.from(STATE_TABLE).upsert({
      key,
      value: JSON.stringify(resultado),
      updated_at: new Date().toISOString(),
      updated_by: (await supabase.auth.getUser()).data?.user?.id || null,
    }, { onConflict: "key" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Erro ao salvar lista no Supabase", e);
    return false;
  }
}

export async function atualizarEstoqueSeguro(key, produto, valor, modo = "definir") {
  const nome = String(produto || "").trim();
  const quantidade = Math.max(0, Number(valor) || 0);
  if (!nome || !supabaseConfigurado || !supabase) return { ok: false, estoque: 0 };

  try {
    const { data, error: leituraErro } = await supabase.from(STATE_TABLE).select("value").eq("key", key).maybeSingle();
    if (leituraErro) throw leituraErro;
    const mapa = parseJson(data?.value, {});
    const atual = Math.max(0, Number(mapa[nome]) || 0);
    const novo = modo === "somar" ? atual + quantidade : modo === "subtrair" ? Math.max(0, atual - quantidade) : quantidade;
    mapa[nome] = novo;
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from(STATE_TABLE).upsert({
      key, value: JSON.stringify(mapa), updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null,
    }, { onConflict: "key" });
    if (error) throw error;
    return { ok: true, estoque: novo };
  } catch (e) {
    console.error("Erro ao atualizar estoque no Supabase", e);
    return { ok: false, estoque: 0 };
  }
}

export async function salvarValor(key, value) {
  if (!supabaseConfigurado || !supabase) return false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from(STATE_TABLE).upsert({
      key, value: typeof value === "string" ? value : JSON.stringify(value),
      updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null,
    }, { onConflict: "key" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Erro ao salvar valor no Supabase", e);
    return false;
  }
}

export async function registrarAuditoria(registro) {
  if (!supabaseConfigurado || !supabase) return false;
  try {
    const { data: authData } = await supabase.auth.getUser();
    const usuario = authData?.user;
    if (!usuario) return false;
    const { error } = await supabase.from(AUDIT_TABLE).insert({
      usuario_email: usuario.email || registro.usuarioEmail || "",
      registro,
      criado_em: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Erro ao registrar auditoria no Supabase", e);
    return false;
  }
}

export function inscreverAuditoria(callback) {
  if (!supabaseConfigurado || !supabase) {
    callback([], new Error("Supabase não configurado."));
    return () => {};
  }
  let ativo = true;
  const carregar = async () => {
    const { data, error } = await supabase.from(AUDIT_TABLE).select("id, usuario_email, registro, criado_em").order("criado_em", { ascending: false }).limit(300);
    if (!ativo) return;
    if (error) callback([], error);
    else callback((data || []).map(row => ({ id: row.id, ...(row.registro || {}), usuarioEmail: row.usuario_email, criadoEm: new Date(row.criado_em).getTime() })), null);
  };
  carregar();
  const canal = supabase.channel("auditoria-producao")
    .on("postgres_changes", { event: "*", schema: "public", table: AUDIT_TABLE }, carregar)
    .subscribe();
  return () => { ativo = false; supabase.removeChannel(canal); };
}

/**
 * Corrige uma duplicação confirmada entre duas etapas lendo e gravando o estado
 * atual diretamente no Supabase, sem o merge de exclusões usado para salvamentos comuns.
 * Só remove registros da etapa de origem quando as somas das duas etapas coincidem
 * exatamente com a quantidade explicitamente confirmada.
 */
export async function corrigirDuplicacaoEtapaSegura({ pedido, produto, quantidade, etapaRemover, etapaManter }) {
  if (!supabaseConfigurado || !supabase) return { ok: false, motivo: "supabase_indisponivel" };
  try {
    const { data, error: leituraErro } = await supabase.from(STATE_TABLE).select("value").eq("key", "costura:itens").maybeSingle();
    if (leituraErro) throw leituraErro;
    const lista = parseJson(data?.value, []);
    if (!Array.isArray(lista)) return { ok: false, motivo: "estado_invalido" };
    const corresponde = item => String(item?.pedido) === String(pedido) && String(item?.produto || "").trim().toUpperCase() === String(produto || "").trim().toUpperCase();
    const soma = etapa => lista.filter(i => corresponde(i) && i.etapa === etapa).reduce((s, i) => s + (Number(i.qtd) || 0), 0);
    if (soma(etapaRemover) !== Number(quantidade) || soma(etapaManter) !== Number(quantidade)) {
      return { ok: false, motivo: "quantidades_nao_conferem", aguardando: soma(etapaRemover), mantida: soma(etapaManter) };
    }
    const corrigida = lista.filter(i => !(corresponde(i) && i.etapa === etapaRemover));
    const { error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const { data: authData } = await supabase.auth.getUser();
    const { error: gravaErro } = await supabase.from(STATE_TABLE).upsert({
      key: "costura:itens",
      value: JSON.stringify(corrigida),
      updated_at: new Date().toISOString(),
      updated_by: authData?.user?.id || null,
    }, { onConflict: "key" });
    if (gravaErro) throw gravaErro;
    return { ok: true, removidos: lista.length - corrigida.length };
  } catch (error) {
    console.error("Falha ao corrigir duplicação de etapa", error);
    return { ok: false, motivo: "erro_gravacao" };
  }
}
