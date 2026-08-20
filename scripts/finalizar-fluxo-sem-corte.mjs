import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/App.jsx');
let source = fs.readFileSync(file, 'utf8');
const original = source;
const log = (msg) => console.log(`NeoCooler: ${msg}`);

// Registros antigos: tudo que ainda estiver em Corte passa a ser considerado
// Aguardando Sublimação quando o aplicativo carregar.
const oldLoad = /etapa:\s*i\.etapa\s*\|\|\s*["']costura["'],/;
if (oldLoad.test(source)) {
  source = source.replace(oldLoad, 'etapa: i.etapa === "corte" ? "aguardando_sublimacao" : (i.etapa || "costura"),');
  log('migração dos itens antigos de Corte aplicada.');
}

// Novo comportamento: Patrick confirma o que realmente cortou e o item já
// entra diretamente em Aguardando Sublimação.
const corteNovo = /etapa:\s*["']corte["'],(\s*\n\s*cortador:\s*["']Patrick["'],)/;
if (corteNovo.test(source)) {
  source = source.replace(corteNovo, 'etapa: "aguardando_sublimacao",$1');
  log('confirmação de corte agora envia diretamente para Aguardando Sublimação.');
}

// Eliminar o cartão/botão Corte do cabeçalho.
source = source.replace(/\s*<Stat label=["']corte["'] value=\{totalCorte\} \/>/g, '');

// Eliminar Corte da lista de abas, se ainda existir.
source = source.replace(/\s*\{\s*id:\s*["']corte["'],\s*label:\s*["']Corte["'],\s*contagem:\s*\{totalCorte\}\s*\},/g, '');

// Corte deixa de fazer parte do conjunto de etapas novas.
source = source.replace('["pre_corte", "corte", "aguardando_sublimacao"', '["pre_corte", "aguardando_sublimacao"');
source = source.replace(/\s*corte:\s*["']Corte["'],/g, '');

// Textos do novo fluxo.
source = source.replaceAll('Corte → Costura', 'Pré-Corte → Sublimação → Costura');
source = source.replaceAll('Do corte até a expedição, pedido por pedido', 'Do pré-corte até a expedição, pedido por pedido');
source = source.replaceAll('item passa para a aba Corte', 'item passa diretamente para Aguardando Sublimação');
source = source.replaceAll('Mova itens pela aba Corte.', 'Os itens entram aqui automaticamente quando Patrick confirma o corte.');

if (source !== original) {
  fs.writeFileSync(file, source, 'utf8');
  log('fluxo sem Corte finalizado.');
} else {
  log('fluxo sem Corte já estava aplicado.');
}
