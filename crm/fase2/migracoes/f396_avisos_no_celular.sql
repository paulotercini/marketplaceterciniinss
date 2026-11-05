-- F396 · as notificações do celular (pedido do Paulo de 05.11.2026):
--   1. fora do expediente (antes das 8h, depois das 19h, sábado, domingo e feriado nacional) a
--      mensagem do cliente não avisa, salvo cliente com prazo fatal nos próximos 5 dias; às 8h do
--      dia útil sai um resumo por pessoa (mensagens, menções e prazos fatais do dia);
--   2. a menção a mim avisa no celular, no expediente;
--   3. o resumo das 8h traz também os prazos fatais do dia de quem faz.
-- O agrupamento por conversa e os botões Responder e Ouvir ficam na Edge Function zap_push.
alter table public.mencoes add column if not exists push_em timestamptz;

create or replace function public.push_no_expediente(p_quando timestamptz default now())
returns boolean language sql stable security definer set search_path to 'public' as $$
  with h as (select (p_quando at time zone 'America/Sao_Paulo') as agora)
  select extract(isodow from agora)::text = any (string_to_array(
           coalesce((select valor from config_app where chave = 'push_dias'), '1,2,3,4,5'), ','))
     and agora::time >= coalesce((select valor from config_app where chave = 'push_hora_inicio'), '08:00')::time
     and agora::time <  coalesce((select valor from config_app where chave = 'push_hora_fim'), '19:00')::time
     and not qualidade_feriado(agora::date)
  from h
$$;

-- o cliente da conversa tem prazo fatal aberto nos próximos 5 dias: avisa mesmo de noite
create or replace function public.push_cliente_com_prazo(p_conversa uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from zap_conversas c
      join casos k on k.cliente_id = c.cliente_id
      join andamento_tarefas t on t.caso_id = k.id
     where c.id = p_conversa and t.natureza = 'fatal' and t.concluida_em is null
       and t.lembrar_em between (now() at time zone 'America/Sao_Paulo')::date
                            and (now() at time zone 'America/Sao_Paulo')::date + 5)
$$;

create or replace function public.zap_push_chamar(mid uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from push_inscricoes) then return; end if;
  -- fora do expediente a mensagem espera o resumo das 8h (push_resumo), salvo prazo fatal perto
  if not push_no_expediente() and not push_cliente_com_prazo(
       (select conversa_id from zap_mensagens where id = mid)) then return; end if;
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

