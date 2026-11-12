import { test } from "node:test";
import assert from "node:assert/strict";
const m = await import("../../caso_resumo/index.ts");

const RECORTE = `DOS PEDIDOS. Requer a concessão da aposentadoria da pessoa com deficiência, desde a DER em 15/03/2024, com o reconhecimento do período rural de 02/12/1978 a 05/10/1986 e do tempo especial de 05/10/1994 a 03/05/1996 na Empresa Teste por ruído de 87 dBA. Pede deferimento.`;

test("mascarar mantém datas e esconde números longos", () => {
  const s = m.mascarar("CPF 12345678901 em 02/12/1978");
  assert.match(s, /\[número\]/);
  assert.match(s, /02\/12\/1978/);
});

test("duracao conta pelo calendário", () => {
  assert.equal(m.duracao("1978-12-02", "1986-10-05"), "7a 10m");
  assert.equal(m.duracao("1994-10-05", "1996-05-03"), "1a 6m");
  assert.equal(m.duracao("2020-01-01", "2020-12-31"), "1a");
});

test("dataNoTrecho exige a data no texto", () => {
  assert.ok(m.dataNoTrecho("02/12/1978", "rural de 02/12/1978 a 05/10/1986"));
  assert.ok(!m.dataNoTrecho("03/12/1978", "rural de 02/12/1978 a 05/10/1986"));
});

const resp = {
  tipo: "concessao", beneficio: "Aposentadoria PcD", beneficio_trecho: "aposentadoria da pessoa com deficiência",
  der: "15/03/2024", der_trecho: "desde a DER em 15/03/2024",
  objetos: [
    { natureza: "rural", inicio: "02/12/1978", fim: "05/10/1986", local: "", motivo: "", trecho: "período rural de 02/12/1978 a 05/10/1986" },
    { natureza: "especial", inicio: "05/10/1994", fim: "03/05/1996", local: "Empresa Teste", motivo: "ruído de 87 dBA", trecho: "tempo especial de 05/10/1994 a 03/05/1996 na Empresa Teste" },
    { natureza: "comum", inicio: "01/01/2000", fim: "01/01/2005", local: "", motivo: "", trecho: "vínculo comum de 2000 a 2005 inventado" },
    { natureza: "rural", inicio: "01/01/1970", fim: "05/10/1986", local: "", motivo: "", trecho: "período rural de 02/12/1978 a 05/10/1986" },
  ],
};

test("conferirResposta tira o inventado e monta períodos", () => {
  const r = m.conferirResposta(resp, { recorte: RECORTE, hoje: "2026-11-12", fase: "judicial", der_caso: "2024-03-15" });
  assert.equal(r.periodos.length, 2);
  assert.equal(r.periodos[0].dur, "7a 10m");
  assert.equal(r.periodos[1].local, "Empresa Teste");
  assert.equal(r.faltas.length, 2);
  assert.equal(r.der, "15/03/2024");
  assert.equal(r.avisos.length, 0);
  assert.match(r.texto, /^Ação de concessão de Aposentadoria PcD \(DER 15\/03\/2024\) em que buscamos/);
});

test("DER divergente vira aviso e prevalece a do caso; CRPS é recurso", () => {
  const r = m.conferirResposta(resp, { recorte: RECORTE, hoje: "2026-11-12", fase: "conselho", der_caso: "2024-04-01" });
  assert.equal(r.der, "01/04/2024");
  assert.equal(r.avisos.length, 1);
  assert.equal(r.tipo, "Recurso ordinário");
});

test("sem benefício nem DER, vão às faltas", () => {
  const r = m.conferirResposta({ tipo: "concessao", objetos: [] }, { recorte: RECORTE, hoje: "2026-11-12", fase: "judicial" });
  assert.ok(r.faltas.includes("benefício"));
  assert.ok(r.faltas.includes("DER"));
});

test("montarFrase corta acima de 60 palavras", () => {
  const ob = Array.from({ length: 30 }, (_, i) => ({ natureza: "comum", inicio: `01/01/${1980 + i}`, fim: `31/12/${1980 + i}`, local: "Empresa Teste Ltda", motivo: "" }));
  const f = m.montarFrase("Ação de concessão", "Aposentadoria", "01/01/2024", ob);
  assert.match(f, /e mais \d+\.$/);
  assert.ok(f.split(/\s+/).length <= 70);
});
