import fs from "node:fs";

const path = "src/App.jsx";
let source = fs.readFileSync(path, "utf8");

// Agrupa automaticamente registros do mesmo pedido/produto/cor/equipe na etapa Aguardando Costura.
// Isso evita que cada lançamento de 1 unidade gere uma linha separada.
const anchor = '  const distribuirCorParaAguardandoCostura = (id) => {';
if (!source.includes('const agruparRegistrosMesmaCor =')) {
  const helper = `  const agruparRegistrosMesmaCor = (lista) => {\n    const grupos = new Map();\n    const resultado = [];\n    for (const item of lista) {\n      if (item.etapa !== "aguardando_costura" || !item.cor) {\n        resultado.push(item);\n        continue;\n      }\n      const chave = [item.pedido, item.produto, item.cor, item.equipe || "Não decidido"].join("||");\n      const existente = grupos.get(chave);\n      if (existente) {\n        existente.qtd += Number(item.qtd) || 0;\n      } else {\n        const copia = { ...item };\n        grupos.set(chave, copia);\n        resultado.push(copia);\n      }\n    }\n    return resultado;\n  };\n\n`;
  if (source.includes(anchor)) source = source.replace(anchor, helper + anchor);
}

const inicio = source.indexOf('  const distribuirCorParaAguardandoCostura = (id) => {');
if (inicio !== -1) {
  const fim = source.indexOf('\n  };', inicio);
  if (fim !== -1) {
    const bloco = source.slice(inicio, fim + 5);
    const antigo = 'salvar(restantes > 0 ? [...base, { ...origem, qtd: restantes }, novaCor] : [...base, novaCor]);';
    if (bloco.includes(antigo)) {
      const novo = bloco.replace(antigo, 'salvar(agruparRegistrosMesmaCor(restantes > 0 ? [...base, { ...origem, qtd: restantes }, novaCor] : [...base, novaCor]));');
      source = source.slice(0, inicio) + novo + source.slice(fim + 5);
    }
  }
}

fs.writeFileSync(path, source, "utf8");
console.log("NeoCooler: registros da mesma cor agrupados automaticamente em Aguardando Costura.");
