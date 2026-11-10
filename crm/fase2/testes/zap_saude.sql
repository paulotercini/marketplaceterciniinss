-- F516 · regressão da saúde do WhatsApp, num banco VAZIO com as tabelas mínimas (não use no Supabase).
--   createdb t; psql -d t -v ON_ERROR_STOP=1 -f crm/fase2/testes/zap_saude.sql
-- A última linha tem de dizer falhas = 0.
\set QUIET on
set client_min_messages = warning;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;

create schema cron;
create table cron.job(jobid bigserial primary key, jobname text, schedule text, command text);
create table cron.job_run_details(jobid bigint, status text, return_message text, start_time timestamptz);
create function cron.schedule(a text, b text, c text) returns bigint language sql as
  'insert into cron.job(jobname, schedule, command) values (a, b, c) returning jobid';
create function cron.unschedule(a bigint) returns boolean language sql as
  'with d as (delete from cron.job where jobid = a returning 1) select exists (select 1 from d)';
create schema net;
create table net._http_response(id bigserial, status_code int, timed_out bool, error_msg text, created timestamptz default now());

create table config_app(chave text primary key, valor text, atualizado timestamptz default now());
create table colaboradores(id uuid primary key, nome text, ativo bool default true, papel text, gestor_zap bool);
create table mencoes(id bigserial, para_id uuid, conversa_id uuid, texto text);
create table zap_conversas(id uuid primary key, telefone text, nome_perfil text, atendente_id uuid, plantao jsonb, sugestao_ia jsonb);
create table zap_mensagens(id uuid primary key default gen_random_uuid(), conversa_id uuid, direcao text default 'entrada',
  tipo text default 'texto', texto text, status text, enviar_em timestamptz, bot_ia text, criado_em timestamptz default now(),
  momento timestamptz default now(), seq bigserial, quando_wa timestamptz, push_em timestamptz, midia_url text, drive_em timestamptz);
create table zap_retornos(id bigserial primary key, conversa_id uuid, colaborador_id uuid, nota text, quando timestamptz,
  feito_em timestamptz, avisado_em timestamptz);
create function sou_admin() returns boolean language sql as 'select true';
create function zap_bot_esperas() returns void language sql as '';
create function zap_triagem_vencidas() returns void language sql as '';
create function zap_plantao_vencidas() returns void language sql as '';
create function zap_push_audios_vencidos() returns void language sql as '';
create function push_resumo_vez() returns void language sql as '';
-- dublê: em produção é a regra da F286/F478; aqui basta a marca
create function zap_eh_historico(m zap_mensagens) returns boolean language sql as $$ select coalesce(m.bot_ia, '') = 'celular' $$;
create table _andamento(msg uuid);
create function zap_andamento_gatilho() returns trigger language plpgsql as $$ begin insert into _andamento values (new.id); return new; end $$;
create trigger zap_t_andamento_ins after insert or update of texto on zap_mensagens for each row execute function zap_andamento_gatilho();

\i crm/fase2/migracoes/f516_zap_saude.sql
-- a migração roda duas vezes sem erro e sem dobrar o job
\i crm/fase2/migracoes/f516_zap_saude.sql

create temp table r(k text, v boolean);
insert into r select 'job do relógio agendado uma vez', count(*) = 1 from cron.job where jobname = 'zap-relogio';
insert into r select 'quatro componentes', count(*) = 4 from zap_saude;
insert into r select 'colaborador não forja a saúde', not has_function_privilege('authenticated', 'zap_saude_marca(text,boolean,text)', 'execute');
insert into r select 'anon não lê a saúde', not has_table_privilege('anon', 'zap_saude', 'select');

insert into colaboradores values
  ('00000000-0000-0000-0000-00000000000a', 'Admin Teste', true, 'admin', false),
  ('00000000-0000-0000-0000-00000000000b', 'Gestor Teste', true, 'equipe', true),
  ('00000000-0000-0000-0000-00000000000c', 'Atendente Teste', true, 'equipe', false),
  ('00000000-0000-0000-0000-00000000000d', 'Gestor Inativo', false, 'equipe', true);

