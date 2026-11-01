-- F342 · apagar para todos e editar a mensagem enviada pelo CRM
-- O CRM não fala com o WhatsApp: grava o pedido na linha e a ponte o cumpre.
-- alterar = {acao: 'apagar'|'editar', texto, status: 'fila'|'feita'|'erro', erro, por, em}
alter table zap_mensagens add column if not exists alterar jsonb;
create index if not exists zap_msg_alterar_fila on zap_mensagens (id) where (alterar->>'status') = 'fila';
