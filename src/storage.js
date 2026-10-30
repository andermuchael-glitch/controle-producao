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

/** Remove somente os registros de origem de pedidos confirmados pelo usuário como já estando na etapa destino. */
export async function corrigirEtapaConfirmada({ pedidos, produto, etapaRemover, etapaManter }) {
  if (!supabaseConfigurado || !supabase) return { ok: false, motivo: "supabase_indisponivel" };
  try {
    const { data, error } = await supabase.from(STATE_TABLE).select("value").eq("key", "costura:itens").maybeSingle();
    if (error) throw error;
    const lista = parseJson(data?.value, []);
    if (!Array.isArray(lista)) return { ok: false, motivo: "estado_invalido" };
    const ids = new Set(pedidos.map(String));
    const mesmoProduto = i => String(i?.produto || "").trim().toUpperCase() === String(produto).trim().toUpperCase();
    const temDestino = new Set(lista.filter(i => ids.has(String(i?.pedido)) && mesmoProduto(i) && i.etapa === etapaManter).map(i => String(i.pedido)));
    const remover = i => ids.has(String(i?.pedido)) && mesmoProduto(i) && i.etapa === etapaRemover && temDestino.has(String(i.pedido));
    const corrigida = lista.filter(i => !remover(i));
    const removidos = lista.length - corrigida.length;
    if (!removidos) return { ok: true, removidos: 0, motivo: "nenhum_registro_origem_encontrado", pedidosDestino: [...temDestino] };
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const { error: gravaErro } = await supabase.from(STATE_TABLE).upsert({
      key: "costura:itens",
      value: JSON.stringify(corrigida),
      updated_at: new Date().toISOString(),
      updated_by: authData?.user?.id || null,
    }, { onConflict: "key" });
    if (gravaErro) throw gravaErro;
    return { ok: true, removidos, pedidosDestino: [...temDestino] };
  } catch (error) {
    console.error("Falha ao corrigir etapa confirmada", error);
    return { ok: false, motivo: "erro_gravacao" };
  }
}

async function lerEstadoItensAtual() {
  const { data, error } = await supabase.from(STATE_TABLE).select("value").eq("key", "costura:itens").maybeSingle();
  if (error) throw error;
  const lista = parseJson(data?.value, []);
  if (!Array.isArray(lista)) throw new Error("Estado de produção inválido");
  return lista;
}
async function gravarEstadoItensAtual(lista) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const { error } = await supabase.from(STATE_TABLE).upsert({
    key: "costura:itens", value: JSON.stringify(lista),
    updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null,
  }, { onConflict: "key" });
  if (error) throw error;
}
export async function repararDuplicacoesConfirmadas(pedidos, produto, etapaOrigem, etapaDestino) {
  if (!supabaseConfigurado || !supabase) return { ok: false, removidos: 0 };
  try {
    const lista = await lerEstadoItensAtual();
    const numeros = new Set(pedidos.map(String));
    const prod = String(produto || "").trim().toUpperCase();
    const destino = new Set(lista.filter(i => numeros.has(String(i.pedido)) && String(i.produto || "").trim().toUpperCase() === prod && i.etapa === etapaDestino).map(i => String(i.pedido)));
    const corrigida = lista.filter(i => !(numeros.has(String(i.pedido)) && destino.has(String(i.pedido)) && String(i.produto || "").trim().toUpperCase() === prod && i.etapa === etapaOrigem));
    const removidos = lista.length - corrigida.length;
    if (removidos) await gravarEstadoItensAtual(corrigida);
    return { ok: true, removidos, pedidosDestino: [...destino], itens: corrigida };
  } catch (error) {
    console.error("Falha ao reparar duplicações confirmadas", error);
    return { ok: false, removidos: 0 };
  }
}
/**
 * Movimenta uma quantidade entre etapas usando uma função transacional no PostgreSQL.
 * O banco bloqueia a linha do estado, valida o saldo e grava débito/crédito juntos.
 */
const movimentacoesEmAndamento = new Set();

function novoIdMovimentacao() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "op-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

async function moverEtapaAtomica({ pedido, produto, quantidade, etapaOrigem, etapaDestino, dados }) {
  if (!supabaseConfigurado || !supabase) return { ok: false, motivo: "supabase_indisponivel" };
  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) return { ok: false, motivo: "quantidade_invalida" };
  const chave = [String(pedido).trim(), String(produto || "").trim().toUpperCase(), etapaOrigem, etapaDestino].join("::");
  if (movimentacoesEmAndamento.has(chave)) return { ok: false, motivo: "movimentacao_em_andamento" };
  movimentacoesEmAndamento.add(chave);
  try {
    const { data, error } = await supabase.rpc("mover_etapa_producao_atomica", {
      p_operacao_id: novoIdMovimentacao(),
      p_pedido: String(pedido).trim(),
      p_produto: String(produto || "").trim(),
      p_etapa_origem: etapaOrigem,
      p_etapa_destino: etapaDestino,
      p_quantidade: qtd,
      p_dados: dados || {},
    });
    if (error) throw error;
    const resultado = typeof data === "string" ? JSON.parse(data) : data;
    if (!resultado?.ok) return { ok: false, motivo: resultado?.motivo || "movimentacao_recusada", disponivel: resultado?.disponivel };
    const itens = Array.isArray(resultado.itens) ? resultado.itens : null;
    if (!itens) throw new Error("O Supabase não retornou a lista atualizada.");
    return { ok: true, itens, repetida: !!resultado.repetida };
  } catch (error) {
    console.error("Falha na movimentação transacional", error);
    return { ok: false, motivo: "erro_gravacao" };
  } finally {
    movimentacoesEmAndamento.delete(chave);
  }
}

