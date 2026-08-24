import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { inscrever, salvarValor, registrarAuditoria, inscreverAuditoria } from "./storage.js";
import { auth, firebaseConfigurado } from "./firebase.js";

const PRODUTOS = ["LATA 350ML","LATA 473ML","LATA PALITO 269ML","LATA PALITO 350ML","LONG NECK","GFA 600ML","GFA 1000ML","PORTA COPOS","COOLER TÉRMICO PEQUENO","COOLER TÉRMICO GRANDE","PORTA ÁGUA/ISOTÔNICO","PORTA SQUEEZE","600ML DE MESA","BARMAT GRANDE","BARMAT PADRÃO","COOLER TÉRMICO LATERAL","PORTA VINHO SIMPLES","PORTA VINHO DUPLO","PORTA VINHO DUPLO COM BOLSA","ESPUMANTES","ESTEIRA DE PRAIA","MATEIRA MEDIA","MATEIRA GRANDE","MINI BAG PEQUENA TRANSVERSAL","CASE TABLET","CASE NOTEBOOK","MOUSEPAD PADRÃO","MOUSEPAD GAMER","POCHETE","PORTA ÓCULOS","VISEIRA","MUNHEQUEIRA","TAPA OLHOS","CASE CELULAR","TAG MALA","LUVA COM APARADOR","CORRENTE ÓCULOS","NECESSAIRE GRANDE","MÁSCARA","PROTETOR FACIAL","MOCHILA TRANSVERSAL","BOLSA DE OMBRO","BOLSA MEIA LUA","MINI BAG","CARTEIRA FEMININA","LIXEIRA","MOEDEIRO","NECESSAIRE","LANCHEIRA","ESTOJO","MOCHILA TÉRMICA","MOCHILA INFANTIL","LATA CAMISA","LONG NECK CAMISA","PORTA UTILIDADES","WINE BAG","WINE CASE DELUXE","MARMITEIRA","CANGA DE PRAIA","SUPORTE DE COPO","TOLHA DE BANHO","TOALHA C/ CAPUZ G","TOALHA C/ CAPUZ M","BOLSA TOALHA","CANGA DE PRAIA GRANDE","CAPA P/ MALA GRANDE","CAPA P/ MALA MÉDIA","CAPA P/ MALA PEQUENA","MOCHILA IMPERMEÁVEL","VISEIRA TURBANTE"];

const CORES = [
  { nome: "Preto", hex: "#1a1a1a" },
  { nome: "Royal", hex: "#1f4fd8" },
  { nome: "Marinho", hex: "#12234a" },
  { nome: "Vermelho", hex: "#c81e2c" },
  { nome: "Pink", hex: "#e6218f" },
  { nome: "Rosa bebê", hex: "#f4b6c2" },
  { nome: "Verde", hex: "#1f8a3d" },
  { nome: "Amarelo", hex: "#f4c81f" },
  { nome: "Lilás", hex: "#b09ce0" },
  { nome: "Verde Palmeiras", hex: "#046a38" },
  { nome: "Celeste", hex: "#7ec8e3" },
  { nome: "Laranja", hex: "#f0701e" },
  { nome: "Verde água", hex: "#4fc9b0" },
  { nome: "Marrom", hex: "#6b4327" },
  { nome: "Creme", hex: "#f0e4c8" },
  { nome: "Branco", hex: "#ffffff" },
];
const corHex = (nome) => CORES.find((c) => c.nome === nome)?.hex || "#999";
const corClara = (hex) => ["#ffffff", "#f0e4c8", "#f4c81f", "#f4b6c2", "#7ec8e3", "#4fc9b0"].includes(hex);

const EQUIPES = ["Não decidido", "Costura interna", "Eleni", "Sandra", "Dona Josi", "Mara", "Mirian", "Adriana"];
const SUBLIMADORES = ["Gabriel", "Pedro", "Kayo", "Kauan", "Ricarlos"];
const CORTADORES = ["Patrick"];

