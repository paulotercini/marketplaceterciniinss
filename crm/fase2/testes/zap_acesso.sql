-- F513 · regressão do acesso ao WhatsApp no banco, num banco VAZIO com as tabelas mínimas (não use no Supabase).
--   createdb t; psql -U postgres -d t -v ON_ERROR_STOP=1 -f crm/fase2/testes/zap_acesso.sql
-- A última linha tem de ser "falhas | 0"; com falha, o arquivo termina em erro.
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
-- como no Supabase: tabela nova do postgres nasce com tudo para os três papéis
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

create table colaboradores(id uuid primary key, auth_id uuid, nome text, papel text, ativo bool default true);
create table config_app(chave text primary key, valor text, atualizado timestamptz default now());
create table zap_conversas(id int primary key, telefone text);
create table zap_mensagens(id int primary key, conversa_id int references zap_conversas on delete cascade, status text, texto text);
create table zap_etiquetas(id int primary key, nome text);
create table _bkp_teste(x int);
create table t_res(nome text, ok bool);

-- o banco de antes da F513
create function sou_admin() returns boolean language sql stable security definer set search_path = public as
  $$ select exists(select 1 from colaboradores where auth_id = auth.uid() and papel = 'admin') $$;
alter table config_app enable row level security;
create policy cfg_todos on config_app for all to authenticated using (chave <> 'gh_token' or sou_admin()) with check (chave <> 'gh_token' or sou_admin());
alter table zap_conversas enable row level security; create policy autenticados on zap_conversas for all to authenticated using (true) with check (true);
alter table zap_mensagens enable row level security; create policy autenticados on zap_mensagens for all to authenticated using (true) with check (true);
alter table zap_etiquetas enable row level security; create policy autenticados on zap_etiquetas for all to authenticated using (true) with check (true);
create function zap_toque() returns trigger language plpgsql as $$ begin return new; end $$;
create function zap_etapa_publica(t text) returns text language sql as $$ select t $$;
create function zap_sugestao_ia(t text) returns void language sql as $$ select 1 $$;
create function smbot_contato() returns int language sql security definer as $$ select 1 $$;
-- devolve "ok <linhas>" ou "erro <sqlstate>", para conferir a recusa sem parar o arquivo
create function tenta(q text) returns text language plpgsql as $$
declare n int; begin execute q; get diagnostics n = row_count; return 'ok ' || n;
exception when others then return 'erro ' || sqlstate; end $$;

