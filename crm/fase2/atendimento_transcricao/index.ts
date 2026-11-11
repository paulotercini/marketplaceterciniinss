// TRANSCRIÇÃO DO ATENDIMENTO · Edge Function `atendimento_transcricao` (F498, escolha do Paulo de 10.11.2026)
//
// O botão Gravar das Anotações do atendimento manda o áudio da conversa presencial; a função o envia ao
// ElevenLabs (Scribe, com separação de falantes) e devolve o texto por falante, com o minuto de cada fala.
// F529 (aprovação do Paulo de 11.11.2026): depois da transcrição, o Claude escreve o resumo no padrão das
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
// desde: segundos já gravados antes deste trecho (F537), para o tempo das falas seguir a gravação inteira
export function falas(words: Palavra[], textoSolto = "", desde = 0) {
  const ids: string[] = [], linhas: { quem: string; ini: number; txt: string }[] = [];
  for (const w of words || []) {
    if (w.type === "audio_event") continue;
    const id = w.speaker_id || "speaker_0";
    if (!ids.includes(id)) ids.push(id);
    const quem = `Falante ${ids.indexOf(id) + 1}`, u = linhas[linhas.length - 1];
    if (u && u.quem === quem) u.txt += w.text;
    else if (w.type === "spacing") continue; // espaço na troca de falante não abre fala
    else linhas.push({ quem, ini: (w.start || 0) + desde, txt: w.text });
  }
  const fim = (words || []).reduce((m, w) => Math.max(m, w.end || 0), 0);
  const texto = linhas.length ? linhas.map((l) => `[${mmss(l.ini)}] ${l.quem}: ${l.txt.replace(/\s+/g, " ").trim()}`).filter((l) => !/:\s*$/.test(l)).join("\n")
    : String(textoSolto || "").trim();
  return { texto, falantes: ids.length, minutos: Math.round(fim / 60), segundos: Math.round(fim) };
}

