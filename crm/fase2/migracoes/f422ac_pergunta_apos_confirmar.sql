-- F422ac (pedido do Paulo de 09.11.2026): depois de confirmado o atendimento, a pergunta do cliente
-- ("preciso saber quais documentos") ia ao menu do SMBot, que pedia o nome; agora vai à IA até o dia do atendimento.
create or replace function public.zap_conf_resposta(p_msg uuid)
 returns boolean language plpgsql security definer set search_path to 'public'
as $function$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' then return false; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.confirmacao->>'msg' = p_msg::text then return true; end if;
  if c.confirmacao->>'estado' in ('sim', 'confirmado')
     and coalesce((c.confirmacao->>'confirmado_em')::timestamptz, (c.confirmacao->>'respondida_em')::timestamptz) > now() - interval '12 hours'
     and zap_conf_agradece(m.tipo, m.texto) then
    update zap_mensagens set bot_ia = 'conf:agradeceu' where id = p_msg;
    return true;
  end if;
  -- F422ac: confirmado e antes do fim do dia do atendimento, a pergunta vai à IA, e não ao menu do robô.
  if c.confirmacao->>'estado' in ('sim', 'confirmado')
     and (c.confirmacao->>'data')::date >= (now() at time zone 'America/Sao_Paulo')::date
     and zap_conf_ia_remarca() then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('msg', p_msg) where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  if coalesce(zap_conf_remarcando(c), false) then
    if not zap_conf_ia_remarca() then return false; end if;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('msg', p_msg)
      || case when coalesce((confirmacao->>'duvida')::boolean, false)
              then jsonb_build_object('ler', true, 'reler', true,
                     'classe', case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end)
              else '{}'::jsonb end
     where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  if not coalesce(zap_conf_espera(c), false) then return false; end if;
  v_classe := case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end;
  if zap_conf_ia_remarca() then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
        'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
        'estado', 'remarcando', 'remarcar_em', now(), 'ler', true, 'reler', false, 'classe', v_classe, 'duvida', v_classe = 'duvida', 'avisada', true)
     where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  v_pedido := gen_random_uuid()::text;
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
      'estado', v_classe, 'pedido', case when v_classe = 'sim' then v_pedido end,
      'avisada', coalesce((confirmacao->>'avisada')::boolean, false) or v_classe <> 'sim')
   where id = c.id;
  if v_classe = 'sim' then
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
        body := jsonb_build_object('acao', 'confirmar', 'conversa_id', c.id, 'pedido', v_pedido),
        headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 30000);
    exception when others then
      perform zap_conf_avisar(c.id, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada: confirme à mão.');
    end;
  elsif v_classe = 'nao' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select c.id, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_nao' and trim(valor) <> '';
    perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
    perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $function$;
