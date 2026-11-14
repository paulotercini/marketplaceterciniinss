-- F588 · Colaborador Claude: tudo o que ele produz fica em pré-gravação (sugestoes_rotina, origem 'colaborador')
-- e só entra no caso com o ok do Paulo ou do revisor indicado. Nada é enviado ao cliente por aqui.

alter table public.sugestoes_rotina add column if not exists dados jsonb not null default '{}'::jsonb;

alter table public.sugestoes_rotina drop constraint if exists sugestoes_rotina_tipo_check;
alter table public.sugestoes_rotina add constraint sugestoes_rotina_tipo_check
  check (tipo in ('mensagem','anotacao','tarefa','peca','analise','prazo_ia','regra','resumo','memoria'));
alter table public.sugestoes_rotina drop constraint if exists sugestoes_rotina_origem_check;
alter table public.sugestoes_rotina add constraint sugestoes_rotina_origem_check
  check (origem in ('rotina','whatsapp','colaborador'));
alter table public.sugestoes_rotina drop constraint if exists sugestoes_rotina_estado_check;
alter table public.sugestoes_rotina add constraint sugestoes_rotina_estado_check
  check (estado in ('aberta','enviada','usada','descartada','aprovada'));

create index if not exists sugestoes_rotina_colab on public.sugestoes_rotina (estado, criado_em desc) where origem = 'colaborador';

-- A linha do colaborador só é decidida pelo administrador ou pelo revisor indicado em dados.revisor.
drop policy if exists sug_colab_decide on public.sugestoes_rotina;
create policy sug_colab_decide on public.sugestoes_rotina as restrictive for update to authenticated
  using (origem <> 'colaborador' or (select sou_admin())
         or dados->>'revisor' = (select c.id::text from public.colaboradores c where c.auth_id = auth.uid() and c.ativo))
  with check (origem <> 'colaborador' or (select sou_admin())
         or dados->>'revisor' = (select c.id::text from public.colaboradores c where c.auth_id = auth.uid() and c.ativo));

