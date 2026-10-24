-- ══ O robô que responde, espera e pode ser conduzido (F258) ═══════════════
-- Três coisas do Kapso trazidas para a nossa ponte, sem a API oficial:
-- 1. quem pergunta do processo recebe a etapa pública na hora, a mesma do
--    portal (catálogo, fase atual e não desatualizada), e só se o número que
--    escreve é o telefone principal da ficha, com DDD: o da filha, o vinculado
--    à mão e o desconhecido seguem para a equipe, como antes;
-- 2. cada passo pode esperar: sem resposta em espera_min minutos, o robô vai
--    a espera_vai (um lembrete, uma pessoa) ou, sem destino, volta ao começo
--    calado, para a próxima mensagem receber o menu;
-- 3. a equipe vê em que passo a conversa está e leva o robô a outro passo
--    (zap_bot_ir), inclusive devolvendo ao robô a conversa que alguém assumiu.
alter table zap_bot_passos add column if not exists espera_min integer
  check (espera_min is null or espera_min > 0);
alter table zap_bot_passos add column if not exists espera_vai text;
alter table zap_conversas add column if not exists bot_desde timestamptz;
-- nasce desligado: o Paulo liga pelo CRM (Configurações › WhatsApp) quando quiser
insert into config_app (chave, valor) values ('zap_robo_novo','nao') on conflict (chave) do nothing;

create or replace function zap_bot_desde() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.bot_passo is distinct from old.bot_passo then
    new.bot_desde := case when new.bot_passo is null then null else now() end;
  end if;
  return new;
end $$;
drop trigger if exists zap_bot_desde on zap_conversas;
create trigger zap_bot_desde before insert or update on zap_conversas
  for each row execute function zap_bot_desde();

do $$ begin
  if not exists (select 1 from zap_bot_passos where chave='situacao') then
    insert into zap_bot_passos (chave, texto, opcoes, entrega_setor, ordem, espera_min) values
    ('situacao',
     E'Se quiser falar com alguém do escritório, é só responder aqui que eu chamo quem cuida do seu processo.',
     -- qualquer resposta, até foto ou áudio, vai para quem cuida do processo
     '[{"tecla":"","quando":"^","vai":"processo"}]'::jsonb, null, 10, 1440);
  end if;
  if not exists (select 1 from zap_bot_passos where chave='lembrete') then
    insert into zap_bot_passos (chave, texto, opcoes, entrega_setor, ordem, espera_min)
    select 'lembrete',
           E'Olá! Ainda podemos ajudar? Responda com o número de uma das opções acima, ou *0* para falar com alguém do escritório.',
           opcoes, null, 11, 1440
      from zap_bot_passos where chave='inicio';
    update zap_bot_passos set espera_min=120, espera_vai='lembrete' where chave='inicio';
  end if;
end $$;

-- DDD + 8 últimos dígitos: o WhatsApp de conta antiga não tem o nono dígito,
-- e só os 8 últimos (fone_chave) confundem números de DDDs diferentes
create or replace function fone_ddd8(p text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p,''), '\D', '', 'g');
begin
  if length(d) >= 12 and left(d, 2) = '55' then d := substr(d, 3); end if;
  d := ltrim(d, '0');
  if length(d) < 10 then return null; end if;
  return left(d, 2) || right(d, 8);
end $$;

-- espelho do ETAPAS_POR_FASE do portal_common.py e do app.html (o teste
-- tests/test_etapa_portal.py confere que são iguais)
create or replace function zap_etapas_publicas() returns table (fase text, etapa text)
language sql immutable as $$
  values
  -- etapas:inicio
  ('escritorio','em atendimento'), ('escritorio','reunindo documentos'),
  ('escritorio','análise de direito'), ('escritorio','aguardando o cliente'),
  ('inss','requerimento protocolado'), ('inss','aguardando perícia'), ('inss','perícia realizada'),
  ('inss','em exigência'), ('inss','aguardando análise'), ('inss','decidido'),
  ('conselho','recurso protocolado'), ('conselho','aguardando distribuição'), ('conselho','em diligência'),
  ('conselho','em pauta'), ('conselho','julgado'),
  ('judicial','ação distribuída'), ('judicial','aguardando citação'), ('judicial','contestação apresentada'),
  ('judicial','perícia designada'), ('judicial','perícia realizada'), ('judicial','aguardando sentença'),
  ('judicial','sentença publicada'), ('judicial','em recurso'),
  ('peticao_inicial','a redigir'), ('peticao_inicial','redigida'), ('peticao_inicial','a protocolar'),
  ('pagamento','aguardando implantação'), ('pagamento','benefício implantado'), ('pagamento','aguardando RPV'),
  ('pagamento','RPV expedida'), ('pagamento','recebido'),
  ('aposentadoria_futura','monitorando'), ('aposentadoria_futura','documentação em dia'),
  ('aposentadoria_futura','pronto para protocolar')
  -- etapas:fim
