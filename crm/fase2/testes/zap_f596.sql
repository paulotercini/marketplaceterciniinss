-- Regressão da F596 (alerta à recepção com 30 minutos sem resposta, 14.11.2026).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_f596.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes where texto like 'Mensagem do cliente sem resposta%';
delete from colaboradores where inicial in ('X', 'Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor, cargo) values
  ('33333333-3333-3333-3333-333333333333','Atendente t','X','#c19c00','equipe',true,'inss','advogado'),
  ('55555555-5555-5555-5555-555555555555','Recepção t','Y','#c19c00','equipe',true,'inss','recepcao');
insert into config_app (chave, valor) values ('zap_bot_ligado','nao'), ('zap_ia_plantao','nao'),
  ('zap_cobertura','nao'), ('zap_conf_ligado','nao'), ('zap_alerta_ligado','sim'), ('zap_alerta_min','30'),
  ('push_dias','1,2,3,4,5'), ('push_hora_inicio','08:00'), ('push_hora_fim','19:00')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);
create temp table w(id uuid);
create temp table q(id uuid);
insert into v select zap_abrir('5500000000091', 'Cliente Teste');
insert into w select zap_abrir('5500000000092', 'Cliente Teste');
insert into q select zap_abrir('5500000000093', 'Cliente Teste');
update zap_conversas set status = 'aberta', automatica = false, atendente_id = null, plantao = null,
  alerta_sem_resposta_em = null, ultima_resposta_em = null;
-- terça 10/11/2026 às 10h de Brasília = 13h UTC
update zap_conversas set ultima_entrada_em = '2026-11-10 12:20:00+00' where id = (select id from v);
update zap_conversas set ultima_entrada_em = '2026-11-10 12:50:00+00' where id = (select id from w);
update zap_conversas set ultima_entrada_em = '2026-11-10 12:00:00+00', plantao = '{"modo":"conversa"}'
 where id = (select id from q);

insert into r select 'a1 fora do expediente não alerta', zap_alerta_sem_resposta('2026-11-10 23:00:00+00') = 0;
insert into r select 'a2 no expediente alerta só a de 40 min', zap_alerta_sem_resposta('2026-11-10 13:00:00+00') = 1;
insert into r select 'a3 recepção mencionada',
  exists (select 1 from mencoes where para_id = '55555555-5555-5555-5555-555555555555'
           and conversa_id = (select id from v) and texto like 'Mensagem do cliente sem resposta%');
insert into r select 'a4 recente (10 min) sem alerta',
  not exists (select 1 from mencoes where conversa_id = (select id from w) and texto like 'Mensagem do cliente sem resposta%');
insert into r select 'a5 conversa com a IA sem alerta',
  not exists (select 1 from mencoes where conversa_id = (select id from q) and texto like 'Mensagem do cliente sem resposta%');
insert into r select 'a6 não repete na rodada seguinte', zap_alerta_sem_resposta('2026-11-10 13:05:00+00') = 0;
-- respondida: não alerta
update zap_conversas set ultima_resposta_em = '2026-11-10 12:55:00+00' where id = (select id from w);
insert into r select 'a7 respondida não alerta', zap_alerta_sem_resposta('2026-11-10 13:30:00+00') = 0;
-- nova mensagem do cliente na conversa já alertada, com atendente: alerta de novo, ao atendente também
update zap_conversas set ultima_entrada_em = '2026-11-10 13:10:00+00',
       atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into r select 'a8 nova mensagem alerta de novo', zap_alerta_sem_resposta('2026-11-10 13:45:00+00') = 1;
insert into r select 'a9 quem atende também mencionado',
  exists (select 1 from mencoes where para_id = '33333333-3333-3333-3333-333333333333'
           and conversa_id = (select id from v) and texto like 'Mensagem do cliente sem resposta%');
-- desligado
update config_app set valor = 'nao' where chave = 'zap_alerta_ligado';
update zap_conversas set ultima_entrada_em = '2026-11-10 13:50:00+00' where id = (select id from v);
insert into r select 'b1 desligado não alerta', zap_alerta_sem_resposta('2026-11-10 14:30:00+00') = 0;
update config_app set valor = 'sim' where chave = 'zap_alerta_ligado';

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
