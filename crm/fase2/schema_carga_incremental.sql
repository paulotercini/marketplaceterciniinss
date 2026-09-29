-- E1 · carga incremental do CRM (29.09.2026)
-- O plano gratuito do Supabase dá 5 GB de tráfego por mês, e cada abertura do
-- CRM baixava cerca de 18 MB, 95% deles de seis tabelas. Agora cada linha
-- dessas tabelas guarda em mudou_em a hora da última alteração REAL, e o CRM
-- pede só o que mudou desde a carga anterior do aparelho.
--
-- Duas regras sustentam isso:
-- 1. Regravação idêntica não é alteração. A sincronização do To Do regrava
--    todas as linhas a cada rodada; sem o gatilho a_sem_mudanca, toda rodada
--    "mudaria" a carteira inteira e o CRM baixaria tudo de novo.
-- 2. O que sai da tabela fica anotado em `apagados` (só a tabela e o id), para
--    o aparelho tirar da cópia dele. A anotação vale 8 dias, e a cópia do
--    aparelho é refeita por inteiro a cada 7.

create or replace function public.marca_mudou_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.mudou_em := now();
  return new;
end $$;

create table if not exists public.apagados (
  tabela text not null,
  id     text not null,
  em     timestamptz not null default now()
);
create index if not exists apagados_em on public.apagados (em);
alter table public.apagados enable row level security;
drop policy if exists apagados_ler on public.apagados;
create policy apagados_ler on public.apagados for select to authenticated using (true);

create or replace function public.registra_apagado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.apagados (tabela, id) values (tg_table_name, old.id::text);
  return old;
end $$;

do $$
declare t text;
begin
  foreach t in array array['clientes','casos','tarefas','eventos','pagamentos','lembretes'] loop
    execute format('alter table public.%I add column if not exists mudou_em timestamptz not null default now()', t);
    -- os gatilhos BEFORE disparam em ordem alfabética: primeiro descarta a
    -- regravação idêntica, depois carimba a alteração que passou
    execute format('drop trigger if exists a_sem_mudanca on public.%I', t);
    execute format('create trigger a_sem_mudanca before update on public.%I '
                   'for each row execute function suppress_redundant_updates_trigger()', t);
    -- no INSERT também: linha regravada com um mudou_em antigo copiado de uma
    -- leitura (desfazer, duplicar) não pode nascer "velha" e escapar da carga
    execute format('drop trigger if exists b_mudou_em on public.%I', t);
    execute format('create trigger b_mudou_em before insert or update on public.%I '
                   'for each row execute function public.marca_mudou_em()', t);
    execute format('drop trigger if exists z_apagado on public.%I', t);
    execute format('create trigger z_apagado after delete on public.%I '
                   'for each row execute function public.registra_apagado()', t);
  end loop;
end $$;

-- o aviso dado num lembrete vem embutido nele na carga do CRM: aviso novo ou
-- apagado conta como alteração do lembrete
create or replace function public.toca_lembrete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.lembretes set mudou_em = now()
   where id = coalesce(new.lembrete_id, old.lembrete_id);
  return null;
end $$;
drop trigger if exists toca_lembrete on public.lembrete_avisos;
create trigger toca_lembrete after insert or update or delete on public.lembrete_avisos
  for each row execute function public.toca_lembrete();

-- faxina diária das anotações de linha apagada (pg_cron, 03h00 BRT)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('faxina-apagados', '0 6 * * *',
  $$delete from public.apagados where em < now() - interval '8 days'$$);
