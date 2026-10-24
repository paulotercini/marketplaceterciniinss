// Avaliação de acesso do colaborador (pedido do Paulo de 24.10.2026): entra no CRM como o Marcos, que não é
// administrador, em cada nível da transição (F249) e cargo, percorre todas as listas do menu e as abas da ficha de
// cada cliente e clica em cada botão à vista, um por vez, voltando à tela antes do clique seguinte. Falha com erro de
// página, erro no console, chamada recusada pelo banco, ou tela que o nível não libera. Banco simulado e dados
// fictícios. Uso: node acesso-colab.js [perfil] (o perfil filtra pelo nome, ex.: "nivel 0"). Leva cerca de 25 minutos
// com os seis perfis, por isso fica fora do rodar.js; rode um perfil por processo para ir mais rápido.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO } = require("./fixturas");
const { Banco, instalarBanco } = require("./banco-simulado");
const { criarGoogle, proximo, quando } = require("./google-simulado");
const SUPA = "https://ficticio.supabase.co";
const PAULO = FIX.colaboradores[0].id, MARCOS = "22222222-2222-2222-2222-222222222222", AUTH_M = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const SESSAO_M = { ...SESSAO, user: { id: AUTH_M, email: "marcos@exemplo.invalido" } };
const MAX_BOTOES = +(process.env.MAX_BOTOES || 60), MAX_MODAL = +(process.env.MAX_MODAL || 12);

const PERFIS = [
  { nome: "nivel 0 recepcao", cargo: "recepcao", trans: { ligada: true, onda: 1, nivel: 0 } },
  { nome: "nivel 1 advogado onda 1", cargo: "advogado", trans: { ligada: true, onda: 1, nivel: 1 } },
  { nome: "nivel 2 advogado onda 4", cargo: "advogado", trans: { ligada: true, onda: 4, nivel: 2 } },
  { nome: "nivel 2 recepcao onda 6", cargo: "recepcao", trans: { ligada: true, onda: 6, nivel: 2 } },
  { nome: "nivel 3 advogado", cargo: "advogado", trans: { ligada: true, onda: 6, nivel: 3 } },
  { nome: "sem transicao sem cargo", cargo: null, trans: null },
];

const iso = n => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const ts = (n, h = "12:00") => `${iso(n)}T${h}:00-03:00`;

