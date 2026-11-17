-- F635 · confirmação que não saiu (número sem WhatsApp): a equipe reenvia ao número correto.
-- Copia o texto e os dados da confirmação que falhou para a conversa do novo número.
create or replace function public.zap_conf_reenviar(p_msg uuid, p_telefone text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare m zap_mensagens; c zap_conversas; v_tel text := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g'); r text;
begin
  if not sou_ativo() then raise exception 'sem permissão'; end if;
  if length(v_tel) < 10 then raise exception 'telefone inválido'; end if;
  if length(v_tel) <= 11 then v_tel := '55' || v_tel; end if;
  select * into m from zap_mensagens where id = p_msg and aviso_chave like 'confirmacao:%';
  if m.id is null then raise exception 'não é mensagem de confirmação'; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.telefone = v_tel then raise exception 'é o mesmo número'; end if;
  r := zap_conf_enviar(v_tel, c.confirmacao->>'nome', m.texto,
         coalesce(c.confirmacao, '{}'::jsonb) - 'estado' - 'enviada_em' - 'nome');
  if r = 'enviada' then
    update zap_conversas set confirmacao = confirmacao || jsonb_build_object('estado', 'reenviada', 'para', v_tel)
     where id = c.id;
  end if;
  return r;
end $$;
revoke all on function public.zap_conf_reenviar(uuid, text) from public, anon;
grant execute on function public.zap_conf_reenviar(uuid, text) to authenticated, service_role;
