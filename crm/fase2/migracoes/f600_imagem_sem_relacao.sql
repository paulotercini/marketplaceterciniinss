-- F600 (pedido do Paulo de 14.11.2026): a imagem sem legenda e sem relação com a atividade do escritório
-- (propaganda, cardápio, corrente) não recebe resposta automática. O zap_plantao a lê pela visão do modelo e
-- aplica "nada" (bot_ia = 'plantao:nada'); aqui a IA de amparo (F599) também deixa de responder a ela.

create or replace function public.zap_amparo_vez(p_agora timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_amparo_min'), '')::int, 60);
  v_dia text := to_char(p_agora at time zone 'America/Sao_Paulo', 'YYYY-MM-DD');
  c record;
  n int := 0;
  v_ultima text;
  v_tipo text;
  v_bot text;
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
    select m.texto, m.tipo, m.bot_ia into v_ultima, v_tipo, v_bot from zap_mensagens m
     where m.conversa_id = c.id and m.direcao = 'entrada'
     order by m.criado_em desc limit 1;
    -- agradecimento, "ok" e figurinha não pedem resposta
    if zap_conf_agradece(coalesce(v_tipo, 'texto'), coalesce(v_ultima, '')) then continue; end if;
    -- F600 · a imagem que a IA leu como sem relação com o escritório (propaganda, cardápio) também fica sem resposta
    if v_tipo = 'imagem' and coalesce(trim(v_ultima), '') = '' and v_bot = 'plantao:nada' then continue; end if;
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

revoke execute on function public.zap_amparo_vez(timestamptz) from public, anon, authenticated;
