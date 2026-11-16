-- F623 (pedido do Paulo de 16.11.2026): a IA de amparo (F599) respondeu às 08:00 a um contato cuja última
-- mensagem tinha 27 dias. Ela passa a intervir apenas quando o cliente cobra resposta ("ninguém responde",
-- "estou aguardando", "já mandei mensagem", "alguém pode me responder?", "?"), numa mensagem das últimas
-- 24 horas posterior à última resposta da equipe. Mensagem antiga parada não recebe nada.

create or replace function public.zap_amparo_cobra(p_txt text)
returns boolean language sql immutable as $$
  select lower(coalesce(p_txt, '')) ~ ('('
    || '\mningu[eé]m (me |nos )?(responde|respondeu|retorna|retornou|atende|atendeu|fala|falou)'
    || '|\msem (nenhuma )?(resposta|retorno)'
    || '|\m(estou|est[aá]|t[oô]|fico|continuo|sigo|seguimos|estamos) (ainda )?(aguardando|esperando)'
    || '|\maguardo (o |a |um |uma |seu |sua |o seu |a sua )?(retorno|resposta|contato|posicionamento)'
    || '|\m(algu[eé]m|voc[eê]s?|a senhora|o senhor|dr\.?|doutor[a]?),? (\w+ )?(pode|poderia|podem|vai|v[aã]o|consegue|conseguem) (me |nos )?(responder|retornar|dar (um |uma )?(retorno|resposta|posi[cç][aã]o))'
    || '|\mj[aá] (te |lhe |lhes |vos )?(mandei|enviei|falei|perguntei|liguei|escrevi|pedi)'
    || '|\m(n[aã]o|nunca) (me |nos )?(respond|retorn|deram retorno|tive retorno|tive resposta|obtive)'
    || '|\m(cad[eê]|e a[ií]\??$|alguma (novidade|resposta|posi[cç][aã]o|not[ií]cia)\??)'
    || '|\mvou (ficar|continuar) sem (resposta|retorno)'
    || '|^\s*\?+\s*$'
    || ')');
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
       and z.ultima_entrada_em > p_agora - interval '24 hours'
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
    -- F623 · só intervém quando o cliente cobra resposta, numa mensagem posterior à última resposta da equipe
    if not exists (select 1 from zap_mensagens m
                    where m.conversa_id = c.id and m.direcao = 'entrada'
                      and m.criado_em > greatest(coalesce(c.ultima_resposta_em, '-infinity'), p_agora - interval '24 hours')
                      and zap_amparo_cobra(m.texto)) then continue; end if;
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

