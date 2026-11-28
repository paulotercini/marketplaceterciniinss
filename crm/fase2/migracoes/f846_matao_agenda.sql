-- F846 · cliente de Matão e agenda (pedido do Paulo de 27.11.2026). Não destrutiva.
-- 1. O caso novo que chega à 8ª resposta da IA já com atendimento agendado por ela (plantao.agendado_em,
--    F594) vai à equipe, e não ao robô de horários: o robô oferecia um segundo horário a quem já estava agendado.
-- 2. A resposta livre na escolha de horário ("É em Matão?", "Onde fica?") recebe o endereço de Monte Alto
--    antes de repetir as opções, em vez de apenas "Não entendi".
do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure);
  n := replace(d, 'if v_modo = ''lead'' and v_n >= 8 then v_acao := ''agendar'';',
    'if v_modo = ''lead'' and v_n >= 8 then
      v_acao := case when c.plantao ? ''agendado_em'' then ''equipe'' else ''agendar'' end;');
  if n = d then raise exception 'F846: zap_plantao_aplicar mudou, ajuste não aplicado'; end if;
  execute n;

  d := pg_get_functiondef('public.zap_bot_seguir(uuid,text)'::regprocedure);
  n := replace(d, '''Não entendi 🤔'' || E''\n\n'' || p.texto',
    '''O atendimento é presencial, no escritório em Monte Alto/SP (Rua Rui Barbosa, 663, Centro, em frente à agência do INSS). O escritório não atende em Matão.'' || E''\n\n'' || p.texto');
  if n = d then raise exception 'F846: zap_bot_seguir mudou, ajuste não aplicado'; end if;
  execute n;
end $$;
