-- Regressão da F577 (os erros dos atendimentos de 12.11.2026).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_f577.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from colaboradores where inicial = 'X';
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor, auth_id) values
  ('33333333-3333-3333-3333-333333333333','Atendente t','X','#c19c00','equipe',true,'inss',
   '44444444-4444-4444-4444-444444444444');
insert into config_app (chave, valor) values ('zap_bot_ligado','nao'), ('zap_ia_plantao','nao'),
  ('zap_cobertura','nao'), ('zap_volta_min','60'), ('zap_conf_ligado','nao')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);

-- C) a mensagem de modelo de empresa é automática
insert into r select 'c1 template é automática', zap_eh_automatica('[mensagem de tipo template, veja no celular]');
insert into r select 'c2 texto comum não é', not zap_eh_automatica('Bom dia, mandei o documento');

-- B) encerrada há 2 horas, mas a equipe escreveu há 10 minutos: segue com o atendente
insert into v select zap_abrir('5500000000001', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
select zap_encerrar((select id from v));
update zap_atendimentos set encerrado_em = now() - interval '2 hours'
 where id = (select atendimento_id from zap_conversas where id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Pode enviar o documento?', '33333333-3333-3333-3333-333333333333', now() - interval '10 minutes' from v;
update zap_conversas set status = 'resolvida' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'segue o documento' from v;
insert into r select 'b1 equipe escreveu depois do encerramento: não volta ao robô',
  (select status = 'aberta' and atendente_id is not null from zap_conversas where id = (select id from v));

-- B controle) sem mensagem recente da equipe: volta
delete from zap_mensagens where conversa_id = (select id from v) and direcao = 'saida';
select zap_encerrar((select id from v));
update zap_atendimentos set encerrado_em = now() - interval '2 hours'
 where id = (select atendimento_id from zap_conversas where id = (select id from v));
update zap_conversas set status = 'resolvida', atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'oi de novo' from v;
insert into r select 'b2 sem a equipe na última hora: volta ao robô',
  (select status = 'aberta' and atendente_id is null from zap_conversas where id = (select id from v));

-- A) atendente Offline que escreveu há 2 minutos: a mensagem do Offline não sai
delete from v; insert into v select zap_abrir('5500000000002', 'Cliente Teste');
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
update colaboradores set zap_offline_desde = now() - interval '30 minutes', zap_offline_msg = 'Estou fora.'
 where inicial = 'X';
insert into zap_mensagens (conversa_id, direcao, texto, autor_id, criado_em)
  select id, 'saida', 'Já verifico.', '33333333-3333-3333-3333-333333333333', now() - interval '2 minutes' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'obrigada' from v;
insert into r select 'a1 conversa em curso: sem mensagem do Offline',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- A controle) sem a equipe desde o Offline nem na última hora: a mensagem sai
delete from zap_mensagens where conversa_id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'bom dia' from v;
insert into r select 'a2 sem a equipe: a mensagem do Offline sai',
  exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v) and texto like '%Estou fora.%');

-- D) a nota do fim da cobertura no singular
update zap_conversas set cobertura = jsonb_build_object('titular', '33333333-3333-3333-3333-333333333333',
  'cobre', '33333333-3333-3333-3333-333333333333', 'desde', now() - interval '5 minutes') where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, autor_id)
  select id, 'saida', 'Respondo pelo colega.', '33333333-3333-3333-3333-333333333333' from v;
select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', false);
select zap_meu_offline(false);
insert into r select 'd1 nota diz "enviou 1 mensagem"',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and direcao = 'interna'
           and texto like '%enviou 1 mensagem enquanto%');

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
