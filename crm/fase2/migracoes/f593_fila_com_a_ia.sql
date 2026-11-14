-- F593: fila "Com a IA" no WhatsApp. A IA conduz a conversa enquanto zap_conversas.plantao tem
-- 'modo' (conversa ou lead) sem atendente, ou 'offline_ia'. Este gatilho limpa o estado quando a
-- conversa sai da IA: o 'modo' retirado (entrega à equipe, encerramento) leva junto o 'offline_ia',
-- e o atendente novo (Assumir, Transferir) apaga os três. O agendamento feito pela IA também limpa.

create or replace function public.zap_ia_fim()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.atendente_id is not null and new.atendente_id is distinct from old.atendente_id then
    new.plantao := coalesce(new.plantao, '{}'::jsonb) - 'modo' - 'n' - 'offline_ia';
  elsif coalesce(old.plantao, '{}'::jsonb) ? 'modo' and not coalesce(new.plantao, '{}'::jsonb) ? 'modo' then
    new.plantao := coalesce(new.plantao, '{}'::jsonb) - 'offline_ia';
  end if;
  return new;
end $$;

drop trigger if exists zap_ia_fim_upd on public.zap_conversas;
create trigger zap_ia_fim_upd before update of plantao, atendente_id on public.zap_conversas
  for each row execute function public.zap_ia_fim();

revoke execute on function public.zap_ia_fim() from public, anon;

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
  -- F593: agendado, a conversa sai da fila Com a IA e volta às Novas.
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb) - 'modo' - 'n' - 'offline_ia' where id = p_conversa;
end $$;

revoke execute on function public.zap_plantao_marcado(uuid, text, text, text, text) from public, anon;
grant execute on function public.zap_plantao_marcado(uuid, text, text, text, text) to service_role;
