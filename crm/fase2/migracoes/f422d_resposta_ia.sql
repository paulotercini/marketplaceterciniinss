-- F422d · pedidos do Paulo de 07.11.2026, depois do teste com o número pessoal:
-- 1. com a IA na remarcação, o NÃO não recebe mais a resposta fixa ("Nossa equipe vai entrar em contato…"),
--    que contradizia a IA (aplicado no banco em 07.11.2026);
-- 2. a resposta que não é SIM nem NÃO (pergunta, "vou atrasar", áudio) também vai à IA, com a recepção e o
--    advogado avisados como antes; a IA responde e, se a pessoa quiser outro horário, o Agendador remarca.

create or replace function public.zap_conf_resposta(p_msg uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text; v_ia boolean;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' then return false; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.confirmacao->>'msg' = p_msg::text then return true; end if;
  -- remarcação em curso: a mensagem vai só à IA (os três gatilhos param aqui pela marca 'msg')
  if coalesce(zap_conf_remarcando(c), false) then
    if not zap_conf_ia_remarca() then return false; end if;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('msg', p_msg) where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  if not coalesce(zap_conf_espera(c), false) then return false; end if;
  v_classe := case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end;
  v_pedido := gen_random_uuid()::text;
  v_ia := v_classe in ('nao', 'duvida') and zap_conf_ia_remarca();
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
      'estado', case when v_ia then 'remarcando' else v_classe end, 'pedido', case when v_classe = 'sim' then v_pedido end,
      'avisada', coalesce((confirmacao->>'avisada')::boolean, false) or v_classe <> 'sim')
      || case when v_ia then jsonb_build_object('remarcar_em', now(), 'duvida', v_classe = 'duvida') else '{}'::jsonb end
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
    select c.id, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_nao' and trim(valor) <> '' and not v_ia;
    if v_ia then
      perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '. A assistente virtual está oferecendo novos horários; se ela não remarcar, a conversa volta à equipe.');
      perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A assistente virtual oferece novos horários.');
      perform zap_conf_para_ia(c.id, p_msg);
    else
      perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
      perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
    end if;
  elsif v_ia then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: '
      || left(coalesce(m.texto, '[' || m.tipo || ']'), 120) || '. A assistente virtual responde; confirme na agenda se o cliente confirmar.');
    perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação fora do SIM e do NÃO. A assistente virtual responde.');
    perform zap_conf_para_ia(c.id, p_msg);
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $$;

create or replace function public.zap_plantao_pegar(p_msg uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; cl clientes; v_adv colaboradores; v_mesmo boolean; v_casos jsonb; v_rem boolean;
begin
  update zap_mensagens set bot_ia = 'plantao:lendo' where id = p_msg and bot_ia = 'plantao:pedida' returning * into m;
  if not found then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.cliente_id is not null then select * into cl from clientes where id = c.cliente_id; end if;
  v_mesmo := cl.id is not null and fone_ddd8(c.telefone) is not null and fone_ddd8(c.telefone) = fone_ddd8(cl.telefone);
  if v_mesmo then
    select jsonb_agg(jsonb_build_object('beneficio', coalesce(nullif(trim(k.beneficio), ''), k.titulo),
             'fase', k.fase, 'etapa', zap_etapa_publica(k)) order by k.criado_em)
      into v_casos from casos k
     where k.cliente_id = cl.id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false);
  end if;
  select * into v_adv from colaboradores where id = zap_advogado_da_conversa(c.id);
  v_rem := coalesce(zap_conf_remarcando(c), false) and zap_conf_ia_remarca();
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.contato_nome), ''), nullif(trim(c.nome_perfil), ''), ''),
    'relacao', nullif(trim(c.contato_relacao), ''),
    'cliente', case when cl.id is null then null else jsonb_build_object('nome', cl.nome,
                 'mesmo_telefone', v_mesmo, 'casos', coalesce(v_casos, '[]'::jsonb)) end,
    'advogado', v_adv.assinatura_zap,
    'advogados', (select jsonb_agg(assinatura_zap) from zap_advogados()),
    'modo', coalesce(c.plantao->>'modo', ''),
    'respostas', coalesce((c.plantao->>'n')::int, 0),
    'interativa', c.plantao->>'modo' in ('lead', 'conversa') or coalesce(zap_plantao_interativa(c.id), false),
    'horario', zap_no_horario(),
    'agenda', zap_agenda_ligada() or v_rem,
    'remarcar', case when v_rem then jsonb_build_object('rotulo', c.confirmacao->>'rotulo',
                  'profissional', c.confirmacao->>'profissional',
                  'duvida', coalesce((c.confirmacao->>'duvida')::boolean, false)) end,
    'agora', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    'instrucoes', coalesce((select valor from config_app where chave = 'zap_ia_txt_plantao'), ''),
    'motor', coalesce((select valor from config_app where chave = 'zap_ia_motor'), 'mensagens'),
    'ma', jsonb_build_object('agente', (select valor from config_app where chave = 'zap_ma_agente'),
                             'ambiente', (select valor from config_app where chave = 'zap_ma_ambiente'),
                             'versao', (select valor from config_app where chave = 'zap_ma_versao')),
    'sessao', c.ia_sessao,
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                    'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                            and momento > coalesce((select max(a.encerrado_em) from zap_atendimentos a
                                                     where a.conversa_id = c.id and a.encerrado_em < m.momento), '-infinity')
                          order by momento desc, seq desc limit 60) x));
end $$;
