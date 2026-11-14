-- F590 · a coleta da extensão não espera o cron de 10 minutos do GitHub (que ainda atrasa):
-- ao chegar, o banco chama o workflow crm-coletas.yml pelo workflow_dispatch.
-- Nasce desligado. Para ligar: config_app.coletas_disparo = 'sim' e, em config_app.gh_token, o mesmo token
-- do botão "agora" (fine-grained, Actions: Read and write). Sem token, não faz nada.
insert into config_app (chave, valor) values ('coletas_disparo', 'nao') on conflict (chave) do nothing;

create or replace function public.coletas_disparo() returns trigger
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  v_tk text;
  v_ult timestamptz;
begin
  if coalesce((select c.valor from config_app c where c.chave = 'coletas_disparo'), 'nao') <> 'sim' then return null; end if;
  select c.valor into v_tk from config_app c where c.chave = 'gh_token';
  if coalesce(btrim(v_tk), '') = '' then return null; end if;
  -- uma chamada por minuto: a rodada da extensão grava várias coletas em seguida
  select c.valor::timestamptz into v_ult from config_app c where c.chave = 'coletas_disparo_em';
  if v_ult is not null and v_ult > now() - interval '1 minute' then return null; end if;
  insert into config_app (chave, valor) values ('coletas_disparo_em', now()::text)
    on conflict (chave) do update set valor = excluded.valor;
  perform net.http_post(
    -- F590 · workflow_dispatch: o gh_token do botão "agora" só tem Actions, e o repository_dispatch pede Contents: write (403 calado)
    url := 'https://api.github.com/repos/paulotercini/marketplaceterciniinss/actions/workflows/crm-coletas.yml/dispatches',
    body := '{"ref":"main"}'::jsonb,
    headers := jsonb_build_object('Authorization', 'Bearer ' || btrim(v_tk),
      'Accept', 'application/vnd.github+json', 'User-Agent', 'crm-coletas', 'Content-Type', 'application/json'),
    timeout_milliseconds := 10000);
  return null;
exception when others then
  return null;  -- o aviso ao GitHub nunca impede a gravação da coleta; o cron continua valendo
end $$;
revoke execute on function public.coletas_disparo() from public, anon, authenticated;

create or replace trigger coletas_disparo_ins after insert on coletas
  for each statement execute function public.coletas_disparo();
