// node --experimental-strip-types testes/funcoes/zap_plantao.test.mjs
import assert from "node:assert/strict";
import { mascarar, transcricao, promptPlantao, ESQUEMA, regras, definicaoAgente, textoDoTurno, turno, FERRAMENTA, ferramentasDaConversa, vagasDoDia, rotulo, paraTriagem, ligacaoTriagem, AGENDAR_BULLET, emLinhas, paraAgendador, AG_ASSUNTO, AG_MODALIDADE, AG_HORARIOS, AG_ORIENTA, promptIntencao, ESQ_INTENCAO, promptCliente, ESQ_CLIENTE, promptCobranca, ESQ_COBRANCA, promptAndamento, ESQ_ANDAMENTO, mascararMenosDatas, ehGolpe } from "../../zap_plantao/index.ts";

assert.equal(mascarar("CPF 123.456.789-09"), "CPF [número]");
const msgs = [
  { direcao: "saida", por_bot: false, tipo: "texto", texto: "*Dr. Marcos:*\n\nBom dia! Até o momento nada", momento: "2026-10-24T12:00:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "texto", texto: "e o meu processo, NB 1234567890?", momento: "2026-10-24T13:00:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "audio", texto: null, momento: "2026-10-24T13:01:00Z" },
];
const t = transcricao(msgs);
assert.ok(t.includes("*Dr. Marcos:*"), "a assinatura da equipe vai ao modelo");
assert.ok(t.includes("NB [número]") && t.includes("[audio]"));
assert.ok(t.includes("24/10/2026, 09:00"), "hora de Brasília");

const base = { contato: "Maria", advogado: "Dr. Marcos", advogados: ["Dr. Paulo Tercini", "Dr. Marcos", "Dra. Amanda Garcez"],
  modo: "", respostas: 0, horario: true, agenda: true, agora: "24/10/2026 10:20", mensagens: msgs };
const p1 = promptPlantao({ ...base, cliente: { nome: "Maria", mesmo_telefone: true, casos: [{ beneficio: "B31", fase: "inss", etapa: "aguardando perícia" }] } });
assert.ok(p1.includes("etapa: aguardando perícia") && p1.includes("Advogado indicado para esta conversa: Dr. Marcos"));
assert.ok(p1.includes("opinião jurídica") && p1.includes("PIX") && p1.includes("assistente virtual"));
assert.ok(p1.includes("Modo: plantão"), "sem interativa, o modo é o plantão");
const p2 = promptPlantao({ ...base, cliente: { nome: "Maria", mesmo_telefone: false, casos: [] } });
assert.ok(p2.includes("não fale da situação") && !p2.includes("etapa: "), "outro telefone não recebe a etapa");
const p3 = promptPlantao({ ...base, cliente: null, horario: false, modo: "lead", respostas: 5, interativa: true });
assert.ok(p3.includes("fora do horário") && p3.includes("agende depois de 1 respostas") && p3.includes("Modo: conversa na hora"));
assert.deepEqual(ESQUEMA.properties.acao.enum, ["nada", "conversa", "responder", "lead", "agendar", "equipe"]);

// F275 · as instruções do escritório entram depois das proibições, que continuam valendo
const r = regras("Atendemos de segunda a sexta.");
assert.ok(r.indexOf("Proibido") < r.indexOf("Instruções do escritório (seguem as proibições acima):\nAtendemos de segunda a sexta."));
assert.ok(!regras("  ").includes("Instruções do escritório"));
// o agente do Managed Agents: system fixo (sem o contexto da conversa) e a ferramenta decidir com o esquema
const d = definicaoAgente("x");
assert.ok(d.system.includes("ferramenta decidir") && !d.system.includes("Agora:") && d.tools[0] === FERRAMENTA);
assert.equal(FERRAMENTA.type, "custom"); assert.equal(FERRAMENTA.input_schema, ESQUEMA);
const tx = textoDoTurno({ ...base, cliente: null, interativa: true }, msgs.slice(1), false);
assert.ok(tx.includes("Modo: conversa na hora") && tx.includes("mensagens novas") && !tx.includes("Dr. Marcos:*\n"));

