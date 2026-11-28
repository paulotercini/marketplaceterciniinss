-- F845 · botão Agendar na ficha (plano aprovado pelo Paulo em 28.11.2026): o advogado pede e a assistente virtual
-- escreve ao cliente, oferece as vagas e agenda. O pedido fica em zap_conversas.agendar até o agendamento.
-- A chave config_app.zap_ia_agendar_botao nasce 'nao': a IA só entra com a publicação do zap_plantao aprovada.
alter table public.zap_conversas add column if not exists agendar jsonb;
insert into public.config_app (chave, valor) values ('zap_ia_agendar_botao', 'nao') on conflict (chave) do nothing;

create or replace function public.agendar_texto(p_nome text, p_com text, p_quando text, p_motivo text, p_data text, p_hora text)
returns text language sql immutable as $$
  select case when extract(hour from now() at time zone 'America/Sao_Paulo') < 12 then 'Bom dia'
              when extract(hour from now() at time zone 'America/Sao_Paulo') < 18 then 'Boa tarde' else 'Boa noite' end
    || ', ' || split_part(trim(coalesce(p_nome, '')), ' ', 1) || '. Sou a assistente virtual do escritório Advocacia Previdenciária.'
    || E'\n\n' || p_com || ' solicitou um atendimento no escritório para tratar de ' || trim(both '. ' from p_motivo) || '.'
    || E'\n\n' || case p_quando
         when 'urgente' then 'Por se tratar de assunto urgente, podemos agendar no primeiro horário disponível?'
         when 'data' then 'O horário reservado é o dia ' || to_char(p_data::date, 'DD/MM') || ', às ' || replace(p_hora, ':', 'h')
                          || '. Podemos agendar o seu atendimento nesse horário?'
         else 'Podemos verificar um dia e horário de sua preferência nos próximos dias?' end
$$;

-- o clique do botão: abre (ou reaproveita) a conversa, grava o pedido e manda a primeira mensagem
create or replace function public.agendar_pedir(p_cliente uuid, p_quando text, p_prof text, p_motivo text,
  p_caso uuid default null, p_data text default null, p_hora text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c clientes; v_conv uuid; v_fone text; v_por text; v_com text;
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
  if exists (select 1 from zap_conversas where id = v_conv and agendar->>'estado' = 'aguardando') then
    return jsonb_build_object('erro', 'já há um pedido de agendamento em curso para este cliente'); end if;
  select nome into v_por from colaboradores where auth_id = auth.uid();
  v_com := case p_prof when 'paulo' then 'O Dr. Paulo' when 'marcos' then 'O Dr. Marcos' else 'A Dra. Amanda' end;
  update zap_conversas set ia_conversa = true, agendar = jsonb_build_object('estado', 'aguardando', 'quando', p_quando,
    'prof', p_prof, 'motivo', trim(p_motivo), 'caso', p_caso, 'data', p_data, 'hora', p_hora, 'por', v_por, 'em', now())
   where id = v_conv;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (v_conv, 'saida', true, agendar_texto(c.nome, v_com, p_quando, p_motivo, p_data, p_hora), 'fila', 'agendar:pedido');
  perform zap_nota_sistema(v_conv, null, '📅 ' || coalesce(v_por, 'A equipe') || ' pediu à assistente virtual que agende atendimento com '
    || lower(left(v_com, 1)) || substr(v_com, 2) || ': ' || trim(p_motivo) || '.');
  return jsonb_build_object('ok', true, 'conversa', v_conv);
end $$;

-- o que o zap_plantao lê a cada resposta do cliente
create or replace function public.agendar_contexto(p_conversa uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select agendar from zap_conversas where id = p_conversa and agendar->>'estado' = 'aguardando'
$$;

-- agendado pela IA (ou cancelado pela equipe): devolve a conversa à regra comum
create or replace function public.agendar_fechar(p_conversa uuid, p_estado text default 'agendado') returns void
language sql security definer set search_path = public as $$
  update zap_conversas set ia_conversa = false, agendar = agendar || jsonb_build_object('estado', p_estado, 'fechado_em', now())
   where id = p_conversa and agendar->>'estado' = 'aguardando'
$$;

-- sem resposta: lembrete em 1 dia útil; depois de 2 dias úteis, aviso ao advogado e fim do pedido
create or replace function public.agendar_sem_resposta() returns void
language plpgsql security definer set search_path = public as $$
declare z record; v_ult timestamptz;
begin
  if extract(isodow from now() at time zone 'America/Sao_Paulo') > 5 then return; end if;
  for z in select id, agendar from zap_conversas where agendar->>'estado' = 'aguardando' loop
    select max(criado_em) into v_ult from zap_mensagens where conversa_id = z.id and direcao = 'entrada';
    if v_ult is not null and v_ult > (z.agendar->>'em')::timestamptz then continue; end if;   -- o cliente respondeu
    -- shortcut: dias úteis sem feriado; feriado adia o lembrete em um dia
    if z.agendar->>'lembrete' is null and (select count(*) from generate_series((z.agendar->>'em')::date + 1, current_date, '1 day') d
         where extract(isodow from d) < 6) >= 1 then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
      values (z.id, 'saida', true, 'Retomamos a mensagem anterior sobre o atendimento solicitado pelo advogado. Podemos agendar?', 'fila', 'agendar:lembrete');
      update zap_conversas set agendar = agendar || jsonb_build_object('lembrete', now()) where id = z.id;
    elsif z.agendar->>'lembrete' is not null and (select count(*) from generate_series((z.agendar->>'em')::date + 1, current_date, '1 day') d
         where extract(isodow from d) < 6) >= 2 then
      insert into mencoes (para_id, conversa_id, texto)
      select k.id, z.id, '📅 O cliente não respondeu ao pedido de agendamento: ' || (z.agendar->>'motivo')
        from colaboradores k where k.ativo and lower(split_part(k.nome, ' ', 1)) = z.agendar->>'prof';
      perform agendar_fechar(z.id, 'sem_resposta');
    end if;
  end loop;
end $$;

revoke all on function public.agendar_contexto(uuid), public.agendar_fechar(uuid, text), public.agendar_sem_resposta() from public, anon, authenticated;
grant execute on function public.agendar_pedir(uuid, text, text, text, uuid, text, text) to authenticated;
select cron.schedule('agendar-sem-resposta', '0 12 * * *', 'select public.agendar_sem_resposta()');
