-- F552 · leitura das conversas de 08 a 12.11.2026, correções aprovadas pelo Paulo em 12.11.2026.
-- 1. O áudio do cliente com o atendente Offline espera a transcrição antes de ir à IA.
-- 3. Depois da confirmação ou de conversa com a IA, a mensagem não reabre o menu; o texto livre
--    em qualquer ponto do menu vai à IA, em vez de "digite o número".
-- 6. Frase que não é nome ("estou indo agora") não vale como nome.
-- Falhas menores: o "sim" claro à confirmação confirma na hora, sem passar pela IA (evita a
-- resposta duplicada e o "Sin" sem registro); o robô "Assistente BB" entra no filtro de automáticas.

-- Leva a conversa à IA no lugar do menu (antes repetido em F422ad e F422ai).
create or replace function public.zap_smb_para_ia(p_conversa uuid, p_msg uuid, p_setor text, p_nota text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare m zap_mensagens;
begin
  select * into m from zap_mensagens where id = p_msg;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set bot_passo = 'smb:ia', bot_erros = 0, bot_desde = now(), bot_ativo = false,
    setor = p_setor, setor_id = (select s.id from zap_setores s where s.nome = p_setor),
    plantao = coalesce(plantao, '{}'::jsonb) || '{"modo":"conversa"}'::jsonb,
    status = case when status = 'resolvida' then 'aberta' else status end
   where id = p_conversa;
  perform zap_nota_sistema(p_conversa, null, p_nota);
  if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
    update zap_mensagens set bot_ia = 'plantao:agora' where id = p_msg;
  else
    perform zap_plantao_chamar(p_msg);
  end if;
end $$;
revoke execute on function public.zap_smb_para_ia(uuid, uuid, text, text) from public, anon;

create or replace function public.zap_smb_bot(p_msg uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare m zap_mensagens; c zap_conversas; p zap_smb_passos; op jsonb; achou text; txt text;
        ultimo timestamptz; pausa integer; v_nome text; v_ia boolean; v_ctx boolean;
begin
  select * into m from zap_mensagens where id = p_msg;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.automatica then return; end if;
  if c.bot_passo = 'smb:fila' then
    if c.atendente_id is null and not zap_no_horario()
       and not exists (select 1 from zap_mensagens where conversa_id = c.id and por_bot
                         and criado_em > now() - interval '1 hour') then
      perform zap_smb_falar(c.id, 'recado');
    end if;
    return;
  end if;
  if c.atendente_id is not null or not c.bot_ativo then return; end if;
  v_ia := zap_conf_ia_remarca() and not coalesce(c.sem_ia, false);
  -- F552: confirmação ou conversa com a IA nas últimas 48 horas: o menu não volta.
  if v_ia then
    v_ctx := c.confirmacao->>'estado' in ('aguardando', 'confirmado', 'remarcando', 'sim')
      or exists (select 1 from zap_mensagens where conversa_id = c.id and por_bot and direcao = 'saida'
                   and criado_em > now() - interval '48 hours'
                   and (bot_ia = 'plantao:resposta' or aviso_chave like 'confirmacao:%'));
    if v_ctx then
      if zap_conf_agradece(m.tipo, m.texto) then
        update zap_mensagens set bot_ia = 'conf:agradeceu' where id = m.id;
        return;
      end if;
      perform zap_smb_para_ia(c.id, m.id, 'Atendimento', 'Conversa recente com a assistente virtual: a mensagem foi à IA, sem o menu.');
      return;
    end if;
  end if;
  -- F422ad: o pedido de agendamento no texto livre vai à IA, que lê a conversa inteira.
  if v_ia and (c.bot_passo is null or c.bot_passo not like 'smb:%' or c.bot_passo in ('smb:nome', 'smb:inicio'))
     and zap_smb_quer_agendar(m.texto) then
    perform zap_smb_para_ia(c.id, m.id, 'Agendamentos', 'Pedido de agendamento na mensagem: a conversa foi direto à IA.');
    return;
  end if;
  -- F422ai: cliente com ficha não recebe o menu. O número sozinho no menu continua escolhendo a opção.
  if v_ia and c.cliente_id is not null
     and (c.bot_passo is null or c.bot_passo not like 'smb:%'
          or (c.bot_passo = 'smb:inicio' and trim(coalesce(m.texto, '')) !~ '^\d{1,2}$')) then
    perform zap_smb_para_ia(c.id, m.id, 'Atendimento', 'Cliente com ficha: a conversa foi direto à IA, sem o menu.');
    return;
  end if;
  if c.bot_passo is null or c.bot_passo not like 'smb:%' then
    if c.cliente_id is null and coalesce(trim(c.nome_informado), '') = '' then
      perform zap_smb_ir(c.id, 'nome');
    else
      perform zap_smb_ir(c.id, 'inicio');
    end if;
    return;
  end if;
  if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = m.id;
    return;
  end if;
  if m.tipo = 'video' and trim(coalesce(m.texto, '')) = '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Mensagem de vídeo não suportada.', 'fila');
    return;
  end if;
  pausa := coalesce((select valor from config_app where chave = 'zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens where conversa_id = c.id and por_bot;
  if c.bot_passo = 'smb:nome' then
    v_nome := left(regexp_replace(trim(coalesce(m.texto, '')), '\s+', ' ', 'g'), 80);
    if v_nome = '' then return; end if;
    if zap_smb_nome_ok(v_nome) then
      update zap_conversas set nome_informado = v_nome where id = c.id;
      perform zap_nota_sistema(c.id, null, 'Nome informado ao robô: ' || v_nome);
      perform zap_smb_ir(c.id, 'inicio');
      return;
    end if;
    -- F552: frase no lugar do nome vai à IA, que responde e pede o nome.
    if v_ia and (array_length(regexp_split_to_array(v_nome, ' '), 1) >= 3 or v_nome like '%?%') then
      perform zap_smb_para_ia(c.id, m.id, 'Atendimento', 'Frase no lugar do nome: a conversa foi à IA, sem o menu.');
      return;
    end if;
    if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
    if coalesce(c.bot_erros, 0) >= 2 then perform zap_smb_ir(c.id, 'erros'); return; end if;
    update zap_conversas set bot_erros = coalesce(bot_erros, 0) + 1 where id = c.id;
    perform zap_smb_falar(c.id, 'nome_invalido');
    return;
  end if;
  select * into p from zap_smb_passos where chave = substr(c.bot_passo, 5) and ativo;
  if not found then return; end if;
  txt := lower(trim(regexp_replace(coalesce(m.texto, ''), '[*.)\s]', '', 'g')));
  for op in select * from jsonb_array_elements(p.opcoes) loop
    if txt = op->>'tecla' then achou := op->>'vai'; exit; end if;
  end loop;
  if achou is not null then perform zap_smb_ir(c.id, achou); return; end if;
  -- F552: texto livre no menu vai à IA, e não ao "digite o número".
  if v_ia and coalesce(m.texto, '') ~ '[[:alpha:]].*[[:alpha:]]' then
    perform zap_smb_para_ia(c.id, m.id, 'Atendimento', 'Texto livre no menu: a conversa foi à IA.');
    return;
  end if;
  if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
  if coalesce(c.bot_erros, 0) >= 2 then perform zap_smb_ir(c.id, 'erros'); return; end if;
  update zap_conversas set bot_erros = coalesce(bot_erros, 0) + 1 where id = c.id;
  perform zap_smb_repetir(c.id, 'invalida');
end $function$;

create or replace function public.zap_smb_nome_ok(p text)
returns boolean language sql immutable as $function$
  select coalesce(
    p ~ '^[[:alpha:]''´`.-]+( +[[:alpha:]''´`.-]+)+$'
    and array_length(regexp_split_to_array(p, ' +'), 1) between 2 and 8
    and lower(p) !~ '^(bom|boa|ol[aá]|oi|ok|obrigad|tudo|sim|n[aã]o)( |$)'
    and lower(p) !~ '(^| )(quero|queria|preciso|gostaria|saber|sobre|minha|meu|aposentadoria|benef[ií]cio|inss|processo|ajuda|informa[cç][aã]o|dia|tarde|noite|favor|agendar|atendimento|d[uú]vida)( |$)'
    and lower(p) !~ '(^| )(estou|to|tô|indo|vou|agora|a[ií]|aqui|j[aá]|hoje|amanh[aã]|onde|quando|como|chegando|cheguei|tenho|tem|pode|posso|consigo|marquei|marcado|agendado|hor[aá]rio|consulta|escrit[oó]rio|doutor|doutora|dr|dra|obrigad[oa]s?|mas|pra|para|com)( |$)',
    false)
$function$;

create or replace function public.zap_eh_automatica(p text)
returns boolean language sql immutable as $function$
  select lower(translate(replace(coalesce(p, ''), '*', ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ~ ('(este canal (e|eh) (utilizado|usado) exclusivamente|esta e uma mensagem automatica|mensagem automatica'
       '|nao responda (a )?esta mensagem|utilize as opcoes|digite (o numero da opcao|uma das opcoes|a opcao)'
       '|opcao invalida|selecione uma das opcoes|escolha uma das opcoes abaixo|sou (o|a) assistente virtual'
       '|(nosso|seu) atendimento virtual|numero nao recebe mensagens|este numero nao (e|eh) monitorado'
       '|^assistente [^:]{1,30}:|assistente virtual do bb)')
$function$;

create or replace function public.zap_offline_gatilho()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
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

-- O "sim" claro, sem pergunta, confirma na hora (a IA lia de novo e respondia duas vezes).
create or replace function public.zap_conf_resposta(p_msg uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
declare m zap_mensagens; c zap_conversas; v_classe text; v_pedido text; v_sim boolean;
begin
  select * into m from zap_mensagens where id = p_msg;
  if m.direcao <> 'entrada' then return false; end if;
  if zap_espera_resposta(p_msg) then return true; end if;
  if pericia_resposta(p_msg) then return true; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.confirmacao->>'msg' = p_msg::text then return true; end if;
  if c.confirmacao->>'estado' in ('sim', 'confirmado')
     and coalesce((c.confirmacao->>'confirmado_em')::timestamptz, (c.confirmacao->>'respondida_em')::timestamptz) > now() - interval '12 hours'
     and zap_conf_agradece(m.tipo, m.texto) then
    update zap_mensagens set bot_ia = 'conf:agradeceu' where id = p_msg;
    return true;
  end if;
  -- F422ac: confirmado e antes do fim do dia do atendimento, a pergunta vai à IA, e não ao menu do robô.
  if c.confirmacao->>'estado' in ('sim', 'confirmado')
     and (c.confirmacao->>'data')::date >= (now() at time zone 'America/Sao_Paulo')::date
     and zap_conf_ia_remarca() then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('msg', p_msg) where id = c.id;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  v_sim := m.tipo <> 'audio' and coalesce(m.texto, '') not like '%?%' and zap_conf_classe(m.texto) = 'sim';
  if coalesce(zap_conf_remarcando(c), false) then
    if not zap_conf_ia_remarca() then return false; end if;
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('msg', p_msg)
      || case when coalesce((confirmacao->>'duvida')::boolean, false)
              then jsonb_build_object('ler', true, 'reler', true,
                     'classe', case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end)
              else '{}'::jsonb end
     where id = c.id;
    -- F552: na dúvida, o "sim" claro confirma sem a IA
    if v_sim and coalesce((c.confirmacao->>'duvida')::boolean, false) then
      perform zap_conf_ia_intencao(c.id, 'confirmar', p_msg);
      return true;
    end if;
    perform zap_conf_para_ia(c.id, p_msg);
    return true;
  end if;
  if not coalesce(zap_conf_espera(c), false) then return false; end if;
  v_classe := case when m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then 'duvida' else zap_conf_classe(m.texto) end;
  if zap_conf_ia_remarca() then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
        'msg', p_msg, 'respondida_em', now(), 'resposta', left(coalesce(m.texto, '[' || m.tipo || ']'), 200),
        'estado', 'remarcando', 'remarcar_em', now(), 'ler', true, 'reler', false, 'classe', v_classe, 'duvida', v_classe = 'duvida', 'avisada', true)
     where id = c.id;
    if v_sim then
      perform zap_conf_ia_intencao(c.id, 'confirmar', p_msg);
      return true;
    end if;
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
        headers := zap_fn_cabecalho(), timeout_milliseconds := 30000);
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
end $function$;
