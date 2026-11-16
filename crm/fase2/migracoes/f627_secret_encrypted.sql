-- F627 · as três mensagens "[mensagem de tipo secretEncrypted…]" eram edições cifradas de
-- mensagens de texto da mesma conversa (Baileys 7, MESSAGE_EDIT). A original passa a "editada"
-- na hora da edição e a linha sem conteúdo sai; cópia em _bkp_zap_secret_20261116.
-- destrutiva-confirmada: pedido do Paulo de 16.11.2026 ("Corrija esses erros do whatsapp"), 3 linhas sem conteúdo, com cópia.
create table if not exists public._bkp_zap_secret_20261116 as
  select * from public.zap_mensagens where texto like '[mensagem de tipo secretEncrypted%';
revoke all on public._bkp_zap_secret_20261116 from anon, authenticated;

update public.zap_mensagens o set editada_em = p.quando_wa
  from public.zap_mensagens p,
       (values ('7cd5894b-d403-40f7-8626-b010df5ab543'::uuid, 'e1c65127-bcd6-4977-9bf9-ce50c66f44d6'::uuid),
               ('9fd7111c-d46f-4f8d-8105-30dc9e6cd1de'::uuid, '3fca2b69-3e23-4c21-abe8-0080631af477'::uuid),
               ('effdf6f3-0ff6-4ec1-8ba2-fdf42af9c51b'::uuid, '825ed691-a056-4242-9d7e-b989c6346386'::uuid)) v(ph, orig)
 where p.id = v.ph and o.id = v.orig and p.texto like '[mensagem de tipo secretEncrypted%';

delete from public.zap_mensagens
 where id in ('7cd5894b-d403-40f7-8626-b010df5ab543', '9fd7111c-d46f-4f8d-8105-30dc9e6cd1de', 'effdf6f3-0ff6-4ec1-8ba2-fdf42af9c51b')
   and texto like '[mensagem de tipo secretEncrypted%';
