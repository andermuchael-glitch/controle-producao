import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/App.jsx");
let source = fs.readFileSync(file, "utf8");
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// V17: marcar como cortado deve consumir o item do Pré-Corte e avançar diretamente
// para Aguardando Sublimação. Nunca deixa uma cópia do mesmo pedido/produto no Pré-Corte.
const old = /  const marcarCortado = \(pedidoNum, produtoNome, restante\) => \{[\s\S]*?\n  \};\n\n  \/\/ ---- Corte -> Aguardando Sublimação/;
const replacement = `  const marcarCortado = (pedidoNum, produtoNome, restante) => {
    const f = getCorteForm(pedidoNum, produtoNome, restante);
    const qtdSolicitada = Math.max(1, Math.min(Number(f.qtd) || 1, Number(restante) || 1));
    let pendente = qtdSolicitada;
    const lista = [];

    // Consome primeiro as unidades que realmente estão no Pré-Corte.
    for (const item of itens) {
      if (item.pedido !== pedidoNum || item.produto !== produtoNome || item.etapa !== "pre_corte" || pendente <= 0) {
        lista.push(item);
        continue;
      }
      const disponivel = Number(item.qtd) || 0;
      const consumir = Math.min(disponivel, pendente);
      const sobra = disponivel - consumir;
      pendente -= consumir;
      if (sobra > 0) lista.push({ ...item, qtd: sobra });
    }

    if (pendente > 0) {
      setErro("Não foi possível localizar no Pré-Corte a quantidade selecionada. Atualize a tela e tente novamente.");
      return;
    }

    // O estágio Corte não fica mais exposto no fluxo: após cortar, vai para Aguardando Sublimação.
    lista.push({
      id: uid(),
      pedido: pedidoNum,
      produto: produtoNome,
      qtd: qtdSolicitada,
      etapa: "aguardando_sublimacao",
      passaPeloCorte: true,
      cortador: "Patrick",
      dataCorte: f.data || hoje(),
      criadoEm: Date.now(),
    });

    salvar(lista);
    setCorteForm((f2) => ({
      ...f2,
      [chaveAloc(pedidoNum, produtoNome)]: { qtd: Math.max(0, (Number(restante) || qtdSolicitada) - qtdSolicitada), data: f.data },
    }));
  };

  // ---- Corte -> Aguardando Sublimação`;

if (old.test(source)) {
  source = source.replace(old, replacement);
}

if (source !== original) {
  fs.writeFileSync(file, source, "utf8");
  log("V17 aplicado: Pré-Corte consome corretamente o pedido marcado como cortado e envia para Aguardando Sublimação, sem retorno/duplicação no Pré-Corte.");
} else {
  log("V17: nenhuma alteração necessária.");
}
