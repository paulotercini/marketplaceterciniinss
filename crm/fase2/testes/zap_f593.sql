-- Regressão da F593 (análise da semana do WhatsApp, 14.11.2026).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_f593.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from mencoes where texto like 'O envio para %';
delete from colaboradores where inicial in ('X', 'Y');
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor, cargo) values
  ('33333333-3333-3333-3333-333333333333','Atendente t','X','#c19c00','equipe',true,'inss','advogado'),
  ('55555555-5555-5555-5555-555555555555','Recepção t','Y','#c19c00','equipe',true,'inss','recepcao');
insert into config_app (chave, valor) values ('zap_bot_ligado','nao'), ('zap_ia_plantao','nao'),
  ('zap_cobertura','nao'), ('zap_conf_ligado','nao')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);

-- 1) o telefone ganha o 55
insert into r select 'a1 10 dígitos ganha o 55', zap_fone_norm('0090000007') = '550090000007';
insert into r select 'a2 0 de discagem sai', zap_fone_norm('010990000007') = '5510990000007';
insert into r select 'a3 com o 55 fica como veio', zap_fone_norm('5500000000091') = '5500000000091';
insert into v select zap_abrir('(00) 9000-0091', 'Cliente Teste');
insert into r select 'a4 zap_abrir grava 55 + DDD + número',
  (select telefone = '550090000091' from zap_conversas where id = (select id from v));
insert into r select 'a5 o mesmo número com o 55 acha a mesma conversa', zap_abrir('550090000091') = (select id from v);

-- 3) o primeiro "não tem WhatsApp" avisa a recepção (sem atendente), uma vez
insert into zap_mensagens (conversa_id, direcao, texto, status) select id, 'saida', 'Olá', 'enviando' from v;
update zap_mensagens set status = 'erro', erro = 'número não tem WhatsApp' where conversa_id = (select id from v);
insert into r select 'c1 recepção avisada',
  exists (select 1 from mencoes where para_id = '55555555-5555-5555-5555-555555555555'
           and conversa_id = (select id from v)
           and texto = 'O envio para (00) 9000-0091 falhou: o número não tem WhatsApp. Confira o telefone na ficha.');
insert into zap_mensagens (conversa_id, direcao, texto, status) select id, 'saida', 'Olá de novo', 'enviando' from v;
update zap_mensagens set status = 'erro', erro = 'número não tem WhatsApp' where texto = 'Olá de novo';
insert into r select 'c2 segunda falha não repete o aviso',
  (select count(*) = 1 from mencoes where para_id = '55555555-5555-5555-5555-555555555555'
    and conversa_id = (select id from v) and texto like 'O envio para %');
insert into r select 'c3 com atendente só ele é avisado', true;
delete from mencoes where texto like 'O envio para %';
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, status) select id, 'saida', 'Terceira', 'enviando' from v;
update zap_mensagens set status = 'erro', erro = 'número não tem WhatsApp' where texto = 'Terceira';
update r set v = (select count(*) = 1 and bool_and(para_id = '33333333-3333-3333-3333-333333333333')
                    from mencoes where conversa_id = (select id from v) and texto like 'O envio para %')
 where k = 'c3 com atendente só ele é avisado';
insert into zap_mensagens (conversa_id, direcao, texto, status) select id, 'saida', 'Quarta', 'enviando' from v;
update zap_mensagens set status = 'erro', erro = 'o WhatsApp não confirmou o envio em 90 s' where texto = 'Quarta';
insert into r select 'c4 outro erro não avisa',
  (select count(*) = 1 from mencoes where conversa_id = (select id from v) and texto like 'O envio para %');

-- 2) a leitura trocada pela mensagem nova é substituída; a órfã sem mensagem nova é falha
delete from zap_mensagens where conversa_id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto, bot_ia) select id, 'entrada', 'primeira', 'plantao:lendo' from v;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'segunda' from v;
update zap_conversas set plantao = jsonb_build_object('pedido_msg',
  (select id from zap_mensagens where texto = 'segunda')::text) where id = (select id from v);
insert into v select zap_abrir('5500000000092', 'Cliente Teste');
insert into zap_mensagens (conversa_id, direcao, texto, bot_ia)
  select id, 'entrada', 'sozinha', 'plantao:lendo' from v where id <> (select id from v limit 1);
-- o banco de teste não tem o histórico do pg_cron nem o do pg_net, que o zap_saude_vez lê no fim do relógio
create table if not exists cron.job_run_details(jobid bigint, status text, return_message text, start_time timestamptz);
create table if not exists net._http_response(id bigserial, status_code int, timed_out bool, error_msg text, created timestamptz default now());
update zap_saude set visto_em = null where componente = 'relogio';
select zap_relogio();
insert into r select 'b1 trocada pela mensagem nova: substituida',
  (select bot_ia = 'plantao:substituida' from zap_mensagens where texto = 'primeira');
insert into r select 'b2 órfã sem mensagem nova: falhou',
  (select bot_ia = 'plantao:falhou' from zap_mensagens where texto = 'sozinha');

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
