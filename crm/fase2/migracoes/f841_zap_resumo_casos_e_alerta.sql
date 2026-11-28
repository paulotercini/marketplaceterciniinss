-- F841 · (1) o resumo diário do WhatsApp recebe espécie, processo e último registro de cada caso, para
-- o modelo distinguir casos sem benefício nem apelido; (2) o alerta de 30 min não dispara quando a última
-- mensagem do cliente é apenas agradecimento ou "ok" (zap_despedida, F819).
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.zap_resumo_pegar(uuid,date)'::regprocedure);
  n := replace(d, $r$'etapa', k.etapa, 'apelido', k.apelido) order by k.criado_em desc$r$,
    $r$'etapa', k.etapa, 'apelido', k.apelido, 'especie', k.especie, 'processo', k.processo,
                'ultimo', (select left(a.texto, 160) from andamentos a where a.caso_id = k.id and not a.excluir
                             and a.origem <> 'zap_resumo' order by a.criado_em desc limit 1)) order by k.criado_em desc$r$);
  if n <> d then execute n; end if;

  d := pg_get_functiondef('public.zap_alerta_sem_resposta(timestamptz)'::regprocedure);
  n := replace(d, $r$       and not coalesce(z.automatica, false)
$r$, $r$       and not coalesce(z.automatica, false)
       and not zap_despedida(coalesce(substring(z.ultimo_texto from '^\[(\w+)\]$'), 'texto'), z.ultimo_texto)
$r$);
  if n <> d then execute n; end if;
end $$;
