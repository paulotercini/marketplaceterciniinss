-- F422af (pedido do Paulo de 09.11.2026): a sugestão da IA na conversa assumida aparece
-- logo acima do campo de escrever, editável, e não mais como nota interna.
alter table public.zap_conversas add column if not exists sugestao_ia jsonb;

create or replace function public.zap_sugestao_ia(p_conversa uuid, p_txt text, p_urgente boolean default false)
returns void language plpgsql security definer set search_path to 'public' as $$
declare c zap_conversas;
        v_claude uuid := (select id from colaboradores where papel = 'assistente_ia' and ativo order by nome limit 1);
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found or trim(coalesce(p_txt, '')) = '' then return; end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set sugestao_ia = jsonb_build_object('texto', left(trim(p_txt), 1500), 'em', now(), 'urgente', coalesce(p_urgente, false))
   where id = c.id;
  if c.atendente_id is not null then
    insert into mencoes (de_id, para_id, conversa_id, texto)
    values (v_claude, c.atendente_id, c.id,
            case when p_urgente then '⚠ URGENTE · ' else '' end || '💡 Sugestão de resposta para '
            || coalesce(nullif(trim(c.nome_perfil), ''), c.telefone, 'o cliente') || ', acima do campo de escrever da conversa');
  end if;
end $$;

-- A mensagem enviada pela equipe (CRM ou celular) encerra a sugestão.
create or replace function public.zap_sugestao_limpa() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.direcao = 'saida' and not coalesce(new.por_bot, false) then
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set sugestao_ia = null where id = new.conversa_id and sugestao_ia is not null;
  end if;
  return new;
end $$;
revoke execute on function public.zap_sugestao_limpa() from public, anon;

create or replace trigger zap_u_sugestao_ins after insert on public.zap_mensagens
  for each row execute function public.zap_sugestao_limpa();
