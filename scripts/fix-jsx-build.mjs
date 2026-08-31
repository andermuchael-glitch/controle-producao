import { readFile, writeFile } from "node:fs/promises";

const path = "src/App.jsx";
let s = await readFile(path, "utf8");

// Correção histórica do JSX.
const broken = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>)}';
const fixed = 'onClick={()=>enviarParaSublimacao(p.numero,linha.produto)}>Enviar p/ sublimação</button></div></div>})}';
if (s.includes(broken)) s = s.replace(broken, fixed);

// Função de tela cheia.
const marker = 'return <div style={styles.page}>';
const fullscreenFn = 'const alternarTelaCheia=()=>{try{if(document.fullscreenElement){document.exitFullscreen?.()}else{document.documentElement.requestFullscreen?.()}}catch(e){console.warn("Fullscreen indisponível",e)}};\n  ';
if (!s.includes('const alternarTelaCheia=')) {
  if (!s.includes(marker)) throw new Error("Marcador de renderização não encontrado.");
  s = s.replace(marker, fullscreenFn + marker);
}

// Regras centralizadas por produto.
// Porta-copos, mousepad padrão e toalhas não usam cor e não passam pela costura.
const rulesAnchor = 'const CORTADORES=["Patrick"];';
const rules = `const CORTADORES=["Patrick"];
const PRODUTOS_SEM_COSTURA=new Set(["PORTA COPOS","MOUSEPAD PADRÃO","TOLHA DE BANHO","TOALHA C/ CAPUZ G","TOALHA C/ CAPUZ M","BOLSA TOALHA","TOALHA ESPORTIVA 80X30","TOALHA PERSONALIZADA 70X40"]);
const produtoNormalizado=p=>String(p||"").trim().toUpperCase();
const regraProduto=p=>{const nome=produtoNormalizado(p);const semCostura=PRODUTOS_SEM_COSTURA.has(nome);return{usaCostura:!semCostura,usaCor:!semCostura}};
`;
if (!s.includes('const PRODUTOS_SEM_COSTURA=')) {
  if (!s.includes(rulesAnchor)) throw new Error("Marcador de regras de produto não encontrado.");
  s = s.replace(rulesAnchor, rules);
}

// Migra automaticamente itens especiais que ficaram presos na costura.
const normalizeOld = 'return[...arr].map(i=>({...i,etapa:i.etapa==="corte"?"aguardando_sublimacao":(i.etapa||"pre_corte")}))';
const normalizeNew = 'return[...arr].map(i=>{const base={...i,etapa:i.etapa==="corte"?"aguardando_sublimacao":(i.etapa||"pre_corte")};if(!regraProduto(base.produto).usaCostura&&["aguardando_costura","costura"].includes(base.etapa))return{...base,etapa:"separacao",feito:true};if(!regraProduto(base.produto).usaCor)delete base.cor;return base})';
if (s.includes(normalizeOld)) s = s.replace(normalizeOld, normalizeNew);

// Formulário da sublimação respeita a regra de cor.
const oldAloc = 'const getAlocForm=(p,prod)=>alocForm[chaveAloc(p,prod)]||{cor:CORES[0].nome,qtd:1,sublimador:SUBLIMADORES[0],data:hoje()};';
const newAloc = 'const getAlocForm=(p,prod)=>alocForm[chaveAloc(p,prod)]||{cor:regraProduto(prod).usaCor?CORES[0].nome:"",qtd:1,sublimador:SUBLIMADORES[0],data:hoje()};';
if (s.includes(oldAloc)) s = s.replace(oldAloc, newAloc);

// Após a sublimação, produtos especiais vão diretamente para Separação.
const oldMove = 'const moverParaAguardandoCostura=id=>salvar(itens.map(i=>i.id===id?{...i,etapa:"aguardando_costura"}:i));';
const newMove = 'const moverParaAguardandoCostura=id=>salvar(itens.map(i=>i.id===id?{...i,etapa:regraProduto(i.produto).usaCostura?"aguardando_costura":"separacao",feito:regraProduto(i.produto).usaCostura?i.feito:true}:i));';
if (s.includes(oldMove)) s = s.replace(oldMove, newMove);

// Não mostra seletor de cor quando o produto não usa cor.
const colorUi = '<div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor),borderColor:corClara(corHex(f.cor))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={e=>setAlocFormCampo(p.numero,linha.produto,"cor",e.target.value)}>{CORES.map(c=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div>';
const colorUiNew = '{regraProduto(linha.produto).usaCor&&<div style={styles.corSelectWrap}><span style={{...styles.swatch,background:corHex(f.cor),borderColor:corClara(corHex(f.cor))?"#0002":"transparent"}}/><select style={{...styles.input,paddingLeft:34}} value={f.cor} onChange={e=>setAlocFormCampo(p.numero,linha.produto,"cor",e.target.value)}>{CORES.map(c=><option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></div>}';
if (s.includes(colorUi)) s = s.replace(colorUi, colorUiNew);

// Texto e ação da Sublimação refletem o fluxo real.
const oldSubAction = '<button style={styles.enviarBtn} onClick={()=>moverParaAguardandoCostura(it.id)}>Enviar p/ costura</button>';
const newSubAction = '<button style={styles.enviarBtn} onClick={()=>moverParaAguardandoCostura(it.id)}>{regraProduto(it.produto).usaCostura?"Enviar p/ costura":"Enviar p/ separação"}</button>';
if (s.includes(oldSubAction)) s = s.replace(oldSubAction, newSubAction);

// Dashboard visual moderno via CSS sem alterar a estrutura dos dados.
if (!s.includes('data-modernizacao-neocooler')) {
  const styleTag = '<style data-modernizacao-neocooler>{\`body{margin:0;background:#eef2f7;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}.card,.pedido-card{transition:transform .18s ease,box-shadow .18s ease}.card:hover,.pedido-card:hover{transform:translateY(-2px);box-shadow:0 12px 30px #0f172a12!important}button{transition:transform .15s ease,filter .15s ease}button:hover{filter:brightness(1.04)}button:active{transform:scale(.98)}input,select{transition:border .15s ease,box-shadow .15s ease}input:focus,select:focus{outline:none;border-color:#2563eb!important;box-shadow:0 0 0 3px #2563eb1a}.pedido-card{border-color:#dbe3ee!important;border-radius:18px!important}.list-wrap{gap:16px!important}@media(max-width:760px){.itemLinha{grid-template-columns:auto auto 1fr!important}.itemLinha select{grid-column:3/4}.list-header{position:sticky;top:0;z-index:10;padding:8px;background:#eef2f7}.formGrid{grid-template-columns:1fr!important}.alocGrid,.corteFormGrid{grid-template-columns:1fr!important}}\`}</style>';
  s = s.replace('return <div style={styles.page}>', 'return <>'+styleTag+'<div style={styles.page}>');
  s = s.replace('</main></div>}', '</main></div></>}');
}

await writeFile(path, s, "utf8");
console.log("Regras de produção e modernização aplicadas antes do build.");