// F187 · GESTOR E EQUIPE NO WHATSAPP: o gestor vê tudo e tem o Painel da
// equipe; a atendente (aqui, o próprio Paulo "vendo como colaborador") vê só
// as suas e as pendentes, lê a conversa de outra pessoa sem poder responder,
// chama quem atende com @ na nota interna, e a transferência vai pela função
// do banco com motivo. Dados fictícios.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, EU } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";
const AMANDA = "a2000000-0000-0000-0000-000000000001";
const S1 = "e1000000-0000-0000-0000-000000000001";
const DA_AMANDA = "d2000000-0000-0000-0000-000000000001", PENDENTE = "d2000000-0000-0000-0000-000000000002",
      MINHA = "d2000000-0000-0000-0000-000000000003";
const agora = new Date().toISOString();
const conv = (id, nome, atendente, extra = {}) => ({ id, telefone: "551699999" + id.slice(-4), chave: "9999" + id.slice(-4),
  nome_perfil: nome, cliente_id: null, atendente_id: atendente, status: "aberta", nao_lidas: 0,
  ultima_em: agora, ultimo_texto: "oi", bot_ativo: false, ...extra });
const T = {
  colaboradores: [...FIX.colaboradores,
    { id: AMANDA, nome: "Amanda", inicial: "A", cor: "#0a7d43", papel: "colaborador", ativo: true, atende_zap: true, cargo: "advogado" }],
  zap_conversas: [conv(DA_AMANDA, "Cliente da Amanda", AMANDA, { nao_lidas: 2 }),
                  conv(PENDENTE, "Cliente na fila", null, { setor_id: S1 }),
                  conv(MINHA, "Cliente do Paulo", EU)],
  zap_mensagens: [{ id: "m1", seq: 1, conversa_id: DA_AMANDA, direcao: "entrada", tipo: "texto", texto: "Oi, doutora", status: "entregue", criado_em: agora }],
  zap_setores: [{ id: S1, nome: "Atendimento", cor: "#5b7fd6", ordem: 1, ativo: true }],
  colaborador_setores: [{ colaborador_id: EU, setor_id: S1 }],
  zap_transferencias: [{ conversa_id: DA_AMANDA, de_id: EU, para_id: AMANDA, motivo: "caso judicial", tipo: "pessoa", por: EU, em: agora }],
  mencoes: [{ id: "mc1", de_id: AMANDA, para_id: EU, conversa_id: DA_AMANDA, texto: "💬 Amanda transferiu para você", criado_em: agora }],
};
const PAINEL = { totais: { online: 2, novas: 1, ativos: 3, pendentes: 1, retornos: 0, encerrados_hoje: 4 },
  setores: [{ id: S1, nome: "Atendimento", cor: "#5b7fd6", ordem: 1, novas: 1, ativos: 3, pendentes: 1, retornos: 0 }],
  atendentes: [{ id: AMANDA, nome: "Amanda", online: true, novas: 1, ativos: 1, retornos: 0, encerrados_hoje: 3, resposta_min: 4.5 }] };