-- a menção nova avisa quem foi citado, no expediente (fora dele, vai ao resumo das 8h)
create or replace function public.push_mencao_gatilho() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.de_id is not distinct from new.para_id then return new; end if;
  if not push_no_expediente() then return new; end if;
  if not exists (select 1 from push_inscricoes where colaborador_id = new.para_id) then return new; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := jsonb_build_object('mencao_id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists push_mencao_ins on public.mencoes;
create trigger push_mencao_ins after insert on public.mencoes
  for each row execute function push_mencao_gatilho();

-- O resumo das 8h: uma linha por pessoa com aparelho inscrito. Marca as mensagens e as
-- menções resumidas (push_em), para não avisarem de novo. Só a service_role chama.
create or replace function public.push_resumo_preparar()
returns table (colaborador_id uuid, titulo text, corpo text)
language plpgsql security definer set search_path to 'public' as $$
#variable_conflict use_column
declare v_desde timestamptz; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  v_desde := coalesce((select valor from config_app where chave = 'push_resumo_em')::timestamptz,
                      now() - interval '72 hours');
  insert into config_app (chave, valor) values ('push_resumo_em', now()::text)
    on conflict (chave) do update set valor = excluded.valor;
  return query
  with msgs as (
    update zap_mensagens m set push_em = now()
      from zap_conversas c
     where c.id = m.conversa_id and not coalesce(c.automatica, false)
       and m.direcao = 'entrada' and m.push_em is null
       and m.momento >= v_desde and coalesce(m.quando_wa, m.momento) >= v_desde
    returning m.conversa_id, c.atendente_id
  ), quem as (select distinct i.colaborador_id from push_inscricoes i),
  por_msg as (
    select q.colaborador_id, count(*) n, count(distinct m.conversa_id) conv
      from msgs m join quem q on m.atendente_id is null or m.atendente_id = q.colaborador_id
     group by 1
  ), men as (
    update mencoes x set push_em = now()
     where x.push_em is null and x.lida_em is null and x.criado_em >= v_desde
       and x.de_id is distinct from x.para_id
    returning x.para_id
  ), por_men as (select para_id colaborador_id, count(*) n from men group by 1),
  pz as (
    select t.colaborador_id, string_agg(distinct cl.nome, ', ') nomes, count(distinct t.id) n
      from andamento_tarefas t join casos k on k.id = t.caso_id join clientes cl on cl.id = k.cliente_id
     where t.natureza = 'fatal' and t.concluida_em is null and t.lembrar_em = v_hoje
     group by 1
  )
  select q.colaborador_id, 'Bom dia · resumo do CRM',
         concat_ws(E'\n',
           case when pz.n > 0 then 'Prazo fatal hoje: ' || pz.nomes end,
           case when pm.n > 0 then pm.n || case when pm.n = 1 then ' mensagem' else ' mensagens' end
                || ' no WhatsApp, de ' || pm.conv || case when pm.conv = 1 then ' conversa' else ' conversas' end end,
           case when mn.n > 0 then mn.n || case when mn.n = 1 then ' menção' else ' menções' end || ' para você' end)
    from quem q
    left join por_msg pm on pm.colaborador_id = q.colaborador_id
    left join por_men mn on mn.colaborador_id = q.colaborador_id
    left join pz on pz.colaborador_id = q.colaborador_id
   where coalesce(pz.n, 0) + coalesce(pm.n, 0) + coalesce(mn.n, 0) > 0;
end $$;
revoke execute on function public.push_resumo_preparar() from public, anon, authenticated;

-- o relógio pede o resumo uma vez por dia útil, no primeiro minuto do expediente do aviso
create or replace function public.push_resumo_vez() returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_hoje text := (now() at time zone 'America/Sao_Paulo')::date::text;
begin
  if not push_no_expediente() then return; end if;
  if coalesce((select valor from config_app where chave = 'push_resumo_dia'), '') = v_hoje then return; end if;
  insert into config_app (chave, valor) values ('push_resumo_dia', v_hoje)
    on conflict (chave) do update set valor = excluded.valor;
  if not exists (select 1 from push_inscricoes) then return; end if;
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

-- o resumo começa a contar daqui (sem isso, a primeira manhã juntaria 72 horas já avisadas)
insert into config_app (chave, valor) values ('push_resumo_em', now()::text) on conflict (chave) do nothing;

create or replace function public.zap_relogio() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer := 0; r record;
begin
  update zap_mensagens set status = 'fila'
   where status = 'agendada' and enviar_em <= now();
  get diagnostics n = row_count;
  for r in select z.id, z.conversa_id, coalesce(z.colaborador_id, c.atendente_id) quem, z.nota,
                  coalesce(nullif(trim(c.nome_perfil), ''), c.telefone) nome
             from zap_retornos z join zap_conversas c on c.id = z.conversa_id
            where z.feito_em is null and z.avisado_em is null and z.quando <= now() loop
    if r.quem is not null then
      insert into mencoes (para_id, conversa_id, texto)
      values (r.quem, r.conversa_id, '⏰ Retorno: responder ' || coalesce(r.nome, 'o contato')
              || coalesce(' — ' || nullif(trim(r.nota), ''), ''));
    end if;
    update zap_retornos set avisado_em = now() where id = r.id;
  end loop;
  perform zap_bot_esperas();
  perform zap_triagem_vencidas();
  perform zap_plantao_vencidas();
  perform zap_push_audios_vencidos();
  perform push_resumo_vez();
  return n;
end $$;
