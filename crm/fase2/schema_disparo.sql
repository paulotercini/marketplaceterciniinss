-- E3 · a sincronização a cada 10 minutos, disparada pelo próprio banco (29.09.2026)
-- O agendamento do GitHub atrasa e descarta rodadas: das 28 marcas por dia do
-- crm-sync.yml, rodavam de 3 a 5. O disparo por comando (workflow_dispatch),
-- o mesmo do botão "agora" do CRM, o GitHub executa na hora. O banco dispara a
-- cada 10 minutos das 07h00 às 20h50 (horário de Brasília) e, às 06h50, a
-- rodada que também faz a auditoria To Do × CRM.
--
-- APLICAR SÓ DEPOIS de o crm-sync.yml com as entradas `origem` e `auditar`
-- estar na main: o GitHub recusa disparo com entrada que o workflow não tem.
--
-- O token é o mesmo do botão "agora" (config_app, chave gh_token, que só o
-- administrador lê). Ele nunca sai do banco: a função lê e envia ao GitHub.

create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.disparar_sync_todo(auditar boolean default false) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  tok text;
  anterior jsonb;
  st integer;
  rid bigint;
begin
  -- o resultado do disparo anterior (o pg_net só responde depois do commit):
  -- 204 é disparo aceito; 401 ou 403, token vencido ou sem permissão
  select nullif(valor, '')::jsonb into anterior from public.config_app where chave = 'sync_disparo';
  if anterior ? 'id' then
    select status_code into st from net._http_response where id = (anterior->>'id')::bigint;
  end if;
  select nullif(trim(valor), '') into tok from public.config_app where chave = 'gh_token';
  if tok is not null then
    rid := net.http_post(
      url := 'https://api.github.com/repos/paulotercini/marketplaceterciniinss/actions/workflows/crm-sync.yml/dispatches',
      body := jsonb_build_object('ref', 'main', 'inputs', jsonb_build_object(
                'origem', 'automatica', 'auditar', case when auditar then 'sim' else 'nao' end)),
      headers := jsonb_build_object(
                'Authorization', 'Bearer ' || tok,
                'Accept', 'application/vnd.github+json',
                'X-GitHub-Api-Version', '2022-11-28',
                'User-Agent', 'crm-tercini-supabase',
                'Content-Type', 'application/json'),
      timeout_milliseconds := 10000);
  end if;
  insert into public.config_app (chave, valor)
  values ('sync_disparo', jsonb_build_object('em', now(), 'id', rid, 'sem_token', tok is null,
                                            'status_anterior', st)::text)
  on conflict (chave) do update set valor = excluded.valor;
  return rid;
end $$;
revoke execute on function public.disparar_sync_todo(boolean) from public, anon, authenticated;

-- 10h00 a 23h50 UTC = 07h00 a 20h50 em Brasília, todo dia
select cron.schedule('sync-todo-10min', '*/10 10-23 * * *', $$select public.disparar_sync_todo(false)$$);
-- 09h50 UTC = 06h50 em Brasília: a rodada com auditoria
select cron.schedule('auditoria-todo', '50 9 * * *', $$select public.disparar_sync_todo(true)$$);
