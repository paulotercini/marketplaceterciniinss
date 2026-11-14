-- destrutiva-confirmada: Paulo, 14.11.2026 12:24 UTC ("Autorizo a exclusão prevista na F589")
-- F589 · Colaborador Claude grava direto o que é interno (decisão do Paulo de 14.11.2026, "interno direto,
-- externo com o senhor"): anotação, tarefa interna e Prazo da IA entram no caso na hora, com desfazer.
-- Peça, análise, mensagem ao cliente, protocolo e prazo fatal continuam esperando o ok (colab_pregravar).

-- Núcleo comum: leva a pré-gravação ao caso. Sem grant: só as funções abaixo o chamam.
create or replace function public.colab_levar(p_id uuid, p_txt text, p_decisor uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_claude uuid;
  v_s sugestoes_rotina%rowtype;
  v_txt text;
  v_and uuid;
  v_para uuid;
  v_data date;
  v_tit text;
begin
  select * into v_s from sugestoes_rotina s where s.id = p_id and s.origem = 'colaborador' and s.estado = 'aberta' for update;
  if not found then raise exception 'pré-gravação não encontrada ou já decidida'; end if;
  if v_s.tipo in ('memoria','resumo') then raise exception 'este tipo não se aprova'; end if;
  select c.id into v_claude from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1;
  v_txt := coalesce(nullif(trim(p_txt), ''), v_s.texto);
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
      -- o lembrete vai a quem foi indicado; sem indicação, a quem aprovou ou, na gravação direta, ao advogado do cliente
      insert into andamento_tarefas (andamento_id, caso_id, colaborador_id, lembrar_em, natureza, papel, atribuido_por)
      values (v_and, v_s.caso_id,
        coalesce(nullif(v_s.dados->>'para', '')::uuid,
          case when p_decisor is distinct from v_claude then p_decisor end,
          (select a.id from clientes cl join colaboradores a on a.id::text = cl.campos->>'advogado_id' and a.ativo
            where cl.id = (select k.cliente_id from casos k where k.id = v_s.caso_id)),
          (select c.id from colaboradores c where c.papel = 'admin' and c.ativo order by c.nome limit 1)),
        v_data, 'lembrete', 'executa', v_claude);
    end if;
  end if;

  update sugestoes_rotina set estado = 'aprovada', texto_final = v_txt, decidido_em = now(), decidido_por = p_decisor, atualizado_em = now()
  where id = p_id;
  return v_and;
end $$;
revoke all on function public.colab_levar(uuid, text, uuid) from public, anon, authenticated, service_role;

-- O ok do Paulo ou do revisor (a mesma assinatura e o mesmo retorno da F588).
create or replace function public.colab_aprovar(p_id uuid, p_texto text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_eu uuid; v_s sugestoes_rotina%rowtype;
begin
  select c.id into v_eu from colaboradores c where c.auth_id = auth.uid() and c.ativo;
  if v_eu is null then raise exception 'sem permissão'; end if;
  select * into v_s from sugestoes_rotina s where s.id = p_id and s.origem = 'colaborador' and s.estado = 'aberta';
  if not found then raise exception 'pré-gravação não encontrada ou já decidida'; end if;
  if not (sou_admin() or coalesce(v_s.dados->>'revisor' = v_eu::text, false)) then raise exception 'sem permissão'; end if;
  return jsonb_build_object('andamento_id', colab_levar(p_id, p_texto, v_eu));
end $$;
revoke all on function public.colab_aprovar(uuid, text) from public, anon;
grant execute on function public.colab_aprovar(uuid, text) to authenticated, service_role;

-- A rotina grava o interno direto. Devolve o id da linha (nulo quando a chave já foi decidida).
create or replace function public.colab_gravar(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_claude uuid;
begin
  if coalesce(p->>'tipo', '') not in ('anotacao','tarefa','prazo_ia') then
    raise exception 'gravação direta só para anotacao, tarefa e prazo_ia; o resto vai por colab_pregravar';
  end if;
  if nullif(p->>'caso_id', '') is null then raise exception 'gravação direta exige caso_id'; end if;
  v_id := colab_pregravar(p);
  if v_id is null then return null; end if;
  select c.id into v_claude from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1;
  update sugestoes_rotina set dados = dados || jsonb_build_object('direto', true) where id = v_id;
  perform colab_levar(v_id, null, v_claude);
  return v_id;
end $$;
revoke all on function public.colab_gravar(jsonb) from public, anon, authenticated;
grant execute on function public.colab_gravar(jsonb) to service_role;

-- Desfazer: apaga a anotação (o gatilho da F433 guarda no histórico; as tarefas vão em cascata).
create or replace function public.colab_desfazer(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_eu uuid; v_s sugestoes_rotina%rowtype; v_n int;
begin
  select c.id into v_eu from colaboradores c where c.auth_id = auth.uid() and c.ativo;
  if v_eu is null then raise exception 'sem permissão'; end if;
  select * into v_s from sugestoes_rotina s where s.id = p_id and s.origem = 'colaborador' and s.estado = 'aprovada' for update;
  if not found then raise exception 'gravação não encontrada ou já desfeita'; end if;
  if not (sou_admin() or coalesce(v_s.dados->>'revisor' = v_eu::text, false)) then raise exception 'sem permissão'; end if;
  delete from andamentos where origem_id = 'colab:' || p_id;
  get diagnostics v_n = row_count;
  update sugestoes_rotina
     set estado = 'descartada', decidido_em = now(), decidido_por = v_eu, atualizado_em = now(),
         dados = dados || jsonb_build_object('desfeito', jsonb_build_object('em', now(), 'por', v_eu))
   where id = p_id;
  return jsonb_build_object('apagadas', v_n);
end $$;
revoke all on function public.colab_desfazer(uuid) from public, anon;
grant execute on function public.colab_desfazer(uuid) to authenticated, service_role;

-- O manual passa à versão 2: interno direto, tarefa fechada ou não tocada, informação buscada na fonte.
update public.config_app set valor =
  replace(replace(replace(replace(replace(replace(valor,
    'MANUAL DO COLABORADOR CLAUDE (versão 1, 14.11.2026)',
    'MANUAL DO COLABORADOR CLAUDE (versão 2, 14.11.2026)'),
    'e entrega o trabalho pronto para um humano aprovar. Nada do que você produz entra no caso sem aprovação.',
    'e entrega o trabalho pronto. O interno (anotação, tarefa interna e Prazo da IA) você grava direto no caso, e o Dr. Paulo pode desfazer. Peça, análise, mensagem ao cliente, protocolo e prazo fatal esperam aprovação.'),
    E'2. COMO VOCÊ GRAVA (PRÉ-GRAVAÇÃO)\nÚnica forma de gravar: Supabase execute_sql, project_id bhdyatqaebpzufridwkh:\n  select colab_pregravar($j${ ...json... }$j$::jsonb);',
    E'2. COMO VOCÊ GRAVA\nSupabase execute_sql, project_id bhdyatqaebpzufridwkh, com o mesmo json nas duas funções:\n  select colab_gravar($j${ ...json... }$j$::jsonb);    -- anotacao, tarefa e prazo_ia: entram no caso na hora\n  select colab_pregravar($j${ ...json... }$j$::jsonb); -- peca, analise, regra, resumo e memoria: esperam o ok'),
    'A mesma chave ainda aberta é atualizada; a já decidida não volta.',
    'A mesma chave ainda aberta é atualizada; a já decidida (gravada, aprovada ou desfeita) não volta: colab_gravar devolve nulo e nada se grava.'),
    E'3. O QUE VOCÊ LÊ\n',
    E'2-A. TAREFA FECHADA OU NÃO TOCADA\nCada tarefa ou retorno que você pegar termina de um de dois jeitos: (a) feito, com a anotação do que você verificou, onde, e o resultado; ou (b) intocado, sem anotação nenhuma. Não grave anotação que apenas descreve a tarefa, nem tarefa que pede ao humano para buscar informação que você mesmo pode buscar. Tarefa para humano só existe para o que exige ato humano (assinar, protocolar, ligar, atender, decidir), e diz exatamente o que fazer.\n2-B. BUSQUE NA FONTE\nAntes de concluir que falta um dado, procure: novidades e documentos_caso (PAT, e-Recursos, PJe, e-SAJ e eproc já importados), processo_inteiro, ler_documento, ficha_cliente (dossiê do Meu INSS, CNIS, CadÚnico), a pasta do cliente no Drive e as conversas do WhatsApp. Só aponte como faltante o que não está em nenhuma dessas fontes, dizendo onde você procurou.\n\n3. O QUE VOCÊ LÊ\n'),
    'Não protocolar. Não enviar ao cliente. Não criar prazo fatal. Não apagar.',
    'Não protocolar. Não enviar ao cliente. Não criar prazo fatal. Não apagar (o desfazer é do Dr. Paulo).')
where chave = 'colab_manual';
