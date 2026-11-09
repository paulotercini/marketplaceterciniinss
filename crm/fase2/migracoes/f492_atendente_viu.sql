-- F492 · quem atende já viu a mensagem? (pedido do Paulo de 09.11.2026, casos da Jesuína e da Rosângela)
-- ultima_entrada_em: a última mensagem do cliente; ultima_resposta_em: a última resposta da equipe (CRM ou celular,
-- sem robô, IA e aviso automático); atendente_viu_em: quando quem atende abriu a conversa no CRM. Troca de atendente zera.
alter table public.zap_conversas
  add column if not exists ultima_entrada_em timestamptz,
  add column if not exists ultima_resposta_em timestamptz,
  add column if not exists atendente_viu_em timestamptz;

create or replace function public.zap_marcas_conversa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direcao = 'entrada' then
    update zap_conversas set ultima_entrada_em = greatest(coalesce(ultima_entrada_em, new.criado_em), new.criado_em)
     where id = new.conversa_id;
  elsif new.direcao = 'saida' and not coalesce(new.por_bot, false) and new.aviso_chave is null
        and coalesce(new.status, '') not in ('rascunho', 'agendada') then
    update zap_conversas set ultima_resposta_em = greatest(coalesce(ultima_resposta_em, new.criado_em), new.criado_em)
     where id = new.conversa_id;
  end if;
  return null;
end $$;
revoke execute on function public.zap_marcas_conversa() from public, anon;

create or replace trigger zap_v_marcas_ins after insert on public.zap_mensagens
  for each row execute function public.zap_marcas_conversa();

create or replace function public.zap_atendente_zera_visto() returns trigger
language plpgsql as $$
begin
  if new.atendente_id is distinct from old.atendente_id then new.atendente_viu_em := null; end if;
  return new;
end $$;
revoke execute on function public.zap_atendente_zera_visto() from public, anon;

create or replace trigger zap_atendente_visto before update of atendente_id on public.zap_conversas
  for each row execute function public.zap_atendente_zera_visto();

update public.zap_conversas c set
  ultima_entrada_em = (select max(m.criado_em) from zap_mensagens m where m.conversa_id = c.id and m.direcao = 'entrada'),
  ultima_resposta_em = (select max(m.criado_em) from zap_mensagens m where m.conversa_id = c.id and m.direcao = 'saida'
                          and not coalesce(m.por_bot, false) and m.aviso_chave is null
                          and coalesce(m.status, '') not in ('rascunho', 'agendada'))
 where c.status = 'aberta';
