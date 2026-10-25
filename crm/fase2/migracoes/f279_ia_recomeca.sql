-- F279 · encerrar o atendimento recomeça a IA (pedido do Paulo de 25.10.2026)
--   O cliente que volta a escrever depois do encerramento é recebido como conversa nova:
--   a sessão do Managed Agents e o modo do plantão saem da conversa, e a IA só lê as
--   mensagens desde o último encerramento.

create or replace function zap_atendimento_ciclo() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if tg_op = 'INSERT' or (old.status = 'resolvida' and new.status <> 'resolvida') then
    insert into zap_atendimentos (conversa_id) values (new.id) returning id into v;
    update zap_conversas set atendimento_id = v where id = new.id;
  elsif new.status = 'resolvida' and old.status <> 'resolvida' then
    update zap_atendimentos set encerrado_em = coalesce(encerrado_em, now())
     where id = new.atendimento_id;
    -- encerrado, a IA recomeça: sessão nova e sem o modo da conversa anterior (F279)
    update zap_conversas set ia_sessao = null, plantao = plantao - 'modo' - 'n' - 'nome' where id = new.id;
  end if;
  return null;
end $$;

create or replace function zap_plantao_pegar(p_msg uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; cl clientes; v_adv colaboradores; v_mesmo boolean; v_casos jsonb;
begin
  update zap_mensagens set bot_ia = 'plantao:lendo' where id = p_msg and bot_ia = 'plantao:pedida' returning * into m;
  if not found then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.cliente_id is not null then select * into cl from clientes where id = c.cliente_id; end if;
  -- a etapa do processo só sai para o telefone principal da ficha (a regra do zap_situacao)
  v_mesmo := cl.id is not null and fone_ddd8(c.telefone) is not null and fone_ddd8(c.telefone) = fone_ddd8(cl.telefone);
  if v_mesmo then
    select jsonb_agg(jsonb_build_object('beneficio', coalesce(nullif(trim(k.beneficio), ''), k.titulo),
             'fase', k.fase, 'etapa', zap_etapa_publica(k)) order by k.criado_em)
      into v_casos from casos k
     where k.cliente_id = cl.id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false);
  end if;
  select * into v_adv from colaboradores where id = zap_advogado_da_conversa(c.id);
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.contato_nome), ''), nullif(trim(c.nome_perfil), ''), ''),
    'relacao', nullif(trim(c.contato_relacao), ''),
    'cliente', case when cl.id is null then null else jsonb_build_object('nome', cl.nome,
                 'mesmo_telefone', v_mesmo, 'casos', coalesce(v_casos, '[]'::jsonb)) end,
    'advogado', v_adv.assinatura_zap,
    'advogados', (select jsonb_agg(assinatura_zap) from zap_advogados()),
    'modo', coalesce(c.plantao->>'modo', ''),
    'respostas', coalesce((c.plantao->>'n')::int, 0),
    'interativa', c.plantao->>'modo' in ('lead', 'conversa') or coalesce(zap_plantao_interativa(c.id), false),
    'horario', zap_no_horario(),
    'agenda', zap_agenda_ligada(),
    'agora', to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
    'instrucoes', coalesce((select valor from config_app where chave = 'zap_ia_txt_plantao'), ''),
    'motor', coalesce((select valor from config_app where chave = 'zap_ia_motor'), 'mensagens'),
    'ma', jsonb_build_object('agente', (select valor from config_app where chave = 'zap_ma_agente'),
                             'ambiente', (select valor from config_app where chave = 'zap_ma_ambiente'),
                             'versao', (select valor from config_app where chave = 'zap_ma_versao')),
    'sessao', c.ia_sessao,
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                    'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                            and momento > coalesce((select max(a.encerrado_em) from zap_atendimentos a
                                                     where a.conversa_id = c.id and a.encerrado_em < m.momento), '-infinity')
                          order by momento desc, seq desc limit 60) x));
end $$;