insert into colaboradores values
  ('00000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'Admin Teste', 'admin', true),
  ('00000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000002', 'Colaborador Teste', 'colaborador', true),
  ('00000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000003', 'Desligado Teste', 'colaborador', false),
  ('00000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000004', 'Admin Desligado', 'admin', false);
insert into config_app(chave, valor) values ('zap_dados_pagamento', 'dados ficticios'), ('zap_golpe_texto', 'texto antigo'),
  ('zap_visual', 'wa'), ('zap_visto_em', '1'), ('gh_token', 'ficticio'), ('pje_sem_caso', '{}');
insert into zap_conversas values (1, '550000000001'), (2, '550000000002');
insert into zap_mensagens values (1, 1, 'enviada', 'Cliente Teste'), (2, 1, 'rascunho', 'r'), (3, 1, 'agendada', 'a'), (4, 2, 'lida', 'l');
insert into zap_etiquetas values (1, 'teste');

-- duas vezes: a migração tem de ser idempotente
\i crm/fase2/migracoes/f513_zap_acesso.sql
\i crm/fase2/migracoes/f513_zap_acesso.sql
create function zap_nova_depois() returns int language sql as $$ select 1 $$;

set role authenticated;

-- colaborador ativo: trabalha como antes, menos apagar o que saiu e gravar chave sensível
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', false);
insert into t_res values
  ('ativo lê as conversas', (select count(*) from zap_conversas) = 2),
  ('ativo lê as mensagens', (select count(*) from zap_mensagens) = 4),
  ('ativo envia', tenta($$insert into zap_mensagens values (5, 2, 'fila', 'x')$$) = 'ok 1'),
  ('ativo altera mensagem', tenta($$update zap_mensagens set texto = 'y' where id = 5$$) = 'ok 1'),
  ('ativo altera conversa', tenta($$update zap_conversas set telefone = '550000000003' where id = 2$$) = 'ok 1'),
  ('ativo cria conversa', tenta($$insert into zap_conversas values (3, '550000000004')$$) = 'ok 1'),
  ('ativo usa as outras zap_*', (select count(*) from zap_etiquetas) = 1 and tenta($$insert into zap_etiquetas values (2, 'b')$$) = 'ok 1'),
  ('enviada não se apaga', tenta($$delete from zap_mensagens where id in (1, 4, 5)$$) = 'ok 0'),
  ('rascunho se apaga', tenta($$delete from zap_mensagens where id = 2$$) = 'ok 1'),
  ('agendada se apaga', tenta($$delete from zap_mensagens where id = 3$$) = 'ok 1'),
  ('conversa não se apaga', tenta($$delete from zap_conversas$$) = 'ok 0'),
  ('ativo lê a config zap_*', (select count(*) from config_app where chave = 'zap_visual') = 1),
  ('ativo não lê o gh_token', (select count(*) from config_app where chave = 'gh_token') = 0),
  ('ativo grava zap_comando', tenta($$insert into config_app(chave, valor) values ('zap_comando', 'qr')$$) = 'ok 1'),
  ('ativo grava chave comum', tenta($$update config_app set valor = '{"a":1}' where chave = 'pje_sem_caso'$$) = 'ok 1'),
  ('ativo cria chave comum', tenta($$insert into config_app(chave, valor) values ('coletas_auto_em', '1')$$) = 'ok 1'),
  ('ativo não altera o pagamento', tenta($$update config_app set valor = 'outro' where chave = 'zap_dados_pagamento'$$) = 'ok 0'),
  ('ativo não cria chave sensível', tenta($$insert into config_app(chave, valor) values ('zap_ia_plantao', 'sim')$$) = 'erro 42501'),
  ('ativo não cria chave push_', tenta($$insert into config_app(chave, valor) values ('push_dias', '1')$$) = 'erro 42501'),
  ('ativo não apaga chave sensível', tenta($$delete from config_app where chave = 'zap_golpe_texto'$$) = 'ok 0'),
  ('ativo não renomeia para sensível', tenta($$update config_app set chave = 'zap_ma_teste' where chave = 'coletas_auto_em'$$) = 'erro 42501'),
  ('ativo não chama zap_sugestao_ia', tenta($$select zap_sugestao_ia('x')$$) = 'erro 42501'),
  ('ativo executa as zap_* dos gatilhos', has_function_privilege('zap_etapa_publica(text)', 'execute')),
  ('ativo não lê o registro', (select count(*) from config_app_log) = 0),
  ('ativo não é admin', not sou_admin() and sou_ativo());

-- desligado: o login ainda vale no Auth, mas o banco não mostra nem grava nada
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', false);
insert into t_res values
  ('desligado não lê conversas', (select count(*) from zap_conversas) = 0),
  ('desligado não lê mensagens', (select count(*) from zap_mensagens) = 0),
  ('desligado não lê as outras zap_*', (select count(*) from zap_etiquetas) = 0),
  ('desligado não envia', tenta($$insert into zap_mensagens values (6, 1, 'fila', 'x')$$) = 'erro 42501'),
  ('desligado não altera', tenta($$update zap_mensagens set texto = 'z'$$) = 'ok 0'),
  ('desligado não apaga', tenta($$delete from zap_mensagens$$) = 'ok 0'),
  ('desligado não lê a config', (select count(*) from config_app) = 0),
  ('desligado não grava a config', tenta($$insert into config_app(chave, valor) values ('zap_comando', 'qr2')$$) = 'erro 42501'
     and tenta($$update config_app set valor = 'x'$$) = 'ok 0');

-- administrador desligado deixa de ser administrador
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000004', false);
insert into t_res values
  ('admin desligado não é admin', not sou_admin() and not sou_ativo()),
  ('admin desligado não altera o pagamento', tenta($$update config_app set valor = 'x' where chave = 'zap_dados_pagamento'$$) = 'ok 0');

-- sem login nenhum
select set_config('request.jwt.claim.sub', '', false);
insert into t_res values ('sem login não lê', (select count(*) from zap_conversas) + (select count(*) from config_app) = 0);

-- administrador ativo
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false);
insert into t_res values
  ('admin altera o pagamento', tenta($$update config_app set valor = 'dados novos' where chave = 'zap_dados_pagamento'$$) = 'ok 1'),
  ('admin altera o texto do golpe', tenta($$update config_app set valor = 'texto novo' where chave = 'zap_golpe_texto'$$) = 'ok 1'),
  ('admin regrava igual', tenta($$update config_app set valor = 'texto novo' where chave = 'zap_golpe_texto'$$) = 'ok 1'),
  ('admin grava carimbo', tenta($$update config_app set valor = '2' where chave = 'zap_visto_em'$$) = 'ok 1'),
  ('admin cria chave sensível', tenta($$insert into config_app(chave, valor) values ('zap_ia_plantao', 'sim')$$) = 'ok 1'),
  ('admin lê o gh_token', (select count(*) from config_app where chave = 'gh_token') = 1),
  ('admin não apaga enviada', tenta($$delete from zap_mensagens where id = 1$$) = 'ok 0');
