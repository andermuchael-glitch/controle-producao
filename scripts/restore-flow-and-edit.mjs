import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

// O usuário escolhe no lançamento se o pedido passa ou não pelo Pré-Corte.
// Este ajuste roda depois do fix-jsx-build para garantir que essa escolha seja preservada.
s = s.replace(
  'const etapaInicial="pre_corte";',
  'const etapaInicial=passaPreCorte?"pre_corte":"aguardando_sublimacao";'
);

// Permite abrir a edição também para pedidos que foram lançados diretamente
// em Aguardando Sublimação.
const stateFrom = 'const[mostrarEdicaoPedido,setMostrarEdicaoPedido]=useState(false);const[pedidoEmEdicao,setPedidoEmEdicao]=useState("");';
const stateTo = 'const[mostrarEdicaoPedido,setMostrarEdicaoPedido]=useState(false);const[pedidoEmEdicao,setPedidoEmEdicao]=useState("");const[etapaEdicaoPedido,setEtapaEdicaoPedido]=useState("pre_corte");';
if (s.includes(stateFrom) && !s.includes('etapaEdicaoPedido')) s=s.replace(stateFrom,stateTo);

const openFrom = 'const abrirEdicaoPedido=numero=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa==="pre_corte");if(!linhas.length){setErro("Pedido não encontrado no Pré-Corte.");return}setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};';
const openTo = 'const abrirEdicaoPedido=numero=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa==="pre_corte");if(!linhas.length){setErro("Pedido não encontrado no Pré-Corte.");return}setEtapaEdicaoPedido("pre_corte");setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};const abrirEdicaoPedidoEtapa=(numero,etapa)=>{const linhas=itens.filter(i=>i.pedido===String(numero)&&i.etapa===etapa);if(!linhas.length){setErro("Pedido não encontrado nesta etapa.");return}setEtapaEdicaoPedido(etapa);setPedidoEmEdicao(String(numero));const primeira=linhas[0];setEdicaoPedidoForm({numero:String(numero),produto:primeira.produto,qtd:Number(primeira.qtd)||1,dataEntrega:pedidosMeta[String(numero)]?.dataEntrega||""});setMostrarEdicaoPedido(true)};';
if (s.includes(openFrom) && !s.includes('const abrirEdicaoPedidoEtapa=')) s=s.replace(openFrom,openTo);

const saveFrom = 'const salvarEdicaoPedido=async()=>{const antigo=String(pedidoEmEdicao).trim();const novoNumero=String(edicaoPedidoForm.numero).trim();const novoProduto=String(edicaoPedidoForm.produto).trim();const novaQtd=Math.max(1,Number(edicaoPedidoForm.qtd)||1);if(!novoNumero||!novoProduto){setErro("Informe número e produto.");return}const conflito=itens.some(i=>i.pedido===novoNumero&&i.produto===novoProduto&&i.etapa==="pre_corte"&&i.pedido!==antigo);if(conflito){setErro(`O pedido #${novoNumero} / ${novoProduto} já existe no Pré-Corte.`);return}const novaLista=itens.map(i=>i.pedido===antigo&&i.etapa==="pre_corte"?{...i,pedido:novoNumero,produto:novoProduto,qtd:novaQtd}:i);const novoMeta={...pedidosMeta};if(novoNumero!==antigo&&novoMeta[antigo]){novoMeta[novoNumero]=novoMeta[antigo];delete novoMeta[antigo]}novoMeta[novoNumero]={...(novoMeta[novoNumero]||{}),dataEntrega:String(edicaoPedidoForm.dataEntrega||"")};try{const [itensSalvos,metaSalva]=await Promise.all([salvar(novaLista),salvarMeta(novoMeta)]);if(!itensSalvos||!metaSalva){setErro("Não foi possível salvar todas as alterações. Tente novamente.");return}setMostrarEdicaoPedido(false);setErro("")}catch(e){console.error("Erro ao salvar edição do pedido",e);setErro("Não foi possível salvar a alteração da data. Verifique a conexão com o Firebase e tente novamente.")}};';
const saveTo = 'const salvarEdicaoPedido=async()=>{const antigo=String(pedidoEmEdicao).trim();const novoNumero=String(edicaoPedidoForm.numero).trim();const novoProduto=String(edicaoPedidoForm.produto).trim();const novaQtd=Math.max(1,Number(edicaoPedidoForm.qtd)||1);const etapa=etapaEdicaoPedido||"pre_corte";if(!novoNumero||!novoProduto){setErro("Informe número e produto.");return}const conflito=itens.some(i=>i.pedido===novoNumero&&i.produto===novoProduto&&i.etapa===etapa&&i.pedido!==antigo);if(conflito){setErro(`O pedido #${novoNumero} / ${novoProduto} já existe nesta etapa.`);return}const novaLista=itens.map(i=>i.pedido===antigo&&i.etapa===etapa?{...i,pedido:novoNumero,produto:novoProduto,qtd:novaQtd}:i);const novoMeta={...pedidosMeta};if(novoNumero!==antigo&&novoMeta[antigo]){novoMeta[novoNumero]=novoMeta[antigo];delete novoMeta[antigo]}novoMeta[novoNumero]={...(novoMeta[novoNumero]||{}),dataEntrega:String(edicaoPedidoForm.dataEntrega||"")};try{const [itensSalvos,metaSalva]=await Promise.all([salvar(novaLista),salvarMeta(novoMeta)]);if(!itensSalvos||!metaSalva){setErro("Não foi possível salvar todas as alterações. Tente novamente.");return}setMostrarEdicaoPedido(false);setErro("")}catch(e){console.error("Erro ao salvar edição do pedido",e);setErro("Não foi possível salvar a alteração. Verifique a conexão com o Firebase e tente novamente.")}};';
if (s.includes(saveFrom) && s.includes('etapaEdicaoPedido')) s=s.replace(saveFrom,saveTo);

// Botão Editar no cartão de Aguardando Sublimação.
const aguardFrom = '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span></div><span style={styles.pctText}>{p.totalGeral}un</span></div><div style={styles.itensLista}>';
const aguardTo = '<div style={styles.pedidoTop}><div style={styles.pedidoNumWrap}><span style={styles.pedidoNum}>#{p.numero}</span>{p.dataEntrega&&<span style={{...styles.badgeUrgencia,background:urgenciaInfo(p.dataEntrega).fundo,color:urgenciaInfo(p.dataEntrega).cor}}>{formatarDataBR(p.dataEntrega)} · {urgenciaInfo(p.dataEntrega).texto}</span>}</div><span style={styles.pctText}>{p.totalGeral}un</span><button type="button" style={styles.exportBtnOutline} onClick={()=>abrirEdicaoPedidoEtapa(p.numero,"aguardando_sublimacao")}>✏️ Editar</button></div><div style={styles.itensLista}>';
if (s.includes(aguardFrom) && !s.includes('abrirEdicaoPedidoEtapa(p.numero,"aguardando_sublimacao")')) s=s.replace(aguardFrom,aguardTo);

await writeFile(path,s,"utf8");
