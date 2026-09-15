const CACHE_NAME = "neocooler-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Não intercepta requisições: o aplicativo continua usando a rede normalmente,
// evitando servir dados antigos. O service worker existe para habilitar o modo PWA.
