-- F350 · ajustes do robô igual ao do SMBot (F348), aprovados pelo Paulo em 01.11.2026:
--   1. três respostas inválidas seguidas levam a conversa à fila do Atendimento (antes, o menu sem fim);
--   2. o nome exige nome e sobrenome, sem número e sem cara de frase ("bom dia" deixa de virar nome);
--   3. o áudio é lido pela transcrição (transcrever.py) em vez de "não suportada"; sem texto em
--      10 minutos, o robô pede que digite (zap_triagem_vencidas);
--   4. o filtro de conversas automáticas (F272, zap_filtro_auto) é ligado.

insert into zap_smb_passos (chave, ordem, mensagens, opcoes, setor) values
('nome_invalido', 93, array['*Por favor, informe seu nome completo (nome e sobrenome) para iniciarmos o atendimento.*'], '[]', null),
('audio_sem_texto', 94, array['*Não consegui ouvir o seu áudio. Por favor, responda por escrito.*'], '[]', null),
('erros', 95, array['*Vou encaminhar sua conversa para a nossa equipe, que irá retornar em breve.*'], '[]', 'Atendimento')
on conflict (chave) do nothing;

-- o nome de gente: duas palavras ou mais, só letras, sem saudação nem frase
create or replace function zap_smb_nome_ok(p text) returns boolean
language sql immutable as $$
  select coalesce(
    p ~ '^[[:alpha:]''´`.-]+( +[[:alpha:]''´`.-]+)+$'
    and array_length(regexp_split_to_array(p, ' +'), 1) between 2 and 8
    and lower(p) !~ '^(bom|boa|ol[aá]|oi|ok|obrigad|tudo|sim|n[aã]o)( |$)'
    and lower(p) !~ '(^| )(quero|queria|preciso|gostaria|saber|sobre|minha|meu|aposentadoria|benef[ií]cio|inss|processo|ajuda|informa[cç][aã]o|dia|tarde|noite|favor|agendar|atendimento|d[uú]vida)( |$)',
    false)
$$;

-- avisa e repete a pergunta do passo atual (o nome, ou a última mensagem do menu)
create or replace function zap_smb_repetir(p_conversa uuid, p_aviso text) returns void
language plpgsql security definer set search_path = public as $$
declare passo text; p zap_smb_passos;
begin
  select substr(bot_passo, 5) into passo from zap_conversas where id = p_conversa;
  perform zap_smb_falar(p_conversa, p_aviso);
  if passo = 'nome' then perform zap_smb_falar(p_conversa, 'nome_invalido'); return; end if;
  select * into p from zap_smb_passos where chave = passo and ativo;
  if found and array_length(p.mensagens, 1) > 0 then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (p_conversa, 'saida', true, p.mensagens[array_length(p.mensagens, 1)], 'fila');
  end if;
end $$;

