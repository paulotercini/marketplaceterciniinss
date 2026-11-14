-- F599 (fase 2 do plano das cobranças do WhatsApp, decisões do Paulo de 14.11.2026): a "IA de amparo".
-- A conversa cuja última mensagem é do cliente e fica 1 hora sem resposta da equipe, no expediente,
-- recebe uma mensagem assinada "Assistente do escritório", com o cumprimento do período, que diz que a
-- equipe responderá em breve (forma usada pela equipe, levantada no histórico de 120 dias). Não dá orientação jurídica nem informa andamento: o pedido de andamento recebe apenas
-- "a equipe jurídica vai verificar o seu processo", com menção URGENTE ao advogado.
-- Uma mensagem por espera, no máximo 2 por conversa no dia e com 2 horas entre elas. Vale também na
-- conversa assumida. Fica fora a automática, a sem_ia, a de contato (F586), a que a IA conduz (F594),
-- a que espera confirmação de atendimento e a que já recebeu mensagem do robô ou da IA depois do cliente.
-- Nasce desligada (config_app.zap_ia_amparo = 'nao'); a espera em zap_amparo_min (60).

alter table public.zap_conversas add column if not exists amparo jsonb;

insert into config_app (chave, valor) values ('zap_ia_amparo', 'nao'), ('zap_amparo_min', '60')
  on conflict (chave) do nothing;

-- O envio, comum ao texto fixo e à resposta da IA: mensagem, nota, menções e a marca do amparo.
create or replace function public.zap_amparo_enviar(p_conv uuid, p_txt text, p_and boolean, p_agora timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_amparo_min'), '')::int, 60);
  v_local timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_dia text := to_char(v_local, 'YYYY-MM-DD');
  v_rec boolean := exists (select 1 from colaboradores where ativo and cargo = 'recepcao');
  v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
  c record;
  v_aviso text;
  v_adv uuid;
begin
  select * into c from zap_conversas where id = p_conv;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, criado_em)
  values (c.id, 'saida', true, '*Assistente do escritório:*' || E'\n\n'
          || case when extract(hour from v_local) < 12 then 'Bom dia. ' when extract(hour from v_local) < 18
                  then 'Boa tarde. ' else 'Boa noite. ' end || p_txt, 'fila', p_agora);
  v_aviso := case when p_and then '⚠ URGENTE: ' else '' end
    || 'Cliente sem resposta há mais de ' || v_min || ' minutos. A assistente do escritório informou que a equipe responderá em breve'
    || case when p_and then ' (pedido de andamento).' else '.' end || ' Responda a conversa.';
  perform zap_nota_sistema(c.id, v_claude, 'Assistente do escritório: ' || p_txt);
  v_adv := zap_advogado_da_conversa(c.id);
  insert into mencoes (para_id, conversa_id, cliente_id, texto)
  select k.id, c.id, c.cliente_id, v_aviso
    from colaboradores k
   where k.ativo
     and (k.id = c.atendente_id or k.id = v_adv
          or (v_rec and k.cargo = 'recepcao')
          or (not v_rec and k.cargo = 'estagiario'));
  update zap_conversas set amparo = jsonb_build_object(
      'em', p_agora, 'dia', v_dia,
      'n', case when amparo->>'dia' = v_dia then coalesce((amparo->>'n')::int, 0) + 1 else 1 end)
   where id = c.id;
end $$;

-- O texto fixo, sem andamento e sem orientação jurídica.
create or replace function public.zap_amparo_fixo(p_and boolean, p_agora timestamptz)
returns text language sql stable set search_path = public as $$
  select case when p_and
    then 'Recebemos a sua mensagem. A equipe jurídica vai verificar o seu processo e responderá em breve.'
    else 'Recebemos a sua mensagem. A equipe responderá em breve.' end;
$$;