$$;

-- a etapa que pode sair para o cliente: a mesma regra do etapa_publicavel()
-- do portal_common.py (fase atual, no Judicial também a da execução, e não a
-- marcada como desatualizada em casos.trilha.velha)
create or replace function zap_etapa_publica(k casos) returns text
language plpgsql stable set search_path = public as $$
declare v_fase text := k.fase; v_de text; v_etapa text := trim(coalesce(k.etapa, ''));
begin
  if v_fase = 'outro' then
    v_de := coalesce(k.ronda->>'prazo_de', k.origem_lista, '');
    v_fase := case when v_de like '%INSS%' then 'inss' when v_de like '%Conselho%' then 'conselho'
                   when v_de like '%Judicial%' then 'judicial' when v_de like '%Peti%' then 'peticao_inicial'
                   when v_de like '%Escrit%' then 'escritorio' end;
  end if;
  if v_etapa = '' or not exists (select 1 from zap_etapas_publicas() e
       where e.etapa = v_etapa and (e.fase = v_fase or (v_fase = 'judicial' and e.fase = 'pagamento'))) then
    return null;
  end if;
  if jsonb_typeof(k.trilha->'velha') = 'object' and k.trilha->'velha'->>'etapa' = v_etapa then return null; end if;
  return v_etapa;
end $$;

-- o texto da situação, ou null quando não há o que dizer com segurança
create or replace function zap_situacao(p_conversa uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare c zap_conversas; v_tel text; v_linhas text := ''; v_n integer := 0; k casos; e text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found or c.cliente_id is null then return null; end if;
  select telefone into v_tel from clientes where id = c.cliente_id;
  if fone_ddd8(c.telefone) is null or fone_ddd8(c.telefone) is distinct from fone_ddd8(v_tel) then
    return null;
  end if;
  for k in select * from casos
            where cliente_id = c.cliente_id and fase <> 'encerrado' and not coalesce(pre_caso, false)
            order by criado_em loop
    e := zap_etapa_publica(k);
    if e is null then continue; end if;
    v_n := v_n + 1;
    exit when v_n > 3;
    v_linhas := v_linhas || E'\n• ' || coalesce(nullif(trim(k.beneficio), ''), k.titulo) || ': *' || e || '*';
  end loop;
  if v_linhas = '' then return null; end if;
  return 'A situação atual ' || case when v_n > 1 then 'dos seus processos' else 'do seu processo' end
         || ' no escritório:' || v_linhas || E'\n\n'
         || (select texto from zap_bot_passos where chave = 'situacao');
end $$;

-- a espera de cada passo; roda no zap_relogio (a ponte chama a cada 30 s)
create or replace function zap_bot_esperas() returns integer
language plpgsql security definer set search_path = public as $$
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
    values (r.id, 'saida', true, q.texto, 'fila');
    update zap_conversas set bot_passo = q.chave, bot_erros = 0, bot_desde = now() where id = r.id;
    if q.entrega_setor is not null then perform zap_entregar(r.id, q.entrega_setor, q.chave); end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- levar o robô a um passo: manda o texto do passo, devolve a conversa ao robô
-- e deixa a nota de quem fez. Mesma permissão de transferir.
create or replace function zap_bot_ir(p_conversa uuid, p_passo text) returns void
language plpgsql security definer set search_path = public as $$
declare v_eu uuid := eu_colab(); v_dono uuid; q zap_bot_passos;
begin
  select atendente_id into v_dono from zap_conversas where id = p_conversa;
  if not found then raise exception 'conversa inexistente'; end if;
  if v_eu is not null and not zap_gestor() and v_dono is not null and v_dono <> v_eu then
    raise exception 'Só quem atende a conversa (ou o gestor) pode devolver ao robô.';
  end if;
  select * into q from zap_bot_passos where chave = p_passo and ativo;
  if not found then raise exception 'passo do robô inexistente ou desligado: %', p_passo; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas
     set atendente_id = null, bot_ativo = true, bot_passo = q.chave, bot_erros = 0, bot_desde = now(),
         status = case when status = 'resolvida' then 'aberta' else status end
   where id = p_conversa;
  perform zap_nota_sistema(p_conversa, v_eu, '↺ ' || zap_nome_colab(v_eu) || ' levou o robô ao passo "' || q.chave || '"');
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true, q.texto, 'fila');
  if q.entrega_setor is not null then perform zap_entregar(p_conversa, q.entrega_setor, q.chave); end if;
end $$;


create or replace function zap_bot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c zap_conversas; p zap_bot_passos; op jsonb; achou text; txt text; ultimo timestamptz;
  pausa integer;
