-- E2 · a sincronização pergunta ao banco só o que precisa (29.09.2026)
-- Para remapear ids, reconhecer mudança de lista e preservar processo/NB, o
-- migrar.py baixava a carteira inteira de casos e o CPF de todos os clientes:
-- 1,2 MB por rodada, que a sincronização a cada 10 minutos transformaria em
-- 100 MB por dia de uma cota de 5 GB por mês. Agora ele manda as tarefas que
-- leu do To Do (tráfego de entrada, que não conta) e recebe só as exceções,
-- cerca de 60 KB. Sem esta função, o migrar.py segue pelo caminho antigo.
--
-- O id determinístico é o mesmo do migrar.py: uuid5 do namespace do CRM sobre
-- "caso|<tarefa>" e "cliente|cpf|<cpf>" (conferido em 29.09: bate em 98% dos
-- casos e 99,8% dos clientes; os demais são justamente as exceções).

create or replace function public.crm_sync_existentes(vivos text[], consultar text[], sem_numero text[])
returns jsonb language sql stable set search_path = '' as $$
  with ns as (select '5f0aa3f0-90a1-4a4e-9e6b-7a2b1c3d4e5f'::uuid as n),
  vivas as (select distinct unnest(vivos) as t),
  pedidas as (select t from vivas union select unnest(consultar)),
  semnum as (select distinct unnest(sem_numero) as t),
  k as (select c.id, c.todo_task_id, c.cliente_id, c.titulo, c.fase, c.processo, c.nb
          from public.casos c where c.todo_task_id is not null)
  select jsonb_build_object(
    -- clientes cujo id não é o determinístico (cadastrados no CRM)
    'clientes', coalesce((select jsonb_agg(jsonb_build_array(trim(c.cpf), c.id))
       from public.clientes c cross join ns
      where nullif(trim(c.cpf), '') is not null
        and c.id <> extensions.uuid_generate_v5(ns.n, 'cliente|cpf|' || trim(c.cpf))), '[]'::jsonb),
    -- casos das tarefas lidas cujo id não é o determinístico
    'trocas', coalesce((select jsonb_agg(jsonb_build_array(k.todo_task_id, k.id))
       from k join pedidas p on p.t = k.todo_task_id cross join ns
      where k.id <> extensions.uuid_generate_v5(ns.n, 'caso|' || k.todo_task_id)), '[]'::jsonb),
    -- tarefas lidas que o banco ainda não tem
    'novas', coalesce((select jsonb_agg(p.t) from pedidas p
      where not exists (select 1 from k where k.todo_task_id = p.t)), '[]'::jsonb),
    -- casos abertos cuja tarefa não veio na leitura (mudou de lista ou sumiu)
    'orfaos', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'todo_task_id', k.todo_task_id,
         'cliente_id', k.cliente_id, 'titulo', k.titulo, 'fase', k.fase,
         'processo', k.processo, 'nb', k.nb))
       from k where k.fase is distinct from 'encerrado'
        and not exists (select 1 from vivas v where v.t = k.todo_task_id)), '[]'::jsonb),
    -- processo/NB guardados no banco para as tarefas que chegaram sem eles
    'numeros', coalesce((select jsonb_agg(jsonb_build_array(k.todo_task_id, k.processo, k.nb))
       from k join semnum s on s.t = k.todo_task_id
      where k.processo is not null or k.nb is not null), '[]'::jsonb)
  )
$$;
-- só a sincronização (chave de serviço) chama
revoke execute on function public.crm_sync_existentes(text[], text[], text[]) from public, anon, authenticated;
