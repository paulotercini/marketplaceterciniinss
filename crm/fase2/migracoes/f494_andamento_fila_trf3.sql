-- F494 (pedido do Paulo de 10.11.2026): a sugestão de resposta sobre o andamento (F422ak) recebe a fila de julgamento
-- do TRF3 (casos.trf3, só na fase judicial ou na lista de prazos, porque o dado pode ter ficado de outra fase).
create or replace function public.zap_andamento_pegar(p_msg uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare m zap_mensagens; c zap_conversas; cl clientes;
begin
  select * into m from zap_mensagens where id = p_msg;
  if not found then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  select * into cl from clientes where id = c.cliente_id;
  if cl.id is null then return null; end if;
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.contato_nome), ''), nullif(trim(c.nome_perfil), ''), ''),
    'relacao', nullif(trim(c.contato_relacao), ''),
    'cliente', cl.nome,
    'casos', (select coalesce(jsonb_agg(jsonb_build_object(
                 'beneficio', coalesce(nullif(trim(k.beneficio), ''), k.titulo), 'fase', k.fase, 'etapa', k.etapa,
                 'etapa_sugerida', k.trilha->'velha'->>'proposta', 'etapa_sugerida_desde', k.trilha->'velha'->>'data',
                 'trf3', case when k.fase in ('judicial', 'outro') and k.trf3->>'ordem' is not null then jsonb_build_object(
                           'ordem', k.trf3->'ordem', 'total', k.trf3->'total', 'orgao', k.trf3->>'orgao',
                           'consultado_em', k.trf3->>'consultado_em', 'previsao', k.trf3->'projecao'->>'previsao') end,
                 'andamentos', (select coalesce(jsonb_agg(jsonb_build_object('em', a.criado_em, 'origem', a.origem,
                                   'texto', left(a.texto, 400)) order by a.criado_em desc), '[]'::jsonb)
                                  from (select * from andamentos a where a.caso_id = k.id and not coalesce(a.excluir, false)
                                         order by a.criado_em desc limit 8) a)
               ) order by k.criado_em), '[]'::jsonb)
                from casos k where k.cliente_id = cl.id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false)),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                    'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                            and momento <= m.momento order by momento desc, seq desc limit 20) x));
end $$;
revoke execute on function public.zap_andamento_pegar(uuid) from public, anon, authenticated;
grant execute on function public.zap_andamento_pegar(uuid) to service_role;
