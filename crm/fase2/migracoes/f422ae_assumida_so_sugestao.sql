-- F422ae (09.11.2026, pedido do Paulo): conversa assumida por um atendente não recebe mensagem da IA
-- nem resposta automática da confirmação. A resposta que a IA daria vira sugestão em nota interna,
-- com menção a quem atende, para a pessoa enviar se quiser.
create or replace function public.zap_sugestao_ia(p_conversa uuid, p_txt text, p_urgente boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $$
declare c zap_conversas;
        v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
begin
  select * into c from zap_conversas where id = p_conversa;
  if trim(coalesce(p_txt, '')) = '' then return; end if;
  perform zap_nota_sistema(c.id, null, '💡 Sugestão de resposta da assistente virtual (não enviada, a conversa está com '
          || coalesce(zap_nome_colab(c.atendente_id), 'um atendente') || '): ' || trim(p_txt));
  if c.atendente_id is not null then
    insert into mencoes (de_id, para_id, conversa_id, texto)
    values (v_claude, c.atendente_id, c.id,
            case when p_urgente then '⚠ URGENTE · ' else '' end || '💡 Sugestão de resposta para '
            || coalesce(nullif(trim(c.nome_perfil), ''), c.telefone, 'o cliente') || ' na nota interna da conversa');
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.zap_plantao_aplicar(p_msg uuid, p_acao text, p_resposta text, p_advogado text, p_urgente boolean, p_assunto text, p_relato text, p_nome text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m zap_mensagens; c zap_conversas; v_adv uuid; v_acao text := p_acao; v_txt text; v_n integer;
        v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
        v_quem text; v_modo text;
begin
  select * into c from zap_conversas where id = (select conversa_id from zap_mensagens where id = p_msg) for update;
  if not found or c.plantao->>'pedido_msg' is distinct from p_msg::text then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set plantao = plantao - 'pedido_msg' - 'pedido_em' where id = c.id;
  if v_acao not in ('nada', 'responder', 'lead', 'conversa', 'agendar', 'equipe', 'falhou') then v_acao := 'falhou'; end if;
  update zap_mensagens set bot_ia = 'plantao:' || v_acao where id = p_msg returning * into m;
  if c.automatica or c.sem_ia
     or exists (select 1 from zap_mensagens x where x.conversa_id = c.id and x.direcao = 'entrada' and x.seq > m.seq)
     or exists (select 1 from zap_mensagens x where x.conversa_id = c.id and x.direcao = 'saida'
                  and not x.por_bot and x.momento >= m.momento) then
    return;
  end if;
  if v_acao = 'nada' then return; end if;
  -- F422ae: com atendente, a resposta fica como sugestão e nada é enviado.
  if c.atendente_id is not null then
    if v_acao <> 'falhou' then perform zap_sugestao_ia(c.id, p_resposta, coalesce(p_urgente, false)); end if;
    return;
  end if;

  select id into v_adv from zap_advogados()
   where trim(coalesce(p_advogado, '')) <> ''
     and (assinatura_zap = trim(p_advogado) or nome = trim(p_advogado)) limit 1;
  v_adv := coalesce(v_adv, zap_advogado_da_conversa(c.id));
  v_quem := 'a equipe' || case when v_adv is null then '' else ' (responsável: ' || zap_nome_colab(v_adv) || ')' end;

  v_txt := left(trim(coalesce(p_resposta, '')), 1500);
  if v_acao = 'falhou' then
    v_txt := 'Recebemos a sua mensagem. ' || coalesce((select assinatura_zap from colaboradores where id = v_adv) || ' já foi avisado(a)',
                                                      'A equipe do escritório já foi avisada')
             || ' e responderá '
             || case when zap_no_horario() then 'assim que possível.' else 'no próximo dia útil.' end;
  end if;

  if v_acao in ('lead', 'conversa') then
    v_n := coalesce((c.plantao->>'n')::int, 0) + 1;
    v_modo := case when v_acao = 'lead' or c.plantao->>'modo' = 'lead' then 'lead' else 'conversa' end;
    update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb) || jsonb_build_object('modo', v_modo, 'n', v_n)
           || case when coalesce(trim(p_nome), '') <> '' then jsonb_build_object('nome', initcap(trim(p_nome))) else '{}'::jsonb end
           || case when coalesce(trim(p_relato), '') <> '' then jsonb_build_object('relato', left(trim(p_relato), 1500)) else '{}'::jsonb end
     where id = c.id;
    if v_modo = 'lead' and v_n >= 8 then v_acao := 'agendar';
    elsif v_modo = 'conversa' and v_n >= 12 then v_acao := 'equipe'; end if;
  end if;

  if v_txt <> '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    values (c.id, 'saida', true, v_txt, 'fila', 'plantao:resposta');
  end if;
  if v_acao in ('lead', 'conversa') then return; end if;

  select * into c from zap_conversas where id = c.id;
  update zap_conversas set plantao = plantao - 'modo' - 'n' where id = c.id;
  if coalesce(trim(p_relato), c.plantao->>'relato', '') <> '' then
    perform zap_nota_sistema(c.id, null, 'Relato colhido pela assistente virtual: '
            || coalesce(nullif(trim(p_nome), ''), c.plantao->>'nome', '') || ' · '
            || coalesce(nullif(trim(p_relato), ''), c.plantao->>'relato'));
  end if;
  perform zap_nota_sistema(c.id, null, 'Assistente virtual: '
          || case v_acao when 'falhou' then 'a IA não respondeu; saiu o aviso de recebimento' else 'respondeu' end
          || ' e avisou ' || v_quem || coalesce(' · ' || nullif(trim(p_assunto), ''), ''));
  insert into mencoes (de_id, para_id, conversa_id, texto)
  select v_claude, a.id, c.id,
         case when p_urgente then '⚠ URGENTE · ' else '' end || '💬 '
         || coalesce(nullif(trim(c.nome_perfil), ''), c.telefone, 'O cliente')
         || ' aguarda resposta no WhatsApp' || coalesce(': ' || nullif(trim(p_assunto), ''), '')
         || case when v_adv is null then '' else ' · responsável: ' || zap_nome_colab(v_adv) end
    from colaboradores a
   where a.ativo and coalesce(trim(a.assinatura_zap), '') <> ''
     and a.cargo in ('advogado', 'estagiario', 'recepcao')
     and (p_urgente or not exists (select 1 from mencoes x where x.para_id = a.id and x.conversa_id = c.id and x.lida_em is null));
  if v_acao = 'agendar' and zap_agenda_ligada() then
    update zap_conversas set bot_dados = coalesce(bot_dados, '{}'::jsonb)
           || jsonb_build_object('nome', coalesce(nullif(initcap(trim(p_nome)), ''), c.plantao->>'nome', nullif(trim(c.nome_perfil), ''), 'Cliente'))
           || case when coalesce(trim(p_relato), c.plantao->>'relato', '') <> ''
                   then jsonb_build_object('relato', left(coalesce(nullif(trim(p_relato), ''), c.plantao->>'relato'), 1000)) else '{}'::jsonb end
     where id = c.id;
    perform zap_agenda_chamar(c.id, 'oferecer', '{}'::jsonb);
  end if;
end $function$;

-- A confirmação na agenda continua; a resposta fixa ao cliente vira sugestão quando há atendente.
CREATE OR REPLACE FUNCTION public.zap_conf_confirmado(p_conversa uuid, p_ok boolean, p_erro text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if p_ok then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'confirmado', 'confirmado_em', now()) where id = p_conversa;
    if c.atendente_id is not null then
      perform zap_sugestao_ia(p_conversa, (select zap_conf_preencher(valor, c.confirmacao) from config_app where chave = 'zap_conf_sim' and trim(valor) <> ''));
    else
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      select p_conversa, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_sim' and trim(valor) <> '';
    end if;
    perform zap_nota_sistema(p_conversa, null, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', e a agenda foi atualizada.');
  else
    perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada (' || left(coalesce(p_erro, ''), 120) || '): confirme à mão.');
  end if;
end $function$;
