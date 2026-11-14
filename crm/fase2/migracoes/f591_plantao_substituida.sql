-- F591: a leitura da IA que ficou para trás porque o cliente mandou outra mensagem (o pedido
-- passou à mensagem nova) é 'plantao:substituida', e não 'plantao:falhou'. Falha real continua
-- 'falhou'. Troca só esse trecho do zap_relogio vigente (a definição muda em outras migrações).
do $m$
declare
  d text := pg_get_functiondef('public.zap_relogio()'::regprocedure);
  velho text := $v$set bot_ia = 'plantao:falhou'$v$;
  novo text := $v$set bot_ia = case when exists (select 1 from zap_mensagens n
                                   where n.conversa_id = m.conversa_id and n.direcao = 'entrada'
                                     and n.criado_em > m.criado_em)
                       then 'plantao:substituida' else 'plantao:falhou' end$v$;
begin
  if position(velho in d) = 0 then
    raise notice 'f591: zap_relogio sem o trecho esperado, nada trocado';
    return;
  end if;
  execute replace(d, velho, novo);
end $m$;

-- as já gravadas como falha que na verdade foram substituídas
update zap_mensagens m set bot_ia = 'plantao:substituida'
 where m.bot_ia = 'plantao:falhou'
   and exists (select 1 from zap_mensagens n where n.conversa_id = m.conversa_id
                 and n.direcao = 'entrada' and n.criado_em > m.criado_em);
