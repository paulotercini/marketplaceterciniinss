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

// Os botões do aviso de lembrete (o "concluir" e o "adiar" do To Do). Quem
// grava é a página aberta, que tem a sessão: aqui só se repassa o clique.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const d = e.notification.data || {};
  e.waitUntil((async () => {
    const cls = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // F335 · o aviso do WhatsApp abre a conversa: na janela aberta, ou numa nova com ?zap=
    if (d.crm === "zap") {
      if (cls[0]) { cls[0].postMessage(d); return cls[0].focus(); }
      return self.clients.openWindow(d.conversa ? "./?zap=" + d.conversa : "./");
    }
    if (cls[0]) {
      cls[0].postMessage({ crm: "lembrete", acao: e.action || "abrir", ...d });
      if (!e.action) return cls[0].focus();
    } else if (!e.action) return self.clients.openWindow("./");
  })());
});

// F335 · a notificação do WhatsApp que o banco manda (Edge Function zap_push), também com o CRM fechado
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || "WhatsApp · CRM", {
    body: d.body || "", tag: d.tag || "crm-zap", renotify: true,
    icon: "icone-192.png", badge: "icone-192.png", data: d.data || { crm: "zap" } }));
});
