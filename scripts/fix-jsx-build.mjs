import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

const broken = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>)}';
const fixed = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}';
if (s.includes(broken)) s = s.replace(broken, fixed);

const hasFullscreenState = /const\s*\[\s*telaCheia\s*,\s*setTelaCheia\s*\]\s*=\s*useState/.test(s);
const hasFullscreenFn = /const\s+alternarTelaCheia\s*=/.test(s);
if (!hasFullscreenState || !hasFullscreenFn) {
  const markers = ['return <div className="neocooler-app" style={styles.page}>','return <div style={styles.page}>'];
  const marker = markers.find(m => s.includes(m));
  if (marker) {
    const prefix = [
      !hasFullscreenState ? 'const [telaCheia,setTelaCheia]=useState(false);' : '',
      !hasFullscreenFn ? 'const alternarTelaCheia=()=>{try{if(document.fullscreenElement){document.exitFullscreen?.();setTelaCheia(false)}else{document.documentElement.requestFullscreen?.();setTelaCheia(true)}}catch(e){console.warn("Fullscreen indisponível",e)}};' : ''
    ].filter(Boolean).join('\n  ');
    s = s.replace(marker, prefix + (prefix ? '\n  ' : '') + marker);
  }
}

const patches = [
  {
    from: '<div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span>',
    to: '<div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.totalGeral}un</span>'
  },
  {
    from: '<div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.total}un</span></div>',
    to: '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.total}un</span></div>'
  },
  {
    from: '<div style={styles.pedidoTop}><span style={styles.pedidoNum}>#{p.numero}</span><span style={styles.pctText}>{p.feito}/{p.total}</span></div>',
    to: '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.feito}/{p.total}</span></div>'
  }
];
for (const {from,to} of patches) if (s.includes(from) && !s.includes(to)) s = s.replace(from,to);

const corteGridFrom = 'corteFormGrid:{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const corteGridTo = 'corteFormGrid:{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(corteGridFrom)) s = s.replace(corteGridFrom, corteGridTo);

const marcarCortadoFrom = '<button style={styles.enviarBtn} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
const marcarCortadoTo = '<button style={{...styles.enviarBtn,gridColumn:"1/-1",width:"100%"}} onClick={()=>marcarCortado(p.numero,linha.produto,linha.restante)}>Marcar como cortado</button>';
if (s.includes(marcarCortadoFrom)) s = s.replace(marcarCortadoFrom, marcarCortadoTo);

const alocGridFrom = 'alocGrid:{display:"grid",gridTemplateColumns:"1.2fr .6fr 1fr 1fr auto",gap:8,alignItems:"center",marginTop:8}';
const alocGridTo = 'alocGrid:{display:"grid",gridTemplateColumns:"minmax(0,1.25fr) minmax(78px,.75fr)",gap:9,alignItems:"center",marginTop:9}';
if (s.includes(alocGridFrom)) s = s.replace(alocGridFrom, alocGridTo);

const alocFnFrom = 'const getAlocForm=(p,prod)=>alocForm[chaveAloc(p,prod)]||{cor:regraProduto(prod).usaCor?CORES[0].nome:"",qtd:1,sublimador:SUBLIMADORES[0],data:hoje()};const setAlocFormCampo=(p,prod,campo,valor)=>setAlocForm(f=>({...f,[chaveAloc(p,prod)]:{...getAlocForm(p,prod),[campo]:valor}}));';
const alocFnTo = 'const getAlocForm=(p,prod)=>alocForm[chaveAloc(p,prod)]||{cor:regraProduto(prod).usaCor?CORES[0].nome:"",qtd:1,sublimador:SUBLIMADORES[0],data:hoje()};const setAlocFormCampo=(p,prod,campo,valor)=>setAlocForm(f=>({...f,[chaveAloc(p,prod)]:{...getAlocForm(p,prod),[campo]:valor}}));const salvarQuantidadeAguardandoSublimacao=async(p,prod)=>{const origem=itens.find(i=>i.pedido===p&&i.produto===prod&&i.etapa==="aguardando_sublimacao");if(!origem)return;const f=getAlocForm(p,prod);const novaQtd=Math.floor(Number(f.qtd));if(!Number.isFinite(novaQtd)||novaQtd<1){setErro("Informe uma quantidade válida maior que zero.");return}await salvar(itens.map(i=>i.id===origem.id?{...i,qtd:novaQtd}:i));setAlocForm(x=>({...x,[chaveAloc(p,prod)]:{...f,qtd:novaQtd}}));setErro("")};';
if (s.includes(alocFnFrom) && !s.includes('salvarQuantidadeAguardandoSublimacao=')) s = s.replace(alocFnFrom, alocFnTo);

