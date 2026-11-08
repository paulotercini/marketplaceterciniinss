-- F452 · regressão do lembrete antes do compromisso, num banco VAZIO com as tabelas mínimas (não use no Supabase).
--   createdb t; psql -d t -f crm/fase2/testes/push_lembretes.sql
create role anon; create role authenticated;

create schema cron; create table cron.job(jobname text); create function cron.schedule(a text,b text,c text) returns int language sql as 'select 1'; create function cron.unschedule(a text) returns bool language sql as 'select true';
create schema net; create function net.http_post(url text, body jsonb, headers jsonb, timeout_milliseconds int) returns bigint language sql as 'select 1::bigint';
create table config_app(chave text primary key, valor text);
create table colaboradores(id uuid primary key, nome text, ativo bool default true, papel text);
create table clientes(id uuid primary key, nome text, campos jsonb default '{}');
create table casos(id uuid primary key, cliente_id uuid, fase text);
create table atribuicoes(caso_id uuid, colaborador_id uuid);
create table eventos(id uuid primary key default gen_random_uuid(), caso_id uuid, tipo text, data_hora timestamptz, local text, status text default 'agendada');
create table andamentos(id uuid primary key, texto text);
create table andamento_tarefas(id uuid primary key default gen_random_uuid(), andamento_id uuid, caso_id uuid, colaborador_id uuid, lembrar_em date, lembrar_hora time, concluida_em timestamptz);
create table push_inscricoes(id uuid primary key default gen_random_uuid(), colaborador_id uuid);
\i crm/fase2/migracoes/f452_lembretes_antes.sql
insert into colaboradores values ('00000000-0000-0000-0000-00000000000a','Paulo',true,'admin'),('00000000-0000-0000-0000-00000000000b','Amanda',true,'equipe'),('00000000-0000-0000-0000-00000000000c','Ingrid',true,'equipe');
insert into push_inscricoes(colaborador_id) select id from colaboradores;
insert into clientes values ('10000000-0000-0000-0000-000000000001','Maria Fictícia','{"advogado_id":"00000000-0000-0000-0000-00000000000b"}'),('10000000-0000-0000-0000-000000000002','José Fictício','{}');
insert into casos values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','judicial'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','inss'),('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','encerrado');
insert into atribuicoes values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c');
-- perícia em 1h40 (caso com atribuição + advogado) → h2 para Ingrid e Amanda
insert into eventos(caso_id,tipo,data_hora,local) values ('20000000-0000-0000-0000-000000000001','Perícia',now()+interval '100 minutes','Catanduva');
-- audiência em 20 min, sem ninguém → m30 para o admin
insert into eventos(caso_id,tipo,data_hora) values ('20000000-0000-0000-0000-000000000002','Audiência',now()+interval '20 minutes');
-- caso encerrado não avisa
insert into eventos(caso_id,tipo,data_hora) values ('20000000-0000-0000-0000-000000000003','Perícia',now()+interval '20 minutes');
-- realizada não avisa
insert into eventos(caso_id,tipo,data_hora,status) values ('20000000-0000-0000-0000-000000000002','Perícia',now()+interval '25 minutes','realizada');
-- amanhã às 10h: véspera depois das 8h (depende da hora local; só confere que não é h2/m30)
insert into eventos(caso_id,tipo,data_hora) values ('20000000-0000-0000-0000-000000000002','Avaliação social',((((now() at time zone 'America/Sao_Paulo')::date+1)+time '10:00') at time zone 'America/Sao_Paulo'));
-- tarefa com hora daqui a 25 min (local) → m30 para Amanda
insert into andamentos values ('30000000-0000-0000-0000-000000000001','Ligar ao cliente sobre o laudo do NB 123.456.789-0');
insert into andamento_tarefas(andamento_id,caso_id,colaborador_id,lembrar_em,lembrar_hora) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000b',(now() at time zone 'America/Sao_Paulo' + interval '25 minutes')::date,(now() at time zone 'America/Sao_Paulo' + interval '25 minutes')::time);
-- tarefa sem hora não avisa
insert into andamento_tarefas(andamento_id,caso_id,colaborador_id,lembrar_em) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000c',current_date);
select titulo, corpo, (select nome from colaboradores where id=colaborador_id) from push_lembretes_devidos() order by 1,3;
select count(*) "preparados" from push_lembretes_preparar();
select count(*) "segunda vez (0)" from push_lembretes_preparar();
update config_app set valor='nao'; insert into config_app values('push_lembretes','nao') on conflict do nothing;
delete from push_lembretes; select count(*) "desligado (0)" from push_lembretes_devidos();
select push_lembretes_vez();
