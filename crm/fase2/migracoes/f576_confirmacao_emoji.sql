-- F576 (pedido do Paulo de 13.11.2026): o cliente que confirma o atendimento com emoji.
-- 1) A mensagem só com emoji afirmativo (👍 ✅ 👌 🙏 etc., em qualquer tom de pele e repetido) é SIM.
-- 2) A REAÇÃO do cliente com emoji afirmativo à mensagem de confirmação também é SIM e segue o
--    mesmo caminho: estado 'sim' com pedido de uso único e a Edge Function zap_confirmacao confirma a agenda.
-- Emoji negativo (👎 ❌ 😢) ou misturado com texto que não é afirmação não confirma.

create or replace function public.zap_conf_emoji(p text) returns text
language sql immutable as $$
  select case when s <> '' and translate(s, '👍👌✅✔☑🙏👏🤝🆗💯🙂😊😀😃😄😁❤♥', '') = '' then 'sim' end
    from (select regexp_replace(coalesce(p, ''), '[\s️‍\U0001F3FB-\U0001F3FF]', '', 'g') s) x;
$$;

-- o corpo da f502, com o emoji afirmativo antes de tudo
create or replace function public.zap_conf_classe(p_txt text) returns text
language sql immutable as $$
  select case
    when zap_conf_emoji(p_txt) = 'sim' then 'sim'
    when t ~ '(remarc|desmarc|cancel|^n(ao)?\M|nao (vou|posso|poderei|consigo|da|estarei|irei)|outro (dia|horario)|ocupad|compromisso|imprevisto|impossibilit)' then 'nao'
    when length(t) <= 40 and t ~ '^(s|ss|si|sin|cim|sim+|ok|okay|certo|combinado|confirm\w*|claro|pode ser|positivo|estarei (la|presente|ai)|vou sim|irei sim|👍)([ ,.!]|$)' then 'sim'
    else 'duvida' end
  from (select lower(translate(trim(coalesce(p_txt, '')), 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) t) x;
$$;

create or replace function public.zap_conf_reacao() returns trigger
language plpgsql security definer set search_path = public as $$
declare m zap_mensagens; c zap_conversas; v_pedido text := gen_random_uuid()::text;
begin
  if new.de <> 'cliente' or zap_conf_emoji(new.emoji) is distinct from 'sim' then return new; end if;
  select * into m from zap_mensagens where id = new.mensagem_id;
  if not found or m.direcao <> 'saida' then return new; end if;
  select * into c from zap_conversas where id = m.conversa_id for update;
  if not found or c.confirmacao is null or not zap_conf_espera(c)
     or coalesce(m.aviso_chave, '') not in ('confirmacao:' || (c.confirmacao->>'evento'), 'confirmacao2:' || (c.confirmacao->>'evento')) then
    return new;
  end if;
  update zap_conversas set confirmacao = confirmacao || jsonb_build_object(
      'respondida_em', now(), 'resposta', '[reação ' || new.emoji || ']',
      'estado', 'sim', 'pedido', v_pedido, 'ler', false, 'duvida', false)
   where id = c.id;
  perform zap_nota_sistema(c.id, null, '📅 O cliente confirmou o atendimento com a reação ' || new.emoji || '.');
  begin
    perform net.http_post(url := (select valor from config_app where chave = 'zap_conf_url'),
      body := jsonb_build_object('acao', 'confirmar', 'conversa_id', c.id, 'pedido', v_pedido),
      headers := zap_fn_cabecalho(), timeout_milliseconds := 30000);
  exception when others then
    perform zap_conf_avisar(c.id, '📅 O cliente confirmou com a reação ' || new.emoji || ' o atendimento de '
      || (c.confirmacao->>'rotulo') || ', mas a agenda não foi atualizada. Confirme à mão.');
  end;
  return new;
end $$;

drop trigger if exists zap_conf_reacao on public.zap_reacoes;
create trigger zap_conf_reacao after insert or update of emoji on public.zap_reacoes
  for each row execute function public.zap_conf_reacao();

revoke all on function public.zap_conf_reacao() from public, anon, authenticated;
revoke execute on function public.zap_conf_emoji(text) from anon;
