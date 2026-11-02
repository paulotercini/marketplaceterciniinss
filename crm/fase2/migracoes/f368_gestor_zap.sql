-- F368 · gestor do WhatsApp sem ser administrador do CRM (pedido do Paulo de 02.11.2026):
-- vê e transfere todas as conversas, como o administrador, sem as Configurações do CRM
alter table colaboradores add column if not exists gestor_zap boolean not null default false;
create or replace function public.zap_gestor() returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid()
                and (papel in ('admin','assistente_ia') or gestor_zap));
$$;
