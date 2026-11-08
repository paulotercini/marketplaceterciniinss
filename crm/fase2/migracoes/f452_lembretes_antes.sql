-- F452 · o lembrete antes da perícia, da audiência e da tarefa com hora (proposta 8 do Todoist, aprovada
-- pelo Paulo em 08.11.2026): no aparelho inscrito (F335), na véspera às 8h, 2 horas antes e 30 minutos
-- antes. A perícia, a audiência e a avaliação social agendadas de caso aberto avisam quem responde pelo
-- caso (atribuicoes) e o advogado do cliente (campos.advogado_id); sem nenhum, o administrador. A tarefa
-- aberta com hora (andamento_tarefas.lembrar_hora) avisa quem a fará. Cada marco sai uma vez
-- (push_lembretes) e somente dentro do horário dos avisos de cada pessoa (F399, push_inscricoes_agora,
-- na Edge Function). config_app.push_lembretes = 'nao' desliga.

create table if not exists public.push_lembretes (
  chave text primary key,            -- '<ev|tf>:<id>:<d1|h2|m30>:<colaborador>'
  em timestamptz not null default now()
);
-- shortcut: sem limpeza (poucas linhas por dia, e o apagar pede a confirmação do aplicar_migracoes.py); se crescer, limpar o que passou de 3 dias
alter table public.push_lembretes enable row level security;   -- só a service_role

-- o que está para avisar agora: um marco por item e pessoa, o mais próximo do horário
create or replace function public.push_lembretes_devidos()
returns table (chave text, colaborador_id uuid, titulo text, corpo text, tag text, cliente_id uuid)
language sql stable security definer set search_path to 'public' as $$
  with itens as (
    select 'ev:' || e.id tipo_id, e.data_hora alvo, e.tipo rot,
           concat_ws(' · ', cl.nome, nullif(e.local, '')) corpo, cl.id cli, k.id caso_id, cl.campos->>'advogado_id' adv,
           null::uuid quem
      from eventos e join casos k on k.id = e.caso_id and k.fase <> 'encerrado'
      join clientes cl on cl.id = k.cliente_id
     where e.status = 'agendada' and e.data_hora > now() and e.data_hora < now() + interval '40 hours'
    union all
    select 'tf:' || t.id, ((t.lembrar_em + t.lembrar_hora) at time zone 'America/Sao_Paulo'), 'Tarefa',
           concat_ws(' · ', cl.nome, left(regexp_replace(coalesce(a.texto, ''), '\s+', ' ', 'g'), 120)), cl.id, k.id, null, t.colaborador_id
      from andamento_tarefas t join casos k on k.id = t.caso_id
      join clientes cl on cl.id = k.cliente_id
      left join andamentos a on a.id = t.andamento_id
     where t.concluida_em is null and t.lembrar_hora is not null
       and t.lembrar_em between (now() at time zone 'America/Sao_Paulo')::date and (now() at time zone 'America/Sao_Paulo')::date + 1
  ), marcos as (
    select i.*, case
             when now() >= i.alvo - interval '30 minutes' then 'm30'
             when now() >= i.alvo - interval '2 hours' then 'h2'
             when now() >= ((i.alvo at time zone 'America/Sao_Paulo')::date - 1 + time '08:00') at time zone 'America/Sao_Paulo' then 'd1'
           end marco,
           to_char(i.alvo at time zone 'America/Sao_Paulo', 'HH24:MI') hora
      from itens i where i.alvo > now()
  ), pessoas as (
    select m.*, p.id pessoa from marcos m
      cross join lateral (
        select x.id from (
          select m.quem id where m.quem is not null
          union select a.colaborador_id from atribuicoes a where m.quem is null and a.caso_id = m.caso_id
          union select k.id from colaboradores k where m.quem is null and k.ativo and k.id::text = m.adv
        ) x
        union
        select k.id from colaboradores k
         where m.quem is null and k.ativo and k.papel = 'admin'
           and not exists (select 1 from atribuicoes a where a.caso_id = m.caso_id)
           and not exists (select 1 from colaboradores k2 where k2.ativo and k2.id::text = m.adv)
      ) p
     where m.marco is not null
  )
  select p.tipo_id || ':' || p.marco || ':' || p.pessoa, p.pessoa,
         p.rot || case p.marco when 'd1' then ' amanhã às ' || p.hora
                               when 'h2' then ' em 2 h (' || p.hora || ')'
                               else ' em 30 min (' || p.hora || ')' end,
         p.corpo, 'crm-lem-' || p.tipo_id, p.cli
    from pessoas p
   where coalesce((select valor from config_app where chave = 'push_lembretes'), 'sim') <> 'nao'
     and exists (select 1 from push_inscricoes i where i.colaborador_id = p.pessoa)
     and not exists (select 1 from push_lembretes l where l.chave = p.tipo_id || ':' || p.marco || ':' || p.pessoa)
$$;
revoke execute on function public.push_lembretes_devidos() from public, anon, authenticated;

-- a Edge Function pega e marca o que vai sair (uma vez por chave)
create or replace function public.push_lembretes_preparar()
returns table (colaborador_id uuid, titulo text, corpo text, tag text, cliente_id uuid)
language sql security definer set search_path to 'public' as $$
  with d as (select * from push_lembretes_devidos()),
       m as (insert into push_lembretes (chave) select d.chave from d on conflict do nothing returning push_lembretes.chave)
  select d.colaborador_id, d.titulo, d.corpo, d.tag, d.cliente_id from d join m on m.chave = d.chave
$$;
revoke execute on function public.push_lembretes_preparar() from public, anon, authenticated;

create or replace function public.push_lembretes_vez() returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from push_lembretes_devidos()) then return; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := '{"lembretes":true}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
end $$;
revoke execute on function public.push_lembretes_vez() from public, anon, authenticated;

select cron.unschedule('push-lembretes') where exists (select 1 from cron.job where jobname = 'push-lembretes');
select cron.schedule('push-lembretes', '*/5 * * * *', 'select public.push_lembretes_vez()');
