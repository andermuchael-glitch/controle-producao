import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { inscrever, salvarValor } from "./storage.js";
import { firebaseConfigurado } from "./firebase.js";

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

const ETAPAS = ["pre_corte", "corte", "aguardando_sublimacao", "sublimacao", "aguardando_costura", "costura", "separacao"];
const ETAPA_LABEL = {
  pre_corte: "Pré-Corte",
  corte: "Corte",
  aguardando_sublimacao: "Aguardando Sublimação",
  sublimacao: "Sublimação",
  aguardando_costura: "Aguardando Costura",
  costura: "Costura",
  separacao: "Separação",
};

const STORAGE_KEY = "costura:itens";
const META_KEY = "costura:pedidosMeta";
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
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
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
  const [filtroDia, setFiltroDia] = useState("");
  const [mostrarDrive, setMostrarDrive] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    const onFsChange = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const alternarTelaCheia = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };


  // formulários inline de alocação (aguardando sublimação -> sublimação)
  const [alocForm, setAlocForm] = useState({}); // { "pedido||produto": {cor, qtd, sublimador, data} }
  // formulário inline de marcação de corte (pré-corte -> corte)
  const [corteForm, setCorteForm] = useState({}); // { "pedido||produto": {qtd, data} }
  const [pdfGerando, setPdfGerando] = useState(false);

  useEffect(() => {
    if (window.jspdf) return;
    const script1 = document.createElement("script");
    script1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script1.onload = () => {
      const script2 = document.createElement("script");
      script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      document.body.appendChild(script2);
    };
    document.body.appendChild(script1);
  }, []);


  useEffect(() => {
    let recebeuItens = false;
    let recebeuMeta = false;
    const marcarCarregado = () => {
      if (recebeuItens && recebeuMeta) setLoaded(true);
    };

    const cancelarItens = inscrever(STORAGE_KEY, (raw, erroSnap) => {
      if (erroSnap) {
        setErro("Não foi possível conectar ao Firebase. Verifique as chaves no .env.");
      } else if (raw) {
        try {
          const carregados = JSON.parse(raw);
          const migrados = carregados.map((i) => ({
            ...i,
            etapa: i.etapa || "costura",
            equipe: i.equipe || "Não decidido",
            feito: i.feito ?? false,
            conferido: i.conferido ?? false,
          }));
          setItens(migrados);
        } catch (e) {}
      }
      recebeuItens = true;
      marcarCarregado();
    });

    const cancelarMeta = inscrever(META_KEY, (raw, erroSnap) => {
      if (!erroSnap && raw) {
        try {
          setPedidosMeta(JSON.parse(raw));
        } catch (e) {}
      }
      recebeuMeta = true;
      marcarCarregado();
    });

    return () => {
      cancelarItens();
      cancelarMeta();
    };
  }, []);

  const salvar = async (novaLista) => {
    setItens(novaLista);
    const ok = await salvarValor(STORAGE_KEY, JSON.stringify(novaLista));
    setErro(ok ? "" : "Não foi possível salvar. Verifique sua conexão ou as chaves do Firebase.");
  };

  const salvarMeta = async (novoMeta) => {
    setPedidosMeta(novoMeta);
    await salvarValor(META_KEY, JSON.stringify(novoMeta));
  };

  const definirDataEntrega = (numero, data) => {
    salvarMeta({ ...pedidosMeta, [numero]: { ...(pedidosMeta[numero] || {}), dataEntrega: data } });
  };

  const adicionarItem = () => {
    if (!pedido.trim()) return;
    const novo = {
      id: uid(),
      pedido: pedido.trim(),
      produto,
      qtd: Math.max(1, Number(qtd) || 1),
      etapa: "pre_corte",
      criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    if (dataEntregaForm) definirDataEntrega(pedido.trim(), dataEntregaForm);
    setQtd(1);
  };

  // ---- Chave comum para agrupar por pedido+produto em qualquer etapa ----
  const chaveAloc = (p, prod) => `${p}||${prod}`;

  // ---- Pré-Corte -> Corte (marcado conforme Patrick vai cortando) ----
  const getCorteForm = (p, prod, restante) => corteForm[chaveAloc(p, prod)] || { qtd: restante, data: hoje() };
  const setCorteFormCampo = (p, prod, restante, campo, valor) => {
    const chave = chaveAloc(p, prod);
    setCorteForm((f) => ({ ...f, [chave]: { ...getCorteForm(p, prod, restante), [campo]: valor } }));
  };
  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdNum = Math.max(1, Math.min(Number(f.qtd) || 1, restante));
    const novo = {
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      qtd: qtdNum,
      etapa: "corte",
      cortador: "Patrick",
      dataCorte: f.data || hoje(),
      criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    setCorteForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { qtd: restante - qtdNum, data: f.data } }));
  };

  // ---- Corte -> Aguardando Sublimação (movido manualmente, fora de sequência) ----
  const moverParaAguardandoSublimacao = (pedidoNum, produtoNome) => {
    salvar(
      itens.map((i) =>
        i.etapa === "corte" && i.pedido === pedidoNum && i.produto === produtoNome
          ? { ...i, etapa: "aguardando_sublimacao" }
          : i
      )
    );
  };

  // ---- Alocação: aguardando sublimação (sem cor) -> sublimação (com cor) ----
  const getAlocForm = (p, prod) => alocForm[chaveAloc(p, prod)] || { cor: CORES[0].nome, qtd: 1, sublimador: SUBLIMADORES[0], data: hoje() };
  const setAlocFormCampo = (p, prod, campo, valor) => {
    const chave = chaveAloc(p, prod);
    setAlocForm((f) => ({ ...f, [chave]: { ...getAlocForm(p, prod), [campo]: valor } }));
  };

  const enviarParaSublimacao = (pedidoNum, produtoNome) => {
    const f = getAlocForm(pedidoNum, produtoNome);
    const qtdNum = Math.max(1, Number(f.qtd) || 1);
    const novo = {
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      cor: f.cor,
      qtd: qtdNum,
      etapa: "sublimacao",
      sublimador: f.sublimador,
      dataSublimacao: f.data || hoje(),
      equipe: "Não decidido",
      feito: false,
      conferido: false,
      criadoEm: Date.now(),
    };
    salvar([...itens, novo]);
    setAlocForm((f2) => ({ ...f2, [chaveAloc(pedidoNum, produtoNome)]: { cor: CORES[0].nome, qtd: 1, sublimador: f.sublimador, data: f.data } }));
  };

  const moverParaAguardandoCostura = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "aguardando_costura" } : i)));
  };
  const moverParaCostura = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, etapa: "costura" } : i)));
  };
  const moverPedidoParaSeparacao = (numero) => {
    salvar(itens.map((i) => (i.pedido === numero && i.etapa === "costura" ? { ...i, etapa: "separacao" } : i)));
  };

  const toggleFeito = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, feito: !i.feito } : i)));
  };
  const toggleConferido = (id) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, conferido: !i.conferido } : i)));
  };
  const setEquipeItem = (id, eq) => {
    salvar(itens.map((i) => (i.id === id ? { ...i, equipe: eq } : i)));
  };
  const removerItem = (id) => {
    salvar(itens.filter((i) => i.id !== id));
  };

  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const limparTudo = () => {
    salvar([]);
    salvarMeta({});
    setConfirmarLimpeza(false);const exportarXLSX = () => {
    const linhas = itens.map((i) => ({
      Pedido: i.pedido,
      "Data de entrega": formatarDataBR(pedidosMeta[i.pedido]?.dataEntrega) || "",
      Etapa: ETAPA_LABEL[i.etapa] || i.etapa,
      Produto: i.produto,
      Cor: i.cor || "",
      Cortador: i.cortador || "",
      "Data corte": formatarDataBR(i.dataCorte),
      Sublimador: i.sublimador || "",
      "Data sublimação": formatarDataBR(i.dataSublimacao),
      Equipe: i.equipe || "",
      Quantidade: i.qtd,
      Status:
        i.etapa === "separacao" ? (i.conferido ? "Conferido" : "Aguardando conferência")
        : i.etapa === "costura" ? (i.feito ? "Concluído" : "Pendente")
        : "",
    }));
    const ws = XLSX.utils.json_to_sheet(linhas);
    ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 11 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produção");
    XLSX.writeFile(wb, `fila-producao-${hoje()}.xlsx`);
  };

  const exportarPDF = async () => {
    setPdfGerando(true);
    try {
      let tentativas = 0;
      while ((!window.jspdf || !window.jspdf.jsPDF) && tentativas < 40) {
        await new Promise((r) => setTimeout(r, 150));
        tentativas++;
      }
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("gerador de pdf não carregou");

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      doc.setFontSize(16);
      doc.text("Fila de Produção", 40, 36);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Gerado em ${formatarDataBR(hoje())}`, 40, 52);
      doc.setTextColor(0);

      const colunas = ["Pedido", "Entrega", "Etapa", "Produto", "Cor", "Cortador", "Data corte", "Sublimador", "Data sublim.", "Equipe", "Qtd", "Status"];
      const linhasPdf = itens.map((i) => [
        i.pedido,
        formatarDataBR(pedidosMeta[i.pedido]?.dataEntrega) || "-",
        ETAPA_LABEL[i.etapa] || i.etapa,
        i.produto,
        i.cor || "-",
        i.cortador || "-",
        formatarDataBR(i.dataCorte) || "-",
        i.sublimador || "-",
        formatarDataBR(i.dataSublimacao) || "-",
        i.equipe || "-",
        String(i.qtd),
        i.etapa === "separacao" ? (i.conferido ? "Conferido" : "Aguard. conf.")
          : i.etapa === "costura" ? (i.feito ? "Concluído" : "Pendente")
          : "-",
      ]);

      doc.autoTable({
        head: [colunas],
        body: linhasPdf,
        startY: 66,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [28, 42, 58], textColor: 255 },
        alternateRowStyles: { fillColor: [246, 241, 228] },
        margin: { left: 40, right: 40 },
      });

      doc.save(`fila-producao-${hoje()}.pdf`);
    } catch (e) {
      setErro("Não foi possível gerar o PDF agora. Tente novamente em alguns segundos.");
    } finally {
      setPdfGerando(false);
    }
  };

  // ---------- PRÉ-CORTE: agrupado por pedido, com quanto já foi cortado ----------
  const preCorteAgrupado = useMemo(() => {
    const itensPre = itens.filter((i) => i.etapa === "pre_corte");
    const grupos = {};
    for (const it of itensPre) {
      if (!grupos[it.pedido]) grupos[it.pedido] = {};
      if (!grupos[it.pedido][it.produto]) grupos[it.pedido][it.produto] = 0;
      grupos[it.pedido][it.produto] += it.qtd;
    }
    const cortadoPorChave = {};
    for (const it of itens) {
      if (it.etapa === "pre_corte") continue;
      const chave = chaveAloc(it.pedido, it.produto);
      cortadoPorChave[chave] = (cortadoPorChave[chave] || 0) + it.qtd;
    }
    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {
      const linhas = Object.entries(produtos).map(([prod, total]) => {
        const cortado = cortadoPorChave[chaveAloc(numero, prod)] || 0;
        return { produto: prod, total, cortado, restante: total - cortado };
      });
      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
      const cortadoGeral = linhas.reduce((s, l) => s + Math.min(l.cortado, l.total), 0);
      return {
        numero,
        linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)),
        totalGeral,
        cortadoGeral,
        dataEntrega: pedidosMeta[numero]?.dataEntrega || "",
      };
    });
    pedidosArr.sort((a, b) => {
      const da = diasAteEntrega(a.dataEntrega);
      const db = diasAteEntrega(b.dataEntrega);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  }, [itens, pedidosMeta, filtroPedido]);

  // ---------- Resumo por produto: soma o que falta cortar de cada modelo em todos os pedidos ----------
  const resumoProdutosCorte = useMemo(() => {
    const mapa = {};
    for (const p of preCorteAgrupado) {
      for (const l of p.linhas) {
        if (l.restante <= 0) continue;
        if (!mapa[l.produto]) mapa[l.produto] = { produto: l.produto, restante: 0, pedidos: new Set() };
        mapa[l.produto].restante += l.restante;
        mapa[l.produto].pedidos.add(p.numero);
      }
    }
    return Object.values(mapa)
      .map((m) => ({ produto: m.produto, restante: m.restante, numPedidos: m.pedidos.size }))
      .sort((a, b) => b.restante - a.restante);
  }, [preCorteAgrupado]);

  const preCorteAgrupadoFiltradoPorProduto = useMemo(() => {
    if (produtoFiltroCorte === "Todos") return preCorteAgrupado;
    return preCorteAgrupado
      .map((p) => ({ ...p, linhas: p.linhas.filter((l) => l.produto === produtoFiltroCorte) }))
      .filter((p) => p.linhas.length > 0);
  }, [preCorteAgrupado, produtoFiltroCorte]);

  // ---------- CORTE: agrupado por pedido, sem cor, sem alocação ----------
  const corteAgrupado = useMemo(() => {
    const itensCorte = itens.filter((i) => i.etapa === "corte");
    const grupos = {};
    const cortadorPorPedido = {};
    for (const it of itensCorte) {
      if (!grupos[it.pedido]) grupos[it.pedido] = {};
      if (!grupos[it.pedido][it.produto]) grupos[it.pedido][it.produto] = 0;
      grupos[it.pedido][it.produto] += it.qtd;
      if (!cortadorPorPedido[it.pedido]) cortadorPorPedido[it.pedido] = it.cortador || "Patrick";
    }
    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {
      const linhas = Object.entries(produtos).map(([prod, total]) => ({ produto: prod, total }));
      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
      return {
        numero,
        linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)),
        totalGeral,
        dataEntrega: pedidosMeta[numero]?.dataEntrega || "",
        cortador: cortadorPorPedido[numero] || "Patrick",
      };
    });
    pedidosArr.sort((a, b) => {
      const da = diasAteEntrega(a.dataEntrega);
      const db = diasAteEntrega(b.dataEntrega);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  }, [itens, pedidosMeta, filtroPedido]);

  // ---------- AGUARDANDO SUBLIMAÇÃO: agrupado por pedido, sem cor, com alocado/restante ----------
  const aguardandoSublimacaoAgrupado = useMemo(() => {
    const itensAgSub = itens.filter((i) => i.etapa === "aguardando_sublimacao");
    const grupos = {};
    for (const it of itensAgSub) {
      if (!grupos[it.pedido]) grupos[it.pedido] = {};
      if (!grupos[it.pedido][it.produto]) grupos[it.pedido][it.produto] = 0;
      grupos[it.pedido][it.produto] += it.qtd;
    }
    const alocadoPorChave = {};
    for (const it of itens) {
      if (it.etapa === "corte" || it.etapa === "aguardando_sublimacao") continue;
      const chave = chaveAloc(it.pedido, it.produto);
      alocadoPorChave[chave] = (alocadoPorChave[chave] || 0) + it.qtd;
    }
    const pedidosArr = Object.entries(grupos).map(([numero, produtos]) => {
      const linhas = Object.entries(produtos).map(([prod, total]) => {
        const alocado = alocadoPorChave[chaveAloc(numero, prod)] || 0;
        return { produto: prod, total, alocado, restante: total - alocado };
      });
      const totalGeral = linhas.reduce((s, l) => s + l.total, 0);
      const alocadoGeral = linhas.reduce((s, l) => s + Math.min(l.alocado, l.total), 0);
      return {
        numero,
        linhas: linhas.sort((a, b) => a.produto.localeCompare(b.produto)),
        totalGeral,
        alocadoGeral,
        dataEntrega: pedidosMeta[numero]?.dataEntrega || "",
      };
    });
    pedidosArr.sort((a, b) => {
      const da = diasAteEntrega(a.dataEntrega);
      const db = diasAteEntrega(b.dataEntrega);
      if (da === null && db === null) return 0;
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
    return pedidosArr.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  }, [itens, pedidosMeta, filtroPedido]);

  // ---------- SUBLIMAÇÃO: agrupado por dia de lançamento ----------
  const producaoPorCortador = useMemo(() => {
    const hojeStr = hoje();
    const mesAtual = mesRef(hojeStr);
    const mapa = {};
    for (const c of CORTADORES) mapa[c] = { hoje: 0, mes: 0 };
    for (const it of itens) {
      if (!it.cortador) continue;
      if (!mapa[it.cortador]) mapa[it.cortador] = { hoje: 0, mes: 0 };
      if (it.dataCorte === hojeStr) mapa[it.cortador].hoje += it.qtd;
      if (mesRef(it.dataCorte) === mesAtual) mapa[it.cortador].mes += it.qtd;
    }
    return mapa;
  }, [itens]);

  const producaoPorSublimador = useMemo(() => {
    const hojeStr = hoje();
    const mesAtual = mesRef(hojeStr);
    const mapa = {};
    for (const s of SUBLIMADORES) mapa[s] = { hoje: 0, mes: 0 };
    for (const it of itens) {
      if (!it.sublimador) continue;
      if (!mapa[it.sublimador]) mapa[it.sublimador] = { hoje: 0, mes: 0 };
      if (it.dataSublimacao === hojeStr) mapa[it.sublimador].hoje += it.qtd;
      if (mesRef(it.dataSublimacao) === mesAtual) mapa[it.sublimador].mes += it.qtd;
    }
    return mapa;
  }, [itens]);

  const sublimacaoFiltrada = useMemo(() => {
    const itensSub = itens.filter((i) => i.etapa === "sublimacao");
    const grupos = {};
    for (const it of itensSub) {
      const dia = it.dataSublimacao || "sem-data";
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(it);
    }
    return Object.entries(grupos)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dia, its]) => [
        dia,
        its
          .filter((i) => filtroSublimador === "Todos" || i.sublimador === filtroSublimador)
          .filter((i) => i.pedido.toLowerCase().includes(filtroPedido.toLowerCase())),
      ])
      .filter(([, its]) => its.length > 0);
  }, [itens, filtroSublimador, filtroPedido]);

  // ---------- Agrupador genérico por pedido (aguardando_costura, costura, separação) ----------
  const agruparPorPedido = (etapaAlvo, campoConclusao) => {
    const grupos = {};
    for (const it of itens) {
      if (it.etapa !== etapaAlvo) continue;
      if (!grupos[it.pedido]) grupos[it.pedido] = [];
      grupos[it.pedido].push(it);
    }
    const lista = Object.entries(grupos).map(([numero, its]) => {
      const total = its.reduce((s, i) => s + i.qtd, 0);
      const feito = campoConclusao ? its.reduce((s, i) => s + (i[campoConclusao] ? i.qtd : 0), 0) : 0;
      const pct = total ? feito / total : 0;
      const dataEntrega = pedidosMeta[numero]?.dataEntrega || "";
      return {
        numero,
        itens: its.sort((a, b) => a.produto.localeCompare(b.produto)),
        total,
        feito,
        pct,
        completo: campoConclusao ? pct === 1 : false,
        dataEntrega,
      };
    });
    lista.sort((a, b) => {
      if (a.completo !== b.completo) return a.completo ? 1 : -1;
      const da = diasAteEntrega(a.dataEntrega);
      const db = diasAteEntrega(b.dataEntrega);
      if (da === null && db === null) return b.pct - a.pct;
      if (da === null) return 1;
      if (db === null) return -1;
      if (da !== db) return da - db;
      return b.pct - a.pct;
    });
    return lista.filter((p) => p.numero.toLowerCase().includes(filtroPedido.toLowerCase()));
  };

  const aguardandoCosturaAgrupado = useMemo(() => agruparPorPedido("aguardando_costura", null), [itens, pedidosMeta, filtroPedido]);
  const costuraAgrupado = useMemo(() => agruparPorPedido("costura", "feito"), [itens, pedidosMeta, filtroPedido]);
  const separacaoAgrupado = useMemo(() => agruparPorPedido("separacao", "conferido"), [itens, pedidosMeta, filtroPedido]);

  const costuraFiltrado = costuraAgrupado
    .map((p) => ({ ...p, itens: filtroEquipe === "Todas" ? p.itens : p.itens.filter((i) => i.equipe === filtroEquipe) }))
    .filter((p) => p.itens.length > 0);

  const totalPreCorte = itens.filter((i) => i.etapa === "pre_corte").reduce((s, i) => s + i.qtd, 0);
  const totalCorte = itens.filter((i) => i.etapa === "corte").reduce((s, i) => s + i.qtd, 0);
  const totalAguardandoSublimacao = itens.filter((i) => i.etapa === "aguardando_sublimacao").reduce((s, i) => s + i.qtd, 0);
  const totalSublimacao = itens.filter((i) => i.etapa === "sublimacao").reduce((s, i) => s + i.qtd, 0);
  const totalAguardando = itens.filter((i) => i.etapa === "aguardando_costura").reduce((s, i) => s + i.qtd, 0);
  const totalCosturaAberto = costuraAgrupado.filter((p) => !p.completo).length;
  const totalSeparacaoPend = itens.filter((i) => i.etapa === "separacao" && !i.conferido).reduce((s, i) => s + i.qtd, 0);

  const ABAS = [
    { id: "pre_corte", label: "Pré-Corte", contagem: totalPreCorte },
    { id: "corte", label: "Corte", contagem: totalCorte },
    { id: "aguardando_sublimacao", label: "Aguard. Sublimação", contagem: totalAguardandoSublimacao },
    { id: "sublimacao", label: "Sublimação", contagem: totalSublimacao },
    { id: "aguardando_costura", label: "Aguard. Costura", contagem: totalAguardando },
    { id: "costura", label: "Costura", contagem: totalCosturaAberto },
    { id: "separacao", label: "Separação", contagem: totalSeparacaoPend },
  ];

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        input, select, button { font-family: inherit; }
        ::selection { background: #d8622c55; }
        .card { animation: rise .25s ease both; }
        @keyframes rise { from { opacity:0; transform: translateY(6px);} to {opacity:1; transform:none;} }
        @media (prefers-reduced-motion: reduce) { .card { animation: none; } }

        button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }

        @media (max-width: 640px) {
          .app-header { padding: 14px 14px 18px !important; padding-top: max(14px, env(safe-area-inset-top)) !important; }
          .app-main { padding: 16px 12px 24px !important; }
          .form-card { padding: 14px !important; border-radius: 12px !important; }
          .form-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .aloc-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
          .corte-form-grid { grid-template-columns: 1fr 1fr !important; gap: 8px !important; }
          .producao-grid { grid-template-columns: 1.6fr 1fr 1fr !important; }
          .tabs-row { flex-wrap: nowrap !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 2px; }
          .tabs-row::-webkit-scrollbar { display: none; }
          .tab-btn { flex: 0 0 auto !important; padding: 10px 12px !important; }
          .pedido-card { padding: 12px !important; }
          .item-linha { gap: 6px !important; }
          .export-row { flex-direction: column !important; }
          .export-row button { width: 100% !important; }
          .stats-row { gap: 6px !important; }
          .stats-row > div { min-width: 78px !important; padding: 7px 9px !important; }
          .subtitle-txt { display: none !important; }
          .list-header { flex-direction: column !important; align-items: stretch !important; }
          .list-header select, .list-header input { width: 100% !important; }
          h1 { font-size: 18px !important; }
          input, select { font-size: 16px !important; }
          .checkbox-tap, .enviar-btn, .remover-btn { min-height: 36px; }
                                                           }:fullscreen, ::backdrop { background: #f2ede2; }
      `}</style>

      <header style={styles.header} className="app-header">
        <div style={styles.headerInner}>
          <div style={styles.brandRow}>
            <div style={styles.spool}>
              <div style={styles.spoolCore} />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={styles.title}>Corte → Costura</h1>
              <p style={styles.subtitle} className="subtitle-txt">Do corte até a expedição, pedido por pedido</p>
            </div>
            <button style={styles.fsBtn} onClick={alternarTelaCheia} aria-label={telaCheia ? "Sair da tela cheia" : "Tela cheia"}>
              {telaCheia ? "⤡" : "⤢"}
            </button>
          </div>
          <div style={styles.stats} className="stats-row">
            <Stat label="pré-corte" value={totalPreCorte} />
            <Stat label="corte" value={totalCorte} />
            <Stat label="aguard. sublimação" value={totalAguardandoSublimacao} />
            <Stat label="sublimação" value={totalSublimacao} />
            <Stat label="pedidos costura" value={totalCosturaAberto} />
          </div>
        </div>
      </header>

      <main style={styles.main} className="app-main">
        {!firebaseConfigurado && (
          <div style={styles.avisoFirebase}>
            ⚠️ Firebase não configurado — os dados estão sendo salvos só neste navegador (não sincronizam com outros
            dispositivos). Preencha o arquivo <code>.env</code> com as chaves do seu projeto Firebase para ativar a
            sincronização em tempo real entre a equipe. Veja o passo a passo no README.md.
          </div>
        )}
        <section style={styles.formCard} className="card form-card">
          <h2 style={styles.formTitle}>Lançar item manualmente (entra no pré-corte)</h2>
          <div style={styles.formGrid} className="form-grid">
            <Field label="Nº do pedido">
              <input style={styles.input} value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder="ex: 1042" />
            </Field>
            <Field label="Produto">
              <select style={styles.input} value={produto} onChange={(e) => setProduto(e.target.value)}>
                {PRODUTOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Qtd do pedido">
              <input style={styles.input} type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </Field>
            <Field label="Data de entrega">
              <input style={styles.input} type="date" value={dataEntregaForm} onChange={(e) => setDataEntregaForm(e.target.value)} />
            </Field>
          </div>
          <button style={styles.addBtn} onClick={adicionarItem} disabled={!pedido.trim()}>Adicionar ao pré-corte</button>
          {erro && <p style={styles.erro}>{erro}</p>}
          <p style={styles.aviso}>Assim que o Patrick cortar, marque a quantidade e o dia na aba Pré-Corte.</p>
        </section>

        <section style={styles.exportRow} className="export-row">
          <button style={styles.exportBtn} onClick={exportarXLSX} disabled={itens.length === 0}>⬇ Baixar planilha (.xlsx)</button>
          <button style={styles.exportBtn} onClick={exportarPDF} disabled={itens.length === 0 || pdfGerando}>
            {pdfGerando ? "Gerando PDF..." : "📄 Baixar PDF"}
          </button>
          <button style={styles.exportBtnOutline} onClick={() => setMostrarDrive(true)}>Salvar no Google Drive</button>
          <button style={styles.limparBtn} onClick={() => setConfirmarLimpeza(true)} disabled={itens.length === 0}>🗑 Limpar tudo</button>
        </section>

        {confirmarLimpeza && (
          <div style={styles.modalOverlay} onClick={() => setConfirmarLimpeza(false)}>
            <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Apagar todos os lançamentos?</h3>
              <p style={styles.modalTexto}>
                Isso remove todos os {itens.length} itens de todas as etapas (pré-corte, corte, sublimação, costura, separação) e as datas de entrega salvas. Não dá pra desfazer.
              </p>
              <button style={{ ...styles.modalFechar, background: "#c81e2c" }} onClick={limparTudo}>Sim, apagar tudo</button>
              <button style={{ ...styles.modalFechar, background: "transparent", color: "#7a7160", marginTop: 8 }} onClick={() => setConfirmarLimpeza(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {mostrarDrive && (
          <div style={styles.modalOverlay} onClick={() => setMostrarDrive(false)}>
            <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>Salvar no Google Drive</h3>
              <p style={styles.modalTexto}>Este painel não se conecta direto ao Drive. O jeito mais simples:</p>
              <ol style={styles.modalLista}>
                <li>Toque em <b>"Baixar planilha (.xlsx)"</b> para gerar o arquivo.</li>
                <li>Abra o app ou site do Google Drive.</li>
                <li>Toque em <b>Novo → Fazer upload de arquivo</b> e selecione o arquivo baixado.</li>
              </ol>
              <p style={styles.modalTexto}>Se preferir, também posso conectar o Google Drive direto à conversa do Claude para enviar o arquivo por você — é só pedir.</p>
              <button style={styles.modalFechar} onClick={() => setMostrarDrive(false)}>Entendi</button>
            </div>
          </div>
        )}

        <div style={styles.tabs} className="tabs-row">
          {ABAS.map((t) => (
            <button
              key={t.id}
              style={{ ...styles.tabBtn, ...(aba === t.id ? styles.tabBtnAtiva : {}) }}
              className="tab-btn"
              onClick={() => setAba(t.id)}
            >
              {t.label}{t.contagem ? ` (${t.contagem})` : ""}
            </button>
          ))}
        </div>

        <div style={styles.listHeader} className="list-header">
          <input
            style={styles.filtroInput}
            placeholder="Buscar nº do pedido..."
            value={filtroPedido}
            onChange={(e) => setFiltroPedido(e.target.value)}
          />
          {aba === "sublimacao" && (
            <select style={styles.filtroInput} value={filtroSublimador} onChange={(e) => setFiltroSublimador(e.target.value)}>
              <option value="Todos">Todos os sublimadores</option>
              {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {aba === "costura" && (
            <select style={styles.filtroInput} value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)}>
              <option value="Todas">Todas as equipes</option>
              {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
        </div>

        {!loaded && <p style={styles.vazio}>Carregando...</p>}

        {loaded && aba === "pre_corte" && (
          <section style={styles.listWrap}>
            <p style={styles.aviso}>
              Pedidos lançados aqui aguardam corte. Conforme o Patrick for cortando, marque a quantidade e o dia — o item passa para a aba Corte.
            </p>

            <div style={styles.painelProducao}>
              <h3 style={styles.painelTitulo}>Total a cortar por produto (todos os pedidos)</h3>
              {resumoProdutosCorte.length === 0 ? (
                <p style={{ ...styles.vazio, margin: 0 }}>Nada pendente de corte no momento.</p>
              ) : (
                <div style={styles.resumoLista}>
                  {resumoProdutosCorte.map((r) => (
                    <button
                      key={r.produto}
                      style={{
                        ...styles.resumoLinha,
                        ...(produtoFiltroCorte === r.produto ? styles.resumoLinhaAtiva : {}),
                      }}
                      onClick={() => setProdutoFiltroCorte(produtoFiltroCorte === r.produto ? "Todos" : r.produto)}
                    >
                      <span style={styles.resumoProduto}>{r.produto}</span>
                      <span style={styles.resumoPedidosCount}>{r.numPedidos} pedido{r.numPedidos > 1 ? "s" : ""}</span>
                      <span style={styles.resumoQtd}>{r.restante}un</span>
                    </button>
                  ))}
                </div>
              )}
              {produtoFiltroCorte !== "Todos" && (
                <button style={styles.limparFiltroBtn} onClick={() => setProdutoFiltroCorte("Todos")}>
                  × limpar filtro ({produtoFiltroCorte})
                </button>
              )}
            </div>

            {preCorteAgrupadoFiltradoPorProduto.length === 0 ? (
              <p style={styles.vazio}>
                {produtoFiltroCorte !== "Todos" ? "Nenhum pedido pendente desse produto." : "Nada no pré-corte. Importe um PDF ou lance manualmente acima."}
              </p>
            ) : (
              preCorteAgrupadoFiltradoPorProduto.map((p) => (
                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      {p.dataEntrega && (
                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>
                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}
                        </span>
                      )}
                    </div>
                    <span style={styles.pctText}>{p.cortadoGeral}/{p.totalGeral} cortado</span>
                  </div>
                  <div style={styles.itensLista}>
                    {p.linhas.map((linha) => {
                      const f = getCorteForm(p.numero, linha.produto, linha.restante);
                      const concluidoLinha = linha.restante <= 0;
                      return (
                        <div key={linha.produto} style={{ ...styles.corteLinha, opacity: concluidoLinha ? 0.55 : 1 }}>
                          <div style={styles.corteLinhaTopo}>
                            <span style={styles.itemTexto}><b>{linha.produto}</b> · pedido: {linha.total}un</span>
                            <span style={styles.equipePill}>{concluidoLinha ? "totalmente cortado" : `restam ${linha.restante}un`}</span>
                          </div>
                          {!concluidoLinha && (
                            <div style={styles.corteFormGrid} className="corte-form-grid">
                              <input
                                style={styles.input}
                                type="number"
                                min={1}
                                max={linha.restante}
                                value={f.qtd}
                                onChange={(e) => setCorteFormCampo(p.numero, linha.produto, linha.restante, "qtd", e.target.value)}
                              />
                              <input
                                style={styles.input}
                                type="date"
                                value={f.data}
                                onChange={(e) => setCorteFormCampo(p.numero, linha.produto, linha.restante, "data", e.target.value)}
                              />
                              <button style={styles.enviarBtn} onClick={() => marcarCortado(p.numero, linha.produto, linha.restante)}>
                                Marcar como cortado
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {loaded && aba === "corte" && (
          <section style={styles.listWrap}>
            <div style={styles.painelProducao}>
              <h3 style={styles.painelTitulo}>Produção do corte</h3>
              <div style={styles.producaoGrid} className="producao-grid">
                <div style={styles.producaoColHead}>Cortador</div>
                <div style={styles.producaoColHead}>Hoje</div>
                <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>
                {CORTADORES.map((c) => (
                  <FragmentoProducao key={c} nome={c} hoje={producaoPorCortador[c]?.hoje || 0} mes={producaoPorCortador[c]?.mes || 0} />
                ))}
              </div>
            </div>
            <p style={styles.aviso}>
              Itens ficam aqui até serem movidos manualmente — o corte nem sempre segue a mesma ordem da sublimação.
            </p>
            {corteAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nada no corte. Importe um PDF ou lance manualmente acima.</p>
            ) : (
              corteAgrupado.map((p) => (
                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      <span style={styles.sublimadorPill}>{p.cortador}</span>
                      {p.dataEntrega && (
                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>
                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}
                        </span>
                      )}
                    </div>
                    <span style={styles.pctText}>{p.totalGeral}un cortadas</span>
                  </div>
                  <div style={styles.itensLista}>
                    {p.linhas.map((linha) => (
                      <div key={linha.produto} style={styles.itemLinha} className="item-linha">
                        <span style={styles.itemTexto}><b>{linha.produto}</b> · {linha.total}un</span>
                        <button style={styles.enviarBtn} onClick={() => moverParaAguardandoSublimacao(p.numero, linha.produto)}>
                          Mover p/ aguardando sublimação
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {loaded && aba === "aguardando_sublimacao" && (
          <section style={styles.listWrap}>
            <p style={styles.aviso}>
              Aqui você define a cor e a quantidade de cada lote antes de enviar para o sublimador — pode dividir
              o total de um modelo em quantas cores forem necessárias.
            </p>
            {aguardandoSublimacaoAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nada aguardando sublimação. Mova itens pela aba Corte.</p>
            ) : (
              aguardandoSublimacaoAgrupado.map((p) => (
                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      {p.dataEntrega && (
                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>
                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}
                        </span>
                      )}
                    </div>
                    <span style={styles.pctText}>{p.alocadoGeral}/{p.totalGeral} alocado</span>
                  </div>
                  <div style={styles.itensLista}>
                    {p.linhas.map((linha) => {
                      const f = getAlocForm(p.numero, linha.produto);
                      const concluidoLinha = linha.restante <= 0;
                      return (
                        <div key={linha.produto} style={{ ...styles.corteLinha, opacity: concluidoLinha ? 0.55 : 1 }}>
                          <div style={styles.corteLinhaTopo}>
                            <span style={styles.itemTexto}><b>{linha.produto}</b> · cortado: {linha.total}un</span>
                            <span style={styles.equipePill}>{concluidoLinha ? "totalmente alocado" : `restam ${linha.restante}un`}</span>
                          </div>
                          {!concluidoLinha && (
                            <div style={styles.alocGrid} className="aloc-grid">
                              <div style={styles.corSelectWrap}>
                                <span style={{ ...styles.swatch, background: corHex(f.cor), borderColor: corClara(corHex(f.cor)) ? "#0002" : "transparent" }} />
                                <select style={{ ...styles.input, paddingLeft: 34 }} value={f.cor} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "cor", e.target.value)}>
                                  {CORES.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
                                </select>
                              </div>
                              <input
                                style={styles.input}
                                type="number"
                                min={1}
                                max={linha.restante}
                                value={f.qtd}
                                onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "qtd", e.target.value)}
                              />
                              <select style={styles.input} value={f.sublimador} onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "sublimador", e.target.value)}>
                                {SUBLIMADORES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <input
                                style={styles.input}
                                type="date"
                                value={f.data}
                                onChange={(e) => setAlocFormCampo(p.numero, linha.produto, "data", e.target.value)}
                              />
                              <button style={styles.enviarBtn} onClick={() => enviarParaSublimacao(p.numero, linha.produto)}>
                                Enviar p/ sublimação
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        )}{loaded && aba === "sublimacao" && (
          <section style={styles.listWrap}>
            <div style={styles.painelProducao}>
              <h3 style={styles.painelTitulo}>Produção por sublimador</h3>
              <div style={styles.producaoGrid} className="producao-grid">
                <div style={styles.producaoColHead}>Sublimador</div>
                <div style={styles.producaoColHead}>Hoje</div>
                <div style={styles.producaoColHead}>{nomeMes(mesRef(hoje()))}</div>
                {SUBLIMADORES.map((s) => (
                  <FragmentoProducao key={s} nome={s} hoje={producaoPorSublimador[s]?.hoje || 0} mes={producaoPorSublimador[s]?.mes || 0} />
                ))}
              </div>
            </div>

            {sublimacaoFiltrada.length === 0 ? (
              <p style={styles.vazio}>Nada pendente na sublimação.</p>
            ) : (
              sublimacaoFiltrada.map(([dia, its]) => (
                <div key={dia} style={styles.diaGrupo} className="card">
                  <div style={styles.diaTitulo}>{dia === "sem-data" ? "Sem data" : formatarDataBR(dia)}</div>
                  {its.map((it) => (
                    <div key={it.id} style={styles.itemLinha} className="item-linha">
                      <button style={styles.enviarBtn} onClick={() => moverParaAguardandoCostura(it.id)}>Enviar p/ costura</button>
                      <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
                      <span style={styles.itemTexto}>#{it.pedido} · {it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>
                      <span style={styles.sublimadorPill}>{it.sublimador}</span>
                      <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </section>
        )}

        {loaded && aba === "aguardando_costura" && (
          <section style={styles.listWrap}>
            {aguardandoCosturaAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nada aguardando costura no momento.</p>
            ) : (
              aguardandoCosturaAgrupado.map((p) => (
                <div key={p.numero} style={styles.pedidoCard} className="card pedido-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      {p.dataEntrega && (
                        <span style={{ ...styles.badgeUrgencia, background: urgenciaInfo(p.dataEntrega).fundo, color: urgenciaInfo(p.dataEntrega).cor }}>
                          {formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={styles.itensLista}>
                    {p.itens.map((it) => (
                      <div key={it.id} style={styles.itemLinha} className="item-linha">
                        <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
                        <span style={styles.itemTexto}>{it.produto} <b>· {it.cor}</b> · {it.qtd}un</span>
                        <select style={styles.equipeSelect} value={it.equipe} onChange={(e) => setEquipeItem(it.id, e.target.value)}>
                          {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
                        </select>
                        <button style={styles.enviarBtn} onClick={() => moverParaCostura(it.id)}>Enviar p/ costura</button>
                        <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {loaded && aba === "costura" && (
          <section style={styles.listWrap}>
            {costuraFiltrado.length === 0 ? (
              <p style={styles.vazio}>Nenhum pedido na costura ainda.</p>
            ) : (
              costuraFiltrado.map((p) => (
                <PedidoCosturaCard key={p.numero} pedido={p} onToggle={toggleFeito} onRemover={removerItem} onEquipe={setEquipeItem} onFinalizar={moverPedidoParaSeparacao} />
              ))
            )}
          </section>
        )}

        {loaded && aba === "separacao" && (
          <section style={styles.listWrap}>
            {separacaoAgrupado.length === 0 ? (
              <p style={styles.vazio}>Nenhum pedido em separação.</p>
            ) : (
              separacaoAgrupado.map((p) => (
                <div key={p.numero} style={{ ...styles.pedidoCard, ...(p.completo ? styles.pedidoCompleto : {}) }} className="card pedido-card">
                  <div style={styles.pedidoTop}>
                    <div style={styles.pedidoNumWrap}>
                      <span style={styles.pedidoNum}>#{p.numero}</span>
                      {p.completo && <span style={styles.badgeCompleto}>conferido</span>}
                    </div>
                    <span style={styles.pctText}>{p.feito}/{p.total}</span>
                  </div>
                  <div style={styles.itensLista}>
                    {p.itens.map((it) => (
                      <div key={it.id} style={styles.itemLinha} className="item-linha">
                        <button
                          onClick={() => toggleConferido(it.id)}
                          style={{ ...styles.checkbox, background: it.conferido ? "#1f8a3d" : "#fff", borderColor: it.conferido ? "#1f8a3d" : "#cfc6b8" }}
                        >
                          {it.conferido && "✓"}
                        </button>
                        <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
                        <span style={{ ...styles.itemTexto, textDecoration: it.conferido ? "line-through" : "none", opacity: it.conferido ? 0.55 : 1 }}>
                          {it.produto} <b>· {it.cor}</b> · {it.qtd}un
                        </span>
                        <button style={styles.removerBtn} onClick={() => removerItem(it.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function FragmentoProducao({ nome, hoje, mes }) {
  return (
    <>
      <div style={styles.producaoNome}>{nome}</div>
      <div style={styles.producaoValor}>{hoje}</div>
      <div style={styles.producaoValor}>{mes}</div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.statBox}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function PedidoCosturaCard({ pedido, onToggle, onRemover, onEquipe, onFinalizar }) {
  const pctInt = Math.round(pedido.pct * 100);
  const urg = pedido.dataEntrega ? urgenciaInfo(pedido.dataEntrega) : null;
  return (
    <div style={{ ...styles.pedidoCard, ...(pedido.completo ? styles.pedidoCompleto : {}) }} className="card pedido-card">
      <div style={styles.pedidoTop}>
        <div style={styles.pedidoNumWrap}>
          <span style={styles.pedidoNum}>#{pedido.numero}</span>
          {pedido.completo && <span style={styles.badgeCompleto}>pronto p/ expedir</span>}
          {!pedido.completo && urg && (
            <span style={{ ...styles.badgeUrgencia, background: urg.fundo, color: urg.cor }}>
              {pedido.dataEntrega ? `${formatarDataBR(pedido.dataEntrega)} · ${urg.texto}` : urg.texto}
            </span>
          )}
        </div>
        <span style={styles.pctText}>{pctInt}%</span>
      </div>
      <div style={styles.barraTrack}>
        <div style={{ ...styles.barraFill, width: `${pctInt}%`, background: pedido.completo ? "#1f8a3d" : "#d8622c" }} />
      </div>
      <div style={styles.itensLista}>
        {pedido.itens.map((it) => (
          <div key={it.id} style={styles.itemLinha} className="item-linha">
            <button
              onClick={() => onToggle(it.id)}
              style={{ ...styles.checkbox, background: it.feito ? "#1f8a3d" : "#fff", borderColor: it.feito ? "#1f8a3d" : "#cfc6b8" }}
            >
              {it.feito && "✓"}
            </button>
            <span style={{ ...styles.swatchSm, background: corHex(it.cor) }} />
            <span style={{ ...styles.itemTexto, textDecoration: it.feito ? "line-through" : "none", opacity: it.feito ? 0.55 : 1 }}>
              {it.produto} <b>· {it.cor}</b> · {it.qtd}un
            </span>
            <select style={styles.equipeSelect} value={it.equipe} onChange={(e) => onEquipe(it.id, e.target.value)}>
              {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
            </select>
            <button style={styles.removerBtn} onClick={() => onRemover(it.id)}>×</button>
          </div>
        ))}
      </div>
      {pedido.completo && (
        <button style={styles.finalizarBtn} onClick={() => onFinalizar(pedido.numero)}>Mover pedido p/ separação →</button>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f2ede2", fontFamily: "'Georgia', 'Iowan Old Style', serif", color: "#231f1a", paddingBottom: 60 },
  header: { background: "#1c2a3a", color: "#f2ede2", padding: "28px 20px 34px" },
  headerInner: { maxWidth: 780, margin: "0 auto" },
  brandRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 18 },
  spool: { width: 40, height: 40, borderRadius: "50%", border: "3px solid #d8622c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  spoolCore: { width: 14, height: 14, borderRadius: "50%", background: "#d8622c" },
  fsBtn: {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: 9,
    border: "1px solid #3a4d63",
    background: "#25384c",
    color: "#f2ede2",
    fontSize: 17,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 23, margin: 0, letterSpacing: 0.3, fontWeight: 700 },
  subtitle: { margin: "4px 0 0", fontSize: 13.5, color: "#c7cdd6", fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  stats: { display: "flex", gap: 8, flexWrap: "wrap" },
  statBox: { background: "#25384c", borderRadius: 10, padding: "9px 12px", flex: 1, minWidth: 90 },
  statValue: { fontSize: 19, fontWeight: 700, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  statLabel: { fontSize: 10, color: "#a9b3c0", fontFamily: "'Helvetica Neue', Arial, sans-serif", marginTop: 2 },

  main: { maxWidth: 780, margin: "0 auto", padding: "24px 20px 0" },

  formCard: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px #0000000d", marginBottom: 16 },
  avisoFirebase: {
    background: "#fdf1d6",
    border: "1px solid #e8c97a",
    color: "#6b5416",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12.5,
    lineHeight: 1.5,
    marginBottom: 16,
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  formTitle: { margin: "0 0 14px", fontSize: 17, fontWeight: 700 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  field: { display: "flex", flexDirection: "column", gap: 5, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  fieldLabel: { fontSize: 11.5, color: "#7a7160", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { border: "1px solid #ddd3bd", borderRadius: 8, padding: "9px 10px", fontSize: 14.5, background: "#fff", color: "#231f1a", width: "100%" },
  corSelectWrap: { position: "relative" },
  swatch: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: "50%", border: "1px solid transparent" },
  addBtn: { background: "#d8622c", color: "#fff", border: "none", borderRadius: 9, padding: "11px 18px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", width: "100%" },
  erro: { color: "#c81e2c", fontSize: 13, marginTop: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  aviso: { color: "#a89f8c", fontSize: 11.5, marginTop: 4, marginBottom: 10, fontFamily: "'Helvetica Neue', Arial, sans-serif" },

  exportRow: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  exportBtn: { background: "#1c2a3a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", flex: 1, minWidth: 180 },
  exportBtnOutline: { background: "transparent", color: "#1c2a3a", border: "1.5px solid #1c2a3a", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", flex: 1, minWidth: 180 },
  limparBtn: { background: "transparent", color: "#c81e2c", border: "1.5px solid #c81e2c55", borderRadius: 9, padding: "10px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", flex: "0 0 auto" },
  modalOverlay: { position: "fixed", inset: 0, background: "#1c2a3aaa", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 },
  modalBox: { background: "#fffdf8", borderRadius: 14, padding: 22, maxWidth: 400, width: "100%", fontFamily: "'Helvetica Neue', Arial, sans-serif", maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { margin: "0 0 14px", fontFamily: "'Georgia', serif", fontSize: 19 },
  modalTexto: { fontSize: 13.5, color: "#5c5343", lineHeight: 1.5, margin: "0 0 10px" },
  modalLista: { fontSize: 13.5, color: "#5c5343", lineHeight: 1.7, paddingLeft: 20, margin: "0 0 10px" },
  modalFechar: { background: "#d8622c", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 4 },

  tabs: { display: "flex", gap: 6, marginTop: 10, marginBottom: 14, flexWrap: "wrap" },
  tabBtn: { flex: "1 1 auto", padding: "10px 8px", borderRadius: 9, border: "1px solid #ddd3bd", background: "#fffdf8", color: "#7a7160", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif", whiteSpace: "nowrap" },
  tabBtnAtiva: { background: "#1c2a3a", color: "#fff", borderColor: "#1c2a3a" },

  painelProducao: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: 16, marginBottom: 20 },
  resumoLista: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4 },
  resumoLinha: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f6f1e4",
    border: "1px solid #e4dbc8",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    textAlign: "left",
    width: "100%",
  },
  resumoLinhaAtiva: { background: "#1c2a3a", borderColor: "#1c2a3a", color: "#fff" },
  resumoProduto: { flex: 1, fontSize: 13.5, fontWeight: 600, color: "inherit" },
  resumoPedidosCount: { fontSize: 11, color: "#948a76", whiteSpace: "nowrap" },
  resumoQtd: { fontSize: 13.5, fontWeight: 700, color: "#d8622c", whiteSpace: "nowrap" },
  limparFiltroBtn: {
    marginTop: 10,
    background: "transparent",
    border: "1px solid #ddd3bd",
    borderRadius: 20,
    padding: "5px 12px",
    fontSize: 12,
    color: "#7a7160",
    cursor: "pointer",
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
  },
  painelTitulo: { margin: "0 0 10px", fontSize: 14.5, fontWeight: 700, fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  producaoGrid: { display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr", rowGap: 6, columnGap: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", alignItems: "center" },
  producaoColHead: { fontSize: 10.5, color: "#a89f8c", textTransform: "uppercase", letterSpacing: 0.4, paddingBottom: 4, borderBottom: "1px solid #eee5d2" },
  producaoNome: { fontSize: 13.5, fontWeight: 600 },
  producaoValor: { fontSize: 13.5, color: "#5c5343" },

  listWrap: { marginTop: 4 },
  listHeader: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  filtroInput: { border: "1px solid #ddd3bd", borderRadius: 8, padding: "7px 10px", fontSize: 13.5, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#fffdf8", flex: 1, minWidth: 150 },
  vazio: { color: "#948a76", fontSize: 14, fontFamily: "'Helvetica Neue', Arial, sans-serif" },

  diaGrupo: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: "14px 16px", marginBottom: 12 },
  diaTitulo: { fontWeight: 700, fontSize: 14.5, marginBottom: 10, fontFamily: "'Helvetica Neue', Arial, sans-serif" },

  pedidoCard: { background: "#fffdf8", border: "1px solid #e4dbc8", borderRadius: 12, padding: "14px 16px", marginBottom: 12 },
  pedidoCompleto: { borderColor: "#1f8a3d55", background: "#f6fbf5" },
  pedidoTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 },
  pedidoNumWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pedidoNum: { fontWeight: 700, fontSize: 16.5 },
  badgeCompleto: { fontSize: 10.5, fontFamily: "'Helvetica Neue', Arial, sans-serif", background: "#1f8a3d", color: "#fff", borderRadius: 20, padding: "3px 9px", letterSpacing: 0.3 },
  badgeUrgencia: { fontSize: 10.5, fontFamily: "'Helvetica Neue', Arial, sans-serif", borderRadius: 20, padding: "3px 9px", letterSpacing: 0.2, fontWeight: 700 },
  pctText: { fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: 13, color: "#7a7160", fontWeight: 600 },
  barraTrack: { height: 6, background: "#eee5d2", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  barraFill: { height: "100%", borderRadius: 3, transition: "width .3s ease" },

  itensLista: { display: "flex", flexDirection: "column", gap: 6 },
  itemLinha: { display: "flex", alignItems: "center", gap: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", flexWrap: "wrap" },
  checkbox: { width: 20, height: 20, minWidth: 20, borderRadius: 5, border: "1.5px solid #cfc6b8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", cursor: "pointer" },
  swatchSm: { width: 12, height: 12, borderRadius: "50%", minWidth: 12, border: "1px solid #0001" },
  itemTexto: { fontSize: 14, flex: 1, minWidth: 140 },
  equipePill: { fontSize: 10.5, background: "#eee5d2", color: "#5c5343", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap", letterSpacing: 0.2 },
  equipeSelect: { fontSize: 11.5, border: "1px solid #ddd3bd", borderRadius: 20, padding: "3px 8px", background: "#fff", color: "#5c5343" },
  sublimadorPill: { fontSize: 10.5, background: "#e6dcc8", color: "#5c4a12", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap", letterSpacing: 0.2, fontWeight: 700 },
  enviarBtn: { fontSize: 11, background: "#1f8a3d", color: "#fff", border: "none", borderRadius: 7, padding: "6px 9px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  finalizarBtn: { marginTop: 10, width: "100%", background: "#1c2a3a", color: "#fff", border: "none", borderRadius: 9, padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Helvetica Neue', Arial, sans-serif" },
  removerBtn: { border: "none", background: "transparent", color: "#b8ac95", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 4px" },

  corteLinha: { borderTop: "1px solid #f0e9d8", paddingTop: 10, marginTop: 4 },
  corteLinhaTopo: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "'Helvetica Neue', Arial, sans-serif", flexWrap: "wrap" },
  alocGrid: { display: "grid", g
  };
