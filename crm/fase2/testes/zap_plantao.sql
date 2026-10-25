-- Regressão da F274 e da F275: o plantão da IA no WhatsApp (sem chamar a IA: as respostas
-- dela entram direto por zap_plantao_aplicar, como a Edge Function faria).
-- ⚠ Este arquivo APAGA conversas: banco de teste só.
--   psql "postgres://…" -q -f crm/fase2/testes/zap_plantao.sql

\set QUIET on
delete from mencoes; delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from colaboradores where id::text like 'aaaaaaaa-%';
delete from clientes where id = 'cccccccc-0000-0000-0000-000000000001';
insert into colaboradores (id, nome, inicial, cor, papel, cargo, assinatura_zap, ativo) values
  ('aaaaaaaa-0000-0000-0000-000000000001','Paulo','P','#000','admin','advogado','Dr. Paulo Tercini',true),
  ('aaaaaaaa-0000-0000-0000-000000000002','Marcos','M','#000','colaborador','advogado','Dr. Marcos',true),
  ('aaaaaaaa-0000-0000-0000-000000000003','Amanda','A','#000','colaborador','advogado','Dra. Amanda Garcez',true),
  ('aaaaaaaa-0000-0000-0000-000000000004','Claude','C','#000','assistente_ia','assistente',null,true),
  ('aaaaaaaa-0000-0000-0000-000000000005','Ingrid','I','#000','colaborador','estagiario','Ingrid',true);
insert into config_app (chave, valor) values ('zap_ia_plantao','nao'), ('zap_bot_ligado','nao'), ('zap_pausa_bot','0'),
  ('zap_hora_inicio','00:00'), ('zap_hora_fim','23:59'), ('zap_dias_uteis','1,2,3,4,5,6,7'),
  ('zap_plantao_min','20'), ('zap_plantao_lead','Marcos'), ('zap_plantao_url',''),
  ('zap_robo_agenda','sim'), ('zap_agenda_url','http://agenda.invalid')
  on conflict (chave) do update set valor = excluded.valor;
create temp table r(k text, v boolean);
create temp table v(id uuid);
create or replace function pg_temp.ia(p uuid) returns text language sql as $$ select bot_ia from zap_mensagens where id = p $$;
create or replace function pg_temp.entra(c uuid, t text, tipo text default 'texto') returns uuid language sql as $$
  insert into zap_mensagens (conversa_id, direcao, texto, tipo, quando_wa) values (c, 'entrada', t, tipo, now()) returning id $$;
create or replace function pg_temp.velha(p uuid) returns void language sql as $$
  update zap_mensagens set criado_em = now() - interval '25 minutes' where id = p $$;
create or replace function pg_temp.respostas(c uuid) returns bigint language sql as $$
  select count(*) from zap_mensagens where conversa_id = c and bot_ia = 'plantao:resposta' $$;

insert into v select zap_abrir('5516911110001', 'Maria');
-- a conversa já tinha o Dr. Marcos
insert into zap_mensagens (conversa_id, direcao, texto, quando_wa)
  select id, 'saida', E'*Dr. Marcos:*\n\nBom dia! Até o momento nada', now() - interval '2 days' from v;

-- desligado, nada muda
create temp table m1 as select pg_temp.entra((select id from v), 'e o meu processo?') id;
insert into r select 'p01 desligado não marca', pg_temp.ia((select id from m1)) is null;

update config_app set valor = 'sim' where chave = 'zap_ia_plantao';
create temp table m2 as select pg_temp.entra((select id from v), 'alguma novidade do meu processo?') id;
insert into r select 'p02 ligado, a mensagem entra na espera', pg_temp.ia((select id from m2)) = 'plantao:espera';
select zap_plantao_vencidas();
insert into r select 'p03 antes dos 20 minutos, continua esperando', pg_temp.ia((select id from m2)) = 'plantao:espera';
select pg_temp.velha((select id from m1));
update zap_mensagens set bot_ia = 'plantao:espera' where id = (select id from m1);
select pg_temp.velha((select id from m2));
select zap_plantao_vencidas();
insert into r select 'p05 a mais antiga não chama a IA', pg_temp.ia((select id from m1)) = 'plantao:junto';
insert into r select 'p06 vencida a espera, a IA é chamada',
  pg_temp.ia((select id from m2)) = 'plantao:pedida'
  and (select plantao->>'pedido_msg' from zap_conversas where id = (select id from v)) = (select id from m2)::text;

