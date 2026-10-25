-- ══ A IA no WhatsApp, ondas 2 a 5 (F272) ══════════════════════════════════
-- Planejamento: Claude Doc "IA no WhatsApp do escritório: planejamento".
-- A onda 1 (triagem do texto livre e situação do processo) é a F258/F259.
-- Tudo nasce DESLIGADO, cada onda numa caixa das Configurações do WhatsApp:
--   zap_filtro_auto  onda 2  mensagem automática de outra empresa sai da fila
--                            (a triagem do áudio transcrito segue a caixa da IA, zap_robo_ia)
--   zap_ia_equipe    onda 3  resumo e rascunho no CRM (Edge Function zap_assistente)
--   zap_robo_agenda  onda 4  o robô oferece as vagas da agenda e marca (Edge Function zap_agenda)
--   zap_robo_noturno onda 5  fora do expediente, o robô colhe o relato do caso novo
-- A juntada do documento ao caso (onda 4) é botão do CRM e segue zap_ia_equipe.
insert into config_app (chave, valor) values
  ('zap_filtro_auto','nao'), ('zap_ia_equipe','nao'), ('zap_robo_agenda','nao'), ('zap_robo_noturno','nao'),
  ('zap_agenda_url','https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_agenda'), ('zap_agenda_profs','marcos,amanda')
  on conflict (chave) do nothing;

alter table zap_conversas add column if not exists automatica boolean not null default false;
-- o que o robô guarda no meio de um fluxo (vagas oferecidas, nome, relato) e o
-- pedido de uso único que a Edge Function zap_agenda apresenta para ler isso
alter table zap_conversas add column if not exists bot_dados jsonb;