s = s.replace(/<input className="quantity-input" style=\{styles\.input\} type="number" min=\{1\} max=\{linha\.restante\} value=\{f\.qtd\} onChange=\{e=>setAlocFormCampo\(p\.numero,linha\.produto,"qtd",e\.target\.value\)\}\/>/g,
  '<input className="quantity-input" style={styles.input} type="number" min={1} max={999999} value={f.qtd} onChange={e=>setAlocFormCampo(p.numero,linha.produto,"qtd",e.target.value)} onBlur={()=>salvarQuantidadeAguardandoSublimacao(p.numero,linha.produto)}/>'
);

const costuraFnFrom = 'const setCosturaFormCampo=(id,restante,campo,valor,corAtual="")=>setCosturaForm(f=>({...f,[id]:{...getCosturaForm(id,restante,corAtual),[campo]:valor}}));';
const costuraFnTo = 'const setCosturaFormCampo=(id,restante,campo,valor,corAtual="")=>setCosturaForm(f=>({...f,[id]:{...getCosturaForm(id,restante,corAtual),[campo]:valor}}));const salvarQuantidadeAguardandoCostura=async id=>{const origem=itens.find(i=>i.id===id&&i.etapa==="aguardando_costura");if(!origem)return;const f=getCosturaForm(id,Number(origem.qtd)||0,origem.cor||"");const novaQtd=Math.floor(Number(f.qtd));if(!Number.isFinite(novaQtd)||novaQtd<1){setErro("Informe uma quantidade válida maior que zero.");return}await salvar(itens.map(i=>i.id===id?{...i,qtd:novaQtd}:i));setCosturaForm(x=>({...x,[id]:{...f,qtd:novaQtd}}));setErro("")};';
if (s.includes(costuraFnFrom) && !s.includes('salvarQuantidadeAguardandoCostura=')) s = s.replace(costuraFnFrom, costuraFnTo);

s = s.replace(/<input style=\{styles\.input\} type="number" min=\{1\} max=\{Number\(it\.qtd\)\|\|1\} value=\{f\.qtd\} onChange=\{e=>setCosturaFormCampo\(it\.id,Number\(it\.qtd\)\|\|0,"qtd",e\.target\.value\)\} placeholder="Qtd"\/>/g,
  '<input className="quantity-input" style={styles.input} type="number" min={1} max={999999} value={f.qtd} onChange={e=>setCosturaFormCampo(it.id,Number(it.qtd)||0,"qtd",e.target.value)} onBlur={()=>salvarQuantidadeAguardandoCostura(it.id)} placeholder="Qtd"/>'
);

// Todo novo lançamento passa pelo Pré-Corte. A edição posterior continua disponível
// nas etapas para evitar que um lançamento incorreto fique preso sem correção.
s = s.replace('const etapaInicial=passaPreCorte?"pre_corte":"aguardando_sublimacao";', 'const etapaInicial="pre_corte";');

// Permite editar também pedidos que já estão em Aguardando Sublimação.
const stateFrom = 'const[mostrarEdicaoPedido,setMostrarEdicaoPedido]=useState(false);const[pedidoEmEdicao,setPedidoEmEdicao]=useState("");';
const stateTo = 'const[mostrarEdicaoPedido,setMostrarEdicaoPedido]=useState(false);const[pedidoEmEdicao,setPedidoEmEdicao]=useState("");const[etapaEdicaoPedido,setEtapaEdicaoPedido]=useState("pre_corte");';
if (s.includes(stateFrom)) s = s.replace(stateFrom,stateTo);

const abrirFrom = 'const abrirEdicaoPedido=numero=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa==="pre_corte");if(!linhas.length){setErro("Pedido não encontrado no Pré-Corte.");return}setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};';
const abrirTo = 'const abrirEdicaoPedido=numero=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa==="pre_corte");if(!linhas.length){setErro("Pedido não encontrado no Pré-Corte.");return}setEtapaEdicaoPedido("pre_corte");setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};const abrirEdicaoPedidoEtapa=(numero,etapa)=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa===etapa);if(!linhas.length){setErro("Pedido não encontrado nesta etapa.");return}setEtapaEdicaoPedido(etapa);setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};';
if (s.includes(abrirFrom) && !s.includes('const abrirEdicaoPedidoEtapa=')) s = s.replace(abrirFrom,abrirTo);