// o turno lê o SSE até a decisão e fecha a chamada da ferramenta
const enviados = [];
const sse = (evs) => new Response(new ReadableStream({ start(c) {
  const enc = new TextEncoder();
  for (const e of evs) c.enqueue(enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
  c.close();
} }), { status: 200 });
const falso = (evs) => async (url, op = {}) => {
  if (/events\/stream$/.test(url)) return sse(evs);
  enviados.push(JSON.parse(op.body));
  return new Response("{}", { status: 200 });
};
const dec = await turno("sesn_1", "oi", falso([
  { type: "session.status_running", id: "e1" },
  { type: "agent.custom_tool_use", id: "sevt_9", name: "decidir", input: { acao: "conversa", resposta: "Bom dia, Maria." } },
]));
assert.equal(dec.acao, "conversa");
assert.equal(enviados[0].events[0].type, "user.message");
assert.deepEqual([enviados[1].events[0].type, enviados[1].events[0].custom_tool_use_id], ["user.custom_tool_result", "sevt_9"]);
// o "nada" logo depois de encaminhar ao Agendador não fecha o turno: espera a resposta dele (07.11.2026)
enviados.length = 0;
const dec3 = await turno("sesn_3", "quero marcar", falso([
  { type: "agent.thread_message_sent", id: "t1" },
  { type: "agent.custom_tool_use", id: "sevt_a", name: "decidir", input: { acao: "nada", resposta: "" } },
  { type: "agent.thread_message_received", id: "t2" },
  { type: "agent.custom_tool_use", id: "sevt_b", name: "decidir", input: { acao: "conversa", resposta: "Vou ajudar com o agendamento." } },
]));
assert.equal(dec3.acao, "conversa");
assert.match(enviados[1].events[0].content[0].text, /espere a resposta do Agendador/);
// também a "conversa" que só promete ("vou verificar, aguarde") antes da resposta do Agendador (08.11.2026)
enviados.length = 0;
const dec3b = await turno("sesn_3", "pode ser dia 10", falso([
  { type: "agent.thread_message_sent", id: "t1" },
  { type: "agent.custom_tool_use", id: "sevt_a", name: "decidir", input: { acao: "conversa", resposta: "Vou verificar os horários. Aguarde, por favor." } },
  { type: "agent.thread_message_received", id: "t2" },
  { type: "agent.custom_tool_use", id: "sevt_b", name: "decidir", input: { acao: "conversa", resposta: "Há às 9h30 e às 10h00." } },
]));
assert.equal(dec3b.resposta, "Há às 9h30 e às 10h00.");
// encerrou sem a decidir: pede uma vez e aceita a decisão que vier depois
enviados.length = 0;
const dec4 = await turno("sesn_4", "oi", falso([
  { type: "session.status_idle", id: "e2", stop_reason: { type: "end_turn" } },
  { type: "agent.custom_tool_use", id: "sevt_c", name: "decidir", input: { acao: "conversa", resposta: "Bom dia." } },
]));
assert.equal(dec4.acao, "conversa"); assert.match(enviados[1].events[0].content[0].text, /sem chamar a ferramenta decidir/);
await assert.rejects(turno("sesn_1", "oi", falso([{ type: "session.status_idle", id: "e2", stop_reason: { type: "end_turn" } },
  { type: "session.status_idle", id: "e3", stop_reason: { type: "end_turn" } }])), /parou sem decisão/);
// a decidir que sobrou do turno anterior não responde à mensagem nova (07.11.2026)
enviados.length = 0;
const comMarco = async (url, op = {}) => {
  if (/events\/stream$/.test(url)) return sse([
    { type: "agent.custom_tool_use", id: "velha", name: "decidir", processed_at: "2026-11-07T19:19:33.7Z", input: { acao: "conversa", resposta: "Olá, boa tarde!" } },
    { type: "agent.custom_tool_use", id: "nova", name: "decidir", processed_at: "2026-11-07T19:19:40.0Z", input: { acao: "conversa", resposta: "Vamos agendar." } },
  ]);
  enviados.push(JSON.parse(op.body));
  return new Response(JSON.stringify({ data: [{ id: "m", processed_at: "2026-11-07T19:19:34.2Z" }] }), { status: 200 });
};
const dec5 = await turno("sesn_5", "Quero agendar um horário", comMarco);
assert.equal(dec5.resposta, "Vamos agendar.");
assert.equal(enviados[1].events[0].custom_tool_use_id, "velha"); assert.match(enviados[1].events[0].content[0].text, /turno anterior/);
// "agendar", e não "marcar", nos dois agentes e nas regras
assert.ok(regras().includes("Vocabulário:") && paraAgendador("x").includes("Vocabulário:") && paraTriagem("x").includes("Vocabulário:"));
assert.equal(paraAgendador(paraAgendador("x")), paraAgendador("x")); assert.equal(paraTriagem(paraTriagem("x")), paraTriagem("x"));

// F278 · a Assistente faz a triagem e o Agendador (Console) marca pela agenda do CRM
assert.deepEqual(definicaoAgente("x").tools.map((f) => f.name), ["decidir"]);
const doConsole = "Você é a assistente.\n- \"lead\": acolha.\n- \"agendar\": não use. Você mesma marca o atendimento pelas ferramentas.\n- \"equipe\": urgente.\n\n" +
  "Proibido, sem exceção: parecer.\n\nComo marcar o atendimento (quando...):\n1. consulte as vagas.\n8. Nunca invente.\n\nResponda sempre chamando a ferramenta decidir.";
const tri = paraTriagem(doConsole);
assert.ok(tri.includes(AGENDAR_BULLET) && !tri.includes("Como marcar o atendimento") && !tri.includes("Você mesma marca"));
assert.ok(tri.indexOf("Proibido") < tri.indexOf("Como encaminhar ao Agendador:") && tri.indexOf("Como encaminhar ao Agendador:") < tri.indexOf("Responda sempre chamando"));
assert.ok(tri.includes('- "lead": acolha.') && tri.includes('- "equipe": urgente.'), "o resto do texto do Console fica");
assert.equal(paraTriagem(tri), tri, "aplicar de novo não muda nada");
// F280 · as linhas e a abertura variada
assert.ok(tri.indexOf("Como escrever no WhatsApp:") < tri.indexOf("Responda sempre chamando") && regras().includes("Como escrever no WhatsApp:"));
assert.ok(!tri.includes("sem mudar o conteúdo") && paraTriagem(tri.replace(/\n\nComo escrever no WhatsApp:[\s\S]*?(?=\n\nResponda)/, "")) === tri, "o texto antigo do Console ganha o estilo");
assert.equal(emLinhas("Boa noite, Paulo! Seja bem-vindo à Advocacia Previdenciária. Sou a assistente virtual do escritório e posso ajudar no que precisar hoje."),
  "Boa noite, Paulo!\n\nSeja bem-vindo à Advocacia Previdenciária. Sou a assistente virtual do escritório e posso ajudar no que precisar hoje.");
assert.equal(emLinhas("Recebido, obrigado."), "Recebido, obrigado.");
assert.ok(emLinhas("Obrigada, Sr. Paulo. Haverá outra pessoa que também será atendida junto com o senhor? Pergunto para já informar o profissional.").startsWith("Obrigada, Paulo.\n\nHaverá"));
const agC = "Você é a assistente.\n\nTriagem:\n1. Pergunte o nome completo.\n2. Pergunte em poucas palavras do que se trata o caso.\n3. Pergunte se prefere atendimento presencial, no escritório, ou remoto, por chamada.\n4. Pergunte se haverá outra pessoa que também será atendida junto.\n5. Escolha.\n6. Chame consultar_vagas (no CRM) e ofereça no máximo 3 horários, numerados.\n7. Confirme.\n8. Antes de marcar, oriente: ter em mãos a senha do GOV.BR. Só depois chame marcar_atendimento.";
const agN = paraAgendador(agC);
assert.ok(agN.includes(AG_ASSUNTO) && agN.includes(AG_MODALIDADE) && !agN.includes("ou remoto, por chamada") && !agN.includes("4. Pergunte se haverá outra pessoa") && agN.includes(AG_HORARIOS) && agN.includes(AG_ORIENTA) && !agN.includes("Antes de marcar, oriente"));
assert.ok(agN.indexOf("Não repita bom dia") < agN.indexOf("Triagem:"));
assert.equal(paraAgendador(agN), agN, "o Agendador ajustado não muda de novo");
assert.ok(paraTriagem('na primeira resposta, diga "seja bem-vindo(a) a Advocacia Previdenciária". Fim.').includes("abertura variada"));
assert.equal(emLinhas("Linha um.\n\nLinha dois."), "Linha um.\n\nLinha dois.");
const lig = ligacaoTriagem({ version: 5, system: doConsole, tools: [{ type: "custom", name: "decidir" }, { type: "custom", name: "consultar_vagas" }] }, "agent_X");
assert.equal(lig.version, 5); assert.deepEqual(lig.tools.map((t) => t.name), ["decidir"]);
assert.deepEqual(lig.multiagent.subagents.predefined_agents, ["agent_X"]);
assert.equal(lig.multiagent.subagents.inline_agents.type, "disabled"); assert.equal(lig.multiagent.workflows.type, "disabled");
assert.equal(rotulo("2026-10-27", "09:30", "a Dra. Amanda"), "terça-feira, 27/10, às 9h30, com a Dra. Amanda");
assert.deepEqual(vagasDoDia([{ data: "2026-10-28", livres: { "001": [{ inicio: "14:00", eventoId: "b" }, { inicio: "15:00" }] } },
  { data: "2026-10-27", livres: { "001": [{ inicio: "09:30", eventoId: "a" }] } }, { data: "2026-10-26", bloqueado: true, livres: { "001": [{ inicio: "08:00", eventoId: "z" }] } }],
  "001", "a Dra. Amanda").map((v) => v.eventoId), ["a", "b"], "ordem de data, só vaga marcada, sem dia bloqueado");
const manhas = [1, 2, 3, 4, 5].map((k) => ({ data: `2026-11-0${k}`, livres: { "001": [{ inicio: "09:00", eventoId: "m" + k }] } }));
const ofert = vagasDoDia([...manhas, { data: "2026-11-09", livres: { "001": [{ inicio: "14:30", eventoId: "t" }] } }], "001", "o Dr. Marcos", 4);
assert.deepEqual(ofert.map((v) => v.eventoId), ["m1", "m2", "m3", "t"], "a primeira tarde vem mesmo depois de quatro manhãs");
assert.equal(ofert[3].periodo, "tarde");
const chamadas = [], noBanco = [];
const meu = { id: "ev-meu", atendimento: true, data: "2026-10-29", inicio: "10:00", profissional: "amanda" };
const agendaFalsa = async (acao, corpo) => { chamadas.push([acao, corpo]);
  if (acao === "disponibilidade") return { ok: true, dias: [{ data: "2026-10-27", livres: { "001": [{ inicio: "09:30", eventoId: "ev-" + corpo.profissional }] } }] };
  if (acao === "agendamentosFuturos") return { ok: true, agendamentos: [meu, { id: "ev-vaga", atendimento: false }] };
  return corpo.eventoId === "tomado" ? { ok: false, codigo: "HORARIO_INDISPONIVEL" } : { ok: true }; };
const bancoFalso = async (nome, corpo) => { noBanco.push([nome, corpo]);
  return nome === "zap_plantao_agenda" ? { telefone: "5516999998888", cliente_id: null, nome_ficha: null, ligada: true } : null; };
const fz = ferramentasDaConversa("c1", agendaFalsa, bancoFalso);
const cv = await fz.consultar_vagas({ profissionais: ["amanda", "paulo", "hacker"], tipo: "002" });
assert.equal(cv.tipo, "001", "o tipo sai da conversa, não do agente"); assert.equal(cv.vagas.amanda[0].rotulo, "terça-feira, 27/10, às 9h30, com a Dra. Amanda");
assert.ok(!("hacker" in cv.vagas));
assert.deepEqual(cv.atendimentos_marcados, [{ atendimentoId: "ev-meu", rotulo: "quinta-feira, 29/10, às 10h00, com a Dra. Amanda" }]);
// o esquema do Agendador não traz data nem hora: a vaga é relida pelo eventoId
const mk = await fz.marcar_atendimento({ eventoId: "ev-amanda", profissional: "amanda", tipo: "002", nome: "Maria Souza", modalidade: "remoto", assunto: "auxílio-doença", acompanhante: true, orientacoes_dadas: true });
assert.ok(mk.marcado && /não repita/.test(mk.aviso));
const ag = chamadas.find((c) => c[0] === "agendar")[1];
assert.deepEqual([ag.telefone, ag.tipo, ag.data, ag.inicio], ["16999998888", "001", "2026-10-27", "09:30"]);
assert.ok(ag.observacoes.includes("Modalidade: remoto") && ag.observacoes.includes("Outra pessoa será atendida junto"));
assert.deepEqual(noBanco.filter((b) => b[0] === "zap_plantao_marcado")[0][1].p_modalidade, "remoto");
assert.equal(noBanco.filter((b) => b[0] === "zap_plantao_agenda").length, 1, "lê a conversa uma vez por turno");
assert.match((await fz.marcar_atendimento({ eventoId: "sumiu", profissional: "amanda", nome: "M", modalidade: "presencial", assunto: "" })).erro, /não está mais livre/);
// remarcar e cancelar valem só para atendimento desta pessoa
const alheio = await fz.remarcar_atendimento({ atendimentoId: "ev-de-outro", novoEventoId: "ev-paulo" });
assert.match(alheio.erro, /não encontrado/); assert.equal(alheio.atendimentos_marcados[0].atendimentoId, "ev-meu");
assert.ok(!chamadas.some((c) => c[0] === "remarcar"));
const rm = await fz.remarcar_atendimento({ atendimentoId: "ev-meu", novoEventoId: "ev-paulo" });
assert.ok(rm.remarcado); const rc = chamadas.find((c) => c[0] === "remarcar")[1];
assert.deepEqual([rc.eventId, rc.eventoId, rc.profissional, rc.data, rc.inicio], ["ev-meu", "ev-paulo", "paulo", "2026-10-27", "09:30"]);
assert.match((await fz.cancelar_atendimento({ atendimentoId: "ev-vaga", motivo: "" })).erro, /não encontrado/, "vaga não é atendimento");
assert.ok((await fz.cancelar_atendimento({ atendimentoId: "ev-meu", motivo: "viagem" })).cancelado);
assert.equal(chamadas.find((c) => c[0] === "cancelar")[1].eventId, "ev-meu");
assert.ok(noBanco.some((b) => b[0] === "zap_nota_sistema" && /cancelou.*Motivo: viagem/.test(b[1].p_texto)));
assert.ok(!("motivo" in fz.encaminhado));
await fz.encaminhar_equipe({ motivo: "prazo vencendo", urgente: true });
assert.deepEqual(fz.encaminhado, { motivo: "prazo vencendo", urgente: true });

// a chamada do Agendador chega ao stream principal (session_thread_id) e o turno a responde
enviados.length = 0;
const dec2 = await turno("sesn_2", "quero marcar", falso([
  { type: "agent.custom_tool_use", id: "sevt_1", name: "consultar_vagas", session_thread_id: "sthr_1", input: { profissionais: ["amanda"], tipo: "001" } },
  { type: "session.status_idle", id: "e3", stop_reason: { type: "requires_action" } },
  { type: "agent.custom_tool_use", id: "sevt_2", name: "decidir", input: { acao: "conversa", resposta: "Há vaga terça às 9h30." } },
]), fz);
assert.equal(dec2.resposta, "Há vaga terça às 9h30.");
const res1 = enviados[1].events[0];
assert.equal(res1.custom_tool_use_id, "sevt_1"); assert.ok(JSON.parse(res1.content[0].text).vagas.amanda.length === 1);
const pai = promptPlantao({ ...base, contato: "Paulo Tercini", relacao: "pai", cliente: { nome: "Pietra Tercini", mesmo_telefone: true, casos: [] } });
assert.ok(pai.includes("Quem escreve é Paulo Tercini (pai de Pietra Tercini): chame pelo nome de quem escreve"));
assert.ok(!p1.includes("Quem escreve"), "sem relação gravada, nada muda");
assert.ok(regras().includes("boas-vindas em nome da Advocacia Previdenciária"));
// F422c · o NÃO da confirmação leva a remarcação ao contexto
const rem = promptPlantao({ ...base, remarcar: { rotulo: "quarta-feira, 11/11/2026, às 9h30", profissional: "Amanda" } });
assert.ok(rem.includes("confirmação do atendimento de quarta-feira, 11/11/2026, às 9h30, que não pode comparecer"));
assert.ok(rem.includes("mesmo advogado (Amanda), um de manhã e outro à tarde"));
assert.ok(rem.includes("pergunte primeiro, em uma frase, se deseja já remarcar"), "F471: pergunta antes de oferecer horários");
assert.ok(!p1.includes("Remarcação:"), "sem remarcação, nada muda");
assert.ok(p1.includes("pelo nome no máximo uma vez"), "o nome uma vez só");
const duv = promptPlantao({ ...base, remarcar: { rotulo: "quarta-feira, 11/11/2026, às 9h30", profissional: "Amanda", duvida: true } });
assert.ok(duv.includes("precisa da confirmação para fechar a agenda") && duv.includes("não deixa clara a presença") && !duv.includes("que não pode comparecer"), "a dúvida tem o seu contexto");
// F422f · a IA lê a resposta à confirmação: a confirmação mandada e a resposta do cliente vão ao classificador
const pi = promptIntencao({ ...base, mensagens: [
  { direcao: "saida", por_bot: true, tipo: "texto", texto: "Seu atendimento está agendado para 11/11. Podemos contar com a sua presença?", momento: "2026-11-07T12:00:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "texto", texto: "Estarei ocupado nesse dia", momento: "2026-11-07T12:01:00Z" }] });
assert.ok(pi.includes("<resposta>Estarei ocupado nesse dia</resposta>") && pi.includes("Podemos contar com a sua presença?"));
assert.deepEqual(ESQ_INTENCAO.properties.intencao.enum, ["confirmar", "remarcar", "outro"]);
// F422ab · os dois áudios ("Bom dia" e "Vou sim, tá marcado dia 11, né?") vão juntos ao classificador
{ const p2 = promptIntencao({ ...base, mensagens: [
    { direcao: "saida", por_bot: true, tipo: "texto", texto: "Podemos confirmar a sua presença?", momento: "2026-11-09T12:00:00Z" },
    { direcao: "entrada", por_bot: false, tipo: "audio", texto: "Bom dia, tudo bem?", momento: "2026-11-09T12:02:17Z" },
    { direcao: "entrada", por_bot: false, tipo: "audio", texto: "Vou sim, tá marcado com o dia 11, né?", momento: "2026-11-09T12:02:22Z" }] });
  assert.ok(p2.includes("<resposta>Bom dia, tudo bem?\nVou sim, tá marcado com o dia 11, né?</resposta>") && p2.includes("pergunta retórica")); }
{ const antigo = "Agendador.\n\n6. Chame consultar_vagas (no CRM). Se o assunto é previdenciário, ofereça três horários numerados.\n7. Confirme.";
  const novo = paraAgendador(antigo); assert.ok(novo.includes(AG_HORARIOS) && !novo.includes("três horários numerados") && paraAgendador(novo) === novo); }
console.log("zap_plantao: ok");

// F422i · na dúvida, a equipe; o atendimento marcado se acha pela ficha do número mesmo com quem escreve por outra pessoa
{
  const { AG_DUVIDA, COMO_ENCAMINHAR: CE } = await import("../../zap_plantao/index.ts");
  const ag = paraAgendador("Agendador.\n\nPassos.");
  assert.ok(ag.includes(AG_DUVIDA) && paraAgendador(ag) === ag, "o Agendador ganha a regra da dúvida uma vez");
  const velho = paraTriagem("Texto.\n\nResponda sempre chamando decidir.").replace(CE, CE.split("\n\nNa dúvida")[0]);
  const novo = paraTriagem(velho);
  assert.ok(novo.includes("\n\nNa dúvida, a equipe") && paraTriagem(novo) === novo, "a Assistente antiga ganha a regra da dúvida");
  // F422k · a regra antiga da F422i (pedir sem advogado ia à equipe) dá lugar à revista
  const { DUVIDA_TRIAGEM } = await import("../../zap_plantao/index.ts");
  const velhaT = "\n\nNa dúvida, a equipe (pedido do Paulo de 07.11.2026): quando não estiver claro o que a pessoa quer, use acao \"equipe\".";
  const t422i = paraTriagem("Texto.\n\nResponda sempre chamando decidir.").replace(DUVIDA_TRIAGEM, velhaT);
  const t422k = paraTriagem(t422i);
  assert.ok(t422k.includes(DUVIDA_TRIAGEM) && !t422k.includes(velhaT) && paraTriagem(t422k) === t422k, "a Assistente troca a dúvida antiga pela revista");
  const a422i = paraAgendador("Agendador.\n\nPassos.").replace(AG_DUVIDA, "\n\nNa dúvida, a equipe (pedido do Paulo de 07.11.2026): quando não estiver claro com qual advogado marcar, encaminhe.");
  const a422k = paraAgendador(a422i);
  assert.ok(a422k.includes(AG_DUVIDA) && !a422k.includes("com qual advogado marcar") && paraAgendador(a422k) === a422k, "o Agendador troca a dúvida antiga pela revista");
  const chamadas = [];
  const f = ferramentasDaConversa("c1", async (acao, p) => { chamadas.push([acao, p]); return { ok: true, agendamentos: [], dias: [] }; },
    async () => ({ ligada: true, telefone: "5516900000000", cliente_id: null, cliente_numero: "cli-9" }));
  await f.remarcar_atendimento({ atendimentoId: "x" });
  assert.ok(chamadas.some(([a, p]) => a === "agendamentosFuturos" && p.clienteId === "cli-9"), "busca o marcado pela ficha do número");
}
{
  const { AG_HORARIOS_F280 } = await import("../../zap_plantao/index.ts");
  const v4 = paraAgendador(`Agendador.\n\n${AG_HORARIOS_F280}\n7. Confirme.`);
  assert.ok(v4.includes(AG_HORARIOS) && !v4.includes(AG_HORARIOS_F280) && paraAgendador(v4) === v4, "o Agendador da v4 recebe as datas antes dos horários");
}
{
  // o simulador lê a agenda de verdade, mas agendar não chega ao Apps Script
  const { ferramentasSimuladas } = await import("../../zap_plantao/index.ts");
  const chamadas = [];
  const real = async (acao) => { chamadas.push(acao); return { ok: true, dias: [{ data: "2026-11-09", livres: { "001": [{ inicio: "10:30", eventoId: "ev1" }] } }] }; };
  const { fer, uso } = ferramentasSimuladas({ telefone: "5516900000000", cliente_id: null, ligada: true }, real);
  const v = await fer.consultar_vagas({ profissionais: ["amanda"] });
  assert.equal(v.vagas.amanda[0].eventoId, "ev1");
  const m = await fer.marcar_atendimento({ profissional: "amanda", eventoId: "ev1", nome: "Teste" });
  assert.ok(m.marcado && !chamadas.includes("agendar"), "o simulador não agenda de verdade");
  assert.deepEqual(uso.map((u) => u.nome), ["consultar_vagas", "marcar_atendimento"]);
}
console.log("simulador: ok");
{
  const { FATOS, FORMAL, AG_PREV } = await import("../../zap_plantao/index.ts");
  const a = paraTriagem("Assistente.\n\nResponda sempre chamando a ferramenta decidir.");
  assert.ok(a.includes(FATOS) && a.includes(FORMAL) && paraTriagem(a) === a && a.endsWith("decidir."), "a Assistente recebe as informações do escritório uma vez");
  const g = paraAgendador("Você é a assistente. Apresente-se sempre como assistente virtual.\n\n5. Escolha:\n   - Assunto previdenciário (INSS, x): ofereça primeiro as vagas da Dra. Amanda.\n6. x");
  assert.ok(g.includes(AG_PREV) && !g.includes("Apresente-se sempre") && g.includes(FORMAL) && paraAgendador(g) === g, "o Agendador alinha o passo 5 ao 6");
}
console.log("fatos: ok");
{
  const { PADRAO } = await import("../../zap_plantao/index.ts");
  const a = paraTriagem("Assistente.\n\nO jeito do escritório (antigo):\n- x\n\nResponda sempre chamando a ferramenta decidir.");
  assert.ok(a.includes(PADRAO) && !a.includes("(antigo)") && paraTriagem(a) === a, "a Assistente recebe o jeito do escritório e a versão nova troca a antiga");
  const g = paraAgendador("Agendador.\n\n6. x");
  assert.ok(g.includes(PADRAO) && paraAgendador(g) === g, "o Agendador recebe o jeito do escritório uma vez");
  assert.ok(regras().includes(PADRAO));
}
console.log("padrao: ok");

// F422m · o tratamento antigo ("o senhor" e "a senhora" sempre) sai do texto dos agentes
{
  const { FORMAL } = await import("../../zap_plantao/index.ts");
  const velho = 'x\n\nRegistro: português formal e técnico, como numa carta do escritório. Trate por "o senhor" e "a senhora". Não use.\n\nFim';
  for (const f of [paraTriagem, paraAgendador]) {
    const t = f(velho);
    assert.ok(!t.includes('"o senhor" e "a senhora"') && t.includes(FORMAL) && t.split("Registro: português").length === 2);
    assert.equal(f(t), t);
  }
}
console.log("formal: ok");
{
  const { emLinhas: el, paraTriagem: pt, ESTILO: es } = await import("../../zap_plantao/index.ts");
  assert.equal(el("Qual benefício o senhor ou a senhora pediu ao INSS?"), "Qual benefício pediu ao INSS?");
  assert.equal(el("Conte-nos o que o senhor ou a senhora deseja tratar."), "Conte-nos o que deseja tratar.");
  assert.ok(!es.includes("Seja bem-vindo"));
  const velho = "x\n\nComo escrever no WhatsApp:\nSeja bem-vindo antigo.\n\nResto";
  const novo = pt(velho);
  assert.ok(!novo.includes("Seja bem-vindo antigo") && novo.split("Como escrever no WhatsApp:").length === 2);
  console.log("tratamento: ok");
}
{
  // teste do Paulo de 07.11.2026: o menu já recebeu a pessoa, e a ficha é de outra pessoa
  const { contexto: cx, PADRAO: pd } = await import("../../zap_plantao/index.ts");
  const c = cx({ ...base, contato: "Paulo Tercini", relacao: "pai", cliente: { nome: "Pietra Tercini", mesmo_telefone: true, casos: [] } });
  assert.ok(c.includes("Refira-se a Pietra apenas pelo primeiro nome") && c.includes("o menu automático inclusive"));
  assert.ok(pd.includes("nunca para abrir uma pergunta"));
  console.log("menu e representado: ok");
}

// F422p · o pai escreve pelo número da Pietra: 002 para ela (com a ficha), 001 para ele
{
  const ch = [];
  const ag2 = async (acao, corpo) => { ch.push([acao, corpo]);
    if (acao === "disponibilidade") return { ok: true, dias: [{ data: "2026-11-10", livres: { "001": [{ inicio: "09:00", eventoId: "v1" }], "002": [{ inicio: "09:30", eventoId: "v2" }] } }] };
    if (acao === "agendamentosFuturos") return { ok: true, agendamentos: [] };
    return { ok: true }; };
  const bc = async (nome) => nome === "zap_plantao_agenda"
    ? { telefone: "5516999998888", cliente_id: null, cliente_numero: "fd86", nome_ficha: null, nome_numero: "Pietra Tercini", ligada: true } : null;
  const f = ferramentasDaConversa("c2", ag2, bc);
  const a = await f.consultar_vagas({ profissionais: ["amanda"], tipo: "002" });
  assert.equal(a.tipo, "002"); assert.equal(a.para, "Pietra Tercini"); assert.equal(a.vagas.amanda[0].eventoId, "v2");
  assert.equal((await f.consultar_vagas({ profissionais: ["amanda"] })).tipo, "001", "sem pedido, quem escreve é atendimento novo");
  await f.marcar_atendimento({ eventoId: "v2", profissional: "amanda", modalidade: "presencial", assunto: "aposentadoria" });
  const m = ch.find((c) => c[0] === "agendar")[1];
  assert.deepEqual([m.tipo, m.clienteId, m.nome], ["002", "fd86", "Pietra Tercini"]);
  console.log("pessoa da ficha: ok");
}
// F422q · a confirmação diz de quem é; a vaga dos dois tipos agendada para a esposa fica 001, com o nome dela
{
  const ch = [], bco = [];
  const ag2 = async (acao, corpo) => { ch.push([acao, corpo]);
    if (acao === "disponibilidade") return { ok: true, dias: [{ data: "2026-12-02", livres: { "001": [{ inicio: "13:30", eventoId: "v9" }], "002": [{ inicio: "13:30", eventoId: "v9" }] } }] };
    if (acao === "agendamentosFuturos") return { ok: true, agendamentos: [] };
    return { ok: true }; };
  const bc = async (nome, corpo) => { bco.push([nome, corpo]); return nome === "zap_plantao_agenda"
    ? { telefone: "5516999998888", cliente_id: null, cliente_numero: "fd86", nome_ficha: null, nome_numero: "Pietra Tercini", ligada: true } : null; };
  const f = ferramentasDaConversa("c3", ag2, bc);
  await f.marcar_atendimento({ eventoId: "v9", profissional: "paulo", nome: "Patrícia Castro", assunto: "aposentadoria" });
  const m = ch.find((c) => c[0] === "agendar")[1];
  assert.deepEqual([m.tipo, m.clienteId, m.nome], ["001", undefined, "Patrícia Castro"]);
  assert.equal(bco.find((b) => b[0] === "zap_plantao_marcado")[1].p_para, "Patrícia Castro");
  ch.length = 0; bco.length = 0;
  await f.marcar_atendimento({ eventoId: "v9", profissional: "paulo", nome: "Pietra", assunto: "aposentadoria" });
  assert.deepEqual(ch.find((c) => c[0] === "agendar")[1].nome, "Pietra Tercini");
  assert.equal(bco.find((b) => b[0] === "zap_plantao_marcado")[1].p_para, "Pietra Tercini");
  console.log("confirmação de quem: ok");
}

// F422r · as proteções do teste de 72 conversas
{
  const { emLinhas: el, paraTriagem: pt, paraAgendador: pa, CORRECOES, regras: rg } = await import("../../zap_plantao/index.ts");
  assert.equal(el("Olá, dona Cida, bom dia!\n\nVou ajudar."), "Olá, Cida, bom dia!\n\nVou ajudar.");
  assert.equal(el("Certo, senhor Valter.\n\nQual data?"), "Certo, Valter.\n\nQual data?");
  assert.ok(el("Pode acessar o seu Meu INSS.").includes("seu Meu INSS"));
  assert.ok(el("O senhor pode vir na quarta?").startsWith("O senhor pode"));
  assert.equal(el("Compreendi. Vou verificar.", ["Compreendi. Qual o assunto?"]), "Vou verificar.");
  assert.equal(el("Compreendi. Vou verificar."), "Compreendi. Vou verificar.");
  assert.equal(el("Qual data prefere? às 9h ou às 15h?"), "Qual data prefere? Às 9h ou às 15h?");
  assert.equal(el("Com o Dr. Paulo. ok, combinado."), "Com o Dr. Paulo. Ok, combinado.");
  assert.equal(el("Boa noite! Agradecemos o contato.\n\nQual data prefere?", ["Boa noite!"]), "Qual data prefere?");
  assert.equal(el("Boa noite! Agradecemos o contato.\n\nQual data prefere?"), "Boa noite! Agradecemos o contato.\n\nQual data prefere?");
  const t1 = pt("Texto do Console.\n\nResponda sempre chamando decidir.");
  assert.equal(t1.split("Correções do teste").length, 2);
  assert.equal(pt(t1), t1);
  const a1 = pa("Agendador.\n\n1. Passo.");
  assert.ok(a1.includes(CORRECOES) && pa(a1) === a1);
  assert.ok(rg().includes("Correções do teste"));
  console.log("ok F422r");
}

// F422s · as proteções do segundo teste de 72 conversas
{
  const { emLinhas: el, guardaDoTexto: gd, pendentesDoErro: pe, turno: tu } = await import("../../zap_plantao/index.ts");
  assert.equal(el("O advogado vai responder ao senhor ou à senhora o quanto antes."), "O advogado vai responder o quanto antes.");
  for (const t of ["ok", "Obrigada!", "ok, obrigado 👍", "Combinado. Até mais", "Bom dia"]) assert.equal(gd(t).semNada, false, t);
  for (const t of ["Minha mãe faleceu e meu pai quer saber da pensão", "Quero falar com o Dr. Paulo"]) assert.equal(gd(t).semNada, true, t);
  for (const t of ["Preciso remarcar", "Quero cancelar meu atendimento", "Tenho um horário marcado e não lembro o dia"]) assert.equal(gd(t).agendaPrimeiro, true, t);
  assert.equal(gd("Vou chegar 20 minutos atrasado").agendaPrimeiro, false);
  assert.deepEqual(pe('{"message":"waiting on responses to events [sevt_01Ab, sevt_02Cd]; only"}'), ["sevt_01Ab", "sevt_02Cd"]);
  assert.deepEqual(pe("outro erro sevt_1"), []);
  const ev = [];
  const sse2 = (evs) => new Response(new ReadableStream({ start(c) { const e = new TextEncoder(); for (const x of evs) c.enqueue(e.encode(`data: ${JSON.stringify(x)}\n\n`)); c.close(); } }), { status: 200 });
  const fake = (evs, primeiro400 = false) => { let n = 0; return async (url, op = {}) => {
    if (/events\/stream$/.test(url)) return sse2(evs);
    const b = JSON.parse(op.body); ev.push(b);
    if (primeiro400 && b.events[0].type === "user.message" && !n++) return new Response('{"error":{"message":"waiting on responses to events [sevt_P]; only"}}', { status: 400 });
    return new Response("{}", { status: 200 });
  }; };
  // "nada" para o falecimento é cobrado uma vez
  let r = await tu("s", "x", fake([{ type: "agent.custom_tool_use", id: "a", name: "decidir", input: { acao: "nada", resposta: "" } },
    { type: "agent.custom_tool_use", id: "b", name: "decidir", input: { acao: "lead", resposta: "Sentimos muito." } }]), {}, gd("Minha mãe faleceu"));
  assert.equal(r.acao, "lead"); assert.match(ev[1].events[0].content[0].text, /não é agradecimento/);
  // remarcar vai ao Agendador antes da equipe
  ev.length = 0;
  r = await tu("s", "x", fake([{ type: "agent.custom_tool_use", id: "a", name: "decidir", input: { acao: "equipe", resposta: "Um colaborador vai responder." } },
    { type: "agent.thread_message_sent", id: "t" }, { type: "agent.thread_message_received", id: "u" },
    { type: "agent.custom_tool_use", id: "b", name: "decidir", input: { acao: "conversa", resposta: "Há horário na quarta." } }]), {}, gd("Preciso remarcar"));
  assert.equal(r.acao, "conversa"); assert.match(ev[1].events[0].content[0].text, /encaminhe ao Agendador/);
  // a ferramenta pendente do turno anterior é fechada e a mensagem vai de novo
  ev.length = 0;
  r = await tu("s", "x", fake([{ type: "agent.custom_tool_use", id: "c", name: "decidir", input: { acao: "conversa", resposta: "Ok." } }], true));
  assert.equal(r.acao, "conversa");
  assert.deepEqual(ev.slice(0, 3).map((b) => b.events[0].type), ["user.message", "user.custom_tool_result", "user.message"]);
  assert.equal(ev[1].events[0].custom_tool_use_id, "sevt_P");
  console.log("ok F422s");
}

// F422t · encaminhar_equipe de remarcação sem a consulta dos agendados volta uma vez ao Agendador
{
  const f = ferramentasDaConversa("c1", async () => ({ ok: true, agendamentos: [], dias: [] }), async () => ({ telefone: "5516900000000", ligada: true }));
  const r1 = await f.encaminhar_equipe({ motivo: "quer remarcar o atendimento" });
  assert.ok(r1.erro && !("motivo" in f.encaminhado));
  const r2 = await f.encaminhar_equipe({ motivo: "quer remarcar o atendimento" });
  assert.equal(r2.encaminhado, true);
  const g = ferramentasDaConversa("c1", async () => ({ ok: true, agendamentos: [], dias: [] }), async () => ({ telefone: "5516900000000", ligada: true }));
  await g.consultar_vagas({ profissionais: ["paulo"] });
  assert.equal((await g.encaminhar_equipe({ motivo: "quer cancelar" })).encaminhado, true);
  assert.equal((await ferramentasDaConversa("c1", async () => ({}), async () => ({})).encaminhar_equipe({ motivo: "urgente: perícia amanhã" })).encaminhado, true);
  assert.ok(paraAgendador("x").includes("nunca diga que não localizou o atendimento"));
  console.log("ok F422t");
}

// F422u · a vaga sem código ("LIVRE 09h30-10h00") vale para o 001; a vaga "002" fixa não
{
  const dia = { data: "2026-11-10", livres: { "001": [], "002": [{ inicio: "09:30", eventoId: "am", tipoFixo: false }, { inicio: "10:00", eventoId: "fx", tipoFixo: true }] } };
  assert.deepEqual(vagasDoDia([dia], "001", "a Dra. Amanda").map((v) => v.eventoId), ["am"]);
  assert.equal(vagasDoDia([dia], "002", "a Dra. Amanda").length, 2);
  const chamadas = [];
  const f = ferramentasDaConversa("c9", async (acao, corpo) => {
    chamadas.push([acao, corpo]);
    if (acao === "disponibilidade") return { ok: true, dias: [dia] };
    if (acao === "agendamentosFuturos") return { agendamentos: [] };
    return { ok: true };
  }, async (fn) => (fn === "zap_plantao_agenda" ? { ligada: true, telefone: "5516999990000" } : {}));
  assert.deepEqual((await f.consultar_vagas({ profissionais: ["amanda"] })).vagas.amanda.map((v) => v.eventoId), ["am"]);
  assert.equal((await f.marcar_atendimento({ profissional: "amanda", eventoId: "am", nome: "Ana Souza" })).marcado, true);
  assert.equal(chamadas.find(([a]) => a === "agendar")[1].tipo, "001");
  console.log("ok F422u");
}
{
  const p = promptCliente("Neide, 61 anos, quer aposentadoria", [{ direcao: "entrada", texto: "Oi" }, { direcao: "saida", texto: "Qual o assunto?" }]);
  assert.ok(p.includes("Neide, 61 anos") && p.includes("Você: Oi") && p.includes("Escritório: Qual o assunto?"));
  assert.deepEqual(ESQ_CLIENTE.required, ["fala", "fim"]);
  console.log("ok F422u persona");
}

// F422v · o fecho "Qualquer dúvida, estamos à disposição." uma vez só na conversa
{
  const ant = ["O endereço é Rua Rui Barbosa, 663.\n\nQualquer dúvida, estamos à disposição."];
  assert.equal(emLinhas("Isso mesmo, quinta-feira, dia 12/11, às 10h.\n\nQualquer dúvida, estamos à disposição.", ant), "Isso mesmo, quinta-feira, dia 12/11, às 10h.");
  assert.match(emLinhas("Combinado.\n\nQualquer dúvida, estamos à disposição.", []), /disposição/);
  console.log("ok F422v fecho");
}


// F422w · a resposta que repete a anterior é devolvida uma vez à Assistente
{
  const { repete, guardaDoTexto: gt } = await import("../../zap_plantao/index.ts");
  const ant = "Sou a assistente virtual do escritório e posso ajudar com o agendamento de atendimento.\n\nQual assunto deseja tratar?";
  assert.equal(repete("Sou a assistente virtual do escritório e posso ajudar com o agendamento de atendimento.\n\nQual assunto deseja tratar?", ant), true);
  assert.equal(repete("Com a Dra. Amanda, há datas na terça-feira, dia 10/11, e na quinta-feira, dia 12/11.\n\nQual data prefere?", ant), false);
  assert.equal(repete("Qualquer coisa", ""), false);
  assert.equal(gt("aposentadoria", ant).anterior, ant);
  console.log("ok F422w repete");
}
{
  const ant = ["Compreendi. O assunto é aposentadoria?"];
  assert.equal(emLinhas("Compreendi, Elisa. Como o benefício cessou, o advogado foi avisado.", ant), "Como o benefício cessou, o advogado foi avisado.");
  assert.equal(emLinhas("Lamentamos.\n\nCompreendi, vou verificar.", ant), "Lamentamos.\n\nVou verificar.");
  console.log("ok F422w compreendi");
}
{ // F422x · o FATOS gravado no agente é trocado pela versão nova, e não ignorado
  const velho = paraTriagem("x").replace(/\n\nInformações do escritório[^]*?(?=\n\n|$)/, "\n\nInformações do escritório (antigo):\n- velho");
  const novo = paraTriagem(velho);
  assert.ok(!novo.includes("- velho") && novo.includes("atendimento por vídeo, que existe"));
  assert.equal(paraTriagem(novo), novo);
  console.log("ok F422x fatos");
}
{ // F422aj · a cobrança sugerida
  const c = { conversa_id: "x", msg_id: "y", dias: 11, contato: "João Carvalho", relacao: "filho", cliente: "Sueli Aparecida",
    mensagens: [{ direcao: "saida", por_bot: false, tipo: "audio", texto: "Dona Sueli, peço que deixe o celular comigo na terça-feira.", momento: "2026-10-29T21:52:00Z" }] };
  const p = promptCobranca(c, new Date("2026-11-09T13:00:00Z"));
  assert.ok(p.includes("há 11 dias") && p.includes("filho de Sueli Aparecida") && p.includes("deixe o celular"));
  assert.ok(p.includes("segunda-feira") && p.includes("10:00"), "data e hora de Brasília com o dia da semana");
  assert.ok(p.includes("novamente") && p.includes("cobrar = false") && p.includes("nunca \"consulta\""));
  assert.deepEqual(ESQ_COBRANCA.required, ["cobrar", "mensagem"]);
  console.log("ok F422aj cobranca");
}

{ // F422ak · a sugestão do andamento sai da ficha
  const p = promptAndamento({ conversa_id: "c", contato: "Roseli", cliente: "Roseli Teste", casos: [{ beneficio: "Aux. Incapacidade Temporária", fase: "judicial",
    etapa: "ação distribuída", etapa_sugerida: "aguardando sentença", etapa_sugerida_desde: "2026-09-28",
    andamentos: [{ em: "2026-11-03T19:06:13Z", origem: "pje", texto: "PJe (1º grau): Conclusos para julgamento — em 28.09.2026 14:23 — PJEC 5001864-28.2026.4.03.6314" }] }],
    mensagens: [{ direcao: "entrada", por_bot: false, tipo: "texto", texto: "Gostaria de saber como está o andamento do processo", momento: "2026-11-09T12:00:00Z" }] },
    new Date("2026-11-09T12:30:00Z"));
  assert.ok(p.includes("Conclusos para julgamento") && p.includes("aguardando sentença"), "o andamento e a etapa dos portais vão ao modelo");
  assert.ok(!p.includes("5001864"), "o número do processo vai mascarado");
  assert.ok(p.includes("aproximadamente 6 meses") && p.includes("*28/09/2026*"), "as estimativas e o negrito do WhatsApp");
  assert.ok(p.includes("em 28.09.2026 14:23"), "a data do fato não é mascarada");
  assert.equal(mascararMenosDatas("em 28/09/2026 — 5001864-28.2026.4.03.6314"), "em 28/09/2026 — [número]");
  assert.deepEqual(ESQ_ANDAMENTO.required, ["sugerir", "mensagem"]);
  console.log("ok F422ak andamento");
}

{ // F476 · o golpe é reconhecido pela decisão e pela fala do cliente
  const msg = (texto) => [{ direcao: "entrada", por_bot: false, tipo: "texto", texto, momento: "2026-11-09T16:04:27Z" }];
  const fala = "Boa tarde, ô Paulo, eu estou me ligando com o seu nome, com o seu telefone, eu acho que é trato igual da outra vez";
  assert.ok(ehGolpe({ acao: "equipe", assunto: "cliente recebeu ligação suspeita", resposta: "" }, msg(fala)), "ligação em nome do escritório");
  assert.ok(ehGolpe({ acao: "equipe", assunto: "possível golpe do falso advogado", resposta: "" }, msg("oi")), "o assunto diz golpe");
  assert.ok(!ehGolpe({ acao: "responder", assunto: "golpe", resposta: "" }, msg(fala)), "só na ação equipe");
  assert.ok(!ehGolpe({ acao: "equipe", assunto: "benefício cortado", resposta: "" }, msg("posso pagar o atendimento por pix?")), "pix comum não é golpe");
  console.log("ok F476 golpe");
}
{ // F484 · o cliente que quer pagar o escritório recebe os dados do contexto; o golpe continua golpe
  const base = { contato: "Maria", advogado: "Dr. Paulo", advogados: ["Dr. Paulo"], modo: "", respostas: 0, horario: true, agenda: true, agora: "09/11/2026 16:30", cliente: null };
  const com = promptPlantao({ ...base, pagamento: "PIX: chave fictícia 000.000.000-00", mensagens: [{ direcao: "entrada", texto: "manda seu pix", momento: "2026-11-09T19:14:00Z" }] });
  assert.ok(com.includes("Dados de pagamento do escritório") && com.includes("chave fictícia 000.000.000-00"), "os dados vão no contexto");
  assert.ok(com.includes("não é golpe") && com.includes("para liberar valores"), "a regra separa pagar o escritório do golpe");
  const sem = promptPlantao({ ...base, mensagens: [] });
  assert.ok(!sem.includes("Dados de pagamento do escritório"), "sem configuração, nenhum dado");
  assert.ok(!ehGolpe({ acao: "responder", assunto: "pagamento", resposta: "" }, [{ direcao: "entrada", texto: "Por favor manda seu Pix pq não tenho mais" }]), "pagar não é golpe");
  console.log("ok F484 pagamento");
}
