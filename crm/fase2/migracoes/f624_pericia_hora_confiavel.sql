-- F624 · incidente de 16.11.2026: a anotação do To Do sem hora virava evento às 09:00 e, ao lado da
-- anotação com a hora certa, o caso ficava com dois eventos no mesmo dia; o Ligar foi feito no das
-- 09:00 e o lembrete saiu com a hora errada. O migrar.py passa a gravar 00:00 (hora não informada).
-- Aqui: o Ligar recusa evento com hora não informada ou com outro evento do mesmo caso, tipo e dia,
-- e a rodada não envia nesses casos. Nada é apagado.

create or replace function public.pericia_hora_duvida(p_evento uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when to_char(e.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI') = '00:00'
      then 'hora da perícia não informada: corrija a hora no evento antes de ligar'
    when exists (select 1 from eventos o
                  where o.caso_id = e.caso_id and o.tipo = e.tipo and o.id <> e.id
                    and coalesce(o.status, '') <> 'cancelada'
                    and (o.data_hora at time zone 'America/Sao_Paulo')::date = (e.data_hora at time zone 'America/Sao_Paulo')::date)
      then 'há outro evento deste caso no mesmo dia: confira a hora e cancele o errado antes de ligar'
  end
  from eventos e where e.id = p_evento $$;
revoke execute on function public.pericia_hora_duvida(uuid) from public, anon;

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.pericia_ligar(uuid,boolean,text)'::regprocedure);
  n := replace(d, 'insert into pericia_avisos (evento_id) values (p_evento) on conflict do nothing;',
    'if p_ligado and pericia_hora_duvida(p_evento) is not null then raise exception ''%'', pericia_hora_duvida(p_evento); end if;
  insert into pericia_avisos (evento_id) values (p_evento) on conflict do nothing;');
  if n = d then raise exception 'F624: pericia_ligar mudou, guarda não aplicada'; end if;
  execute n;

  d := pg_get_functiondef('public.pericia_avisos_vez(text)'::regprocedure);
  n := replace(d, '    if r.data_aprovada is distinct from r.data_hora then',
    '    if pericia_hora_duvida(r.evento_id) is not null then continue; end if;
    if r.data_aprovada is distinct from r.data_hora then');
  if n = d then raise exception 'F624: pericia_avisos_vez mudou, guarda não aplicada'; end if;
  execute n;
end $$;
