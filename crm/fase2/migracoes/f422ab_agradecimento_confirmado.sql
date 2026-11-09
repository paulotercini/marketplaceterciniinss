-- F422ab (pedido do Paulo de 09.11.2026): o 👍 ou o "obrigado" que vem logo depois da confirmação
-- não recebe o menu do robô nem resposta da IA. Até 12 horas depois de confirmado, o agradecimento curto fica sem resposta.

create or replace function public.zap_conf_agradece(p_tipo text, p_texto text)
returns boolean language plpgsql immutable as $$
declare t text;
begin
  if p_tipo = 'figurinha' then return true; end if;
  if p_tipo <> 'texto' then return false; end if;
  t := lower(trim(coalesce(p_texto, '')));
  if t = '' or length(t) > 40 or t like '%?%' then return false; end if;
  -- só emoji e pontuação
  if regexp_replace(t, '[[:alnum:]]', '', 'g') = t then return true; end if;
  t := trim(regexp_replace(t, '[^[:alnum:][:space:]áàâãéêíóôõúç]', ' ', 'g'));
  -- toda palavra precisa ser de agradecimento ou concordância: "ok, mas quero remarcar" segue para quem responde
  return not exists (select 1 from regexp_split_to_table(t, '\s+') w
    where w <> '' and w not in ('ok','okay','obrigado','obrigada','obg','brigado','brigada','muito','valeu','vlw','beleza','blz',
      'combinado','certo','ta','tá','bom','está','esta','até','ate','lá','la','show','perfeito','isso','sim','amém','amem',
      'deus','abençoe','abencoe','graças','gracas','a','o','e','confirmado','entendi','entendido','doutor','doutora','dr','dra',
      'então','entao','tchau','dia','tarde','noite','boa','vou','estarei','eu'));
end $$;

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
