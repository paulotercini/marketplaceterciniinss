// A NOTIFICAÇÃO DO WHATSAPP NO CELULAR · Edge Function `zap_push` (F335)
//
// A mensagem nova do cliente chega aqui pelo pg_net do banco (zap_push_gatilho) e vira
// notificação (Web Push) nos aparelhos inscritos: o do atendente da conversa ou, sem
// atendente, todos, a mesma regra do aviso sonoro. A conversa de robô de outra empresa
// (automatica) não avisa. A chave do VAPID nasce aqui no primeiro uso e fica em push_chave,
// que só a service_role lê. verify_jwt = false porque quem chama é o banco: push_em marca a
// mensagem, e cada mensagem avisa uma vez só.
//
// Pedidos (POST):
//   { mensagem_id }   avisa a mensagem nova               → { enviados }
//   { preparar: true } devolve a chave pública            → { publica }
//   { teste: true }    com o token de quem pede, avisa os aparelhos dele → { enviados }
// importado só no uso: o teste do node lê as funções puras sem o pacote
const wp = async () => (await import("npm:web-push@3.6.7")).default;

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const SERVICO = env("SUPABASE_SERVICE_ROLE_KEY");
const ANON = env("SUPABASE_ANON_KEY");
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });

// shortcut: cópia do mascarar do zap_plantao (cada função registra o próprio Deno.serve); se crescer, vira _shared/
export const mascarar = (s: unknown) => String(s ?? "").replace(/\d[\d.\-/ ]{6,}\d/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[número]" : m));
const TIPO: Record<string, string> = { audio: "🎤 Áudio", imagem: "📷 Foto", video: "🎥 Vídeo", documento: "📄 Documento", figurinha: "Figurinha", localizacao: "📍 Localização", contato: "👤 Contato" };

type Msg = { id: string; conversa_id: string; tipo: string; texto: string | null };
type Conv = { id: string; atendente_id: string | null; automatica: boolean | null; nome_perfil: string | null; telefone: string | null };
type Insc = { id: string; colaborador_id: string; endpoint: string; p256dh: string; auth: string };

// o que aparece na tela do celular: quem escreveu e o começo da mensagem, sem número longo (CPF, NB, processo)
export function aviso(m: Msg, c: Conv, nomeCliente: string | null) {
  const quem = (nomeCliente || c.nome_perfil || c.telefone || "Cliente").trim();
  const txt = mascarar(m.texto || "").replace(/\s+/g, " ").trim();
  const corpo = txt ? (txt.length > 120 ? txt.slice(0, 117) + "…" : txt) : (TIPO[m.tipo] || "Mensagem nova");
  return { title: quem, body: corpo, tag: "crm-zap-" + c.id, data: { crm: "zap", conversa: c.id } };
}
// o atendente da conversa, e sem atendente todos (como o aviso sonoro do CRM, F191)
export function destinatarios(c: Conv, inscs: Insc[]) {
  return c.atendente_id ? inscs.filter((i) => i.colaborador_id === c.atendente_id) : inscs;
}

const sb = (caminho: string, init: RequestInit = {}) =>
  fetch(URL_SB + caminho, { ...init, headers: { apikey: SERVICO, Authorization: "Bearer " + SERVICO, "Content-Type": "application/json", ...(init.headers || {}) } });

async function chaves() {
  const r = await sb("/rest/v1/push_chave?select=publica,privada&id=eq.1");
  const [k] = r.ok ? await r.json() : [];
  if (k) return k as { publica: string; privada: string };
  const g = (await wp()).generateVAPIDKeys();
  const nova = { id: 1, publica: g.publicKey, privada: g.privateKey };
  const w = await sb("/rest/v1/push_chave?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(nova) });
  if (!w.ok) throw new Error("push_chave " + w.status);
  await sb("/rest/v1/config_app?on_conflict=chave", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ chave: "zap_push_publica", valor: g.publicKey }) });
  return chaves();   // relê: outro pedido pode ter gravado antes
}

async function enviar(inscs: Insc[], carga: unknown) {
  if (!inscs.length) return 0;
  const k = await chaves(), webpush = await wp();
  webpush.setVapidDetails("mailto:paulotercini@hotmail.com", k.publica, k.privada);
  let n = 0;
  await Promise.all(inscs.map(async (i) => {
    try {
      await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, JSON.stringify(carga), { TTL: 3600, urgency: "high" });
      n++;
      await sb(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ok_em: new Date().toISOString() }) });
    } catch (e) {
      // 404/410: o aparelho desinstalou ou desligou; a inscrição sai
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await sb(`/rest/v1/push_inscricoes?id=eq.${i.id}`, { method: "DELETE" });
    }
  }));
  return n;
}

async function quemPede(req: Request) {
  const tok = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return null;
  const u = await fetch(URL_SB + "/auth/v1/user", { headers: { apikey: ANON || SERVICO, Authorization: "Bearer " + tok } });
  if (!u.ok) return null;
  const { id } = await u.json();
  const r = await sb(`/rest/v1/colaboradores?select=id&ativo=eq.true&auth_id=eq.${id}`);
  const [c] = r.ok ? await r.json() : [];
  return c ? c.id as string : null;
}

if (typeof Deno !== "undefined") Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  let p: { mensagem_id?: string; preparar?: boolean; teste?: boolean };
  try { p = await req.json(); } catch { return json({ erro: "pedido inválido" }, 400); }
  try {
    if (p.preparar) return json({ publica: (await chaves()).publica });
    if (p.teste) {
      const eu = await quemPede(req);
      if (!eu) return json({ erro: "sem permissão" }, 401);
      const r = await sb(`/rest/v1/push_inscricoes?select=*&colaborador_id=eq.${eu}`);
      const n = await enviar(r.ok ? await r.json() : [], { title: "WhatsApp · CRM", body: "Teste: o aviso chega neste aparelho.", tag: "crm-zap-teste", data: { crm: "zap" } });
      return json({ enviados: n });
    }
    if (!/^[0-9a-f-]{36}$/i.test(p.mensagem_id || "")) return json({ erro: "mensagem_id" }, 400);
    // pega a mensagem uma vez só (push_em), e só a do cliente dos últimos 10 minutos
    const desde = new Date(Date.now() - 10 * 60000).toISOString();
    const r = await sb(`/rest/v1/zap_mensagens?id=eq.${p.mensagem_id}&push_em=is.null&direcao=eq.entrada&momento=gte.${desde}&select=id,conversa_id,tipo,texto`,
      { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ push_em: new Date().toISOString() }) });
    const [m] = r.ok ? await r.json() as Msg[] : [];
    if (!m) return json({ enviados: 0 });
    const rc = await sb(`/rest/v1/zap_conversas?id=eq.${m.conversa_id}&select=id,atendente_id,automatica,nome_perfil,telefone,cliente_id`);
    const [c] = rc.ok ? await rc.json() : [];
    if (!c || c.automatica) return json({ enviados: 0 });
    let nome: string | null = null;
    if (c.cliente_id) {
      const rn = await sb(`/rest/v1/clientes?id=eq.${c.cliente_id}&select=nome`);
      nome = rn.ok ? ((await rn.json())[0] || {}).nome || null : null;
    }
    const ri = await sb("/rest/v1/push_inscricoes?select=*");
    const n = await enviar(destinatarios(c, ri.ok ? await ri.json() : []), aviso(m, c, nome));
    return json({ enviados: n });
  } catch (e) {
    return json({ erro: String((e as Error).message || e) }, 500);
  }
});
