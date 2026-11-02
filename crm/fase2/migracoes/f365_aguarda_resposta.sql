-- F365 · a conversa espera resposta enquanto a última mensagem (sem o robô e sem nota interna)
-- for do cliente (pedido do Paulo de 02.11.2026): ler não tira da fila de Pendentes,
-- apenas a resposta do escritório (pelo CRM ou pelo celular) ou o Assumir.
alter table zap_conversas add column if not exists aguarda_desde timestamptz;

create or replace function zap_aguarda() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direcao = 'interna' or new.por_bot or zap_eh_historico(new) then return new; end if;
  perform set_config('zap.via_funcao', '1', true);
  if new.direcao = 'entrada' then
    update zap_conversas set aguarda_desde = coalesce(aguarda_desde, coalesce(new.quando_wa, new.criado_em))
     where id = new.conversa_id and aguarda_desde is null;
  else
    update zap_conversas set aguarda_desde = null where id = new.conversa_id and aguarda_desde is not null;
  end if;
  return new;
end $$;
create or replace trigger zap_aguarda_ins after insert on zap_mensagens
  for each row execute function zap_aguarda();

-- as conversas que já existiam: desde a primeira mensagem do cliente depois da última resposta
with u as (
  select m.conversa_id,
         max(m.seq) filter (where m.direcao = 'saida') ult_saida,
         max(m.seq) filter (where m.direcao = 'entrada') ult_entrada
    from zap_mensagens m where m.direcao <> 'interna' and not m.por_bot group by m.conversa_id)
update zap_conversas c set aguarda_desde = (
  select min(coalesce(x.quando_wa, x.criado_em)) from zap_mensagens x
   where x.conversa_id = c.id and x.direcao = 'entrada' and not x.por_bot and x.seq > coalesce(u.ult_saida, 0))
  from u where u.conversa_id = c.id and u.ult_entrada > coalesce(u.ult_saida, 0);
