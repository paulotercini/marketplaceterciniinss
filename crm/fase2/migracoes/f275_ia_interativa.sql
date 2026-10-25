-- ══ A IA conversa na hora e o motor Managed Agents (F275) ═══════════════════
-- Pedido do Paulo, 25.10.2026: a IA esperava o prazo do plantão e dizia que a
-- equipe responderia depois, também ao cliente novo e a quem não estava em
-- conversa com ninguém. Agora:
--   · conversa "interativa" (sem atendente e sem mensagem da equipe nos
--     últimos zap_plantao_aberta_dias dias) vai à IA na hora, e ela conversa:
--     tira dúvidas do atendimento, colhe o caso novo e oferece a agenda (ação
--     "conversa", além de "lead"); com a equipe na conversa, segue o plantão de
--     antes (espera o prazo e tranquiliza);
--   · as instruções do escritório para a IA (zap_ia_txt_plantao) e para o
--     ✨ Rascunho (zap_ia_txt_rascunho) se editam nas Configurações;
--   · zap_ia_motor = 'agentes' troca a chamada direta pelo Managed Agents: o
--     agente fica cadastrado e versionado no Console da Anthropic (zap_ma_*) e
--     cada conversa tem a sua sessão (zap_conversas.ia_sessao).
-- Nasce DESLIGADO: zap_plantao_aberta_dias = '0' e zap_ia_motor = 'mensagens'.
insert into config_app (chave, valor) values
  ('zap_plantao_aberta_dias','0'), ('zap_ia_txt_plantao',''), ('zap_ia_txt_rascunho',''),
  ('zap_ia_motor','mensagens'), ('zap_ma_agente',''), ('zap_ma_ambiente',''), ('zap_ma_versao','')
  on conflict (chave) do nothing;

-- {id, em, ate}: a sessão do Managed Agents e até onde a conversa já foi entregue a ela
alter table zap_conversas add column if not exists ia_sessao jsonb;

-- a conversa sem atendente e sem a equipe nos últimos N dias conversa com a IA na hora;
-- 15 respostas da IA em 24 h devolvem a conversa ao plantão comum
create or replace function zap_plantao_interativa(p_conversa uuid) returns boolean
language sql stable security definer set search_path = public as $$
  with d as (select coalesce(nullif((select valor from config_app where chave = 'zap_plantao_aberta_dias'), ''), '0')::int n)
  select d.n > 0 and c.atendente_id is null
     and not exists (select 1 from zap_mensagens h where h.conversa_id = c.id and h.direcao = 'saida' and not h.por_bot
                       and h.momento > now() - make_interval(days => d.n))
     and (select count(*) from zap_mensagens b where b.conversa_id = c.id and b.bot_ia = 'plantao:resposta'
            and b.momento > now() - interval '24 hours') < 15
    from zap_conversas c, d where c.id = p_conversa
$$;

-- o Managed Agents abre a sessão e lê o histórico: mais folga antes do aviso fixo
create or replace function zap_plantao_chamar(p_msg uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens;
begin
  update zap_mensagens set bot_ia = 'plantao:pedida' where id = p_msg returning * into m;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb)
         || jsonb_build_object('pedido_msg', p_msg, 'pedido_em', now())
   where id = m.conversa_id;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_plantao_url'),
      body := jsonb_build_object('mensagem_id', p_msg),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 85000);
  exception when others then null;   -- sem pg_net, a mensagem fixa sai em 90 s
  end;
end $$;

-- a mensagem do cliente entra na espera do plantão, ou vai à IA na hora
create or replace function zap_plantao_gatilho() returns trigger
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_bot boolean;
begin
  if new.direcao <> 'entrada'
     or coalesce((select valor from config_app where chave = 'zap_ia_plantao'), 'nao') <> 'sim' then return new; end if;
  -- o histórico que o celular reenvia na reconexão não é mensagem nova
  if coalesce(new.quando_wa, now()) < now() - interval '10 minutes' then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  if c.automatica or c.sem_ia then return new; end if;
  v_bot := coalesce((select valor from config_app where chave = 'zap_bot_ligado'), 'sim') = 'sim';
  if v_bot and c.bot_ativo and c.atendente_id is null then return new; end if;   -- o menu cuida
  -- escolha do horário oferecido com o robô desligado: lê aqui o que o zap_bot leria
  if c.bot_passo in ('agendar', 'agendar_nome', 'agendar_escolha') or coalesce(c.bot_dados ? 'pedido_em', false) then
    perform zap_bot_ler(new.id);
    return new;
  end if;
  if c.plantao->>'modo' in ('lead', 'conversa') or zap_plantao_interativa(c.id) then
    -- respondida na hora; o áudio espera a transcrição (relógio)
    if new.tipo = 'audio' and trim(coalesce(new.texto, '')) = '' then
      update zap_mensagens set bot_ia = 'plantao:agora' where id = new.id;
    else
      perform zap_plantao_chamar(new.id);
    end if;
  else
    update zap_mensagens set bot_ia = 'plantao:espera' where id = new.id;
  end if;
  return new;
end $$;
create or replace trigger zap_w_plantao_ins after insert on zap_mensagens
  for each row execute function zap_plantao_gatilho();

