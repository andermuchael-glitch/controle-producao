import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

if (!source.includes("normalizarDuplicacoesFluxoV13")) {
  const anchor = 'const uid = () => Math.random().toString(36).slice(2, 10);';
  const helper = `

// normalizarDuplicacoesFluxoV13
const normalizarDuplicacoesFluxoV13 = (lista) => {
  if (!Array.isArray(lista)) return [];
  const src = lista.map((raw) => ({ ...raw, qtd: Number(raw.qtd) || 0 })).filter((i) => i.qtd > 0);
  const chave = (i) => String(i.pedido || "") + "||" + String(i.produto || "").trim().toUpperCase();
  const porChave = {};
  for (const i of src) (porChave[chave(i)] ||= []).push(i);
  const saida = [];
  for (const grupo of Object.values(porChave)) {
    const porEtapa = {};
    for (const i of grupo) (porEtapa[i.etapa] ||= []).push(i);

    for (const etapa of ["pre_corte", "aguardando_sublimacao"]) {
      const arr = porEtapa[etapa] || [];
      if (arr.length) {
        const base = arr.slice().sort((a, b) => b.qtd - a.qtd)[0];
        porEtapa[etapa] = [{ ...base, qtd: Math.max(...arr.map((x) => x.qtd)) }];
      }
    }

    const avancadoAposPre = grupo
      .filter((i) => i.etapa !== "pre_corte")
      .reduce((s, i) => s + i.qtd, 0);
    if (porEtapa.pre_corte?.length) {
      const base = porEtapa.pre_corte[0];
      const restante = Math.max(0, base.qtd - avancadoAposPre);
      porEtapa.pre_corte = restante > 0 ? [{ ...base, qtd: restante }] : [];
    }

    const avancadoAposAguardando = grupo
      .filter((i) => ["sublimacao", "aguardando_costura", "costura", "separacao"].includes(i.etapa))
      .reduce((s, i) => s + i.qtd, 0);
    if (porEtapa.aguardando_sublimacao?.length) {
      const base = porEtapa.aguardando_sublimacao[0];
      const restante = Math.max(0, base.qtd - avancadoAposAguardando);
      porEtapa.aguardando_sublimacao = restante > 0 ? [{ ...base, qtd: restante }] : [];
    }

    for (const arr of Object.values(porEtapa)) for (const i of arr) saida.push(i);
  }
  return saida;
};
`;
  if (source.includes(anchor)) source = source.replace(anchor, anchor + helper);

  // O efeito fica depois da declaração de `loaded`, evitando TDZ no render.
  const loadedAnchor = '  const [loaded, setLoaded] = useState(false);';
  const effect = `

  useEffect(() => {
    if (!loaded || !Array.isArray(itens) || !itens.length) return;
    const limpos = normalizarDuplicacoesFluxoV13(itens);
    if (JSON.stringify(limpos) === JSON.stringify(itens)) return;
    setItens(limpos);
    salvarValor(STORAGE_KEY, JSON.stringify(limpos)).catch(() => {});
  }, [loaded]);
`;
  if (source.includes(loadedAnchor)) source = source.replace(loadedAnchor, loadedAnchor + effect);
}

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V13 aplicado: duplicações entre etapas corrigidas e dados persistidos no Firebase/localStorage.");
} else {
  log("V13: nenhuma alteração necessária.");
}
