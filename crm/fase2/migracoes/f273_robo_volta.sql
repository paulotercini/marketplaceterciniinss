-- F273 · o robô volta depois do encerramento (decisão do Paulo de 25.10.2026)
-- Encerrar só marcava a conversa como resolvida, e o atendente e o robô calado
-- ficavam: o cliente que voltava a escrever caía no mesmo atendente e nunca
-- mais via o menu. Agora a conversa reaberta pelo cliente recomeça como no
-- primeiro contato: sem atendente, sem setor e com o robô no início. Quem
-- escreve até 1 hora depois do encerramento (config_app.zap_volta_min) ainda
-- é a mesma conversa e fica com o atendente. A conversa de robô de outra
-- empresa (F272, onda 2) continua calada.

insert into config_app (chave, valor) values ('zap_volta_min', '60') on conflict (chave) do nothing;

create or replace function zap_toque() returns trigger
language plpgsql as $$
declare volta boolean;
begin
  -- nota interna não mexe na prévia nem no não-lidas: a lista mostra a
  -- conversa com o CLIENTE, e não o bilhete que a equipe deixou
  if new.direcao = 'interna' then return new; end if;
  select new.direcao = 'entrada' and c.status = 'resolvida' and not c.automatica
         and coalesce(a.encerrado_em, '-infinity') < now()
             - make_interval(mins => coalesce((select valor from config_app where chave='zap_volta_min'),'60')::int)
    into volta
    from zap_conversas c left join zap_atendimentos a on a.id = c.atendimento_id
   where c.id = new.conversa_id;
  update zap_conversas set
    ultima_em    = coalesce(new.quando_wa, new.criado_em, now()),
    ultimo_texto = left(coalesce(nullif(trim(new.texto),''), '['||new.tipo||']'), 200),
    nao_lidas    = case when new.direcao='entrada' then nao_lidas + 1 else nao_lidas end,
    -- cliente que volta a escrever reabre a conversa: "resolvida" era a
    -- opinião do escritório, e ele acabou de discordar
    status       = case when new.direcao='entrada' and status='resolvida'
                        then 'aberta' else status end,
    -- e o assunto novo começa pelo robô (F273)
    atendente_id = case when volta then null else atendente_id end,
    setor        = case when volta then null else setor end,
    setor_id     = case when volta then null else setor_id end,
    bot_ativo    = case when volta then true else bot_ativo end,
    bot_passo    = case when volta then null else bot_passo end,
    bot_desde    = case when volta then null else bot_desde end,
    bot_erros    = case when volta then 0 else bot_erros end,
    bot_dados    = case when volta then null else bot_dados end
  where id = new.conversa_id;
  return new;
end $$;
