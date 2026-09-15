const CACHE_NAME = "neocooler-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Mantém a rede como fonte principal para evitar dados antigos.
// O handler também atende ao requisito de PWA em navegadores Android mais antigos.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
