import { useEffect, useMemo, useState } from "react";

const ETAPA_ORDEM = [
  "pre_corte",
  "corte",
  "aguardando_sublimacao",
  "sublimacao",
  "aguardando_costura",
  "costura",
  "separacao",
];

const ETAPA_NOME = {
  pre_corte: "Pré-Corte",
  corte: "Corte",
  aguardando_sublimacao: "Aguardando Sublimação",
  sublimacao: "Sublimação",
  aguardando_costura: "Aguardando Costura",
  costura: "Costura",
  separacao: "Separação",
};

const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
};

export default function NeoTopBar({ etapas = [], aba, setAba, itens = [], pedidosMeta = {}, filtroPedido, setFiltroPedido }) {
  const [busca, setBusca] = useState(filtroPedido || "");
  const [aberto, setAberto] = useState(false);

  useEffect(() => setBusca(filtroPedido || ""), [filtroPedido]);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/^#/, "");
    if (!termo) return [];
    return itens
      .filter((it) => String(it.pedido).toLowerCase().includes(termo))
      .sort((a, b) => {
        const pa = String(a.pedido), pb = String(b.pedido);
        if (pa !== pb) return pa.localeCompare(pb, undefined, { numeric: true });
        return ETAPA_ORDEM.indexOf(a.etapa) - ETAPA_ORDEM.indexOf(b.etapa);
      });
  }, [busca, itens]);

  const pedidosEncontrados = useMemo(() => {
    const mapa = new Map();
    resultados.forEach((it) => {
      if (!mapa.has(it.pedido)) mapa.set(it.pedido, []);
      mapa.get(it.pedido).push(it);
    });
    return Array.from(mapa.entries());
  }, [resultados]);

  const selecionarEtapa = (id) => {
    setAba(id);
    setAberto(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onBusca = (value) => {
    setBusca(value);
    setFiltroPedido(value);
    setAberto(Boolean(value.trim()));
  };

  return (
    <>
      <style>{`
        .neo-topbar{position:sticky;top:0;z-index:1000;display:flex;align-items:center;gap:12px;padding:10px 14px;margin:-24px -20px 22px;background:rgba(255,255,255,.96);backdrop-filter:blur(16px);border-bottom:1px solid #e4e9ef;box-shadow:0 5px 18px rgba(20,34,52,.09);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .neo-brand{display:flex;align-items:center;gap:8px;flex:0 0 auto;color:#17283d}.neo-brand-dot{width:10px;height:10px;border-radius:50%;background:#e7662b;box-shadow:0 0 0 4px rgba(231,102,43,.12)}.neo-brand strong{display:block;font-size:14px;line-height:1.05}.neo-brand small{display:block;margin-top:2px;color:#8a94a2;font-size:9px;text-transform:uppercase;letter-spacing:.7px}
        .neo-stage-nav{display:flex;align-items:center;gap:5px;min-width:0;flex:1;overflow-x:auto;scrollbar-width:none}.neo-stage-nav::-webkit-scrollbar{display:none}.neo-stage-btn{display:flex;align-items:center;gap:5px;flex:0 0 auto;border:1px solid #dce3ea;background:#f7f9fb;color:#687384;border-radius:9px;padding:8px 10px;font-size:11px;font-weight:750;cursor:pointer;white-space:nowrap}.neo-stage-btn:hover{border-color:#c8d1dc;transform:translateY(-1px)}.neo-stage-btn.active{background:#17283d;border-color:#17283d;color:#fff;box-shadow:0 4px 10px rgba(23,40,61,.15)}.neo-stage-btn b{opacity:.65;font-size:10px}
        .neo-search{position:relative;flex:0 0 230px}.neo-search>span{position:absolute;left:11px;top:7px;z-index:2;color:#7b8795;font-size:20px;line-height:1}.neo-search input{width:100%;height:40px;padding:0 34px 0 32px!important;border:1px solid #dce3ea!important;border-radius:11px!important;background:#f7f9fb!important;color:#17283d!important;font-size:13px!important}.neo-search input:focus{outline:3px solid rgba(231,102,43,.13)!important;border-color:#e7662b!important}.neo-search-clear{position:absolute;right:4px;top:4px;width:32px;height:32px;border:0;background:transparent;color:#7d8794;font-size:21px;cursor:pointer}
        .neo-track-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:flex-start;justify-content:center;padding:76px 14px 18px;background:rgba(12,25,40,.48);backdrop-filter:blur(3px)}.neo-track-modal{width:min(1060px,100%);max-height:calc(100vh - 94px);overflow:auto;background:#fff;border:1px solid #e1e7ee;border-radius:20px;box-shadow:0 24px 70px rgba(10,24,40,.28);padding:20px}.neo-track-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}.neo-track-head>div>span{color:#e7662b;font-size:10px;font-weight:850;letter-spacing:1.1px}.neo-track-head h3{margin:3px 0 0;color:#17283d;font-size:22px;letter-spacing:-.4px}.neo-track-head>button{width:34px;height:34px;border:0;border-radius:50%;background:#f0f3f6;color:#536070;font-size:22px;cursor:pointer}.neo-track-orders{display:flex;flex-direction:column;gap:14px}.neo-track-order{border:1px solid #e2e8ee;border-radius:16px;overflow:hidden;background:#fbfcfd}.neo-track-order-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;background:#f3f6f8;color:#17283d}.neo-track-order-head strong{font-size:17px}.neo-track-order-head span{color:#738091;font-size:12px}.neo-track-timeline{padding:12px 16px 14px}.neo-track-stage{display:flex;gap:11px;position:relative;padding:8px 0}.neo-track-stage:not(:last-child)::after{content:"";position:absolute;left:4px;top:21px;bottom:-9px;width:1px;background:#dbe2e9}.neo-track-stage-dot{width:9px;height:9px;margin-top:4px;flex:0 0 9px;border-radius:50%;background:#c8d0d9;position:relative;z-index:1}.neo-track-stage-dot.active{background:#e7662b;box-shadow:0 0 0 4px rgba(231,102,43,.12)}.neo-track-stage.muted{opacity:.5}.neo-track-stage-body{flex:1;min-width:0}.neo-track-stage-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:5px}.neo-track-stage-title b{color:#344253;font-size:12px}.neo-track-stage-title button{border:0;background:transparent;color:#e7662b;font-size:11px;font-weight:800;cursor:pointer}.neo-track-stage small{display:block;color:#9aa4b0;font-size:11px}.neo-track-item{display:flex;flex-wrap:wrap;align-items:center;gap:7px;padding:8px 10px;margin:5px 0;background:#fff;border:1px solid #e6ebf0;border-radius:10px;color:#344253;font-size:12px}.neo-track-item strong{margin-right:auto;color:#17283d}.neo-track-tag{padding:3px 7px;border-radius:999px;background:#eef2f5;color:#647181;font-size:10px}.neo-track-date{color:#8993a0;font-size:10px}.neo-track-delivery{border-top:1px solid #e4e9ee;padding:10px 16px;color:#687384;font-size:12px}.neo-track-empty{padding:34px 12px;text-align:center;color:#758191}.neo-track-empty strong{color:#344253}.neo-track-empty p{margin:6px 0 0;font-size:12px}
        .neo-board{display:flex!important;flex-wrap:wrap;align-items:flex-start;gap:14px}.neo-board>.pedido-card{flex:1 1 calc(50% - 14px);min-width:310px;margin-bottom:0!important}.neo-board>.painelProducao,.neo-board>.vazio,.neo-board>.aviso{flex:0 0 100%}.neo-board>.painelProducao{margin-bottom:0!important}.neo-board>.pedido-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(23,34,53,.09)!important;transition:.18s ease}.neo-board .pedido-card{border-radius:16px!important}.neo-board .pedidoNum{font-size:17px!important}.list-header>input{display:none!important}.list-header{margin-top:4px}
        @media(max-width:900px){.neo-brand{display:none}.neo-search{flex-basis:190px}}@media(max-width:640px){.neo-topbar{margin:-16px -12px 16px;padding:8px 10px;gap:8px;top:0}.neo-stage-btn{padding:8px 9px;font-size:10px}.neo-search{flex:0 0 145px}.neo-search input{font-size:12px!important}.neo-search input::placeholder{color:transparent}.neo-board{gap:10px}.neo-board>.pedido-card{flex-basis:100%;min-width:0}.neo-track-backdrop{padding:58px 8px 10px}.neo-track-modal{border-radius:16px;padding:14px;max-height:calc(100vh - 68px)}}
      `}</style>
      <div className="neo-topbar">
        <div className="neo-brand"><span className="neo-brand-dot"/><div><strong>NeoCooler</strong><small>Produção</small></div></div>
        <nav className="neo-stage-nav" aria-label="Etapas da produção">
          {etapas.map((etapa) => <button key={etapa.id} type="button" className={`neo-stage-btn ${aba === etapa.id ? "active" : ""}`} onClick={() => selecionarEtapa(etapa.id)}><span>{etapa.label}</span>{etapa.contagem ? <b>{etapa.contagem}</b> : null}</button>)}
        </nav>
        <div className="neo-search"><span>⌕</span><input type="search" value={busca} onFocus={() => busca.trim() && setAberto(true)} onChange={(e) => onBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setBusca(""); setFiltroPedido(""); setAberto(false); } if (e.key === "Enter") setAberto(Boolean(busca.trim())); }} placeholder="Rastrear pedido..." aria-label="Rastrear pedido em todas as etapas"/>{busca && <button type="button" className="neo-search-clear" onClick={() => { setBusca(""); setFiltroPedido(""); setAberto(false); }} aria-label="Limpar rastreamento">×</button>}</div>
      </div>
      {aberto && busca.trim() && <div className="neo-track-backdrop" onClick={() => setAberto(false)}><div className="neo-track-modal" onClick={(e) => e.stopPropagation()}>
        <div className="neo-track-head"><div><span>RASTREAMENTO GLOBAL</span><h3>Pedido #{busca.trim().replace(/^#/, "")}</h3></div><button type="button" onClick={() => setAberto(false)} aria-label="Fechar">×</button></div>
        {pedidosEncontrados.length === 0 ? <div className="neo-track-empty"><strong>Pedido não encontrado.</strong><p>Digite o número do pedido. A busca considera todas as etapas ao mesmo tempo.</p></div> : <div className="neo-track-orders">{pedidosEncontrados.map(([numero, lista]) => <div className="neo-track-order" key={numero}>
          <div className="neo-track-order-head"><strong>#{numero}</strong><span>{lista.reduce((s, it) => s + Number(it.qtd || 0), 0)} unidades registradas</span></div>
          <div className="neo-track-timeline">{ETAPA_ORDEM.map((etapa) => { const itensEtapa = lista.filter((it) => it.etapa === etapa); if (!itensEtapa.length) return <div className="neo-track-stage muted" key={etapa}><div className="neo-track-stage-dot"/><div><b>{ETAPA_NOME[etapa]}</b><small>— nenhum item nesta etapa</small></div></div>; return <div className="neo-track-stage" key={etapa}><div className="neo-track-stage-dot active"/><div className="neo-track-stage-body"><div className="neo-track-stage-title"><b>{ETAPA_NOME[etapa]}</b><button type="button" onClick={() => selecionarEtapa(etapa)}>Abrir</button></div>{itensEtapa.map((it) => <div className="neo-track-item" key={it.id}><strong>{it.produto}</strong><span>{it.qtd} un</span>{it.cor && <span className="neo-track-tag">● {it.cor}</span>}{it.sublimador && <span className="neo-track-tag">{it.sublimador}</span>}{it.equipe && it.equipe !== "Não decidido" && <span className="neo-track-tag">{it.equipe}</span>}{it.dataSublimacao && <span className="neo-track-date">Sublimação: {fmtDate(it.dataSublimacao)}</span>}{it.dataCorte && <span className="neo-track-date">Corte: {fmtDate(it.dataCorte)}</span>}</div>)}</div></div>; })}</div>
          {pedidosMeta[numero]?.dataEntrega && <div className="neo-track-delivery">Entrega: <b>{fmtDate(pedidosMeta[numero].dataEntrega)}</b></div>}
        </div>)}</div>}
      </div></div>}
    </>
  );
}