-- A rotina grava por aqui (conector do banco). O navegador não chama.
create or replace function public.colab_pregravar(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tipo text := p->>'tipo';
  v_chave text := nullif(trim(p->>'chave'), '');
  v_texto text := left(nullif(trim(p->>'texto'), ''), 60000);
  v_caso uuid := nullif(p->>'caso_id', '')::uuid;
  v_cli uuid := nullif(p->>'cliente_id', '')::uuid;
  v_id uuid;
begin
  if v_tipo is null or v_tipo not in ('anotacao','tarefa','peca','analise','prazo_ia','regra','resumo','memoria') then
    raise exception 'tipo inválido: %', v_tipo;
  end if;
  if v_chave is null then raise exception 'chave obrigatória'; end if;
  if v_texto is null then raise exception 'texto obrigatório'; end if;
  if v_tipo in ('anotacao','tarefa','prazo_ia') and v_caso is null then raise exception 'caso_id obrigatório para %', v_tipo; end if;
  if v_caso is not null and v_cli is null then select k.cliente_id into v_cli from casos k where k.id = v_caso; end if;
  insert into sugestoes_rotina (tipo, origem, chave, cliente_id, caso_id, texto, motivo, dados)
  values (v_tipo, 'colaborador', v_chave, v_cli, v_caso, v_texto, left(p->>'motivo', 1000), coalesce(p->'dados', '{}'::jsonb))
  on conflict (chave) do update
    set texto = excluded.texto, motivo = excluded.motivo, dados = excluded.dados, atualizado_em = now()
    where sugestoes_rotina.estado = 'aberta'
  returning id into v_id;
  return v_id;  -- nulo: a chave já foi decidida, e o decidido não se reescreve
end $$;
revoke all on function public.colab_pregravar(jsonb) from public, anon, authenticated;
grant execute on function public.colab_pregravar(jsonb) to service_role;

-- O ok: leva a pré-gravação ao caso. Prazo da IA nunca vira o carimbo de prazo fatal (F530).
create or replace function public.colab_aprovar(p_id uuid, p_texto text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_eu uuid;
  v_claude uuid;
  v_s sugestoes_rotina%rowtype;
  v_txt text;
  v_and uuid;
  v_para uuid;
  v_data date;
  v_tit text;
begin
  select c.id into v_eu from colaboradores c where c.auth_id = auth.uid() and c.ativo;
  if v_eu is null then raise exception 'sem permissão'; end if;
  select * into v_s from sugestoes_rotina s where s.id = p_id and s.origem = 'colaborador' and s.estado = 'aberta' for update;
  if not found then raise exception 'pré-gravação não encontrada ou já decidida'; end if;
  if not (sou_admin() or v_s.dados->>'revisor' = v_eu::text) then raise exception 'sem permissão'; end if;
  if v_s.tipo in ('memoria','resumo') then raise exception 'este tipo não se aprova'; end if;
  select c.id into v_claude from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1;
  v_txt := coalesce(nullif(trim(p_texto), ''), v_s.texto);
  v_para := coalesce(nullif(v_s.dados->>'para', '')::uuid, v_claude);
  v_data := coalesce(nullif(v_s.dados->>'data', '')::date, current_date);
  v_tit := nullif(v_s.dados->>'titulo', '');

  if v_s.caso_id is not null and v_s.tipo <> 'regra' then
    insert into andamentos (caso_id, texto, autor_id, origem, origem_id)
    values (v_s.caso_id,
      case v_s.tipo
        when 'prazo_ia' then 'Prazo da IA ' || to_char(v_data, 'DD/MM/YYYY') || ': ' || v_txt
        when 'peca' then coalesce(v_tit, 'Peça') || ' (colaborador Claude)' || coalesce(E'\n' || nullif(v_s.dados->>'link', ''), '') || E'\n' || left(v_txt, 1500)
        when 'analise' then coalesce(v_tit, 'Análise') || ' (colaborador Claude)' || coalesce(E'\n' || nullif(v_s.dados->>'link', ''), '') || E'\n' || left(v_txt, 1500)
        else v_txt end,
      v_claude, 'app', 'colab:' || v_s.id)
    returning id into v_and;
    if v_s.tipo = 'tarefa' then
      insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em, natureza, papel, atribuido_por)
      values (v_and, v_s.caso_id, v_para, v_data,
        case when v_s.dados->>'natureza' = 'lembrete' then 'lembrete' else 'compromisso' end, 'executa', v_claude);
    elsif v_s.tipo = 'prazo_ia' then
      insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em, natureza, papel, atribuido_por)
      values (v_and, v_s.caso_id, coalesce(nullif(v_s.dados->>'para', '')::uuid, v_eu), v_data, 'lembrete', 'executa', v_claude);
    end if;
  end if;

  update sugestoes_rotina set estado = 'aprovada', texto_final = v_txt, decidido_em = now(), decidido_por = v_eu, atualizado_em = now()
  where id = p_id;
  return jsonb_build_object('andamento_id', v_and);
end $$;
revoke all on function public.colab_aprovar(uuid, text) from public, anon;
grant execute on function public.colab_aprovar(uuid, text) to authenticated, service_role;

