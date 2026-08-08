#!/usr/bin/env node
// Plano B, parte 1: gera o coletor que roda DENTRO do seu navegador logado.
//
// Por que assim: o e-Recursos bloqueia acesso automatizado de fora (trava a
// conexão, recusa o token) pela "impressão digital" do programa — nenhum
// truque de cabeçalho engana isso. Só um navegador de verdade passa. Então a
// coleta roda no SEU navegador (já logado), e só o resultado vem para o CRM.
//
// Uso:  node preparar.js
//   → escreve coletar.txt. Abra, copie TUDO, cole no Console do navegador
//     (na página consultaprocessos.inss.gov.br logada) e rode. Ele baixa
//     crps_coletado.json. Depois:  node ingerir.js crps_coletado.json

const fs = require('fs');
const path = require('path');

for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';
const PAUSA = Number(process.env.CRPS_PAUSA_MS || 3000);

async function sb(caminho) {
  const r = await fetch(BASE + caminho, { headers: { apikey: CHAVE, Authorization: `Bearer ${CHAVE}` } });
  if (!r.ok) throw new Error(`${caminho} -> ${r.status} ${await r.text()}`);
  return JSON.parse(await r.text());
}
function numerosDe(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const nups = arr.map(n => String(n).replace(/\D/g, '')).filter(Boolean);
  const unico = (k.crps_nup || '').replace(/\D/g, '');
  if (unico && !nups.includes(unico)) nups.push(unico);
  return nups;
}

// o script que vai rodar no navegador (o {{NUPS}} e {{PAUSA}} são trocados)
const MOLDE = `// ── COLE ISTO NO CONSOLE (F12) da página consultaprocessos.inss.gov.br logada ──
// Se pedir, digite  allow pasting  e Enter antes de colar.
(async () => {
  const NUPS = {{NUPS}};
  const PAUSA = {{PAUSA}};
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const bruto = localStorage.getItem('ifs_auth');
  const cands = [null];
  if (bruto) { cands.push(bruto); try { const j = JSON.parse(bruto);
    ['access_token','accessToken','token','id_token','jwt'].forEach(k => {
      if (typeof j[k] === 'string') cands.push(j[k]); }); } catch (e) {} }
  const consultar = async (sis, nup, tok) => {
    try { const r = await fetch('/api/v1/' + sis + '/' + nup, {
      credentials: 'include', headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
      return { status: r.status, body: await r.text() }; }
    catch (e) { return { status: -1, body: String(e) }; } };
  let modo = null;
  for (let i = 0; i < cands.length && modo === null; i++) {
    const r = await consultar('esisrec', NUPS[0], cands[i]);
    if (r.status === 200) { modo = cands[i]; break; } await pausa(800); }
  console.log('Autenticação:', modo === null ? 'nenhuma deu 200 (você está logado?)' : 'ok');
  const out = { quando: new Date().toString(), itens: {} };
  let n = 0, ok = 0;
  for (const nup of NUPS) {
    let r = await consultar('esisrec', nup, modo);
    if (r.status !== 200) { await pausa(500); const rb = await consultar('recben', nup, modo);
      if (rb.status === 200) r = rb; }
    out.itens[nup] = { status: r.status, body: r.body };
    if (r.status === 200) ok++;
    console.log((++n) + '/' + NUPS.length + '  ' + nup + '  HTTP ' + r.status);
    await pausa(PAUSA);
  }
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'crps_coletado.json'; a.click();
  console.log('PRONTO! ' + ok + '/' + NUPS.length + ' com dados. Baixou crps_coletado.json.');
  console.log('Agora rode no computador:  node ingerir.js crps_coletado.json');
})();
`;

async function main() {
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }
  const casos = await sb('/rest/v1/casos?select=id,crps_nup,crps_nups,crps&fase=neq.encerrado');
  const nups = [...new Set(casos.flatMap(numerosDe))];
  if (!nups.length) { console.log('Nenhum recurso vinculado ainda (rode o importar_favoritos primeiro).'); return; }
  const script = MOLDE
    .replace('{{NUPS}}', JSON.stringify(nups))
    .replace('{{PAUSA}}', String(PAUSA));
  const saida = path.join(__dirname, 'coletar.txt');
  fs.writeFileSync(saida, script);
  console.log(`Pronto: ${nups.length} recurso(s) para coletar.`);
  console.log(`Escrevi o coletor em  coletar.txt`);
  console.log('\nAgora:');
  console.log('  1. Abra consultaprocessos.inss.gov.br e faça login no gov.br.');
  console.log('  2. Aperte F12 → Console (se pedir, digite  allow pasting  e Enter).');
  console.log('  3. Abra coletar.txt, copie TUDO, cole no Console e rode.');
  console.log('  4. Ele baixa crps_coletado.json. Então rode:  node ingerir.js crps_coletado.json');
}

module.exports = { numerosDe };
if (require.main === module) main().catch(e => { console.error('falhou:', e.message); process.exit(1); });
