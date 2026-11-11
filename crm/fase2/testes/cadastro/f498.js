// F498 · o Gravar das Anotações do atendimento: grava, manda à função atendimento_transcricao e põe o texto
// no campo para conferir, sem gravar a anotação sozinho; a falha guarda a gravação para Repetir.
// Microfone e MediaRecorder simulados, banco simulado. Uso: node f498.js
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const SUPA = "https://ficticio.supabase.co";
const OUT = process.argv[2] || "/tmp/f498";
fs.mkdirSync(OUT, { recursive: true });

const A = "c0000000-0000-0000-0000-000000000a34";
const K1 = "b0000000-0000-0000-0000-000000000a34", K2 = "b0000000-0000-0000-0000-000000000b34";
const CNIS = { em: "2026-10-08", nome: "Rosalina Ficta Moura", paginas: 3, qtVinculos: 1, nits: [], contribSemPerda: 150, indicadores: [],
  vinculos: [{ seq: 1, tipo: "Empregado", origem: "LOJAS FICTICIAS LTDA", codigo: "11.444.777/0001-61", inicio: "01/03/2012", fim: "31/05/2019", ultRemun: "05/2019", aberto: false, indicadores: [] },
    { seq: 2, tipo: "Benefício", especie: "31", origem: "AUXILIO DOENCA PREVIDENCIARIO", nb: "6123456780", inicio: "10/03/2018", fim: "20/05/2018", situacao: "CESSADO", aberto: false }],
  analise: { abertos: [], errosEmp: [], abaixo: [{ comp: "03/2018" }, { comp: "04/2018" }, { comp: "05/2018" }, { comp: "09/2018" }], mesAnt: "09/2026", agora: { tipo: "empregado" }, benefAtivos: [], qtComps: 174,
    contagem: { periodos: [["2012-03", "2019-05"]], carencia: 174, anos: 14, meses: 6, foraMinimo: 0 } } };
const dados = {};
for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "lembretes", "analises_direito", "anexos",
  "aposentadorias", "lista_pref", "andamento_tarefas", "modelos_mensagem", "credencial_vis", "apagados", "credenciais", "atribuicoes"]) dados[t] = [];
Object.assign(dados, { colaboradores: FIX.colaboradores, clientes: JSON.parse(JSON.stringify(FIX.clientes)), casos: JSON.parse(JSON.stringify(FIX.casos)),
  documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: FIX.config_app });
const pre = (id, pc, esp, ad) => ({ id, cliente_id: A, titulo: "", fase: "escritorio", pre_caso: true, beneficio: esp, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [],
  arquivados: {}, marcadores: [], origem_lista: "🙋 Escritório", precaso: { id: pc, natureza: "", marc: {}, honorarios: "", quem: null, em: "2026-10-12" }, ad, criado_em: "2026-10-12T12:00:00Z" });
dados.clientes.push({ id: A, nome: "Rosalina Ficta Moura", cpf: "70010020133", dn: "1962-04-20", sexo: "F", criado_em: "2026-10-01T12:00:00Z",
  dossie: { meuinss: { em: "2026-10-08T10:00:00Z" } }, triagem: { pdf: { cnis: CNIS } }, campos: {} });
dados.casos.push(pre(K1, "pc_r1", "", { fora: [], beneficios: { tempo: ["idade"], incapacidade: ["b31"] }, valores: {}, tempos: [] }),
  pre(K2, "pc_r2", "BPC/LOAS", { fora: [], beneficios: { bpc: ["idoso"] }, valores: {}, tempos: [] }));
dados.anexos.push({ id: "ax_res", cliente_id: A, origem: "dossie", nome: "CNIS · CNIS resumido (vinculos).pdf", caminho: "dossie/70010020133/CNIS/CNIS resumido (vinculos).pdf", tipo: "application/pdf", criado_em: "2026-10-08T10:00:00Z" },
  { id: "ax_dec", cliente_id: A, origem: "dossie", nome: "Declaracao · Declaracao de beneficiario.pdf", caminho: "dossie/70010020133/Declaracao/Declaracao de beneficiario.pdf", tipo: "application/pdf", criado_em: "2026-10-08T10:00:00Z" });
