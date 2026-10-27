-- F277 · o agente do Managed Agents marca o atendimento pela agenda do CRM
-- (pedido do Paulo de 25.10.2026). As ferramentas consultar_vagas e
-- marcar_atendimento rodam na Edge Function zap_plantao, que lê aqui o que a
-- agenda precisa e, marcado, confirma ao cliente e deixa a nota à equipe.

-- o que a agenda precisa da conversa: telefone, ficha (001 sem ficha, 002 com) e se está ligada
create or replace function zap_plantao_agenda(p_conversa uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c zap_conversas; v_cli uuid; v_nome text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found then return null; end if;
  v_cli := zap_cliente_do_numero(p_conversa);
  if v_cli is not null then select nome into v_nome from clientes where id = v_cli; end if;
  return jsonb_build_object('telefone', c.telefone, 'cliente_id', v_cli, 'nome_ficha', v_nome,
                            'ligada', zap_agenda_ligada());
end $$;

-- marcado pelo agente: a confirmação sai daqui, para não se perder se o turno passar do prazo
create or replace function zap_plantao_marcado(p_conversa uuid, p_rotulo text, p_modalidade text, p_assunto text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (p_conversa, 'saida', true,
    'Seu atendimento está marcado para ' || p_rotulo
    || case when p_modalidade = 'remoto' then ', na modalidade remota.'
            else ', no escritório.' end || E'\n\n'
    || 'Tenha em mãos um documento com foto e a senha do Meu INSS (gov.br) atualizada. O atendimento é individual: '
    || 'se outra pessoa da família também precisa, peça um horário para ela.' || E'\n\n'
    || 'Se precisar remarcar, é só escrever aqui.', 'fila', 'plantao:resposta');
  perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual marcou na agenda: ' || p_rotulo
          || ' · ' || coalesce(nullif(p_modalidade, ''), 'presencial')
          || coalesce(' · ' || nullif(trim(p_assunto), ''), ''));
end $$;

revoke all on function zap_plantao_agenda(uuid) from public, anon, authenticated;
revoke all on function zap_plantao_marcado(uuid, text, text, text) from public, anon, authenticated;
grant execute on function zap_plantao_agenda(uuid), zap_plantao_marcado(uuid, text, text, text) to service_role;


-- quem escreve pode não ser o cliente da ficha (o pai da cliente, o filho do segurado):
-- a IA chama pelo nome de quem escreve, gravado em contato_nome e contato_relacao
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
                          order by momento desc, seq desc limit 60) x));
end $$;