begin
  if new.direcao <> 'entrada' then return new; end if;
  -- interruptor geral: dia de escritório cheio, ou robô dando problema, a
  -- equipe desliga tudo numa linha sem precisar de programador
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
    then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  -- humano no comando: o bot cala a boca. Nada é pior que robô falando por
  -- cima do advogado.
  if c.atendente_id is not null or not c.bot_ativo then return new; end if;

  -- cliente que manda três mensagens seguidas não merece três menus
  pausa := coalesce((select valor from config_app where chave='zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens
   where conversa_id = new.conversa_id and por_bot;
  if ultimo is not null and pausa > 0
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
    values (new.conversa_id, 'saida', true, p.texto, 'fila');
    update zap_conversas set bot_passo='inicio' where id=new.conversa_id;
    return new;
  end if;

  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return new; end if;

  txt := lower(translate(coalesce(new.texto,''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));
  for op in select * from jsonb_array_elements(p.opcoes) loop
    if trim(txt) = lower(op->>'tecla')
       or (coalesce(op->>'quando','') <> '' and txt ~ (op->>'quando')) then
      achou := op->>'vai'; exit;
    end if;
  end loop;

  if achou is null then
    -- ninguém fica preso no menu: na segunda vez sem entender, vai para gente
    update zap_conversas set bot_erros = bot_erros + 1 where id=new.conversa_id;
    if c.bot_erros + 1 >= 2 then achou := 'nao_entendi';
    else
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      values (new.conversa_id, 'saida', true,
              'Não entendi 🤔 — responda com o número da opção, por favor.' || E'\n\n' || p.texto,
              'fila');
      return new;
    end if;
  end if;

  -- quem pergunta do processo recebe a etapa pública na hora (a mesma do
  -- portal) e só passa a uma pessoa se quiser; sem etapa, segue para a equipe
  if achou = 'processo' and c.bot_passo <> 'situacao'
     and coalesce((select valor from config_app where chave='zap_robo_novo'),'nao') = 'sim' then
    txt := zap_situacao(new.conversa_id);
    if txt is not null and exists (select 1 from zap_bot_passos where chave='situacao' and ativo) then
      insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
      values (new.conversa_id, 'saida', true, txt, 'fila');
      update zap_conversas set bot_passo='situacao', bot_erros=0 where id=new.conversa_id;
      return new;
    end if;
  end if;

  select * into p from zap_bot_passos where chave=achou and ativo;
  if not found then return new; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (new.conversa_id, 'saida', true, p.texto, 'fila');
  update zap_conversas set bot_passo=achou, bot_erros=0 where id=new.conversa_id;
  if p.entrega_setor is not null then
    perform zap_entregar(new.conversa_id, p.entrega_setor, p.chave);
  end if;
  return new;
end $$;

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
  return n;
end $$;
-- O que o robô faz depois de saber a opção (achou), ou de não saber (null):
-- chamado pelo zap_bot e pela triagem por IA (F259), que decide depois.
create or replace function zap_bot_seguir(p_conversa uuid, p_vai text) returns void
language plpgsql security definer set search_path = public as $$
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
              'Não entendi 🤔 — responda com o número da opção, por favor.' || E'\n\n' || p.texto,
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

  select * into p from zap_bot_passos where chave=achou and ativo;
  if not found then return; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (p_conversa, 'saida', true, p.texto, 'fila');
  update zap_conversas set bot_passo=achou, bot_erros=0 where id=p_conversa;
  if p.entrega_setor is not null then
    perform zap_entregar(p_conversa, p.entrega_setor, p.chave);
  end if;
end $$;

revoke execute on function zap_bot_seguir(uuid, text) from public, anon, authenticated;

create or replace function zap_bot() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c zap_conversas; p zap_bot_passos; op jsonb; achou text; txt text; ultimo timestamptz;
  pausa integer;
begin
  if new.direcao <> 'entrada' then return new; end if;
  -- interruptor geral: dia de escritório cheio, ou robô dando problema, a
  -- equipe desliga tudo numa linha sem precisar de programador
  if coalesce((select valor from config_app where chave='zap_bot_ligado'),'sim') <> 'sim'
    then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  -- humano no comando: o bot cala a boca. Nada é pior que robô falando por
  -- cima do advogado.
  if c.atendente_id is not null or not c.bot_ativo then return new; end if;

  -- cliente que manda três mensagens seguidas não merece três menus
  pausa := coalesce((select valor from config_app where chave='zap_pausa_bot'), '15')::int;
  select max(criado_em) into ultimo from zap_mensagens
   where conversa_id = new.conversa_id and por_bot;
  if ultimo is not null and pausa > 0
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
    values (new.conversa_id, 'saida', true, p.texto, 'fila');
    update zap_conversas set bot_passo='inicio' where id=new.conversa_id;
    return new;
  end if;

  select * into p from zap_bot_passos where chave=c.bot_passo and ativo;
  if not found then return new; end if;

  txt := lower(translate(coalesce(new.texto,''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'));
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
    update zap_mensagens set bot_ia = 'pedida:' || c.bot_passo where id = new.id;
    begin
      perform net.http_post(
        url := (select valor from config_app where chave='zap_triagem_url'),
        body := jsonb_build_object('mensagem_id', new.id),
        headers := '{"Content-Type":"application/json"}'::jsonb,
        timeout_milliseconds := 20000);
    exception when others then null;   -- sem pg_net, a espera de 60 s resolve
    end;
    return new;
  end if;

  perform zap_bot_seguir(new.conversa_id, achou);
  return new;
end $$;

-- ══ A triagem do texto livre por IA (F259, o nó "decide" do Kapso) ════════
-- O menu reconhece o número e as palavras de cada opção (quando). O que sobra,
-- como "minha aposentadoria saiu?", ia para "não entendi". Com zap_robo_ia
-- ligado, o zap_bot marca a mensagem (bot_ia = 'pedida:<passo>') e chama a
-- Edge Function zap_triagem, que pede ao Claude só a ESCOLHA de uma opção do
-- menu (nunca uma resposta ao cliente) e devolve por zap_triagem_aplicar.
-- Sem resposta em 60 s (função fora do ar, sem chave), o relógio segue o
-- caminho de antes. Nasce desligado.
alter table zap_mensagens add column if not exists bot_ia text;
insert into config_app (chave, valor) values ('zap_robo_ia','nao') on conflict (chave) do nothing;
insert into config_app (chave, valor)
values ('zap_triagem_url','https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_triagem')
on conflict (chave) do nothing;

-- a função pega a mensagem uma vez só (a chamada repetida não gasta IA)
create or replace function zap_triagem_pegar(p_msg uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; p zap_bot_passos;
begin
  update zap_mensagens set bot_ia = 'lendo:' || substr(bot_ia, 8)
   where id = p_msg and bot_ia like 'pedida:%' and criado_em > now() - interval '5 minutes'
  returning * into m;
  if not found then return null; end if;
  select * into p from zap_bot_passos where chave = substr(m.bot_ia, 7);
  if not found then return null; end if;
  return jsonb_build_object('texto', m.texto, 'passo', p.chave, 'menu', p.texto, 'opcoes', p.opcoes);
end $$;

create or replace function zap_triagem_aplicar(p_msg uuid, p_vai text) returns void
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_passo text; v_vai text;
begin
  select * into m from zap_mensagens where id = p_msg and (bot_ia like 'pedida:%' or bot_ia like 'lendo:%')
    for update;
  if not found then return; end if;
  v_passo := split_part(m.bot_ia, ':', 2);
  -- só vale opção que o passo tem: a IA não inventa destino
  select o->>'vai' into v_vai from zap_bot_passos p, jsonb_array_elements(p.opcoes) o
   where p.chave = v_passo and o->>'vai' = p_vai limit 1;
  update zap_mensagens set bot_ia = 'ia:' || coalesce(v_vai, 'nenhuma') where id = p_msg;
  select * into c from zap_conversas where id = m.conversa_id;
  -- a conversa andou enquanto a IA lia (gente assumiu, outra mensagem veio): não mexe
  if not c.bot_ativo or c.atendente_id is not null or c.bot_passo is distinct from v_passo
     or exists (select 1 from zap_mensagens x where x.conversa_id = m.conversa_id
                  and x.direcao = 'entrada' and x.seq > m.seq) then
    return;
  end if;
  if v_vai is not null then
    perform zap_nota_sistema(m.conversa_id, null, 'Robô: a IA leu "' || left(coalesce(m.texto, ''), 80)
            || '" como a opção "' || v_vai || '"');
  end if;
  perform zap_bot_seguir(m.conversa_id, v_vai);
end $$;

create or replace function zap_triagem_vencidas() returns integer
language plpgsql security definer set search_path = public as $$
declare r record; n integer := 0;
begin
  for r in select id from zap_mensagens
            where (bot_ia like 'pedida:%' or bot_ia like 'lendo:%') and criado_em < now() - interval '60 seconds'
            order by criado_em loop
    perform zap_triagem_aplicar(r.id, null);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function zap_triagem_pegar(uuid) from public, anon, authenticated;
revoke execute on function zap_triagem_aplicar(uuid, text) from public, anon, authenticated;
revoke execute on function zap_triagem_vencidas() from public, anon, authenticated;
grant execute on function zap_triagem_pegar(uuid) to service_role;
grant execute on function zap_triagem_aplicar(uuid, text) to service_role;

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
  return n;
end $$;