export async function moverParaSublimacaoNoServidor({ pedido, produto, quantidade, cor, sublimador, dataSublimacao }) {
  return moverEtapaAtomica({
    pedido, produto, quantidade,
    etapaOrigem: "aguardando_sublimacao",
    etapaDestino: "sublimacao",
    dados: {
      id: "mov-" + novoIdMovimentacao(),
      cor: cor || "",
      sublimador: sublimador || "",
      dataSublimacao: dataSublimacao || "",
      equipe: "Não decidido",
      feito: false,
      conferido: false,
      criadoEm: Date.now(),
    },
  });
}

/** Move Pré-Corte para Aguardando Sublimação em uma única transação no banco. */
export async function moverParaAguardandoSublimacaoNoServidor({ pedido, produto, quantidade, cortador, dataCorte, qtdEstoqueConsumida = 0, qtdNovaCorte = 0 }) {
  return moverEtapaAtomica({
    pedido, produto, quantidade,
    etapaOrigem: "pre_corte",
    etapaDestino: "aguardando_sublimacao",
    dados: {
      id: "corte-" + novoIdMovimentacao(),
      cortador: cortador || "Kayo",
      dataCorte: Number(qtdNovaCorte) > 0 ? (dataCorte || "") : "",
      qtdEstoqueConsumida: Math.max(0, Number(qtdEstoqueConsumida) || 0),
      qtdNovaCorte: Math.max(0, Number(qtdNovaCorte) || 0),
      equipe: "Não decidido",
      feito: false,
      conferido: false,
      criadoEm: Date.now(),
    },
  });
}

/** Arquiva os registros das fases operacionais removidas, preservando todos os dados e quantidades. Idempotente. */
export async function arquivarFasesCosturaRemovidas() {
  if (!supabaseConfigurado || !supabase) return { ok: false, arquivados: 0 };
  try {
    const { data, error } = await supabase.from(STATE_TABLE).select("value").eq("key", "costura:itens").maybeSingle();
    if (error) throw error;
    const lista = parseJson(data?.value, []);
    if (!Array.isArray(lista)) throw new Error("Estado de produção inválido");
    const removidas = new Set(["aguardando_costura", "costura", "separacao"]);
    let arquivados = 0;
    const agora = Date.now();
    const atualizada = lista.map(item => {
      if (!removidas.has(item?.etapa)) return item;
      arquivados++;
      return { ...item, etapa: "arquivado", arquivadoEm: item.arquivadoEm || agora, motivoArquivamento: "Fluxo simplificado: arquivamento após sublimação" };
    });
    if (!arquivados) return { ok: true, arquivados: 0 };
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const { error: saveError } = await supabase.from(STATE_TABLE).upsert({
      key: "costura:itens", value: JSON.stringify(atualizada),
      updated_at: new Date().toISOString(), updated_by: authData?.user?.id || null,
    }, { onConflict: "key" });
    if (saveError) throw saveError;
    return { ok: true, arquivados };
  } catch (error) {
    console.error("Falha ao arquivar fases removidas", error);
    return { ok: false, arquivados: 0 };
  }
}

/** Move quantidade do Pré-Corte para Aguardando Sublimação, debitando todo o saldo de origem em uma única gravação. */
export async function moverParaAguardandoSublimacaoNoServidor({ pedido, produto, quantidade, cortador, dataCorte, qtdEstoqueConsumida = 0, qtdNovaCorte = 0 }) {
  if (!supabaseConfigurado || !supabase) return { ok: false, motivo: "supabase_indisponivel" };
  try {
    const lista = await lerEstadoItensAtual();
    const pedidoStr = String(pedido).trim();
    const prod = String(produto || "").trim().toUpperCase();
    const total = lista.filter(i => String(i.pedido).trim() === pedidoStr && String(i.produto || "").trim().toUpperCase() === prod && i.etapa === "pre_corte").reduce((s, i) => s + Math.max(0, Number(i.qtd) || 0), 0);
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > total) return { ok: false, motivo: "saldo_insuficiente", disponivel: total };
    let saldo = qtd;
    const atualizada = [];
    for (const item of lista) {
      if (saldo > 0 && String(item.pedido).trim() === pedidoStr && String(item.produto || "").trim().toUpperCase() === prod && item.etapa === "pre_corte") {
        const disponivel = Math.max(0, Number(item.qtd) || 0);
        const mover = Math.min(disponivel, saldo);
        if (disponivel - mover > 0) atualizada.push({ ...item, qtd: disponivel - mover });
        saldo -= mover;
      } else atualizada.push(item);
    }
    if (saldo > 0) return { ok: false, motivo: "saldo_insuficiente", disponivel: qtd - saldo };
    atualizada.push({ id: "corte-" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)), pedido: pedidoStr, produto, qtd, etapa: "aguardando_sublimacao", cortador: cortador || "Kayo", dataCorte: Number(qtdNovaCorte) > 0 ? (dataCorte || "") : "", qtdEstoqueConsumida: Math.max(0, Number(qtdEstoqueConsumida) || 0), qtdNovaCorte: Math.max(0, Number(qtdNovaCorte) || 0), equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now() });
    await gravarEstadoItensAtual(atualizada);
    return { ok: true, itens: atualizada };
  } catch (error) { console.error("Falha ao mover Pré-Corte para Aguardando Sublimação", error); return { ok: false, motivo: "erro_gravacao" }; }
}
