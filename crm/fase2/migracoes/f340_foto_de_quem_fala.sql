-- F340 · a foto do WhatsApp é de quem fala, e não do cliente representado.
-- O número cuja conversa tem contato_nome (outra pessoa escreve pelo cliente)
-- não dá foto à ficha: a foto fica apenas na conversa (zap_conversas.foto_url).
create or replace function public.zap_fone_de_outro(p_cliente uuid, p_tel text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from zap_conversas z
    where z.cliente_id = p_cliente and z.contato_nome is not null
      and length(regexp_replace(coalesce(p_tel,''),'\D','','g')) >= 8
      and right(regexp_replace(z.telefone,'\D','','g'),8) = right(regexp_replace(p_tel,'\D','','g'),8));
$$;
revoke execute on function public.zap_fone_de_outro(uuid, text) from public, anon;

create or replace function public.clientes_foto_de_quem_fala() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.foto_url is not null and zap_fone_de_outro(new.id, new.telefone) then new.foto_url := null; end if;
  return new;
end $$;
drop trigger if exists clientes_foto_de_quem_fala on clientes;
create trigger clientes_foto_de_quem_fala before insert or update of foto_url, telefone on clientes
  for each row execute function clientes_foto_de_quem_fala();

-- marcou na conversa que outra pessoa escreve: a foto sai da ficha
create or replace function public.zap_contato_tira_foto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.contato_nome is not null and new.cliente_id is not null then
    update clientes set foto_url = null
      where id = new.cliente_id and foto_url is not null and zap_fone_de_outro(id, telefone);
  end if;
  return new;
end $$;
drop trigger if exists zap_contato_tira_foto on zap_conversas;
create trigger zap_contato_tira_foto after insert or update of contato_nome, cliente_id on zap_conversas
  for each row execute function zap_contato_tira_foto();

update clientes c set foto_url = null where foto_url is not null and zap_fone_de_outro(c.id, c.telefone);