-- ── 1 · o alarme da ponte ──
insert into config_app(chave, valor) values ('zap_visto_em', now()::text), ('zap_status', 'ligado'), ('zap_alarme_em', '');
select zap_alarme_ponte();
insert into r select 'ponte boa não avisa', (select count(*) from mencoes) = 0 and (select ok from zap_saude where componente = 'ponte');
-- viva, mas pedindo o QR: nos primeiros minutos só marca
update config_app set valor = 'esperando leitura do QR' where chave = 'zap_status';
select zap_alarme_ponte();
insert into r select 'fora do ar há pouco ainda não avisa', (select count(*) from mencoes) = 0 and not (select ok from zap_saude where componente = 'ponte');
update zap_saude set desde = now() - interval '6 minutes' where componente = 'ponte';
select zap_alarme_ponte();
insert into r select 'fora do ar há 5 minutos avisa o admin e o gestor ativos', (select count(*) from mencoes where texto like '%fora do ar%') = 2
  and not exists (select 1 from mencoes where para_id in ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000d'));
insert into r select 'o aviso diz o estado', exists (select 1 from mencoes where texto like '%(esperando leitura do QR)%');
select zap_alarme_ponte();
insert into r select 'não repete o aviso', (select count(*) from mencoes) = 2;
update config_app set valor = 'ligado' where chave = 'zap_status';
select zap_alarme_ponte();
insert into r select 'voltou avisa os dois', (select count(*) from mencoes where texto like '✔%') = 2 and (select valor from config_app where chave = 'zap_alarme_em') = '';
-- sem sinal: o comportamento de antes
update config_app set valor = (now() - interval '7 minutes')::text where chave = 'zap_visto_em';
select zap_alarme_ponte();
insert into r select 'sem sinal avisa', (select count(*) from mencoes where texto like '%sem sinal desde%') = 2;
truncate mencoes;

-- ── 2 · o relógio não roda em dobro ──
insert into zap_conversas(id, telefone, nome_perfil, atendente_id) values
  ('10000000-0000-0000-0000-000000000001', '550000000001', 'Cliente Teste', '00000000-0000-0000-0000-00000000000c'),
  ('10000000-0000-0000-0000-000000000002', '550000000002', 'Cliente Teste Dois', null);
insert into zap_mensagens(conversa_id, direcao, status, enviar_em) values ('10000000-0000-0000-0000-000000000001', 'saida', 'agendada', now() - interval '1 minute');
insert into zap_retornos(conversa_id, quando) values ('10000000-0000-0000-0000-000000000001', now() - interval '1 minute');
insert into r select 'primeira volta libera a agendada', zap_relogio() = 1;
insert into r select 'retorno avisado uma vez', (select count(*) from mencoes where texto like '⏰%') = 1;
insert into zap_mensagens(conversa_id, direcao, status, enviar_em) values ('10000000-0000-0000-0000-000000000001', 'saida', 'agendada', now() - interval '1 minute');
insert into r select 'segunda volta em menos de 20 s sai sem fazer nada', zap_relogio() = 0
  and (select count(*) from zap_mensagens where status = 'agendada') = 1;
update zap_saude set visto_em = now() - interval '25 seconds' where componente = 'relogio';
insert into r select 'passados 20 s roda de novo', zap_relogio() = 1;

-- ── 6 · a faxina ──
insert into zap_mensagens(id, conversa_id, bot_ia) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'plantao:lendo'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'plantao:lendo');
update zap_conversas set plantao = '{"pedido_msg":"20000000-0000-0000-0000-000000000002"}',
       sugestao_ia = jsonb_build_object('texto', 'x', 'em', now() - interval '2 hours') where id = '10000000-0000-0000-0000-000000000002';
update zap_conversas set sugestao_ia = jsonb_build_object('texto', 'x', 'em', now() - interval '30 hours') where id = '10000000-0000-0000-0000-000000000001';
update zap_saude set visto_em = now() - interval '25 seconds' where componente = 'relogio';
select zap_relogio();
insert into r select 'leitura órfã da IA vira falhou', (select bot_ia from zap_mensagens where id = '20000000-0000-0000-0000-000000000001') = 'plantao:falhou';
insert into r select 'leitura com pedido vivo fica', (select bot_ia from zap_mensagens where id = '20000000-0000-0000-0000-000000000002') = 'plantao:lendo';
insert into r select 'sugestão de mais de 24 h sai', (select sugestao_ia is null from zap_conversas where id = '10000000-0000-0000-0000-000000000001');
insert into r select 'sugestão recente fica', (select sugestao_ia is not null from zap_conversas where id = '10000000-0000-0000-0000-000000000002');
truncate mencoes;

