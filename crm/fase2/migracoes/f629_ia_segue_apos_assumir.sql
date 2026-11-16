-- F629 · assumir não interrompe a IA (ordem do Paulo de 16.11.2026: "O certo é a IA atender e agendar o horário").
-- Na conversa que a IA conduz (plantao.modo conversa ou lead), o Assumir da equipe não transforma mais a
-- resposta dela em sugestão (F422ae): a IA continua respondendo e agendando até alguém da equipe escrever ao
-- cliente depois do início do ciclo da IA (plantao.ia_desde, gravado quando o modo aparece; sem ele, a última
-- mensagem do robô ou da IA). Depois disso vale a F422ae. A confirmação de atendimento em curso fica como era.
-- Não destrutiva.

-- o ciclo da IA começa quando o modo aparece e termina quando ele sai (junto com a marca da F594)
create or replace function public.zap_plantao_sem_modo() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if new.plantao ? 'agendado_em' and not (new.plantao ? 'modo') then
    new.plantao := new.plantao - 'agendado_em';
  end if;
  if new.plantao ? 'modo' and not coalesce(old.plantao ? 'modo', false) then
    new.plantao := new.plantao || jsonb_build_object('ia_desde', now());
  elsif not (coalesce(new.plantao, '{}'::jsonb) ? 'modo') and new.plantao ? 'ia_desde' then
    new.plantao := new.plantao - 'ia_desde';
  end if;
  return new;
end $$;
revoke all on function public.zap_plantao_sem_modo() from public, anon, authenticated;

-- a IA segue com a conversa assumida? (usada pelo zap_plantao_aplicar e pela Edge Function zap_plantao)
create or replace function public.zap_ia_segue(p_conversa uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select coalesce(c.plantao->>'modo' in ('conversa', 'lead'), false)
     and coalesce(c.confirmacao->>'estado', '') not in ('aguardando', 'remarcando')
     and zap_equipe_escreveu(c.id, coalesce((c.plantao->>'ia_desde')::timestamptz,
           (select max(m.criado_em) from zap_mensagens m
             where m.conversa_id = c.id and m.direcao = 'saida' and m.por_bot))) is null
    from zap_conversas c where c.id = p_conversa
$$;
revoke execute on function public.zap_ia_segue(uuid) from public, anon, authenticated;
grant execute on function public.zap_ia_segue(uuid) to service_role;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure);
  n := replace(d, 'if c.atendente_id is not null
     and not coalesce((c.plantao->>''offline_ia'')',
    'if c.atendente_id is not null and not zap_ia_segue(c.id)
     and not coalesce((c.plantao->>''offline_ia'')');
  if n = d then raise exception 'F629: zap_plantao_aplicar mudou, exceção não aplicada'; end if;
  execute n;
end $$;
