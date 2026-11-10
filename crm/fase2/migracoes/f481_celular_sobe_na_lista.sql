-- F481 (09.11.2026): a mensagem trazida do celular pelo
-- "Buscar histórico" (bot_ia = 'celular') mais nova que a última da conversa entrava calada
-- e a conversa continuava lá embaixo na lista, com a data antiga. Agora ela sobe a conversa
-- (última data e prévia) e, sendo do cliente, conta como não lida. Robô, IA e status seguem
-- sem mexer, porque continua sendo histórico (F478).
do $$
declare d text := pg_get_functiondef('zap_toque()'::regprocedure);
begin
  if position('F481' in d) = 0 then
    execute replace(d,
      $a$if zap_eh_historico(new) then return new; end if;$a$,
      $a$if zap_eh_historico(new) then
    -- F481: a mensagem do celular mais nova que a última da conversa sobe a conversa na lista
    if new.bot_ia = 'celular' then
      update zap_conversas set
        ultima_em    = coalesce(new.quando_wa, new.criado_em),
        ultimo_texto = left(coalesce(nullif(trim(new.texto),''), '['||new.tipo||']'), 200),
        nao_lidas    = case when new.direcao = 'entrada' then nao_lidas + 1 else 0 end
      where id = new.conversa_id
        and coalesce(new.quando_wa, new.criado_em) > coalesce(ultima_em, '-infinity');
    end if;
    return new;
  end if;$a$);
  end if;
end $$;

-- as já trazidas do celular antes desta correção
update zap_conversas c set
  ultima_em    = m.quando_wa,
  ultimo_texto = left(coalesce(nullif(trim(m.texto),''), '['||m.tipo||']'), 200),
  nao_lidas    = case when m.direcao = 'entrada' then c.nao_lidas + 1 else c.nao_lidas end
from (select distinct on (conversa_id) conversa_id, quando_wa, texto, tipo, direcao
        from zap_mensagens where bot_ia = 'celular' and direcao <> 'interna' and quando_wa is not null
       order by conversa_id, quando_wa desc) m
where m.conversa_id = c.id and m.quando_wa > coalesce(c.ultima_em, '-infinity');
