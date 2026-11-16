-- Regressão da F629: assumir não interrompe a IA que conduz a conversa (plantao.modo), até a equipe escrever.
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_f629.sql

\set QUIET on
delete from zap_mensagens; delete from zap_conversas;
create temp table r(k text, v boolean);
create temp table v(id uuid);
with n as (insert into zap_conversas (telefone, nome_perfil) values ('5500000000001', 'Cliente Teste') returning id) insert into v select id from n;
update zap_conversas set plantao = '{"n":1}' where id = (select id from v);
update zap_conversas set plantao = plantao || '{"modo":"conversa"}' where id = (select id from v);
insert into r select 'a1 modo novo grava ia_desde', (select plantao ? 'ia_desde' from zap_conversas where id = (select id from v));
-- a recepção assume, ninguém da equipe escreveu: a IA segue
update zap_conversas set atendente_id = (select id from colaboradores limit 1) where id = (select id from v);
insert into r select 'a2 assumida sem mensagem da equipe: IA segue', zap_ia_segue((select id from v));
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
values ((select id from v), 'saida', true, 'resposta da IA', 'enviada', 'plantao:resposta');
insert into r select 'a3 mensagem da IA não conta como equipe', zap_ia_segue((select id from v));
update zap_conversas set confirmacao = '{"estado":"remarcando"}' where id = (select id from v);
insert into r select 'a4 confirmação em curso fica como era', not zap_ia_segue((select id from v));
update zap_conversas set confirmacao = null where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
values ((select id from v), 'saida', false, 'mensagem da equipe', 'enviada');
insert into r select 'a5 a equipe escreveu: volta a sugestão', not zap_ia_segue((select id from v));
update zap_conversas set plantao = plantao - 'modo' - 'n' where id = (select id from v);
insert into r select 'a6 sem modo, sem ia_desde e sem IA', (select not plantao ? 'ia_desde' from zap_conversas where id = (select id from v)) and not zap_ia_segue((select id from v));
insert into r select 'a7 zap_plantao_aplicar tem a exceção',
  pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure) like '%not zap_ia_segue(c.id)%';
select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