function montarDados(perfil) {
  const d = {};
  for (const t of ["tarefas", "eventos", "pagamentos", "meu_dia", "andamentos", "sugestoes", "mencoes", "leads", "checklist_modelo", "frases_prontas",
    "lembrar_motivos", "rotinas", "rotinas_feitas", "aposentadorias", "lista_pref", "zap_conversas", "inss_calendario", "andamento_tarefas", "lembretes",
    "vinculos", "anexos", "conversas", "coletas", "modelos_mensagem", "andamentos_lidos", "credencial_vis", "analises_direito", "apagados", "credenciais"]) d[t] = [];
  const cfg = [...(FIX.config_app || [])];
  if (perfil.trans) cfg.push({ chave: "crm_transicao", valor: JSON.stringify({ ligada: perfil.trans.ligada, onda: perfil.trans.onda, niveis: { [PAULO]: 3, [MARCOS]: perfil.trans.nivel } }) });
  Object.assign(d, { colaboradores: [...FIX.colaboradores, { id: MARCOS, auth_id: AUTH_M, nome: "Marcos Fictício", inicial: "M", cor: "#8a4b00",
      papel: "colaborador", ativo: true, cargo: perfil.cargo }],
    clientes: [], casos: [], atribuicoes: [], documentos_beneficio: FIX.documentos_beneficio || [], modelos_documento: FIX.modelos_documento, config_app: cfg });
  let seq = 0;
  const id = p => `${p}0000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;
  const cli = (nome, o = {}) => { const c = { id: id("c"), nome, cpf: null, telefone: null, campos: {}, telefones: [], criado_em: ts(-400), ...o }; d.clientes.push(c); return c; };
  const caso = (c, o) => { const k = { id: id("b"), cliente_id: c.id, titulo: c.nome, protocolos: [], processos: [], crps_nups: [], crps: [], nbs: [], arquivados: {},
    marcadores: [], ronda: {}, prazos_tribunal: [], pje_links: {}, importante: false, urgente: false, dcb_prorrogacao_pedida: false, origem_lista: "🌻 INSS",
    criado_em: ts(-300), ...o }; d.casos.push(k); d.atribuicoes.push({ caso_id: k.id, colaborador_id: MARCOS }); return k; };
  const and = (k, n, texto, o = {}) => d.andamentos.push({ id: id("e"), caso_id: k.id, autor_id: PAULO, texto, origem: "app", origem_id: null, criado_em: ts(n),
    publico: false, excluir: false, importante: false, urgente: false, responde_a: null, ...o });

  const a = cli("Ana Fictícia Acesso", { cpf: "52998224725", dn: "14031962", telefone: "(16) 99999-0001", telefones: [{ numero: "(16) 99999-0001", obs: "principal", zap: true }] });
  const kA = caso(a, { beneficio: "Apos. por Idade", especie: "B41", fase: "inss", der: iso(-60), prazo: iso(-2), protocolos: ["1700000601"], etapa: "aguardando análise" });
  and(kA, -50, "Requerimento protocolado.");
  and(kA, -3, "Marcos, conferir o andamento no Meu INSS.", { importante: true });
  d.tarefas.push({ id: id("t"), caso_id: kA.id, colaborador_id: MARCOS, texto: "Conferir exigência", feita: false, prazo: iso(0), criado_em: ts(-5) });
  d.credenciais.push({ id: id("d"), cliente_id: a.id, tipo: "meu_inss", criado_em: ts(-100) });
  const kA2 = caso(a, { beneficio: "Auxílio por incapacidade temporária", especie: "B31", fase: "judicial", processos: ["50000011020264036136"], origem_lista: "👪 Judicial" });
  and(kA2, -10, "Designada perícia médica.", { origem: "pje" });
  d.eventos.push({ id: id("v"), caso_id: kA2.id, cliente_id: a.id, tipo: "Perícia", data_hora: ts(7, "09:00"), status: "agendada", local: "JEF Catanduva", criado_em: ts(-10) });
  d.pagamentos.push({ id: id("g"), caso_id: kA.id, cliente_id: a.id, descricao: "Honorários", valor: 1500, vencimento: iso(-5), status: "aberto", criado_em: ts(-30) });

  const b = cli("Bruno Fictício Conselho", { cpf: "11144477735", dn: "02021970" });
  const kB = caso(b, { beneficio: "Pensão por morte", especie: "B21", fase: "conselho", crps_nups: ["44233.000111/2026-01"], origem_lista: "🖥 Conselho de Recursos" });
  and(kB, -15, "Recurso ordinário protocolado.");

  const c = cli("Clara Fictícia Atendimento", { cpf: "39053344705", telefone: "(16) 99999-0003" });
  caso(c, { fase: "escritorio", pre_caso: true, beneficio: "Aposentadoria por idade", origem_lista: "🙋 Escritório",
    precaso: { id: "pc_acesso1", natureza: "", marc: {}, honorarios: "", quem: null, em: iso(-1) } });

  const e = cli("Elio Fictício Futuro", { cpf: "98765432100", dn: "05051965" });
  d.lembretes.push({ id: id("l"), cliente_id: e.id, tipo: "aposentadoria_futura", titulo: "Elio Fictício Futuro", detalhes: { checklist: [] }, crm: {}, proximo_em: iso(30), criado_em: ts(-90) });

  cli("Fábio Sem Cpf Prazo");
  const g = cli("Gina Fictícia Encerrada", { cpf: "71428793860" });
  caso(g, { beneficio: "BPC", especie: "B87", fase: "encerrado", encerrado: true });
  return d;
}

function google() {
  const W = proximo(3);
  const ev = (i, s, ini, fim, cor) => ({ id: i, summary: s, start: quando(W, ini), end: quando(W, fim), ...(cor ? { colorId: cor } : {}) });
  return criarGoogle({ tokens: { "tok-m": { nome: "Marcos", papel: "equipe" } }, eventos: [
    ev("M1", "002 - Michelle Fictícia - Confirmado", "09:00", "09:30", "2"), ev("M2", "LIVRE 09:30-10:00", "09:30", "10:00", "2")] });
}

const achados = [];
(async () => {
  const s = http.createServer((q, r) => {
    const a = path.join(__dirname, q.url === "/" ? "app.html" : q.url.split("?")[0]);
    if (!fs.existsSync(a)) { r.writeHead(404); return r.end("no"); }
    r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(fs.readFileSync(a));
  }).listen(0, "127.0.0.1");
  await new Promise(r => s.on("listening", r));
  const nav = await chromium.launch();
  const filtro = process.argv[2];
  for (const perfil of PERFIS.filter(x => !filtro || x.nome.includes(filtro))) {
    const banco = new Banco(montarDados(perfil)), gg = google();
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(([u, ss]) => {
      localStorage.setItem("crm_cfg", JSON.stringify({ url: u, key: "a".repeat(60) }));
      localStorage.setItem("crm_sessao", JSON.stringify(ss));
      localStorage.setItem("crm_tema", "v10");
      localStorage.setItem("crm_agenda_token", "tok-m");
      window.open = () => null;
      // link externo não sai da página do teste
      document.addEventListener("click", ev => { const l = ev.target.closest && ev.target.closest("a[href]");
        if (l && !/^(#|javascript:)/.test(l.getAttribute("href") || "")) ev.preventDefault(); }, true);
    }, [SUPA, SESSAO_M]);
    await instalarBanco(ctx, { SUPA, SESSAO: SESSAO_M, banco });
    await ctx.route(/script\.google\.com/, r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(gg.post(JSON.parse(r.request().postData() || "{}"))) }));
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1|ficticio\.supabase\.co)/, r => r.abort());
    const p = await ctx.newPage();
    let onde = "início", cliques = 0;
    const reg = (tipo, msg) => { const k = `${perfil.nome} | ${onde} | ${tipo}: ${String(msg).slice(0, 300)}`; if (!achados.includes(k)) achados.push(k); };
    p.on("pageerror", e => reg("erro de página", e.message));
    p.on("console", m => { if (m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) reg("console", m.text()); });
    p.on("response", r => { if (r.url().startsWith(SUPA) && r.status() >= 400) reg("banco " + r.status(), r.request().method() + " " + r.url().slice(SUPA.length, SUPA.length + 120)); });
    p.on("dialog", d => d.accept().catch(() => {}));
    await p.goto(`http://127.0.0.1:${s.address().port}/app.html?tema=v10`);
    await p.waitForSelector("#app.logado", { timeout: 20000 });
    await p.waitForFunction(() => typeof D !== "undefined" && D.cliPorId && D.cliPorId.size > 0);
    await p.waitForTimeout(800);
    const nivel = perfil.trans && perfil.trans.ligada ? perfil.trans.nivel : 3;
    const permitidas = await p.evaluate(() => listasDoColab());

    // os botões à vista dentro de uma raiz, identificados pelo texto e pelo onclick
    const botoes = (sel = "#app") => p.evaluate(sel => {
      const raiz = document.querySelector(sel) || document.body;
      const vistos = new Set(), out = [];
      for (const el of raiz.querySelectorAll("button,[onclick],summary,a[href^='#']")) {
        if (el.disabled || el.offsetParent === null || el.closest(".lista-item,#sidebar,.sidebar")) continue;
        const t = (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().slice(0, 60), oc = el.getAttribute("onclick") || "";
        if (/\b(sair|logout|desconectar)\b/i.test(t) || /sair\(|logout|location\.(reload|href)/.test(oc)) continue;
        const sig = t + "|" + oc.slice(0, 80);
        if (vistos.has(sig)) continue; vistos.add(sig); out.push(sig);
      }
      return out;
    }, sel);
    const clicar = (sig, sel = "#app") => p.evaluate(([sig, sel]) => {
      const raiz = document.querySelector(sel) || document.body;
      for (const el of raiz.querySelectorAll("button,[onclick],summary,a[href^='#']")) {
        if (el.disabled || el.offsetParent === null) continue;
        const t = (el.innerText || el.getAttribute("aria-label") || el.title || "").trim().slice(0, 60), oc = el.getAttribute("onclick") || "";
        if (t + "|" + oc.slice(0, 80) === sig) { el.click(); return true; }
      }
      return false;
    }, [sig, sel]);
    const vazar = async () => {
      if (nivel !== 0) return;
      const st = await p.evaluate(() => ({ visao, ficha: !!clienteAberto, sub: clienteAberto ? subCad : null, aba: abaAtiva }));
      if (!st.ficha && !permitidas.includes(st.visao)) reg("acesso", `nível 0 chegou à lista ${st.visao}`);
      if (st.ficha && (st.aba !== 0 || (st.sub && st.sub !== "identificacao")) && await p.evaluate(() => !!document.querySelector("#detalhe .sub-menu button.on:not([onclick*=identificacao])")))
        reg("acesso", `nível 0 abriu a aba ${st.aba}/${st.sub} da ficha`);
    };
    const macaco = async (restaurar) => {
      await restaurar();
      const lista = (await botoes()).slice(0, MAX_BOTOES);
      for (const sig of lista) {
        try {
          await restaurar();
          const antes = onde; onde = `${antes} > ${sig.split("|")[0] || sig.split("|")[1]}`;
          if (await clicar(sig)) {
            cliques++; await p.waitForTimeout(150); await vazar();
            // a janela que o clique abriu: cada botão dela, um por vez
            const doModal = (await botoes("#modal")).filter(x => !/^✕\|/.test(x)).slice(0, MAX_MODAL);
            for (const m of doModal) {
              await restaurar(); await clicar(sig); await p.waitForTimeout(120);
              const o2 = onde; onde = `${o2} > ${m.split("|")[0] || m.split("|")[1]}`;
              if (await clicar(m, "#modal")) { cliques++; await p.waitForTimeout(150); await vazar(); }
              onde = o2;
            }
          }
          onde = antes;
        } catch (e) { reg("teste", e.message); }
      }
    };

    // 1 · as listas do menu
    const menu = await p.evaluate(() => [...document.querySelectorAll(".lista-item[data-v]")].filter(e => e.offsetParent !== null).map(e => e.dataset.v));
    if (nivel === 0) for (const v of menu) if (!permitidas.includes(v)) reg("acesso", `nível 0 vê no menu a lista ${v}`);
    for (const v of menu) {
      onde = `lista ${v}`;
      await macaco(async () => { await p.evaluate(v => { fecharCaixa(); if (clienteAberto) fecharFicha(false);
        const el = document.querySelector(`.lista-item[data-v="${v}"]`); if (el) el.click(); }, v); await p.waitForTimeout(250); });
    }
    // 2 · a ficha de cada cliente, cada aba do topo e cada divisão do Cadastro
    const clis = await p.evaluate(() => D.clientes.map(c => [c.id, c.nome]));
    for (const [cid, nome] of clis) {
      onde = `ficha ${nome}`;
      await p.evaluate(async cid => { fecharCaixa(); await abrirFicha(cid); }, cid); await p.waitForTimeout(300); await vazar();
      const abas = await p.evaluate(() => [...document.querySelectorAll("#detalhe .mt[data-vv]")].filter(e => e.offsetParent !== null).map(e => +e.dataset.vv));
      if (nivel === 0 && abas.some(x => x !== 0)) reg("acesso", `nível 0 vê as abas ${abas.join(",")}`);
      for (const aba of abas) {
        await p.evaluate(async ([cid, aba]) => { fecharCaixa(); await abrirFicha(cid); abaAtiva = aba; repintarFicha(); }, [cid, aba]);
        const subs = aba === 0 ? await p.evaluate(() => [...document.querySelectorAll("#detalhe .sub-menu button[onclick^=irSubCad]")]
          .map(e => /irSubCad\('([^']+)'/.exec(e.getAttribute("onclick"))[1])) : [null];
        for (const sub of subs) {
          onde = `ficha ${nome} · aba ${aba}${sub ? " · " + sub : ""}`;
          await macaco(async () => { await p.evaluate(async ([cid, aba, sub]) => { fecharCaixa(); if (clienteAberto !== cid) await abrirFicha(cid);
            abaAtiva = aba; if (sub) irSubCad(sub); else repintarFicha(); }, [cid, aba, sub]); await p.waitForTimeout(200); });
        }
      }
    }
    console.log(`${perfil.nome}: ${menu.length} listas, ${clis.length} fichas, ${cliques} cliques`);
    await ctx.close();
  }
  await nav.close(); s.close();
  for (const a of achados) console.log("ACHADO  " + a);
  console.log(achados.length ? `${achados.length} achados` : "nenhum achado");
  process.exit(achados.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
