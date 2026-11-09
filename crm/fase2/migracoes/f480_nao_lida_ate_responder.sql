-- F480 (pedido do Paulo de 09.11.2026): a mensagem do cliente fica como nova até a equipe responder.
-- Abrir a conversa deixou de ser ler (app.html); quem zera o não-lidas é a resposta da equipe,
-- pelo CRM ou pelo celular. Robô, IA, aviso automático, rascunho e agendada não contam como resposta.
do $$
declare d text := pg_get_functiondef('zap_toque()'::regprocedure);
begin
  if position('F480' in d) = 0 then
    execute replace(d,
      $a$nao_lidas    = case when new.direcao='entrada' then nao_lidas + 1 else nao_lidas end,$a$,
      $a$nao_lidas    = case when new.direcao='entrada' then nao_lidas + 1
                        -- F480: a resposta da equipe é que lê a conversa
                        when not new.por_bot and new.aviso_chave is null
                             and new.status not in ('rascunho','agendada') then 0
                        else nao_lidas end,$a$);
  end if;
end $$;
