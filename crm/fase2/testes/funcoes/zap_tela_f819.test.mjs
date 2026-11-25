// node testes/funcoes/zap_tela_f818.test.mjs · F819 · fila "Sem resposta há mais de 24 h" do WhatsApp (src/js/08-pericias.js)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../../src/js/08-pericias.js", import.meta.url), "utf8");
const trecho = src.slice(src.indexOf("const ZAP_CORTES"), src.indexOf("let zapMaisAberto"));
const { despedidaZap, semResp24Zap } = new Function(trecho + "; return { despedidaZap, semResp24Zap };")();
assert.ok(despedidaZap("Ok gratidão Bom dia") && despedidaZap("👍") && despedidaZap("Obrigada!") && despedidaZap("valeu"));
assert.ok(!despedidaZap("obrigada, e o processo?") && !despedidaZap("preciso do laudo"));
const velha = new Date(Date.now() - 2 * 864e5).toISOString(), nova = new Date(Date.now() - 36e5).toISOString();
assert.ok(semResp24Zap({ status: "aberta", ultima_entrada_em: velha, ultimo_texto: "e aí?" }));
assert.ok(!semResp24Zap({ status: "aberta", ultima_entrada_em: velha, ultimo_texto: "valeu" }));
assert.ok(!semResp24Zap({ status: "aberta", automatica: true, ultima_entrada_em: velha, ultimo_texto: "Fatura" }));
assert.ok(!semResp24Zap({ status: "aberta", ultima_entrada_em: nova, ultimo_texto: "e aí?" }));
assert.ok(!semResp24Zap({ status: "aberta", ultima_entrada_em: velha, ultima_resposta_em: nova, ultimo_texto: "e aí?" }));
assert.ok(!semResp24Zap({ status: "resolvida", ultima_entrada_em: velha, ultimo_texto: "e aí?" }));
console.log("F819 tela ok");