-- Regra escrita pelo Paulo no caderno (o navegador não tem INSERT na tabela).
create or replace function public.colab_regra(p_texto text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_eu uuid; v_id uuid;
begin
  if not sou_admin() then raise exception 'sem permissão'; end if;
  if nullif(trim(p_texto), '') is null then raise exception 'texto obrigatório'; end if;
  select c.id into v_eu from colaboradores c where c.auth_id = auth.uid() and c.ativo;
  insert into sugestoes_rotina (tipo, origem, chave, texto, estado, texto_final, decidido_em, decidido_por)
  values ('regra', 'colaborador', 'regra:' || gen_random_uuid(), left(trim(p_texto), 4000), 'aprovada', left(trim(p_texto), 4000), now(), v_eu)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.colab_regra(text) from public, anon;
grant execute on function public.colab_regra(text) to authenticated, service_role;

-- Fila de eventos: o que aconteceu no CRM e pede o colaborador.
create table if not exists public.colaborador_fila (
  id bigint generated always as identity primary key,
  tipo text not null,
  caso_id uuid references public.casos(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete cascade,
  ref text,
  criado_em timestamptz not null default now(),
  feito_em timestamptz,
  resultado text
);
create unique index if not exists colaborador_fila_aberta on public.colaborador_fila (caso_id, tipo) where feito_em is null and caso_id is not null;
alter table public.colaborador_fila enable row level security;
revoke all on public.colaborador_fila from anon;
drop policy if exists fila_ler on public.colaborador_fila;
create policy fila_ler on public.colaborador_fila for select to authenticated using ((select sou_ativo()));

-- O gatilho nunca aborta a gravação de quem o disparou.
create or replace function public.colab_enfileirar() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_tipo text; v_caso uuid; v_cli uuid; v_ref text;
begin
  begin
    if tg_table_name = 'andamentos' then
      if new.origem in ('pat','pje','crps') then v_tipo := 'movimento'; v_caso := new.caso_id; v_ref := new.id::text; end if;
    elsif tg_table_name = 'eventos' then
      v_tipo := 'pericia'; v_caso := new.caso_id; v_ref := new.id::text;
    elsif tg_table_name = 'anexos' then
      if new.origem = 'transcricao' then v_tipo := 'atendimento'; v_caso := new.caso_id; v_cli := new.cliente_id; v_ref := new.id::text; end if;
    elsif tg_table_name = 'andamento_tarefas' then
      if new.colaborador_id = (select c.id from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1) then
        v_tipo := 'tarefa'; v_caso := new.caso_id; v_ref := new.id::text;
      end if;
    end if;
    if v_tipo is not null then
      insert into colaborador_fila (tipo, caso_id, cliente_id, ref) values (v_tipo, v_caso, v_cli, v_ref) on conflict do nothing;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
revoke all on function public.colab_enfileirar() from public, anon, authenticated;

drop trigger if exists colab_fila_and on public.andamentos;
create trigger colab_fila_and after insert on public.andamentos for each row execute function public.colab_enfileirar();
drop trigger if exists colab_fila_ev on public.eventos;
create trigger colab_fila_ev after insert on public.eventos for each row execute function public.colab_enfileirar();
drop trigger if exists colab_fila_anx on public.anexos;
create trigger colab_fila_anx after insert on public.anexos for each row execute function public.colab_enfileirar();
drop trigger if exists colab_fila_tf on public.andamento_tarefas;
create trigger colab_fila_tf after insert on public.andamento_tarefas for each row execute function public.colab_enfileirar();

-- 05:30: o resumo que a rotina da madrugada deixou vira menção aos administradores.
create or replace function public.colab_resumo_vez() returns int
language plpgsql security definer set search_path = public as $$
declare v_claude uuid; v_s record; v_n int := 0;
begin
  select c.id into v_claude from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1;
  if v_claude is null then return 0; end if;
  for v_s in select s.id, s.texto from sugestoes_rotina s
             where s.origem = 'colaborador' and s.tipo = 'resumo' and s.estado = 'aberta' and s.criado_em > now() - interval '20 hours'
  loop
    insert into mencoes (de_id, para_id, texto)
    select v_claude, c.id, 'Resumo do colaborador Claude: ' || left(v_s.texto, 600)
    from colaboradores c where c.papel = 'admin' and c.ativo;
    update sugestoes_rotina set estado = 'enviada', decidido_em = now(), atualizado_em = now() where id = v_s.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.colab_resumo_vez() from public, anon, authenticated;
grant execute on function public.colab_resumo_vez() to service_role;

do $$ begin
  perform cron.unschedule('colab-resumo') where exists (select 1 from cron.job where jobname = 'colab-resumo');
  perform cron.schedule('colab-resumo', '30 8 * * *', 'select public.colab_resumo_vez()');
end $$;
