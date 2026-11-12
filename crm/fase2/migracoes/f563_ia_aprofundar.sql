-- F563 · registro de cada Aprofundar da IA no WhatsApp (pedido do Paulo de 12.11.2026):
-- quem pediu, em qual conversa e quando. A Edge Function zap_assistente grava com o token de quem pediu.
create table if not exists public.zap_ia_aprofundar (
  id bigint generated always as identity primary key,
  conversa_id uuid references public.zap_conversas(id) on delete set null,
  colaborador_id uuid not null references public.colaboradores(id),
  criado_em timestamptz not null default now()
);
create index if not exists zap_ia_aprofundar_em on public.zap_ia_aprofundar (criado_em desc);
alter table public.zap_ia_aprofundar enable row level security;
drop policy if exists zap_ia_aprofundar_criar on public.zap_ia_aprofundar;
create policy zap_ia_aprofundar_criar on public.zap_ia_aprofundar for insert to authenticated
  with check ((select sou_ativo()) and colaborador_id = (select id from public.colaboradores where auth_id = (select auth.uid())));
drop policy if exists zap_ia_aprofundar_ler on public.zap_ia_aprofundar;
create policy zap_ia_aprofundar_ler on public.zap_ia_aprofundar for select to authenticated using ((select sou_admin()));
revoke all on public.zap_ia_aprofundar from anon;
grant select, insert on public.zap_ia_aprofundar to authenticated;
