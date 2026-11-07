-- F422c · o NÃO da confirmação abre a remarcação pela assistente virtual (autorizado pelo Paulo em 07.11.2026)
-- Com a Agenda da IA ligada (zap_robo_agenda = 'sim', a mesma chave que dá a agenda a todas as conversas),
-- o plantão da IA ligado e o motor 'agentes', o NÃO deixa a conversa em
-- confirmacao.estado = 'remarcando': a Assistente recebe o NÃO na hora e pede ao Agendador dois horários
-- com o mesmo advogado (um de manhã, outro à tarde); as respostas seguintes do cliente vão só à IA (o menu,
-- o plantão comum e o Offline ficam calados) até remarcar ou cancelar, até a equipe escrever na conversa ou
-- por 48 horas.
-- Sem as três condições, o NÃO segue como antes (aviso à recepção e ao advogado).

-- uma chave só (decisão do Paulo, 07.11.2026): a Agenda da IA liga a agenda de todas as conversas e a remarcação
delete from config_app where chave = 'zap_conf_remarcar';
update config_app set valor = 'sim' where chave = 'zap_robo_agenda';

-- a remarcação pela IA ainda vale nesta conversa?
create or replace function public.zap_conf_remarcando(c zap_conversas)
returns boolean language sql stable set search_path = public as $$
  select c.confirmacao->>'estado' = 'remarcando'
     and (c.confirmacao->>'remarcar_em')::timestamptz > now() - interval '48 hours'
     and not exists (select 1 from zap_mensagens h where h.conversa_id = c.id and h.direcao = 'saida' and not h.por_bot
                       and h.momento > (c.confirmacao->>'remarcar_em')::timestamptz);
$$;

create or replace function public.zap_conf_ia_remarca()
returns boolean language sql stable set search_path = public as $$
  select zap_agenda_ligada()
     and coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') = 'sim'
     and coalesce((select valor from config_app where chave = 'zap_ia_motor'), '') = 'agentes';
$$;

-- entrega a mensagem do cliente à IA no modo conversa; o áudio espera a transcrição (relógio do plantão)
create or replace function public.zap_conf_para_ia(p_conversa uuid, p_msg uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m zap_mensagens;
begin
  select * into m from zap_mensagens where id = p_msg;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb) || jsonb_build_object('modo', 'conversa',
           'n', coalesce((plantao->>'n')::int, 0)) where id = p_conversa;
  if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
    update zap_mensagens set bot_ia = 'plantao:agora' where id = p_msg;
  else
    perform zap_plantao_chamar(p_msg);
  end if;
end $$;

-- o Agendador remarcou ou cancelou: a remarcação termina e a recepção é avisada
create or replace function public.zap_conf_remarcado(p_conversa uuid, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if c.confirmacao->>'estado' is distinct from 'remarcando' then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'remarcado', 'remarcado_em', now()),
         plantao = coalesce(plantao, '{}'::jsonb) - 'modo' - 'n' where id = p_conversa;
  perform zap_conf_avisar(p_conversa, '📅 ' || left(coalesce(p_texto, ''), 300));
end $$;

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
  v_ia := v_classe = 'nao' and zap_conf_ia_remarca();
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
      'estado', case when v_ia then 'remarcando' else v_classe end, 'pedido', case when v_classe = 'sim' then v_pedido end,
      'avisada', coalesce((confirmacao->>'avisada')::boolean, false) or v_classe <> 'sim')
      || case when v_ia then jsonb_build_object('remarcar_em', now()) else '{}'::jsonb end
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
    select c.id, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_nao' and trim(valor) <> '';
    if v_ia then
      perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '. A assistente virtual está oferecendo novos horários; se ela não remarcar, a conversa volta à equipe.');
      perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A assistente virtual oferece novos horários.');
      perform zap_conf_para_ia(c.id, p_msg);
    else
      perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
      perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
    end if;
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $$;

-- a agenda do Agendador vale na conversa em remarcação mesmo com zap_robo_agenda desligada
create or replace function public.zap_plantao_agenda(p_conversa uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_cli uuid; v_nome text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found then return null; end if;
  if c.contato_relacao is null then v_cli := zap_cliente_do_numero(p_conversa); end if;
  if v_cli is not null then select nome into v_nome from clientes where id = v_cli; end if;
  return jsonb_build_object('telefone', c.telefone, 'cliente_id', v_cli, 'nome_ficha', v_nome,
                            'ligada', zap_agenda_ligada() or (coalesce(zap_conf_remarcando(c), false) and zap_conf_ia_remarca()));
end $$;

-- a IA recebe o atendimento a remarcar no contexto
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
                  'profissional', c.confirmacao->>'profissional') end,
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

revoke all on function public.zap_conf_remarcando(zap_conversas), public.zap_conf_ia_remarca(), public.zap_conf_para_ia(uuid, uuid),
  public.zap_conf_remarcado(uuid, text), public.zap_conf_resposta(uuid), public.zap_plantao_agenda(uuid), public.zap_plantao_pegar(uuid)
  from public, anon, authenticated;
grant execute on function public.zap_conf_remarcado(uuid, text), public.zap_plantao_agenda(uuid), public.zap_plantao_pegar(uuid) to service_role;
