-- F829 · honorários: editar e cancelar com motivo, com quem e quando gravados pelo banco. Roda na base montada
-- (schema + migrações), não no Supabase. Falha = linha "FALHOU".
\set QUIET on
create temp table t_res(nome text, ok bool);
create or replace function pg_temp.tenta(q text) returns text language plpgsql as $$
begin execute q; return 'ok'; exception when others then return 'erro: ' || sqlerrm; end $$;

insert into colaboradores (id, auth_id, nome, inicial, papel, ativo) values
  ('00000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000a2', 'Colaborador Teste', 'X', 'colaborador', true);
insert into clientes (id, nome) values ('00000000-0000-0000-0000-00000000c222', 'Cliente Teste');
insert into pagamentos (id, caso_id, cliente_id, descricao, valor, vencimento, status) values
  ('00000000-0000-0000-0000-0000000000f1', null, '00000000-0000-0000-0000-00000000c222', '1ª parcela', 500, '2026-12-10', 'aberto'),
  ('00000000-0000-0000-0000-0000000000f2', null, '00000000-0000-0000-0000-00000000c222', '2ª parcela', 500, '2027-01-10', 'aberto');
insert into pagamentos (id, caso_id, cliente_id, descricao, valor, pago_em, status, conferencias) values
  ('00000000-0000-0000-0000-0000000000f3', null, '00000000-0000-0000-0000-00000000c222', 'RPV', 900, '2026-11-20', 'recebido',
   '[{"c":"00000000-0000-0000-0000-0000000000a2","em":"2026-11-20T10:00:00Z"}]');
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-0000000000a2';

-- 1. cancelar sem motivo é recusado
insert into t_res select 'cancelar sem motivo recusa',
  pg_temp.tenta($q$update pagamentos set status = 'cancelado' where id = '00000000-0000-0000-0000-0000000000f1'$q$) like 'erro%motivo%';
insert into t_res select 'cancelar com motivo em branco recusa',
  pg_temp.tenta($q$update pagamentos set status = 'cancelado', cancelado_motivo = '  ' where id = '00000000-0000-0000-0000-0000000000f1'$q$) like 'erro%';
-- 2. com motivo: fica na tabela, cancelado, com quem (do login, e não o que o navegador mandou) e quando
update pagamentos set status = 'cancelado', cancelado_motivo = 'lançado em dobro', cancelado_por = null
  where id = '00000000-0000-0000-0000-0000000000f1';
insert into t_res select 'cancelado continua na tabela, com motivo, quem e quando', exists(select 1 from pagamentos
  where id = '00000000-0000-0000-0000-0000000000f1' and status = 'cancelado' and cancelado_motivo = 'lançado em dobro'
    and cancelado_por = '00000000-0000-0000-0000-0000000000a2' and cancelado_em is not null);
-- 3. editar valor e vencimento do aberto registra quem e quando
update pagamentos set valor = 450, vencimento = '2027-01-15' where id = '00000000-0000-0000-0000-0000000000f2';
insert into t_res select 'edição grava quem e quando', exists(select 1 from pagamentos
  where id = '00000000-0000-0000-0000-0000000000f2' and valor = 450 and editado_por = '00000000-0000-0000-0000-0000000000a2' and editado_em is not null);
-- 4. desfazer o recebido (volta a aberto) também registra
update pagamentos set status = 'aberto', pago_em = null, vencimento = '2026-11-20', conferencias = '[]'
  where id = '00000000-0000-0000-0000-0000000000f3';
insert into t_res select 'desfazer recebido grava quem e quando', exists(select 1 from pagamentos
  where id = '00000000-0000-0000-0000-0000000000f3' and status = 'aberto' and editado_por = '00000000-0000-0000-0000-0000000000a2');
-- 5. receber (aberto → recebido) não é edição
reset request.jwt.claim.sub;
update pagamentos set editado_por = null, editado_em = null where id = '00000000-0000-0000-0000-0000000000f3';
update pagamentos set status = 'recebido', pago_em = '2026-11-21' where id = '00000000-0000-0000-0000-0000000000f3';
insert into t_res select 'receber não marca edição', exists(select 1 from pagamentos
  where id = '00000000-0000-0000-0000-0000000000f3' and editado_em is null);
-- 6. a função do gatilho não se chama de fora
insert into t_res select 'gatilho fechado a authenticated', not has_function_privilege('authenticated', 'pagamentos_autoria()', 'execute');

\set QUIET off
select case when ok then 'ok      ' else 'FALHOU  ' end || nome from t_res;
select 'falhas | ' || count(*) filter (where not ok) from t_res;
