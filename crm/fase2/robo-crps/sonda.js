// Sonda do e-Recursos (CRPS) — coleta amostras da API para desenhar o robô.
//
// O que ela faz: abre um navegador controlado, espera VOCÊ fazer o login no
// gov.br, e depois consulta os processos do nups.txt direto na API que o
// próprio site usa por baixo (api/v1/esisrec e api/v1/recben), um de cada
// vez, com pausa entre eles — o site não gosta de pressa. Salva tudo em
// sonda_resultado/ para você me mandar.
//
// Uso:  node sonda.js        (passo a passo completo no PASSO-A-PASSO-SONDA.md)
const fs = require('fs');
const path = require('path');

const BASE = 'https://consultaprocessos.inss.gov.br';
const PASTA_PERFIL = path.join(__dirname, 'perfil');          // sessão fica aqui
const PASTA_SAIDA = path.join(__dirname, 'sonda_resultado');
const ESPERA_ENTRE_MS = 4000;   // pausa entre consultas
const ESPERA_LOGIN_MIN = 5;     // quanto tempo eu espero você logar

// Aceita tanto o número puro quanto a URL inteira do favorito.
function lerNups(texto) {
  const nups = [];
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/\/e\/p\/(\d{10,25})/) || linha.match(/(\d{15,25})/);
    if (m && !nups.includes(m[1])) nups.push(m[1]);
  }
  return nups;
}

// O crachá pode ser o texto cru do localStorage ou um campo dentro de um JSON.
// Devolve os candidatos na ordem de tentativa (null = só o cookie da sessão).
function candidatosDeToken(bruto) {
  const c = [null];
  if (!bruto) return c;
  c.push(bruto);
  try {
    const j = JSON.parse(bruto);
    for (const k of ['access_token', 'accessToken', 'token', 'id_token', 'jwt'])
      if (typeof j[k] === 'string' && !c.includes(j[k])) c.push(j[k]);
  } catch (e) { /* não era JSON, segue com o cru */ }
  return c;
}

async function consultar(page, caminho, token) {
  return page.evaluate(async ({ caminho, token }) => {
    try {
      const r = await fetch(caminho, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
        credentials: 'include',
      });
      return { status: r.status, texto: await r.text() };
    } catch (e) { return { status: -1, texto: String(e) }; }
  }, { caminho, token });
}

