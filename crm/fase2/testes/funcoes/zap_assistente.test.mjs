// node --experimental-strip-types testes/funcoes/zap_assistente.test.mjs
import assert from "node:assert/strict";
import { mascarar, transcricao, pedidosAbertos, promptRascunho, primeiroNome, guardarNumeros, devolverNumeros, promptCorrigir } from "../../zap_assistente/index.ts";

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
const g = guardarNumeros("o atendimento é dia 12/11 às 9h30, valor R$ 100,00, protocolo 1725551766871");
assert.ok(!/\d{3,}/.test(g.sem.replace(/⟦\d+⟧/g, "")), "nenhum número fica no texto que vai ao modelo");
assert.equal(devolverNumeros(g.sem, g.nums), "o atendimento é dia 12/11 às 9h30, valor R$ 100,00, protocolo 1725551766871");
assert.ok(promptCorrigir("x", "Maria").includes("Não acrescente informação") && promptCorrigir("x", "", true).includes("nota interna"));
console.log("zap_assistente: ok");
