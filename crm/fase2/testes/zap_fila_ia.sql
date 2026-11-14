-- Regressão da F590 (a fila "Com a IA"): o agendamento da IA marca plantao.agendado_em,
-- e a marca sai quando o modo sai (passou à equipe ou encerrou).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_fila_ia.sql

\set QUIET on
delete from zap_mensagens; delete from zap_conversas;
create temp table r(k text, v boolean);
create temp table v(id uuid);
with n as (insert into zap_conversas (telefone, nome_perfil) values ('5500000000001', 'Cliente Teste') returning id) insert into v select id from n;
update zap_conversas set plantao = '{"modo":"conversa","n":2}' where id = (select id from v);
select zap_plantao_marcado((select id from v), 'quarta, 20/11, às 9h, com o Dr. Paulo', 'presencial', 'aposentadoria', null);
insert into r select 'a1 agendou marca agendado_em', (select plantao ? 'agendado_em' and plantao->>'modo' = 'conversa' from zap_conversas where id = (select id from v));
update zap_conversas set plantao = plantao - 'modo' - 'n' where id = (select id from v);
insert into r select 'a2 sem modo, sem a marca', (select not plantao ? 'agendado_em' from zap_conversas where id = (select id from v));
update zap_conversas set plantao = '{"modo":"conversa","n":1}' where id = (select id from v);
insert into r select 'a3 conversa nova com a IA', (select not plantao ? 'agendado_em' from zap_conversas where id = (select id from v));
select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