-- ── 3 e 7 · pg_cron e pg_net ──
insert into cron.job(jobname) values ('job-teste');
insert into cron.job_run_details select jobid, 'failed', 'job startup timeout', now() - interval '10 minutes' from cron.job where jobname = 'job-teste';
insert into cron.job_run_details select jobid, 'failed', 'job startup timeout', now() - interval '8 minutes' from cron.job where jobname = 'job-teste';
insert into cron.job_run_details select jobid, 'succeeded', null, now() - interval '1 minute' from cron.job where jobname = 'zap-relogio';
insert into net._http_response(status_code) values (200), (500);
insert into net._http_response(timed_out, error_msg) values (true, 'tempo');
update zap_saude set visto_em = now() - interval '6 minutes' where componente = 'cron';
select zap_saude_vez();
insert into r select 'falha do pg_cron: uma menção, só ao admin', (select count(*) from mencoes) = 1
  and (select para_id from mencoes) = '00000000-0000-0000-0000-00000000000a' and (select texto from mencoes) like '%job-teste%';
insert into r select 'duas falhas do job contadas numa linha', (select sum(n) from zap_saude_falhas where origem = 'cron' and chave = 'job-teste') = 2;
insert into r select 'cron marcado com problema', not (select ok from zap_saude where componente = 'cron');
insert into r select 'pg_net: uma linha por status', (select count(*) from zap_saude_falhas where origem = 'pg_net') = 2
  and exists (select 1 from zap_saude_falhas where origem = 'pg_net' and chave = '500')
  and exists (select 1 from zap_saude_falhas where origem = 'pg_net' and chave = 'tempo esgotado');
insert into r select 'funções marcadas com problema', (select not ok and detalhe like '2 de 3 %' from zap_saude where componente = 'funcoes');
select zap_saude_vez();
insert into r select 'antes de 5 minutos não confere de novo', (select count(*) from mencoes) = 1;
insert into cron.job_run_details select jobid, 'failed', 'x', now() from cron.job where jobname = 'job-teste';
update zap_saude set visto_em = now() - interval '6 minutes' where componente = 'cron';
select zap_saude_vez();
insert into r select 'mesmo job no mesmo dia não avisa de novo', (select count(*) from mencoes) = 1;
insert into r select 'visão: componente sem conferência recente aparece parado',
  (select parado from zap_saude_agora where componente = 'cron') = false
  and (select parado from (select coalesce((now() - interval '20 minutes') < now() - interval '15 minutes', true) parado) x);

-- ── 5 · o andamento só para mensagem viva ──
truncate _andamento;
insert into zap_mensagens(conversa_id, texto) values ('10000000-0000-0000-0000-000000000001', 'viva');
insert into r select 'mensagem viva dispara', (select count(*) from _andamento) = 1;
insert into zap_mensagens(conversa_id, texto, quando_wa) values ('10000000-0000-0000-0000-000000000001', 'antiga', now() - interval '3 hours');
insert into zap_mensagens(conversa_id, texto, bot_ia) values ('10000000-0000-0000-0000-000000000001', 'do celular', 'celular');
insert into zap_mensagens(conversa_id, texto, direcao) values ('10000000-0000-0000-0000-000000000001', 'saída', 'saida');
insert into r select 'antiga, histórico e saída não disparam', (select count(*) from _andamento) = 1;
update zap_mensagens set texto = 'transcrito' where texto = 'viva';
insert into r select 'transcrição da viva dispara', (select count(*) from _andamento) = 2;

-- ── 4 · os índices servem às sondagens ──
set enable_seqscan = off; set enable_bitmapscan = off;
create function _plano(q text) returns text language plpgsql as $$
declare l text; t text := ''; begin for l in execute 'explain ' || q loop t := t || l; end loop; return t; end $$;
insert into r select 'índice do plantão', _plano($q$select 1 from zap_mensagens where bot_ia = 'plantao:espera' and criado_em < now()$q$) like '%zap_msg_plantao_espera%';
insert into r select 'índice da triagem', _plano($q$select 1 from zap_mensagens where bot_ia like 'pedida:%' and criado_em < now()$q$) like '%zap_msg_triagem_espera%';
insert into r select 'índice do áudio sem aviso', _plano($q$select 1 from zap_mensagens where direcao = 'entrada' and tipo = 'audio' and push_em is null and momento < now()$q$) like '%zap_msg_audio_sem_push%';
insert into r select 'índice do áudio sem texto', _plano($q$select 1 from zap_mensagens where tipo = 'audio' and texto is null and midia_url is not null order by seq$q$) like '%zap_msg_audio_sem_texto%';
insert into r select 'índice do Drive', _plano($q$select 1 from zap_mensagens where direcao = 'entrada' and tipo in ('imagem','documento') and midia_url is not null and drive_em is null order by seq$q$) like '%zap_msg_sem_drive%';

\set QUIET off
select k as "falhou" from r where v is not true;
select count(*) as provas, count(*) filter (where v is not true) as falhas from r;