const banco = new Banco(dados);
const T = banco.t;

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
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(([u, ss]) => {
    localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
    localStorage.setItem("crm_sessao", JSON.stringify(ss));
    localStorage.setItem("crm_tema", "v10");
  }, [SUPA, SESSAO]);
  await instalarBanco(ctx, { SUPA, SESSAO, banco });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await ctx.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { const t = window._trilha = { stop() {} }; return { getTracks: () => [t] }; };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window._acesa = (window._acesa || 0) + 1; return { release() { window._acesa--; } }; } } });
    window.MediaRecorder = class { constructor() { this.mimeType = "audio/webm;codecs=opus"; this.state = "inactive"; }
      static isTypeSupported() { return true; }
      start() { this.state = "recording"; }
      requestData() {}
      stop() { this.state = "inactive"; this.ondataavailable({ data: new Blob([new Uint8Array(5000)]) }); this.onstop(); } };
  });
  let falhar = true, comResumo = false, pedidos = [];
  await ctx.route(/functions\/v1\/atendimento_transcricao/, async r => {
    pedidos.push({ tipo: r.request().headers()["content-type"], tam: (r.request().postDataBuffer() || []).length, url: r.request().url() });
    if (/json/.test(r.request().headers()["content-type"])) return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ resumo: "Resumo dos dois trechos.\nDefinir retorno." }) });
    if (falhar) return r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ erro: "ElevenLabs: 503" }) });
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ texto: "[00:00] Falante 1: Bom dia.\n[00:04] Falante 2: Trabalhei na roça.", falantes: 2, minutos: 1, segundos: 300, ...(comResumo ? { resumo: "Informou que trabalhou na roça.\nDefinir retorno." } : {}) }) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push(e.message));
  p.on("dialog", d => d.accept());
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado", { timeout: 15000 });
  await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
  const ir = async v => { await p.evaluate(x => irSubCad(x), v); await p.waitForTimeout(400); };
  const caixa = () => p.evaluate(() => { const e = document.getElementById("atend-conversa"); if (!e || e.offsetParent === null && getComputedStyle(e).position !== "fixed") return null;
    const r = e.getBoundingClientRect(); return { fixo: getComputedStyle(e).position === "fixed", dir: Math.round(innerWidth - r.right), larg: Math.round(r.width), aberto: e.open }; });
  await p.evaluate(([a, x]) => abrirAtendimentoDe(a, x), [A, "pc_r1"]); await p.waitForTimeout(500);
  await p.click(".atend-notas-bt"); await p.waitForTimeout(200);
  const rot = () => p.evaluate(() => { const b = document.getElementById("atend-gravar"); return b ? b.querySelector("[aria-hidden]").textContent : null; });
  conf("o campo das anotações tem o botão Gravar", await rot() === "Gravar");
  await p.click("#atend-gravar"); await p.waitForTimeout(200);
  conf("gravando, o botão vira Parar", await rot() === "Parar");
  await p.click("#atend-gravar"); await p.waitForTimeout(500);
  conf(`a gravação vai à função como áudio (${JSON.stringify(pedidos)})`, pedidos.length === 1 && /^audio\/webm/.test(pedidos[0].tipo) && pedidos[0].tam === 5000);
  conf("a falha guarda a gravação: Repetir e Descartar", await rot() === "Repetir" && await p.$("#atend-descartar") !== null);
  falhar = false;
  await p.click("#atend-gravar"); await p.waitForTimeout(500);
  const txt = await p.inputValue("#atend-nota");
  conf("o Repetir reenvia e a transcrição vai ao campo, com os falantes", pedidos.length === 2 && /Transcrição do atendimento .*2 falantes/.test(txt) && /Falante 2: Trabalhei na roça/.test(txt));
  conf("nada é gravado na ficha sem o Anotar", !((T.clientes.find(x => x.id === A).campos || {}).atendimento || []).length);
  conf("o botão volta a Gravar, sem Descartar", await rot() === "Gravar" && await p.$("#atend-descartar") === null);
  comResumo = true; const antes = await p.inputValue("#atend-nota"); await p.fill("#atend-nota", "");
  await p.click("#atend-gravar"); await p.waitForTimeout(200); await p.click("#atend-gravar"); await p.waitForTimeout(500);
  const txt2 = await p.inputValue("#atend-nota");
  conf("com o resumo, ele vem primeiro e a transcrição completa abaixo", /^Informou que trabalhou na roça\.\nDefinir retorno\.\n\nTranscrição completa \(.*2 falantes\):\n\[00:00\] Falante 1/.test(txt2));
  await p.fill("#atend-nota", antes);
  await p.click(".atend-conv-nova .adr-primario"); await p.waitForTimeout(500);
  conf("o Anotar grava a transcrição conferida", /Falante 1: Bom dia/.test((((T.clientes.find(x => x.id === A).campos || {}).atendimento || [])[0] || {}).texto || ""));
  // F532: o Gravar ao lado da ⭐ da ficha; fora do atendimento a transcrição abre na ⚡ anotação rápida do cliente
  await p.evaluate(a => { window.confirm = () => true; return sairModoAtendimento(a, true); }, A).catch(() => {}); await p.waitForTimeout(500);
  await p.evaluate(a => abrirFicha(a), A); await p.waitForTimeout(600);
  conf("a ficha tem o Gravar no canto, junto da ⭐", await p.evaluate(() => { const b = document.getElementById("ficha-gravar"); return !!b && !!(b.nextElementSibling && b.nextElementSibling.matches(".det-mais-col")) && b.offsetParent !== null; }));
  await p.click("#ficha-gravar"); await p.waitForTimeout(200);
  conf("gravando, o botão fica vermelho", await p.evaluate(() => document.getElementById("ficha-gravar").classList.contains("gravando")));
  await p.click("#ficha-gravar"); await p.waitForTimeout(600);
  const r3 = await p.evaluate(() => ({ t: (document.getElementById("ar-texto") || {}).value || "", cli: arCliSel }));
  conf("a transcrição abre na anotação rápida, com o cliente da ficha", r3.cli === A && /^Informou que trabalhou na roça/.test(r3.t) && /Falante 2: Trabalhei/.test(r3.t));
  // F537: a tela fica acesa enquanto grava; a gravação interrompida fica no aparelho e volta com Continuar, e os trechos viram um resumo só
  await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.click("#ficha-gravar"); await p.waitForTimeout(300);
  const ac = await p.evaluate(() => [window._acesa, !!atendRec]); conf(`gravando, a tela fica acesa (Wake Lock) ${ac}`, ac[0] === 1);
  await p.evaluate(() => window._trilha.onended()); await p.waitForTimeout(400);
  conf("o microfone encerrado ao sair do app não transcreve: fica Continuar e a tela é solta", await p.evaluate(() => atendGravado && atendGravado.interrompida && window._acesa === 0 && document.getElementById("ficha-gravar").classList.contains("pendente")));
  const nPed = pedidos.length;
  await p.reload(); await p.waitForSelector("#app.logado", { timeout: 15000 }); await p.waitForTimeout(2500);
  conf("depois de recarregar, a gravação volta do aparelho", await p.evaluate(() => !!(atendGravado && atendGravado.interrompida && atendGravado.segs.length === 1)));
  await p.evaluate(a => abrirFicha(a), A); await p.waitForTimeout(600);
  await p.click("#ficha-gravar"); await p.waitForTimeout(300);
  conf("Continuar retoma a gravação", await p.evaluate(() => !!atendRec));
  await p.click("#ficha-gravar"); await p.waitForTimeout(800);
  const novos = pedidos.slice(nPed);
  conf(`os dois trechos vão um a um, o segundo com o tempo do primeiro, e o resumo sai do texto junto (${novos.map(x => x.url.split("?")[1] || x.tipo).join(" | ")})`,
    novos.length === 3 && /resumo=nao&desde=0$/.test(novos[0].url) && /resumo=nao&desde=300$/.test(novos[1].url) && /json/.test(novos[2].tipo));
  const r4 = await p.evaluate(() => (document.getElementById("ar-texto") || {}).value || "");
  conf("a anotação rápida recebe o resumo único e a transcrição dos dois trechos", /^Resumo dos dois trechos\./.test(r4) && /10 min/.test(r4) && (r4.match(/Falante 2: Trabalhei/g) || []).length === 2);
  conf("transcrito, o aparelho não guarda mais a gravação", await p.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); atendGravado = null; await verGravacaoGuardada(); return !atendGravado; }));
  conf("sem erro de página", !erros.length);
  await nav.close(); s.close();
  const n = ok.filter(x => x[1]).length; console.log(`\nF498: ${n}/${ok.length}`);
  process.exit(n === ok.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
