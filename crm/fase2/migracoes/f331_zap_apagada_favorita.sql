-- F331 · mensagem apagada ou editada no WhatsApp e mensagem favorita
-- O cliente que apaga ou edita a mensagem manda um aviso (protocolMessage) que a
-- ponte descartava. Agora a linha guarda quando foi apagada ou editada e o texto de
-- antes, que fica para a equipe: o que o cliente escreveu continua registrado.
alter table zap_mensagens add column if not exists apagada_em timestamptz;
alter table zap_mensagens add column if not exists editada_em timestamptz;
alter table zap_mensagens add column if not exists texto_antes text;
-- a estrela do WhatsApp: a mensagem que a equipe quer achar de novo
alter table zap_mensagens add column if not exists favorita_em timestamptz;
alter table zap_mensagens add column if not exists favorita_por uuid references colaboradores(id) on delete set null;
create index if not exists zap_msg_favorita on zap_mensagens (conversa_id) where favorita_em is not null;
