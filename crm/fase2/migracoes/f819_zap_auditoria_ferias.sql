-- F819 · auditoria do WhatsApp de 21 a 25.11.2026 (titular em férias, substituta cobrindo; aprovado pelo Paulo em 25.11.2026)
-- 1. Agradecimento: "grat*", "agradeço", "tudo bem", "ótimo" e afins também contam ("Ok gratidão Bom dia").
--    Vale para o aviso de férias, a ausência do Offline comum (a do Dr. Marcos respondia a "Ok" e "Obrigada") e o amparo.
-- 2. Aviso de férias/Offline: não sai em conversa em que a equipe (o titular inclusive) escreveu desde o início das férias,
--    nem logo depois de a IA agendar, nem em agradecimento; nunca leva o nome no cabeçalho.
-- 3. Conta automática (banco, pedágio, loja, robô): sem ficha de cliente e com texto de robô, ou que responde duas vezes
--    em até 5 s a uma mensagem automática nossa (pessoa não lê e escreve 30 letras em 5 s), fica marcada automatica: sem aviso,
--    amparo nem IA. Sair da fila continua na caixa zap_filtro_auto; "Não é automática" desfaz.
-- 4. Amparo: no máximo uma vez por conversa por dia.
-- 5. Encaminhamento da IA ao advogado em férias vai à substituta (zap_cobre_id).

create or replace function public.zap_conf_agradece(p_tipo text, p_texto text)
returns boolean language plpgsql immutable as $$
declare t text;
begin
  if p_tipo = 'figurinha' then return true; end if;
  if p_tipo <> 'texto' then return false; end if;
  t := lower(trim(coalesce(p_texto, '')));
  if t = '' or length(t) > 40 or t like '%?%' then return false; end if;
  -- só emoji e pontuação
  if regexp_replace(t, '[[:alnum:]]', '', 'g') = t then return true; end if;
  t := trim(regexp_replace(t, '[^[:alnum:][:space:]áàâãéêíóôõúç]', ' ', 'g'));
  -- toda palavra precisa ser de agradecimento ou concordância: "ok, mas quero remarcar" segue para quem responde
  return not exists (select 1 from regexp_split_to_table(t, '\s+') w
    where w <> '' and w !~ '^(grat|agradec|obrigad|brigad)' and w not in ('ok','okay','obg','muito','valeu','vlw','beleza','blz',
      'combinado','certo','ta','tá','bom','está','esta','até','ate','lá','la','show','perfeito','isso','sim','amém','amem',
      'deus','abençoe','abencoe','graças','gracas','a','o','e','confirmado','entendi','entendido','doutor','doutora','dr','dra',
      'então','entao','tchau','dia','tarde','noite','boa','vou','estarei','eu','tudo','bem','ótimo','otimo','legal','joia','jóia',
      'tranquilo','abraço','abraços','abraco','abracos','agradeço','agradeco','de','nada','pela','pelo','atenção','atencao'));
end $$;

-- F819 · despedida: agradecimento ou "ok" que encerra; o cumprimento sozinho ("Bom dia", "boa tarde, doutora") abre conversa
create or replace function public.zap_despedida(p_tipo text, p_texto text)
returns boolean language sql immutable as $$
  select zap_conf_agradece(p_tipo, p_texto) and (p_tipo <> 'texto' or exists (
    select 1 from regexp_split_to_table(trim(regexp_replace(lower(coalesce(p_texto, '')), '[^[:alnum:][:space:]áàâãéêíóôõúç]', ' ', 'g')), '\s+') w
     where w not in ('', 'bom', 'boa', 'dia', 'tarde', 'noite', 'doutor', 'doutora', 'dr', 'dra', 'a', 'o', 'e'))
    or regexp_replace(lower(coalesce(p_texto, '')), '[[:alnum:]]', '', 'g') = lower(coalesce(p_texto, '')))
$$;