insert into t_res values
  ('registro: três linhas (igual e carimbo não entram)', (select count(*) from config_app_log) = 3),
  ('registro: pagamento sem o valor anterior', (select count(*) from config_app_log where chave = 'zap_dados_pagamento' and antes is null
     and acao = 'UPDATE' and quem = '00000000-0000-0000-0000-00000000000a' and papel = 'authenticated') = 1),
  ('registro: golpe com o valor anterior', (select count(*) from config_app_log where chave = 'zap_golpe_texto' and antes = 'texto antigo') = 1),
  ('registro: ninguém escreve à mão', tenta($$insert into config_app_log(chave, acao) values ('x', 'INSERT')$$) = 'erro 42501'
     and tenta($$delete from config_app_log$$) = 'ok 0');

-- a ponte e as Edge Functions (service_role) não passam pela RLS
select set_config('request.jwt.claim.sub', '', false);
set role service_role;
insert into t_res values
  ('service_role apaga enviada', tenta($$delete from zap_mensagens where id = 5$$) = 'ok 1'),
  ('service_role grava chave sensível', tenta($$update config_app set valor = 'nao' where chave = 'zap_ia_plantao'$$) = 'ok 1'),
  ('service_role chama zap_etapa_publica', has_function_privilege('zap_etapa_publica(text)', 'execute'));
reset role;
insert into t_res values
  ('registro: a gravação do servidor fica sem pessoa', (select count(*) from config_app_log where chave = 'zap_ia_plantao' and acao = 'UPDATE'
     and quem is null and papel = 'service_role' and antes = 'sim') = 1),
  ('anon não executa zap_*', not has_function_privilege('anon', 'zap_etapa_publica(text)', 'execute')),
  ('anon não executa função de gatilho', not has_function_privilege('anon', 'zap_toque()', 'execute')
     and not has_function_privilege('anon', 'config_app_registra()', 'execute')),
  ('anon não executa sou_ativo', not has_function_privilege('anon', 'sou_ativo()', 'execute')),
  ('anon segue com a porta do SMBot', has_function_privilege('anon', 'smbot_contato()', 'execute')),
  ('função nova nasce sem PUBLIC', not has_function_privilege('anon', 'zap_nova_depois()', 'execute')),
  ('cópia sem SELECT', not has_table_privilege('anon', '_bkp_teste', 'select') and not has_table_privilege('authenticated', '_bkp_teste', 'select')),
  ('cópia com RLS', (select relrowsecurity from pg_class where relname = '_bkp_teste')),
  ('anon sem o registro', not has_table_privilege('anon', 'config_app_log', 'select')),
  ('política antiga saiu', (select count(*) from pg_policies where policyname = 'cfg_todos'
     or (policyname = 'autenticados' and tablename in ('zap_conversas', 'zap_mensagens'))) = 0);

select nome, ok from t_res where not ok;
select count(*) as provas, count(*) filter (where not ok) as falhas from t_res;
do $$ begin if exists(select 1 from t_res where not ok) then raise exception 'zap_acesso: há prova falhando'; end if; end $$;
