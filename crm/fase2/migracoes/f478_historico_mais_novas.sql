-- F478 · a busca do histórico no celular traz também as mensagens mais novas que faltam no CRM
-- (a que a ponte não abriu). A ponte as grava com bot_ia = 'celular'; passados 10 minutos da
-- mensagem, ela é histórico: não reabre a conversa nem chama robô, IA, aviso ou mensagem do Offline.
create or replace function zap_eh_historico(m zap_mensagens) returns boolean
language sql stable as $$
  select m.quando_wa is not null and (
    m.quando_wa < (select min(x.quando_wa) from zap_mensagens x
                    where x.conversa_id = m.conversa_id and x.id <> m.id
                      and x.direcao <> 'interna')
    or (m.bot_ia = 'celular' and m.quando_wa < now() - interval '10 minutes'))
$$;
