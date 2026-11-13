-- F580 (pedido do Paulo de 13.11.2026): a mensagem que o cliente encaminhou de outra conversa parecia escrita por ele.
-- A ponte grava o forwardingScore do WhatsApp (1 = encaminhada; 4 ou mais = "encaminhada com frequência"),
-- o balão mostra "Encaminhada" e a IA recebe o campo para tratar o conteúdo como repassado, e não como declaração.
alter table public.zap_mensagens add column if not exists encaminhada smallint;

-- As funções que montam as mensagens para a IA passam a levar o campo, reescritas a partir da definição do banco.
do $$
declare r record; d text; n text;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) ~ '''texto'',\s*x\.texto,\s*''momento'',\s*x\.momento'
  loop
    d := pg_get_functiondef(r.oid);
    if d ~ 'select seq, direcao, por_bot, tipo, texto, momento from zap_mensagens' then
      d := replace(d, 'select seq, direcao, por_bot, tipo, texto, momento from zap_mensagens',
                      'select seq, direcao, por_bot, tipo, texto, encaminhada, momento from zap_mensagens');
    elsif d !~ 'select \* from zap_mensagens' then
      raise notice 'F580: % não lê a coluna, ficou como estava', r.proname; continue;
    end if;
    n := regexp_replace(d, '''texto'',(\s*)x\.texto,(\s*)''momento'',(\s*)x\.momento',
                           '''texto'',\1x.texto,\2''encaminhada'', x.encaminhada,\3''momento'', x.momento', 'g');
    execute n;
    raise notice 'F580: % passou a levar encaminhada', r.proname;
  end loop;
end $$;