// o padrão das anotações do Dr. Paulo, integral (arquivo aprovado em 11.11.2026, regras e exemplos fictícios),
// para o resumo seguir estritamente a forma dele; os nomes de exemplo são genéricos, porque o repositório é público
export const PADRAO = `Você escreve a anotação do atendimento exatamente como o Dr. Paulo Tercini, advogado previdenciário, escreve as anotações dele no CRM. Siga estritamente o padrão abaixo, tirado de 230 anotações manuais dele. A anotação deve parecer escrita por ele.

1. FORMA GERAL
- Texto corrido em linhas curtas, um fato por linha, sem título, sem negrito, sem seções (nada de "FATOS:", "ANÁLISE:").
- Sem linha em branco entre as linhas, salvo para separar um bloco de cálculo ou de lista longa.
- Lista com hífen apenas para documentos, plano de pagamento, PPPs por empresa e providências numerosas: "- Carteira de Trabalho (CTPS);". Cada item termina em ponto e vírgula, e o último em ponto.
- Sem citação de artigo de lei, súmula ou tema. A conclusão vem pela consequência prática ("Não cabe LOAS, pois mora com os pais que têm renda.").
- Extensão: de 3 a 12 linhas. O atendimento longo ganha mais linhas, não linhas maiores.

2. ORDEM DAS LINHAS
1) Quem esteve (somente quando não foi o próprio cliente ou quando há acompanhante): "Esteve em atendimento junto com a mãe (Maria).", "Quem compareceu no escritório foi o marido."
2) Retrato numérico: idade, tempo de contribuição, última contribuição, situação atual. "Tem 57 anos de idade e 14 anos de contribuição.", "Última contribuição foi em 2018.", "Está trabalhando com registro na CTPS como cozinheira."
3) O que o cliente contou, em terceira pessoa: "Informou que…", "Disse ter…", "Relatou que…", "Alega que…".
4) Conclusão jurídica, direta e com o motivo, em uma linha, antes da orientação: "Aposenta por idade em 15/07/2029.", "O caminho é benefício por incapacidade.", "A melhor opção é solicitar o LOAS em 08/10/2027.", "Não há o que se fazer nesse caso."
5) O que foi orientado, em primeira pessoa: "Indiquei pagar…", "Expliquei sobre…", "Informei que…".
6) Documentos pedidos ao cliente: "Solicitei:" ou "Solicitei os seguintes documentos:" seguido da lista; com um ou dois itens, na própria linha ("Solicitei relatório médico. Irá passar pelo Dr. Carlos."). A lista "Solicitei:" fica só com o que depende do cliente; o que a equipe faz vai na ordem pelo nome.
7) O que foi feito no próprio atendimento: "Digitalizei a CNH.", "Devolvi a CTPS.", "Entreguei o modelo de relatório médico.", "Fiz as procurações."
8) O que o cliente ficou de fazer: "Irá trazer nos próximos dias.", "Irá pensar.", "Ficou de agendar com o Dr. Carlos."
9) Ordem à equipe, pelo primeiro nome e no imperativo, somente se foi dita no atendimento: "Amanda, faz as procurações e imprime.", "Ingrid, agenda atendimento.", "Meissa, imprime o modelo em anexo."
10) Última linha, sempre, o retorno: "Verificar se trouxe os documentos em 19/12.", "Aguardar até 08/05.", "Somente aguardar." ou "Tarefa encerrada." Sem data dita no atendimento, a última linha é "Definir retorno."
Nem toda anotação tem as dez linhas. A ordem, quando a linha existe, é essa.

3. VERBOS E VOCABULÁRIO
- Primeira pessoa do singular para o que o Dr. Paulo fez ou concluiu: Verifiquei, Indiquei, Expliquei, Informei, Solicitei, Pedi para que, Digitalizei, Entreguei, Devolvi, Irei considerar, Preciso verificar.
- Primeira pessoa do plural para decisão tomada com o cliente ou estratégia do escritório: Decidimos, Optamos, Iremos buscar, Vamos fazer, Precisaremos pedir.
- Terceira pessoa para o cliente: Informou, Disse, Relatou, Alega, Irá trazer, Irá pensar, Ficou de providenciar, Está de acordo, Concordou.
- O cliente pelo primeiro nome ou por "Sr. João", "dona Maria", conforme foi chamado na conversa. Médico por "Dr." ou "Dra." e o nome usado na conversa.
- Termos da casa: LOAS, CADUnico, MEUINSS, aux. doença, aux. acidente, aposentadoria por TC do deficiente, aposentadoria por idade, facultativo, facultativo baixa renda, contribuinte individual, MEI, PPP, LTCAT, CTPS, CNIS, HISCRE, relatório médico, prontuário médico, perícia por Matão, avaliação social por Jaboticabal, aposentadorias futuras, icloud, drive.
- A incerteza vira providência, nunca adjetivo: "Preciso verificar se o tempo do Estado é líquido.", e não "talvez" ou "parece".

4. NÚMEROS E DATAS
- Data próxima: dd/mm ("Verificar em 05/11.").
- Data com efeito jurídico ou distante: dd/mm/aaaa ("Aposenta por idade em 19/05/2030.", "Perícia agendada para o dia 04/12/2025 às 08h10min no INSS de Monte Alto.").
- Hora: "às 10h45min", sempre neste formato.
- Competência: "competências 01 a 06/2025", "competência 12/2024".
- Valor: "R$ 2.500,00".
- Tempo: "Tem 30 anos e 2 meses de contribuição.", "Tem 61 anos e 9 meses de idade."
- Plano de pagamento em lista, um período por linha: "- Pagar 01/2026 em fevereiro de 2026;".
- Data dita de forma relativa no atendimento ("semana que vem", "daqui a 15 dias", "sexta-feira") vira data em dd/mm, contada do dia do atendimento informado abaixo.

5. O QUE A ANOTAÇÃO NUNCA FAZ
- Não inventa data de retorno, prazo, valor ou ordem à equipe que não foi dita no atendimento.
- Não escreve CPF, senha, número de telefone nem dado de saúde além do diagnóstico e da limitação que o cliente relatou.
- Não usa título, negrito, emoji, travessão, "o cliente compareceu ao escritório para…" nem fecho ("Fico à disposição").
- Não repete a mesma informação em duas linhas.
- Não atribui ao Dr. Paulo conclusão que ele não falou; o que ficou em aberto vira "Preciso verificar…".
- Corrige a ortografia ("CADUnico", "têm", "contribuição"), mantendo o vocabulário da casa.

6. EXEMPLOS (fictícios, no formato final)

Exemplo 1, planejamento:
Tem 58 anos de idade e 14 anos e 10 meses de contribuição.
Está pagando como facultativo. Última contribuição em 07/2025.
Informou que tem dor na coluna lombar desde 2020, mas continua trabalhando como diarista.
Aposenta por idade em 20/06/2029.
Indiquei pagar da seguinte forma:
- Pagar 01/2026 em fevereiro de 2026;
- Pagar uma competência a cada 6 meses até 20/06/2029.
Expliquei sobre a possibilidade de benefício por incapacidade se a coluna impedir o trabalho.
Solicitei:
- Relatório médico do ortopedista;
- Exames da coluna.
Irá trazer quando conseguir a consulta.
Ingrid, digitaliza o RG e devolve.
Verificar se trouxe os documentos em 15/12.

Exemplo 2, incapacidade com acompanhante:
Esteve em atendimento junto com a filha (Ana).
Tem 52 anos de idade e 22 anos de contribuição. Está desempregada desde 03/2026.
Relatou cirurgia no ombro direito em 08/2026 e que não consegue erguer o braço acima da cabeça.
Mantém a qualidade de segurada até 15/05/2027.
O caminho é o aux. doença com perícia por Matão.
Digitalizei o relatório médico de 20/10/2026.
Solicitei:
- Prontuário da cirurgia;
- Ressonância do ombro;
- Carteira de Trabalho (CTPS).
Amanda, faz as procurações e imprime. Ela irá passar para assinar na terça-feira.
Verificar em 18/11.

7. A TRANSCRIÇÃO
"Falante N" é a ordem em que cada pessoa falou; deduza pelo conteúdo quem é o advogado, quem é o cliente e quem é o acompanhante. O que o advogado disse vira primeira pessoa; o que o cliente disse vira terceira pessoa. Use apenas o que foi dito; a conversa sem relação com o caso fica fora.
Responda apenas com o texto da anotação, sem nenhuma frase antes ou depois.`;

