-- F679 · modo férias no WhatsApp (pedido do Paulo de 21.11.2026).
-- Offline com data de retorno (colaboradores.zap_ferias_ate): toda mensagem nova em conversa atribuída ao titular
-- recebe uma vez a mensagem editável do Offline ({fim} vira a data) e abre a cobertura do substituto
-- (zap_cobre_id) já na primeira mensagem, e não na segunda. Golpe e pedido de agendamento seguem primeiro com a IA.
-- A mensagem do próprio titular nas férias não interrompe o repasse. Na data de retorno, zap_ferias_fim
-- (cron a cada 15 min) volta o titular ao Online e encerra as coberturas com nota interna, como o botão Online.

alter table colaboradores add column if not exists zap_ferias_ate timestamptz;

create or replace function public.zap_offline_gatilho()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text; v_agenda boolean; v_golpe boolean; v_com_ia boolean;
  v_sub record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, z.sem_ia, z.plantao, z.cobertura, z.sem_cobertura, z.cliente_id,
         k.id as kid, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap, k.zap_cobre_id, k.zap_ferias_ate
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  -- F577: a equipe escreveu depois do Offline ou na última hora: a conversa está em curso
  -- F679 · nas férias a mensagem do titular não interrompe o repasse
  if c.zap_ferias_ate is null and zap_equipe_escreveu(c.id, now() - make_interval(mins => coalesce(nullif((select valor from config_app where chave = 'zap_offline_min'), '')::int, 15))) is not null then
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
    if c.zap_ferias_ate is not null then return new; end if;  -- F679 · nas férias o aviso de férias já foi enviado
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Encaminhei a sua mensagem à equipe jurídica, que responderá em breve.', 'fila');
    return new;
  end if;
  -- F679 · conversa marcada "sem cobertura" (pessoa que não é cliente) fica fora das férias: sem aviso e sem repasse
  if c.zap_ferias_ate is not null and coalesce(c.sem_cobertura, false) then return new; end if;
  v_txt := coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome));
  -- F679 · {fim} vira a data de retorno
  if c.zap_ferias_ate is not null then
    v_txt := replace(v_txt, '{fim}', to_char(c.zap_ferias_ate at time zone 'America/Sao_Paulo', 'DD/MM'));
  end if;
  v_quem := nullif(trim(coalesce(c.assinatura_zap, c.nome, '')), '');
  if v_quem is not null then v_txt := '*' || v_quem || ':*' || E'\n\n' || v_txt; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, v_txt, 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  -- F679 · nas férias a cobertura abre já na primeira mensagem, sem o recado de encaminhamento
  if c.zap_ferias_ate is not null and coalesce((select valor from config_app where chave = 'zap_cobertura'), 'nao') = 'sim'
     and c.zap_cobre_id is not null and not coalesce(c.sem_cobertura, false) and not zap_conf_agradece(new.tipo, new.texto) then
    select id, nome into v_sub from colaboradores
     where id = c.zap_cobre_id and ativo and zap_offline_desde is null;
    if v_sub.id is not null then
      update zap_conversas set cobertura = jsonb_build_object('titular', c.kid, 'cobre', v_sub.id, 'desde', now())
       where id = c.id;
      insert into mencoes (de_id, para_id, conversa_id, cliente_id, texto)
      values (c.kid, v_sub.id, c.id, c.cliente_id,
              'Cobertura do WhatsApp: ' || c.nome || ' está em férias. Responda sem assumir.');
    end if;
  end if;
  return new;
end $function$;

create or replace function public.zap_meu_offline(p_offline boolean, p_msg text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
declare v_eu uuid; r record;
begin
  update colaboradores
     set zap_ferias_ate = case when p_offline then zap_ferias_ate end,
         zap_offline_desde = case when p_offline then coalesce(zap_offline_desde, now()) end,
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

-- férias: Offline com data de retorno; Online (zap_meu_offline false) as encerra
create or replace function public.zap_minhas_ferias(p_ate timestamptz, p_msg text default null::text)
 returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if p_ate is null or p_ate <= now() then raise exception 'Data de retorno deve ser futura'; end if;
  perform zap_meu_offline(true, p_msg);
  update colaboradores set zap_ferias_ate = p_ate where auth_id = auth.uid() and ativo;
end $function$;
revoke execute on function public.zap_minhas_ferias(timestamptz, text) from public, anon;
grant execute on function public.zap_minhas_ferias(timestamptz, text) to authenticated;

-- retorno automático: assume o titular (claim sub) para reaproveitar o encerramento das coberturas do zap_meu_offline
create or replace function public.zap_ferias_fim()
 returns int language plpgsql security definer set search_path to 'public'
as $function$
declare r record; n int := 0;
begin
  for r in select auth_id from colaboradores where zap_ferias_ate <= now() and auth_id is not null loop
    perform set_config('request.jwt.claim.sub', r.auth_id::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', r.auth_id)::text, true);
    perform zap_meu_offline(false, null);
    n := n + 1;
  end loop;
  return n;
end $function$;
revoke execute on function public.zap_ferias_fim() from public, anon, authenticated;

select cron.unschedule('zap-ferias-fim') where exists (select 1 from cron.job where jobname = 'zap-ferias-fim');
select cron.schedule('zap-ferias-fim', '*/15 * * * *', 'select public.zap_ferias_fim()');
