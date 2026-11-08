-- F422z · teste da confirmação de 08.11.2026: quem respondeu com dúvida e depois confirma ("Sim, pode confirmar")
-- ouvia da IA que o atendimento estava mantido, mas a agenda não era confirmada, porque só a primeira resposta
-- passava pela leitura da intenção ('ler'). Agora, enquanto a conversa está em dúvida, cada nova resposta é lida de
-- novo ('reler'): confirmar segue o caminho do SIM (agenda e zap_conf_sim); remarcar avisa a equipe; outra dúvida
-- não repete o aviso à equipe, e a IA responde.

create or replace function public.zap_conf_resposta(p_msg uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' then return false; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.confirmacao->>'msg' = p_msg::text then return true; end if;
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
end $$;

create or replace function public.zap_conf_ia_intencao(p_conversa uuid, p_intencao text, p_msg uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c zap_conversas; m zap_mensagens; v_pedido text; v_txt text; v_reler boolean;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not coalesce((c.confirmacao->>'ler')::boolean, false) then return 'lida'; end if;
  v_reler := coalesce((c.confirmacao->>'reler')::boolean, false);
  select * into m from zap_mensagens where id = p_msg;
  v_txt := left(coalesce(m.texto, '[' || m.tipo || ']'), 120);
  if p_intencao = 'confirmar' then
    v_pedido := gen_random_uuid()::text;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'sim', 'pedido', v_pedido, 'ler', false, 'reler', false, 'duvida', false)
     where id = p_conversa;
    perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual entendeu que o cliente confirmou: ' || v_txt);
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
        body := jsonb_build_object('acao', 'confirmar', 'conversa_id', p_conversa, 'pedido', v_pedido),
        headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 30000);
    exception when others then
      perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada: confirme à mão.');
    end;
  elsif p_intencao = 'remarcar' then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('ler', false, 'reler', false, 'duvida', false) where id = p_conversa;
    perform zap_conf_avisar(p_conversa, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '. A assistente virtual está oferecendo novos horários; se ela não remarcar, a conversa volta à equipe.');
    perform zap_nota_sistema(p_conversa, null, '📅 Resposta à confirmação: remarcar. A assistente virtual oferece novos horários.');
  else
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('ler', false, 'reler', false, 'duvida', true) where id = p_conversa;
    if not v_reler then
      perform zap_conf_avisar(p_conversa, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: '
        || v_txt || '. A assistente virtual responde; confirme na agenda se o cliente confirmar.');
      perform zap_nota_sistema(p_conversa, null, '📅 Resposta à confirmação com pergunta ou pedido. A assistente virtual responde.');
    end if;
  end if;
  return p_intencao;
end $$;
