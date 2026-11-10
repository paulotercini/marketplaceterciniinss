-- F519 · as mensagens de ausência salvas (pedido do Paulo de 10.11.2026): cada texto que o
-- colaborador grava no Offline entra na lista dele (a mais recente primeiro, até 20, sem repetir),
-- para escolher de novo depois; o ✕ tira um texto da lista sem mexer na mensagem ativa.
alter table public.colaboradores add column if not exists zap_offline_salvas text[] not null default '{}';

create or replace function public.zap_meu_offline(p_offline boolean, p_msg text default null)
returns void language sql security definer set search_path to 'public' as $$
  update colaboradores
     set zap_offline_desde = case when p_offline then coalesce(zap_offline_desde, now()) end,
         zap_offline_msg = coalesce(nullif(trim(p_msg), ''), zap_offline_msg),
         zap_offline_salvas = case when nullif(trim(p_msg), '') is null then zap_offline_salvas
           else (array[trim(p_msg)] || array_remove(zap_offline_salvas, trim(p_msg)))[1:20] end
   where auth_id = auth.uid() and ativo
$$;
revoke execute on function public.zap_meu_offline(boolean, text) from public, anon;
grant execute on function public.zap_meu_offline(boolean, text) to authenticated;

create or replace function public.zap_offline_esquecer(p_msg text)
returns void language sql security definer set search_path to 'public' as $$
  update colaboradores set zap_offline_salvas = array_remove(zap_offline_salvas, p_msg)
   where auth_id = auth.uid() and ativo
$$;
revoke execute on function public.zap_offline_esquecer(text) from public, anon;
grant execute on function public.zap_offline_esquecer(text) to authenticated;

-- o texto ativo de cada um já entra salvo
update public.colaboradores set zap_offline_salvas = array[trim(zap_offline_msg)]
 where nullif(trim(zap_offline_msg), '') is not null and zap_offline_salvas = '{}';