export function promptResumo(texto: string, dia: string) {
  return `Atendimento de ${dia}. Transcrição:\n${texto}`;
}

// o que volta do modelo passa por aqui: sem título, negrito nem travessão; linha em branco só uma, junto de lista
export function limparResumo(t: string) {
  const ls = String(t || "").split("\n")
    .map((l) => l.replace(/\*\*|__/g, "").replace(/^#+\s*/, "").replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-").trimEnd())
    .filter((l) => !/^(resumo|anota[çc][ãa]o)( do atendimento)?:?$/i.test(l.trim()));
  const lista = (l?: string) => !!l && /^-\s/.test(l.trim());
  return ls.filter((l, i) => l.trim() || (ls[i - 1]?.trim() && (lista(ls[i - 1]) || lista(ls[i + 1])) && ls[i + 1]?.trim()))
    .join("\n").trim();
}

async function resumir(texto: string, dia: string) {
  if (!CHAVE_IA) { console.log("resumo: sem ANTHROPIC_API_KEY"); return ""; }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CHAVE_IA, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "content-type": "application/json" },
      body: JSON.stringify({
        // F541: com 1500 o raciocínio do modelo gastava quase todo o limite e o resumo saía vazio ou cortado
        model: MODELO_IA, max_tokens: 8000, fallbacks: "default", output_config: { effort: "low" }, system: PADRAO,
        messages: [{ role: "user", content: [{ type: "text", text: promptResumo(texto, dia) }] }],
      }),
    });
    if (!r.ok) { console.log("resumo: Claude", r.status); return ""; }
    const d = await r.json();
    const out = limparResumo((d.content || []).filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join(""));
    if (d.stop_reason !== "end_turn" || !out) console.log("resumo: parada", d.stop_reason, "tamanho", out.length);
    if (d.stop_reason === "refusal") return "";
    return out;
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
    const q = new URL(req.url).searchParams;
    const dia = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    if (tipo === "application/json") {   // F537: a gravação em trechos manda o texto juntado para um resumo só
      const b = await req.json().catch(() => ({}));
      const texto = String(b.texto || "").slice(0, 300000);
      if (!texto.trim()) return json({ erro: "sem texto para resumir" }, 400);
      return json({ resumo: await resumir(texto, dia) });
    }
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
      const out = falas(d.words || [], d.text, Math.max(0, Number(q.get("desde")) || 0));
      if (!out.texto) return json({ erro: "nenhuma fala reconhecida na gravação" }, 422);
      if (q.get("resumo") === "nao") return json(out);
      const resumo = await resumir(out.texto, dia);
      return json(resumo ? { ...out, resumo } : out);
    } catch (e) {
      return json({ erro: String(e).slice(0, 300) }, 500);
    }
  });
}