-- A conversa continua sem resposta da equipe e sem mensagem do robô ou da IA depois do cliente.
create or replace function public.zap_amparo_espera(p_conv uuid)
returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from zap_conversas z
                  where z.id = p_conv and z.status = 'aberta'
                    and z.ultima_entrada_em > coalesce(z.ultima_resposta_em, '-infinity')
                    and not exists (select 1 from zap_mensagens m
                                     where m.conversa_id = z.id and m.direcao = 'saida' and m.por_bot
                                       and m.criado_em > z.ultima_entrada_em));
$$;

create or replace function public.zap_amparo_vez(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_amparo_min'), '')::int, 60);
  v_dia text := to_char(p_agora at time zone 'America/Sao_Paulo', 'YYYY-MM-DD');
  c record;
  n int := 0;
  v_ultima text;
  v_tipo text;
  v_and boolean;
  v_ped timestamptz;
begin
  if coalesce((select valor from config_app where chave = 'zap_ia_amparo'), 'nao') <> 'sim'
     or not push_no_expediente(p_agora) then
    return 0;
  end if;
  for c in
    select z.* from zap_conversas z
     where z.status = 'aberta'
       and not coalesce(z.automatica, false)
       and not coalesce(z.sem_ia, false)
       and z.ultima_entrada_em is not null
       and z.ultima_entrada_em > coalesce(z.ultima_resposta_em, '-infinity')
       and z.ultima_entrada_em <= p_agora - make_interval(mins => v_min)
       and not (coalesce(z.plantao->>'modo', '') in ('conversa', 'lead') and z.plantao->>'agendado_em' is null
                and z.atendente_id is null)
       and coalesce(z.confirmacao->>'estado', '') not in ('aguardando', 'remarcando')
       and not exists (select 1 from clientes cl where cl.id = z.cliente_id and cl.campos ? 'contato')
       and coalesce((z.amparo->>'em')::timestamptz, '-infinity') < z.ultima_entrada_em
       and (z.amparo->>'dia' is distinct from v_dia
            or (coalesce((z.amparo->>'n')::int, 0) < 2
                and coalesce((z.amparo->>'em')::timestamptz, '-infinity') <= p_agora - interval '2 hours'))
       and not exists (select 1 from zap_mensagens m
                        where m.conversa_id = z.id and m.direcao = 'saida' and m.por_bot
                          and m.criado_em > z.ultima_entrada_em)
  loop
    select m.texto, m.tipo into v_ultima, v_tipo from zap_mensagens m
     where m.conversa_id = c.id and m.direcao = 'entrada'
     order by m.criado_em desc limit 1;
    -- agradecimento, "ok" e figurinha não pedem resposta
    if zap_conf_agradece(coalesce(v_tipo, 'texto'), coalesce(v_ultima, '')) then continue; end if;
    v_and := c.cliente_id is not null and zap_pede_andamento(coalesce(v_ultima, ''));
    -- quem tem ficha e não pede andamento: a IA responde só com dados da ficha; sem resposta em 3 minutos, o texto fixo
    if c.cliente_id is not null and not v_and then
      v_ped := (c.amparo->>'pedido')::timestamptz;
      if v_ped is null or v_ped < c.ultima_entrada_em then
        update zap_conversas set amparo = coalesce(amparo, '{}'::jsonb) || jsonb_build_object('pedido', p_agora)
         where id = c.id;
        begin
          perform net.http_post(
            url := (select valor from config_app where chave = 'zap_plantao_url'),
            body := jsonb_build_object('amparo', c.id),
            headers := zap_fn_cabecalho(),
            timeout_milliseconds := 120000);
        exception when others then null;
        end;
        continue;
      end if;
      if v_ped > p_agora - interval '3 minutes' then continue; end if;
    end if;
    perform zap_amparo_enviar(c.id, zap_amparo_fixo(v_and, p_agora), v_and, p_agora);
    n := n + 1;
  end loop;
  return n;
end $$;

-- O que a IA pode ler: a conversa e apenas fatos da ficha (eventos futuros, benefício dos casos abertos,
-- documentos pedidos e não entregues e se há senha do gov.br guardada, nunca o valor).
create or replace function public.zap_amparo_pegar(p_conversa uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_ped timestamptz;
begin
  select * into c from zap_conversas where id = p_conversa;
  if c.id is null or c.cliente_id is null then return null; end if;
  v_ped := (c.amparo->>'pedido')::timestamptz;
  if v_ped is null or v_ped < c.ultima_entrada_em or not zap_amparo_espera(c.id) then return null; end if;
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.contato_nome), ''), nullif(trim(c.nome_perfil), ''), ''),
    'relacao', nullif(trim(c.contato_relacao), ''),
    'cliente', (select cl.nome from clientes cl where cl.id = c.cliente_id),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                     'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                           order by momento desc, seq desc limit 20) x),
    'eventos', (select coalesce(jsonb_agg(e.tipo || ' em '
                     || to_char(e.data_hora at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')
                     || coalesce(', local: ' || nullif(trim(e.local), ''), '') order by e.data_hora), '[]'::jsonb)
                  from eventos e join casos k on k.id = e.caso_id
                 where k.cliente_id = c.cliente_id and e.data_hora > now()
                   and coalesce(e.status, '') not in ('cancelada', 'cancelado', 'realizada', 'realizado')),
    'casos', (select coalesce(jsonb_agg(distinct k.beneficio), '[]'::jsonb) from casos k
               where k.cliente_id = c.cliente_id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false)
                 and nullif(trim(k.beneficio), '') is not null),
    'docs_pendentes', (select coalesce(jsonb_agg(d.nome
                             || coalesce(' (até ' || to_char(d.ate::date, 'DD/MM/YYYY') || ')', '')), '[]'::jsonb)
                         from (select case when jsonb_typeof(it) = 'string' then it #>> '{}' else it->>'nome' end as nome,
                                      case when p->>'ate' ~ '^\d{4}-\d{2}-\d{2}' then left(p->>'ate', 10) end as ate,
                                      case when jsonb_typeof(it) = 'object' then coalesce(it->>'entregue', '') else '' end as ent
                                 from clientes cl,
                                      jsonb_array_elements(case when jsonb_typeof(cl.campos->'docs_pedidos') = 'array'
                                                                then cl.campos->'docs_pedidos' else '[]'::jsonb end) p,
                                      jsonb_array_elements(case when jsonb_typeof(p->'itens') = 'array'
                                                                then p->'itens' else '[]'::jsonb end) it
                                where cl.id = c.cliente_id) d
                        where coalesce(d.nome, '') <> '' and d.ent in ('', 'false')),
    'tem_senha_gov', exists (select 1 from credenciais cr where cr.cliente_id = c.cliente_id
                              and cr.tipo in ('meu_inss', 'gov_br') and nullif(trim(cr.valor), '') is not null));
