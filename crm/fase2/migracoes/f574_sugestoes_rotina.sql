-- F574 (decisões do Paulo de 13.11.2026): as sugestões da rotina das 05:00 e as sugestões de anotação.
-- Nada é enviado nem gravado no caso sem o clique de alguém da equipe.
--   tipo 'mensagem': a mensagem de iniciativa ao cliente (retorno ou tarefa vencendo hoje), escrita pela rotina,
--                    que também a põe em zap_conversas.sugestao_ia (modo iniciativa) quando o campo está livre.
--   tipo 'anotacao': a anotação sugerida no caso, acima do "Escrever no caso", fora do histórico; nasce da rotina
--                    (providência do escritório) ou, na hora, da mensagem que a equipe enviou ao cliente (zap_anotacao).
create table if not exists public.sugestoes_rotina (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('mensagem', 'anotacao')),
  origem text not null default 'rotina' check (origem in ('rotina', 'whatsapp')),
  chave text not null unique,
  cliente_id uuid references public.clientes(id) on delete cascade,
  caso_id uuid references public.casos(id) on delete cascade,
  conversa_id uuid references public.zap_conversas(id) on delete set null,
  msg_id uuid,
  texto text not null,
  motivo text,
  evento jsonb,
  estado text not null default 'aberta' check (estado in ('aberta', 'enviada', 'usada', 'descartada')),
  texto_final text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid references public.colaboradores(id) on delete set null
);
create index if not exists sugestoes_rotina_abertas on public.sugestoes_rotina (tipo, caso_id) where estado = 'aberta';
create index if not exists sugestoes_rotina_conversa on public.sugestoes_rotina (conversa_id) where estado = 'aberta';
create index if not exists sugestoes_rotina_dia on public.sugestoes_rotina (criado_em);

alter table public.sugestoes_rotina enable row level security;
drop policy if exists sug_ler on public.sugestoes_rotina;
create policy sug_ler on public.sugestoes_rotina for select to authenticated using ((select sou_ativo()));
drop policy if exists sug_mudar on public.sugestoes_rotina;
create policy sug_mudar on public.sugestoes_rotina for update to authenticated
  using ((select sou_ativo())) with check ((select sou_ativo()));
grant select, update on public.sugestoes_rotina to authenticated;

insert into public.config_app (chave, valor) values
  ('zap_iniciativa_ligada', 'nao'),
  ('zap_anotacao_ligada', 'sim'),
  ('zap_anotacao_url', 'https://bhdyatqaebpzufridwkh.supabase.co/functions/v1/zap_anotacao')
on conflict (chave) do nothing;

