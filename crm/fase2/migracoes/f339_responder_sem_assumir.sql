-- F339 · responder a conversa pendente não a assume (pedido do Paulo de 01.11.2026):
-- a resposta da equipe só cala o robô; assumir é o botão "Assumir a conversa" (zap_assumir).
create or replace function zap_humano_assumiu() returns trigger
language plpgsql as $$
begin
  if new.direcao='saida' and new.autor_id is not null and not new.por_bot then
    update zap_conversas set bot_ativo=false where id=new.conversa_id;
  end if;
  return new;
end $$;
