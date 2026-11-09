-- ══ F474 · o histórico da conversa vazia (pedido do Paulo, 09.11.2026) ══
-- A conversa aberta pela ficha, sem mensagem gravada, não tinha de onde a ponte
-- partir para pedir o histórico ao celular. A ponte agora tenta sem partida e,
-- sem resposta, grava o resultado abaixo; a primeira mensagem que chegar ou sair
-- devolve a conversa à fila do histórico, já com a mensagem de partida.

create or replace function zap_historico_primeira() returns trigger
language plpgsql as $$
begin
  if new.direcao <> 'interna' and new.externo_id is not null then
    update zap_conversas set historico_pedido = now(), historico_feito = null
     where id = new.conversa_id and historico_feito is not null
       and historico_resultado like 'sem mensagem de partida%';
  end if;
  return new;
end $$;
create or replace trigger zap_historico_primeira after insert on zap_mensagens
  for each row execute function zap_historico_primeira();

-- as conversas que já ficaram sem histórico por não terem mensagem nenhuma
update zap_conversas c set historico_resultado = 'sem mensagem de partida: pede de novo na primeira mensagem'
 where c.historico_resultado = 'o celular não tem mensagem mais antiga'
   and not exists (select 1 from zap_mensagens m where m.conversa_id = c.id and m.externo_id is not null);
