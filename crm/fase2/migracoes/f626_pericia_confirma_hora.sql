-- F626 · pedido do Paulo de 16.11.2026: ligar o aviso da perícia exige confirmar o dia e o horário.
-- pericia_ligar ganha p_confirmado (a data_hora que o administrador conferiu e digitou na tela) e
-- recusa ligar sem ela ou com ela diferente de eventos.data_hora. A confirmação fica gravada em
-- pericia_avisos.data_aprovada, ligado_por e ligado_em, como já era. A assinatura antiga sai, para o
-- app antigo não ligar sem confirmar. Recriada pela definição atual (com as guardas da F565 e da F624).

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.pericia_ligar(uuid,boolean,text)'::regprocedure);
  n := replace(d, 'p_profissional text DEFAULT NULL::text)',
    'p_profissional text DEFAULT NULL::text, p_confirmado timestamp with time zone DEFAULT NULL::timestamp with time zone)');
  if n = d then raise exception 'F626: cabeçalho de pericia_ligar mudou'; end if;
  d := n;
  n := replace(d, 'if p_ligado and pericia_hora_duvida(p_evento) is not null then',
    'if p_ligado and (p_confirmado is null or p_confirmado <> e.data_hora) then
    raise exception ''confirme o dia e o horário da perícia antes de ligar'';
  end if;
  if p_ligado and pericia_hora_duvida(p_evento) is not null then');
  if n = d then raise exception 'F626: guarda da F624 não encontrada em pericia_ligar'; end if;
  execute n;
end $$;

drop function public.pericia_ligar(uuid, boolean, text);
revoke all on function public.pericia_ligar(uuid, boolean, text, timestamptz) from public, anon;
grant execute on function public.pericia_ligar(uuid, boolean, text, timestamptz) to authenticated, service_role;
