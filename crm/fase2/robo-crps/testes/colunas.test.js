// Escrevi `casos?select=id,nome,crps` num script e só descobri rodando contra
// o banco: 400, "column casos.nome does not exist" — o caso tem `titulo`, quem
// tem `nome` é o cliente. Este teste lê o schema.sql e confere que toda coluna
// pedida num select existe mesmo na tabela, sem precisar de rede nem de chave.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SCHEMA = fs.readFileSync(path.join(RAIZ, '..', 'schema.sql'), 'utf8');

// tabela -> colunas declaradas (inclusive as acrescentadas por alter table)
function lerSchema(sql) {
  const tabelas = new Map();
  const criar = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_]+)\s*\(([\s\S]*?)\n\);/gi;
  for (const m of sql.matchAll(criar)) {
    const cols = new Set();
    for (const linha of m[2].split('\n')) {
      const c = linha.match(/^\s{2}([a-z_]+)\s+\S/);
      // "  primary key (...)" e "  check (...)" não são colunas
      if (c && !['primary', 'foreign', 'unique', 'check', 'constraint'].includes(c[1])) cols.add(c[1]);
    }
    tabelas.set(m[1], cols);
  }
  const acrescentar = /alter\s+table\s+(?:if\s+exists\s+)?([a-z_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_]+)/gi;
  for (const m of sql.matchAll(acrescentar))
    if (tabelas.has(m[1])) tabelas.get(m[1]).add(m[2]);
  // views: o schema pode expor tabela derivada; aceitamos qualquer coluna nelas
  for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+([a-z_]+)/gi))
    if (!tabelas.has(m[1])) tabelas.set(m[1], null);
  return tabelas;
}

const TABELAS = lerSchema(SCHEMA);

test('o schema.sql foi lido de verdade', () => {
  assert.ok(TABELAS.has('casos'), 'não achei a tabela casos no schema.sql');
  assert.ok(TABELAS.get('casos').has('titulo'));
  assert.ok(!TABELAS.get('casos').has('nome'), 'casos não tem coluna nome');
});

test('todo select dos scripts pede coluna que existe', () => {
  const erros = [];
  for (const arq of fs.readdirSync(RAIZ).filter(f => f.endsWith('.js'))) {
    const txt = fs.readFileSync(path.join(RAIZ, arq), 'utf8');
    for (const m of txt.matchAll(/\/rest\/v1\/([a-z_]+)\?select=([a-z_,]+)/g)) {
      const [, tabela, lista] = m;
      const cols = TABELAS.get(tabela);
      if (cols === undefined) { erros.push(`${arq}: tabela "${tabela}" não existe no schema.sql`); continue; }
      if (cols === null) continue;                       // view: não sabemos as colunas
      for (const c of lista.split(',').filter(Boolean))
        if (!cols.has(c)) erros.push(`${arq}: ${tabela}.${c} não existe`);
    }
  }
  assert.deepStrictEqual(erros, []);
});
