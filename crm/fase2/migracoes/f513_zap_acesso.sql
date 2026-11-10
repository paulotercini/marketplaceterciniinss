-- F513 · o acesso ao WhatsApp no banco (auditoria de 10.11.2026, Onda 0).
-- 1 · as tabelas zap_* deixam de valer para qualquer login ("true"): exigem colaborador ATIVO.
-- 2 · mensagem enviada ou recebida não se apaga pelo CRM; só o rascunho e a agendada, que nunca
--     saíram. A conversa também não, porque apagá-la levaria as mensagens junto (cascade).
-- 3 · as chaves do WhatsApp, da IA e dos avisos em config_app só o administrador grava, e cada
--     alteração fica registrada em config_app_log.
-- 4 · o que a F508 não alcançou: função zap_*/push_* e de gatilho aberta a PUBLIC, e as cópias
--     (_bkp, _smbot, _etapas, _lote) com SELECT para anon e authenticated.
-- A ponte e as Edge Functions usam a service_role, que não passa pela RLS; as funções SECURITY
-- DEFINER são do postgres, dono das tabelas, e também não.

create or replace function sou_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid() and ativo);
$$;

-- o administrador desligado deixa de ser administrador
create or replace function sou_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid() and papel = 'admin' and ativo);
$$;

-- ── 1 · zap_*: a política "autenticados" passa a pedir colaborador ativo ─────────────────────
-- (select …) faz a conferência uma vez por consulta, e não por linha
do $$
declare t record;
begin
  for t in select tablename from pg_policies
           where schemaname = 'public' and tablename like 'zap\_%' and policyname = 'autenticados'
             and tablename not in ('zap_mensagens', 'zap_conversas')
  loop
    execute format('drop policy autenticados on public.%I', t.tablename);
    execute format('create policy autenticados on public.%I for all to authenticated
                      using ((select sou_ativo())) with check ((select sou_ativo()))', t.tablename);
  end loop;
end $$;

-- ── 2 · mensagens e conversas: ler, criar e alterar; apagar só o que nunca saiu ──────────────
drop policy if exists autenticados on zap_conversas;
drop policy if exists zap_conv_ler on zap_conversas;
drop policy if exists zap_conv_criar on zap_conversas;
drop policy if exists zap_conv_mudar on zap_conversas;
create policy zap_conv_ler on zap_conversas for select to authenticated using ((select sou_ativo()));
create policy zap_conv_criar on zap_conversas for insert to authenticated with check ((select sou_ativo()));
create policy zap_conv_mudar on zap_conversas for update to authenticated
  using ((select sou_ativo())) with check ((select sou_ativo()));

drop policy if exists autenticados on zap_mensagens;
drop policy if exists zap_msg_ler on zap_mensagens;
drop policy if exists zap_msg_criar on zap_mensagens;
drop policy if exists zap_msg_mudar on zap_mensagens;
drop policy if exists zap_msg_apagar on zap_mensagens;
create policy zap_msg_ler on zap_mensagens for select to authenticated using ((select sou_ativo()));
create policy zap_msg_criar on zap_mensagens for insert to authenticated with check ((select sou_ativo()));
create policy zap_msg_mudar on zap_mensagens for update to authenticated
  using ((select sou_ativo())) with check ((select sou_ativo()));
-- descartarRascunho e cancelarAgendada do app.html são os dois únicos fluxos que apagam
create policy zap_msg_apagar on zap_mensagens for delete to authenticated
  using ((select sou_ativo()) and status in ('rascunho', 'agendada'));

-- ── 3 · config_app: chave sensível só o administrador grava ──────────────────────────────────
-- Sensível é toda chave zap_* e push_* (interruptores, textos e instruções da IA, dados de
-- pagamento, endereços que o banco chama) e o gh_token. Fica de fora a zap_comando, o pedido de
-- reconectar ou de novo QR que qualquer colaborador faz na faixa da conexão. As demais chaves
-- (pje_sem_caso, pat_ignorar, crps_ignorar, triagem_extra, parceiros…) o CRM grava em nome de
-- qualquer colaborador e continuam como eram.
create or replace function cfg_sensivel(p_chave text) returns boolean
language sql immutable as $$
  select p_chave = 'gh_token' or p_chave like 'push\_%'
      or (p_chave like 'zap\_%' and p_chave <> 'zap_comando');
$$;

drop policy if exists cfg_todos on config_app;
drop policy if exists cfg_ler on config_app;
drop policy if exists cfg_criar on config_app;
drop policy if exists cfg_mudar on config_app;
drop policy if exists cfg_apagar on config_app;
-- a leitura fica como era (o CRM lê as chaves zap_* para pintar a tela), agora só para o ativo
create policy cfg_ler on config_app for select to authenticated
  using ((select sou_ativo()) and (chave <> 'gh_token' or (select sou_admin())));
create policy cfg_criar on config_app for insert to authenticated
  with check ((select sou_ativo()) and (not cfg_sensivel(chave) or (select sou_admin())));
create policy cfg_mudar on config_app for update to authenticated
  using ((select sou_ativo()) and (not cfg_sensivel(chave) or (select sou_admin())))
  with check ((select sou_ativo()) and (not cfg_sensivel(chave) or (select sou_admin())));
create policy cfg_apagar on config_app for delete to authenticated
  using ((select sou_ativo()) and (not cfg_sensivel(chave) or (select sou_admin())));

-- o registro: quem mudou qual chave sensível, e quando. O valor anterior fica guardado para
-- desfazer, menos o dos dados de pagamento e o do gh_token, que não se copiam.
create table if not exists config_app_log (
  id     bigint generated always as identity primary key,
  em     timestamptz not null default now(),
  chave  text not null,
  acao   text not null,          -- INSERT | UPDATE | DELETE
  quem   uuid,                   -- colaboradores.id; nulo quando foi o banco, a ponte ou uma função
  papel  text,                   -- o papel do banco que gravou (authenticated, service_role, postgres)
  antes  text
);
alter table config_app_log enable row level security;
drop policy if exists config_app_log_ler on config_app_log;
create policy config_app_log_ler on config_app_log for select to authenticated using ((select sou_admin()));
revoke all on config_app_log from anon;

create or replace function config_app_registra() returns trigger
language plpgsql security definer set search_path = public as $$
declare k text := coalesce(new.chave, old.chave);
begin
  -- só a chave sensível cujo valor mudou; os carimbos que a ponte e os robôs regravam o tempo
  -- todo (zap_visto_em, zap_status, zap_qr, zap_conf_pedido, push_resumo_dia) encheriam a tabela
  if cfg_sensivel(k) and k !~ '_(em|dia|pedido)$' and k not in ('zap_status', 'zap_qr')
     and (tg_op <> 'UPDATE' or new.valor is distinct from old.valor) then
    insert into config_app_log (chave, acao, quem, papel, antes)
    values (k, tg_op, (select id from colaboradores where auth_id = auth.uid() limit 1), current_setting('role', true),
            case when tg_op <> 'INSERT' and k not in ('zap_dados_pagamento', 'gh_token') then old.valor end);
  end if;
  return null;
end $$;
drop trigger if exists config_app_registra on config_app;
create trigger config_app_registra after insert or update or delete on config_app
  for each row execute function config_app_registra();

-- ── 4 · o que a F508 não alcançou ────────────────────────────────────────────────────────────
-- a F508 fechou as SECURITY DEFINER; as demais zap_*/push_* e as de gatilho seguiam com o EXECUTE
-- de PUBLIC. O colaborador logado continua executando: os gatilhos que rodam em nome dele
-- (zap_toque) chamam várias delas.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and (p.proname ~ '^(zap|push)_' or p.prorettype = 'trigger'::regtype
                  or p.proname in ('sou_ativo', 'sou_admin', 'cfg_sensivel'))
             and p.proname not in ('smbot_contato', 'smbot_entrada')
             and has_function_privilege('anon', p.oid, 'execute')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
end $$;

-- zap_sugestao_ia grava a sugestão e uma menção sem conferir quem chama; só o banco a chama
-- (zap_plantao_aplicar, zap_cobranca_gravar e zap_andamento_gravar, todas SECURITY DEFINER)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname = 'zap_sugestao_ia'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- a causa: o "alter default privileges … in schema public" da F312 não tira o EXECUTE que toda
-- função nova dá a PUBLIC; só a forma sem schema tira. authenticated e service_role continuam
-- recebendo pelo padrão do schema public.
alter default privileges for role postgres revoke execute on functions from public;

-- as cópias têm RLS sem política (a API não as lê), mas guardavam o SELECT de quem não precisa
do $$
declare t record;
begin
  for t in select c.oid::regclass as tab from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
             and c.relname ~ '^_(bkp|smbot|etapas|lote)'
  loop
    execute format('alter table %s enable row level security', t.tab);
    execute format('revoke all on table %s from anon, authenticated', t.tab);
  end loop;
end $$;