end $$;

-- A volta da IA: com resposta, só ela (a função acrescenta, se for o caso, que as demais perguntas vão à
-- equipe); sem resposta, o texto fixo.
create or replace function public.zap_amparo_gravar(p_conversa uuid, p_resposta text, p_agora timestamptz default now())
returns boolean language plpgsql security definer set search_path = public as $$
declare
  c record;
  v_r text := nullif(trim(coalesce(p_resposta, '')), '');
begin
  select * into c from zap_conversas where id = p_conversa for update;
  if c.id is null or (c.amparo->>'pedido') is null or (c.amparo->>'pedido')::timestamptz < c.ultima_entrada_em
     or not zap_amparo_espera(c.id) then
    return false;
  end if;
  perform zap_amparo_enviar(c.id,
    coalesce(v_r, zap_amparo_fixo(false, p_agora)),
    false, p_agora);
  return true;
end $$;

revoke execute on function public.zap_amparo_enviar(uuid, text, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.zap_amparo_pegar(uuid) from public, anon, authenticated;
revoke execute on function public.zap_amparo_gravar(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.zap_amparo_pegar(uuid) to service_role;
grant execute on function public.zap_amparo_gravar(uuid, text, timestamptz) to service_role;
revoke execute on function public.zap_amparo_vez(timestamptz) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'zap-amparo';
    perform cron.schedule('zap-amparo', '*/5 * * * *', 'select public.zap_amparo_vez()');
  end if;
end $$;
