-- Recurso administrativo (CRPS): o cofre do crachá, o campo do número e os
-- estados que o app lê.
-- ⚠ Este arquivo APAGA dados: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/crps.sql

\set QUIET on
delete from andamentos; delete from casos; delete from clientes;
delete from crps_segredo;
update config_app set valor='sem_cracha' where chave='crps_estado';
insert into clientes (id, nome) values ('11111111-1111-1111-1111-111111111111','Alessandro');
insert into casos (id, cliente_id, titulo, fase)
  values ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Aposentadoria','inss');
create temp table r(k text, v boolean);
\set QUIET off

-- ── o número do recurso mora no caso ──────────────────────────────────────
update casos set crps_nup = '44234156897202017'
 where id='aaaaaaaa-0000-0000-0000-000000000001';
insert into r select 't1 o caso guarda o número do recurso (crps_nup)',
  (select crps_nup='44234156897202017' from casos limit 1);

-- ── o robô grava o histórico traduzido em casos.crps (jsonb) ───────────────
update casos set crps = '{"nup":"44234156897202017","orgao_atual":"CRPS",
  "status":"✅ Recurso PROVIDO","eventos":[{"data":"18/03/2026 08:44:54","tipo":"decisao",
  "resumo":"Recurso PROVIDO"}]}'::jsonb
 where id='aaaaaaaa-0000-0000-0000-000000000001';
insert into r select 't2 casos.crps guarda o bloco do e-Recursos',
  (select crps->>'status' = '✅ Recurso PROVIDO' from casos limit 1);
insert into r select 't3 os eventos ficam acessíveis como jsonb',
  (select jsonb_array_length(crps->'eventos') = 1 from casos limit 1);

-- ── o cofre do crachá ─────────────────────────────────────────────────────
select crps_guardar_cracha('token-de-mentira-123');
insert into r select 't4 guardar o crachá grava no cofre',
  (select cracha='token-de-mentira-123' from crps_segredo where id=1);
insert into r select 't5 e vira o estado para ok (o que o app lê)',
  (select valor='ok' from config_app where chave='crps_estado');
insert into r select 't6 registra quando o crachá foi colado',
  (select valor <> '' from config_app where chave='crps_cracha_em');

-- trocar o crachá substitui, não duplica
select crps_guardar_cracha('token-novo-456');
insert into r select 't7 colar de novo troca o crachá (uma linha só)',
  (select count(*)=1 and max(cracha)='token-novo-456' from crps_segredo);

-- crachá vazio é recusado
do $$ begin
  begin
    perform crps_guardar_cracha('   ');
    insert into r values ('t8 crachá vazio é recusado', false);
  exception when others then
    insert into r values ('t8 crachá vazio é recusado', true);
  end;
end $$;

-- ── a tabela do cofre não é legível pela API (RLS ligada) ──────────────────
insert into r select 't9 o cofre tem RLS ligada (a API não lê o token)',
  (select relrowsecurity from pg_class where relname='crps_segredo');

-- ── os estados que o app conhece existem no config ────────────────────────
insert into r select 't10 os campos de estado do CRPS existem no config',
  (select count(*)=4 from config_app
    where chave in ('crps_estado','crps_cracha_em','crps_visto_em','crps_sync_em'));

-- ── um caso guarda VÁRIOS recursos (crps_nups) ────────────────────────────
update casos set crps_nups = '["44234156897202017","44236480569202434"]'::jsonb
 where id='aaaaaaaa-0000-0000-0000-000000000001';
insert into r select 't11 o caso guarda uma lista de números de recurso',
  (select jsonb_array_length(crps_nups)=2 from casos limit 1);

-- ── o resultado vira lista de blocos, um por recurso ──────────────────────
update casos set crps = '[{"nup":"44234156897202017","status":"✅ Provido",
  "eventos":[{"tipo":"decisao","resumo":"Provido"}]},
  {"nup":"44236480569202434","status":"⛔ Negado","eventos":[]}]'::jsonb
 where id='aaaaaaaa-0000-0000-0000-000000000001';
insert into r select 't12 o resultado guarda um bloco por recurso',
  (select jsonb_array_length(crps)=2 from casos limit 1);
insert into r select 't13 cada bloco tem o seu número e a sua situação',
  (select (crps->1->>'nup')='44236480569202434' and (crps->1->>'status')='⛔ Negado'
     from casos limit 1);

-- ── a migração do formato antigo (número único → lista) ───────────────────
insert into casos (id, cliente_id, titulo, fase, crps_nup)
  values ('aaaaaaaa-0000-0000-0000-000000000009','11111111-1111-1111-1111-111111111111',
          'Velho formato','inss','44233474809202068');
update casos set crps_nups = jsonb_build_array(crps_nup)
  where crps_nup is not null and btrim(crps_nup) <> '' and crps_nups = '[]'::jsonb;
insert into r select 't14 o número único antigo migra para a lista',
  (select crps_nups = '["44233474809202068"]'::jsonb
     from casos where id='aaaaaaaa-0000-0000-0000-000000000009');

select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
