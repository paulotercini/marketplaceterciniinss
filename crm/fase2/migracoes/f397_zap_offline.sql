-- F397 · Online e Offline no WhatsApp (pedido do Paulo de 05.11.2026): o colaborador offline
-- responde, uma vez por conversa em cada período offline, a mensagem do contato que ele assumiu,
-- com o texto que ele mesmo escreveu (zap_offline_msg; vazio, vale o padrão).
alter table public.colaboradores add column if not exists zap_offline_desde timestamptz;
alter table public.colaboradores add column if not exists zap_offline_msg text;
alter table public.zap_conversas add column if not exists offline_aviso_em timestamptz;

-- cada um liga e desliga o próprio estado e guarda o próprio texto
create or replace function public.zap_meu_offline(p_offline boolean, p_msg text default null)
returns void language sql security definer set search_path to 'public' as $$
  update colaboradores
     set zap_offline_desde = case when p_offline then coalesce(zap_offline_desde, now()) end,
         zap_offline_msg = coalesce(nullif(trim(p_msg), ''), zap_offline_msg)
   where auth_id = auth.uid() and ativo
$$;
revoke execute on function public.zap_meu_offline(boolean, text) from public, anon;
grant execute on function public.zap_meu_offline(boolean, text) to authenticated;

create or replace function public.zap_offline_padrao(p_nome text) returns text
language sql immutable as $$
  select 'Olá! ' || coalesce(nullif(split_part(trim(p_nome), ' ', 1), ''), 'Quem atende você')
      || ' está fora do atendimento no momento e responderá a sua mensagem assim que retornar.'
$$;

create or replace function public.zap_offline_gatilho() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare c record;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, k.zap_offline_desde, k.zap_offline_msg, k.nome
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then return new; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome)), 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  return new;
end $$;
drop trigger if exists zap_y_offline_ins on public.zap_mensagens;
create trigger zap_y_offline_ins after insert on public.zap_mensagens
  for each row when (new.direcao = 'entrada') execute function zap_offline_gatilho();
