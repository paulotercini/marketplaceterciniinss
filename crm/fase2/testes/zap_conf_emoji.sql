-- F576 · confirmação do atendimento por emoji e por reação. Roda na cópia do banco de base (schema e migrações).
--   psql -d <cópia> -f crm/fase2/testes/zap_conf_emoji.sql
\set QUIET on
set client_min_messages = warning;
create temp table _r(n serial, prova text, ok bool);
create function pg_temp.ok(p text, c bool) returns void language sql as $$ insert into _r(prova, ok) values (p, coalesce(c, false)) $$;

-- 1. a classe da mensagem
select pg_temp.ok('👍 é sim', zap_conf_classe('👍') = 'sim');
select pg_temp.ok('👍🏻 com tom de pele é sim', zap_conf_classe('👍🏻') = 'sim');
select pg_temp.ok('✅ e 🙏 são sim', zap_conf_classe('✅') = 'sim' and zap_conf_classe(' 🙏 ') = 'sim');
select pg_temp.ok('👍👍 é sim', zap_conf_classe('👍👍') = 'sim');
select pg_temp.ok('❤️ com seletor é sim', zap_conf_classe('❤️') = 'sim');
select pg_temp.ok('👎 não confirma', zap_conf_classe('👎') <> 'sim');
select pg_temp.ok('😢 não confirma', zap_conf_classe('😢') <> 'sim');
select pg_temp.ok('👍 com texto de dúvida não confirma pelo emoji', zap_conf_emoji('👍 mas posso levar alguém?') is null);
select pg_temp.ok('o texto continua igual', zap_conf_classe('Sim') = 'sim' and zap_conf_classe('não vou') = 'nao'
  and zap_conf_classe('que horas?') = 'duvida');

-- 2. a reação à mensagem de confirmação
insert into clientes (id, nome, telefone) values ('00000000-0000-0000-0000-0000000005c1', 'Cliente Teste', '5500000000011');
insert into zap_conversas (id, telefone, cliente_id, ultima_em, confirmacao) values
  ('00000000-0000-0000-0000-0000000005e1', '5500000000011', '00000000-0000-0000-0000-0000000005c1', now(),
   jsonb_build_object('estado', 'aguardando', 'evento', 'ev-teste', 'rotulo', 'segunda, 16/11, às 9h',
     'data', (current_date + 3)::text, 'profissional', 'Marcos'));
insert into zap_mensagens (id, conversa_id, direcao, por_bot, texto, status, aviso_chave) values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-0000000005e1', 'saida', true, 'Podemos confirmar a sua presença?', 'enviada', 'confirmacao:ev-teste'),
  ('00000000-0000-0000-0000-0000000005a2', '00000000-0000-0000-0000-0000000005e1', 'saida', false, 'Outra mensagem', 'enviada', null);

create function pg_temp.estado() returns text language sql as $$
  select confirmacao->>'estado' from zap_conversas where id = '00000000-0000-0000-0000-0000000005e1' $$;

insert into zap_reacoes (mensagem_id, de, emoji) values ('00000000-0000-0000-0000-0000000005a2', 'cliente', '👍');
select pg_temp.ok('reação a outra mensagem não confirma', pg_temp.estado() = 'aguardando');
insert into zap_reacoes (mensagem_id, de, emoji) values ('00000000-0000-0000-0000-0000000005a1', 'escritorio', '👍');
select pg_temp.ok('reação do escritório não confirma', pg_temp.estado() = 'aguardando');
insert into zap_reacoes (mensagem_id, de, emoji) values ('00000000-0000-0000-0000-0000000005a1', 'cliente', '👎');
select pg_temp.ok('reação 👎 não confirma', pg_temp.estado() = 'aguardando');
update zap_reacoes set emoji = '👍' where mensagem_id = '00000000-0000-0000-0000-0000000005a1' and de = 'cliente';
select pg_temp.ok('trocar para 👍 confirma com pedido',
  (select confirmacao->>'estado' = 'sim' and confirmacao->>'pedido' is not null and confirmacao->>'resposta' = '[reação 👍]'
     from zap_conversas where id = '00000000-0000-0000-0000-0000000005e1'));

\set QUIET off
select n, case when ok then 'ok' else 'FALHOU' end, prova from _r order by n;
select count(*) filter (where not ok) as falhas from _r;
