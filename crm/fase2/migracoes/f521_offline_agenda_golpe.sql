-- F521 (pedido do Paulo de 11.11.2026): com o atendente Offline (F397), a
-- mensagem automática responde a dúvida sobre o andamento e o resto; o pedido de
-- agendamento e o golpe vão à IA na hora, sem a mensagem do Offline.
-- O agendamento fica com a IA (plantao.offline_ia, carimbo do período offline)
-- até o atendente voltar a ficar Online ou o cliente perguntar pelo andamento,
-- e a resposta dela sai ao cliente, e não como sugestão (F422ae).
-- O golpe já sai mesmo na conversa assumida (F476/F488).

-- a mesma expressão do RX_GOLPE do zap_plantao
create or replace function public.zap_eh_golpe(p_txt text)
 returns boolean
 language sql
 immutable
as $function$
  select coalesce(p_txt, '') ~* '(golpe|falso advogado|se passa(ndo|r)? (por|pelo)|em nome do (escrit|dr|doutor|advogado)|com o (seu |meu )?(nome|telefone|n[uú]mero)|outro n[uú]mero|n[uú]mero (diferente|estranho|desconhecido)|pix para liberar|liberar (o )?(valor|dinheiro))';
$function$;

create or replace function public.zap_offline_gatilho()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text; v_agenda boolean; v_golpe boolean; v_com_ia boolean;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, z.sem_ia, z.plantao, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;

  perform set_config('zap.via_funcao', '1', true);
  if coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') = 'sim' and not coalesce(c.sem_ia, false)
     and not zap_pede_andamento(new.texto) then
    v_golpe := zap_eh_golpe(new.texto);
    v_agenda := zap_smb_quer_agendar(new.texto);
    v_com_ia := coalesce((c.plantao->>'offline_ia')::timestamptz >= c.zap_offline_desde, false);
    if v_golpe or v_agenda or v_com_ia then
      if v_agenda then
        update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb)
               || jsonb_build_object('offline_ia', now(), 'modo', 'conversa')
         where id = c.id;
      end if;
      if (select bot_ia from zap_mensagens where id = new.id) is distinct from 'plantao:pedida' then
        perform zap_plantao_chamar(new.id);
      end if;
      return new;
    end if;
  end if;
  -- a dúvida sobre o andamento devolve a conversa à mensagem do Offline
  if c.plantao ? 'offline_ia' then
    update zap_conversas set plantao = plantao - 'offline_ia' - 'modo' - 'n' where id = c.id;
  end if;

  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then return new; end if;
  v_txt := coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome));
  v_quem := nullif(trim(coalesce(c.assinatura_zap, c.nome, '')), '');
  if v_quem is not null then v_txt := '*' || v_quem || ':*' || E'\n\n' || v_txt; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, v_txt, 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  return new;
end $function$;

-- a resposta do agendamento com o atendente Offline sai ao cliente; o resto da
-- conversa assumida continua como sugestão (F422ae)
create or replace function public.zap_plantao_aplicar(p_msg uuid, p_acao text, p_resposta text, p_advogado text, p_urgente boolean, p_assunto text, p_relato text, p_nome text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
    select c.id, 'saida', true, coalesce(nullif(left(trim(coalesce(p_resposta, '')), 1500), ''), valor), 'fila', 'plantao:golpe'
      from config_app where chave = 'zap_golpe_texto' and (trim(coalesce(p_resposta, '')) <> '' or trim(valor) <> '');
    perform zap_nota_sistema(c.id, null, 'Assistente virtual: possível golpe; respondeu e avisou que este é o único WhatsApp do escritório · '
            || trim(substr(p_assunto, 7)));
    insert into mencoes (de_id, para_id, conversa_id, texto)
    select v_claude, a.id, c.id, '⚠ URGENTE · possível golpe: ' || coalesce(nullif(trim(c.nome_perfil), ''), c.telefone, 'o cliente')
           || ' recebeu o aviso de golpe no WhatsApp · ' || trim(substr(p_assunto, 7))
      from colaboradores a
     where a.ativo and (a.id = c.atendente_id or (coalesce(trim(a.assinatura_zap), '') <> '' and a.cargo in ('advogado', 'estagiario', 'recepcao')));
    return;
  end if;
  -- F422ae: com atendente, a resposta fica como sugestão e nada é enviado.
  -- F521: salvo o agendamento pedido com o atendente Offline, que a IA conduz.
  if c.atendente_id is not null
     and not coalesce((c.plantao->>'offline_ia')::timestamptz
                      >= (select zap_offline_desde from colaboradores where id = c.atendente_id), false) then
    if c.plantao ? 'offline_ia' then
      update zap_conversas set plantao = plantao - 'offline_ia' - 'modo' - 'n' where id = c.id;
    end if;
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

revoke all on function public.zap_eh_golpe(text) from public, anon;