create temp table pg as select zap_plantao_pegar((select id from m2)) j;
insert into r select 'p07 a IA recebe o advogado que conversou por último', (select j->>'advogado' from pg) = 'Dr. Marcos';
insert into r select 'p08 e o histórico, com a assinatura', (select j->'mensagens' from pg)::text like '%*Dr. Marcos:*%'
  and jsonb_array_length((select j->'advogados' from pg)) = 3;
insert into r select 'p09 a segunda leitura não gasta IA', zap_plantao_pegar((select id from m2)) is null;

select zap_plantao_aplicar((select id from m2), 'responder', 'Boa tarde, Maria. Sou a assistente virtual do escritório.',
  'Dr. Marcos', false, 'quer saber do processo', '', '');
insert into r select 'p10 a resposta vai ao cliente', pg_temp.respostas((select id from v)) = 1
  and (select status = 'fila' and por_bot from zap_mensagens where bot_ia = 'plantao:resposta' limit 1);
insert into r select 'p11 o Dr. Marcos recebe a menção',
  exists (select 1 from mencoes where para_id = 'aaaaaaaa-0000-0000-0000-000000000002' and conversa_id = (select id from v)
            and texto like '%aguarda resposta no WhatsApp: quer saber do processo · responsável: Marcos');
insert into r select 'p12 nota interna para a equipe',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and direcao = 'interna' and texto like 'Assistente virtual: respondeu e avisou a equipe (responsável: Marcos)%');

-- o cliente insiste antes de a equipe responder: a IA não fala de novo
create temp table m3 as select pg_temp.entra((select id from v), 'oi?') id;
select pg_temp.velha((select id from m3)); select zap_plantao_vencidas();
insert into r select 'p13 uma resposta só por espera', pg_temp.ia((select id from m3)) = 'plantao:ja_avisado'
  and pg_temp.respostas((select id from v)) = 1;
-- 4 horas depois da resposta da IA, ainda sem a equipe, a IA responde de novo
update zap_mensagens set criado_em = now() - interval '5 hours' where conversa_id = (select id from v) and bot_ia = 'plantao:resposta';
create temp table m3b as select pg_temp.entra((select id from v), 'ninguém me responde') id;
select pg_temp.velha((select id from m3b)); select zap_plantao_vencidas();
insert into r select 'p13b depois de 4 horas a IA responde de novo', pg_temp.ia((select id from m3b)) = 'plantao:pedida';
select zap_plantao_pegar((select id from m3b));
select zap_plantao_aplicar((select id from m3b), 'nada', '', '', false, '', '', '');

-- a equipe respondeu; o cliente escreve de novo e a equipe responde dentro do prazo
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'saida', E'*Dr. Marcos:*\n\nMaria, conferi e está tudo certo.' from v;
create temp table m4 as select pg_temp.entra((select id from v), 'obrigada doutor') id;
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'saida', '🙏' from v;
select pg_temp.velha((select id from m4)); select zap_plantao_vencidas();
insert into r select 'p14 a equipe respondeu antes: a IA não é chamada', pg_temp.ia((select id from m4)) = 'plantao:respondida';

-- nova espera depois da resposta da equipe: a IA volta a ser chamada, e pode não responder
create temp table m5 as select pg_temp.entra((select id from v), 'ok') id;
select pg_temp.velha((select id from m5)); select zap_plantao_vencidas();
insert into r select 'p15 depois da resposta da equipe, nova espera chama a IA', pg_temp.ia((select id from m5)) = 'plantao:pedida';
select zap_plantao_pegar((select id from m5));
select zap_plantao_aplicar((select id from m5), 'nada', '', '', false, '', '', '');
insert into r select 'p16 "nada" não responde', pg_temp.respostas((select id from v)) = 1 and pg_temp.ia((select id from m5)) = 'plantao:nada';

-- a conversa andou enquanto a IA lia
create temp table m6 as select pg_temp.entra((select id from v), 'preciso falar com o advogado') id;
select pg_temp.velha((select id from m6)); select zap_plantao_vencidas(); select zap_plantao_pegar((select id from m6));
create temp table m7 as select pg_temp.entra((select id from v), 'é sobre a perícia') id;
select zap_plantao_aplicar((select id from m6), 'responder', 'texto velho', '', false, '', '', '');
insert into r select 'p17 mensagem nova chegou: a resposta velha não sai', pg_temp.respostas((select id from v)) = 1;

