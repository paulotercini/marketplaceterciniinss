-- F452b · reaplica a F399 (horário dos avisos e silenciar), que consta em _ja_aplicadas.txt mas nunca
-- entrou no banco: push_inscricoes_agora e zap_silencio não existiam em 08.11.2026, e o zap_push novo
-- (F399, F409, F452) depende deles. Idempotente; o drop function recria o push_resumo_preparar.
-- destrutiva-confirmada: Paulo, 08.11.2026 (cartão da thread do Todoist)
alter table public.colaboradores
  add column if not exists push_de time,
  add column if not exists push_ate time,
  add column if not exists push_resumo_dia date,
  add column if not exists push_resumo_em timestamptz;

update colaboradores set push_de = '07:00', push_ate = '13:00' where nome = 'Meissa' and push_de is null;
update colaboradores set push_de = '13:00', push_ate = '17:00' where nome = 'Ingrid' and push_de is null;

create or replace function public.push_aberto(p_colab uuid, p_quando timestamptz default now())
returns boolean language sql stable security definer set search_path to 'public' as $$
  select case when k.push_de is null or k.push_ate is null then true else
           extract(isodow from h.agora)::text = any (string_to_array(
             coalesce((select valor from config_app where chave = 'push_dias'), '1,2,3,4,5'), ','))
       and h.agora::time >= k.push_de and h.agora::time < k.push_ate
       and not qualidade_feriado(h.agora::date) end
    from colaboradores k, (select p_quando at time zone 'America/Sao_Paulo' as agora) h
   where k.id = p_colab
$$;

-- as inscrições de quem está no horário agora (a Edge Function zap_push lê daqui)
create or replace function public.push_inscricoes_agora()
returns setof public.push_inscricoes language sql stable security definer set search_path to 'public' as $$
  select i.* from push_inscricoes i where coalesce(push_aberto(i.colaborador_id), true)
$$;
revoke execute on function public.push_inscricoes_agora() from public, anon, authenticated;

-- cada um grava o próprio horário; nulo = a qualquer hora
create or replace function public.push_meu_horario(p_de time, p_ate time)
returns void language sql security definer set search_path to 'public' as $$
  update colaboradores
     set push_de = case when p_de is not null and p_ate is not null and p_de < p_ate then p_de end,
         push_ate = case when p_de is not null and p_ate is not null and p_de < p_ate then p_ate end
   where auth_id = auth.uid() and ativo
$$;
revoke execute on function public.push_meu_horario(time, time) from public, anon;
grant execute on function public.push_meu_horario(time, time) to authenticated;

-- o filtro passa a ser por pessoa, na Edge Function: o banco chama sempre
create or replace function public.zap_push_chamar(mid uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from push_inscricoes) then return; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := jsonb_build_object('mensagem_id', mid),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
end $$;
revoke execute on function public.zap_push_chamar(uuid) from public, anon, authenticated;

-- quem deve o resumo agora: o horário abriu hoje e ainda não recebeu; a qualquer hora, às 8h
create or replace function public.push_resumo_devidos()
returns setof uuid language sql stable security definer set search_path to 'public' as $$
  select k.id from colaboradores k
   where k.ativo and exists (select 1 from push_inscricoes i where i.colaborador_id = k.id)
     and k.push_resumo_dia is distinct from (now() at time zone 'America/Sao_Paulo')::date
     and case when k.push_de is null then push_no_expediente() else push_aberto(k.id) end
$$;
revoke execute on function public.push_resumo_devidos() from public, anon, authenticated;

