-- Regressão da F599 (IA de amparo: 1 hora sem resposta, mensagem da assistente do escritório, 14.11.2026).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_f599.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes where texto like '%sem resposta há mais de%';
delete from colaboradores where inicial in ('X', 'Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor, cargo) values
  ('33333333-3333-3333-3333-333333333333','Atendente t','X','#c19c00','equipe',true,'inss','advogado'),
  ('55555555-5555-5555-5555-555555555555','Recepção t','Y','#c19c00','equipe',true,'inss','recepcao');
insert into config_app (chave, valor) values ('zap_bot_ligado','nao'), ('zap_ia_plantao','nao'),
  ('zap_cobertura','nao'), ('zap_conf_ligado','nao'), ('zap_alerta_ligado','nao'),
  ('zap_ia_amparo','sim'), ('zap_amparo_min','60'),
  ('push_dias','1,2,3,4,5'), ('push_hora_inicio','08:00'), ('push_hora_fim','19:00')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);
create temp table w(id uuid);
create temp table q(id uuid);
create temp table s(id uuid);
insert into v select zap_abrir('5500000000091', 'Cliente Teste');
insert into w select zap_abrir('5500000000092', 'Cliente Teste');
insert into q select zap_abrir('5500000000093', 'Cliente Teste');
insert into s select zap_abrir('5500000000094', 'Cliente Teste');
update zap_conversas set status = 'aberta', automatica = false, sem_ia = false, atendente_id = null,
  plantao = null, confirmacao = null, amparo = null, ultima_resposta_em = null;
-- terça 10/11/2026: 13h UTC = 10h de Brasília
update zap_conversas set ultima_entrada_em = '2026-11-10 11:50:00+00' where id = (select id from v);
update zap_conversas set ultima_entrada_em = '2026-11-10 12:30:00+00' where id = (select id from w);
update zap_conversas set ultima_entrada_em = '2026-11-10 11:00:00+00', plantao = '{"modo":"conversa"}'
 where id = (select id from q);
update zap_conversas set ultima_entrada_em = '2026-11-10 11:00:00+00', confirmacao = '{"estado":"aguardando"}'
 where id = (select id from s);

insert into r select 'a1 fora do expediente não envia', zap_amparo_vez('2026-11-10 23:00:00+00') = 0;
insert into r select 'a2 envia só a de 70 min', zap_amparo_vez('2026-11-10 13:00:00+00') = 1;
insert into r select 'a3 mensagem assinada pela assistente',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and direcao = 'saida' and por_bot
           and texto like '*Assistente do escritório:*%equipe já está ciente%ainda hoje.');
insert into r select 'a4 recepção mencionada',
  exists (select 1 from mencoes where para_id = '55555555-5555-5555-5555-555555555555'
           and conversa_id = (select id from v) and texto like 'Cliente sem resposta há mais de 60 minutos%');
insert into r select 'a5 recente (30 min) sem mensagem',
  not exists (select 1 from zap_mensagens where conversa_id = (select id from w) and por_bot);
insert into r select 'a6 conversa com a IA fica fora',
  not exists (select 1 from zap_mensagens where conversa_id = (select id from q) and por_bot);
insert into r select 'a7 confirmação aguardando fica fora',
  not exists (select 1 from zap_mensagens where conversa_id = (select id from s) and por_bot);
insert into r select 'a8 não repete na rodada seguinte', zap_amparo_vez('2026-11-10 13:05:00+00') = 0;
-- respondida pela equipe: nada
update zap_conversas set ultima_resposta_em = '2026-11-10 12:55:00+00' where id = (select id from w);
insert into r select 'a9 respondida não envia', zap_amparo_vez('2026-11-10 13:40:00+00') = 0;
-- nova mensagem do cliente 1 hora depois do primeiro amparo: ainda não passaram 2 horas
update zap_conversas set ultima_entrada_em = '2026-11-10 13:30:00+00' where id = (select id from v);
insert into r select 'b1 intervalo de 2 horas', zap_amparo_vez('2026-11-10 14:40:00+00') = 0;
insert into r select 'b2 segundo amparo depois de 2 horas', zap_amparo_vez('2026-11-10 15:05:00+00') = 1;
-- terceira espera no mesmo dia: limite de 2
update zap_conversas set ultima_entrada_em = '2026-11-10 15:30:00+00' where id = (select id from v);
insert into r select 'b3 limite de 2 por dia', zap_amparo_vez('2026-11-10 18:00:00+00') = 0;
-- depois das 15h de Brasília a resposta é até o próximo dia útil (dia seguinte zera o limite)
update zap_conversas set ultima_entrada_em = '2026-11-11 17:00:00+00' where id = (select id from v);
insert into r select 'b4 novo dia envia', zap_amparo_vez('2026-11-11 18:10:00+00') = 1;
insert into r select 'b5 depois das 15h diz próximo dia útil',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and por_bot
           and texto like '%até o próximo dia útil.');
-- pedido de andamento de cliente com ficha: equipe jurídica e URGENTE
insert into clientes (id, nome) values ('66666666-6666-6666-6666-666666666666', 'Cliente Teste')
  on conflict (id) do nothing;
update zap_conversas set cliente_id = '66666666-6666-6666-6666-666666666666',
       ultima_entrada_em = '2026-11-11 16:00:00+00', ultima_resposta_em = null
 where id = (select id from w);
insert into zap_mensagens (conversa_id, direcao, texto, criado_em)
values ((select id from w), 'entrada', 'Como está o andamento do meu processo?', '2026-11-11 16:00:00+00');
update zap_conversas set ultima_entrada_em = '2026-11-11 16:00:00+00', ultima_resposta_em = null
 where id = (select id from w);
insert into r select 'c1 pedido de andamento envia', zap_amparo_vez('2026-11-11 17:10:00+00') = 1;
insert into r select 'c2 texto da equipe jurídica sem andamento',
  exists (select 1 from zap_mensagens where conversa_id = (select id from w) and por_bot
           and texto like '%A equipe jurídica vai verificar o seu processo%');
insert into r select 'c3 menção urgente',
  exists (select 1 from mencoes where conversa_id = (select id from w) and texto like '⚠ URGENTE: Cliente sem resposta%');
-- desligado
update config_app set valor = 'nao' where chave = 'zap_ia_amparo';
update zap_conversas set ultima_entrada_em = '2026-11-12 13:00:00+00', ultima_resposta_em = null
 where id = (select id from q);
update zap_conversas set plantao = null where id = (select id from q);
insert into r select 'd1 desligado não envia', zap_amparo_vez('2026-11-12 15:00:00+00') = 0;

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
