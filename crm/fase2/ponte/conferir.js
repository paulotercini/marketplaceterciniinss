#!/usr/bin/env node
// Confere tudo o que a ponte precisa ANTES de ler o QR code.
//
// Descobrir que a chave está errada depois de ler o QR no celular é perda de
// tempo e de paciência. Este script fala com o banco, com o Storage e com as
// funções, e diz em português o que está faltando.
//
// Uso:  node conferir.js

const fs = require("fs");
const path = require("path");

for (const linha of (fs.existsSync(path.join(__dirname, ".env"))
    ? fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n") : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const BASE = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const CHAVE = process.env.SUPABASE_SERVICE_KEY || "";
const BALDE = process.env.BUCKET || "anexos";
const PASTA = process.env.PASTA_SESSAO || path.join(__dirname, "sessao");

let falhas = 0;
const ok = (t, extra = "") => console.log("  ✅", t, extra);
const nao = (t, comoResolver) => { falhas++; console.log("  ❌", t);
                                   console.log("     →", comoResolver); };

async function bater(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
               "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  return { status: r.status, corpo: await r.text() };
}

// A chave anon e a service_role parecem iguais de longe. Usar a errada dá um
// erro de permissão obscuro lá na frente — melhor avisar agora.
function papelDaChave(k) {
  if (k.startsWith("sb_publishable_")) return "publicável";
  if (k.startsWith("sb_secret_")) return "secreta";
  try {
    const p = JSON.parse(Buffer.from(k.split(".")[1], "base64").toString());
    return p.role || "desconhecido";
  } catch { return "desconhecido"; }
}

(async () => {
  console.log("\nConferindo a ponte do WhatsApp\n");

  console.log("1) O arquivo .env");
  if ((!BASE || !CHAVE) && !fs.existsSync(path.join(__dirname, ".env")))
    nao("não existe .env nesta pasta", "rode: cp .env.exemplo .env  e preencha");
  if (!BASE) nao("SUPABASE_URL vazio", "Supabase → Settings → API → Project URL");
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(BASE))
    nao(`SUPABASE_URL com cara estranha: ${BASE}`,
        "tem de ser https://seu-projeto.supabase.co, sem barra no fim");
  else ok("endereço do projeto", BASE);

  if (!CHAVE) nao("SUPABASE_SERVICE_KEY vazio", "Supabase → Settings → API → service_role");
  else {
    const papel = papelDaChave(CHAVE);
    if (papel === "anon" || papel === "publicável")
      nao("essa é a chave PÚBLICA, não a service_role",
          "pegue a que está escondida atrás de 'Reveal' em Settings → API");
    else ok("chave", `parece ser a de serviço (${papel})`);
  }
  if (falhas) { console.log("\nArrume o .env primeiro.\n"); process.exit(1); }

  console.log("\n2) O banco responde?");
  let r;
  try { r = await bater("/rest/v1/zap_conversas?select=id&limit=1"); }
  catch (e) { nao("não consegui falar com o Supabase: " + e.message,
                  "confira a internet da máquina e o endereço do projeto");
              console.log(); process.exit(1); }

  if (r.status === 401 || r.status === 403)
    nao("o banco recusou a chave", "copie de novo a service_role, inteira");
  else if (r.status === 404)
    nao("a tabela zap_conversas não existe",
        "rode o crm/fase2/schema.sql no SQL Editor do Supabase");
  else if (r.status >= 400) nao(`o banco respondeu ${r.status}`, r.corpo.slice(0, 200));
  else ok("tabelas do WhatsApp no lugar");

  const f = await bater("/rest/v1/rpc/fone_chave",
                        { method: "POST", body: JSON.stringify({ t: "+55 (16) 99999-0000" }) });
  if (f.corpo.replace(/"/g, "") === "99990000") ok("funções do banco no lugar");
  else nao("a função fone_chave não respondeu como devia",
           "rode o schema.sql de novo — ele é seguro de repetir");

  console.log("\n3) Onde as fotos e áudios vão ser guardados");
  const b = await bater(`/storage/v1/bucket/${BALDE}`);
  if (b.status === 200) ok(`balde "${BALDE}"`, "pronto");
  else nao(`não achei o balde "${BALDE}" no Storage`,
           "o schema.sql cria; se rodou e não apareceu, crie à mão como PRIVADO");

  console.log("\n4) A sessão do WhatsApp");
  if (fs.existsSync(PASTA) && fs.readdirSync(PASTA).length)
    ok("já existe sessão nesta pasta", "— vai reconectar sem pedir QR");
  else console.log("  ℹ️  ainda não há sessão: o QR code vai aparecer ao rodar a ponte");

  console.log(falhas
    ? `\n${falhas} problema(s) para resolver antes de subir a ponte.\n`
    : "\nTudo certo. Pode rodar:  node ponte.js\n");
  process.exit(falhas ? 1 : 0);
})();
