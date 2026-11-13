-- F578 (pedido do Paulo de 13.11.2026): a mensagem automática do Offline sai quando a equipe não escreveu
-- na conversa nos últimos config_app.zap_offline_min minutos (15; a F577 usava 60 minutos ou o início do período Offline).
-- Os dois tempos se editam nas Configurações do WhatsApp do CRM, com a explicação de cada um.
-- A conversa reaberta pela equipe volta ao robô e à IA 30 minutos depois da última mensagem da equipe ou do encerramento (zap_volta_min).


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
  if zap_equipe_escreveu(c.id, now() - make_interval(mins => coalesce(nullif((select valor from config_app where chave = 'zap_offline_min'), '')::int, 15))) is not null then
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

insert into config_app(chave, valor) values ('zap_volta_min', '30')
  on conflict (chave) do update set valor = excluded.valor;
insert into config_app(chave, valor) values ('zap_offline_min', '15')
  on conflict (chave) do update set valor = excluded.valor;
