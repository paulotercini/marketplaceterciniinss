// F150 · O PROGRAMA GUARDADO NO NAVEGADOR (service worker do CRM).
// Guarda SÓ o programa (a própria página, mesma origem). Os dados do banco
// vêm do Supabase, que é outra origem, e este arquivo nem os enxerga.
// Estratégia: abre com a cópia guardada, na hora, e busca a versão do site
// em segundo plano; se mudou, guarda a nova e avisa a página, que oferece
// recarregar. Sem cópia guardada (primeira vez), vai à rede normalmente.
const CAIXA = "crm-programa-v1";
self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const caixa = await caches.open(CAIXA);
    const chave = new Request(url.origin + url.pathname);
    const guardada = await caixa.match(chave);
    // o texto da cópia guardada é lido ANTES de ela ir para a página: depois
    // de entregue, o corpo já foi consumido e não dá mais para comparar
    const velhaP = guardada ? guardada.clone().text() : Promise.resolve(null);
    const daRede = fetch(req, { cache: "no-cache" }).then(async r => {
      if (r && r.ok) {
        const nova = await r.clone().text();
        const velha = await velhaP;
        await caixa.put(chave, r.clone());
        if (velha !== null && velha !== nova) {
          const cls = await self.clients.matchAll({ type: "window" });
          cls.forEach(c => c.postMessage("crm-nova-versao"));
        }
      }
      return r;
    });
    if (guardada) { e.waitUntil(daRede.catch(() => {})); return guardada; }
    return daRede;
  })());
});