-- a IA não respondeu em 90 s: o aviso fixo sai e o advogado é avisado
select pg_temp.velha((select id from m7)); select zap_plantao_vencidas();
update zap_conversas set plantao = plantao || jsonb_build_object('pedido_em', now() - interval '2 minutes') where id = (select id from v);
delete from mencoes;
select zap_plantao_vencidas();
insert into r select 'p18 sem IA, sai o aviso fixo',
  exists (select 1 from zap_mensagens where conversa_id = (select id from v) and bot_ia = 'plantao:resposta'
            and texto like 'Recebemos a sua mensagem. Dr. Marcos já foi avisado(a)%')
  and pg_temp.ia((select id from m7)) = 'plantao:falhou'
  and exists (select 1 from mencoes where para_id = 'aaaaaaaa-0000-0000-0000-000000000002');

-- o advogado da ficha vale primeiro; a etapa sai só para o telefone principal
insert into clientes (id, nome, telefone, campos) values ('cccccccc-0000-0000-0000-000000000001', 'Maria Teste', '16 91111-0001',
  jsonb_build_object('advogado_id', 'aaaaaaaa-0000-0000-0000-000000000003'));
insert into casos (cliente_id, titulo, beneficio, fase, etapa) values
  ('cccccccc-0000-0000-0000-000000000001', 'Auxílio', 'B31', 'inss', 'aguardando perícia');
update zap_conversas set cliente_id = 'cccccccc-0000-0000-0000-000000000001' where id = (select id from v);
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'saida', E'*Dr. Marcos:*\n\nPois não' from v;
create temp table m8 as select pg_temp.entra((select id from v), 'e a perícia?') id;
select pg_temp.velha((select id from m8)); select zap_plantao_vencidas();
create temp table pg2 as select zap_plantao_pegar((select id from m8)) j;
insert into r select 'p19 o advogado da ficha vale primeiro', (select j->>'advogado' from pg2) = 'Dra. Amanda Garcez';
insert into r select 'p20 telefone principal: a etapa vai', (select j->'cliente'->>'mesmo_telefone' from pg2) = 'true'
  and (select j->'cliente'->'casos'->0->>'etapa' from pg2) = 'aguardando perícia';
select zap_plantao_aplicar((select id from m8), 'equipe', 'A Dra. Amanda foi avisada com prioridade.', 'Dr. Paulo Tercini', true, 'perícia amanhã', '', '');
insert into r select 'p21 urgente vai ao advogado que o cliente pediu, com o aviso',
  exists (select 1 from mencoes where para_id = 'aaaaaaaa-0000-0000-0000-000000000001' and texto like '⚠ URGENTE%perícia amanhã%');
update clientes set telefone = '16 92222-0002' where id = 'cccccccc-0000-0000-0000-000000000001';
insert into zap_mensagens (conversa_id, direcao, texto) select id, 'saida', E'*Dra. Amanda Garcez:*\n\nOk' from v;
create temp table m9 as select pg_temp.entra((select id from v), 'e agora?') id;
select pg_temp.velha((select id from m9)); select zap_plantao_vencidas();
insert into r select 'p22 outro telefone: sem casos', (select zap_plantao_pegar((select id from m9))->'cliente'->'casos') = '[]'::jsonb;

-- o caso novo: a IA conversa na hora e, com o nome, oferece a agenda
create temp table w as select zap_abrir('5516933330003', 'João') id;
create temp table l1 as select pg_temp.entra((select id from w), 'boa noite, quero me aposentar') id;
select pg_temp.velha((select id from l1)); select zap_plantao_vencidas(); select zap_plantao_pegar((select id from l1));
select zap_plantao_aplicar((select id from l1), 'lead', 'Boa noite! Sou a assistente virtual. Qual o seu nome completo?', '', false, 'aposentadoria', 'quer se aposentar', '');
insert into r select 'p23 modo lead', (select plantao->>'modo' = 'lead' and plantao->>'n' = '1' from zap_conversas where id = (select id from w))
  and not exists (select 1 from mencoes where conversa_id = (select id from w));
