-- F422ak (pedido do Paulo de 09.11.2026): o cliente que pergunta pelo andamento do processo
-- recebe, para o colaborador, a sugestão de resposta montada pelo CRM: a fase, a etapa e os últimos andamentos
-- dos casos abertos da ficha. Vai a zap_conversas.sugestao_ia (F422af, Usar e Descartar acima do campo de
-- escrever, menção a quem atende); nada sai ao cliente. Uma chamada por conversa a cada 30 minutos.
alter table public.zap_conversas add column if not exists andamento_em timestamptz;
insert into public.config_app (chave, valor) values ('zap_andamento_ligado', 'sim') on conflict (chave) do nothing;

create or replace function public.zap_pede_andamento(p_txt text)
returns boolean language sql immutable as $$
  select lower(coalesce(p_txt, '')) ~ '\m(andamento|novidades?|not[ií]cias?|processo|como (est[aá]|anda|ficou) (o|meu|a|minha)|resposta do (inss|juiz))\M';
$$;

create or replace function public.zap_andamento_gatilho()
returns trigger language plpgsql security definer set search_path to 'public' as $$
declare c zap_conversas;
begin
  if new.direcao <> 'entrada' or not zap_pede_andamento(new.texto) then return null; end if;
  if tg_op = 'UPDATE' and coalesce(trim(old.texto), '') <> '' then return null; end if;   -- só o áudio que acabou de ser transcrito
  if coalesce((select valor from config_app where chave = 'zap_andamento_ligado'), 'nao') <> 'sim' then return null; end if;
  select * into c from zap_conversas where id = new.conversa_id;
  if c.cliente_id is null or c.automatica or coalesce(c.sem_ia, false) then return null; end if;
  if c.andamento_em > now() - interval '30 minutes' then return null; end if;
  if not exists (select 1 from casos k where k.cliente_id = c.cliente_id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false)) then
    return null;
  end if;
  perform set_config('zap.via_funcao', '1', true);
  update zap_conversas set andamento_em = now() where id = c.id;
  perform net.http_post(
    url := (select valor from config_app where chave = 'zap_plantao_url'),
    body := jsonb_build_object('andamento', new.id),
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 90000);
  return null;
exception when others then return null;
end $$;

drop trigger if exists zap_t_andamento_ins on public.zap_mensagens;
create trigger zap_t_andamento_ins after insert or update of texto on public.zap_mensagens
  for each row execute function public.zap_andamento_gatilho();

create or replace function public.zap_andamento_pegar(p_msg uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare m zap_mensagens; c zap_conversas; cl clientes;
begin
  select * into m from zap_mensagens where id = p_msg;
  if not found then return null; end if;
  select * into c from zap_conversas where id = m.conversa_id;
  select * into cl from clientes where id = c.cliente_id;
  if cl.id is null then return null; end if;
  return jsonb_build_object(
    'conversa_id', c.id,
    'contato', coalesce(nullif(trim(c.contato_nome), ''), nullif(trim(c.nome_perfil), ''), ''),
    'relacao', nullif(trim(c.contato_relacao), ''),
    'cliente', cl.nome,
    'casos', (select coalesce(jsonb_agg(jsonb_build_object(
                 'beneficio', coalesce(nullif(trim(k.beneficio), ''), k.titulo), 'fase', k.fase, 'etapa', k.etapa,
                 'etapa_sugerida', k.trilha->'velha'->>'proposta', 'etapa_sugerida_desde', k.trilha->'velha'->>'data',
                 'andamentos', (select coalesce(jsonb_agg(jsonb_build_object('em', a.criado_em, 'origem', a.origem,
                                   'texto', left(a.texto, 400)) order by a.criado_em desc), '[]'::jsonb)
                                  from (select * from andamentos a where a.caso_id = k.id and not coalesce(a.excluir, false)
                                         order by a.criado_em desc limit 8) a)
               ) order by k.criado_em), '[]'::jsonb)
                from casos k where k.cliente_id = cl.id and k.fase <> 'encerrado' and not coalesce(k.pre_caso, false)),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object('direcao', x.direcao, 'por_bot', x.por_bot,
                    'tipo', x.tipo, 'texto', x.texto, 'momento', x.momento) order by x.momento, x.seq), '[]'::jsonb)
                    from (select * from zap_mensagens where conversa_id = c.id and direcao in ('entrada', 'saida')
                            and momento <= m.momento order by momento desc, seq desc limit 20) x));
end $$;

create or replace function public.zap_andamento_gravar(p_conversa uuid, p_texto text)
returns boolean language plpgsql security definer set search_path to 'public' as $$
begin
  if trim(coalesce(p_texto, '')) = '' then return false; end if;
  perform zap_sugestao_ia(p_conversa, p_texto, false);
  return true;
end $$;

revoke execute on function public.zap_andamento_pegar(uuid), public.zap_andamento_gravar(uuid, text),
  public.zap_andamento_gatilho() from public, anon, authenticated;
grant execute on function public.zap_andamento_pegar(uuid), public.zap_andamento_gravar(uuid, text) to service_role;
