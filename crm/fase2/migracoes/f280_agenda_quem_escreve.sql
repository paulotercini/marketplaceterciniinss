-- F280 · quem escreve por outra pessoa da ficha (contato_relacao) marca o primeiro atendimento (001)
-- em nome próprio, e não o 002 da ficha (25.10.2026).
-- shortcut: o parente que marca para o próprio cliente da ficha também cai no 001; a equipe ajusta na agenda.
create or replace function public.zap_plantao_agenda(p_conversa uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c zap_conversas; v_cli uuid; v_nome text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found then return null; end if;
  if c.contato_relacao is null then v_cli := zap_cliente_do_numero(p_conversa); end if;
  if v_cli is not null then select nome into v_nome from clientes where id = v_cli; end if;
  return jsonb_build_object('telefone', c.telefone, 'cliente_id', v_cli, 'nome_ficha', v_nome,
                            'ligada', zap_agenda_ligada());
end $function$;

-- a senha do gov.br só no assunto do INSS (o Dr. Marcos atende os demais), e o lembrete do atendimento
-- individual fecha a mensagem (pedido do Paulo, 25.10.2026)
create or replace function public.zap_plantao_marcado(p_conversa uuid, p_rotulo text, p_modalidade text, p_assunto text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (p_conversa, 'saida', true,
    'Seu atendimento está marcado para ' || p_rotulo
    || case when p_modalidade = 'remoto' then ', na modalidade remota.' else ', no escritório.' end || E'\n\n'
    || case when p_rotulo ilike '%Dr. Marcos%' then 'Tenha em mãos um documento com foto.'
            else 'Tenha em mãos um documento com foto e a senha do Meu INSS (gov.br) atualizada.' end || E'\n\n'
    || 'Se precisar remarcar, é só escrever aqui.' || E'\n\n'
    || 'Lembramos que o atendimento é individual: se outra pessoa da família também precisa, peça um horário para ela.',
    'fila', 'plantao:resposta');
  perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual marcou na agenda: ' || p_rotulo
          || ' · ' || coalesce(nullif(p_modalidade, ''), 'presencial')
          || coalesce(' · ' || nullif(trim(p_assunto), ''), ''));
end $function$;
