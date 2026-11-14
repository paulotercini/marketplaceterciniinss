-- F592 · a fila "Com a IA" do WhatsApp (decisão do Paulo de 14.11.2026). A conversa que a IA conduz
-- (plantao.modo conversa ou lead, sem atendente) sai de Novas e Pendentes; volta quando a IA passa
-- à equipe (zap_plantao_aplicar já tira o modo) ou quando agenda: aqui o agendamento marca
-- plantao.agendado_em. Não destrutiva.

-- o agendamento feito pela IA marca a conversa (a função é a da F422q, com o update ao fim)
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
  -- F592: a conversa volta a Novas e Pendentes
  update zap_conversas set plantao = coalesce(plantao, '{}'::jsonb) || jsonb_build_object('agendado_em', now())
   where id = p_conversa;
end $$;

revoke execute on function public.zap_plantao_marcado(uuid, text, text, text, text) from public, anon;
grant execute on function public.zap_plantao_marcado(uuid, text, text, text, text) to service_role;

-- sem o modo (passou à equipe, encerrou), a marca do agendamento sai junto: a próxima conversa
-- conduzida pela IA volta a "Com a IA"
create or replace function public.zap_plantao_sem_modo() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if new.plantao ? 'agendado_em' and not (new.plantao ? 'modo') then
    new.plantao := new.plantao - 'agendado_em';
  end if;
  return new;
end $$;

revoke all on function public.zap_plantao_sem_modo() from public, anon, authenticated;

drop trigger if exists zap_plantao_sem_modo_upd on public.zap_conversas;
create trigger zap_plantao_sem_modo_upd before update of plantao on public.zap_conversas
  for each row execute function public.zap_plantao_sem_modo();
