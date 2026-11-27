-- F831 · índices oficiais da calculadora de atrasados e as datas novas do caso. Roda na base montada
-- (schema + migrações), não no Supabase. Falha = linha "FALHOU".
\set QUIET on
create temp table t_res(nome text, ok bool);
grant all on t_res to authenticated;
create or replace function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return 'erro: ' || sqlerrm; end $$;
grant execute on function pg_temp.tenta(text) to authenticated;

insert into colaboradores (id, auth_id, nome, inicial, papel, ativo) values
  ('00000000-0000-0000-0000-0000000008a1', 'a0000000-0000-0000-0000-0000000008a1', 'Colaborador Teste', 'X', 'colaborador', true),
  ('00000000-0000-0000-0000-0000000008a2', 'a0000000-0000-0000-0000-0000000008a2', 'Ex Colaborador Teste', 'Y', 'colaborador', false);

-- 1. a carga inicial veio do SGS (valores conferidos no site do Banco Central)
insert into t_res select 'INPC de 01/2020 = 0,19', exists(select 1 from indices_mensais where serie = 'inpc' and competencia = '2020-01' and valor = 0.19);
insert into t_res select 'Selic desde 12/2021', exists(select 1 from indices_mensais where serie = 'selic' and competencia = '2021-12' and valor = 0.77);
insert into t_res select 'poupança e TR cobrem 07/2009 a 11/2021', (select count(distinct competencia) from indices_mensais
  where serie in ('poup_antiga','poup_nova') and competencia between '2009-07' and '2021-11') = 149
  and (select count(*) from indices_mensais where serie = 'tr' and competencia between '2009-07' and '2021-11') = 149;
insert into t_res select 'toda linha tem a fonte', not exists(select 1 from indices_mensais where coalesce(fonte, '') = '');

-- 2. as colunas novas do caso
insert into t_res select 'casos ganha dip, citado_em, ciencia_indeferimento_em e calculo', (select count(*) from information_schema.columns
  where table_name = 'casos' and column_name in ('dip','citado_em','ciencia_indeferimento_em','calculo')) = 4;

-- 3. leitura só de colaborador ativo; ninguém grava pelo navegador
set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-0000000008a1', false);
insert into t_res select 'colaborador ativo lê os índices', (select count(*) from indices_mensais) > 500;
insert into t_res select 'colaborador ativo não grava índice',
  pg_temp.tenta($q$insert into indices_mensais(serie, competencia, valor, fonte) values ('inpc','2099-01',1,'x')$q$) like 'erro%';
insert into t_res select 'colaborador ativo não altera índice (nenhuma linha)', pg_temp.tenta($q$update indices_mensais set valor = 9 where serie = 'inpc' and competencia = '2020-01'$q$) is not null;   -- sem política: não muda nada
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-0000000008a2', false);
insert into t_res select 'ex-colaborador não lê', (select count(*) from indices_mensais) = 0;
select set_config('request.jwt.claim.sub', '', false);
reset role;
insert into t_res select 'o INPC de 01/2020 continua 0,19', exists(select 1 from indices_mensais where serie = 'inpc' and competencia = '2020-01' and valor = 0.19);

-- 4. a renovação não se chama de fora
insert into t_res select 'indices_pedir fechada a authenticated', not has_function_privilege('authenticated', 'indices_pedir()', 'execute');
insert into t_res select 'indices_gravar fechada a authenticated', not has_function_privilege('authenticated', 'indices_gravar()', 'execute');

\set QUIET off
select case when ok then 'ok      ' else 'FALHOU  ' end || nome from t_res;
select 'falhas | ' || count(*) filter (where not ok) from t_res;
