-- ══ O plantão da IA no WhatsApp (F274) ═════════════════════════════════════
-- Pedido do Paulo, 25.10.2026: a demora da resposta é o que mais faz o cliente
-- ligar ou ir ao escritório. No histórico (desde 10/2025), de 3.519 vezes em que
-- o cliente escreveu, 946 esperaram mais de 1 hora e 442 mais de um dia.
-- O robô do menu está desligado (a equipe responde do celular), por isso o
-- plantão é independente dele:
--   · a mensagem do cliente que fica sem resposta da equipe por zap_plantao_min
--     minutos (zap_plantao_fora_min fora do expediente) vai à IA (Edge Function
--     zap_plantao), que lê o histórico da conversa e o caso e decide: não
--     responder (agradecimento, "ok", conversa pessoal ou entre colegas),
--     tranquilizar dizendo qual advogado vai responder, ou atender o caso novo;
--   · o advogado (Paulo, Marcos ou Amanda) recebe a menção no CRM: o da ficha,
--     senão o último que assinou na conversa, senão o do caso, senão o padrão;
--   · o caso novo segue em modo "lead": a IA acolhe, colhe o relato e, com o
--     nome e o assunto, oferece os horários da agenda (onda 4, zap_agenda);
--   · uma resposta só por espera: depois que a IA tranquilizou, ela só volta a
--     falar quando a equipe tiver respondido;
--   · sem resposta da IA em 90 s, sai uma mensagem fixa de recebimento.
-- Nasce DESLIGADO (zap_ia_plantao = 'nao'), e cada conversa pode ficar fora
-- da IA (zap_conversas.sem_ia, no ⋯ da conversa).
insert into config_app (chave, valor) values
  ('zap_ia_plantao','nao'), ('zap_plantao_min','20'), ('zap_plantao_fora_min','5'),
  ('zap_plantao_lead','todos'),
  ('zap_plantao_url','https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_plantao')
  on conflict (chave) do nothing;

alter table zap_conversas add column if not exists sem_ia boolean not null default false;
-- modo (lead), n (respostas no modo lead), nome, relato, pedido_msg, pedido_em
alter table zap_conversas add column if not exists plantao jsonb;

-- os advogados que recebem o cliente (cargo advogado, com assinatura no WhatsApp)
create or replace function zap_advogados() returns setof colaboradores
language sql stable security definer set search_path = public as $$
  select * from colaboradores
   where ativo and cargo = 'advogado' and coalesce(trim(assinatura_zap), '') <> '' order by nome
$$;

-- quem responde a conversa: o advogado da ficha (F245), senão o último que
-- assinou na conversa, senão o atribuído a um caso aberto, senão o padrão
create or replace function zap_advogado_da_conversa(p_conversa uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare c zap_conversas; v uuid;
begin
  select * into c from zap_conversas where id = p_conversa;
  if c.cliente_id is not null then
    select a.id into v from clientes cl join zap_advogados() a on a.id::text = cl.campos->>'advogado_id'
     where cl.id = c.cliente_id;
    if v is not null then return v; end if;
  end if;
  select a.id into v from zap_mensagens m join zap_advogados() a on m.texto like '*' || a.assinatura_zap || ':*%'
   where m.conversa_id = p_conversa and m.direcao = 'saida' and m.momento > now() - interval '180 days'
   order by m.momento desc limit 1;
  if v is not null then return v; end if;
  if c.cliente_id is not null then
    select a.id into v from atribuicoes t join casos k on k.id = t.caso_id join zap_advogados() a on a.id = t.colaborador_id
     where k.cliente_id = c.cliente_id and k.fase <> 'encerrado' order by k.criado_em desc limit 1;
    if v is not null then return v; end if;
  end if;
  -- 'todos' (decisão do Paulo, 25.10.2026): sem advogado definido, nulo, e todos os advogados são avisados
  if coalesce((select valor from config_app where chave = 'zap_plantao_lead'), 'todos') = 'todos' then return null; end if;
  select a.id into v from zap_advogados() a
   where a.nome = coalesce((select valor from config_app where chave = 'zap_plantao_lead'), '');
  return coalesce(v, (select id from colaboradores where ativo and papel = 'admin' order by nome limit 1));
end $$;

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
      timeout_milliseconds := 55000);
  exception when others then null;   -- sem pg_net, a mensagem fixa sai em 90 s
  end;
end $$;

-- a mensagem do cliente entra na espera do plantão
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
  if c.plantao->>'modo' = 'lead' then
    -- o caso novo é respondido na hora; o áudio espera a transcrição (relógio)
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
-- depois do filtro de mensagem automática (zap_v_filtro_ins), que marca a conversa
drop trigger if exists zap_w_plantao_ins on zap_mensagens;
create trigger zap_w_plantao_ins after insert on zap_mensagens
  for each row execute function zap_plantao_gatilho();

