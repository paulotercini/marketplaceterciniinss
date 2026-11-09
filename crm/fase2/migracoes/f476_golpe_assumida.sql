-- F476 (09.11.2026, pedido do Paulo): quando a IA reconhece golpe (alguém ligando ou escrevendo em nome do
-- escritório por outro número), a conversa recebe a resposta fixa de config_app.zap_golpe_texto, mesmo assumida
-- por atendente, com menção urgente a quem atende, aos advogados e à recepção. O zap_plantao marca o caso
-- prefixando o assunto com "golpe:". Mesma assinatura da função, por isso não há sobrecarga.
insert into config_app (chave, valor) values ('zap_golpe_texto',
'Este é o único número de WhatsApp do escritório. Qualquer outro número de WhatsApp, ligação ou mensagem que use o nome do escritório ou do Dr. Paulo Tercini é golpe: não responda, não faça pagamento e não informe dados nem códigos.

Em caso de dúvida, ligue no telefone fixo do escritório, (16) 3242-2908, de segunda a sexta-feira, das 7h às 17h.')
on conflict (chave) do nothing;

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
  -- F476: no golpe (alguém se passando pelo escritório) sai a resposta fixa, mesmo com atendente.
  if p_assunto like 'golpe:%' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    select c.id, 'saida', true, valor, 'fila', 'plantao:golpe' from config_app where chave = 'zap_golpe_texto' and trim(valor) <> '';
    perform zap_nota_sistema(c.id, null, 'Assistente virtual: possível golpe; enviou o aviso fixo de que este é o único WhatsApp do escritório · '
            || trim(substr(p_assunto, 7)));
    insert into mencoes (de_id, para_id, conversa_id, texto)
    select v_claude, a.id, c.id, '⚠ URGENTE · possível golpe: ' || coalesce(nullif(trim(c.nome_perfil), ''), c.telefone, 'o cliente')
           || ' recebeu o aviso fixo no WhatsApp · ' || trim(substr(p_assunto, 7))
      from colaboradores a
     where a.ativo and (a.id = c.atendente_id or (coalesce(trim(a.assinatura_zap), '') <> '' and a.cargo in ('advogado', 'estagiario', 'recepcao')));
    return;
  end if;
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
