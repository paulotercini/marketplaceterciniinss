-- Auditoria de 27.11.2026, item 9b (ordem do Paulo): "Este telefone é de" na ficha do cliente. O CRM grava a relação
-- no telefone da lista (clientes.telefones[i].de: próprio, mãe, filho(a), cônjuge, outro; de_nome: o nome da pessoa)
-- e atualiza as conversas que já existem. Este gatilho cobre a conversa que nasce depois (ou que é ligada ao cliente
-- depois): preenche o quem conversa (contato_nome, contato_relacao), que a IA do WhatsApp já lê para não se dirigir
-- ao titular. Só preenche o que está vazio; nada se apaga.
create or replace function public.zap_conversa_tel_de() returns trigger
language plpgsql security definer set search_path = public as $$
declare t jsonb;
begin
  if new.cliente_id is null or coalesce(btrim(new.contato_relacao), '') <> '' then return new; end if;
  if tg_op = 'UPDATE' and new.cliente_id is not distinct from old.cliente_id then return new; end if;
  select v into t
    from clientes cl,
         jsonb_array_elements(case when jsonb_typeof(cl.telefones) = 'array' and jsonb_array_length(cl.telefones) > 0
                                   then cl.telefones when jsonb_typeof(cl.campos -> 'telefones') = 'array'
                                   then cl.campos -> 'telefones' else '[]'::jsonb end) as x(v)
   where cl.id = new.cliente_id and jsonb_typeof(v) = 'object'
     and fone_chave(v ->> 'numero') = fone_chave(new.telefone)
     and coalesce(v ->> 'de', '') not in ('', 'próprio')
   limit 1;
  if t is null then return new; end if;
  new.contato_relacao := case when t ->> 'de' = 'outro' then 'outra pessoa' else t ->> 'de' end;
  new.contato_nome := coalesce(nullif(btrim(new.contato_nome), ''), nullif(btrim(t ->> 'de_nome'), ''),
                               nullif(btrim(new.nome_perfil), ''), t ->> 'de');
  return new;
exception when others then
  return new;   -- a mensagem que chega nunca pode cair por causa deste preenchimento
end $$;
revoke all on function public.zap_conversa_tel_de() from public, anon, authenticated;

drop trigger if exists zap_conversa_tel_de on public.zap_conversas;
create trigger zap_conversa_tel_de before insert or update of cliente_id on public.zap_conversas
  for each row execute function public.zap_conversa_tel_de();
