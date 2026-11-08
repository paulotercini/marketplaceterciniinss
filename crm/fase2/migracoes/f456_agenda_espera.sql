-- F456 · lista de espera da agenda (aprovada pelo Paulo em 08.11.2026)
-- Quem quer um horário mais cedo fica na lista; a vaga liberada pelo cancelar ou pelo
-- remarcar é oferecida, uma pessoa por vez, pela recepção (onda 1).

create table if not exists public.agenda_espera (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid references public.clientes(id) on delete set null,
  nome          text not null,
  telefone      text,
  tipo          text not null default '001' check (tipo in ('001','002')),
  profs         text[] not null default '{amanda,paulo}',
  dias          int[]  not null default '{1,2,3,4,5}',
  periodos      text[] not null default '{manha,tarde}',
  ate           date,
  marcado       date,
  obs           text,
  estado        text not null default 'aguardando' check (estado in ('aguardando','oferta','agendado','retirado')),
  ofertas       jsonb not null default '[]',
  criado_por    uuid references public.colaboradores(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists agenda_espera_estado on public.agenda_espera (estado, criado_em);

alter table public.agenda_espera enable row level security;
drop policy if exists agenda_espera_equipe on public.agenda_espera;
create policy agenda_espera_equipe on public.agenda_espera for all to authenticated
  using (exists (select 1 from public.colaboradores c where c.auth_id = auth.uid() and c.ativo))
  with check (exists (select 1 from public.colaboradores c where c.auth_id = auth.uid() and c.ativo));
