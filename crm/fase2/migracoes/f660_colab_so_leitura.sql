-- F660 · versão de leitura: o colaborador (papel 'colaborador') lê, mas não anota nem altera prazos, casos e fichas.
-- Volta a escrever com: update colaboradores set so_leitura = false where id = '<id>';
alter table public.colaboradores add column if not exists so_leitura boolean not null default true;

create or replace function public.sou_so_leitura() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from colaboradores where auth_id = auth.uid() and papel = 'colaborador' and so_leitura);
$$;

do $$
declare t text;
begin
  foreach t in array array['andamentos','andamento_tarefas','tarefas','lembretes','casos','clientes','anexos',
                           'atribuicoes','eventos','pagamentos','aposentadorias','meu_dia'] loop
    execute format('drop policy if exists so_leitura_ins on public.%I', t);
    execute format('drop policy if exists so_leitura_upd on public.%I', t);
    execute format('drop policy if exists so_leitura_del on public.%I', t);
    execute format('create policy so_leitura_ins on public.%I as restrictive for insert to authenticated with check (not (select sou_so_leitura()))', t);
    execute format('create policy so_leitura_upd on public.%I as restrictive for update to authenticated using (not (select sou_so_leitura()))', t);
    execute format('create policy so_leitura_del on public.%I as restrictive for delete to authenticated using (not (select sou_so_leitura()))', t);
  end loop;
end $$;
