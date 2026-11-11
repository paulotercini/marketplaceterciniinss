-- F538: cobertura da equipe durante o Offline (onda 1, decisão do Paulo de 11.11.2026).
-- Com o atendente Offline, a segunda mensagem do cliente (sem ser agradecimento) depois
-- da mensagem de ausência abre a cobertura: a conversa fica com o substituto
-- (colaboradores.zap_cobre_id) em zap_conversas.cobertura, ele recebe a menção e
-- responde sem assumir; o cliente recebe uma linha, uma vez por período.
-- Voltar a Online encerra a cobertura com uma nota interna ao titular.

alter table colaboradores add column if not exists zap_cobre_id uuid references colaboradores(id);
alter table zap_conversas add column if not exists cobertura jsonb;

insert into config_app (chave, valor) values ('zap_cobertura', 'nao')
on conflict (chave) do nothing;

create or replace function public.zap_offline_gatilho()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text; v_agenda boolean; v_golpe boolean; v_com_ia boolean;
  v_sub record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, z.sem_ia, z.plantao, z.cobertura, z.cliente_id,
         k.id as kid, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap, k.zap_cobre_id
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

  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then
    -- F538: a segunda mensagem do mesmo período abre a cobertura
    if coalesce((select valor from config_app where chave = 'zap_cobertura'), 'nao') <> 'sim'
       or c.zap_cobre_id is null or zap_conf_agradece(new.tipo, new.texto)
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

-- Voltar a Online encerra as coberturas do titular, com uma nota interna em cada conversa.
create or replace function public.zap_meu_offline(p_offline boolean, p_msg text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
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
            'Cobertura encerrada: ' || coalesce(r.sub, 'o substituto') || ' cobriu esta conversa e enviou '
            || r.resp || ' mensagem(ns) enquanto você esteve offline.', 'interna');
    update zap_conversas set cobertura = null where id = r.id;
  end loop;
end $function$;

revoke execute on function public.zap_meu_offline(boolean, text) from public, anon;
grant execute on function public.zap_meu_offline(boolean, text) to authenticated;
revoke execute on function public.zap_offline_gatilho() from public, anon;

-- Teste pedido pelo Paulo em 11.11.2026: a Amanda cobre o Paulo, e a cobertura fica ligada.
update colaboradores set zap_cobre_id = '6eb02c12-9ab3-4b03-97f7-657ea8c5ad8d'
 where id = '03b83700-dd27-48c4-8a28-ed4bd16f1071';
update config_app set valor = 'sim' where chave = 'zap_cobertura';