create temp table l2 as select pg_temp.entra((select id from w), 'João da Silva, tenho 63 anos') id;
insert into r select 'p24 no modo lead a IA é chamada na hora', pg_temp.ia((select id from l2)) = 'plantao:pedida';
select zap_plantao_pegar((select id from l2));
select zap_plantao_aplicar((select id from l2), 'agendar', 'Obrigada, João.', '', false, 'aposentadoria por idade', 'João, 63 anos, quer se aposentar', 'joão da silva');
insert into r select 'p25 agendar: o lead vai ao advogado padrão e a agenda é chamada',
  exists (select 1 from mencoes where conversa_id = (select id from w) and para_id = 'aaaaaaaa-0000-0000-0000-000000000002')
  and (select bot_passo = 'agendar' and bot_dados->>'nome' = 'João Da Silva' and bot_dados ? 'pedido_em'
         and plantao->>'modo' is null from zap_conversas where id = (select id from w))
  and exists (select 1 from zap_mensagens where conversa_id = (select id from w) and direcao = 'interna' and texto like 'Relato colhido%63 anos%');
select zap_agenda_oferecer((select id from w), '001', '[{"rotulo":"segunda, 09h00"}]'::jsonb);
create temp table l3 as select pg_temp.entra((select id from w), '1') id;
insert into r select 'p26 com o robô desligado, a escolha do horário é lida', (select bot_dados->>'acao' = 'marcar' from zap_conversas where id = (select id from w))
  and pg_temp.ia((select id from l3)) is null;

-- na oitava resposta, o lead vai para a agenda
create temp table y as select zap_abrir('5516944440004', 'Ana') id;
update zap_conversas set plantao = '{"modo":"lead","n":7}' where id = (select id from y);
create temp table l4 as select pg_temp.entra((select id from y), 'mais uma coisa') id;
select zap_plantao_pegar((select id from l4));
select zap_plantao_aplicar((select id from l4), 'lead', 'Entendi.', '', false, '', '', '');
insert into r select 'p27 limite de 8 respostas', (select bot_passo = 'agendar' from zap_conversas where id = (select id from y));

-- o áudio do lead espera a transcrição
update zap_conversas set plantao = '{"modo":"lead","n":1}', bot_passo = null, bot_dados = null where id = (select id from y);
create temp table l9 as select pg_temp.entra((select id from y), null, 'audio') id;
select zap_plantao_vencidas();
insert into r select 'p28 áudio sem texto espera', pg_temp.ia((select id from l9)) = 'plantao:agora';
update zap_mensagens set texto = 'transcrição do áudio' where id = (select id from l9);
select zap_plantao_vencidas();
insert into r select 'p29 com a transcrição, a IA é chamada', pg_temp.ia((select id from l9)) = 'plantao:pedida';

-- 'todos': o caso novo avisa os três advogados e a recepção; o caso com advogado, só ele e a recepção
update config_app set valor = 'todos' where chave = 'zap_plantao_lead';
create temp table t9 as select zap_abrir('5516977770007', 'Novo2') id;
create temp table lt9 as select pg_temp.entra((select id from t9), 'quero saber do auxílio') id;
select pg_temp.velha((select id from lt9)); select zap_plantao_vencidas();
select zap_plantao_aplicar((select id from lt9), 'falhou', null, null, false, null, null, null);
insert into r select 'p33 todos: três advogados e a recepção avisados',
  (select count(*) from mencoes where conversa_id = (select id from t9)) = 4
  and exists (select 1 from zap_mensagens where conversa_id = (select id from t9) and texto like 'Recebemos a sua mensagem. A equipe do escritório já foi avisada e responderá%')
  and exists (select 1 from zap_mensagens where conversa_id = (select id from t9) and texto like '%e avisou a equipe');
insert into r select 'p34 o caso com advogado avisa todos, com o responsável no texto',
  (select count(distinct para_id) = 4 and bool_or(texto like '%responsável: Marcos%')
     from mencoes where conversa_id = (select id from v));
update config_app set valor = 'Marcos' where chave = 'zap_plantao_lead';

-- F275 · quem não está em conversa com a equipe conversa com a IA na hora
update config_app set valor = '3' where chave = 'zap_plantao_aberta_dias';
create temp table n1 as select zap_abrir('5516988880008', 'Rita') id;
create temp table n1a as select pg_temp.entra((select id from n1), 'qual o endereço do escritório?') id;
insert into r select 'p35 sem a equipe na conversa, a IA é chamada na hora', pg_temp.ia((select id from n1a)) = 'plantao:pedida';
update config_app set valor = 'Atendemos de segunda a sexta.' where chave = 'zap_ia_txt_plantao';
create temp table pg3 as select zap_plantao_pegar((select id from n1a)) j;
insert into r select 'p36 a IA recebe o modo, as instruções e o motor',
  (select (j->>'interativa')::boolean and j->>'instrucoes' = 'Atendemos de segunda a sexta.' and j->>'motor' = 'mensagens'
          and j->>'conversa_id' = (select id from n1)::text from pg3);
