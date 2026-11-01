-- F350 · quatro ajustes no robô igual ao do SMBot (F348), aprovados pelo Paulo em 01.11.2026:
-- 1. limite de erros: na 3ª resposta sem número, a conversa vai à fila do Atendimento;
-- 2. nome inválido: "bom dia" ou "quero saber da aposentadoria" não viram nome completo;
-- 3. robôs de empresas: liga o filtro de conversas automáticas (zap_filtro_auto, F-onda 2);
-- 4. áudio: em vez de "não suportado", espera a transcrição do transcrever.py e lê como texto;
--    sem texto em 10 minutos, conta como resposta inválida.

insert into zap_smb_passos (chave, ordem, mensagens, opcoes, setor) values
('nao_entendi', 93, array['Vou encaminhar sua mensagem para a nossa equipe, que irá retornar em breve.'], '[]', 'Atendimento'),
('nome_invalido', 94, array['Por favor, informe seu *nome completo* (nome e sobrenome).'], '[]', null)
on conflict (chave) do nothing;

-- nome completo: duas palavras ou mais, só letras, sem cumprimento nem pedido
create or replace function zap_smb_nome_valido(p text) returns boolean
language sql immutable as $$
  select length(trim(coalesce(p, ''))) between 5 and 80
     and trim(p) !~ '[0-9@/?!]'
     and array_length(regexp_split_to_array(trim(p), '\s+'), 1) between 2 and 8
     and lower(translate(p, 'áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ', 'aaaaeeiooouucAAAAEEIOOOUUC'))
         !~ '\m(bom|boa|dia|tarde|noite|oi|ola|tudo|bem|quero|queria|gostaria|preciso|saber|sobre|minha|meu|aposentadoria|beneficio|inss|processo|pericia|ajuda|obrigad[oa]|whatsapp|atendimento|falar|consulta)\M'
$$;

-- resposta que não serve: pede de novo; na 3ª vez, a conversa vai à fila do Atendimento
create or replace function zap_smb_invalida(p_conversa uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; p zap_smb_passos;
begin
  update zap_conversas set bot_erros = bot_erros + 1 where id = p_conversa returning * into c;
  if c.bot_erros >= 3 then perform zap_smb_ir(p_conversa, 'nao_entendi'); return; end if;
  if c.bot_passo = 'smb:nome' then perform zap_smb_falar(p_conversa, 'nome_invalido'); return; end if;
  select * into p from zap_smb_passos where chave = substr(c.bot_passo, 5) and ativo;
  perform zap_smb_falar(p_conversa, 'invalida');
  if p.chave is not null and array_length(p.mensagens, 1) > 0 then
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

  -- F350: áudio sem texto espera a transcrição (zap_audio_transcrito chama de novo);
  -- vídeo continua não suportado
  if m.tipo = 'audio' and trim(coalesce(m.texto, '')) = '' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = m.id;
    return;
  end if;
  if m.tipo = 'video' and trim(coalesce(m.texto, '')) = '' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Mensagem de vídeo não suportada.', 'fila');
    return;
  end if;

  -- o nome: só nome completo vale (F350)
  if c.bot_passo = 'smb:nome' then
    nome := left(trim(coalesce(m.texto, '')), 80);
    if nome = '' then return; end if;
    if not zap_smb_nome_valido(nome) then perform zap_smb_invalida(c.id); return; end if;
    update zap_conversas set nome_informado = nome where id = c.id;
    perform zap_nota_sistema(c.id, null, 'Nome informado ao robô: ' || nome);
    perform zap_smb_ir(c.id, 'inicio');
    return;
  end if;

  select * into p from zap_smb_passos where chave = substr(c.bot_passo, 5) and ativo;
  if not found then return; end if;

  txt := lower(trim(regexp_replace(coalesce(m.texto, ''), '[*.)\s]', '', 'g')));
  for op in select * from jsonb_array_elements(p.opcoes) loop
    if txt = op->>'tecla' then achou := op->>'vai'; exit; end if;
  end loop;
  if achou is not null then perform zap_smb_ir(c.id, achou); return; end if;

  -- várias mensagens seguidas recebem uma resposta só
  pausa := coalesce((select valor from config_app where chave = 'zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens where conversa_id = c.id and por_bot;
  if ultimo is not null and pausa > 0 and ultimo > now() - make_interval(secs => pausa) then return; end if;
  perform zap_smb_invalida(c.id);
end $$;

-- o áudio transcrito no passo do SMBot volta ao robô do SMBot
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
  if v_passo like 'smb:%' then perform zap_smb_bot(new.id);
  else perform zap_bot_ler(new.id);
  end if;
  return new;
end $$;

-- áudio sem transcrição em 10 minutos, no passo do SMBot: conta como resposta inválida
do $$
declare d text := pg_get_functiondef('zap_triagem_vencidas()'::regprocedure);
begin
  if position('zap_smb_invalida' in d) = 0 then
    execute replace(d,
      $a$      else
        perform zap_bot_seguir(c.id, null);
      end if;$a$,
      $a$      elsif r.passo like 'smb:%' then
        perform zap_smb_invalida(c.id);
      else
        perform zap_bot_seguir(c.id, null);
      end if;$a$);
  end if;
end $$;

revoke execute on function zap_smb_invalida(uuid), zap_smb_bot(uuid) from public, anon, authenticated;

-- robôs de empresas (bancos, lojas, sistemas) saem da fila e não recebem menu
update config_app set valor = 'sim' where chave = 'zap_filtro_auto';
insert into config_app (chave, valor) values ('zap_filtro_auto', 'sim') on conflict (chave) do nothing;