create or replace function zap_smb_bot(p_msg uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; p zap_smb_passos; op jsonb; achou text; txt text;
        ultimo timestamptz; pausa integer; nome text;
begin
  select * into m from zap_mensagens where id = p_msg;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.automatica then return; end if;

  -- na fila do setor, sem ninguém, fora do expediente: o recado do SMBot, uma vez por hora
  if c.bot_passo = 'smb:fila' then
    if c.atendente_id is null and not zap_no_horario()
       and not exists (select 1 from zap_mensagens where conversa_id = c.id and por_bot
                         and criado_em > now() - interval '1 hour') then
      perform zap_smb_falar(c.id, 'recado');
    end if;
    return;
  end if;
  if c.atendente_id is not null or not c.bot_ativo then return; end if;

  if c.bot_passo is null or c.bot_passo not like 'smb:%' then   -- primeiro contato
    if c.cliente_id is null and coalesce(trim(c.nome_informado), '') = '' then
      perform zap_smb_ir(c.id, 'nome');
    else
      perform zap_smb_ir(c.id, 'inicio');
    end if;
    return;
  end if;

  -- F350: o áudio espera a transcrição (zap_audio_transcrito chama de novo com o texto)
  if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = m.id;
    return;
  end if;
  if m.tipo = 'video' and trim(coalesce(m.texto, '')) = '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Mensagem de vídeo não suportada.', 'fila');
    return;
  end if;

  -- várias mensagens seguidas recebem uma resposta só
  pausa := coalesce((select valor from config_app where chave = 'zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens where conversa_id = c.id and por_bot;

  if c.bot_passo = 'smb:nome' then
    nome := left(regexp_replace(trim(coalesce(m.texto, '')), '\s+', ' ', 'g'), 80);
    if nome = '' then return; end if;
    if zap_smb_nome_ok(nome) then
      update zap_conversas set nome_informado = nome where id = c.id;
      perform zap_nota_sistema(c.id, null, 'Nome informado ao robô: ' || nome);
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

  txt := lower(trim(regexp_replace(coalesce(m.texto, ''), '[*.,!?)\s]', '', 'g')));
  -- o áudio transcrito diz o número por extenso ("dois") ou numa frase ("opção 2")
  txt := case txt when 'um' then '1' when 'uma' then '1' when 'dois' then '2' when 'duas' then '2'
                  when 'três' then '3' when 'tres' then '3' when 'quatro' then '4' when 'cinco' then '5' else txt end;
  if txt ~ '^[^0-9]*[0-9][^0-9]*$' then txt := regexp_replace(txt, '[^0-9]', '', 'g'); end if;
  for op in select * from jsonb_array_elements(p.opcoes) loop
    if txt = op->>'tecla' then achou := op->>'vai'; exit; end if;
  end loop;
  if achou is not null then perform zap_smb_ir(c.id, achou); return; end if;

  -- resposta que não é número: pede o número e repete o menu; na terceira, vai à equipe
  if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
  if coalesce(c.bot_erros, 0) >= 2 then perform zap_smb_ir(c.id, 'erros'); return; end if;
  update zap_conversas set bot_erros = coalesce(bot_erros, 0) + 1 where id = c.id;
  perform zap_smb_repetir(c.id, 'invalida');
end $$;

-- a transcrição chegou: o robô do SMBot lê o áudio como texto
create or replace function zap_audio_transcrito() returns trigger
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_passo text := substr(new.bot_ia, 7);
begin
  if new.bot_ia is null or new.bot_ia not like 'audio:%' or v_passo = 'vencido'
     or trim(coalesce(new.texto,'')) = '' or new.texto like '[áudio%' then return new; end if;
  update zap_mensagens set bot_ia = null where id = new.id;
  select * into c from zap_conversas where id = new.conversa_id;
  -- a conversa andou enquanto o áudio era transcrito: não mexe
  if not c.bot_ativo or c.atendente_id is not null or c.bot_passo is distinct from v_passo
     or exists (select 1 from zap_mensagens x where x.conversa_id = new.conversa_id
                  and x.direcao = 'entrada' and x.seq > new.seq) then
    return new;
  end if;
  if v_passo like 'smb:%' then perform zap_smb_bot(new.id); else perform zap_bot_ler(new.id); end if;
  return new;
end $$;

create or replace function zap_triagem_vencidas() returns integer
language plpgsql security definer set search_path to 'public' as $function$
declare r record; n integer := 0; c zap_conversas;
begin
  for r in select id from zap_mensagens
            where (bot_ia like 'pedida:%' or bot_ia like 'lendo:%') and criado_em < now() - interval '60 seconds'
            order by criado_em loop
    perform zap_triagem_aplicar(r.id, null);
    n := n + 1;
  end loop;
  for r in select id, conversa_id, seq, substr(bot_ia, 7) passo from zap_mensagens
            where bot_ia like 'audio:%' and bot_ia <> 'audio:vencido' and criado_em < now() - interval '10 minutes'
            order by criado_em loop
    update zap_mensagens set bot_ia = 'audio:vencido' where id = r.id;
    select * into c from zap_conversas where id = r.conversa_id;
    if c.bot_ativo and c.atendente_id is null and c.bot_passo = r.passo
       and not exists (select 1 from zap_mensagens x where x.conversa_id = r.conversa_id
                         and x.direcao = 'entrada' and x.seq > r.seq) then
      if r.passo like 'smb:%' then
        perform zap_smb_repetir(c.id, 'audio_sem_texto');   -- F350
      elsif r.passo = 'novo_relato' then
        perform zap_nota_sistema(c.id, null, 'Relato do caso novo: o cliente mandou áudio, ainda sem transcrição.');
        perform zap_bot_seguir(c.id, 'novo_relato_fim');
      else
        perform zap_bot_seguir(c.id, null);
      end if;
    end if;
    n := n + 1;
  end loop;
  -- a agenda que não respondeu em 2 minutos: a conversa vai para uma pessoa
  for r in select id from zap_conversas
            where bot_dados ? 'pedido_em' and (bot_dados->>'pedido_em')::timestamptz < now() - interval '2 minutes'
              and bot_ativo and atendente_id is null loop
    perform zap_agenda_falhou(r.id, null, 'a agenda não respondeu');
    n := n + 1;
  end loop;
  return n;
end $function$;

revoke execute on function zap_smb_repetir(uuid, text), zap_smb_bot(uuid), zap_triagem_vencidas()
  from public, anon, authenticated;

update config_app set valor = 'sim' where chave = 'zap_filtro_auto';
insert into config_app (chave, valor) values ('zap_filtro_auto', 'sim') on conflict (chave) do nothing;
