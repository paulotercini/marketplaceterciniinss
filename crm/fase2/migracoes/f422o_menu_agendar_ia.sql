-- F422o · a opção 1 do menu (agendar) passa à IA quando a Agenda da IA está ligada (teste do Paulo de 07.11.2026):
-- o menu mandava "Nossa equipe irá fornecer o melhor horário" e "não temos atendentes online", e a IA respondia em seguida.
insert into zap_smb_passos (chave, ordem, mensagens, opcoes, setor) values
('agendar_ia', 3, array['Para agendar o atendimento, informe o assunto: aposentadoria, outro benefício do INSS ou outro assunto.'], '[]', 'Agendamentos')
on conflict (chave) do update set mensagens = excluded.mensagens, setor = excluded.setor, ativo = true;

create or replace function zap_smb_ir(p_conversa uuid, p_chave text) returns void
language plpgsql security definer set search_path = public as $$
declare p zap_smb_passos;
begin
  -- com a Agenda da IA, o agendamento é conversa com a IA na hora, sem o recado de "sem atendente"
  if p_chave = 'agendar' and zap_conf_ia_remarca() then
    perform zap_smb_falar(p_conversa, 'agendar_ia');
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas
       set bot_passo = 'smb:ia', bot_erros = 0, bot_desde = now(), bot_ativo = false,
           setor = 'Agendamentos', setor_id = (select id from zap_setores where nome = 'Agendamentos'),
           plantao = coalesce(plantao, '{}'::jsonb) || '{"modo":"conversa"}'::jsonb,
           status = case when status = 'resolvida' then 'aberta' else status end
     where id = p_conversa;
    return;
  end if;
  select * into p from zap_smb_passos where chave = p_chave and ativo;
  if not found then return; end if;
  perform zap_smb_falar(p_conversa, p_chave);
  if p.setor is null then
    update zap_conversas set bot_passo = 'smb:' || p_chave, bot_erros = 0, bot_desde = now() where id = p_conversa;
    return;
  end if;
  update zap_conversas
     set bot_passo = 'smb:fila', bot_erros = 0, bot_desde = now(), bot_ativo = false,
         setor = p.setor, setor_id = (select id from zap_setores where nome = p.setor),
         status = case when status = 'resolvida' then 'aberta' else status end
   where id = p_conversa;
  if not zap_no_horario() then perform zap_smb_falar(p_conversa, 'sem_atendente'); end if;
end $$;