(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1600, height: 1000 } });
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
      if (/rpc\/zap_painel/.test(u)) return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAINEL) });
      return rota.fulfill({ status: 204, body: "" });
    }
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    let corpo = T[t] || FIX[t] || [];
    const cv = u.match(/conversa_id=eq\.([0-9a-f-]+)/);
    if (cv && t !== "mencoes") corpo = corpo.filter(x => x.conversa_id === cv[1]);
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

  // ── como GESTOR ───────────────────────────────────────────────────────
  await p.evaluate(() => { zapFiltro = "todas"; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  conf("gestor: a lista tem a fila Todas e o Painel da equipe", (await p.textContent(".zl-cab")).includes("Todas") && (await p.textContent(".zl-cab")).includes("Painel da equipe"));
  conf("gestor: vê a conversa que está com a Amanda", (await p.$$eval(".zap-conv", cs => cs.length)) === 3);
  await p.evaluate(() => abrirPainelZap());
  await p.waitForSelector(".zg");
  const painel = await p.textContent(".zg");
  conf("gestor: o painel mostra totais, setor e atendente com 1ª resposta", painel.includes("Encerrados hoje") && painel.includes("Atendimento") && painel.includes("4,5 min"));
  await p.click('.zg-tab [data-zga]');
  conf("gestor: clicar no número do atendente filtra a lista por ele", (await p.$$eval(".zap-conv", cs => cs.length)) === 1);
  await p.evaluate(id => { zapChips.atendente = ""; zapChips.naoLidas = false; abrirConversa(id); }, DA_AMANDA);
  await p.waitForSelector(".zap-topo");
  conf("gestor: na conversa da Amanda aparece Assumir (tirar de Amanda)", (await p.textContent(".zap-topo")).includes("tirar de Amanda"));
  conf("gestor: o painel ao lado mostra o histórico de transferências", (await p.textContent("#zap-painel")).includes("Transferências"));
  await p.evaluate(() => transferirConversa());
  await p.fill("#zt-motivo", "é financeiro");
  await p.click(`[data-zt="${AMANDA}"]`);
  await p.waitForTimeout(300);
  const tr = escritas.find(e => /rpc\/zap_transferir/.test(e.u));
  conf("transferir chama zap_transferir com pessoa e motivo", tr && tr.b.p_para === AMANDA && tr.b.p_motivo === "é financeiro" && tr.b.p_setor === null);

  // ── como ATENDENTE (ver como colaborador) ────────────────────────────
  await p.evaluate(() => { localStorage.setItem("crm_ver_como", "colab"); zapFiltro = "todas"; zapAberta = null; irPara("whatsapp"); });
  await p.waitForSelector(".zap-conv");
  const cab = await p.textContent(".zl-cab");
  conf("atendente: sem a fila Todas e sem o Painel", !cab.includes("Todas") && !cab.includes("Painel da equipe"));
  await p.click('[data-zf="sem"]');
  conf("atendente: vê a pendente do seu setor", (await p.textContent(".zl-lista")).includes("Cliente na fila"));
  // a conversa da Amanda só aparece porque ele foi mencionado nela
  await p.evaluate(id => abrirConversa(id), DA_AMANDA);
  await p.waitForSelector(".zap-topo");
  const topo = await p.textContent(".zap-topo");
  conf("atendente: na conversa de outra pessoa não há Transferir nem Encerrar", !topo.includes("Transferir") && !topo.includes("Encerrar"));
  conf("atendente: aviso de só leitura e o campo vira nota interna", (await p.textContent(".zap-escrever")).includes("está com Amanda") && await p.evaluate(() => zapNota));
  await p.fill("#zap-txt", "@Amanda o cliente pediu retorno");
  await p.click("#zap-enviar");
  await p.waitForTimeout(400);
  const nota = escritas.find(e => /zap_mensagens/.test(e.u) && e.b && e.b.direcao === "interna");
  const menc = escritas.find(e => /\/mencoes/.test(e.u) && e.m === "POST");
  conf("a @menção na nota grava a nota e avisa a Amanda com o link da conversa", nota && menc && menc.b.para_id === AMANDA && menc.b.conversa_id === DA_AMANDA);
  await p.evaluate(() => { localStorage.removeItem("crm_ver_como"); irPara("mencoes"); });
  await p.waitForTimeout(300);
  conf("Menções: o aviso de conversa tem o botão abrir conversa", (await p.textContent("#conteudo-meio")).includes("abrir conversa"));

  for (const [n, v] of ok) console.log(`${v ? "PASSOU" : "FALHOU"}  ${n}`);
  console.log(`erros de console: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  const falhas = ok.filter(([, v]) => !v).length + erros.length;
  console.log(`${ok.length - ok.filter(([, v]) => !v).length}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("FALHA", e); process.exit(1); });
