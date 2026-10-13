// F222 · a pesquisa que não acha a pessoa oferece o ＋ Cliente, com o nome ou o
// CPF da pesquisa levados ao cadastro. Banco simulado de estado e dados fictícios.
// Uso: node f222.js [pasta-das-fotos]
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f222";
fs.mkdirSync(OUT, { recursive: true });

const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
  "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
  "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  atribuicoes: FIX.atribuicoes, documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const banco = new Banco(dados);
const T = banco.t;
T.clientes.push({ id: "c0000000-0000-0000-0000-0000000000e1", nome: "Eulália Fictícia Bastos", cpf: null, telefone: "(16) 99000-2001", campos: {}, criado_em: "2024-01-10T12:00:00Z" });

// CPF fictício com dígitos verificadores válidos
function cpfDe(base) {
  const d = base.split("").map(Number);
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += d[i] * (n + 1 - i); d.push((s * 10) % 11 % 10); }
  return d.join("");
}
const CPF_NOVO = cpfDe("700100200"), CPF_BUSCA = cpfDe("700100300");

const ok = [];
const conf = (nome, v) => { ok.push([nome, !!v]); console.log((v ? "PASSOU  " : "FALHOU  ") + nome); };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  async function entrar(largura = 1440) {
    const ctx = await nav.newContext({ viewport: { width: largura, height: 900 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
    }, [SUPA, SESSAO]);
    await instalarBanco(ctx, { SUPA, SESSAO, banco });
    const p = await ctx.newPage();
    p._erros = [];
    p.on("pageerror", e => p._erros.push(e.message));
    p.on("dialog", d => d.accept());
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
    await p.waitForSelector("#app.logado", { timeout: 15000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    return p;
  }
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const p = await entrar();
  const pesquisa = async (txt, campo = "#busca", pg = p) => { await pg.fill(campo, txt); await pg.waitForTimeout(450); };
  const saida = (pg = p) => pg.evaluate(() => { const b = document.querySelector("#conteudo-meio .busca-novo");
    return b ? { txt: b.textContent.replace(/\s+/g, " ").trim(), com: b.classList.contains("com-achados"), bt: !!b.querySelector(".bn-cli") } : null; });

  // 1 · nome que não existe: o ＋ Cliente aparece no lugar do "Nada encontrado"
  await pesquisa("joaquina ficticia lopes");
  const s1 = await saida();
  await p.screenshot({ path: path.join(OUT, "01-pesquisa-sem-cliente.png") });
  conf("o nome que não está no CRM mostra o ＋ Cliente com o nome digitado", s1 && !s1.com && s1.bt && /Ninguém com “joaquina ficticia lopes” no CRM/.test(s1.txt)
    && !(await p.evaluate(() => /Nada encontrado/.test(document.getElementById("conteudo-meio").textContent))));

  // 2 · o clique abre o Novo Cliente com o nome guardado e o cursor no CPF
  await p.click("#conteudo-meio .bn-cli");
  await espera(400);
  const t2 = await p.evaluate(() => ({ tit: document.getElementById("titulo-lista").textContent, hint: (document.querySelector(".ncl-da-busca") || {}).textContent || "",
    busca: document.getElementById("busca").value, foco: document.activeElement && document.activeElement.id }));
  await p.screenshot({ path: path.join(OUT, "02-novo-cliente-da-pesquisa.png") });
  conf("o clique abre o Novo Cliente com o nome da pesquisa à vista, a pesquisa limpa e o cursor no CPF",
    /Novo Cliente/.test(t2.tit) && /Joaquina Ficticia Lopes/.test(t2.hint) && t2.busca === "" && t2.foco === "ncl-cpf");

  // 3 · a ficha nasce com o nome da pesquisa e a etapa 2 o traz no campo, sem dossiê
  await p.fill("#ncl-cpf", CPF_NOVO);
  await p.evaluate(() => nclEtapa1());
  await p.waitForFunction(() => !!document.getElementById("ncl-nome") && document.getElementById("ncl-nome").value, null, { timeout: 10000 }).catch(() => {});
  const novo = T.clientes.find(c => (c.cpf || "").replace(/\D/g, "") === CPF_NOVO) || {};
  const nomeE2 = await p.evaluate(() => (document.getElementById("ncl-nome") || {}).value || "");
  conf("a ficha nasce com o nome da pesquisa e a etapa 2 o traz no campo quando não há CNIS", novo.nome === "Joaquina Ficticia Lopes" && nomeE2 === "Joaquina Ficticia Lopes");

  // 4 · o + Cliente da barra começa limpo, sem o nome de uma pesquisa antiga
  await p.evaluate(() => { _ncl = { etapa: 1, id: null, nomeBusca: "Pesquisa Antiga Ficticia" }; document.getElementById("btn-v10-cli").click(); });
  await espera(300);
  conf("o ＋ Cliente da barra lateral não herda o nome de uma pesquisa antiga", !(await p.evaluate(() => !!document.querySelector(".ncl-da-busca"))));

  // 5 · quem tem exatamente o nome digitado (sem contar "da") não gera o botão; o nome parcial gera, no pé da lista
  await pesquisa("Eulália da Fictícia Bastos");
  const s5a = await saida();
  await pesquisa("eulalia bastos");
  const s5b = await saida();
  await p.screenshot({ path: path.join(OUT, "03-pesquisa-com-achados.png") });
  conf("o nome igual ao de um cliente não oferece cadastro, e o parcial oferece no pé da lista", s5a === null && s5b && s5b.com && /Não é nenhum destes\?/.test(s5b.txt)
    && await p.evaluate(() => !!document.querySelector("#conteudo-meio .cartao[data-cli]")));

  // 6 · CPF válido que não está no CRM: o botão leva o CPF ao campo
  await pesquisa(CPF_BUSCA.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
  const s6 = await saida();
  await p.click("#conteudo-meio .bn-cli");
  await espera(400);
  const cpfCampo = await p.evaluate(() => (document.getElementById("ncl-cpf") || {}).value || "");
  conf("o CPF válido que não está no CRM oferece o cadastro com o CPF no campo", s6 && /o CPF \d{3}\.\d{3}\.\d{3}-\d{2}/.test(s6.txt) && cpfCampo === CPF_BUSCA);

  // 7 · número de processo e CPF inválido não viram cliente
  await pesquisa("0001111-22.2026.4.03.6314");
  const s7a = await saida(), nada = await p.evaluate(() => /Nada encontrado/.test(document.getElementById("conteudo-meio").textContent));
  await pesquisa("123.456.789-00");
  const s7b = await saida();
  conf("processo e CPF inválido não oferecem cadastro, e o Nada encontrado continua", s7a === null && nada && s7b === null);

  // 8 · celular: o botão tem alvo de toque e a tela não rola para o lado
  const cel = await entrar(390);
  await pesquisa("joaquim ficticio prado", "#busca-cel", cel);
  const c8 = await cel.evaluate(() => { const b = document.querySelector("#conteudo-meio .bn-cli");
    return { h: b ? b.getBoundingClientRect().height : 0, largo: document.documentElement.scrollWidth > window.innerWidth + 2 }; });
  await cel.screenshot({ path: path.join(OUT, "04-celular.png") });
  conf("no celular o ＋ Cliente tem 44 px de altura e a tela não rola para o lado", c8.h >= 44 && !c8.largo);

  conf("sem erro de página", !p._erros.length && !cel._erros.length);
  if (p._erros.length || cel._erros.length) console.log(p._erros.concat(cel._erros).join("\n"));
  const bons = ok.filter(x => x[1]).length;
  console.log(`\n${bons}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(bons === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
