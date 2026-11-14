-- F586 · CONTATOS QUE NÃO SÃO CLIENTES (advogado, fornecedor, banco, órgão público, parceiro).
-- O contato é uma linha de clientes com campos.nao_cliente e campos.contato = {cat, empresa, obs}.
-- A conversa do WhatsApp com o número de um contato não recebe robô, menu nem IA: sem_ia e bot_ativo
-- ficam forçados aqui, porque o zap_toque devolve bot_ativo = true a cada encerramento.

create or replace function zap_eh_contato(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select campos ? 'contato' from clientes where id = p_cliente), false)
$$;
revoke execute on function zap_eh_contato(uuid) from public, anon;

create or replace function zap_contato_cala() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if zap_eh_contato(new.cliente_id) then
    new.sem_ia := true;
    new.bot_ativo := false;
  end if;
  return new;
end $$;
revoke execute on function zap_contato_cala() from public, anon;
drop trigger if exists zap_contato_cala on zap_conversas;
create trigger zap_contato_cala before insert or update on zap_conversas
  for each row when (new.cliente_id is not null) execute function zap_contato_cala();

-- virar contato cala as conversas que já existem; voltar a cliente devolve a IA
create or replace function zap_contato_conversas() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_era boolean := coalesce(old.campos ? 'contato', false);
        v_e   boolean := coalesce(new.campos ? 'contato', false);
begin
  if v_e and not v_era then
    update zap_conversas set sem_ia = true, bot_ativo = false where cliente_id = new.id;
  elsif v_era and not v_e then
    update zap_conversas set sem_ia = false where cliente_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function zap_contato_conversas() from public, anon;
drop trigger if exists zap_contato_conversas on clientes;
create trigger zap_contato_conversas after update of campos on clientes
  for each row execute function zap_contato_conversas();