create or replace function public.zap_offline_gatilho()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text; v_agenda boolean; v_golpe boolean; v_com_ia boolean;
  v_sub record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, z.sem_ia, z.plantao, z.cobertura, z.sem_cobertura, z.cliente_id,
         k.id as kid, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap, k.zap_cobre_id, k.zap_ferias_ate
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  -- F577: a equipe escreveu depois do Offline ou na última hora: a conversa está em curso
  -- F679 · nas férias a mensagem do titular não interrompe o repasse
  if c.zap_ferias_ate is null and zap_equipe_escreveu(c.id, now() - make_interval(mins => coalesce(nullif((select valor from config_app where chave = 'zap_offline_min'), '')::int, 15))) is not null then
    return new;
  end if;
  -- F819 · nas férias, conversa em que alguém da equipe (o titular inclusive) escreveu desde o início das férias ou nas
  -- últimas 12 horas segue com quem escreveu. A F688 excluía o titular e só olhava 12 horas, e o aviso saiu 18 minutos
  -- depois de o titular escrever e numa conversa que a substituta atendia havia mais tempo.
  if c.zap_ferias_ate is not null
     and zap_equipe_escreveu(c.id, least(c.zap_offline_desde, now() - interval '12 hours')) is not null then
    return new;
  end if;
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
       or c.zap_cobre_id is null or coalesce(c.sem_cobertura, false) or zap_despedida(new.tipo, new.texto)
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
    if c.zap_ferias_ate is not null then return new; end if;  -- F679 · nas férias o aviso de férias já foi enviado
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    values (c.id, 'saida', true, 'Encaminhei a sua mensagem à equipe jurídica, que responderá em breve.', 'fila');
    return new;
  end if;
  -- F679 · conversa marcada "sem cobertura" (pessoa que não é cliente) fica fora das férias: sem aviso e sem repasse
  if c.zap_ferias_ate is not null and coalesce(c.sem_cobertura, false) then return new; end if;
  -- F683/F819 · o simples agradecimento ("ok", "obrigada", 👍) não recebe o aviso, nas férias e no Offline comum
  if zap_despedida(new.tipo, new.texto) then return new; end if;
  -- F819 · a IA acabou de agendar nesta conversa: o aviso não sai logo depois
  -- (a marca plantao.agendado_em some com o modo; a mensagem do agendamento, não)
  if exists (select 1 from zap_mensagens m where m.conversa_id = c.id and m.direcao = 'saida' and m.por_bot
               and m.texto like '%está agendado para %' and m.criado_em > now() - interval '12 hours') then return new; end if;
  v_txt := coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome));
  -- F679 · {fim} vira a data de retorno
  if c.zap_ferias_ate is not null then
    v_txt := replace(v_txt, '{fim}', to_char(c.zap_ferias_ate at time zone 'America/Sao_Paulo', 'DD/MM'));
  end if;
  -- F819 · aviso sem o nome no cabeçalho, também no Offline comum e quando o próprio texto salvo o trazia
  v_txt := regexp_replace(v_txt, '^\s*\*[^*\n]{1,60}:\*\s*', '');
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, v_txt, 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  -- F679 · nas férias a cobertura abre já na primeira mensagem, sem o recado de encaminhamento
  if c.zap_ferias_ate is not null and coalesce((select valor from config_app where chave = 'zap_cobertura'), 'nao') = 'sim'
     and c.zap_cobre_id is not null and not coalesce(c.sem_cobertura, false) and not zap_despedida(new.tipo, new.texto) then
    select id, nome into v_sub from colaboradores
     where id = c.zap_cobre_id and ativo and zap_offline_desde is null;
    if v_sub.id is not null then
      update zap_conversas set cobertura = jsonb_build_object('titular', c.kid, 'cobre', v_sub.id, 'desde', now())
       where id = c.id;
      insert into mencoes (de_id, para_id, conversa_id, cliente_id, texto)
      values (c.kid, v_sub.id, c.id, c.cliente_id,
              'Cobertura do WhatsApp: ' || c.nome || ' está em férias. Responda sem assumir.');
    end if;
  end if;
  return new;
end $function$;

-- F819 · conta automática marcada mesmo com a caixa zap_filtro_auto desligada; a caixa decide só se a conversa sai da fila
create or replace function public.zap_filtro() returns trigger
language plpgsql security definer set search_path = public as $$
declare c zap_conversas;
begin
  if new.direcao <> 'entrada' then return new; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  if c.cliente_id is not null then return new; end if;
  if not c.automatica then
    if not (zap_eh_automatica(new.texto)
            -- duas vezes na última hora: uma só pode ser a pessoa que já digitava quando a nossa mensagem saiu
            or (length(coalesce(new.texto, '')) >= 30 and (
                  select count(*) from zap_mensagens e
                   where e.conversa_id = c.id and e.direcao = 'entrada' and length(coalesce(e.texto, '')) >= 30
                     and e.criado_em > new.criado_em - interval '1 hour'
                     and exists (select 1 from zap_mensagens m where m.conversa_id = c.id and m.direcao = 'saida' and m.por_bot
                                    and m.criado_em between e.criado_em - interval '5 seconds' and e.criado_em)) >= 2)) then
      return new;
    end if;
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set automatica = true where id = c.id;
    if coalesce((select valor from config_app where chave='zap_filtro_auto'),'nao') <> 'sim' then
      perform zap_nota_sistema(c.id, null,
        'Mensagem automática de outra empresa: sem aviso de ausência, amparo nem IA. '
        || 'Para desfazer, use "Não é automática" no topo da conversa.');
      return new;
    end if;
    perform zap_nota_sistema(c.id, null,
      'Mensagem automática de outra empresa: a conversa saiu da fila e o robô não responde. '
      || 'Para desfazer, use "Não é automática" no topo da conversa.');
  elsif coalesce((select valor from config_app where chave='zap_filtro_auto'),'nao') <> 'sim' then
    return new;
  end if;
  -- a conversa marcada fica fora da fila, sem não lidas e sem alerta
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set automatica = true, status = 'resolvida', nao_lidas = 0, alerta_nivel = 0
   where id = c.id;
  return new;
end $$;

do $$
declare d text; n text;
begin
  -- F819 · amparo no máximo uma vez por conversa por dia
  d := pg_get_functiondef('public.zap_amparo_vez'::regproc);
  n := replace(d, 'coalesce((z.amparo->>''n'')::int, 0) < 2', 'false /* F819 · uma vez por dia */');
  if n = d and position('F819' in d) = 0 then raise exception 'F819: trecho de zap_amparo_vez não encontrado'; end if;
  execute n;

  -- F819 · o encaminhamento ao advogado em férias vai à substituta
  d := pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure);
  if position('F819' in d) = 0 then
    n := replace(d, 'v_adv := coalesce(v_adv, zap_advogado_da_conversa(c.id));',
      'v_adv := coalesce(v_adv, zap_advogado_da_conversa(c.id));' || E'\n' ||
      '  -- F819 · advogado em férias: vai à substituta' || E'\n' ||
      '  v_adv := coalesce((select k.zap_cobre_id from colaboradores k where k.id = v_adv and k.zap_ferias_ate > now()), v_adv);');
    if n = d then raise exception 'F819: trecho de zap_plantao_aplicar não encontrado'; end if;
    execute n;
  end if;
end $$;