const ETAPAS = ["pre_corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];
const ETAPA_LABEL = {
  pre_corte: "Pré-Corte",
  aguardando_sublimacao: "Aguardando Sublimação",
  sublimacao: "Sublimação",
  aguardando_costura: "Aguardando Costura",
  costura: "Costura",
  separacao: "Separação",
};

const STORAGE_KEY = "costura:itens";
const META_KEY = "costura:pedidosMeta";
const AUDIT_ADMIN_EMAIL = "andermuchael@gmail.com";
const uid = () => Math.random().toString(36).slice(2, 10);
const hoje = () => new Date().toISOString().slice(0, 10);
const formatarDataBR = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const mesRef = (iso) => (iso ? iso.slice(0, 7) : "");
const nomeMes = (ref) => {
  const [y, m] = ref.split("-");
  const nomes = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${nomes[Number(m) - 1]}/${y.slice(2)}`;
};
const diasAteEntrega = (iso) => {
  if (!iso) return null;
  const alvo = new Date(iso + "T00:00:00");
  const agora = new Date(); agora.setHours(0, 0, 0, 0);
  return Math.round((alvo - agora) / 86400000);
};
function urgenciaInfo(iso) {
  const dias = diasAteEntrega(iso);
  if (dias === null) return { texto: "sem data", cor: "#948a76", fundo: "#eee5d2" };
  if (dias < 0) return { texto: `atrasado ${Math.abs(dias)}d`, cor: "#fff", fundo: "#c81e2c" };
  if (dias === 0) return { texto: "entrega hoje", cor: "#fff", fundo: "#c81e2c" };
  if (dias <= 2) return { texto: `${dias}d restantes`, cor: "#fff", fundo: "#d8622c" };
  if (dias <= 5) return { texto: `${dias}d restantes`, cor: "#5c4a12", fundo: "#f4c81f" };
  return { texto: `${dias}d restantes`, cor: "#1f5c2e", fundo: "#d7ecd0" };
}

const normalizarItens = (lista) => {
  const arr = Array.isArray(lista) ? lista : [];
  const rank = { pre_corte: 0, aguardando_sublimacao: 1, sublimacao: 2, aguardando_costura: 3, costura: 4, separacao: 5, corte: 1 };
  const vistoExato = new Set();
  const prePorProduto = new Set();
  return [...arr]
    .map((i) => ({ ...i, etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "pre_corte") }))
    .sort((a, b) => (rank[a.etapa] ?? 99) - (rank[b.etapa] ?? 99))
    .filter((i) => {
      if (!i.pedido || !i.produto) return false;
      const chave = `${i.pedido}||${String(i.produto).trim().toUpperCase()}`;
      if (i.etapa === "pre_corte") {
        if (prePorProduto.has(chave)) return false;
        prePorProduto.add(chave);
      }
      const fp = JSON.stringify({ pedido: i.pedido, produto: i.produto, etapa: i.etapa, qtd: Number(i.qtd) || 0, cor: i.cor || "", dataCorte: i.dataCorte || "", sublimador: i.sublimador || "", dataSublimacao: i.dataSublimacao || "", equipe: i.equipe || "", feito: !!i.feito, conferido: !!i.conferido });
      if (vistoExato.has(fp)) return false;
      vistoExato.add(fp);
      return true;
    });
};

export default function App() {
  const [itens, setItens] = useState([]);
  const [pedidosMeta, setPedidosMeta] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [erro, setErro] = useState("");
  const [aba, setAba] = useState("pre_corte");
  const [pedido, setPedido] = useState("");
  const [produto, setProduto] = useState(PRODUTOS[0]);
  const [qtd, setQtd] = useState(1);
  const [dataEntregaForm, setDataEntregaForm] = useState("");
  const [filtroPedido, setFiltroPedido] = useState("");
  const [produtoFiltroCorte, setProdutoFiltroCorte] = useState("Todos");
  const [filtroEquipe, setFiltroEquipe] = useState("Todas");
  const [filtroSublimador, setFiltroSublimador] = useState("Todos");
  const [mostrarDrive, setMostrarDrive] = useState(false);
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);
  const [auditoria, setAuditoria] = useState([]);
  const [telaCheia, setTelaCheia] = useState(false);
  const [alocForm, setAlocForm] = useState({});
  const [corteForm, setCorteForm] = useState({});
  const [buscaGlobal, setBuscaGlobal] = useState("");
  const [pdfGerando, setPdfGerando] = useState(false);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  useEffect(() => {
    const onFsChange = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  const alternarTelaCheia = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    let recebeuItens = false, recebeuMeta = false;
    const marcar = () => { if (recebeuItens && recebeuMeta) setLoaded(true); };
    const cancelarItens = inscrever(STORAGE_KEY, (raw, erroSnap) => {
      if (erroSnap) setErro("Não foi possível conectar ao Firebase. Verifique as chaves no .env.");
      else if (raw) {
        try {
          const carregados = JSON.parse(raw);
          const normalizados = normalizarItens(carregados);
          setItens(normalizados);
          if (JSON.stringify(normalizados) !== JSON.stringify(carregados)) salvarValor(STORAGE_KEY, JSON.stringify(normalizados));
        } catch { setErro("Não foi possível ler os dados salvos."); }
      }
      recebeuItens = true; marcar();
    });
    const cancelarMeta = inscrever(META_KEY, (raw, erroSnap) => {
      if (!erroSnap && raw) { try { setPedidosMeta(JSON.parse(raw)); } catch {} }
      recebeuMeta = true; marcar();
    });
    return () => { cancelarItens(); cancelarMeta(); };
  }, []);

  useEffect(() => {
    if (!mostrarAuditoria || auth?.currentUser?.email?.toLowerCase() !== AUDIT_ADMIN_EMAIL) return () => {};
    return inscreverAuditoria((registros, erroSnap) => { if (erroSnap) setErro("Não foi possível carregar o histórico de auditoria."); else setAuditoria(registros); });
  }, [mostrarAuditoria]);

  const salvar = async (novaLista) => {
    const normalizados = normalizarItens(novaLista);
    setItens(normalizados);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(normalizados));
    const user = auth?.currentUser;
    if (user) {
      await registrarAuditoria({ usuarioEmail: user.email || "desconhecido", usuarioNome: user.displayName || user.email || "desconhecido", acao: "alteração", pedido: normalizados[0]?.pedido || "", detalhes: "Atualização do fluxo de produção" });
    }
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };
  const salvarMeta = async (novoMeta) => { setPedidosMeta(novoMeta); await salvarValor(META_KEY, JSON.stringify(novoMeta)); };
  const definirDataEntrega = (numero, data) => salvarMeta({ ...pedidosMeta, [numero]: { ...(pedidosMeta[numero] || {}), dataEntrega: data } });

  const adicionarItem = () => {
    const numero = pedido.trim();
    if (!numero) return;
    const existentePosterior = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa !== "pre_corte");
    if (existentePosterior) { setErro(`O pedido #${numero} / ${produto} já está em ${ETAPA_LABEL[existentePosterior.etapa] || existentePosterior.etapa}. Não será criado outro Pré-Corte.`); return; }
    const existente = itens.find((i) => i.pedido === numero && i.produto === produto && i.etapa === "pre_corte");
    if (existente) { setErro(`O pedido #${numero} já possui ${produto} no pré-corte. Para evitar duplicação, altere a quantidade no lançamento existente.`); return; }
    const novo = { id: uid(), pedido: numero, produto, qtd: Math.max(1, Number(qtd) || 1), etapa: "pre_corte", criadoEm: Date.now() };
    salvar([...itens, novo]);
    if (dataEntregaForm) definirDataEntrega(numero, dataEntregaForm);
    setQtd(1);
  };

  const resultadosBuscaGlobal = useMemo(() => {
    const termo = String(buscaGlobal || "").trim().toLowerCase();
    if (!termo) return [];
    return itens.filter((it) => {
      const texto = [it.pedido, it.produto, it.cor, it.equipe, it.sublimador, ETAPA_LABEL[it.etapa] || it.etapa].filter(Boolean).join(" ").toLowerCase();
      return texto.includes(termo);
    }).slice(0, 20);
  }, [itens, buscaGlobal]);
  const abrirResultadoBuscaGlobal = (it) => {
    const etapa = it.etapa === "corte" ? "aguardando_sublimacao" : it.etapa;
    setAba(etapa);
    setFiltroPedido(String(it.pedido));
    setBuscaGlobal("");
    setTimeout(() => {
      const el = document.querySelector('[data-pedido="' + String(it.pedido).replace(/"/g, "") + '"]');
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  const chaveAloc = (p, prod) => `${p}||${prod}`;
  const getCorteForm = (p, prod, restante) => corteForm[chaveAloc(p, prod)] || { qtd: restante, data: hoje() };
  const setCorteFormCampo = (p, prod, restante, campo, valor) => {
    const chave = chaveAloc(p, prod);
    setCorteForm((f) => ({ ...f, [chave]: { ...getCorteForm(p, prod, restante), [campo]: valor } }));
  };
  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdMover = Math.max(1, Math.min(Number(f.qtd) || 1, restante));
    let saldo = qtdMover;
    const nova = itens.flatMap((i) => {
      if (saldo > 0 && i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "pre_corte") {
        const novoSaldo = Math.max(0, (Number(i.qtd) || 0) - saldo);
        saldo = 0;
        return novoSaldo > 0 ? [{ ...i, qtd: novoSaldo }] : [];
      }
      return [i];
    });
    const etapaDestino = "aguardando_sublimacao";
    nova.push({ id: uid(), pedido: pedidoNum, produto: produtoNome, qtd: qtdMover, etapa: etapaDestino, cortador: "Patrick", dataCorte: f.data || hoje(), equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now() });
    salvar(nova);
    setCorteForm((x) => ({ ...x, [chaveAloc(pedidoNum, produtoNome)]: { ...f, qtd: Math.max(1, restante - qtdMover) } }));
  };

  const getAlocForm = (p, prod) => alocForm[chaveAloc(p, prod)] || { cor: CORES[0].nome, qtd: 1, sublimador: SUBLIMADORES[0], data: hoje() };
  const setAlocFormCampo = (p, prod, campo, valor) => setAlocForm((f) => ({ ...f, [chaveAloc(p, prod)]: { ...getAlocForm(p, prod), [campo]: valor } }));
  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const qtdEnviar = Math.max(1, Number(f.qtd) || 1);
    let restante = qtdEnviar;
    const nova = itens.flatMap((i) => {
      if (restante > 0 && i.pedido === pedidoNum && i.produto === produtoNome && i.etapa === "aguardando_sublimacao") {
        const novoSaldo = Math.max(0, (Number(i.qtd) || 0) - restante);
        restante = 0;
        return novoSaldo > 0 ? [{ ...i, qtd: novoSaldo }] : [];
      }
      return [i];
    });
    const efetivo = qtdEnviar - restante;
    if (efetivo <= 0) { setErro("Não há saldo disponível para enviar à sublimação."); return; }
    nova.push({ id: uid(), pedido: pedidoNum, produto: produtoNome, cor: f.cor, qtd: efetivo, etapa: "sublimacao", sublimador: f.sublimador, dataSublimacao: f.data || hoje(), equipe: "Não decidido", feito: false, conferido: false, criadoEm: Date.now() });
    salvar(nova);
  };
  const moverParaAguardandoCostura = (id) => salvar(itens.map((i) => i.id === id ? { ...i, etapa: "aguardando_costura" } : i));
  const moverParaCostura = (id) => salvar(itens.map((i) => i.id === id ? { ...i, etapa: "costura" } : i));
  const removerItem = (id) => salvar(itens.filter((i) => i.id !== id));
  const excluirPedidoPreCorte = (numero) => salvar(itens.filter((i) => !(i.pedido === numero && i.etapa === "pre_corte")));
  const setEquipeItem = (id, equipe) => salvar(itens.map((i) => i.id === id ? { ...i, equipe } : i));
  const setCorItem = (id, cor) => salvar(itens.map((i) => i.id === id ? { ...i, cor } : i));
  const toggleConferido = (id) => salvar(itens.map((i) => i.id === id ? { ...i, conferido: !i.conferido } : i));
  const toggleFeito = (id) => salvar(itens.map((i) => i.id === id ? { ...i, feito: !i.feito } : i));
  const moverPedidoParaSeparacao = (numero) => salvar(itens.map((i) => i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i));

  const getItensDataEntrega = (numero) => pedidosMeta[numero]?.dataEntrega || "";
  const preCorteAgrupado = useMemo(() => {
    const grupos = {};
    for (const it of itens) { if (it.etapa !== "pre_corte") continue; (grupos[it.pedido] ||= []).push(it); }
    return Object.entries(grupos).map(([numero, its]) => { const linhas = its.map((it) => ({ produto: it.produto, total: it.qtd, cortado: 0, restante: it.qtd })); return { numero, linhas, totalGeral: linhas.reduce((s, l) => s + l.total, 0), cortadoGeral: 0, dataEntrega: getItensDataEntrega(numero) }; }).filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  }, [itens, pedidosMeta, filtroPedido]);
  const resumoProdutosCorte = useMemo(() => { const mapa = {}; for (const p of preCorteAgrupado) for (const l of p.linhas) { if (!mapa[l.produto]) mapa[l.produto] = { numPedidos: 0, restante: 0 }; mapa[l.produto].numPedidos += 1; mapa[l.produto].restante += l.restante; } return Object.entries(mapa).map(([produto, v]) => ({ produto, ...v })).sort((a, b) => b.restante - a.restante); }, [preCorteAgrupado]);
  const preCorteAgrupadoFiltradoPorProduto = useMemo(() => produtoFiltroCorte === "Todos" ? preCorteAgrupado : preCorteAgrupado.map((p) => ({ ...p, linhas: p.linhas.filter((l) => l.produto === produtoFiltroCorte) })).filter((p) => p.linhas.length), [preCorteAgrupado, produtoFiltroCorte]);
  const aguardandoSublimacaoAgrupado = useMemo(() => { const grupos = {}; for (const it of itens) if (it.etapa === "aguardando_sublimacao") { if (!grupos[it.pedido]) grupos[it.pedido] = {}; grupos[it.pedido][it.produto] = (grupos[it.pedido][it.produto] || 0) + it.qtd; } return Object.entries(grupos).map(([numero, produtos]) => ({ numero, linhas: Object.entries(produtos).map(([prod, total]) => ({ produto: prod, total, restante: total, alocado: 0 })), totalGeral: Object.values(produtos).reduce((s, q) => s + q, 0), alocadoGeral: 0, dataEntrega: getItensDataEntrega(numero) })).filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase())); }, [itens, pedidosMeta, filtroPedido]);
  const sublimacaoFiltrada = useMemo(() => Object.entries(itens.filter((i) => i.etapa === "sublimacao").reduce((acc, it) => { const d = it.dataSublimacao || "sem-data"; (acc[d] ||= []).push(it); return acc; }, {})).sort((a, b) => b[0].localeCompare(a[0])).map(([dia, its]) => [dia, its.filter((i) => filtroSublimador === "Todos" || i.sublimador === filtroSublimador).filter((i) => String(i.pedido).toLowerCase().includes(filtroPedido.toLowerCase()))]).filter(([, its]) => its.length), [itens, filtroSublimador, filtroPedido]);
  const agruparPorPedido = (etapa, campo) => { const grupos = {}; for (const it of itens) if (it.etapa === etapa) (grupos[it.pedido] ||= []).push(it); return Object.entries(grupos).map(([numero, its]) => { const total = its.reduce((s, i) => s + i.qtd, 0); const feito = campo ? its.reduce((s, i) => s + (i[campo] ? i.qtd : 0), 0) : 0; return { numero, itens: its, total, feito, pct: total ? feito / total : 0, completo: campo ? feito === total : false, dataEntrega: getItensDataEntrega(numero) }; }).filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase())); };
  const aguardandoCosturaAgrupado = useMemo(() => agruparPorPedido("aguardando_costura"), [itens, pedidosMeta, filtroPedido]);
  const costuraAgrupado = useMemo(() => agruparPorPedido("costura", "feito"), [itens, pedidosMeta, filtroPedido]);
  const separacaoAgrupado = useMemo(() => agruparPorPedido("separacao", "conferido"), [itens, pedidosMeta, filtroPedido]);
  const costuraFiltrado = costuraAgrupado;
  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);
  const totalAguardandoSublimacao = itens.filter((i) => i.etapa === "aguardando_sublimacao").reduce((s, i) => s + i.qtd, 0);
  const totalSublimacao = itens.filter((i) => i.etapa === "sublimacao").reduce((s, i) => s + i.qtd, 0);
  const totalAguardando = itens.filter((i) => i.etapa === "aguardando_costura").reduce((s, i) => s + i.qtd, 0);
  const totalCosturaAberto = costuraAgrupado.filter((p) => !p.completo).length;
  const totalSeparacaoPend = itens.filter((i) => i.etapa === "separacao" && !i.conferido).reduce((s, i) => s + i.qtd, 0);
  const ABAS = [
    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },
    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },
    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },
    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },
    { id: "costura", label: "Costura", contagem: totalCosturaAberto },
    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },
  ];

  const abrirEtapa = (etapa) => { setAba(etapa); setFiltroPedido(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const abrirResultado = (item) => { abrirEtapa(item.etapa); setFiltroPedido(String(item.pedido)); setTimeout(() => { const el = document.querySelector(`[data-pedido="${String(item.pedido).replace(/"/g, "")}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 250); };

  const exportarXLSX = () => {
    const rows = itens.map((i) => ({ pedido: i.pedido, produto: i.produto, quantidade: i.qtd, etapa: ETAPA_LABEL[i.etapa] || i.etapa, cor: i.cor || "", equipe: i.equipe || "", sublimador: i.sublimador || "", dataCorte: i.dataCorte || "", dataSublimacao: i.dataSublimacao || "" }));
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Producao"); XLSX.writeFile(wb, `controle-producao-${hoje()}.xlsx`);
  };
  const exportarPDF = async () => { if (!window.jspdf) return; setPdfGerando(true); try { const { jsPDF } = window.jspdf; const doc = new jsPDF(); doc.text("Controle de Produção", 14, 18); const rows = itens.map((i) => [i.pedido, i.produto, i.qtd, ETAPA_LABEL[i.etapa] || i.etapa, i.cor || ""]); doc.autoTable({ head: [["Pedido","Produto","Qtd","Etapa","Cor"]], body: rows, startY: 24 }); doc.save(`controle-producao-${hoje()}.pdf`); } finally { setPdfGerando(false); } };
  const limparTudo = async () => { await salvar([]); await salvarMeta({}); setConfirmarLimpeza(false); };

  return (
    <div style={styles.page}>
      <style>{`*{box-sizing:border-box}body{margin:0}input,select,button{font-family:inherit}.card{animation:rise .2s ease both}@keyframes rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@media(max-width:640px){.app-header{padding:14px!important}.app-main{padding:16px 12px 24px!important}.form-grid{grid-template-columns:1fr!important}.tabs-row{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}.tabs-row::-webkit-scrollbar{display:none}.tab-btn{flex:0 0 auto!important}input,select{font-size:16px!important}.pedido-card{padding:12px!important}}`}</style>
      <header style={styles.header} className="app-header">
        <div style={styles.headerInner}>
          <div style={styles.brandRow}>
            <div style={styles.spool}><div style={styles.spoolCore}/></div>
            <div style={{flex:1}}><h1 style={styles.title}>Pré-Corte → Sublimação → Costura</h1><p style={styles.subtitle}>Do pré-corte até a expedição, pedido por pedido</p></div>
            <button style={styles.fsBtn} onClick={alternarTelaCheia}>{telaCheia ? "⤡" : "⤢"}</button>
          </div>
          <div style={styles.tabs} className="tabs-row">
            {ABAS.map((t) => <button key={t.id} style={{...styles.tabBtn,...(aba===t.id?styles.tabBtnAtiva:{})}} className="tab-btn" onClick={() => abrirEtapa(t.id)}>{t.label}{t.contagem ? ` (${t.contagem})` : ""}</button>)}
          </div>
          <div style={styles.stats} className="stats-row">
            <Stat label="pré-corte" value={totalPreCorte} />
            <Stat label="aguard. sublimação" value={totalAguardandoSublimacao} />
            <Stat label="sublimação" value={totalSublimacao} />
            <Stat label="aguard. costura" value={totalAguardando} />
            <Stat label="pedidos costura" value={totalCosturaAberto} />
            <Stat label="separação" value={totalSeparacaoPend} />
          </div>
        </div>
      </header>
      <div data-global-search-direct="true" style={{position:"relative",margin:"0 auto 12px",maxWidth:900,zIndex:40}}>
        <input value={buscaGlobal} onChange={(e)=>setBuscaGlobal(e.target.value)} placeholder="Buscar pedido ou produto em todas as etapas..." aria-label="Buscar pedido ou produto em todas as etapas" style={{...styles.filtroInput,width:"100%",boxSizing:"border-box",fontSize:14,padding:"10px 12px",background:"#fffdf8"}} />
        {buscaGlobal.trim() && <div style={{position:"absolute",left:0,right:0,top:"calc(100% + 4px)",background:"#fffdf8",border:"1px solid #d8cfbd",borderRadius:10,boxShadow:"0 10px 28px rgba(0,0,0,.2)",maxHeight:360,overflowY:"auto"}}>
          {resultadosBuscaGlobal.length ? resultadosBuscaGlobal.map((it)=><button key={it.id} type="button" onClick={()=>abrirResultadoBuscaGlobal(it)} style={{display:"block",width:"100%",padding:"10px 12px",border:0,borderBottom:"1px solid #eee5d2",background:"transparent",textAlign:"left",cursor:"pointer",color:"#26384a"}}>
            <b>#{it.pedido} · {it.produto}</b><div style={{fontSize:11,marginTop:3,color:"#6b7280"}}>{ETAPA_LABEL[it.etapa] || it.etapa} · {it.qtd} un{it.cor ? " · " + it.cor : ""}</div>
          </button>) : <div style={{padding:12,color:"#777"}}>Nenhum resultado encontrado.</div>}
        </div>}
      </div>
      <main style={styles.main} className="app-main">
        {erro && <p style={styles.erro}>{erro}</p>}
        <section style={styles.formCard} className="card form-card">
          <h2 style={styles.formTitle}>Lançar item manualmente (entra no pré-corte)</h2>
          <div style={styles.formGrid} className="form-grid">
            <Field label="Nº do pedido"><input style={styles.input} value={pedido} onChange={(e)=>setPedido(e.target.value)} placeholder="ex: 1042"/></Field>
            <Field label="Produto"><select style={styles.input} value={produto} onChange={(e)=>setProduto(e.target.value)}>{PRODUTOS.map((p)=><option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label="Qtd do pedido"><input style={styles.input} type="number" min={1} value={qtd} onChange={(e)=>setQtd(e.target.value)}/></Field>
            <Field label="Data de entrega"><input style={styles.input} type="date" value={dataEntregaForm} onChange={(e)=>setDataEntregaForm(e.target.value)}/></Field>
          </div>
          <button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim()}>Adicionar ao pré-corte</button>
          <p style={styles.aviso}>Assim que o Patrick cortar, marque a quantidade e o dia na aba Pré-Corte.</p>
        </section>
        <section style={styles.exportRow} className="export-row">
          <button style={styles.exportBtn} onClick={exportarXLSX} disabled={!itens.length}>⬇ Baixar planilha (.xlsx)</button>
          <button style={styles.exportBtn} onClick={exportarPDF} disabled={!itens.length || pdfGerando}>{pdfGerando ? "Gerando PDF..." : "📄 Baixar PDF"}</button>
          <button style={styles.exportBtnOutline} onClick={()=>setMostrarDrive(true)}>Salvar no Google Drive</button>
          {auth?.currentUser?.email?.toLowerCase()===AUDIT_ADMIN_EMAIL && <button style={styles.exportBtnOutline} onClick={()=>setMostrarAuditoria(true)}>🕘 Histórico</button>}
          <button style={styles.limparBtn} onClick={()=>setConfirmarLimpeza(true)} disabled={!itens.length}>🗑 Limpar tudo</button>
        </section>
        {confirmarLimpeza && <div style={styles.modalOverlay} onClick={()=>setConfirmarLimpeza(false)}><div style={styles.modalBox} onClick={(e)=>e.stopPropagation()}><h3 style={styles.modalTitle}>Apagar todos os lançamentos?</h3><p style={styles.modalTexto}>Isso remove todos os lançamentos. Não dá pra desfazer.</p><button style={{...styles.modalFechar,background:"#c81e2c"}} onClick={limparTudo}>Sim, apagar tudo</button><button style={{...styles.modalFechar,background:"transparent",color:"#7a7160",marginTop:8}} onClick={()=>setConfirmarLimpeza(false)}>Cancelar</button></div></div>}
        {mostrarAuditoria && auth?.currentUser?.email?.toLowerCase()===AUDIT_ADMIN_EMAIL && <div style={styles.modalOverlay} onClick={()=>setMostrarAuditoria(false)}><div style={{...styles.modalBox,maxWidth:760}} onClick={(e)=>e.stopPropagation()}><h3 style={styles.modalTitle}>Histórico de alterações</h3>{auditoria.length===0?<p style={styles.vazio}>Nenhum registro encontrado.</p>:<div style={{maxHeight:520,overflow:"auto"}}>{auditoria.map((r)=><div key={r.id} style={{padding:"10px 0",borderBottom:"1px solid #e4dbc8"}}><b>{r.acao}</b> · pedido <b>#{r.pedido||"-"}</b><br/><span style={{fontSize:12,color:"#6f6658"}}>{r.usuarioEmail} · {new Date(r.criadoEm).toLocaleString("pt-BR")}</span><br/><span style={{fontSize:12}}>{r.detalhes||""}</span></div>)}</div>}<button style={styles.modalFechar} onClick={()=>setMostrarAuditoria(false)}>Fechar</button></div></div>}
        {mostrarDrive && <div style={styles.modalOverlay} onClick={()=>setMostrarDrive(false)}><div style={styles.modalBox} onClick={(e)=>e.stopPropagation()}><h3 style={styles.modalTitle}>Salvar no Google Drive</h3><p style={styles.modalTexto}>Baixe a planilha e envie ao Drive.</p><button style={styles.modalFechar} onClick={()=>setMostrarDrive(false)}>Entendi</button></div></div>}
        <div style={styles.listHeader} className="list-header">
          <input style={styles.filtroInput} placeholder="Buscar nº do pedido..." value={filtroPedido} onChange={(e)=>setFiltroPedido(e.target.value)}/>
          {aba === "sublimacao" && <select style={styles.filtroInput} value={filtroSublimador} onChange={(e)=>setFiltroSublimador(e.target.value)}><option value="Todos">Todos os sublimadores</option>{SUBLIMADORES.map((s)=><option key={s} value={s}>{s}</option>)}</select>}
          {aba === "costura" && <select style={styles.filtroInput} value={filtroEquipe} onChange={(e)=>setFiltroEquipe(e.target.value)}><option value="Todas">Todas as equipes</option>{EQUIPES.map((eq)=><option key={eq} value={eq}>{eq}</option>)}</select>}
        </div>
        {loaded && aba === "pre_corte" && <section style={styles.listWrap}><p style={styles.aviso}>Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa diretamente para Aguardando Sublimação.</p><div style={styles.painelProducao}><h3 style={styles.painelTitulo}>Total a cortar por produto</h3>{resumoProdutosCorte.map((r)=><button key={r.produto} style={styles.resumoLinha} onClick={()=>setProdutoFiltroCorte(produtoFiltroCorte===r.produto?"Todos":r.produto)}><span style={styles.resumoProduto}>{r.produto}</span><span style={styles.resumoPedidosCount}>{r.numPedidos} pedido{r.numPedidos>1?"s":""}</span><span style={styles.resumoQtd}>{r.restante}un</span></button>)}</div>{preCorteAgrupadoFiltradoPorProduto.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><div style={styles.pedidoNumWrap"><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.totalGeral}un</span><button style={styles.excluirPedidoBtn} onClick={()=>excluirPedidoPreCorte(p.numero)}>Excluir pedido</button></div><div style={styles.itensLista}>{p.linhas.map((linha)=>{const f=getCorteForm(p.numero,linha.produto,linha.restante);return <div key={linha.produto} style={styles.corteLinha}><div style={styles.corteLinhaTopo}><span style={styles.itemTexto}><b>{linha.produto}</b> · pedido: {linha.total}un</span><span style={styles.equipePill}>restam {linha.restante}un</span></div><div style={styles.corteFormGrid}><input style={styles.input} type="number" min={1} max={linha.restante} value={f.qtd} onChange={(e)=>setCorteFormCampo(p.numero,linha.produto,linha.restante,"qtd",e.target.value)}/><input style={styles.input} type="date" value={f.data} onChange={(e)=>setCorteFormCampo(p.numero,linha.produto,linha.restante,"data",e.target.value)}/><button style={styles.enviarBtn} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button></div></div>})}</div></div>)}</section>}
        {loaded && aba === "aguardando_sublimacao" && <section style={styles.listWrap}>{aguardandoSublimacaoAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><div style={styles.pedidoNumWrap"><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span></div><div style={styles.itensLista}>{p.linhas.map((linha)=>{const f=getAlocForm(p.numero,linha.produto);return <div key={linha.produto} style={styles.corteLinha}><div style={styles.corteLinhaTopo}><span style={styles.itemTexto}><b>{linha.produto}</b> · cortado: {linha.total}un</span></div><div style={styles.alocGrid}><div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor),borderColor:corClara(corHex(f.cor))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={(e)=>setAlocFormCampo(p.numero,linha.produto,"cor",e.target.value)}>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div><input style={styles.input} type="number" min={1} max={linha.restante} value={f.qtd} onChange={(e)=>setAlocFormCampo(p.numero,linha.produto,"qtd",e.target.value)}/><select style={styles.input} value={f.sublimador} onChange={(e)=>setAlocFormCampo(p.numero,linha.produto,"sublimador",e.target.value)}>{SUBLIMADORES.map((s)=><option key={s} value={s}>{s}</option>)}</select><input style={styles.input} type="date" value={f.data} onChange={(e)=>setAlocFormCampo(p.numero,linha.produto,"data",e.target.value)}/><button style={styles.enviarBtn} onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}</div></div>)}</section>}
        {loaded && aba === "sublimacao" && <section style={styles.listWrap}>{sublimacaoFiltrada.map(([dia,its])=><div key={dia} style={styles.diaGrupo} className="card"><div style={styles.diaTitulo}>{dia === "sem-data" ? "Sem data" : formatarDataBR(dia)}</div>{its.map((it)=><div key={it.id} style={styles.itemLinha} className="item-linha"><button style={styles.enviarBtn} onClick={()=>moverParaAguardandoCostura(it.id)}>Enviar p/ costura</button><span style={{...styles.swatchSm,background:corHex(it.cor)}}/><span style={styles.itemTexto}>#{it.pedido} · {it.produto} <b>· {it.cor}</b> · {it.qtd}un</span><span style={styles.sublimadorPill}>{it.sublimador}</span><button style={styles.removerBtn} onClick={()=>removerItem(it.id)}>×</button></div>)}</div>)}</section>}
        {loaded && aba === "aguardando_costura" && <section style={styles.listWrap}>{aguardandoCosturaAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span></div><div style={styles.itensLista}>{p.itens.map((it)=><div key={it.id} style={styles.itemLinha}><span style={{...styles.swatchSm,background:corHex(it.cor)}}/><span style={styles.itemTexto}>{it.produto} <b>· {it.cor}</b> · {it.qtd}un</span><select style={styles.input} value={it.cor || ""} onChange={(e)=>setCorItem(it.id,e.target.value)}><option value="">Selecionar cor</option>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select><select style={styles.equipeSelect} value={it.equipe||EQUIPES[0]} onChange={(e)=>setEquipeItem(it.id,e.target.value)}>{EQUIPES.map((e)=><option key={e} value={e}>{e}</option>)}</select><button style={styles.enviarBtn} onClick={()=>moverParaCostura(it.id)}>Enviar p/ costura</button></div>)}</div></div>)}</section>}
        {loaded && aba === "costura" && <section style={styles.listWrap}>{costuraFiltrado.map((p)=><PedidoCosturaCard key={p.numero} pedido={p} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onFinalizar={moverPedidoParaSeparacao} onCor={setCorItem}/>)}</section>}
        {loaded && aba === "separacao" && <section style={styles.listWrap}>{separacaoAgrupado.map((p)=><div key={p.numero} style={styles.pedidoCard} data-pedido={String(p.numero)} className="card pedido-card"><div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.feito}/{p.total}</span></div><div style={styles.itensLista}>{p.itens.map((it)=><div key={it.id} style={styles.itemLinha}><button onClick={()=>toggleConferido(it.id)} style={{...styles.checkbox,background:it.conferido?"#1f8a3d":"#fff",borderColor:it.conferido?"#1f8a3d":"#cfc6b8"}}>{it.conferido?"✓":""}</button><span style={{...styles.swatchSm,background:corHex(it.cor)}}/><span style={styles.itemTexto}>{it.produto} <b>· {it.cor}</b> · {it.qtd}un</span></div>)}</div></div>)}</section>}
      </main>
    </div>
  );
}

function FragmentoProducao({ nome, hoje, mes }) { return <><div style={styles.producaoNome}>{nome}</div><div style={styles.producaoValor}>{hoje}</div><div style={styles.producaoValor}>{mes}</div></>; }
function Stat({ label, value }) { return <div style={styles.statBox}><div style={styles.statValue}>{value}</div><div style={styles.statLabel}>{label}</div></div>; }
function Field({ label, children }) { return <label style={styles.field}><span style={styles.fieldLabel}>{label}</span>{children}</label>; }
function PedidoCosturaCard({ pedido, onToggle, onRemover, onEquipe, onFinalizar, onCor }) {
  const pctInt = Math.round(pedido.pct * 100);
  const urg = pedido.dataEntrega ? urgenciaInfo(pedido.dataEntrega) : null;
  return <div style={{...styles.pedidoCard,...(pedido.completo?styles.pedidoCompleto:{})}} data-pedido={String(pedido.numero)} className="card pedido-card">
    <div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{pedido.numero}</span>{pedido.completo&&<span style={styles.badgeCompleto}>pronto p/ expedir</span>}{!pedido.completo&&urg&&<span style={{...styles.badgeUrgencia,background:urg.fundo,color:urg.cor}}>{formatarDataBR(pedido.dataEntrega)} · {urg.texto}</span>}</div><span style={styles.pctText}>{pctInt}%</span></div>
    <div style={styles.barraTrack}><div style={{...styles.barraFill,width:`${pctInt}%`,background:pedido.completo?"#1f8a3d":"#d8622c"}}/></div>
    <div style={styles.itensLista}>{pedido.itens.map((it)=><div key={it.id} style={styles.itemLinha}><button onClick={()=>onToggle(it.id)} style={{...styles.checkbox,background:it.feito?"#1f8a3d":"#fff",borderColor:it.feito?"#1f8a3d":"#cfc6b8"}}>{it.feito?"✓":""}</button><span style={{...styles.swatchSm,background:corHex(it.cor)}}/><span style={{...styles.itemTexto,textDecoration:it.feito?"line-through":"none",opacity:it.feito?.55:1}}>{it.produto} <b>· {it.cor || ""}</b> · {it.qtd}un</span><select style={styles.input} value={it.cor||""} onChange={(e)=>onCor(it.id,e.target.value)}><option value="">Selecionar cor</option>{CORES.map((c)=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select><select style={styles.equipeSelect} value={it.equipe||EQUIPES[0]} onChange={(e)=>onEquipe(it.id,e.target.value)}>{EQUIPES.map((eq)=><option key={eq} value={eq}>{eq}</option>)}</select><button style={styles.removerBtn} onClick={()=>onRemover(it.id)}>×</button></div>)}</div>
    {pedido.completo&&<button style={styles.finalizarBtn} onClick={()=>onFinalizar(pedido.numero)}>Mover pedido p/ separação →</button>}
  </div>;
}

const styles = {
  page: { minHeight: "100vh", background: "#f2ede2", fontFamily: "'Georgia', 'Iowan Old Style', serif", color: "#231f1a", paddingBottom: 60 },
  header: { background: "#1c2a3a", color: "#f2ede2", padding: "20px 16px 24px" },
  headerInner: { maxWidth: 900, margin: "0 auto" },
  brandRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 12 },
  spool: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #d8622c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  spoolCore: { width: 14, height: 14, borderRadius: "50%", background: "#d8622c" },
  fsBtn: { width: 38, height: 38, minWidth: 38, borderRadius: 9, border: "1px solid #3a4d63", background: "#25384c", color: "#f2ede2", fontSize: 17, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 23, margin: 0, letterSpacing: 0.3, fontWeight: 700 },
  subtitle: { margin: "4px 0 0", fontSize: 13.5, color: "#c7cdd6", fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  stats: { display: "flex", gap: 8, flexWrap: "wrap" },
  statBox: { background: "#25384c", borderRadius: 10, padding: "9px 12px", flex: 1, minWidth: 90 },
  statValue: { fontSize: 19, fontWeight: 700, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  statLabel: { fontSize: 10, color: "#a9b3c0", fontFamily: "'Helvetica Neue', Arial, sans-serif", marginTop: 2 },
  main: { maxWidth: 900, margin: "0 auto", padding: "20px 16px 0" },
  formCard: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px #0000000d", marginBottom: 16 },
  formTitle: { margin: "0 0 14px", fontSize: 17, fontWeight: 700 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  field: { display: "flex", flexDirection: "column", gap: 5, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  fieldLabel: { fontSize: 11.5, color: "#7a7160", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { border: "1px solid #ddd3bd", borderRadius: 8, padding: "9px 10px", fontSize: 14.5, background: "#fff", color: "#231f1a", width: "100%" },
  corSelectWrap: { position: "relative" },
  swatch: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: "50%", border: "1px solid transparent" },
  addBtn: { background: "#d8622c", color: "#fff", border: "none", borderRadius: 9, padding: "11px 18px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", width: "100%" },
  erro: { color: "#c81e2c", fontSize: 13, marginTop: 8 },
  aviso: { color: "#a89f8c", fontSize: 11.5, marginTop: 4, marginBottom: 10 },
  exportRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  exportBtn: { background: "#1c2a3a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", flex: 1, minWidth: 180 },
  exportBtnOutline: { background: "transparent", color: "#1c2a3a", border: "1.5px solid #1c2a3a", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", flex: 1, minWidth: 180 },
  excluirPedidoBtn: { border: "1px solid #c81e2c", color: "#a51d2d", background: "#fff7f7", borderRadius: 8, padding: "7px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  limparBtn: { background: "transparent", color: "#c81e2c", border: "1.5px solid #c81e2c55", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "#1c2a3aaa", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modalBox: { background: "#fffdf8", borderRadius: 14, padding: 22, maxWidth: 400, width: "100%", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { margin: "0 0 14px", fontSize: 19 },
  modalTexto: { fontSize: 13.5, color: "#5c5343", lineHeight: 1.5 },
  modalFechar: { background: "#d8622c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", width: "100%" },
  tabs: { display: "flex", gap: 6, marginTop: 10, marginBottom: 14, flexWrap: "wrap" },
  tabBtn: { flex: "1 1 auto", padding: "10px 8px", borderRadius: 9, border: "1px solid #3a4d63", background: "#25384c", color: "#f2ede2", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" },
  tabBtnAtiva: { background: "#d8622c", color: "#fff", borderColor: "#d8622c" },
  painelProducao: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: 16, marginBottom: 20 },
  resumoLista: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4 },
  resumoLinha: { display: "flex", alignItems: "center", gap: 10, background: "#f6f1e4", border: "1px solid #e4dbc8", borderRadius: 8, padding: "8px 10px", cursor: "pointer", textAlign: "left", width: "100%" },
  resumoLinhaAtiva: { background: "#1c2a3a", borderColor: "#1c2a3a", color: "#fff" },
  resumoProduto: { flex: 1, fontSize: 13.5, fontWeight: 600 },
  resumoPedidosCount: { fontSize: 11, color: "#948a76", whiteSpace: "nowrap" },
  resumoQtd: { fontSize: 13.5, fontWeight: 700, color: "#d8622c", whiteSpace: "nowrap" },
  listWrap: { marginTop: 4 },
  listHeader: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  filtroInput: { border: "1px solid #ddd3bd", borderRadius: 8, padding: "7px 10px", fontSize: 13.5, background: "#fffdf8", flex: 1, minWidth: 150 },
  vazio: { color: "#948a76", fontSize: 14 },
  diaGrupo: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: "14px 16px", marginBottom: 12 },
  diaTitulo: { fontWeight: 700, fontSize: 14.5, marginBottom: 10 },
  pedidoCard: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: "14px 16px", marginBottom: 12 },
  pedidoCompleto: { borderColor: "#1f8a3d55", background: "#f6fbf5" },
  pedidoTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 },
  pedidoNumWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pedidoNum: { fontWeight: 700, fontSize: 16.5 },
  badgeCompleto: { fontSize: 10.5, background: "#1f8a3d", color: "#fff", borderRadius: 20, padding: "3px 9px" },
  badgeUrgencia: { fontSize: 10.5, borderRadius: 20, padding: "3px 9px", fontWeight: 700 },
  pctText: { fontSize: 13, color: "#7a7160", fontWeight: 600 },
  barraTrack: { height: 6, background: "#eee5d2", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  barraFill: { height: "100%", borderRadius: 3 },
  itensLista: { display: "flex", flexDirection: "column", gap: 6 },
  itemLinha: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  checkbox: { width: 20, height: 20, minWidth: 20, borderRadius: 5, border: "1.5px solid #cfc6b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", cursor: "pointer" },
  swatchSm: { width: 12, height: 12, borderRadius: "50%", minWidth: 12, border: "1px solid #0001" },
  itemTexto: { fontSize: 14, flex: 1, minWidth: 140 },
  equipePill: { fontSize: 10.5, background: "#eee5d2", color: "#5c5343", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" },
  equipeSelect: { fontSize: 11.5, border: "1px solid #ddd3bd", borderRadius: 20, padding: "3px 8px", background: "#fff", color: "#5c5343" },
  sublimadorPill: { fontSize: 10.5, background: "#e6dcc8", color: "#5c4a12", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap", fontWeight: 700 },
  enviarBtn: { fontSize: 11, background: "#1f8a3d", color: "#fff", border: "none", borderRadius: 7, padding: "6px 9px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  finalizarBtn: { marginTop: 10, width: "100%", background: "#1c2a3a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  removerBtn: { border: "none", background: "transparent", color: "#b8ac95", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" },
  corteLinha: { borderTop: "1px solid #f0e9d8", paddingTop: 10, marginTop: 4 },
  corteLinhaTopo: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  alocGrid: { display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr 0.8fr auto", gap: 8 },
  corteFormGrid: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 },
};