-- ── Onda 2 · a mensagem automática de outra empresa ───────────────────────
-- Robô de banco, de concessionária, de loja: ele responde ao nosso menu com o
-- menu dele, e os dois conversam sozinhos (houve conversa com 223 mensagens).
-- Só vale para conversa SEM cliente na ficha: cliente nunca é filtrado.
create or replace function zap_eh_automatica(p text) returns boolean
language sql immutable as $$
  select lower(translate(coalesce(p, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'))
    ~ ('(este canal (e|eh) (utilizado|usado) exclusivamente|esta e uma mensagem automatica|mensagem automatica'
       '|nao responda (a )?esta mensagem|utilize as opcoes|digite (o numero da opcao|uma das opcoes|a opcao)'
       '|opcao invalida|selecione uma das opcoes|escolha uma das opcoes abaixo|sou (o|a) assistente virtual'
       '|(nosso|seu) atendimento virtual|numero nao recebe mensagens|este numero nao (e|eh) monitorado)')
$$;

create or replace function zap_filtro() returns trigger
language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  if new.direcao <> 'entrada' then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  if c.cliente_id is not null then return new; end if;
  if not c.automatica then
    if coalesce((select valor from config_app where chave='zap_filtro_auto'),'nao') <> 'sim'
       or not zap_eh_automatica(new.texto) then return new; end if;
    perform zap_nota_sistema(c.id, null,
      'Mensagem automática de outra empresa: a conversa saiu da fila e o robô não responde. '
      || 'Para desfazer, use "Não é automática" no topo da conversa.');
  end if;
  -- a conversa marcada fica fora da fila, sem não lidas e sem alerta
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set automatica = true, status = 'resolvida', nao_lidas = 0, alerta_nivel = 0
   where id = c.id;
  return new;
end $$;
-- depois de zap_toque_ins (que reabre e soma não lidas) e antes de zap_zbot_ins
drop trigger if exists zap_v_filtro_ins on zap_mensagens;
create trigger zap_v_filtro_ins after insert on zap_mensagens
  for each row execute function zap_filtro();

-- ── O menu com as opções das ondas 4 e 5 ──────────────────────────────────
-- A opção 6 só aparece no texto do menu com a agenda ligada; desligada, quem
-- escreve "6" ou "quero agendar" vai para uma pessoa, como antes.
do $$ begin
  if not exists (select 1 from zap_bot_passos where chave='agendar') then
    insert into zap_bot_passos (chave, texto, opcoes, entrega_setor, ordem) values
    ('agendar', E'Vou consultar os horários livres do escritório. Um momento, por favor.', '[]', null, 20),
    ('agendar_nome', E'Para marcar o horário, escreva o seu *nome completo*, por favor.',
     '[{"tecla":"","quando":"^","vai":"agendar"}]', null, 21),
    ('agendar_escolha', E'Responda com o número do horário escolhido, ou *0* para falar com alguém do escritório.',
     '[]', null, 22),
    ('novo_relato', E'O escritório está fora do horário de atendimento, mas já posso adiantar o seu caso.\n\n'
       || E'Conte em poucas palavras o que aconteceu e qual benefício procura. Pode escrever ou mandar um áudio.',
     '[{"tecla":"","quando":"^","vai":"novo_relato_fim"}]', null, 23);
    update zap_bot_passos set espera_min = 30, espera_vai = null where chave = 'agendar_nome';
    update zap_bot_passos set espera_min = 120, espera_vai = null where chave = 'novo_relato';
    insert into zap_bot_passos (chave, texto, opcoes, entrega_setor, ordem) values
    ('novo_relato_fim', E'Obrigado! Anotei o seu relato. Alguém do escritório responde no próximo dia útil.',
     '[]', 'triagem', 24);
    update zap_bot_passos set opcoes = opcoes || '[{"vai":"agendar","tecla":"6","quando":"agendar|agendamento|marcar (um )?horario|marcar atendimento|horario livre"}]'::jsonb
     where chave in ('inicio','lembrete')
       and not opcoes @> '[{"vai":"agendar"}]'::jsonb;
  end if;
end $$;

create or replace function zap_menu_texto(p_chave text) returns text
language sql stable security definer set search_path = public as $$
  select p.texto || case when p.chave in ('inicio','lembrete')
                          and coalesce((select valor from config_app where chave='zap_robo_agenda'),'nao') = 'sim'
                          and coalesce((select valor from config_app where chave='zap_agenda_url'),'') <> ''
                     then E'\n*6* — Agendar um horário no escritório' else '' end
    from zap_bot_passos p where p.chave = p_chave and p.ativo
$$;

-- ── O robô (zap_bot) com as ondas 2, 4 e 5 ────────────────────────────────
create or replace function public.zap_bot() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  c zap_conversas; p zap_bot_passos; ultimo timestamptz; pausa integer;
begin
  if new.direcao <> 'entrada' then return new; end if;
  -- interruptor geral: dia de escritório cheio, ou robô dando problema, a
  -- equipe desliga tudo numa linha sem precisar de programador
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
    then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  -- humano no comando: o bot cala a boca. Nada é pior que robô falando por
  -- cima do advogado. Robô de outra empresa (onda 2) também não recebe menu.
  if c.atendente_id is not null or not c.bot_ativo or c.automatica then return new; end if;

  -- cliente que manda três mensagens seguidas não merece três menus; no meio
  -- de um fluxo (nome, relato, escolha do horário) a resposta é esperada
  pausa := coalesce((select valor from config_app where chave='zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens
   where conversa_id = new.conversa_id and por_bot;
  if ultimo is not null and pausa > 0 and coalesce(c.bot_passo,'') not in ('agendar_nome','agendar_escolha','novo_relato')
     and ultimo > now() - make_interval(secs => pausa) then return new; end if;

  if c.bot_passo is null then                       -- primeiro contato
    if not zap_no_horario() then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      select new.conversa_id, 'saida', true, texto, 'fila'
        from zap_bot_passos where chave='fora_horario' and ativo;
    end if;
    select * into p from zap_bot_passos where chave='inicio' and ativo;
    if not found then return new; end if;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (new.conversa_id, 'saida', true, zap_menu_texto('inicio'), 'fila');
    update zap_conversas set bot_passo='inicio' where id=new.conversa_id;
    return new;
  end if;

  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return new; end if;

  -- áudio ainda sem transcrição num passo de menu (onda 2): o robô espera o
  -- texto do transcrever.py em vez de dizer que não entendeu; sem texto em
  -- 10 minutos, o relógio segue o caminho de antes (zap_triagem_vencidas)
  if new.tipo = 'audio' and trim(coalesce(new.texto,'')) = '' and jsonb_array_length(p.opcoes) > 1
     and coalesce((select valor from config_app where chave='zap_robo_ia'),'nao') = 'sim' then
    update zap_mensagens set bot_ia = 'audio:' || c.bot_passo where id = new.id;
    return new;
  end if;

  perform zap_bot_ler(new.id);
  return new;
end $function$;

-- o miolo do robô: ler a mensagem no passo em que a conversa está e decidir.
-- Separado do gatilho para valer também quando a transcrição do áudio chega.
create or replace function zap_bot_ler(p_msg uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m zap_mensagens; c zap_conversas; p zap_bot_passos; op jsonb; achou text; txt text; n integer;
  v_vagas jsonb;
begin
  select * into m from zap_mensagens where id = p_msg;
  select * into c from zap_conversas where id = m.conversa_id;
  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return; end if;
  -- esperando a agenda responder: o que o cliente escrever agora não é escolha
  if c.bot_passo = 'agendar' or coalesce(c.bot_dados ? 'pedido_em', false) then return; end if;

  txt := lower(translate(coalesce(m.texto,''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));

  -- escolha do horário oferecido (onda 4): o número da vaga, ou 0
  if c.bot_passo = 'agendar_escolha' then
    v_vagas := coalesce(c.bot_dados->'vagas', '[]'::jsonb);
    n := case when trim(txt) ~ '^\*?\d{1,2}\*?[.)]?$' then regexp_replace(txt, '\D', '', 'g')::int end;
    if n = 0 then perform zap_bot_seguir(c.id, 'humano'); return; end if;
    if n between 1 and jsonb_array_length(v_vagas) then
      perform zap_agenda_chamar(c.id, 'marcar', jsonb_build_object('escolha', n));
      return;
    end if;
    perform zap_bot_seguir(c.id, null);
    return;
  end if;

  -- nome completo para o primeiro atendimento (onda 4)
  if c.bot_passo = 'agendar_nome' then
    if array_length(regexp_split_to_array(trim(regexp_replace(coalesce(m.texto,''), '[^[:alpha:] ]', '', 'g')), '\s+'), 1) >= 2
       and length(trim(m.texto)) between 5 and 80 then
      update zap_conversas set bot_dados = coalesce(bot_dados,'{}'::jsonb) || jsonb_build_object('nome', initcap(trim(m.texto)))
       where id = c.id;
      perform zap_agenda_chamar(c.id, 'oferecer', '{}'::jsonb);
    else
      perform zap_bot_seguir(c.id, null);
    end if;
    return;
  end if;

  -- relato do caso novo fora do expediente (onda 5): qualquer resposta vale
  if c.bot_passo = 'novo_relato' then
    if m.tipo = 'audio' and trim(coalesce(m.texto,'')) = '' then
      update zap_mensagens set bot_ia = 'audio:novo_relato' where id = m.id;
      return;
    end if;
    perform zap_nota_sistema(c.id, null, 'Relato do caso novo, colhido pelo robô fora do expediente: '
            || coalesce(nullif(trim(m.texto),''), '[' || m.tipo || ']'));
    update zap_conversas set bot_dados = coalesce(bot_dados,'{}'::jsonb) || jsonb_build_object('relato', left(m.texto, 1000))
     where id = c.id;
    if zap_agenda_ligada() then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      values (c.id, 'saida', true, 'Obrigado! Anotei o seu relato. Se quiser, já posso marcar o seu primeiro atendimento no escritório.', 'fila');
      perform zap_bot_seguir(c.id, 'agendar');
    else
      perform zap_bot_seguir(c.id, 'novo_relato_fim');
    end if;
    return;
  end if;

  for op in select * from jsonb_array_elements(p.opcoes) loop
    if trim(txt) = lower(op->>'tecla')
       or (coalesce(op->>'quando','') <> '' and txt ~ (op->>'quando')) then
      achou := op->>'vai'; exit;
    end if;
  end loop;

  -- texto livre que nenhuma opção reconheceu: a IA lê e escolhe a opção do
  -- menu (F259). A resposta volta por zap_triagem_aplicar; se não voltar em
  -- 60 s, o zap_relogio segue o caminho de antes (zap_triagem_vencidas).
  if achou is null and trim(txt) <> '' and jsonb_array_length(p.opcoes) > 1
     and coalesce((select valor from config_app where chave='zap_robo_ia'),'nao') = 'sim'
     and coalesce((select valor from config_app where chave='zap_triagem_url'),'') <> '' then
    update zap_mensagens set bot_ia = 'pedida:' || c.bot_passo where id = m.id;
    begin
      perform net.http_post(
        url := (select valor from config_app where chave='zap_triagem_url'),
        body := jsonb_build_object('mensagem_id', m.id),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        timeout_milliseconds := 20000);
    exception when others then null;   -- sem pg_net, a espera de 60 s resolve
    end;
    return;
  end if;

  perform zap_bot_seguir(c.id, achou);
end $$;

-- a transcrição do áudio chegou (transcrever.py grava em texto): o robô lê
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
  perform zap_bot_ler(new.id);
  return new;
end $$;
drop trigger if exists zap_audio_transcrito on zap_mensagens;
create trigger zap_audio_transcrito after update of texto on zap_mensagens
  for each row when (new.bot_ia like 'audio:%') execute function zap_audio_transcrito();

-- a continuação do robô, com a agenda (onda 4) e o relato noturno (onda 5)
create or replace function public.zap_bot_seguir(p_conversa uuid, p_vai text) returns void
language plpgsql security definer set search_path to 'public' as $function$
declare c zap_conversas; p zap_bot_passos; achou text := p_vai; txt text;
begin
  select * into c from zap_conversas where id = p_conversa;
  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return; end if;

  if achou is null then
    -- ninguém fica preso no menu: na segunda vez sem entender, vai para gente
    update zap_conversas set bot_erros = bot_erros + 1 where id=p_conversa;
    if c.bot_erros + 1 >= 2 then achou := 'nao_entendi';
    else
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      values (p_conversa, 'saida', true,
              case when c.bot_passo in ('agendar_nome','agendar_escolha') then 'Não entendi 🤔' || E'\n\n' || p.texto
                   else 'Não entendi 🤔 — responda com o número da opção, por favor.' || E'\n\n'
                        || coalesce(zap_menu_texto(c.bot_passo), p.texto) end,
              'fila');
      return;
    end if;
  end if;

  -- quem pergunta do processo recebe a etapa pública na hora (a mesma do
  -- portal) e só passa a uma pessoa se quiser; sem etapa, segue para a equipe
  if achou = 'processo' and c.bot_passo <> 'situacao'
     and coalesce((select valor from config_app where chave='zap_robo_novo'),'nao') = 'sim' then
    txt := zap_situacao(p_conversa);
    if txt is not null and exists (select 1 from zap_bot_passos where chave='situacao' and ativo) then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      values (p_conversa, 'saida', true, txt, 'fila');
      update zap_conversas set bot_passo='situacao', bot_erros=0 where id=p_conversa;
      return;
    end if;
  end if;

  -- caso novo fora do expediente (onda 5): o robô colhe o relato antes
  if achou = 'novo' and not zap_no_horario()
     and coalesce((select valor from config_app where chave='zap_robo_noturno'),'nao') = 'sim'
     and exists (select 1 from zap_bot_passos where chave='novo_relato' and ativo) then
    achou := 'novo_relato';
  end if;

  -- agenda (onda 4): desligada, quem pede horário vai para uma pessoa
  if achou = 'agendar' then
    if not zap_agenda_ligada() then achou := 'humano';
    elsif zap_cliente_do_numero(p_conversa) is null and coalesce(c.bot_dados->>'nome','') = '' then
      achou := 'agendar_nome';
    else
      perform zap_agenda_chamar(p_conversa, 'oferecer', '{}'::jsonb);
      return;
    end if;
  end if;

  select * into p from zap_bot_passos where chave=achou and ativo;
  if not found then return; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true, coalesce(zap_menu_texto(achou), p.texto), 'fila');
  update zap_conversas set bot_passo=achou, bot_erros=0 where id=p_conversa;
  if p.entrega_setor is not null then
    perform zap_entregar(p_conversa, p.entrega_setor, p.chave);
  end if;
end $function$;

-- o áudio sem transcrição em 10 minutos segue como texto não entendido
create or replace function public.zap_triagem_vencidas() returns integer
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
      if r.passo = 'novo_relato' then
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

-- o lembrete do menu (F258) também mostra a opção 6 quando a agenda está ligada
CREATE OR REPLACE FUNCTION public.zap_bot_esperas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; q zap_bot_passos; n integer := 0;
begin
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
     or coalesce((select valor from config_app where chave='zap_robo_novo'),'nao') <> 'sim' then return 0; end if;
  for r in select c.id, p.espera_vai from zap_conversas c join zap_bot_passos p on p.chave = c.bot_passo
            where c.bot_ativo and c.atendente_id is null and c.status <> 'resolvida'
              and p.espera_min is not null and c.bot_desde < now() - make_interval(mins => p.espera_min)
              and not exists (select 1 from zap_mensagens m where m.conversa_id = c.id
                                and m.direcao = 'entrada' and m.criado_em > c.bot_desde) loop
    if r.espera_vai is null then
      update zap_conversas set bot_passo = null, bot_erros = 0 where id = r.id;
      continue;
    end if;
    -- lembrete de madrugada é pior do que lembrete nenhum: espera o expediente
    if not zap_no_horario() then continue; end if;
    select * into q from zap_bot_passos where chave = r.espera_vai and ativo;
    if not found then
      update zap_conversas set bot_passo = null, bot_erros = 0 where id = r.id;
      continue;
    end if;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (r.id, 'saida', true, coalesce(zap_menu_texto(q.chave), q.texto), 'fila');
    update zap_conversas set bot_passo = q.chave, bot_erros = 0, bot_desde = now() where id = r.id;
    if q.entrega_setor is not null then perform zap_entregar(r.id, q.entrega_setor, q.chave); end if;
    n := n + 1;
  end loop;
  return n;
end $function$;

-- ── Onda 4 · a agenda pelo robô ───────────────────────────────────────────
create or replace function zap_agenda_ligada() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select valor from config_app where chave='zap_robo_agenda'),'nao') = 'sim'
     and coalesce((select valor from config_app where chave='zap_agenda_url'),'') <> ''
$$;

-- o cliente da ficha só quando quem escreve é o telefone principal dela (a
-- mesma regra da situação do processo); a filha que escreve é primeiro atendimento
create or replace function zap_cliente_do_numero(p_conversa uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select k.id from zap_conversas c join clientes k on k.id = c.cliente_id
   where c.id = p_conversa and fone_ddd8(c.telefone) is not null and fone_ddd8(c.telefone) = fone_ddd8(k.telefone)
$$;

-- pede à Edge Function zap_agenda; o pedido de uso único vai em bot_dados
create or replace function zap_agenda_chamar(p_conversa uuid, p_acao text, p_extra jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_pedido text := gen_random_uuid()::text;
begin
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas
     set bot_passo = case when p_acao = 'oferecer' then 'agendar' else bot_passo end, bot_erros = 0,
         bot_dados = coalesce(bot_dados,'{}'::jsonb) || p_extra
                     || jsonb_build_object('pedido', v_pedido, 'pedido_em', now(), 'acao', p_acao)
   where id = p_conversa;
  if p_acao = 'oferecer' then
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select p_conversa, 'saida', true, texto, 'fila' from zap_bot_passos where chave = 'agendar' and ativo;
  end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave='zap_agenda_url'),
      body := jsonb_build_object('conversa_id', p_conversa, 'pedido', v_pedido),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 30000);
  exception when others then null;    -- o relógio dá a conversa a uma pessoa em 2 minutos
  end;
end $$;

-- a Edge Function lê o pedido UMA vez: devolve o que ela precisa e apaga o
-- pedido; pedido_em fica até a resposta, para o relógio socorrer a conversa
create or replace function zap_agenda_pegar(p_conversa uuid, p_pedido text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_cli uuid; v_nome text; v_out jsonb;
begin
  select * into c from zap_conversas where id = p_conversa for update;
  if not found or c.bot_dados->>'pedido' is distinct from p_pedido
     or (c.bot_dados->>'pedido_em')::timestamptz < now() - interval '2 minutes' then return null; end if;
  v_cli := zap_cliente_do_numero(p_conversa);
  if v_cli is not null then select nome into v_nome from clientes where id = v_cli; end if;
  v_out := jsonb_build_object('acao', c.bot_dados->>'acao', 'telefone', c.telefone,
             'cliente_id', v_cli, 'nome', coalesce(v_nome, c.bot_dados->>'nome'),
             'relato', c.bot_dados->>'relato', 'vagas', c.bot_dados->'vagas', 'tipo', c.bot_dados->>'tipo',
             'escolha', c.bot_dados->'escolha',
             'profissionais', (select valor from config_app where chave='zap_agenda_profs'));
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set bot_dados = bot_dados - 'pedido' where id = p_conversa;
  return v_out;
end $$;

-- as vagas achadas viram a mensagem numerada; sem vaga, a conversa vai para gente
create or replace function zap_agenda_oferecer(p_conversa uuid, p_tipo text, p_vagas jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_txt text := ''; v jsonb; i integer := 0; c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  -- resposta atrasada (o relógio já entregou a conversa) não volta a oferecer
  if not found or c.atendente_id is not null or not coalesce(c.bot_dados ? 'pedido_em', false) then return; end if;
  if jsonb_array_length(coalesce(p_vagas,'[]'::jsonb)) = 0 then
    perform zap_agenda_falhou(p_conversa, null, 'nenhuma vaga livre na agenda');
    return;
  end if;
  for v in select * from jsonb_array_elements(p_vagas) loop
    i := i + 1;
    v_txt := v_txt || E'\n*' || i || '* — ' || (v->>'rotulo');
  end loop;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set bot_passo = 'agendar_escolha', bot_erros = 0,
         bot_dados = (coalesce(bot_dados,'{}'::jsonb) - 'pedido_em' - 'acao')
                     || jsonb_build_object('vagas', p_vagas, 'tipo', p_tipo)
   where id = p_conversa;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true, 'Estes são os próximos horários livres:' || v_txt || E'\n*0* — nenhum destes, falar com alguém'
          || E'\n\nResponda com o número do horário.', 'fila');
end $$;

-- marcado: confirma ao cliente com as orientações e deixa a nota à equipe
create or replace function zap_agenda_marcado(p_conversa uuid, p_rotulo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true,
    'Pronto! ✅ Seu atendimento está marcado para ' || p_rotulo || '.' || E'\n\n'
    || 'Traga um documento com foto e a senha do Meu INSS (gov.br) atualizada. O atendimento é individual: '
    || 'se outra pessoa da família também precisa, peça um horário para ela.' || E'\n\n'
    || 'Se precisar remarcar, é só escrever aqui.', 'fila');
  perform zap_nota_sistema(p_conversa, null, '📅 O robô marcou na agenda: ' || p_rotulo);
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set bot_passo = null, bot_erros = 0,
         bot_dados = bot_dados - 'vagas' - 'escolha' - 'pedido' - 'pedido_em' - 'acao'
   where id = p_conversa;
end $$;

-- qualquer falha da agenda: o cliente é avisado e a conversa vai para gente
create or replace function zap_agenda_falhou(p_conversa uuid, p_pedido text, p_motivo text) returns void
language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  -- só age com um pedido em curso: a resposta atrasada não entrega duas vezes
  if not found or c.atendente_id is not null or not coalesce(c.bot_dados ? 'pedido_em', false) then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set bot_dados = bot_dados - 'pedido' - 'pedido_em' - 'acao' where id = p_conversa;
  perform zap_nota_sistema(p_conversa, null, 'Robô: não consegui marcar pela agenda (' || coalesce(p_motivo,'erro') || ').');
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true, 'Não consegui ver os horários agora. Já chamei alguém do escritório para marcar com você.', 'fila');
  update zap_conversas set bot_passo = 'humano' where id = p_conversa;
  perform zap_entregar(p_conversa, 'triagem', 'marcar horário na agenda');
end $$;

-- as portas da Edge Function só abrem para service_role
revoke all on function zap_agenda_pegar(uuid, text) from public, anon, authenticated;
revoke all on function zap_agenda_oferecer(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function zap_agenda_marcado(uuid, text) from public, anon, authenticated;
revoke all on function zap_agenda_falhou(uuid, text, text) from public, anon, authenticated;
revoke all on function zap_agenda_chamar(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function zap_bot_ler(uuid) from public, anon, authenticated;
grant execute on function zap_agenda_pegar(uuid, text), zap_agenda_oferecer(uuid, text, jsonb),
  zap_agenda_marcado(uuid, text), zap_agenda_falhou(uuid, text, text) to service_role;
