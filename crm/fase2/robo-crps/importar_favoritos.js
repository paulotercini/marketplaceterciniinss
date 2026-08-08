#!/usr/bin/env node
// Importa os favoritos do e-Recursos: lê o HTML exportado do navegador, tira
// de cada link o número do recurso e o nome do cliente, casa com o cadastro do
// CRM e preenche casos.crps_nup — para o robô passar a acompanhar sozinho.
//
// Segurança: começa em modo SECO (não grava nada, só mostra o relatório).
// Confira o relatório e rode de novo com --aplicar para valer.
//
// Uso:  node importar_favoritos.js caminho/para/favoritos.html          (seco)
//       node importar_favoritos.js caminho/para/favoritos.html --aplicar
//
// Os marcados "senha do cliente" NÃO entram para o robô (o login é do cliente):
// saem listados à parte, para a conferência manual do André.

const fs = require('fs');
const path = require('path');

// ── configuração (.env, igual ao robô) ────────────────────────────────────
for (const linha of (fs.existsSync(path.join(__dirname, '.env'))
    ? fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n') : [])) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const CHAVE = process.env.SUPABASE_SERVICE_KEY || '';

// tira acento, caixa e espaço dobrado — para comparar nomes escritos diferente
function normalizarNome(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// lê o HTML de favoritos e devolve [{nup, nome, senhaCliente}]
function parseFavoritos(html) {
  const out = [];
  const re = /<A\s+HREF="https:\/\/consultaprocessos\.inss\.gov\.br\/e\/p\/(\d{10,25})"[^>]*>([^<]+)<\/A>/gi;
  let m;
  while ((m = re.exec(html))) {
    const nup = m[1];
    let rotulo = m[2].replace(/&amp;/g, '&').trim();
    const senhaCliente = /senha do cliente/i.test(rotulo);
    // tira a observação entre parênteses ("(Acesso com a senha do cliente)")
    const nome = rotulo.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (nup && nome) out.push({ nup, nome, senhaCliente });
  }
  // se o mesmo recurso aparecer duas vezes, fica só o primeiro
  const vistos = new Set();
  return out.filter(x => (vistos.has(x.nup) ? false : vistos.add(x.nup)));
}

// os números que um caso já tem: a lista crps_nups + o número único antigo
function nupsDoCaso(k) {
  const arr = Array.isArray(k.crps_nups) ? k.crps_nups : [];
  const nups = arr.map(n => String(n).replace(/\D/g, '')).filter(Boolean);
  const unico = (k.crps_nup || '').replace(/\D/g, '');
  if (unico && !nups.includes(unico)) nups.push(unico);
  return [...new Set(nups)];
}

// casa os favoritos com os clientes e casos do CRM; decide o destino de cada um
function planejar(favoritos, clientes, casos) {
  const porNome = new Map();
  for (const c of clientes) {
    const k = normalizarNome(c.nome);
    if (!porNome.has(k)) porNome.set(k, []);
    porNome.get(k).push(c);
  }
  const casosDe = new Map();
  for (const k of casos) {
    if (!casosDe.has(k.cliente_id)) casosDe.set(k.cliente_id, []);
    casosDe.get(k.cliente_id).push(k);
  }
  const plano = { aplicar: [], jaTem: [], senhaCliente: [], semCliente: [],
                  nomeDuplicado: [], semCaso: [], multiplosCasos: [] };
  for (const fav of favoritos) {
    if (fav.senhaCliente) { plano.senhaCliente.push(fav); continue; }
    const achados = porNome.get(normalizarNome(fav.nome)) || [];
    if (achados.length === 0) { plano.semCliente.push(fav); continue; }
    if (achados.length > 1) { plano.nomeDuplicado.push({ ...fav, clientes: achados }); continue; }
    const cli = achados[0];
    const ativos = (casosDe.get(cli.id) || []).filter(k => k.fase !== 'encerrado');
    if (ativos.length === 0) { plano.semCaso.push({ ...fav, cliente: cli }); continue; }
    // já preenchido com este mesmo número em algum caso do cliente?
    if (ativos.some(k => nupsDoCaso(k).includes(fav.nup))) {
      plano.jaTem.push({ ...fav, cliente: cli }); continue;
    }
    if (ativos.length > 1) { plano.multiplosCasos.push({ ...fav, cliente: cli, casos: ativos }); continue; }
    plano.aplicar.push({ ...fav, cliente: cli, caso: ativos[0] });
  }
  return plano;
}

// ── Supabase por REST (igual ao robô) ─────────────────────────────────────
async function sb(caminho, opts = {}) {
  const r = await fetch(BASE + caminho, {
    ...opts,
    headers: {
      apikey: CHAVE, Authorization: `Bearer ${CHAVE}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${caminho} -> ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
// PostgREST pagina em 1000; puxa tudo
async function todas(tabela, select) {
  const out = []; let de = 0;
  for (;;) {
    const parte = await sb(`/rest/v1/${tabela}?select=${select}`, {
      headers: { Range: `${de}-${de + 999}` } });
    out.push(...parte);
    if (parte.length < 1000) break;
    de += 1000;
  }
  return out;
}

async function main() {
  const arq = process.argv[2];
  const aplicar = process.argv.includes('--aplicar');
  if (!arq || !fs.existsSync(arq)) {
    console.log('Uso: node importar_favoritos.js caminho/para/favoritos.html [--aplicar]');
    process.exit(1);
  }
  if (!BASE || !CHAVE) { console.error('faltam SUPABASE_URL e SUPABASE_SERVICE_KEY no .env'); process.exit(1); }

  const favoritos = parseFavoritos(fs.readFileSync(arq, 'utf8'));
  console.log(`Li ${favoritos.length} recurso(s) nos favoritos.\n`);
  const clientes = await todas('clientes', 'id,nome');
  const casos = await todas('casos', 'id,cliente_id,fase,titulo,beneficio,crps_nup,crps_nups');
  const p = planejar(favoritos, clientes, casos);

  const lista = (t, arr, f) => { if (arr.length) {
    console.log(`\n${t} (${arr.length}):`);
    arr.forEach(x => console.log('  · ' + f(x)));
  } };
  lista('✅ Vou vincular ao robô', p.aplicar, x => `${x.nome} → ${x.caso.beneficio || x.caso.titulo}`);
  lista('↔ Já estavam vinculados', p.jaTem, x => x.nome);
  lista('🔑 Senha do cliente (ficam com o André, fora do robô)', p.senhaCliente, x => x.nome);
  lista('❓ Cliente tem mais de um caso — escolha na ficha qual recebe o número',
    p.multiplosCasos, x => `${x.nome} (${x.casos.length} casos) — nup ${x.nup}`);
  lista('⚠ Cliente sem caso ativo', p.semCaso, x => x.nome);
  lista('⚠ Nome repetido no cadastro — resolva na ficha', p.nomeDuplicado, x => x.nome);
  lista('⚠ Não achei esse cliente no CRM', p.semCliente, x => `${x.nome} — nup ${x.nup}`);

  console.log(`\nResumo: ${p.aplicar.length} a vincular, ${p.jaTem.length} já ok, `
    + `${p.senhaCliente.length} manuais (André), `
    + `${p.multiplosCasos.length + p.semCaso.length + p.nomeDuplicado.length + p.semCliente.length} a conferir.`);

  if (!aplicar) {
    console.log('\n— modo SECO: nada foi gravado. Confira acima e rode de novo com --aplicar.');
    return;
  }
  // agrupa por caso: um caso pode receber VÁRIOS recursos de uma vez
  const porCaso = new Map();
  for (const x of p.aplicar) {
    if (!porCaso.has(x.caso.id)) porCaso.set(x.caso.id, { caso: x.caso, nups: [] });
    porCaso.get(x.caso.id).nups.push(x.nup);
  }
  let casosFeitos = 0, nupsFeitos = 0;
  for (const { caso, nups } of porCaso.values()) {
    const atuais = nupsDoCaso(caso);
    const uniao = [...new Set([...atuais, ...nups])];
    await sb(`/rest/v1/casos?id=eq.${caso.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ crps_nups: uniao }) });
    casosFeitos++; nupsFeitos += nups.length;
  }
  console.log(`\n✔ ${nupsFeitos} recurso(s) vinculados em ${casosFeitos} caso(s). `
    + `O robô consulta na próxima rodada (npm run robo).`);
}

module.exports = { parseFavoritos, normalizarNome, planejar, nupsDoCaso };
if (require.main === module) main().catch(e => { console.error('importação falhou:', e.message); process.exitCode = 1; });
