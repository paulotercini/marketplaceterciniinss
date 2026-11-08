-- F441 · seguir o caso (ideia do Trello aprovada pelo Paulo em 08.11.2026)
-- Quem segue um caso recebe menção de cada anotação e de cada movimento oficial do caso,
-- sem ser responsável por ele. Quem escreveu a anotação não se avisa.

create table if not exists public.caso_seguidores (
  caso_id        uuid not null references public.casos(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  primary key (caso_id, colaborador_id)
);
alter table public.caso_seguidores enable row level security;
drop policy if exists caso_seguidores_ler on public.caso_seguidores;
create policy caso_seguidores_ler on public.caso_seguidores for select to authenticated using (true);
-- cada colaborador segue e deixa de seguir apenas em nome próprio
drop policy if exists caso_seguidores_meu on public.caso_seguidores;
create policy caso_seguidores_meu on public.caso_seguidores for insert to authenticated
  with check (colaborador_id in (select c.id from public.colaboradores c where c.auth_id = auth.uid()));
drop policy if exists caso_seguidores_sair on public.caso_seguidores;
create policy caso_seguidores_sair on public.caso_seguidores for delete to authenticated
  using (colaborador_id in (select c.id from public.colaboradores c where c.auth_id = auth.uid()));

create or replace function public.avisar_seguidores() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.caso_id is null or coalesce(new.excluir, false) then return new; end if;
  insert into public.mencoes (de_id, para_id, caso_id, andamento_id, texto)
  select new.autor_id, s.colaborador_id, new.caso_id, new.id,
         '👁 ' || coalesce((select cl.nome from public.casos k join public.clientes cl on cl.id = k.cliente_id
                             where k.id = new.caso_id), 'Caso seguido')
         || ': ' || left(regexp_replace(coalesce(new.texto, ''), '\s+', ' ', 'g'), 160)
    from public.caso_seguidores s
    join public.colaboradores c on c.id = s.colaborador_id and c.ativo
   where s.caso_id = new.caso_id
     and s.colaborador_id is distinct from new.autor_id;
  return new;
end $$;
revoke all on function public.avisar_seguidores() from public, anon, authenticated;

drop trigger if exists avisar_seguidores on public.andamentos;
create trigger avisar_seguidores after insert on public.andamentos
  for each row execute function public.avisar_seguidores();
