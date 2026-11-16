-- F622 · o colaborador Claude só anota no caso quando há providência do escritório (ordem do Dr. Paulo, 16.11.2026).
-- Movimento de rotina, despacho informativo e conferência sem pendência ficam apenas marcados na fila (colaborador_fila).
-- A gravação direta de anotação passa a exigir dados.providencia; tarefa e Prazo da IA não mudam.
create or replace function public.colab_gravar(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_claude uuid;
begin
  if coalesce(p->>'tipo', '') not in ('anotacao','tarefa','prazo_ia') then
    raise exception 'gravação direta só para anotacao, tarefa e prazo_ia; o resto vai por colab_pregravar';
  end if;
  if nullif(p->>'caso_id', '') is null then raise exception 'gravação direta exige caso_id'; end if;
  if p->>'tipo' = 'anotacao' and length(trim(coalesce(p->'dados'->>'providencia', ''))) < 5 then
    raise exception 'anotação só com providência do escritório (dados.providencia); fato informativo não se anota, marque apenas a fila';
  end if;
  v_id := colab_pregravar(p);
  if v_id is null then return null; end if;
  select c.id into v_claude from colaboradores c where c.papel = 'assistente_ia' and c.ativo limit 1;
  update sugestoes_rotina set dados = dados || jsonb_build_object('direto', true) where id = v_id;
  perform colab_levar(v_id, null, v_claude);
  return v_id;
end $$;
revoke all on function public.colab_gravar(jsonb) from public, anon, authenticated;
grant execute on function public.colab_gravar(jsonb) to service_role;

-- O manual ganha a regra no fim, sem reescrever o que já está gravado.
update public.config_app set valor = valor || E'\n\n2-B. ANOTAÇÃO SÓ COM PROVIDÊNCIA (ordem do Dr. Paulo, 16.11.2026)\n'
  'Anote no caso somente quando houver algo a ser feito pelo escritório: prazo, peça, juntada, contato com o cliente, '
  'documento a pedir, conferência que gerou pendência. Informe a providência em dados.providencia (uma frase, com o verbo e quem faz); '
  'sem ela, colab_gravar recusa a anotação. Movimento de rotina, despacho informativo (por exemplo, "não há prevenção"), '
  'conferência sem pendência, avaliação genérica do caso e conferência de cadastro sem preenchimento não viram anotação nem pré-gravação: '
  'marque apenas o item da fila como processado.'
where chave = 'colab_manual' and valor not like '%2-B. ANOTAÇÃO SÓ COM PROVIDÊNCIA%';
