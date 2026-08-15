-- ══════════════════════════════════════════════════════════════════════════
-- CONFERÊNCIA DO SCHEMA — o que já está no banco e o que ainda falta
-- ══════════════════════════════════════════════════════════════════════════
-- Cole no SQL Editor do Supabase e rode. Não altera nada: só lê o catálogo e
-- devolve uma linha por item, com ✅ ou ❌.
--
-- POR QUE ISTO EXISTE: o SQL Editor roda o arquivo inteiro como UMA transação.
-- Se qualquer linha der erro, TUDO volta atrás — e a tela mostra só o erro
-- daquela linha, dando a impressão de que "rodou quase todo". Foi o que
-- pode acontecer com o schema_por_em_dia.sql.
--
-- E há um segundo caso, que foi o que travou as 2.621 parcelas de verdade: o
-- índice pode EXISTIR e ainda assim não servir. Criado como parcial (com
-- `where todo_item_id is not null`), o Postgres não o infere no
-- `ON CONFLICT (todo_item_id)` que o PostgREST monta — e a importação segue
-- recusada com 42P10 sem nenhum erro aparecer no SQL Editor. Por isso a
-- conferência abaixo checa as duas coisas: se existe e se NÃO é parcial.
--
-- Como usar o resultado: o que aparecer ❌ é o que ainda precisa rodar. O
-- bloco mínimo que destrava as parcelas está no fim deste arquivo, comentado.

with esperado(secao, item, existe) as (
  -- ── 12. parcelas do To Do ────────────────────────────────────────────────
  select '12 · Pagamentos do To Do', 'pagamentos.todo_item_id (coluna)',
         exists(select 1 from information_schema.columns
                 where table_name='pagamentos' and column_name='todo_item_id')
  union all
  select '12 · Pagamentos do To Do', 'índice pagamentos_todo_item existe',
         exists(select 1 from pg_indexes
                 where tablename='pagamentos' and indexname='pagamentos_todo_item')
  union all
  -- não basta existir: PARCIAL (com WHERE) o PostgREST não consegue usar no
  -- ON CONFLICT, e a importação segue recusada com 42P10
  select '12 · Pagamentos do To Do', 'índice pagamentos_todo_item NÃO é parcial  ← foi isto que travou',
         exists(select 1 from pg_indexes
                 where tablename='pagamentos' and indexname='pagamentos_todo_item'
                   and indexdef not ilike '%where%')
  -- ── 13. o dinheiro é do cliente ─────────────────────────────────────────
  union all
  select '13 · Parcela do cliente', 'pagamentos.cliente_id',
         exists(select 1 from information_schema.columns
                 where table_name='pagamentos' and column_name='cliente_id')
  union all
  select '13 · Parcela do cliente', 'pagamentos.caso_id aceita nulo',
         exists(select 1 from information_schema.columns
                 where table_name='pagamentos' and column_name='caso_id'
                   and is_nullable='YES')
  -- ── 14. um caso, vários processos ───────────────────────────────────────
  union all
  select '14 · Vários processos', 'casos.processos',
         exists(select 1 from information_schema.columns
                 where table_name='casos' and column_name='processos')
  union all
  select '14 · Vários processos', 'casos.datajud_multi',
         exists(select 1 from information_schema.columns
                 where table_name='casos' and column_name='datajud_multi')
  -- ── 15. ficha civil (procuração, contrato, declarações) ─────────────────
  union all
  select '15 · Ficha civil', 'clientes.' || c.nome,
         exists(select 1 from information_schema.columns
                 where table_name='clientes' and column_name=c.nome)
    from (values ('rg'),('sexo'),('profissao'),('estado_civil'),
                 ('bairro'),('cidade'),('uf'),('cep'),
                 ('telefones'),('indicado_por')) as c(nome)
  -- ── anteriores, que a tela e a importação já usam ───────────────────────
  union all
  select 'anteriores', 'tabela ' || t.nome,
         exists(select 1 from information_schema.tables where table_name=t.nome)
    from (values ('coletas'),('lembretes'),('lembrete_avisos')) as t(nome)
  union all
  select 'anteriores', 'casos.' || c.nome,
         exists(select 1 from information_schema.columns
                 where table_name='casos' and column_name=c.nome)
    from (values ('crps'),('crps_nups'),('arquivados'),('encerrado_por'),
                 ('classe_judicial'),('ajuizado_em'),('orgao_judicial'),
                 ('pje_link'),('lembrete_meses')) as c(nome)
  union all
  select 'anteriores', 'casos.fase aceita peticao_inicial',
         exists(select 1 from pg_constraint
                 where conname='casos_fase_check'
                   and pg_get_constraintdef(oid) like '%peticao_inicial%')
)
select case when existe then '✅ ok' else '❌ FALTA' end as situacao,
       secao, item
  from esperado
 order by existe, secao, item;


-- ══════════════════════════════════════════════════════════════════════════
-- BLOCO MÍNIMO — destrava as 2.621 parcelas do To Do
-- ══════════════════════════════════════════════════════════════════════════
-- Se a conferência acima acusar ❌ no índice, rode SÓ estas duas linhas
-- (tirando os dois hifens da frente). Elas são idempotentes: rodar de novo
-- não faz mal.
--
-- alter table pagamentos add column if not exists todo_item_id text;
-- drop index if exists pagamentos_todo_item;
-- create unique index if not exists pagamentos_todo_item
--   on pagamentos (todo_item_id);
