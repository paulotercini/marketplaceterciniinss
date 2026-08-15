// F15 — contraste e alvo de toque. Este teste não olha para a tela: ele MEDE.
//
// A auditoria que originou a F15 foi feita no sistema em uso, e a primeira
// versão dela estava errada — ignorava o canal alfa e comparava texto claro
// com fundo transparente, acusando defeitos que não existiam. Aqui a medida
// compõe o alfa subindo toda a cadeia de pais, que é o que o olho vê.
//
// O que este arquivo prova:
//   1. nenhum texto visível fica abaixo de 4,5:1 (3:1 se for grande)
//   2. nenhum botão fica abaixo de 24×24 px, ou tem folga que feche os 24
//   3. as cores que a F15 trocou estão nos valores medidos, e não voltaram
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { FIX, SESSAO, CLI_CHEIO } = require("./fixturas");
const SUPA = "https://ficticio.supabase.co";

// um colaborador de cor CLARA, que é o caso que quebrava a letra do avatar
FIX.colaboradores.push({ id: "a0000000-0000-0000-0000-0000000000f1", nome: "Amanda Ficticia",
  inicial: "A", cor: "#E6A700", cargo: "estagiaria", email: "a@ex.com", ativo: true });

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
  }, [SUPA, SESSAO]);
  await ctx.route(SUPA + "/**", rota => {
    const u = rota.request().url();
    if (/\/auth\/v1\//.test(u))
      return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSAO) });
    const t = (u.match(/\/rest\/v1\/([a-z_]+)/) || [])[1];
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    let corpo = FIX[t] || [];
    const f = u.match(/cliente_id=eq\.([0-9a-f-]+)/);
    if (f) corpo = corpo.filter(x => x.cliente_id === f[1]);
    return rota.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(corpo) });
  });
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", e => erros.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error") erros.push("console: " + m.text()); });
  await p.goto(`http://127.0.0.1:${s.address().port}/app.html`);
  await p.waitForSelector("#app.logado");
  const ok = []; const conf = (n, v) => ok.push([n, !!v]);

  // ── a régua, injetada na página ─────────────────────────────────────────
  await p.addInitScript(() => {});
  await p.evaluate(() => {
    const parse = c => {
      const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null;
      const q = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
      return { r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 };
    };
    const sobre = (f, t) => ({ r: f.r * f.a + t.r * (1 - f.a), g: f.g * f.a + t.g * (1 - f.a),
                               b: f.b * f.a + t.b * (1 - f.a), a: 1 });
    // o fundo real é a pilha de fundos dos pais composta de cima para baixo
    const fundoDe = el => {
      let cor = { r: 255, g: 255, b: 255, a: 1 }; const pilha = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c && c.a > 0) pilha.push(c);
        if (c && c.a === 1) break;
      }
      for (let i = pilha.length - 1; i >= 0; i--) cor = sobre(pilha[i], cor);
      return cor;
    };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    window.__razao = (a, b) => { const L1 = lum(parse(a)), L2 = lum(parse(b));
      return +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))).toFixed(2); };
    // uma assinatura por combinação de classe e pai: sem isso a varredura
    // percorre milhares de cartões iguais e trava a página
    const assin = el => el.tagName + "." + (typeof el.className === "string" ? el.className.trim() : "")
      + ">" + (el.parentElement ? el.parentElement.tagName + "."
        + (typeof el.parentElement.className === "string" ? el.parentElement.className.trim() : "") : "");
    window.__medir = () => {
      const contraste = [], alvos = [], vistos = new Set();
      for (const el of document.querySelectorAll("body *")) {
        const a = assin(el); if (vistos.has(a)) continue;
        const st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") continue;
        const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
        vistos.add(a);
        if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
          const fg0 = parse(st.color);
          if (fg0) {
            const bg = fundoDe(el), fg = fg0.a < 1 ? sobre(fg0, bg) : fg0;
            const L1 = lum(fg), L2 = lum(bg);
            const cr = +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))).toFixed(2);
            const px = parseFloat(st.fontSize), peso = parseInt(st.fontWeight) || 400;
            const alvo = (px >= 24 || (px >= 18.66 && peso >= 700)) ? 3 : 4.5;
            if (cr < alvo - 0.02) contraste.push({ sel: a.split(">")[0].toLowerCase(), cr, alvo, px,
              txt: el.textContent.trim().slice(0, 24),
              cor: `rgb(${Math.round(fg.r)},${Math.round(fg.g)},${Math.round(fg.b)})`,
              fundo: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
          }
        }
        if (el.matches("button,a[href],a[onclick],input[type=checkbox],input[type=radio],select,[role=button]")) {
          // a 2.5.8 aceita alvo menor quando a FOLGA em volta fecha os 24px
          const m = getComputedStyle(el);
          const fw = r.width + parseFloat(m.marginLeft || 0) + parseFloat(m.marginRight || 0);
          const fh = r.height + parseFloat(m.marginTop || 0) + parseFloat(m.marginBottom || 0);
          if (fw < 24 || fh < 24)
            alvos.push({ sel: a.split(">")[0].toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
              fw: Math.round(fw), fh: Math.round(fh), txt: (el.title || el.textContent || "").trim().slice(0, 22) });
        }
      }
      return { contraste, alvos };
    };
  });

  // ── 1. os valores que a F15 fixou continuam lá ──────────────────────────
  const tok = await p.evaluate(() => {
    const g = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return { cinzaClaro: g("--cinza-claro"), laranja: g("--laranja"), azulClaro: g("--azul-claro") };
  });
  conf(`--cinza-claro escureceu para #666B74 (${tok.cinzaClaro})`, tok.cinzaClaro.toUpperCase() === "#666B74");
  conf(`--laranja escureceu para #9C4607 (${tok.laranja})`, tok.laranja.toUpperCase() === "#9C4607");
  conf(`--azul-claro clareou para #A8C0F7 (${tok.azulClaro})`, tok.azulClaro.toUpperCase() === "#A8C0F7");
  conf("o CPF do cartão passa sobre branco",
    (await p.evaluate(() => window.__razao(getComputedStyle(document.documentElement)
      .getPropertyValue("--cinza-claro").trim().replace(/^#(..)(..)(..)$/,
        (_, a, b, c) => `rgb(${parseInt(a,16)},${parseInt(b,16)},${parseInt(c,16)})`), "rgb(255,255,255)"))) >= 4.5);

  // ── 2. o chip de filtro aceso ───────────────────────────────────────────
  const chip = await p.evaluate(() => {
    const el = document.querySelector(".meio .fchip.on") || document.querySelector(".fchip.on");
    if (!el) return null;
    const st = getComputedStyle(el);
    return { cor: st.color, fundo: st.backgroundColor, cr: window.__razao(st.color, st.backgroundColor) };
  });
  conf(`o chip de filtro aceso deixou de ser azul sobre azul (${chip ? chip.cr : "sem chip"}:1)`,
    chip && chip.cr >= 4.5);

  // ── 3. a letra do avatar troca de cor quando o fundo é claro ────────────
  const av = await p.evaluate(() => {
    const d = document.createElement("div");
    d.innerHTML = '<span class="avatar mini" style="background:#E6A700">A</span>'
      + '<span class="avatar mini" style="background:#2B5FC7">P</span>';
    document.body.appendChild(d);
    return new Promise(r => setTimeout(() => {
      const [a, b] = d.querySelectorAll(".avatar");
      r({ claro: getComputedStyle(a).color, claroCr: window.__razao(getComputedStyle(a).color, "rgb(230,167,0)"),
          escuro: getComputedStyle(b).color, escuroCr: window.__razao(getComputedStyle(b).color, "rgb(43,95,199)") });
    }, 120));
  });
  conf(`sobre o âmbar a inicial fica escura (${av.claro}, ${av.claroCr}:1)`, av.claroCr >= 4.5);
  conf(`sobre o azul a inicial continua branca (${av.escuro}, ${av.escuroCr}:1)`,
    /255, 255, 255/.test(av.escuro) && av.escuroCr >= 4.5);

  // ── 4. varredura das telas ──────────────────────────────────────────────
  const TELAS = ["meudia", "acervo", "fase:inss", "fase:escritorio", "fase:judicial",
                 "importante", "agenda", "quadro", "config"];
  const achados = { contraste: [], alvos: [] };
  for (const v of TELAS) {
    await p.evaluate(x => { filtroColab = null; visao = x; render(); }, v);
    await p.waitForTimeout(450);
    const r = await p.evaluate(() => window.__medir());
    r.contraste.forEach(x => achados.contraste.push({ ...x, tela: v }));
    r.alvos.forEach(x => achados.alvos.push({ ...x, tela: v }));
  }
  const cr = achados.contraste.map(x => `${x.tela}/${x.sel} ${x.cr}:1 (mín ${x.alvo}) ${x.px}px ${x.cor} sobre ${x.fundo} "${x.txt}"`);
  const al = achados.alvos.map(x => `${x.tela}/${x.sel} ${x.w}x${x.h} (com folga ${x.fw}x${x.fh}) "${x.txt}"`);
  conf(`nenhum texto abaixo do contraste mínimo em ${TELAS.length} telas${cr.length ? "\n          " + cr.join("\n          ") : ""}`,
    cr.length === 0);
  conf(`nenhum alvo de clique abaixo de 24x24${al.length ? "\n          " + al.join("\n          ") : ""}`,
    al.length === 0);

  // ── 5. os três botões da lateral, um a um ───────────────────────────────
  const bts = await p.evaluate(() => ["#btn-lateral", "#btn-som", ".usuario .sair"].map(s => {
    const el = document.querySelector(s); if (!el) return { s, falta: true };
    const r = el.getBoundingClientRect();
    return { s, w: Math.round(r.width), h: Math.round(r.height) };
  }));
  bts.forEach(b => conf(`${b.s} tem área de toque (${b.falta ? "não achei" : b.w + "x" + b.h})`,
    !b.falta && b.w >= 24 && b.h >= 24));

  // ── 6. o Quadro, que era o pior ─────────────────────────────────────────
  await p.evaluate(() => { visao = "quadro"; render(); });
  await p.waitForTimeout(600);
  const col = await p.evaluate(() => {
    const h = document.querySelector(".coluna h4"); if (!h) return null;
    return { cr: window.__razao(getComputedStyle(h).color,
      getComputedStyle(h.closest(".coluna")).backgroundColor), cor: getComputedStyle(h).color };
  });
  conf(`o cabeçalho da coluna do Quadro saiu de 2,39:1 (${col ? col.cr : "sem coluna"}:1)`,
    col && col.cr >= 4.5);
  const q = await p.$(".kanban");
  if (q) await q.screenshot({ path: path.join(__dirname, "f15-quadro.png") });
  await p.evaluate(() => { visao = "meudia"; render(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(__dirname, "f15-meudia.png") });

  console.log("=== contraste e alvo de toque (F15) ===");
  ok.forEach(([n, v]) => console.log((v ? "PASSOU  " : "FALHOU  ") + n));
  console.log("erros de console:", erros.length ? erros : "nenhum");
  const ruins = ok.filter(x => !x[1]).length;
  console.log(`${ok.length - ruins}/${ok.length} passaram`);
  await nav.close(); s.close();
  process.exit(ruins ? 1 : 0);
})().catch(e => { console.error("FALHOU:", e.message); process.exit(1); });
