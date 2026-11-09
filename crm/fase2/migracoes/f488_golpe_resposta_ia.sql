-- F488 (09.11.2026, pedido do Paulo): no golpe, sai a resposta da IA ao que a pessoa perguntou, com o alerta,
-- e não mais o texto fixo; o texto fixo de config_app.zap_golpe_texto fica para quando a IA não escreve nada.
do $$
declare v text;
begin
  select pg_get_functiondef('public.zap_plantao_aplicar(uuid,text,text,text,boolean,text,text,text)'::regprocedure) into v;
  v := replace(v,
    $a$    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    select c.id, 'saida', true, valor, 'fila', 'plantao:golpe' from config_app where chave = 'zap_golpe_texto' and trim(valor) <> '';
    perform zap_nota_sistema(c.id, null, 'Assistente virtual: possível golpe; enviou o aviso fixo de que este é o único WhatsApp do escritório · '$a$,
    $b$    insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, bot_ia)
    select c.id, 'saida', true, coalesce(nullif(left(trim(coalesce(p_resposta, '')), 1500), ''), valor), 'fila', 'plantao:golpe'
      from config_app where chave = 'zap_golpe_texto' and (trim(coalesce(p_resposta, '')) <> '' or trim(valor) <> '');
    perform zap_nota_sistema(c.id, null, 'Assistente virtual: possível golpe; respondeu e avisou que este é o único WhatsApp do escritório · '$b$);
  v := replace(v, $a$ || ' recebeu o aviso fixo no WhatsApp · '$a$, $b$ || ' recebeu o aviso de golpe no WhatsApp · '$b$);
  if position('plantao:golpe' in v) = 0 or position('coalesce(nullif(left(trim(coalesce(p_resposta' in v) = 0 then
    raise exception 'F488: trecho do golpe não encontrado em zap_plantao_aplicar';
  end if;
  execute v;
end $$;
