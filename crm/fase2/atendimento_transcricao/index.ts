// TRANSCRIÇÃO DO ATENDIMENTO · Edge Function `atendimento_transcricao` (F498, escolha do Paulo de 10.11.2026)
//
// O botão Gravar das Anotações do atendimento manda o áudio da conversa presencial; a função o envia ao
// ElevenLabs (Scribe, com separação de falantes) e devolve o texto por falante, com o minuto de cada fala.
// F528 (aprovação do Paulo de 11.11.2026): depois da transcrição, o Claude escreve o resumo no padrão das
// anotações do Dr. Paulo (`PADRAO`, tirado de 230 anotações manuais), que vai acima da transcrição completa.
// Sem a chave da Anthropic ou com falha do modelo, volta só a transcrição.
// Não grava nada: o texto vai ao campo da anotação para a pessoa conferir e só fica no Anotar. O áudio não é
// guardado no CRM. Somente colaborador ativo (verify_jwt = true). Segredos: ELEVENLABS_API_KEY, ANTHROPIC_API_KEY.
//
// Pedido: POST com o áudio no corpo (Content-Type audio/webm, audio/mp4…)
// Resposta: { texto, resumo?, falantes, minutos } · { erro }

const env = (k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined) || "";
const URL_SB = env("SUPABASE_URL").replace(/\/$/, "");
const ANON = env("SUPABASE_ANON_KEY");
const CHAVE = env("ELEVENLABS_API_KEY");
const MODELO = env("TRANSCRICAO_MODELO") || "scribe_v2";
const CHAVE_IA = env("ANTHROPIC_API_KEY");
const MODELO_IA = env("RESUMO_MODELO") || "claude-sonnet-5-5";
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

// o padrão das anotações do Dr. Paulo (arquivo aprovado em 11.11.2026, sem os exemplos com nomes)
export const PADRAO = `Escreva a anotação do atendimento no padrão do Dr. Paulo Tercini, advogado previdenciário.
FORMA: texto corrido em linhas curtas, um fato por linha, sem título, sem negrito, sem seções, sem linha em branco. Lista com hífen apenas para documentos, plano de pagamento e providências numerosas ("- Carteira de Trabalho (CTPS);"). Sem citação de artigo, súmula ou tema: a conclusão vem pela consequência prática. De 3 a 12 linhas.
ORDEM (só as linhas que existirem no atendimento):
1. Quem esteve, apenas quando não foi o próprio cliente ou houve acompanhante: "Esteve em atendimento junto com a filha."
2. Retrato numérico: "Tem 57 anos de idade e 14 anos de contribuição.", "Última contribuição em 07/2025.", situação atual de trabalho.
3. O que o cliente contou, em terceira pessoa: "Informou que…", "Relatou que…", "Disse ter…".
4. Conclusão com o motivo, em uma linha: "Aposenta por idade em 20/06/2029.", "O caminho é o aux. doença.", "Não cabe LOAS, pois…".
5. Orientação, em primeira pessoa: "Indiquei pagar…", "Expliquei sobre…", "Informei que…".
6. Documentos que dependem do cliente: "Solicitei:" e a lista; com um ou dois itens, na própria linha.
7. O que foi feito no atendimento: "Digitalizei…", "Devolvi a CTPS.", "Entreguei o modelo de relatório médico."
8. O que o cliente ficou de fazer: "Irá trazer…", "Irá pensar.", "Ficou de agendar…".
9. Ordem à equipe pelo primeiro nome, no imperativo, somente se foi dita: "Amanda, faz as procurações e imprime."
10. Última linha, o retorno: "Verificar se trouxe os documentos em 19/12.", "Aguardar até 08/05.", "Somente aguardar." ou "Tarefa encerrada."; sem data dita no atendimento, "Definir retorno."
VERBOS: primeira pessoa do singular para o que o advogado fez ou concluiu (Verifiquei, Indiquei, Expliquei, Solicitei, Preciso verificar); plural para decisão com o cliente (Decidimos, Optamos, Iremos buscar); terceira pessoa para o cliente. A incerteza vira providência ("Preciso verificar se…"), nunca "talvez" ou "parece".
TERMOS DA CASA: LOAS, CADUnico, MEUINSS, aux. doença, aux. acidente, aposentadoria por idade, facultativo, facultativo baixa renda, contribuinte individual, MEI, PPP, LTCAT, CTPS, CNIS, HISCRE, relatório médico, prontuário médico, aposentadorias futuras.
DATAS E NÚMEROS: data próxima dd/mm; data com efeito jurídico ou distante dd/mm/aaaa; hora "às 10h45min"; competência "competências 01 a 06/2025"; valor "R$ 2.500,00"; tempo "30 anos e 2 meses de contribuição".
NUNCA: inventar data, prazo, valor ou ordem à equipe que não foi dita; escrever CPF, senha ou telefone; usar título, negrito, emoji, travessão ou fecho; repetir a mesma informação; atribuir ao advogado conclusão que ele não falou (o que ficou em aberto vira "Preciso verificar…"). Corrija a ortografia e mantenha o vocabulário da casa.
Na transcrição, "Falante N" é a ordem em que cada pessoa falou; deduza pelo conteúdo quem é o advogado e quem é o cliente.
Responda apenas com o texto da anotação.`;

export function promptResumo(texto: string, dia: string) {
  return `Atendimento de ${dia}. Transcrição:\n${texto}`;
}

// o que volta do modelo passa por aqui: sem título, negrito, travessão nem linha em branco
export function limparResumo(t: string) {
  return String(t || "").split("\n")
    .map((l) => l.replace(/\*\*|__/g, "").replace(/^#+\s*/, "").replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-").trimEnd())
    .filter((l) => l.trim() && !/^(resumo|anota[çc][ãa]o)( do atendimento)?:?$/i.test(l.trim()))
    .join("\n").trim();
}

async function resumir(texto: string, dia: string) {
  if (!CHAVE_IA) return "";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CHAVE_IA, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO_IA, max_tokens: 1500, fallbacks: "default", system: PADRAO,
        messages: [{ role: "user", content: [{ type: "text", text: promptResumo(texto, dia) }] }],
      }),
    });
    if (!r.ok) { console.log("resumo: Claude", r.status); return ""; }
    const d = await r.json();
    if (d.stop_reason === "refusal") return "";
    return limparResumo((d.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(""));
  } catch (e) {
    console.log("resumo:", String(e).slice(0, 200));
    return "";
  }
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
      const dia = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const resumo = await resumir(out.texto, dia);
      return json(resumo ? { ...out, resumo } : out);
    } catch (e) {
      return json({ erro: String(e).slice(0, 300) }, 500);
    }
  });
}