-- o relógio do plantão (zap_relogio, a cada 30 s)
create or replace function zap_plantao_vencidas() returns integer
language plpgsql security definer set search_path = public as $$
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
      update zap_mensagens set bot_ia = 'plantao:junto' where id = r.id;           -- a mais nova responde por todas
    elsif exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.direcao = 'saida'
                    and not x.por_bot and x.momento >= r.momento) then
      update zap_mensagens set bot_ia = 'plantao:respondida' where id = r.id;
    elsif r.bot_ia = 'plantao:espera' and exists (
            select 1 from zap_mensagens x where x.conversa_id = r.conversa_id and x.bot_ia = 'plantao:resposta'
               -- depois de 4 h sem a equipe, responde de novo, só no horário comercial (Paulo, 25.10.2026)
               and (x.momento > now() - interval '4 hours' or not zap_no_horario())
               and x.momento > coalesce((select max(h.momento) from zap_mensagens h where h.conversa_id = r.conversa_id
                                           and h.direcao = 'saida' and not h.por_bot), '-infinity')) then
      update zap_mensagens set bot_ia = 'plantao:ja_avisado' where id = r.id;      -- uma resposta por espera
    elsif exists (select 1 from zap_conversas c where c.id = r.conversa_id and (c.automatica or c.sem_ia)) then
      update zap_mensagens set bot_ia = 'plantao:fora' where id = r.id;
    else
      perform zap_plantao_chamar(r.id);
    end if;
    n := n + 1;
  end loop;
  -- a IA não respondeu em 90 s: o cliente recebe o aviso fixo e o advogado, a menção
  for r in select c.id, (c.plantao->>'pedido_msg')::uuid msg from zap_conversas c
            where c.plantao ? 'pedido_em' and (c.plantao->>'pedido_em')::timestamptz < now() - interval '90 seconds' loop
    perform zap_plantao_aplicar(r.msg, 'falhou', null, null, false, null, null, null);
    n := n + 1;
  end loop;
  return n;
end $$;

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
    'contato', coalesce(nullif(trim(c.nome_perfil), ''), ''),
    'cliente', case when cl.id is null then null else jsonb_build_object('nome', cl.nome,
                 'mesmo_telefone', v_mesmo, 'casos', coalesce(v_casos, '[]'::jsonb)) end,
    'advogado', v_adv.assinatura_zap,
    'advogados', (select jsonb_agg(assinatura_zap) from zap_advogados()),
    'modo', coalesce(c.plantao->>'modo', ''),
    'respostas', coalesce((c.plantao->>'n')::int, 0),
    'horario', zap_no_horario(),
    'agenda', zap_agenda_ligada(),
    'agora', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                    'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                          order by momento desc, seq desc limit 60) x));
end $$;

-- a resposta da IA (ou a falta dela): só vale se a conversa não andou
create or replace function zap_plantao_aplicar(p_msg uuid, p_acao text, p_resposta text, p_advogado text,
  p_urgente boolean, p_assunto text, p_relato text, p_nome text) returns void
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_adv uuid; v_acao text := p_acao; v_txt text; v_n integer;
        v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
        v_quem text;
begin
  select * into c from zap_conversas where id = (select conversa_id from zap_mensagens where id = p_msg) for update;
  if not found or c.plantao->>'pedido_msg' is distinct from p_msg::text then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set plantao = plantao - 'pedido_msg' - 'pedido_em' where id = c.id;
  if v_acao not in ('nada', 'responder', 'lead', 'agendar', 'equipe', 'falhou') then v_acao := 'falhou'; end if;
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

  if v_acao = 'lead' then
    v_n := coalesce((c.plantao->>'n')::int, 0) + 1;
    update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb) || jsonb_build_object('modo', 'lead', 'n', v_n)
           || case when coalesce(trim(p_nome), '') <> '' then jsonb_build_object('nome', initcap(trim(p_nome))) else '{}'::jsonb end
           || case when coalesce(trim(p_relato), '') <> '' then jsonb_build_object('relato', left(trim(p_relato), 1500)) else '{}'::jsonb end
     where id = c.id;
    -- ninguém conversa com a IA para sempre: na oitava resposta, a agenda ou a equipe
    if v_n >= 8 then v_acao := 'agendar'; end if;
  end if;

  if v_txt <> '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    values (c.id, 'saida', true, v_txt, 'fila', 'plantao:resposta');
  end if;
  if v_acao = 'lead' then return; end if;

  -- daqui em diante a conversa é da equipe: o modo lead termina e o advogado é avisado
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

-- o relógio passa a cuidar também do plantão
create or replace function zap_relogio() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer := 0; r record;
begin
  update zap_mensagens set status = 'fila'
   where status = 'agendada' and enviar_em <= now();
  get diagnostics n = row_count;
  for r in select z.id, z.conversa_id, coalesce(z.colaborador_id, c.atendente_id) quem, z.nota,
                  coalesce(nullif(trim(c.nome_perfil), ''), c.telefone) nome
             from zap_retornos z join zap_conversas c on c.id = z.conversa_id
            where z.feito_em is null and z.avisado_em is null and z.quando <= now() loop
    if r.quem is not null then
      insert into mencoes (para_id, conversa_id, texto)
      values (r.quem, r.conversa_id, '⏰ Retorno: responder ' || coalesce(r.nome, 'o contato')
              || coalesce(' — ' || nullif(trim(r.nota), ''), ''));
    end if;
    update zap_retornos set avisado_em = now() where id = r.id;
  end loop;
  perform zap_bot_esperas();
  perform zap_triagem_vencidas();
  perform zap_plantao_vencidas();
  return n;
end $$;

-- as portas da Edge Function só abrem para service_role
revoke all on function zap_plantao_pegar(uuid) from public, anon, authenticated;
revoke all on function zap_plantao_aplicar(uuid, text, text, text, boolean, text, text, text) from public, anon, authenticated;
revoke all on function zap_plantao_chamar(uuid) from public, anon, authenticated;
revoke all on function zap_plantao_vencidas() from public, anon, authenticated;
grant execute on function zap_plantao_pegar(uuid), zap_plantao_aplicar(uuid, text, text, text, boolean, text, text, text)
  to service_role;
