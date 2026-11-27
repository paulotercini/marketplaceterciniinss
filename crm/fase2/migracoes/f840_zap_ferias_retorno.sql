-- F840 · conferência do modo férias (27.11.2026): no retorno, as conversas cobertas em que o cliente escreveu por
-- último e ninguém da equipe respondeu ficavam só com a nota interna "não enviou mensagem". Agora geram menção
-- ao titular. Também dois robôs de loja ("insira uma resposta válida", "de presente para você") que recebiam
-- amparo e aviso de férias passam a conta automática.
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
    -- F840 · o cliente que escreveu por último e ficou sem resposta da equipe volta ao titular com menção
    if (select m.direcao from zap_mensagens m where m.conversa_id = r.id and m.direcao <> 'interna'
          and not (m.direcao = 'saida' and coalesce(m.por_bot, false))
        order by m.criado_em desc limit 1) = 'entrada'
       and not coalesce((select automatica from zap_conversas where id = r.id), false) then
      insert into mencoes (de_id, para_id, conversa_id, cliente_id, texto)
      select v_eu, v_eu, z.id, z.cliente_id,
             'Pendente do período offline: o cliente escreveu e ficou sem resposta da equipe.'
        from zap_conversas z where z.id = r.id;
    end if;
    update zap_conversas set cobertura = null where id = r.id;
  end loop;
end $function$;

create or replace function public.zap_eh_automatica(p text)
 returns boolean language sql immutable
as $function$
  select lower(translate(replace(coalesce(p, ''), '*', ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ~ ('(este canal (e|eh) (utilizado|usado) exclusivamente|esta e uma mensagem automatica|mensagem automatica'
       '|nao responda (a )?esta mensagem|utilize as opcoes|digite (o numero da opcao|uma das opcoes|a opcao)'
       '|opcao invalida|selecione uma das opcoes|escolha uma das opcoes abaixo|sou (o|a) assistente virtual'
       '|(nosso|seu) atendimento virtual|numero nao recebe mensagens|este numero nao (e|eh) monitorado'
       '|^assistente [^:]{1,30}:|assistente virtual do bb|^\[mensagem de tipo template'
       '|exclusivo para (o )?envio de notificacoes|nao foi possivel entender o que voce disse'
       '|ofertas de produtos e servicos|pre-venda exclusiva|so preciso confirmar uma coisa antes de chamar nosso time'
       '|aula magna|participacao gratuita|insira uma resposta valida|de presente para voce)')
$function$;

update zap_conversas z set automatica = true
 where z.cliente_id is null and not z.automatica
   and exists (select 1 from zap_mensagens m where m.conversa_id = z.id and m.direcao = 'entrada'
                and m.criado_em > now() - interval '30 days' and zap_eh_automatica(m.texto));

do $$ begin
  assert zap_eh_automatica('Por favor, insira uma resposta válida.');
  assert zap_eh_automatica('Olá! *R$35 de presente para você* usar hoje!');
  assert not zap_eh_automatica('Oi Dr. Paulo, tudo bem? Estive esta semana no seu escritório');
end $$;
