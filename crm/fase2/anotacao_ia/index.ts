// ⚡ COM IA · Edge Function `anotacao_ia` (F436, ideia do Tiimo aprovada pelo Paulo em 07.11.2026)
//
// O ⚡ Anotação rápida manda o texto livre, digitado ou ditado, e a função devolve a PROPOSTA:
// cliente, caso, anotação limpa, lembrete com data e se é juntada. Não grava nada: a tela mostra a
// proposta e só grava no Gravar de quem confere. A data que o texto não deixa clara volta marcada
// (data_duvidosa) para a pessoa conferir. Somente colaborador ativo (verify_jwt = true). Sequência de 8
// ou mais dígitos (CPF, NB, processo, telefone) sai mascarada antes de ir ao modelo; o caso vai só com
// o rótulo (benefício e fase).
//
// Pedido: POST { texto, hoje: "AAAA-MM-DD", cliente?: "nome escolhido", casos?: [{id, rot}] }
// Resposta: { cliente, caso_id, anotacao, juntada, lembrete_data, lembrete_texto, data_duvidosa, motivo_duvida } · { erro }

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const ANON = env("SUPABASE_ANON_KEY");
const CHAVE_IA = env("ANTHROPIC_API_KEY");
const MODELO = env("ANOTACAO_IA_MODELO") || "claude-sonnet-5-5";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...cors } });

export const mascarar = (s: unknown) => String(s ?? "").replace(/\d[\d.\-/ ]{6,}\d/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[número]" : m));

export const ESQUEMA = {
  type: "object", additionalProperties: false,
  required: ["cliente", "caso_id", "anotacao", "juntada", "lembrete_data", "lembrete_texto", "data_duvidosa", "motivo_duvida"],
  properties: {
    cliente: { type: "string", description: "o nome do cliente como o texto o diz, ou vazio" },
    caso_id: { type: "string", description: "o id de um dos casos dados, ou vazio" },
    anotacao: { type: "string", description: "a anotação em português formal, em ordem direta, sem o nome do cliente no começo" },
    juntada: { type: "boolean", description: "verdadeiro quando o texto relata documento entregue ou juntado" },
    lembrete_data: { type: "string", description: "AAAA-MM-DD do retorno ou da providência pedida no texto, ou vazio" },
    lembrete_texto: { type: "string", description: "o que lembrar nessa data, curto, ou vazio" },
    data_duvidosa: { type: "boolean", description: "verdadeiro quando a data não está clara no texto (dia da semana sem data, mês sem dia, 'semana que vem')" },
    motivo_duvida: { type: "string", description: "uma frase sobre a dúvida da data, ou vazio" },
  },
};

export function prompt(texto: string, hoje: string, cliente: string, casos: { id: string; rot: string }[]) {
  const dia = new Date(hoje + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  return `Você organiza a anotação rápida de um escritório de advocacia previdenciária. Hoje é ${dia}, ${hoje}.
${cliente ? `O cliente já escolhido é ${cliente}.` : "Nenhum cliente foi escolhido: tire o nome do texto, se houver."}
${casos.length ? `Casos abertos do cliente:\n${casos.map((k) => `- ${k.id}: ${k.rot}`).join("\n")}` : "Não há caso escolhido."}

Regras:
- A anotação reproduz o fato, sem acrescentar nada que o texto não diga, em português formal, em ordem direta e sem travessão.
- Quando o texto relata documento entregue, trazido ou juntado, juntada é verdadeiro e a anotação começa por "Juntada: ".
- O lembrete só existe quando o texto pede retorno, prazo ou providência numa data. Converta "amanhã", "sexta", "dia 15" para AAAA-MM-DD a partir de hoje; dia passado no mês vai ao mês seguinte.
- Marque data_duvidosa quando a data depender de suposição. Na dúvida, marque.
- caso_id só quando o texto apontar o benefício ou o assunto de um dos casos dados; senão, vazio.

Texto:
${texto}`;
}

async function claude(p: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": CHAVE_IA, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODELO, max_tokens: 1500, fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      messages: [{ role: "user", content: [{ type: "text", text: p }] }],
    }),
  });
  if (!r.ok) throw new Error(`Claude: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  if (d.stop_reason === "refusal") throw new Error("o modelo recusou este pedido");
  return JSON.parse((d.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(""));
}

// o que volta do modelo é conferido aqui: caso que não foi dado sai, data fora do formato sai e vira dúvida
export function conferir(r: Record<string, any>, casos: { id: string }[], hoje: string) {
  const out = { ...r };
  if (!casos.some((k) => k.id === out.caso_id)) out.caso_id = "";
  if (out.lembrete_data && (!/^\d{4}-\d{2}-\d{2}$/.test(out.lembrete_data) || isNaN(Date.parse(out.lembrete_data)))) {
    out.lembrete_data = ""; out.data_duvidosa = true; out.motivo_duvida = out.motivo_duvida || "a data proposta não é válida";
  } else if (out.lembrete_data && out.lembrete_data < hoje) {
    out.data_duvidosa = true; out.motivo_duvida = out.motivo_duvida || "a data proposta já passou";
  }
  return out;
}

if (typeof Deno !== "undefined") {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!CHAVE_IA) return json({ erro: "falta o segredo ANTHROPIC_API_KEY na função" }, 500);
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const auth = { apikey: ANON, Authorization: `Bearer ${token}` };
    const u = await fetch(`${URL_SB}/auth/v1/user`, { headers: auth });
    if (!u.ok) return json({ erro: "sessão vencida — entre de novo no CRM" }, 401);
    const user = await u.json();
    const eu = await (await fetch(`${URL_SB}/rest/v1/colaboradores?select=id,ativo&auth_id=eq.${user.id}`, { headers: auth })).json().catch(() => []);
    if (!eu[0] || eu[0].ativo === false) return json({ erro: "só colaborador ativo do escritório" }, 403);
    const m = await req.json().catch(() => ({}));
    const texto = mascarar(m.texto).trim().slice(0, 4000);
    const hoje = /^\d{4}-\d{2}-\d{2}$/.test(m.hoje || "") ? m.hoje : new Date().toISOString().slice(0, 10);
    if (!texto) return json({ erro: "escreva a anotação" }, 400);
    const casos = (Array.isArray(m.casos) ? m.casos : []).slice(0, 20)
      .filter((k: any) => /^[0-9a-z_-]{1,64}$/i.test(String(k?.id || "")))
      .map((k: any) => ({ id: String(k.id), rot: mascarar(k.rot).slice(0, 120) }));
    try {
      return json(conferir(await claude(prompt(texto, hoje, String(m.cliente || "").slice(0, 120), casos)), casos, hoje));
    } catch (e) {
      return json({ erro: String(e).slice(0, 300) }, 500);
    }
  });
}
