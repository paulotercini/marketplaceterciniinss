-- F395 · o aviso do áudio mostra a transcrição (pedido do Paulo de 05.11.2026).
-- O áudio sem texto não avisa na chegada: avisa quando o transcrever.py grava o texto
-- (gatilho de UPDATE OF texto) ou, sem transcrição em 3 minutos, pelo zap_relogio, como antes.
create or replace function public.zap_push_chamar(mid uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from push_inscricoes) then return; end if;
  begin
    perform net.http_post(
      url := (select valor from config_app where chave = 'zap_push_url'),
      body := jsonb_build_object('mensagem_id', mid),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
end $$;
revoke execute on function public.zap_push_chamar(uuid) from public, anon, authenticated;

create or replace function public.zap_push_gatilho() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.direcao <> 'entrada' then return new; end if;
  if coalesce(new.quando_wa, now()) < now() - interval '10 minutes' then return new; end if;
  -- o áudio espera a transcrição (zap_push_transcrito) ou o relógio (zap_push_audios_vencidos)
  if new.tipo = 'audio' and nullif(trim(coalesce(new.texto, '')), '') is null then return new; end if;
  perform zap_push_chamar(new.id);
  return new;
end $$;

create or replace function public.zap_push_transcrito() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.push_em is null and nullif(trim(coalesce(old.texto, '')), '') is null
     and nullif(trim(coalesce(new.texto, '')), '') is not null then
    perform zap_push_chamar(new.id);
  end if;
  return new;
end $$;
drop trigger if exists zap_x_push_upd on public.zap_mensagens;
create trigger zap_x_push_upd after update of texto on public.zap_mensagens
  for each row when (new.direcao = 'entrada' and new.tipo = 'audio' and new.push_em is null)
  execute function zap_push_transcrito();

create or replace function public.zap_push_audios_vencidos() returns void
language plpgsql security definer set search_path to 'public' as $$
declare r record;
begin
  for r in select id from zap_mensagens
            where direcao = 'entrada' and tipo = 'audio' and push_em is null
              and nullif(trim(coalesce(texto, '')), '') is null
              and momento between now() - interval '10 minutes' and now() - interval '3 minutes' loop
    perform zap_push_chamar(r.id);
  end loop;
end $$;
revoke execute on function public.zap_push_audios_vencidos() from public, anon, authenticated;

create or replace function public.zap_relogio() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare n integer := 0; r record;
begin
  update zap_mensagens set status = 'fila'
   where status = 'agendada' and enviar_em <= now();
  get diagnostics n = row_count;
  for r in select z.id, z.conversa_id, coalesce(z.colaborador_id, c.atendente_id) quem, z.nota,
                  coalesce(nullif(trim(c.nome_perfil), ''), c.telefone) nome
             from zap_retornos z join zap_conversas c on c.id = z.conversa_id
            where z.feito_em is null and z.avisado_em is null and z.quando <= now() loop
    if r.quem is not null then
      insert into mencoes (para_id, conversa_id, texto)
      values (r.quem, r.conversa_id, '⏰ Retorno: responder ' || coalesce(r.nome, 'o contato')
              || coalesce(' — ' || nullif(trim(r.nota), ''), ''));
    end if;
    update zap_retornos set avisado_em = now() where id = r.id;
  end loop;
  perform zap_bot_esperas();
  perform zap_triagem_vencidas();
  perform zap_plantao_vencidas();
  perform zap_push_audios_vencidos();
  return n;
end $$;
