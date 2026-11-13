// node --experimental-strip-types testes/funcoes/zap_assistente.test.mjs
import assert from "node:assert/strict";
import { mascarar, transcricao, pedidosAbertos, promptRascunho, primeiroNome, guardarNumeros, devolverNumeros, promptCorrigir, promptOutra, promptAprofundar, quemEscreve, linhaAnd, ESQUEMA_APROF, RX_DOC_DECISIVO, linhaDoc } from "../../zap_assistente/index.ts";

assert.equal(mascarar("meu CPF 123.456.789-09 e NB 1234567890"), "meu CPF [número] e NB [número]");
assert.equal(mascarar("dia 12/03 às 9h, 3 filhos"), "dia 12/03 às 9h, 3 filhos", "data curta e número pequeno ficam");
const t = transcricao([
  { direcao: "entrada", por_bot: false, tipo: "texto", texto: "oi, telefone 16 99999-0000", criado_em: "2026-10-25T10:00:00Z" },
  { direcao: "interna", por_bot: false, tipo: "texto", texto: "nota da equipe", criado_em: "2026-10-25T10:01:00Z" },
  { direcao: "saida", por_bot: true, tipo: "texto", texto: "menu", criado_em: "2026-10-25T10:02:00Z" },
  { direcao: "entrada", por_bot: false, tipo: "audio", texto: null, criado_em: "2026-10-25T10:03:00Z" },
]);
assert.ok(!t.includes("nota da equipe"), "nota interna não vai ao modelo");
assert.ok(t.includes("Cliente: oi, telefone [número]") && t.includes("Robô: menu") && t.includes("[audio]"));
assert.deepEqual(pedidosAbertos([{ caso_id: "k1", itens: [{ nome: "RG", entregue: null }, { nome: "CNIS", entregue: "2026-10-01" }] }]), ["RG (caso k1)"]);
assert.equal(primeiroNome("Maria da Silva"), "Maria");
assert.ok(promptRascunho("Maria", [], "x").includes("Não prometa resultado"));
assert.ok(promptRascunho("Maria", [], "x", "Assine como equipe.").includes("Instruções do escritório (seguem as proibições acima):\nAssine como equipe."));
assert.ok(!promptRascunho("Maria", [], "x", "  ").includes("Instruções do escritório"));
// F479 · os números não passam pelo modelo e voltam iguais
const g = guardarNumeros("o atendimento é dia 12/11 às 9h30, valor R$ 100,00, protocolo 1700000000000");
assert.ok(!/\d{3,}/.test(g.sem.replace(/⟦\d+⟧/g, "")), "nenhum número fica no texto que vai ao modelo");
assert.equal(devolverNumeros(g.sem, g.nums), "o atendimento é dia 12/11 às 9h30, valor R$ 100,00, protocolo 1700000000000");
assert.ok(promptCorrigir("x", "Maria").includes("Não acrescente informação") && promptCorrigir("x", "", true).includes("nota interna"));
assert.equal(mascarar("a senha é Abc@1234"), "a senha é [senha]", "F515 · a senha não vai ao modelo");
// F563 · Outra e Aprofundar
const q = quemEscreve("Amanda", "advogado");
assert.ok(q.includes("Amanda") && q.includes("primeira pessoa do singular"));
const o = promptOutra("Maria", [], "x", q, "Seu processo está em análise.", "mais curta");
assert.ok(o.includes("<anterior>") && o.includes("não a repita") && o.includes("mais curta") && o.includes("Não prometa resultado"));
assert.ok(!promptOutra("Maria", [], "x", q).includes("<anterior>"), "sem anterior, sem o bloco");
const a = promptAprofundar("Maria", { casos: ["B31 · fase inss"], anotacoes: [], andamentos: ["andamento do PAT de 05/11/2026: exigência, CPF 123.456.789-09"], eventos: [], agenda: ["13/11 9h · Paulo"], prazos: [] }, "x", q);
assert.ok(a.includes("<andamentos_dos_portais>") && a.includes("[número]") && !a.includes("123.456"), "o CPF dos dados sai mascarado");
assert.ok(a.includes("<anotacoes_do_escritorio>\nnada registrado") && a.includes("13/11 9h · Paulo") && a.includes('"bases"'));
assert.equal(linhaAnd({ origem: "pat", criado_em: "2026-11-05T10:00:00Z", texto: "Em  análise\n" }), "andamento do PAT de 05/11/2026: Em análise");
assert.deepEqual(ESQUEMA_APROF.required, ["texto", "bases", "pendencias"]);
// F578 · continuidade e fontes datadas
assert.ok(o.includes("Continue a conversa") && a.includes("dd/mm/aaaa"));
// F579 · documento decisivo lido pelo texto e o que falta declarado
assert.ok(RX_DOC_DECISIVO.test("Comunicação de decisão") && RX_DOC_DECISIVO.test("Laudo pericial") && !RX_DOC_DECISIVO.test("RG"));
assert.equal(linhaDoc({ nome: "Laudo pericial", criado_em: "2026-11-05T10:00:00Z", texto: "Conclusão: incapaz." }), "Laudo pericial, de 05/11/2026:\nConclusão: incapaz.");
const a2 = promptAprofundar("Maria", { casos: [], anotacoes: [], andamentos: [], eventos: [], agenda: [], prazos: [], documentos: ["Laudo pericial, de 05/11/2026:\nCPF 123.456.789-09 incapaz"] }, "x", q);
assert.ok(a2.includes("<documentos_decisivos>") && !a2.includes("123.456") && a2.includes("pendencias"));
console.log("zap_assistente: ok");

// F580: mensagem encaminhada pelo cliente vem marcada para a IA
assert.match(transcricao([{ direcao: "entrada", por_bot: false, tipo: "texto", texto: "Seu benefício foi liberado", encaminhada: 2, criado_em: "2026-11-13T12:00:00Z" }]), /Cliente: \[encaminhada\] Seu benefício/);
console.log("F580 assistente ok");
