-- F544 · editar a anotação (pedido do Paulo de 11.11.2026)
-- Quem escreveu a anotação no CRM pode corrigir o texto. A versão anterior fica neste
-- histórico, com quem editou e quando, como o andamentos_apagados da F433.
-- A anotação já replicada no Microsoft To Do guarda o texto que está lá
-- (todo_texto_antes) até o escrever_todo.py trocar o bloco; o anti-eco do migrar.py
-- reconhece os dois textos enquanto isso.

create table if not exists public.andamentos_editados (
  id           bigint generated always as identity primary key,
  andamento_id uuid not null,
  caso_id      uuid,
  autor_id     uuid,
  texto_antes  text,
  editado_em   timestamptz not null default now(),
  editado_por  uuid
);
create index if not exists andamentos_editados_and on public.andamentos_editados (andamento_id, editado_em desc);
create index if not exists andamentos_editados_caso on public.andamentos_editados (caso_id, editado_em desc);
alter table public.andamentos_editados enable row level security;
drop policy if exists andamentos_editados_ler on public.andamentos_editados;
create policy andamentos_editados_ler on public.andamentos_editados for select to authenticated using ((select public.sou_ativo()));
-- ninguém escreve à mão: só o gatilho grava

alter table public.andamentos add column if not exists editado_em timestamptz;
alter table public.andamentos add column if not exists todo_texto_antes text;

create or replace function public.andamento_editado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.texto is not distinct from old.texto then return new; end if;
  if coalesce(old.origem, '') not in ('app', 'whatsapp') then return new; end if;
  insert into public.andamentos_editados (andamento_id, caso_id, autor_id, texto_antes, editado_por)
  values (old.id, old.caso_id, old.autor_id, old.texto,
          (select c.id from public.colaboradores c where c.auth_id = auth.uid() limit 1));
  new.editado_em := now();
  -- o texto que o To Do tem é o da primeira versão replicada; o escrever_todo.py troca e limpa
  if old.todo_sync and old.todo_texto_antes is null then new.todo_texto_antes := old.texto; end if;
  return new;
end $$;
revoke all on function public.andamento_editado() from public, anon, authenticated;

drop trigger if exists andamento_editado on public.andamentos;
create trigger andamento_editado before update of texto on public.andamentos
  for each row execute function public.andamento_editado();
