-- F511 (10.11.2026): desde a F422ad, a variável "nome" da zap_smb_bot colidia com a coluna
-- zap_setores.nome ("column reference nome is ambiguous", 42702). O erro abortava o INSERT
-- em zap_mensagens, e a ponte retinha as mensagens recebidas em pendentes.jsonl.
-- A função é a mesma; a variável passa a se chamar v_nome.
CREATE OR REPLACE FUNCTION public.zap_smb_bot(p_msg uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m zap_mensagens; c zap_conversas; p zap_smb_passos; op jsonb; achou text; txt text;
        ultimo timestamptz; pausa integer; v_nome text;
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
  -- F422ad: o pedido de agendamento no texto livre vai à IA, que lê a conversa inteira.
  if (c.bot_passo is null or c.bot_passo not like 'smb:%' or c.bot_passo in ('smb:nome', 'smb:inicio'))
     and zap_smb_quer_agendar(m.texto) and zap_conf_ia_remarca() then
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set bot_passo = 'smb:ia', bot_erros = 0, bot_desde = now(), bot_ativo = false,
      setor = 'Agendamentos', setor_id = (select s.id from zap_setores s where s.nome = 'Agendamentos'),
      plantao = coalesce(plantao, '{}'::jsonb) || '{"modo":"conversa"}'::jsonb,
      status = case when status = 'resolvida' then 'aberta' else status end
     where id = c.id;
    perform zap_nota_sistema(c.id, null, 'Pedido de agendamento na mensagem: a conversa foi direto à IA.');
    perform zap_plantao_chamar(m.id);
    return;
  end if;
  -- F422ai: cliente com ficha não recebe o menu; a primeira mensagem (texto, áudio ou arquivo) vai à IA.
  -- O número sozinho no menu continua escolhendo a opção.
  if c.cliente_id is not null and not coalesce(c.sem_ia, false) and zap_conf_ia_remarca()
     and (c.bot_passo is null or c.bot_passo not like 'smb:%'
          or (c.bot_passo = 'smb:inicio' and trim(coalesce(m.texto, '')) !~ '^\d{1,2}$')) then
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set bot_passo = 'smb:ia', bot_erros = 0, bot_desde = now(), bot_ativo = false,
      setor = 'Atendimento', setor_id = (select s.id from zap_setores s where s.nome = 'Atendimento'),
      plantao = coalesce(plantao, '{}'::jsonb) || '{"modo":"conversa"}'::jsonb,
      status = case when status = 'resolvida' then 'aberta' else status end
     where id = c.id;
    perform zap_nota_sistema(c.id, null, 'Cliente com ficha: a conversa foi direto à IA, sem o menu.');
    if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
      update zap_mensagens set bot_ia = 'plantao:agora' where id = m.id;
    else
      perform zap_plantao_chamar(m.id);
    end if;
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
  if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
  if coalesce(c.bot_erros, 0) >= 2 then perform zap_smb_ir(c.id, 'erros'); return; end if;
  update zap_conversas set bot_erros = coalesce(bot_erros, 0) + 1 where id = c.id;
  perform zap_smb_repetir(c.id, 'invalida');
end $function$;

revoke execute on function public.zap_smb_bot(uuid) from anon;
