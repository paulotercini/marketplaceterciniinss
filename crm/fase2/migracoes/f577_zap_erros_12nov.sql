-- F577 (pedido do Paulo de 13.11.2026, os erros dos atendimentos de 12.11.2026):
--  A) a mensagem automática do Offline não sai quando a equipe escreveu na conversa depois do Offline
--     ou na última hora (o atendente Offline respondeu dois minutos antes e a mensagem saiu);
--  B) a conversa encerrada em que a equipe voltou a escrever não volta ao robô e à IA: a volta conta
--     do último entre o encerramento e a última mensagem da equipe (a cliente respondeu à advogada e
--     recebeu a resposta da IA);
--  C) a mensagem de modelo (template) de empresa, que a ponte grava como "[mensagem de tipo template…]",
--     é automática (o robô de empresa recebia respostas da IA);
--  D) a nota do fim da cobertura diz "1 mensagem" ou "N mensagens".

create or replace function public.zap_equipe_escreveu(p_conv uuid, p_desde timestamptz)
returns timestamptz language sql stable set search_path to 'public' as $$
  select max(m.criado_em) from zap_mensagens m
   where m.conversa_id = p_conv and m.direcao = 'saida' and not coalesce(m.por_bot, false)
     and m.aviso_chave is null and m.status not in ('rascunho', 'agendada')
     and m.criado_em >= coalesce(p_desde, '-infinity')
$$;
revoke execute on function public.zap_equipe_escreveu(uuid, timestamptz) from public, anon;

create or replace function public.zap_eh_automatica(p text)
 returns boolean language sql immutable
