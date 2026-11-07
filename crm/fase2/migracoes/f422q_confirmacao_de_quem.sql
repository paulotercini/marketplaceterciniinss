-- F422q · a confirmação do agendamento da IA diz de quem é o atendimento (pedido do Paulo de 07.11.2026):
-- "Seu atendimento" saía também para a filha e a esposa de quem escreve, e o aviso do atendimento
-- individual se repetia depois de a pessoa já ter agendado a segunda. A nota interna passa a "agendou".
create or replace function public.zap_plantao_marcado(p_conversa uuid, p_rotulo text, p_modalidade text, p_assunto text, p_para text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_segundo boolean;
begin
  -- já houve confirmação nesta conversa nas últimas 24 h: o aviso do atendimento individual não se repete
  select exists (select 1 from zap_mensagens where conversa_id = p_conversa and direcao = 'saida' and por_bot
                   and texto like '%está agendado para %' and momento > now() - interval '24 hours') into v_segundo;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
  values (p_conversa, 'saida', true,
    case when nullif(trim(p_para), '') is null then 'O seu atendimento está agendado para '
         else 'O atendimento de ' || split_part(trim(p_para), ' ', 1) || ' está agendado para ' end
    || p_rotulo
    || case when p_modalidade = 'remoto' then ', na modalidade remota.' else ', no escritório.' end || E'\n\n'
    || case when p_rotulo ilike '%Dr. Marcos%' then 'Tenha em mãos um documento com foto.'
            else 'Tenha em mãos um documento com foto e a senha do Meu INSS (gov.br) atualizada.' end || E'\n\n'
    || 'Se precisar remarcar, é só escrever aqui.'
    || case when v_segundo then '' else E'\n\n' || 'Lembramos que o atendimento é individual: se outra pessoa da família também precisa, peça um horário para ela.' end,
    'fila', 'plantao:resposta');
  perform zap_nota_sistema(p_conversa, null, '📅 A assistente virtual agendou: '
          || coalesce(nullif(trim(p_para), '') || ' · ', '') || p_rotulo
          || ' · ' || coalesce(nullif(p_modalidade, ''), 'presencial')
          || coalesce(' · ' || nullif(trim(p_assunto), ''), ''));
end $$;

-- a assinatura antiga continua para a versão anterior da função zap_plantao
create or replace function public.zap_plantao_marcado(p_conversa uuid, p_rotulo text, p_modalidade text, p_assunto text)
returns void language sql security definer set search_path to 'public' as $$
  select public.zap_plantao_marcado(p_conversa, p_rotulo, p_modalidade, p_assunto, null::text);
$$;

revoke execute on function public.zap_plantao_marcado(uuid, text, text, text, text) from public, anon;
grant execute on function public.zap_plantao_marcado(uuid, text, text, text, text) to service_role;