-- a Edge Function pega a mensagem uma vez só e recebe o que precisa para responder
create or replace function zap_plantao_pegar(p_msg uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; cl clientes; v_adv colaboradores; v_mesmo boolean; v_casos jsonb;
begin
  update zap_mensagens set bot_ia = 'plantao:lendo' where id = p_msg and bot_ia = 'plantao:pedida' returning * into m;
  if not found then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.cliente_id is not null then select * into cl from clientes where id = c.cliente_id; end if;
  -- a etapa do processo só sai para o telefone principal da ficha (a regra do zap_situacao)
  v_mesmo := cl.id is not null and fone_ddd8(c.telefone) is not null and fone_ddd8(c.telefone) = fone_ddd8(cl.telefone);
  if v_mesmo then
    select jsonb_agg(jsonb_build_object('beneficio', coalesce(nullif(trim(k.beneficio), ''), k.titulo),
             'fase', k.fase, 'etapa', zap_etapa_publica(k)) order by k.criado_em)
      into v_casos from casos k
     where k.cliente_id = cl.id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false);
  end if;
  select * into v_adv from colaboradores where id = zap_advogado_da_conversa(c.id);
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.nome_perfil), ''), ''),
    'cliente', case when cl.id is null then null else jsonb_build_object('nome', cl.nome,
                 'mesmo_telefone', v_mesmo, 'casos', coalesce(v_casos, '[]'::jsonb)) end,
    'advogado', v_adv.assinatura_zap,
    'advogados', (select jsonb_agg(assinatura_zap) from zap_advogados()),
    'modo', coalesce(c.plantao->>'modo', ''),
    'respostas', coalesce((c.plantao->>'n')::int, 0),
    'interativa', c.plantao->>'modo' in ('lead', 'conversa') or coalesce(zap_plantao_interativa(c.id), false),
    'horario', zap_no_horario(),
    'agenda', zap_agenda_ligada(),
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
                          order by momento desc, seq desc limit 60) x));
end $$;

-- o Managed Agents guarda a sessão da conversa e o agente cadastrado
create or replace function zap_plantao_sessao(p_conversa uuid, p_sessao jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set ia_sessao = p_sessao where id = p_conversa;
end $$;
create or replace function zap_plantao_ma_guardar(p_agente text, p_ambiente text, p_versao text) returns void
language sql security definer set search_path = public as $$
  update config_app set valor = coalesce(p_agente, '') where chave = 'zap_ma_agente';
  update config_app set valor = coalesce(p_ambiente, '') where chave = 'zap_ma_ambiente';
  update config_app set valor = coalesce(p_versao, '') where chave = 'zap_ma_versao';
$$;

-- a resposta da IA (ou a falta dela): só vale se a conversa não andou
create or replace function zap_plantao_aplicar(p_msg uuid, p_acao text, p_resposta text, p_advogado text,
  p_urgente boolean, p_assunto text, p_relato text, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
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
  -- a conversa andou enquanto a IA lia: a mensagem mais nova, ou a equipe, responde
  if c.automatica or c.sem_ia
     or exists (select 1 from zap_mensagens x where x.conversa_id = c.id and x.direcao = 'entrada' and x.seq > m.seq)
     or exists (select 1 from zap_mensagens x where x.conversa_id = c.id and x.direcao = 'saida'
                  and not x.por_bot and x.momento >= m.momento) then
    return;
  end if;
  if v_acao = 'nada' then return; end if;

  -- o advogado: o que a IA indicou, se for um dos advogados; senão, a regra da conversa
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
    -- ninguém conversa com a IA para sempre: o caso novo vai à agenda na 8ª resposta, a dúvida à equipe na 12ª
    if v_modo = 'lead' and v_n >= 8 then v_acao := 'agendar';
    elsif v_modo = 'conversa' and v_n >= 12 then v_acao := 'equipe'; end if;
  end if;

  if v_txt <> '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    values (c.id, 'saida', true, v_txt, 'fila', 'plantao:resposta');
  end if;
  if v_acao in ('lead', 'conversa') then return; end if;

  -- daqui em diante a conversa é da equipe: o modo termina e o advogado é avisado
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
   -- todos os advogados e a recepção são avisados; o responsável vai no texto (pedido do Paulo, 25.10.2026)
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
end $$;

-- o teste do Managed Agents (zap_plantao com {preparar: true}) abre uma vez e se fecha
insert into config_app (chave, valor) values ('zap_ma_teste', 'nao') on conflict (chave) do nothing;
create or replace function zap_plantao_ma_teste() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update config_app set valor = 'nao' where chave = 'zap_ma_teste' and valor = 'sim';
  if not found then return null; end if;
  return jsonb_build_object(
    'horario', zap_no_horario(), 'agenda', zap_agenda_ligada(),
    'agora', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    'advogados', (select jsonb_agg(assinatura_zap) from zap_advogados()),
    'instrucoes', coalesce((select valor from config_app where chave = 'zap_ia_txt_plantao'), ''),
    'ma', jsonb_build_object('agente', (select valor from config_app where chave = 'zap_ma_agente'),
                             'ambiente', (select valor from config_app where chave = 'zap_ma_ambiente'),
                             'versao', (select valor from config_app where chave = 'zap_ma_versao')));
end $$;
revoke all on function zap_plantao_ma_teste() from public, anon, authenticated;
grant execute on function zap_plantao_ma_teste() to service_role;

revoke all on function zap_plantao_sessao(uuid, jsonb) from public, anon, authenticated;
revoke all on function zap_plantao_ma_guardar(text, text, text) from public, anon, authenticated;
revoke all on function zap_plantao_interativa(uuid) from public, anon, authenticated;
grant execute on function zap_plantao_sessao(uuid, jsonb), zap_plantao_ma_guardar(text, text, text) to service_role;
