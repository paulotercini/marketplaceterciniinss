-- F674 · ajustes da leitura das conversas de 16 a 21.11.2026 (pedido do Paulo de 21.11.2026)
-- 1. A equipe escreveu nas últimas 3 horas: a resposta do cliente fica com a equipe, sem a IA, salvo pedido de agendamento
--    (caso de 19.11: a equipe perguntou, o cliente respondeu "Sim" e a IA disse que ia encaminhar).
-- 2. A ausência automática do advogado e o recado do robô não contam como resposta: só a resposta da IA impede o amparo.
-- 3. O amparo também entra quando a mensagem do cliente espera 2 horas sem resposta no expediente, e não só quando ele cobra
--    (cinco clientes ficaram sem resposta de 1 a 5 dias na semana). Agradecimento, "ok" e figurinha seguem sem resposta.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.zap_smb_bot'::regproc);
  if position('F674' in d) = 0 then
    if position('if c.atendente_id is not null or not c.bot_ativo then return; end if;' in d) = 0 then
      raise exception 'F674: trecho de zap_smb_bot não encontrado';
    end if;
    d := replace(d, 'if c.atendente_id is not null or not c.bot_ativo then return; end if;',
      'if c.atendente_id is not null or not c.bot_ativo then return; end if;' || E'\n' ||
      '  -- F674 · a equipe escreveu nas últimas 3 horas: a resposta fica com ela, salvo pedido de agendamento' || E'\n' ||
      '  if c.ultima_resposta_em > now() - interval ''3 hours'' and not zap_smb_quer_agendar(m.texto) then return; end if;');
    execute d;
  end if;

  d := pg_get_functiondef('public.zap_amparo_vez'::regproc);
  if position('F674' in d) = 0 then
    if position('and m.criado_em > z.ultima_entrada_em)' in d) = 0 or position('and zap_amparo_cobra(m.texto)) then continue; end if;' in d) = 0 then
      raise exception 'F674: trecho de zap_amparo_vez não encontrado';
    end if;
    d := replace(d, 'and m.criado_em > z.ultima_entrada_em)',
      'and m.criado_em > z.ultima_entrada_em and m.bot_ia is not null) -- F674 · ausência e recado do robô não contam');
    d := replace(d, 'and zap_amparo_cobra(m.texto)) then continue; end if;',
      'and (zap_amparo_cobra(m.texto) or m.criado_em <= p_agora - interval ''2 hours'')) then continue; end if; -- F674 · ou 2 h sem resposta');
    execute d;
  end if;
end $$;
