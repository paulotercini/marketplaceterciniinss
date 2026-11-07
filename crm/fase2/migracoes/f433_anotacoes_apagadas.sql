-- F433 · o histórico das anotações apagadas (pedido do Paulo de 07.11.2026)
-- A anotação ou o prazo escrito no CRM pode ser apagado por quem escreveu: sai das
-- anotações, mas fica neste histórico do caso, com o texto, o autor, as tarefas que
-- tinha (o prazo fatal, quem faz, quem revisa), quem apagou e quando.
-- O gatilho roda antes do DELETE, quando as tarefas ainda existem (elas saem pelo
-- ON DELETE CASCADE de andamento_tarefas). Só a anotação escrita no CRM (origem
-- app ou whatsapp) entra; a do To Do e a dos portais não.

create table if not exists public.andamentos_apagados (
  id           bigint generated always as identity primary key,
  andamento_id uuid not null,
  caso_id      uuid,
  autor_id     uuid,
  origem       text,
  origem_id    text,
  responde_a   uuid,
  texto        text,
  criado_em    timestamptz,
  tarefas      jsonb not null default '[]'::jsonb,
  apagado_em   timestamptz not null default now(),
  apagado_por  uuid
);
create index if not exists andamentos_apagados_caso on public.andamentos_apagados (caso_id, apagado_em desc);
alter table public.andamentos_apagados enable row level security;
drop policy if exists andamentos_apagados_ler on public.andamentos_apagados;
create policy andamentos_apagados_ler on public.andamentos_apagados for select to authenticated using (true);
-- ninguém escreve à mão: só o gatilho grava

create or replace function public.andamento_apagado() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(old.origem, '') not in ('app', 'whatsapp') then return old; end if;
  insert into public.andamentos_apagados
    (andamento_id, caso_id, autor_id, origem, origem_id, responde_a, texto, criado_em, tarefas, apagado_por)
  values (old.id, old.caso_id, old.autor_id, old.origem, old.origem_id, old.responde_a, old.texto, old.criado_em,
    coalesce((select jsonb_agg(jsonb_build_object('colaborador_id', t.colaborador_id, 'natureza', t.natureza,
               'papel', t.papel, 'lembrar_em', t.lembrar_em, 'concluida_em', t.concluida_em) order by t.criado_em)
                from public.andamento_tarefas t where t.andamento_id = old.id), '[]'::jsonb),
    -- quem está logado; no To Do a linha marcada (excluir) só o autor marca, e a sincronização apaga depois
    coalesce((select c.id from public.colaboradores c where c.auth_id = auth.uid() limit 1),
             case when old.excluir then old.autor_id end));
  return old;
end $$;
revoke all on function public.andamento_apagado() from public, anon, authenticated;

drop trigger if exists andamento_apagado on public.andamentos;
create trigger andamento_apagado before delete on public.andamentos
  for each row execute function public.andamento_apagado();