select zap_plantao_aplicar((select id from n1a), 'conversa', 'Bom dia, Rita. Sou a assistente virtual do escritório.', '', false, 'endereço', '', '');
insert into r select 'p37 conversa responde sem avisar a equipe', pg_temp.respostas((select id from n1)) = 1
  and (select plantao->>'modo' = 'conversa' and plantao->>'n' = '1' from zap_conversas where id = (select id from n1))
  and not exists (select 1 from mencoes where conversa_id = (select id from n1));
insert into r select 'p38 com a equipe na conversa, o plantão espera o prazo',
  pg_temp.ia(pg_temp.entra((select id from v), 'oi de novo')) = 'plantao:espera';
update zap_conversas set plantao = '{"modo":"conversa","n":11}' where id = (select id from n1);
create temp table n1b as select pg_temp.entra((select id from n1), 'e o que preciso levar?') id;
select zap_plantao_pegar((select id from n1b));
select zap_plantao_aplicar((select id from n1b), 'conversa', 'RG, CPF e os documentos do INSS.', '', false, 'documentos', '', '');
insert into r select 'p39 na 12ª resposta da conversa, a equipe é avisada',
  exists (select 1 from mencoes where conversa_id = (select id from n1))
  and (select plantao->>'modo' is null from zap_conversas where id = (select id from n1));
create temp table n2 as select zap_abrir('5516988880009', 'Muitas') id;
insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  select (select id from n2), 'saida', true, 'resposta ' || g, 'enviada', 'plantao:resposta' from generate_series(1, 15) g;
insert into r select 'p40 15 respostas da IA em 24 h devolvem ao plantão',
  pg_temp.ia(pg_temp.entra((select id from n2), 'mais uma')) = 'plantao:espera';
select zap_plantao_sessao((select id from n1), '{"id":"sesn_teste","em":"2026-10-25T10:00:00Z","ate":"2026-10-25T10:05:00Z"}');
select zap_plantao_ma_guardar('agent_teste', 'env_teste', 'v1');
create temp table n1c as select pg_temp.entra((select id from n1), 'obrigada') id;
insert into r select 'p41 a sessão e o agente do Managed Agents voltam à função',
  (select j->'sessao'->>'id' = 'sesn_teste' and j->'ma'->>'agente' = 'agent_teste' and j->'ma'->>'versao' = 'v1'
     from (select zap_plantao_pegar((select id from n1c)) j) x);
select zap_plantao_ma_guardar('', '', '');
update config_app set valor = '' where chave = 'zap_ia_txt_plantao';
update config_app set valor = '0' where chave = 'zap_plantao_aberta_dias';

-- fora da IA: a conversa marcada, a automática, o histórico reenviado e o menu ligado
create temp table z as select zap_abrir('5516955550005', 'Colega') id;
update zap_conversas set sem_ia = true where id = (select id from z);
insert into r select 'p30 conversa sem IA', pg_temp.ia(pg_temp.entra((select id from z), 'doutor, e aquele processo?')) is null;
insert into zap_mensagens (conversa_id, direcao, texto, quando_wa) select id, 'entrada', 'mensagem antiga', now() - interval '3 days' from w;
insert into r select 'p31 histórico reenviado não entra', (select bot_ia from zap_mensagens where texto = 'mensagem antiga') is null;
update config_app set valor = 'sim' where chave = 'zap_bot_ligado';
create temp table q as select zap_abrir('5516966660006', 'Novo') id;
insert into r select 'p32 com o menu ligado, a conversa sem atendente é do robô',
  pg_temp.ia(pg_temp.entra((select id from q), 'oi')) is null;
update config_app set valor = 'nao' where chave = 'zap_bot_ligado';
update config_app set valor = 'nao' where chave = 'zap_ia_plantao';

select k, case when v then 'ok' else 'FALHOU' end as resultado from r order by k;
select count(*) filter (where not v) as falhas from r;
