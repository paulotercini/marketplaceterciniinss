-- Regressão da F273: o cliente que escreve depois do encerramento volta ao robô.
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_volta.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from colaboradores where inicial = 'X';
insert into colaboradores (id, nome, inicial, cor, papel, atende_zap, setor) values
  ('33333333-3333-3333-3333-333333333333','Amanda t','X','#c19c00','equipe',true,'inss');
insert into config_app (chave, valor) values ('zap_bot_ligado','sim'), ('zap_pausa_bot','0'),
  ('zap_hora_inicio','00:00'), ('zap_hora_fim','23:59'), ('zap_dias_uteis','1,2,3,4,5,6,7')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);
insert into v select zap_abrir('5516911110001', 'Fulano');

-- a Amanda atende: o robô cala
insert into zap_mensagens (conversa_id, direcao, texto, autor_id)
  select id, 'saida', 'bom dia', '33333333-3333-3333-3333-333333333333' from v;
update zap_conversas set setor = 'Financeiro' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'obrigado' from v;
insert into r select 'a1 com atendente, o robô não fala',
  not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- encerrou e o cliente escreve logo: ainda é com a Amanda
select zap_encerrar((select id from v));
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'esqueci de perguntar' from v;
insert into r select 'a0 dentro de 1 hora, segue com o atendente',
  (select status = 'aberta' and atendente_id is not null and not bot_ativo from zap_conversas where id = (select id from v))
  and not exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v));

-- encerrou e o cliente volta duas horas depois
select zap_encerrar((select id from v));
update zap_atendimentos set encerrado_em = now() - interval '2 hours'
 where id = (select atendimento_id from zap_conversas where id = (select id from v));
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'oi de novo' from v;
insert into r select 'a2 reabre sem atendente e sem setor',
  (select status = 'aberta' and atendente_id is null and setor is null and bot_ativo from zap_conversas where id = (select id from v));
insert into r select 'a3 e o robô manda o menu',
  exists (select 1 from zap_mensagens where por_bot and conversa_id = (select id from v))
  and (select bot_passo = 'inicio' from zap_conversas where id = (select id from v));

-- conversa aberta com atendente não muda
update zap_conversas set atendente_id = '33333333-3333-3333-3333-333333333333', bot_ativo = false where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'mais uma' from v;
insert into r select 'a4 aberta com atendente, segue com ele',
  (select atendente_id is not null and not bot_ativo from zap_conversas where id = (select id from v));

-- robô de outra empresa encerrado continua calado
update zap_conversas set status = 'resolvida', automatica = true where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'entrada', 'seu código é 1234' from v;
insert into r select 'a5 automática não volta ao robô',
  (select atendente_id is not null and not bot_ativo from zap_conversas where id = (select id from v));

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
