// node --experimental-strip-types crm/fase2/testes/funcoes/link_previa.test.mjs
import assert from "node:assert/strict";
const { urlPermitida, lerMeta } = await import("../../link_previa/index.ts");

assert.ok(urlPermitida("https://www.gov.br/inss/pt-br"));
for (const ruim of ["http://localhost/x", "http://127.0.0.1/", "http://10.0.0.1/", "http://[::1]/", "ftp://a.com/",
  "https://a.com:8080/", "http://user:p@a.com/", "http://intranet/", "https://x.supabase.co/rest/v1/", "javascript:alert(1)", "http://meu.local/"])
  assert.equal(urlPermitida(ruim), null, ruim);

const m = lerMeta(`<html><head><title>Título &amp; reserva</title>
  <meta property="og:title" content="INSS &#8211; Meu INSS"><meta content='Serviços do INSS' name="description">
  <meta property="og:image" content="/img/capa.png"><meta property="og:site_name" content="gov.br"></head>`, "https://www.gov.br/inss/a");
assert.deepEqual(m, { titulo: "INSS – Meu INSS", descricao: "Serviços do INSS", imagem: "https://www.gov.br/img/capa.png", site: "gov.br" });
const s = lerMeta("<title> Só o título </title><meta property=og:image content=http://a.com/i.png>", "https://www.exemplo.com.br/");
assert.deepEqual(s, { titulo: "Só o título", descricao: "", imagem: "", site: "exemplo.com.br" });
console.log("link_previa: 3 grupos ok");
