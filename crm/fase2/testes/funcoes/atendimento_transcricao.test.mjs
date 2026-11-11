// node --experimental-strip-types crm/fase2/testes/funcoes/atendimento_transcricao.test.mjs
import assert from "node:assert/strict";
const { falas, limparResumo, promptResumo, PADRAO } = await import("../../atendimento_transcricao/index.ts");

const w = (text, speaker_id, start, type = "word") => ({ text, speaker_id, start, end: start + 0.4, type });
const r = falas([
  w("Bom", "speaker_0", 0), w(" ", "speaker_0", 0.4, "spacing"), w("dia.", "speaker_0", 0.5),
  w(" ", "speaker_1", 0.9, "spacing"), w("(risos)", "speaker_1", 1, "audio_event"),
  w("Trabalhei", "speaker_1", 65), w(" ", "speaker_1", 65.4, "spacing"), w("na", "speaker_1", 65.5), w(" ", "speaker_1", 66, "spacing"), w("roça.", "speaker_1", 66.1),
  w(" ", "speaker_0", 130, "spacing"), w("Certo.", "speaker_0", 130.2),
]);
assert.equal(r.texto, "[00:00] Falante 1: Bom dia.\n[01:05] Falante 2: Trabalhei na roça.\n[02:10] Falante 1: Certo.");
assert.equal(r.falantes, 2);
assert.equal(r.minutos, 2);
// sem palavras, vale o texto solto; sem nada, vazio
assert.equal(falas([], " Olá ").texto, "Olá");
assert.equal(falas([]).texto, "");
// o resumo sai limpo: sem título, negrito, travessão nem linha em branco
assert.equal(limparResumo("Resumo do atendimento:\n\n**Tem 58 anos** — 14 de contribuição.\n\nDefinir retorno."), "Tem 58 anos, 14 de contribuição.\nDefinir retorno.");
assert.match(promptResumo("[00:00] Falante 1: Oi", "11/11/2026"), /11\/11\/2026[\s\S]*Falante 1/);
assert.match(PADRAO, /Definir retorno\./);
assert.doesNotMatch(PADRAO, /—/);
// o padrão vai inteiro: ordem das dez linhas, termos da casa e os dois exemplos
assert.match(PADRAO, /Exemplo 1, planejamento[\s\S]*Exemplo 2, incapacidade/);
assert.match(PADRAO, /perícia por Matão/);
assert.match(PADRAO, /contada do dia do atendimento/);
// linha em branco só fica junto de lista, e uma só
assert.equal(limparResumo("Tem 58 anos.\n\n\nSolicitei:\n- RG;\n- CTPS.\n\nVerificar em 15/12."), "Tem 58 anos.\nSolicitei:\n- RG;\n- CTPS.\n\nVerificar em 15/12.");
console.log("atendimento_transcricao: 4 grupos ok");
