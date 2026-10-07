// ATENDIMENTO PELO CRM (o que o escritório usava no SMBot): abas Pendentes /
// Atendendo / Retornos / Encerradas, setor e etiquetas na conversa, protocolo,
// "/" das mensagens prontas, agendar, responder citando, reagir e encerrar com
// observação. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const Z1 = "d1000000-0000-0000-0000-000000000001", Z2 = "d1000000-0000-0000-0000-000000000002";
const SETOR = "e1000000-0000-0000-0000-000000000001", ETQ = "e2000000-0000-0000-0000-000000000001";
const AT1 = "e3000000-0000-0000-0000-000000000001";
const T = {
  zap_conversas: [
    { id: Z1, telefone: "5516999990001", chave: "99990001", nome_perfil: "Cliente Ficta", cliente_id: CLI_CHEIO, atendente_id: null,
      status: "aberta", nao_lidas: 1, ultima_em: "2026-10-05T13:00:00Z", ultimo_texto: "Chegou carta do INSS", bot_ativo: false,
      setor_id: SETOR, atendimento_id: AT1, fixada: true },
    { id: Z2, telefone: "5511988887777", chave: "88887777", nome_perfil: "Outra pessoa", cliente_id: null, atendente_id: null,
      status: "resolvida", nao_lidas: 0, ultima_em: "2026-10-04T13:00:00Z", ultimo_texto: "obrigada", bot_ativo: false },
  ],
  zap_mensagens: [
    { id: "m1", seq: 1, conversa_id: Z1, direcao: "entrada", tipo: "texto", texto: "Chegou carta do INSS marcando perícia", externo_id: "WA1", status: "entregue", criado_em: "2026-10-05T12:59:00Z" },
    { id: "m2", seq: 2, conversa_id: Z1, direcao: "entrada", tipo: "texto", texto: "pode ser de manhã?", externo_id: "WA2", responde_externo: "WA1", status: "entregue", criado_em: "2026-10-05T13:00:00Z" },
  ],
  zap_setores: [{ id: SETOR, nome: "Jurídico", cor: "#7a3fd1", ordem: 1, ativo: true }],
  zap_etiquetas: [{ id: ETQ, texto: "URGENTE", cor: "#d32f2f", ordem: 1 }],
  zap_conversa_etiquetas: [{ conversa_id: Z1, etiqueta_id: ETQ }],
  zap_retornos: [{ id: "r1", conversa_id: Z1, quando: "2026-10-06T12:00:00Z", colaborador_id: null, nota: "ver perícia", feito_em: null }],
  zap_reacoes: [{ mensagem_id: "m1", de: "cliente", emoji: "🙏" }],
  zap_atendimentos: [{ id: AT1, numero: 4217 }],
};

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  const escritas = [];
  await ctx.route(SUPA + "/**", rota => {
    const u = decodeURIComponent(rota.request().url()), m = rota.request().method();
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    if (m !== "GET") {
      const corpo = rota.request().postData();
      escritas.push({ u, m, b: corpo ? JSON.parse(corpo) : null });
      if (/rpc\/zap_encerrar/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: "4217" });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const conv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (conv) corpo = corpo.filter(x => x.conversa_id === conv[1]);
    const id = u.match(/[?&]id=eq\.([0-9a-z-]+)/);
    if (id) corpo = corpo.filter(x => x.id === id[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  await p.evaluate(() => { D.modelos = [{ id: "mo1", titulo: "Lembrete de perícia", atalho: "pericia", contexto: "pericia", texto: "Olá, {primeiro_nome}! Lembrete da perícia." }]; });

  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  const abas = await p.textContent(".zl-cab");
  conf("filas como no SMBot: Minhas, Pendentes, Todas, Retornos e Encerradas", ["Minhas", "Pendentes", "Todas", "Retornos", "Encerradas"].every(x => abas.includes(x)));
  const cartao = await p.textContent(`.zap-conv[data-zc="${Z1}"]`);
  conf("o cartão mostra setor, etiqueta e o retorno marcado, no grupo das fixadas", cartao.includes("Jurídico") && cartao.includes("URGENTE") && cartao.includes("Retorno") && (await p.textContent(".zl-lista")).startsWith("Fixadas"));
  await p.click('[data-zf="retornos"]');
  conf("a aba Retornos traz só quem tem retorno", await p.$$eval(".zap-conv", cs => cs.length) === 1);
  await p.click('[data-zf="fim"]');
  conf("Encerradas traz a resolvida", (await p.textContent(".zap-lado")).includes("Outra pessoa"));
  await p.click('[data-zf="todas"]');

  await p.click(`.zap-conv[data-zc="${Z1}"]`);
  await p.waitForSelector(".zap-topo");
  const topo = await p.textContent(".zap-topo");
  conf("o cabeçalho tem protocolo, setor, etiquetas, retorno e encerrar", topo.includes("Protocolo 4217") && topo.includes("Jurídico") && topo.includes("URGENTE") && topo.includes("Retorno") && topo.includes("Encerrar"));
  const painel = await p.textContent("#zap-painel");
  conf("o painel ao lado mostra o cliente vinculado e o caso", painel.includes("Abrir ficha") && painel.includes("Caso"));
  conf("a resposta do cliente mostra a mensagem citada", (await p.textContent("#zb-m2 .zap-cit")).includes("Chegou carta do INSS"));
  conf("a reação do cliente aparece embaixo da mensagem", (await p.textContent("#zap-msgs")).includes("🙏"));

  // "/" abre as mensagens prontas pelo atalho
  await p.fill("#zap-txt", "/peri");
  await p.dispatchEvent("#zap-txt", "input");
  conf("digitar / mostra as mensagens prontas pelo atalho", (await p.textContent("#zap-sug")).includes("/pericia"));
  await p.click("#zap-sug button");
  conf("escolher preenche o campo com o nome", (await p.inputValue("#zap-txt")).startsWith("Olá,") && !(await p.inputValue("#zap-txt")).includes("{primeiro_nome}"));

  // responder citando
  await p.evaluate(() => responderMsg("m1"));
  conf("responder mostra a faixa da mensagem citada", (await p.textContent(".zap-resp")).includes("Chegou carta"));
  await p.fill("#zap-txt", "Pode sim, às 9h");
  await p.click("#zap-enviar");
  await p.waitForTimeout(300);
  const env = escritas.find(e => e.m === "POST" && /zap_mensagens/.test(e.u) && e.b && e.b.texto === "Pode sim, às 9h");
  conf("o envio leva a citação (responde_a) e vai para a fila", env && env.b.responde_a === "m1" && env.b.status === "fila");

  // agendar
  await p.fill("#zap-txt", "Lembrete: amanhã é a perícia");
  await p.evaluate(() => agendarZap());
  await p.fill("#za-dia", "2030-01-10");
  await p.fill("#za-hora", "08:30");
  await p.click("#za-ok");
  await p.waitForTimeout(300);
  const ag = escritas.find(e => e.m === "POST" && /zap_mensagens/.test(e.u) && e.b && e.b.status === "agendada");
  conf("agendar grava a mensagem como agendada, com a hora", ag && ag.b.texto.includes("amanhã") && /^2030-01-10T11:30/.test(ag.b.enviar_em));

  // reagir
  await p.evaluate(() => reagirMsg("m2"));
  await p.click('[data-zr="👍"]');
  await p.waitForTimeout(300);
  const rc = escritas.find(e => /zap_reacoes/.test(e.u));
  conf("reagir põe a reação do escritório na fila da ponte", rc && rc.b.emoji === "👍" && rc.b.status === "fila" && rc.b.de === "escritorio");

  // F188 · áudio gravado não sai sozinho: fica a prévia com Enviar áudio
  const antesAudio = escritas.length;
  await p.evaluate(() => { zapAudio = { blob: new Blob(["x"], { type: "audio/webm" }), conversa: zapAberta, url: "blob:teste" }; pintarConversaGuardando(); });
  conf("áudio gravado mostra a prévia com Enviar áudio e não grava nada sozinho",
    (await p.textContent(".zap-audio-prev")).includes("Enviar áudio") && escritas.length === antesAudio);
  await p.evaluate(() => { descartarAudioZap(); pintarConversaGuardando(); });
  conf("descartar some com a prévia", !(await p.$(".zap-audio-prev")));

  // encerrar com observação
  await p.evaluate(() => encerrarConversa());
  await p.fill("#ze-obs", "Perícia confirmada para dia 10");
  await p.click("#ze-ok");
  await p.waitForTimeout(400);
  const enc = escritas.find(e => /rpc\/zap_encerrar/.test(e.u));
  conf("encerrar chama zap_encerrar com a observação", enc && enc.b.p_obs === "Perícia confirmada para dia 10" && enc.b.p_conversa === Z1);

  // F185 · corrigir a conexão pelo CRM: o pedido vai para zap_comando
  conf("sem sinal da ponte, a lista oferece Corrigir conexão", (await p.textContent(".zl-topo .zap-estado")).includes("Corrigir conexão"));
  await p.evaluate(() => { D.config.set("zap_status", "ligado"); D.config.set("zap_visto_em", new Date().toISOString()); abrirConexaoZap(); });
  await p.click('#zx-painel button:has-text("Reconectar agora")');
  await p.waitForTimeout(300);
  const cmd = escritas.find(e => /config_app/.test(e.u) && e.b && e.b.chave === "zap_comando");
  conf("Reconectar grava o pedido para a ponte (zap_comando)", cmd && /^reconectar\|/.test(cmd.b.valor));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
