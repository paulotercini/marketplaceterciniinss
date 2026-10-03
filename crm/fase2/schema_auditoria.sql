-- E4 · auditoria To Do × CRM (29.09.2026)
-- Uma vez por dia (06h50) e pelo botão do CRM, a rodada da sincronização lê o
-- To Do inteiro e compara, lista por lista e cliente por cliente, com o que o
-- CRM tem. Cada diferença vira uma linha de todo_auditoria; o resumo fica em
-- config_app (chave auditoria_todo), que o CRM já carrega.
--
-- A comparação acontece no programa da rodada (crm/auditoria_todo.py), mas o
-- banco manda só o necessário e compactado (crm_auditoria_extrato): marcas de
-- 10 caracteres no lugar dos textos e nenhum nome. Cerca de 2 MB por rodada
-- de auditoria, uma por dia, dentro da cota de tráfego do plano gratuito.

create table if not exists public.todo_auditoria (
  id           bigint generated always as identity primary key,
  rodada       timestamptz not null,
  lista        text not null,
  tipo         text not null,
  todo_task_id text,
  caso_id      uuid,
  cliente_id   uuid,
  lembrete_id  uuid,
  titulo       text,       -- só quando o CRM não tem o cliente para dar o nome
  detalhe      text,       -- contagens (anotações e subtarefas)
  no_todo      text,
  no_crm       text
);
create index if not exists todo_auditoria_rodada on public.todo_auditoria (rodada);
alter table public.todo_auditoria enable row level security;
drop policy if exists todo_auditoria_ler on public.todo_auditoria;
create policy todo_auditoria_ler on public.todo_auditoria for select to authenticated using (true);

-- o que a auditoria precisa do banco, sem texto de cliente
create or replace function public.crm_auditoria_extrato() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'casos', coalesce((select jsonb_agg(jsonb_build_array(c.id, c.todo_task_id, c.cliente_id, c.fase,
                         c.origem_lista, c.prazo, c.importante))
                         from public.casos c
                        where c.todo_task_id is not null or c.fase is distinct from 'encerrado'), '[]'::jsonb),
    -- anotações vindas do To Do: dia + texto em 10 caracteres de md5, repetidas se duplicadas
    'anotacoes', coalesce((select jsonb_object_agg(x.caso_id, x.hs) from (
                    select a.caso_id, jsonb_agg(left(md5(to_char(a.criado_em at time zone 'America/Sao_Paulo',
                           'YYYY-MM-DD') || '|' || a.texto), 10)) as hs
                      from public.andamentos a where a.origem = 'todo' group by a.caso_id) x), '{}'::jsonb),
    -- anotações escritas no CRM, que podem ter ido ao To Do pela escrita de volta
    'anotacoes_app', coalesce((select jsonb_object_agg(x.caso_id, x.hs) from (
                    select a.caso_id, jsonb_agg(left(md5(to_char(a.criado_em at time zone 'America/Sao_Paulo',
                           'YYYY-MM-DD') || '|' || a.texto), 10)) as hs
                      from public.andamentos a where a.origem = 'app' group by a.caso_id) x), '{}'::jsonb),
    'subtarefas', coalesce((select jsonb_object_agg(x.caso_id, x.ts) from (
                    select t.caso_id, jsonb_agg(jsonb_build_array(left(md5(t.titulo), 10), t.concluida)) as ts
                      from public.tarefas t where t.caso_id is not null group by t.caso_id) x), '{}'::jsonb),
    'particulares', coalesce((select jsonb_agg(jsonb_build_array(t.id, t.prazo, t.concluida))
                         from public.tarefas t where t.particular_de is not null), '[]'::jsonb),
    'parcelas', coalesce((select jsonb_agg(jsonb_build_array(p.todo_item_id, p.status, p.cliente_id))
                         from public.pagamentos p where p.todo_item_id is not null), '[]'::jsonb),
    'lembretes', coalesce((select jsonb_agg(jsonb_build_array(l.id, l.detalhes->>'todo_task_id', l.proximo_em,
                         l.ativo, jsonb_array_length(coalesce(l.detalhes->'anotacoes', '[]'::jsonb)),
                         l.origem_caso, l.cliente_id))
                         from public.lembretes l), '[]'::jsonb),
    -- quem existe no CRM; o CPF só dos poucos cadastrados no CRM com id fora
    -- do padrão (os demais têm o id determinístico do migrar.py)
    'clientes', coalesce((select jsonb_agg(c.id) from public.clientes c), '[]'::jsonb),
    'clientes_fora', coalesce((select jsonb_agg(jsonb_build_array(trim(c.cpf), c.id))
                         from public.clientes c
                        where nullif(trim(c.cpf), '') is not null
                          and c.id <> extensions.uuid_generate_v5('5f0aa3f0-90a1-4a4e-9e6b-7a2b1c3d4e5f'::uuid,
                                                                  'cliente|cpf|' || trim(c.cpf))), '[]'::jsonb)
  )
$$;
revoke execute on function public.crm_auditoria_extrato() from public, anon, authenticated;
