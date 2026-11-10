// TRANSCRIÇÃO DO ATENDIMENTO · Edge Function `atendimento_transcricao` (F498, escolha do Paulo de 10.11.2026)
//
// O botão Gravar das Anotações do atendimento manda o áudio da conversa presencial; a função o envia ao
// ElevenLabs (Scribe, com separação de falantes) e devolve o texto por falante, com o minuto de cada fala.
// Não grava nada: o texto vai ao campo da anotação para a pessoa conferir e só fica no Anotar. O áudio não é
// guardado no CRM. Somente colaborador ativo (verify_jwt = true). Segredo: ELEVENLABS_API_KEY.
//
// Pedido: POST com o áudio no corpo (Content-Type audio/webm, audio/mp4…)
// Resposta: { texto, falantes, minutos } · { erro }

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const ANON = env("SUPABASE_ANON_KEY");
const CHAVE = env("ELEVENLABS_API_KEY");
const MODELO = env("TRANSCRICAO_MODELO") || "scribe_v2";
const MAX_BYTES = 150 * 1024 * 1024;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });

const mmss = (s: number) => { const t = Math.max(0, Math.floor(s || 0)); return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

type Palavra = { text: string; type?: string; start?: number; end?: number; speaker_id?: string };
// as palavras do Scribe viram falas: uma linha por troca de falante, "[mm:ss] Falante N: …", na ordem em que falam
export function falas(words: Palavra[], textoSolto = "") {
  const ids: string[] = [], linhas: { quem: string; ini: number; txt: string }[] = [];
  for (const w of words || []) {
    if (w.type === "audio_event") continue;
    const id = w.speaker_id || "speaker_0";
    if (!ids.includes(id)) ids.push(id);
    const quem = `Falante ${ids.indexOf(id) + 1}`, u = linhas[linhas.length - 1];
    if (u && u.quem === quem) u.txt += w.text;
    else if (w.type === "spacing") continue; // espaço na troca de falante não abre fala
    else linhas.push({ quem, ini: w.start || 0, txt: w.text });
  }
  const fim = (words || []).reduce((m, w) => Math.max(m, w.end || 0), 0);
  const texto = linhas.length ? linhas.map((l) => `[${mmss(l.ini)}] ${l.quem}: ${l.txt.replace(/\s+/g, " ").trim()}`).filter((l) => !/:\s*$/.test(l)).join("\n")
    : String(textoSolto || "").trim();
  return { texto, falantes: ids.length, minutos: Math.round(fim / 60) };
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!CHAVE) return json({ erro: "falta o segredo ELEVENLABS_API_KEY na função" }, 500);
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const auth = { apikey: ANON, Authorization: `Bearer ${token}` };
    const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: auth });
    if (!u.ok) return json({ erro: "sessão vencida, entre de novo no CRM" }, 401);
    const user = await u.json();
    const eu = await (await fetch(`${URL_SB}/rest/v1/colaboradores?select=id,ativo&auth_id=eq.${user.id}`, { headers: auth })).json().catch(() => []);
    if (!eu[0] || eu[0].ativo === false) return json({ erro: "só colaborador ativo do escritório" }, 403);
    const tipo = (req.headers.get("content-type") || "audio/webm").split(";")[0];
    if (!/^(audio|video)\//.test(tipo)) return json({ erro: "envie o áudio da gravação" }, 400);
    const audio = await req.arrayBuffer();
    if (audio.byteLength < 2000) return json({ erro: "gravação curta demais" }, 400);
    if (audio.byteLength > MAX_BYTES) return json({ erro: "gravação grande demais (máx. 150 MB)" }, 413);
    const fd = new FormData();
    fd.append("model_id", MODELO);
    fd.append("language_code", "por");
    fd.append("diarize", "true");
    fd.append("tag_audio_events", "false");
    fd.append("file", new Blob([audio], { type: tipo }), "atendimento." + (tipo.split("/")[1] || "webm"));
    try {
      const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": CHAVE }, body: fd });
      if (!r.ok) return json({ erro: `ElevenLabs: ${r.status} ${(await r.text()).slice(0, 300)}` }, 502);
      const d = await r.json();
      const out = falas(d.words || [], d.text);
      if (!out.texto) return json({ erro: "nenhuma fala reconhecida na gravação" }, 422);
      return json(out);
    } catch (e) {
      return json({ erro: String(e).slice(0, 300) }, 500);
    }
  });
}