const salvarEditFrom = 'const salvarEdicaoPedido=async()=>{const antigo=String(pedidoEmEdicao).trim();const novoNumero=String(edicaoPedidoForm.numero).trim();const novoProduto=String(edicaoPedidoForm.produto).trim();const novaQtd=Math.max(1,Number(edicaoPedidoForm.qtd)||1);if(!novoNumero||!novoProduto){setErro("Informe número e produto.");return}const conflito=itens.some(i=>i.pedido===novoNumero&&i.produto===novoProduto&&i.etapa==="pre_corte"&&i.pedido!==antigo);if(conflito){setErro(`O pedido #${novoNumero} / ${novoProduto} já existe no Pré-Corte.`);return}const novaLista=itens.map(i=>i.pedido===antigo&&i.etapa==="pre_corte"?{...i,pedido:novoNumero,produto:novoProduto,qtd:novaQtd}:i);const novoMeta={...pedidosMeta};if(novoNumero!==antigo&&novoMeta[antigo]){novoMeta[novoNumero]=novoMeta[antigo];delete novoMeta[antigo]}novoMeta[novoNumero]={...(novoMeta[novoNumero]||{}),dataEntrega:String(edicaoPedidoForm.dataEntrega||"")};try{const [itensSalvos,metaSalva]=await Promise.all([salvar(novaLista),salvarMeta(novoMeta)]);if(!itensSalvos||!metaSalva){setErro("Não foi possível salvar todas as alterações. Tente novamente.");return}setMostrarEdicaoPedido(false);setErro("")}catch(e){console.error("Erro ao salvar edição do pedido",e);setErro("Não foi possível salvar a alteração da data. Verifique a conexão com o Firebase e tente novamente.")}};';
const salvarEditTo = 'const salvarEdicaoPedido=async()=>{const antigo=String(pedidoEmEdicao).trim();const novoNumero=String(edicaoPedidoForm.numero).trim();const novoProduto=String(edicaoPedidoForm.produto).trim();const novaQtd=Math.max(1,Number(edicaoPedidoForm.qtd)||1);const etapa=etapaEdicaoPedido||"pre_corte";if(!novoNumero||!novoProduto){setErro("Informe número e produto.");return}const conflito=itens.some(i=>i.pedido===novoNumero&&i.produto===novoProduto&&i.etapa===etapa&&i.pedido!==antigo);if(conflito){setErro(`O pedido #${novoNumero} / ${novoProduto} já existe nesta etapa.`);return}const novaLista=itens.map(i=>i.pedido===antigo&&i.etapa===etapa?{...i,pedido:novoNumero,produto:novoProduto,qtd:novaQtd}:i);const novoMeta={...pedidosMeta};if(novoNumero!==antigo&&novoMeta[antigo]){novoMeta[novoNumero]=novoMeta[antigo];delete novoMeta[antigo]}novoMeta[novoNumero]={...(novoMeta[novoNumero]||{}),dataEntrega:String(edicaoPedidoForm.dataEntrega||"")};try{const [itensSalvos,metaSalva]=await Promise.all([salvar(novaLista),salvarMeta(novoMeta)]);if(!itensSalvos||!metaSalva){setErro("Não foi possível salvar todas as alterações. Tente novamente.");return}setMostrarEdicaoPedido(false);setErro("")}catch(e){console.error("Erro ao salvar edição do pedido",e);setErro("Não foi possível salvar a alteração. Verifique a conexão com o Firebase e tente novamente.")}};';
if (s.includes(salvarEditFrom)) s = s.replace(salvarEditFrom,salvarEditTo);

// Botão Editar no cabeçalho dos cartões de Aguardando Sublimação.
const aguHeaderFrom = '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span></div>';
const aguHeaderTo = '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span><button type="button" style={styles.exportBtnOutline} onClick={()=>abrirEdicaoPedidoEtapa(p.numero,"aguardando_sublimacao")}>✏️ Editar</button></div>';
if (s.includes(aguHeaderFrom)) s = s.replace(aguHeaderFrom,aguHeaderTo);

await writeFile(path, s, "utf8");
