-- F334 · A NOTIFICAÇÃO DO WHATSAPP NO CELULAR (Web Push, pedido do Paulo de 31.10.2026)
-- Cada aparelho que liga "Avisar neste aparelho" grava a inscrição do navegador.
-- A mensagem nova do cliente chama a Edge Function zap_push, que avisa o atendente
-- da conversa ou, sem atendente, todos os inscritos (a mesma regra do aviso sonoro).
create table if not exists push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  aparelho text,
  criada_em timestamptz not null default now(),
  ok_em timestamptz
);
alter table push_inscricoes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'push_inscricoes' and policyname = 'push_minhas') then
    create policy push_minhas on push_inscricoes for all
      using (colaborador_id = (select id from colaboradores where auth_id = auth.uid()))
      with check (colaborador_id = (select id from colaboradores where auth_id = auth.uid()));
  end if;
end $$;

-- a chave privada do VAPID: sem política, só a service_role lê (a função a cria no 1º uso)
create table if not exists push_chave (id int primary key default 1 check (id = 1), publica text not null, privada text not null);
alter table push_chave enable row level security;

alter table zap_mensagens add column if not exists push_em timestamptz;

insert into config_app (chave, valor) values
  ('zap_push_url', 'https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_push')
on conflict (chave) do nothing;

create or replace function zap_push_gatilho() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direcao <> 'entrada' then return new; end if;
  -- o histórico que o celular reenvia na reconexão não é mensagem nova
  if coalesce(new.quando_wa, now()) < now() - interval '10 minutes' then return new; end if;
  if not exists (select 1 from push_inscricoes) then return new; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := jsonb_build_object('mensagem_id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;   -- sem pg_net não há aviso, e a mensagem entra igual
  end;
  return new;
end $$;
revoke execute on function zap_push_gatilho() from public, anon, authenticated;
-- depois do filtro de mensagem automática (zap_v_filtro_ins), que marca a conversa
create or replace trigger zap_x_push_ins after insert on zap_mensagens
  for each row execute function zap_push_gatilho();
