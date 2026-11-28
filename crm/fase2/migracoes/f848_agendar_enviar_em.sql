-- F848 · botão Agendar: o advogado escolhe quando a primeira mensagem sai (Paulo, 28.11.2026); por padrão, em dia útil.
-- O pedido programado fica em zap_conversas.agendar com estado 'programado' até agendar_enviar_programados mandar.
drop function if exists public.agendar_pedir(uuid, text, text, text, uuid, text, text);
create or replace function public.agendar_pedir(p_cliente uuid, p_quando text, p_prof text, p_motivo text,
  p_caso uuid default null, p_data text default null, p_hora text default null, p_enviar_em timestamptz default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clientes; v_conv uuid; v_fone text; v_por text; v_com text; v_prog boolean := p_enviar_em is not null and p_enviar_em > now() + interval '2 minutes';
begin
  if not sou_ativo() then return jsonb_build_object('erro', 'sem permissão'); end if;
  if coalesce((select valor from config_app where chave = 'zap_ia_agendar_botao'), 'nao') <> 'sim' then
    return jsonb_build_object('erro', 'a assistente virtual ainda não agenda por este botão'); end if;
  if p_quando not in ('urgente', 'data', 'sem_pressa') or p_prof not in ('paulo', 'marcos', 'amanda') then
    return jsonb_build_object('erro', 'pedido incompleto'); end if;
  if length(trim(coalesce(p_motivo, ''))) < 4 then return jsonb_build_object('erro', 'informe o motivo'); end if;
  if p_quando = 'data' and (p_data is null or p_hora !~ '^\d{2}:\d{2}$') then return jsonb_build_object('erro', 'informe o dia e o horário'); end if;
  select * into c from clientes where id = p_cliente;
  if c.id is null then return jsonb_build_object('erro', 'cliente não encontrado'); end if;
  select id into v_conv from zap_conversas where cliente_id = p_cliente order by ultima_em desc nulls last limit 1;
  if v_conv is null then
    v_fone := regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g');
    if length(v_fone) in (8, 9) then v_fone := '16' || v_fone; end if;
    if length(v_fone) in (10, 11) then v_fone := '55' || v_fone; end if;
    if length(v_fone) < 12 then return jsonb_build_object('erro', 'o cliente não tem celular cadastrado'); end if;
    v_conv := zap_abrir(v_fone, c.nome);
  end if;
  if exists (select 1 from zap_conversas where id = v_conv and agendar->>'estado' in ('aguardando', 'programado')) then
    return jsonb_build_object('erro', 'já há um pedido de agendamento em curso para este cliente'); end if;
  select nome into v_por from colaboradores where auth_id = auth.uid();
  v_com := case p_prof when 'paulo' then 'O Dr. Paulo' when 'marcos' then 'O Dr. Marcos' else 'A Dra. Amanda' end;
  update zap_conversas set agendar = jsonb_build_object('estado', case when v_prog then 'programado' else 'aguardando' end,
    'quando', p_quando, 'prof', p_prof, 'motivo', trim(p_motivo), 'caso', p_caso, 'data', p_data, 'hora', p_hora, 'por', v_por,
    'nome', c.nome, 'enviar_em', p_enviar_em, 'em', now())
   where id = v_conv;
  perform zap_nota_sistema(v_conv, null, '📅 ' || coalesce(v_por, 'A equipe') || ' pediu à assistente virtual que agende atendimento com '
    || lower(left(v_com, 1)) || substr(v_com, 2) || ': ' || trim(p_motivo) || case when v_prog then '. Envio programado para '
    || to_char(p_enviar_em at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24"h"MI') else '' end || '.');
  if not v_prog then perform agendar_enviar(v_conv); end if;
  return jsonb_build_object('ok', true, 'conversa', v_conv, 'programado', v_prog);
end $$;

-- manda a primeira mensagem e liga a IA na conversa
create or replace function public.agendar_enviar(p_conversa uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a jsonb;
begin
  select agendar into a from zap_conversas where id = p_conversa;
  if a is null or a->>'estado' not in ('aguardando', 'programado') then return; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (p_conversa, 'saida', true, agendar_texto(a->>'nome', case a->>'prof' when 'paulo' then 'O Dr. Paulo' when 'marcos' then 'O Dr. Marcos'
    else 'A Dra. Amanda' end, a->>'quando', a->>'motivo', a->>'data', a->>'hora'), 'fila', 'agendar:pedido');
  update zap_conversas set ia_conversa = true, agendar = agendar || jsonb_build_object('estado', 'aguardando', 'em', now()) where id = p_conversa;
end $$;

create or replace function public.agendar_enviar_programados() returns void
language plpgsql security definer set search_path = public as $$
declare z record;
begin
  for z in select id from zap_conversas where agendar->>'estado' = 'programado' and (agendar->>'enviar_em')::timestamptz <= now() loop
    perform agendar_enviar(z.id);
  end loop;
end $$;

revoke all on function public.agendar_enviar(uuid), public.agendar_enviar_programados() from public, anon, authenticated;
grant execute on function public.agendar_pedir(uuid, text, text, text, uuid, text, text, timestamptz) to authenticated;
select cron.schedule('agendar-programados', '*/5 * * * *', 'select public.agendar_enviar_programados()');
