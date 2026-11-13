-- F571 · Análises da IA (aprovado pelo Paulo em 13.11.2026)
-- As análises feitas nos Projetos do claude.ai (um projeto por cliente) chegam ao CRM pelo
-- conector, ferramenta registrar_analise, e aparecem no quadro "Análises da IA" do caso,
-- abaixo dos andamentos do escritório. A rotina das 05:00 as lê pela ferramenta analises_caso.
-- hash: sha256 do texto; o mesmo texto do mesmo cliente não entra duas vezes (carga das antigas).

create table if not exists public.analises_ia (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  caso_id      uuid references public.casos(id) on delete set null,
  titulo       text not null,
  texto        text not null,
  projeto      text,
  feita_em     date not null default (now() at time zone 'America/Sao_Paulo')::date,
  hash         text not null,
  autor_id     uuid references public.colaboradores(id) on delete set null,
  criado_em    timestamptz not null default now()
);
create unique index if not exists analises_ia_hash on public.analises_ia (cliente_id, hash);
create index if not exists analises_ia_cliente on public.analises_ia (cliente_id, feita_em desc, criado_em desc);

alter table public.analises_ia enable row level security;
drop policy if exists analises_ia_ler on public.analises_ia;
create policy analises_ia_ler on public.analises_ia for select to authenticated
  using ((select public.sou_ativo()));
-- grava apenas em nome próprio
drop policy if exists analises_ia_criar on public.analises_ia;
create policy analises_ia_criar on public.analises_ia for insert to authenticated
  with check ((select public.sou_ativo())
    and autor_id in (select c.id from public.colaboradores c where c.auth_id = auth.uid()));
-- apaga quem gravou ou o administrador
drop policy if exists analises_ia_apagar on public.analises_ia;
create policy analises_ia_apagar on public.analises_ia for delete to authenticated
  using ((select public.sou_admin())
    or autor_id in (select c.id from public.colaboradores c where c.auth_id = auth.uid()));

revoke all on public.analises_ia from anon;
grant select, insert, delete on public.analises_ia to authenticated;
