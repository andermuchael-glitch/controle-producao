# Controle de Produção — Corte → Costura

App de controle de produção (pré-corte → corte → aguardando sublimação →
sublimação → aguardando costura → costura → separação) feito em React +
Vite, com dados sincronizados em tempo real via Firebase Firestore.

## Como este projeto foi publicado

Os arquivos foram criados direto pelo site do GitHub (Add file → Create
new file). O site foi publicado através do Netlify, conectado a este
repositório — qualquer novo commit aqui atualiza o site automaticamente.

## Configuração do Firebase

As chaves do Firebase (VITE_FIREBASE_*) são configuradas como variáveis
de ambiente direto no painel do Netlify (Site settings → Environment
variables), não em um arquivo `.env` dentro do repositório.

As regras de segurança do Firestore liberam leitura/escrita geral na
coleção `controleProducao` — funciona bem para uso interno da equipe, mas
não compartilhe o link do site publicamente.

## Observação sobre os dados

Com o Firebase configurado, os dados ficam num banco compartilhado e
sincronizam em tempo real entre todos os dispositivos e pessoas que
usarem o app.
