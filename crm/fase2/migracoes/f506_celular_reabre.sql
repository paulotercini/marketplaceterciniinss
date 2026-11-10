-- F506 · a mensagem do cliente trazida do celular reabre a conversa resolvida e conta como nova
create or replace function public.zap_toque()
 returns trigger
 language plpgsql
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
  select new.direcao = 'entrada' and c.status = 'resolvida' and not c.automatica
         and coalesce(a.encerrado_em, '-infinity') < now()
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

-- acerto: conversa resolvida cuja última mensagem é do cliente, trazida do celular nas últimas 48 h
update zap_conversas c set status = 'aberta', nao_lidas = greatest(c.nao_lidas, 1)
 where c.status = 'resolvida' and not c.automatica
   and exists (select 1 from zap_mensagens m
                where m.conversa_id = c.id and m.bot_ia = 'celular' and m.direcao = 'entrada'
                  and coalesce(m.quando_wa, m.criado_em) > now() - interval '48 hours'
                  and coalesce(m.quando_wa, m.criado_em) >= c.ultima_em);