drop function if exists public.push_resumo_preparar();
create function public.push_resumo_preparar()
returns table (colaborador_id uuid, titulo text, corpo text)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
declare v_hoje date := (now() at time zone 'America/Sao_Paulo')::date; v_ids uuid[];
begin
  select array_agg(d) into v_ids from push_resumo_devidos() d;
  if v_ids is null then return; end if;
  return query
  with quem as (
    select k.id, k.push_de is not null janela,
           coalesce(k.push_resumo_em, now() - interval '24 hours') desde
      from colaboradores k where k.id = any (v_ids)
  ), marca as (  -- o update do with roda mesmo sem ser lido; as leituras veem o antes
    update colaboradores k set push_resumo_dia = v_hoje, push_resumo_em = now()
      from quem q where k.id = q.id returning k.id
  ), por_msg as (
    -- só para quem tem horário: o que chegou com o horário fechado
    select q.id, count(*) n, count(distinct m.conversa_id) conv
      from quem q
      join zap_mensagens m on m.direcao = 'entrada' and m.momento >= q.desde
      join zap_conversas c on c.id = m.conversa_id and not coalesce(c.automatica, false)
                          and (c.atendente_id is null or c.atendente_id = q.id)
     where q.janela and not push_aberto(q.id, m.momento)
     group by 1
  ), por_men as (
    select q.id, count(*) n from quem q
      join mencoes x on x.para_id = q.id and x.lida_em is null and x.criado_em >= q.desde
                    and x.de_id is distinct from x.para_id
     where q.janela and not push_aberto(q.id, x.criado_em)
     group by 1
  ), pz as (
    select t.colaborador_id id, string_agg(distinct cl.nome, ', ') nomes, count(distinct t.id) n
      from andamento_tarefas t join casos k on k.id = t.caso_id join clientes cl on cl.id = k.cliente_id
     where t.natureza = 'fatal' and t.concluida_em is null and t.lembrar_em = v_hoje
       and t.colaborador_id = any (v_ids)
     group by 1
  )
  select q.id, 'Resumo do CRM',
         concat_ws(E'\n',
           case when pz.n > 0 then 'Prazo fatal hoje: ' || pz.nomes end,
           case when pm.n > 0 then pm.n || case when pm.n = 1 then ' mensagem' else ' mensagens' end
                || ' no WhatsApp, de ' || pm.conv || case when pm.conv = 1 then ' conversa' else ' conversas' end end,
           case when mn.n > 0 then mn.n || case when mn.n = 1 then ' menção' else ' menções' end || ' para você' end)
    from quem q
    left join por_msg pm on pm.id = q.id
    left join por_men mn on mn.id = q.id
    left join pz on pz.id = q.id
   where coalesce(pz.n, 0) + coalesce(pm.n, 0) + coalesce(mn.n, 0) > 0;
end $$;
revoke execute on function public.push_resumo_preparar() from public, anon, authenticated;

-- o relógio pede o resumo quando alguém o deve
create or replace function public.push_resumo_vez() returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from push_resumo_devidos()) then return; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := '{"resumo":true}'::jsonb,
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
end $$;
revoke execute on function public.push_resumo_vez() from public, anon, authenticated;

-- o primeiro resumo conta daqui (sem isso, juntaria 24 horas já avisadas)
update colaboradores set push_resumo_em = now() where push_resumo_em is null;

-- F409 · silenciar uma conversa por algumas horas, de cada pessoa (pedido do Paulo de 05.11.2026):
-- o aviso do aparelho e o do navegador não saem para quem silenciou, até a hora marcada.
create table if not exists public.zap_silencio (
  colaborador_id uuid not null references colaboradores(id) on delete cascade,
  conversa_id uuid not null references zap_conversas(id) on delete cascade,
  ate timestamptz not null,
  primary key (colaborador_id, conversa_id)
);
alter table public.zap_silencio enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'zap_silencio' and policyname = 'silencio_meu') then
    create policy silencio_meu on zap_silencio for all
      using (colaborador_id = (select id from colaboradores where auth_id = auth.uid()))
      with check (colaborador_id = (select id from colaboradores where auth_id = auth.uid()));
  end if;
end $$;
grant select, insert, update, delete on public.zap_silencio to authenticated;
