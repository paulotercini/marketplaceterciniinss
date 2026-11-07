-- F422f · pedido do Paulo de 07.11.2026: a IA lê toda resposta à confirmação, sem depender de SIM ou NÃO.
-- Com a Agenda da IA ligada (zap_conf_ia_remarca), a primeira resposta vai à IA marcada com 'ler'; o zap_plantao
-- classifica (confirmar, remarcar ou outro) e chama zap_conf_ia_intencao: confirmar segue o caminho do SIM
-- (agenda e mensagem zap_conf_sim, com o GOV.BR), remarcar e outro avisam a equipe e seguem com a IA.
-- Sem resposta da IA em 90 s, vale a leitura por palavras (zap_conf_classe). Com a IA desligada, nada muda.

create or replace function public.zap_conf_ia_intencao(p_conversa uuid, p_intencao text, p_msg uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c zap_conversas; m zap_mensagens; v_pedido text; v_txt text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not coalesce((c.confirmacao->>'ler')::boolean, false) then return 'lida'; end if;
  select * into m from zap_mensagens where id = p_msg;
  v_txt := left(coalesce(m.texto, '[' || m.tipo || ']'), 120);
  if p_intencao = 'confirmar' then
    v_pedido := gen_random_uuid()::text;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'sim', 'pedido', v_pedido, 'ler', false)
     where id = p_conversa;
    perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual entendeu que o cliente confirmou: ' || v_txt);
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
        body := jsonb_build_object('acao', 'confirmar', 'conversa_id', p_conversa, 'pedido', v_pedido),
        headers := '{"Content-Type":"application/json"}'::jsonb, timeout_milliseconds := 30000);
    exception when others then
      perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada: confirme à mão.');
    end;
  elsif p_intencao = 'remarcar' then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('ler', false, 'duvida', false) where id = p_conversa;
    perform zap_conf_avisar(p_conversa, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '. A assistente virtual está oferecendo novos horários; se ela não remarcar, a conversa volta à equipe.');
    perform zap_nota_sistema(p_conversa, null, '📅 Resposta à confirmação: remarcar. A assistente virtual oferece novos horários.');
  else
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('ler', false, 'duvida', true) where id = p_conversa;
    perform zap_conf_avisar(p_conversa, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: '
      || v_txt || '. A assistente virtual responde; confirme na agenda se o cliente confirmar.');
    perform zap_nota_sistema(p_conversa, null, '📅 Resposta à confirmação com pergunta ou pedido. A assistente virtual responde.');
  end if;
  return p_intencao;
end $$;
revoke execute on function public.zap_conf_ia_intencao(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.zap_conf_ia_intencao(uuid, text, uuid) to service_role;

create or replace function public.zap_conf_resposta(p_msg uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text;
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
  -- F422f · com a IA ligada, ela lê a resposta e decide; a classe por palavras fica de reserva
  if zap_conf_ia_remarca() then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
        'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
        'estado', 'remarcando', 'remarcar_em', now(), 'ler', true, 'classe', v_classe, 'duvida', v_classe = 'duvida', 'avisada', true)
     where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  v_pedido := gen_random_uuid()::text;
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
      'estado', v_classe, 'pedido', case when v_classe = 'sim' then v_pedido end,
      'avisada', coalesce((confirmacao->>'avisada')::boolean, false) or v_classe <> 'sim')
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
    perform zap_conf_avisar(c.id, '📅 O cliente pediu para remarcar o atendimento de ' || (c.confirmacao->>'rotulo') || '.');
    perform zap_nota_sistema(c.id, null, '📅 Resposta à confirmação: remarcar. A equipe foi avisada.');
  elsif not coalesce((c.confirmacao->>'avisada')::boolean, false) then
    perform zap_conf_avisar(c.id, '📅 Resposta à confirmação do atendimento de ' || (c.confirmacao->>'rotulo') || ' precisa de alguém: ' || left(coalesce(m.texto, '[' || m.tipo || ']'), 120));
  end if;
  return true;
end $$;

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
                  'profissional', c.confirmacao->>'profissional',
                  'duvida', coalesce((c.confirmacao->>'duvida')::boolean, false),
                  'ler', coalesce((c.confirmacao->>'ler')::boolean, false), 'classe', c.confirmacao->>'classe') end,
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

-- sem resposta da IA em 90 s: a leitura por palavras decide a resposta à confirmação antes do aviso fixo
create or replace function public.zap_plantao_vencidas()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare r record; n integer := 0; v_min integer; v_fim timestamptz;
begin
  if coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') <> 'sim' then return 0; end if;
  v_min := case when zap_no_horario()
                then coalesce(nullif((select valor from config_app where chave = 'zap_plantao_min'), ''), '20')::int
                else coalesce(nullif((select valor from config_app where chave = 'zap_plantao_fora_min'), ''), '5')::int end;
  for r in select m.id, m.conversa_id, m.seq, m.momento, m.bot_ia from zap_mensagens m
            where (m.bot_ia = 'plantao:espera' and m.criado_em < now() - make_interval(mins => v_min))
               or (m.bot_ia = 'plantao:agora' and (trim(coalesce(m.texto, '')) not in ('') and m.texto not like '[áudio%'
                                                   or m.criado_em < now() - interval '3 minutes'))
            order by m.criado_em loop
    if exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.direcao = 'entrada' and x.seq > r.seq) then
      update zap_mensagens set bot_ia = 'plantao:junto' where id = r.id;
    elsif exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.direcao = 'saida'
                    and not x.por_bot and x.momento >= r.momento) then
      update zap_mensagens set bot_ia = 'plantao:respondida' where id = r.id;
    elsif r.bot_ia = 'plantao:espera' and exists (
            select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.bot_ia = 'plantao:resposta'
               and (x.momento > now() - interval '4 hours' or not zap_no_horario())
               and x.momento > coalesce((select max(h.momento) from zap_mensagens h where h.conversa_id = r.conversa_id
                                           and h.direcao = 'saida' and not h.por_bot), '-infinity')) then
      update zap_mensagens set bot_ia = 'plantao:ja_avisado' where id = r.id;
    elsif exists (select 1 from zap_conversas c where c.id = r.conversa_id and (c.automatica or c.sem_ia)) then
      update zap_mensagens set bot_ia = 'plantao:fora' where id = r.id;
    else
      perform zap_plantao_chamar(r.id);
    end if;
    n := n + 1;
  end loop;
  for r in select c.id, (c.plantao->>'pedido_msg')::uuid msg, c.confirmacao from zap_conversas c
            where c.plantao ? 'pedido_em' and (c.plantao->>'pedido_em')::timestamptz < now() - interval '90 seconds' loop
    if coalesce((r.confirmacao->>'ler')::boolean, false) then
      perform zap_conf_ia_intencao(r.id, case r.confirmacao->>'classe' when 'sim' then 'confirmar' when 'nao' then 'remarcar' else 'outro' end, r.msg);
    end if;
    perform zap_plantao_aplicar(r.msg, 'falhou', null, null, false, null, null, null);
    n := n + 1;
  end loop;
  return n;
end $function$;

-- a confirmação sem SIM e NÃO: a IA lê qualquer resposta
update config_app set valor = E'Olá, {nome}. Seu atendimento com {advogado} está agendado para {dia}, {data}, às {hora}. Podemos contar com a sua presença?' where chave = 'zap_conf_texto';
-- o nome já está na confirmação: a resposta ao SIM vem sem ele (o nome uma vez só, pedido do Paulo)
update config_app set valor = E'Obrigado. Seu atendimento de {dia}, {data}, às {hora}, está confirmado.{govbr}' where chave = 'zap_conf_sim';