-- Grava ou atualiza uma sugestão pela chave. A decidida (enviada, usada, descartada) não volta.
-- p: {tipo, origem, chave, cliente_id, caso_id, conversa_id, msg_id, texto, motivo, evento}
create or replace function public.rotina_sugerir(p jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_txt text := left(trim(coalesce(p->>'texto', '')), 1500); v_conv uuid := nullif(p->>'conversa_id', '')::uuid;
begin
  if v_txt = '' or coalesce(p->>'chave', '') = '' then return null; end if;
  insert into sugestoes_rotina (tipo, origem, chave, cliente_id, caso_id, conversa_id, msg_id, texto, motivo, evento)
  values (p->>'tipo', coalesce(p->>'origem', 'rotina'), p->>'chave', nullif(p->>'cliente_id', '')::uuid,
          nullif(p->>'caso_id', '')::uuid, v_conv, nullif(p->>'msg_id', '')::uuid, v_txt,
          nullif(trim(coalesce(p->>'motivo', '')), ''), case when jsonb_typeof(p->'evento') = 'object' then p->'evento' end)
  on conflict (chave) do update set texto = excluded.texto, motivo = excluded.motivo, evento = excluded.evento,
     caso_id = coalesce(excluded.caso_id, sugestoes_rotina.caso_id), msg_id = excluded.msg_id, atualizado_em = now()
   where sugestoes_rotina.estado = 'aberta'
  returning id into v_id;
  if v_id is not null and p->>'tipo' = 'mensagem' and v_conv is not null then
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set sugestao_ia = jsonb_build_object('texto', v_txt, 'em', now(), 'urgente', false,
             'modo', 'iniciativa', 'sugestao_id', v_id)
     where id = v_conv and sugestao_ia is null;
  end if;
  return v_id;
end $$;
revoke execute on function public.rotina_sugerir(jsonb) from public, anon, authenticated;

-- O que a Edge Function zap_anotacao precisa para resumir a mensagem enviada: só o texto da equipe (nunca a fala
-- do cliente), quem enviou, os casos abertos do cliente e a sugestão ainda aberta da mesma meia hora, para juntar.
create or replace function public.zap_anotacao_pegar(p_msg uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare m zap_mensagens; c zap_conversas; v_chave text;
begin
  select * into m from zap_mensagens where id = p_msg;
  if not found or m.direcao <> 'saida' or coalesce(m.por_bot, false) or coalesce(trim(m.texto), '') = '' then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  if c.cliente_id is null then return null; end if;
  v_chave := 'whatsapp:' || c.id || ':' || floor(extract(epoch from coalesce(m.criado_em, now())) / 1800)::bigint;
  return jsonb_build_object(
    'msg_id', m.id, 'conversa_id', c.id, 'cliente_id', c.cliente_id, 'chave', v_chave,
    'texto', m.texto,
    'data', to_char(coalesce(m.criado_em, now()) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD'),
    'cliente', (select nome from clientes where id = c.cliente_id),
    'autor', (select nome from colaboradores where id = m.autor_id),
    'casos', (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'beneficio', k.beneficio, 'fase', k.fase,
                                    'etapa', k.etapa, 'apelido', k.apelido)), '[]'::jsonb)
                from casos k where k.cliente_id = c.cliente_id and k.fase <> 'encerrado'),
    'anterior', (select s.texto from sugestoes_rotina s where s.chave = v_chave and s.estado = 'aberta'));
end $$;
revoke execute on function public.zap_anotacao_pegar(uuid) from public, anon, authenticated;

-- Mensagem da equipe enviada ao cliente com ficha: pede a sugestão de anotação, na hora.
create or replace function public.zap_anotacao_gatilho() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.direcao = 'saida' and not coalesce(new.por_bot, false) and new.aviso_chave is null and new.bot_ia is null
     and coalesce(new.status, '') not in ('rascunho', 'agendada', 'interna')
     and length(trim(coalesce(new.texto, ''))) >= 25
     and coalesce(new.quando_wa, new.criado_em, now()) > now() - interval '10 minutes'
     and coalesce((select valor from config_app where chave = 'zap_anotacao_ligada'), 'nao') = 'sim'
     and exists (select 1 from zap_conversas c where c.id = new.conversa_id and c.cliente_id is not null) then
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_anotacao_url'),
                            body := jsonb_build_object('mensagem_id', new.id),
                            headers := zap_fn_cabecalho(), timeout_milliseconds := 20000);
    exception when others then null;
    end;
  end if;
  return new;
end $$;
revoke execute on function public.zap_anotacao_gatilho() from public, anon, authenticated;

create or replace trigger zap_s_anotacao_ins after insert on public.zap_mensagens
  for each row execute function public.zap_anotacao_gatilho();

-- A mensagem enviada pela equipe (CRM ou celular) encerra a sugestão da conversa e marca como enviada
-- a mensagem de iniciativa ainda aberta, com o texto que de fato saiu (base do aprendizado da rotina).
create or replace function public.zap_sugestao_limpa() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.direcao = 'saida' and not coalesce(new.por_bot, false) then
    perform set_config('zap.via_funcao', '1', true);
    update zap_conversas set sugestao_ia = null where id = new.conversa_id and sugestao_ia is not null;
    update sugestoes_rotina set estado = 'enviada', texto_final = new.texto, decidido_em = now(), decidido_por = new.autor_id
     where conversa_id = new.conversa_id and tipo = 'mensagem' and estado = 'aberta';
  end if;
  return new;
end $$;
revoke execute on function public.zap_sugestao_limpa() from public, anon;
