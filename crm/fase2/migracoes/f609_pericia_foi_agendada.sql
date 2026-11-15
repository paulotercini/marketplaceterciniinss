-- F609 · pedido do Paulo de 15.11.2026: a mensagem diz que a perícia "foi agendada", e não "está agendada".
update public.config_app set valor = replace(valor, 'está agendada para', 'foi agendada para')
 where chave = 'pericia_aviso_texto';
do $$ begin
  execute replace(pg_get_functiondef('public.pericia_avisos_vez(text)'::regprocedure), 'está agendada para', 'foi agendada para');
end $$;

-- pedido do Paulo de 15.11.2026: "precisamos agendar o seu atendimento presencial com o Dr. Paulo. Podemos agendar na quarta-feira, 16/12/2026, às 09:45 ou às 12:00?"
update public.config_app set valor = '{saudacao}, {nome}. A sua {tipo} foi agendada para {dia}, {data}, às {hora}, em {local}.

Para a sua preparação para a {tipo}, precisamos agendar o seu atendimento presencial com {advogado}. Podemos agendar {quando_atendimento}?'
 where chave = 'pericia_aviso_texto';
do $$ begin
  execute replace(pg_get_functiondef('public.pericia_texto(uuid,text,text)'::regprocedure), 'else ''em '' ||', 'else ''na '' ||');
end $$;
