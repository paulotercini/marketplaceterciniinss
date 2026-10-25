// node --experimental-strip-types testes/funcoes/zap_plantao.test.mjs
import assert from "node:assert/strict";
import { mascarar, transcricao, promptPlantao, ESQUEMA, regras, definicaoAgente, textoDoTurno, turno, FERRAMENTA, ferramentasDaConversa, vagasDoDia, rotulo, paraTriagem, ligacaoTriagem, AGENDAR_BULLET } from "../../zap_plantao/index.ts";

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
await assert.rejects(turno("sesn_1", "oi", falso([{ type: "session.status_idle", id: "e2", stop_reason: { type: "end_turn" } }])), /parou sem decisão/);

// F278 · a Assistente faz a triagem e o Agendador (Console) marca pela agenda do CRM
assert.deepEqual(definicaoAgente("x").tools.map((f) => f.name), ["decidir"]);
const doConsole = "Você é a assistente.\n- \"lead\": acolha.\n- \"agendar\": não use. Você mesma marca o atendimento pelas ferramentas.\n- \"equipe\": urgente.\n\n" +
  "Proibido, sem exceção: parecer.\n\nComo marcar o atendimento (quando...):\n1. consulte as vagas.\n8. Nunca invente.\n\nResponda sempre chamando a ferramenta decidir.";
const tri = paraTriagem(doConsole);
assert.ok(tri.includes(AGENDAR_BULLET) && !tri.includes("Como marcar o atendimento") && !tri.includes("Você mesma marca"));
assert.ok(tri.indexOf("Proibido") < tri.indexOf("Como encaminhar ao Agendador:") && tri.indexOf("Como encaminhar ao Agendador:") < tri.indexOf("Responda sempre chamando"));
assert.ok(tri.includes('- "lead": acolha.') && tri.includes('- "equipe": urgente.'), "o resto do texto do Console fica");
assert.equal(paraTriagem(tri), tri, "aplicar de novo não muda nada");
const lig = ligacaoTriagem({ version: 5, system: doConsole, tools: [{ type: "custom", name: "decidir" }, { type: "custom", name: "consultar_vagas" }] }, "agent_X");
assert.equal(lig.version, 5); assert.deepEqual(lig.tools.map((t) => t.name), ["decidir"]);
assert.deepEqual(lig.multiagent.subagents.predefined_agents, ["agent_X"]);
assert.equal(lig.multiagent.subagents.inline_agents.type, "disabled"); assert.equal(lig.multiagent.workflows.type, "disabled");
assert.equal(rotulo("2026-10-27", "09:30", "a Dra. Amanda"), "terça-feira, 27/10, às 9h30, com a Dra. Amanda");
assert.deepEqual(vagasDoDia([{ data: "2026-10-28", livres: { "001": [{ inicio: "14:00", eventoId: "b" }, { inicio: "15:00" }] } },
  { data: "2026-10-27", livres: { "001": [{ inicio: "09:30", eventoId: "a" }] } }, { data: "2026-10-26", bloqueado: true, livres: { "001": [{ inicio: "08:00", eventoId: "z" }] } }],
  "001", "a Dra. Amanda").map((v) => v.eventoId), ["a", "b"], "ordem de data, só vaga marcada, sem dia bloqueado");
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
assert.ok(regras().includes("seja bem-vindo(a) ao escritório Paulo R. Tercini Filho"));
console.log("zap_plantao: ok");
