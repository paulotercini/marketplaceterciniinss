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
-- F623: o amparo só intervém quando o cliente cobra resposta; as conversas que devem receber trazem a cobrança
insert into zap_mensagens (conversa_id, direcao, texto, criado_em) values
  ((select id from v), 'entrada', 'Alguém pode me responder?', '2026-11-10 11:50:00+00'),
  ((select id from v), 'entrada', 'Alguém pode me responder?', '2026-11-10 13:30:00+00'),
  ((select id from v), 'entrada', 'Alguém pode me responder?', '2026-11-11 17:00:00+00');

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
           and texto = E'*Assistente do escritório:*\n\nBom dia. Recebemos a sua mensagem. A equipe responderá em breve.');
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
insert into r select 'b2 F818: sem segundo amparo no mesmo dia', zap_amparo_vez('2026-11-10 15:05:00+00') = 0;
-- terceira espera no mesmo dia: limite de 2
update zap_conversas set ultima_entrada_em = '2026-11-10 15:30:00+00' where id = (select id from v);
insert into r select 'b3 limite de 2 por dia', zap_amparo_vez('2026-11-10 18:00:00+00') = 0;
-- à tarde o cumprimento é boa tarde (dia seguinte zera o limite)
update zap_conversas set ultima_entrada_em = '2026-11-11 17:00:00+00' where id = (select id from v);
insert into r select 'b4 novo dia envia', zap_amparo_vez('2026-11-11 18:10:00+00') = 1;
insert into r select 'b5 à tarde diz boa tarde e em breve, sem ainda hoje',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and por_bot
           and texto like '%Boa tarde. Recebemos a sua mensagem. A equipe responderá em breve.')
  and not exists (select 1 from zap_mensagens where por_bot and (texto like '%ainda hoje%' or texto like '%ciente%'));
-- pedido de andamento de cliente com ficha: equipe jurídica e URGENTE
insert into clientes (id, nome) values ('66666666-6666-6666-6666-666666666666', 'Cliente Teste')
  on conflict (id) do nothing;
update zap_conversas set cliente_id = '66666666-6666-6666-6666-666666666666',
       ultima_entrada_em = '2026-11-11 16:00:00+00', ultima_resposta_em = null
 where id = (select id from w);
insert into zap_mensagens (conversa_id, direcao, texto, criado_em)
values ((select id from w), 'entrada', 'Como está o andamento do meu processo? Ninguém me responde.', '2026-11-11 16:00:00+00');
update zap_conversas set ultima_entrada_em = '2026-11-11 16:00:00+00', ultima_resposta_em = null
 where id = (select id from w);
insert into r select 'c1 pedido de andamento envia', zap_amparo_vez('2026-11-11 17:10:00+00') = 1;
insert into r select 'c2 texto da equipe jurídica sem andamento',
  exists (select 1 from zap_mensagens where conversa_id = (select id from w) and por_bot
           and texto like '%A equipe jurídica vai verificar o seu processo%');
insert into r select 'c3 menção urgente',
  exists (select 1 from mencoes where conversa_id = (select id from w) and texto like '⚠ URGENTE: Cliente sem resposta%');
-- agradecimento não pede resposta
create temp table t(id uuid);
insert into t select zap_abrir('5500000000095', 'Cliente Teste');
insert into zap_mensagens (conversa_id, direcao, texto, criado_em)
values ((select id from t), 'entrada', 'Obrigado!', '2026-11-12 11:00:00+00');
update zap_conversas set status = 'aberta', automatica = false, sem_ia = false, atendente_id = null, plantao = null,
       confirmacao = null, amparo = null, ultima_entrada_em = '2026-11-12 11:00:00+00', ultima_resposta_em = null
 where id = (select id from t);
insert into r select 'e1a agradecimento sem amparo', zap_amparo_vez('2026-11-12 12:10:00+00') = 0;
insert into r select 'e1 agradecimento sem amparo',
  not exists (select 1 from zap_mensagens where conversa_id = (select id from t) and por_bot);
-- cliente com ficha e pergunta sobre a perícia: o banco pede à IA e não envia nada
create temp table u(id uuid);
insert into u select zap_abrir('5500000000096', 'Cliente Teste');
insert into clientes (id, nome) values ('77777777-7777-7777-7777-777777777777', 'Cliente Teste')
  on conflict (id) do nothing;
insert into casos (id, cliente_id, titulo, beneficio, fase) values
  ('88888888-8888-8888-8888-888888888888', '77777777-7777-7777-7777-777777777777', 'Caso Teste', 'B31', 'inss')
  on conflict (id) do nothing;
insert into eventos (caso_id, tipo, data_hora, local) values
  ('88888888-8888-8888-8888-888888888888', 'Perícia', now() + interval '10 days', 'Agência Teste, Rua A, 1');
insert into zap_mensagens (conversa_id, direcao, texto, criado_em)
values ((select id from u), 'entrada', 'Onde vai ser a minha perícia? Alguém pode me responder?', '2026-11-12 11:00:00+00');
update zap_conversas set status = 'aberta', automatica = false, sem_ia = false, atendente_id = null, plantao = null,
       confirmacao = null, amparo = null, cliente_id = '77777777-7777-7777-7777-777777777777',
       ultima_entrada_em = '2026-11-12 11:00:00+00', ultima_resposta_em = null
 where id = (select id from u);
insert into r select 'e2a pede à IA sem enviar', zap_amparo_vez('2026-11-12 12:10:00+00') = 0;
insert into r select 'e2 pede à IA sem enviar',
  not exists (select 1 from zap_mensagens where conversa_id = (select id from u) and por_bot)
  and (select amparo ? 'pedido' from zap_conversas where id = (select id from u));
insert into r select 'e3 a IA lê o local da perícia',
  (zap_amparo_pegar((select id from u))->>'eventos') like '%Agência Teste, Rua A, 1%';
insert into r select 'e4a a IA grava',
  zap_amparo_gravar((select id from u), 'A perícia será na Agência Teste, Rua A, 1.', '2026-11-12 12:11:00+00');
insert into r select 'e4 resposta da IA sem o aviso de equipe ciente',
  exists (select 1 from zap_mensagens where conversa_id = (select id from u) and por_bot
               and texto = E'*Assistente do escritório:*\n\nBom dia. A perícia será na Agência Teste, Rua A, 1.');
insert into r select 'e5 não grava duas vezes',
  not zap_amparo_gravar((select id from u), 'outra', '2026-11-12 12:12:00+00');
-- sem resposta da IA em 3 minutos: o texto fixo
update zap_conversas set amparo = null, ultima_entrada_em = '2026-11-12 15:00:00+00' where id = (select id from u);
insert into r select 'e6 pedido de novo', zap_amparo_vez('2026-11-12 16:10:00+00') = 0;
insert into r select 'e7a fixo depois de 3 minutos', zap_amparo_vez('2026-11-12 16:14:00+00') = 1;
insert into r select 'e7 fixo depois de 3 minutos',
  exists (select 1 from zap_mensagens where conversa_id = (select id from u) and por_bot
               and texto like '%Boa tarde. Recebemos a sua mensagem. A equipe responderá em breve.');
-- desligado
update config_app set valor = 'nao' where chave = 'zap_ia_amparo';
update zap_conversas set ultima_entrada_em = '2026-11-12 13:00:00+00', ultima_resposta_em = null
 where id = (select id from q);
update zap_conversas set plantao = null where id = (select id from q);
insert into r select 'd1 desligado não envia', zap_amparo_vez('2026-11-12 15:00:00+00') = 0;

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