async function main() {
  const arqNups = path.join(__dirname, 'nups.txt');
  if (!fs.existsSync(arqNups)) {
    console.log('Falta o arquivo nups.txt nesta pasta.');
    console.log('Crie um (copie do nups.exemplo.txt) e cole 2 ou 3 links dos seus favoritos, um por linha.');
    process.exit(1);
  }
  const nups = lerNups(fs.readFileSync(arqNups, 'utf8'));
  if (!nups.length) {
    console.log('O nups.txt existe mas não achei nenhum número de processo nele.');
    console.log('Cole o link do favorito inteiro (https://consultaprocessos.inss.gov.br/e/p/...) ou só o número.');
    process.exit(1);
  }
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) {
    console.log('O navegador controlado ainda não está instalado nesta pasta.');
    console.log('Rode:  npm install  e depois  npx playwright install chromium');
    process.exit(1);
  }
  console.log(`Vou sondar ${nups.length} processo(s), com ${ESPERA_ENTRE_MS / 1000}s de pausa entre cada um.`);
  fs.mkdirSync(PASTA_SAIDA, { recursive: true });

  // O gov.br recusa o captcha quando percebe a "marca" de navegador
  // automatizado. Então usamos um navegador de VERDADE (Chrome, Comet, Edge…)
  // e removemos os sinais de automação. Ordem de escolha:
  //   1. o caminho colado em navegador.txt (ex.: o Comet)
  //   2. o Google Chrome instalado
  //   3. o Chromium que veio com o Playwright (último recurso)
  const opcoesBase = {
    headless: false, viewport: { width: 1200, height: 850 },
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--disable-blink-features=AutomationControlled'],
  };
  const arqNav = path.join(__dirname, 'navegador.txt');
  const caminhoNav = fs.existsSync(arqNav)
    ? fs.readFileSync(arqNav, 'utf8').split(/\r?\n/).map(s => s.trim())
        .find(s => s && !s.startsWith('#')) : null;
  let ctx;
  if (caminhoNav && fs.existsSync(caminhoNav)) {
    console.log('Usando o navegador que você indicou em navegador.txt.');
    ctx = await chromium.launchPersistentContext(PASTA_PERFIL, { ...opcoesBase, executablePath: caminhoNav });
  } else {
    if (caminhoNav) console.log('⚠ O caminho em navegador.txt não existe — vou tentar o Chrome.');
    try {
      ctx = await chromium.launchPersistentContext(PASTA_PERFIL, { ...opcoesBase, channel: 'chrome' });
      console.log('Usando o seu Chrome instalado.');
    } catch (e) {
      console.log('Não achei o Chrome — usando o navegador do Playwright.');
      console.log('(Se o captcha reclamar, cole o caminho do Comet em navegador.txt e rode de novo.)');
      ctx = await chromium.launchPersistentContext(PASTA_PERFIL, opcoesBase);
    }
  }
  // apaga o navigator.webdriver, o sinal mais óbvio de automação
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

  // ── espera o login ──────────────────────────────────────────────────────
  console.log('\nSe aparecer a tela do gov.br, faça o login normalmente (senha, verificação etc.).');
  console.log('Eu fico esperando. Se já estava logado da última vez, sigo sozinho.\n');
  let bruto = null;
  const tentativas = (ESPERA_LOGIN_MIN * 60) / 2;
  for (let i = 0; i < tentativas && !bruto; i++) {
    bruto = await page.evaluate(() => localStorage.getItem('ifs_auth')).catch(() => null);
    if (!bruto) await page.waitForTimeout(2000);
  }
  const jaEstavaLogado = bruto !== null;
  if (!bruto) console.log('⚠ Não vi o crachá do login em ' + ESPERA_LOGIN_MIN + ' min — vou tentar mesmo assim, só com o cookie.');
  else console.log('Login visto ✔ — começando as consultas.\n');

  // ── descobre COMO autenticar (preciso disso para o robô) ────────────────
  const resumo = [];
  resumo.push(`sonda em ${new Date().toString()}`);
  resumo.push(`sessão reaproveitada sem login novo: ${jaEstavaLogado ? 'não sei (crachá presente ao abrir)' : 'não'}`);
  let modo = null, modoNome = 'nenhum funcionou';
  const cands = candidatosDeToken(bruto);
  const nomes = ['só cookie da sessão', 'localStorage cru', 'campo dentro do JSON'];
  for (let i = 0; i < cands.length && modo === null; i++) {
    for (const sis of ['esisrec', 'recben']) {
      const r = await consultar(page, `/api/v1/${sis}/${nups[0]}`, cands[i]);
      if (r.status === 200) { modo = cands[i]; modoNome = nomes[Math.min(i, 2)]; break; }
      await page.waitForTimeout(1500);
    }
  }
  resumo.push(`autenticação que funcionou: ${modoNome}`);
  console.log(`Jeito de autenticar: ${modoNome}`);

  // ── consulta cada processo nos DOIS sistemas, devagar ───────────────────
  for (const nup of nups) {
    for (const sis of ['esisrec', 'recben']) {
      const r = await consultar(page, `/api/v1/${sis}/${nup}`, modo);
      const arq = path.join(PASTA_SAIDA, `${nup}_${sis}.json`);
      fs.writeFileSync(arq, r.texto || '');
      resumo.push(`${nup} ${sis}: HTTP ${r.status}, ${(r.texto || '').length} bytes`);
      console.log(`  ${nup} ${sis}: HTTP ${r.status} (${(r.texto || '').length} bytes)`);
      await page.waitForTimeout(ESPERA_ENTRE_MS);
    }
  }

  // ── fotos da tela dos 3 primeiros, para eu casar o JSON com o que você vê
  for (const nup of nups.slice(0, 3)) {
    try {
      await page.goto(`${BASE}/e/p/${nup}`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(PASTA_SAIDA, `${nup}_tela.png`), fullPage: true });
      console.log(`  foto da tela de ${nup} ✔`);
    } catch (e) { resumo.push(`${nup} tela: falhou (${e.message.split('\n')[0]})`); }
    await page.waitForTimeout(ESPERA_ENTRE_MS);
  }

  fs.writeFileSync(path.join(PASTA_SAIDA, 'resumo.txt'), resumo.join('\n') + '\n');
  await ctx.close();
  console.log('\nPronto! Compacte a pasta sonda_resultado e me mande aqui pelo chat.');
  console.log('(Ela tem dados de cliente — só por este canal, nada de e-mail ou grupo.)');
  console.log('\nTeste bônus: rode de novo amanhã SEM fazer login. Se funcionar direto,');
  console.log('a sessão segura de um dia para o outro — isso muda o desenho do robô.');
}

module.exports = { lerNups, candidatosDeToken };
if (require.main === module) main().catch(e => { console.error('Deu errado:', e.message); process.exit(1); });
