-- F422j · "agendar", e não "marcar", nos textos ao cliente (pedido do Paulo de 07.11.2026)
do $$
declare f text; d text;
begin
  foreach f in array array['zap_agenda_falhou','zap_agenda_marcado','zap_plantao_marcado','zap_bot_ler'] loop
    select pg_get_functiondef(p.oid) into d from pg_proc p where p.proname = f and p.pronamespace = 'public'::regnamespace;
    d := replace(d, 'para marcar com você', 'para agendar com você');
    d := replace(d, 'não consegui marcar pela agenda', 'não consegui agendar pela agenda');
    d := replace(d, 'marcar horário na agenda', 'agendar horário na agenda');
    d := replace(d, 'atendimento está marcado para', 'atendimento está agendado para');
    d := replace(d, 'já posso marcar o seu primeiro atendimento', 'já posso agendar o seu primeiro atendimento');
    execute d;
  end loop;
end $$;
update zap_bot_passos set texto = replace(texto, 'Para marcar o horário', 'Para agendar o horário') where chave = 'agendar_nome';
