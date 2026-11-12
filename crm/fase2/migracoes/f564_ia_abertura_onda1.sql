-- F564 · onda 1 da retirada do menu do robô (decisões do Paulo de 12.11.2026, Claude Doc
-- "Retirada do robô do menu: planejamento"): com a chave zap_ia_abertura = 'sim' e a Agenda da IA
-- ligada, a primeira mensagem de quem escreve vai à IA, sem as boas-vindas fixas, o pedido do nome
-- e o menu numerado. O andamento pedido por número sem ficha vai ao setor Jurídico. O aviso do golpe
-- passa ao fim da primeira resposta da IA (zap_plantao). Desligada a chave, o menu volta.

insert into config_app (chave, valor) values ('zap_ia_abertura', 'sim')
  on conflict (chave) do update set valor = excluded.valor;

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
  -- F564 · onda 1: com zap_ia_abertura, a primeira mensagem vai à IA, sem boas-vindas fixas, nome e menu.
  -- O menu fica de reserva: desligada a chave, tudo volta como antes. O número sozinho no menu ainda escolhe a opção.
  if v_ia and coalesce((select valor from config_app where chave = 'zap_ia_abertura'), 'nao') = 'sim'
     and (c.bot_passo is null or c.bot_passo not like 'smb:%'
          or (c.bot_passo in ('smb:nome', 'smb:inicio') and trim(coalesce(m.texto, '')) !~ '^\d{1,2}$')) then
    if c.cliente_id is null and zap_pede_andamento(m.texto) then
      perform zap_smb_para_ia(c.id, m.id, 'Jurídico', 'Andamento pedido por número sem ficha: a conversa foi à IA e à equipe jurídica.');
    else
      perform zap_smb_para_ia(c.id, m.id, 'Atendimento', 'Abertura pela IA (onda 1): sem boas-vindas fixas, nome e menu.');
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