as $function$
  select lower(translate(replace(coalesce(p, ''), '*', ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ~ ('(este canal (e|eh) (utilizado|usado) exclusivamente|esta e uma mensagem automatica|mensagem automatica'
       '|nao responda (a )?esta mensagem|utilize as opcoes|digite (o numero da opcao|uma das opcoes|a opcao)'
       '|opcao invalida|selecione uma das opcoes|escolha uma das opcoes abaixo|sou (o|a) assistente virtual'
       '|(nosso|seu) atendimento virtual|numero nao recebe mensagens|este numero nao (e|eh) monitorado'
       '|^assistente [^:]{1,30}:|assistente virtual do bb|^\[mensagem de tipo template)')
$function$;

create or replace function public.zap_toque()
 returns trigger language plpgsql
as $function$
declare volta boolean;
begin
  if new.direcao = 'interna' then return new; end if;
  -- F286: o histórico antigo pedido ao celular não é mensagem nova
  if zap_eh_historico(new) then
    -- F481/F506: a mensagem do celular mais nova que a última sobe a conversa; a do cliente reabre e conta como não lida
    if new.bot_ia = 'celular' then
      update zap_conversas set
        ultima_em    = coalesce(new.quando_wa, new.criado_em),
        ultimo_texto = left(coalesce(nullif(trim(new.texto),''), '['||new.tipo||']'), 200),
        nao_lidas    = case when new.direcao = 'entrada' then nao_lidas + 1 else 0 end,
        status       = case when new.direcao = 'entrada' and status = 'resolvida' and not automatica
                            then 'aberta' else status end
      where id = new.conversa_id
        and coalesce(new.quando_wa, new.criado_em) > coalesce(ultima_em, '-infinity');
    end if;
    return new;
  end if;
  -- F577: a volta ao robô conta do último entre o encerramento e a última mensagem da equipe
  select new.direcao = 'entrada' and c.status = 'resolvida' and not c.automatica
         and greatest(coalesce(a.encerrado_em, '-infinity'),
                      coalesce(zap_equipe_escreveu(c.id, a.encerrado_em), '-infinity')) < now()
             - make_interval(mins => coalesce((select valor from config_app where chave='zap_volta_min'),'60')::int)
    into volta
    from zap_conversas c left join zap_atendimentos a on a.id = c.atendimento_id
   where c.id = new.conversa_id;
  update zap_conversas set
    ultima_em    = coalesce(new.quando_wa, new.criado_em, now()),
    ultimo_texto = left(coalesce(nullif(trim(new.texto),''), '['||new.tipo||']'), 200),
    nao_lidas    = case when new.direcao='entrada' then nao_lidas + 1
                        -- F480: a resposta da equipe é que lê a conversa
                        when not new.por_bot and new.aviso_chave is null
                             and new.status not in ('rascunho','agendada') then 0
                        else nao_lidas end,
    status       = case when new.direcao='entrada' and status='resolvida'
                        then 'aberta' else status end,
    atendente_id = case when volta then null else atendente_id end,
    setor        = case when volta then null else setor end,
    setor_id     = case when volta then null else setor_id end,
    bot_ativo    = case when volta then true else bot_ativo end,
    bot_passo    = case when volta then null else bot_passo end,
    bot_desde    = case when volta then null else bot_desde end,
    bot_erros    = case when volta then 0 else bot_erros end,
    bot_dados    = case when volta then null else bot_dados end
  where id = new.conversa_id;
  return new;
end $function$;

create or replace function public.zap_offline_gatilho()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text; v_agenda boolean; v_golpe boolean; v_com_ia boolean;
  v_sub record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, z.sem_ia, z.plantao, z.cobertura, z.sem_cobertura, z.cliente_id,
         k.id as kid, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap, k.zap_cobre_id
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  -- F577: a equipe escreveu depois do Offline ou na última hora: a conversa está em curso
  if zap_equipe_escreveu(c.id, least(c.zap_offline_desde, now() - interval '60 minutes')) is not null then
    return new;
  end if;

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
      -- F552: o áudio espera a transcrição; o relógio o leva à IA depois dela ou em 3 minutos.
      if new.tipo = 'audio' and trim(coalesce(new.texto, '')) = '' then
        update zap_mensagens set bot_ia = 'plantao:agora' where id = new.id;
      elsif (select bot_ia from zap_mensagens where id = new.id) is distinct from 'plantao:pedida' then
        perform zap_plantao_chamar(new.id);
      end if;
      return new;
    end if;
  end if;
  -- a dúvida sobre o andamento devolve a conversa à mensagem do Offline
  if c.plantao ? 'offline_ia' then
    update zap_conversas set plantao = plantao - 'offline_ia' - 'modo' - 'n' where id = c.id;
  end if;

  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then
    -- F538: a segunda mensagem do mesmo período abre a cobertura
    if coalesce((select valor from config_app where chave = 'zap_cobertura'), 'nao') <> 'sim'
       or c.zap_cobre_id is null or coalesce(c.sem_cobertura, false) or zap_conf_agradece(new.tipo, new.texto)
       or coalesce((c.cobertura->>'desde')::timestamptz >= c.zap_offline_desde, false) then
      return new;
    end if;
    select id, nome into v_sub from colaboradores
     where id = c.zap_cobre_id and ativo and zap_offline_desde is null;
    if v_sub.id is null then return new; end if;
    update zap_conversas set cobertura = jsonb_build_object('titular', c.kid, 'cobre', v_sub.id, 'desde', now())
     where id = c.id;
    insert into mencoes (de_id, para_id, conversa_id, cliente_id, texto)
    values (c.kid, v_sub.id, c.id, c.cliente_id,
            'Cobertura do WhatsApp: ' || c.nome || ' está offline e o cliente escreveu de novo. Responda sem assumir.');
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Encaminhei a sua mensagem à equipe jurídica, que responderá em breve.', 'fila');
    return new;
  end if;
  v_txt := coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome));
  v_quem := nullif(trim(coalesce(c.assinatura_zap, c.nome, '')), '');
  if v_quem is not null then v_txt := '*' || v_quem || ':*' || E'\n\n' || v_txt; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, v_txt, 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  return new;
end $function$;

create or replace function public.zap_meu_offline(p_offline boolean, p_msg text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_eu uuid; r record;
begin
  update colaboradores
     set zap_offline_desde = case when p_offline then coalesce(zap_offline_desde, now()) end,
         zap_offline_msg = coalesce(nullif(trim(p_msg), ''), zap_offline_msg),
         zap_offline_salvas = case when nullif(trim(p_msg), '') is null then zap_offline_salvas
           else (array[trim(p_msg)] || array_remove(zap_offline_salvas, trim(p_msg)))[1:20] end
   where auth_id = auth.uid() and ativo
   returning id into v_eu;
  if p_offline or v_eu is null then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  for r in
    select z.id, k.nome as sub,
           (select count(*) from zap_mensagens m where m.conversa_id = z.id and m.direcao = 'saida'
              and not coalesce(m.por_bot, false) and m.criado_em >= (z.cobertura->>'desde')::timestamptz) as resp
      from zap_conversas z left join colaboradores k on k.id = (z.cobertura->>'cobre')::uuid
     where z.cobertura->>'titular' = v_eu::text
  loop
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (r.id, 'interna', false,
            'Cobertura encerrada: ' || coalesce(r.sub, 'o substituto') || ' cobriu esta conversa e '
            || case r.resp when 0 then 'não enviou mensagem' when 1 then 'enviou 1 mensagem'
                    else 'enviou ' || r.resp || ' mensagens' end
            || ' enquanto você esteve offline.', 'interna');
    update zap_conversas set cobertura = null where id = r.id;
  end loop;
end $function$;
