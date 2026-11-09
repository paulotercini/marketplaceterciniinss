-- F422ah (09.11.2026, pedido do Paulo): a resposta fixa ao SIM da confirmação (zap_conf_sim) sai ao
-- cliente também na conversa assumida por atendente; a F422ae a deixava como sugestão.
create or replace function public.zap_conf_confirmado(p_conversa uuid, p_ok boolean, p_erro text)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if p_ok then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'confirmado', 'confirmado_em', now()) where id = p_conversa;
    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
    select p_conversa, 'saida', true, zap_conf_preencher(valor, c.confirmacao), 'fila' from config_app where chave = 'zap_conf_sim' and trim(valor) <> '';
    perform zap_nota_sistema(p_conversa, null, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', e a agenda foi atualizada.');
  else
    perform zap_conf_avisar(p_conversa, '📅 O cliente confirmou o atendimento de ' || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada (' || left(coalesce(p_erro, ''), 120) || '): confirme à mão.');
  end if;
end $function$;
