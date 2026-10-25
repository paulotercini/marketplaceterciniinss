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
