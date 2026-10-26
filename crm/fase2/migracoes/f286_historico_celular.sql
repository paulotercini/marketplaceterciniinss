-- ══ F286 · o histórico antigo pedido ao celular (pedido do Paulo, 26.10.2026) ══
-- O WhatsApp entrega o histórico uma vez, ao ler o QR, e a ponte guarda só o
-- de quem já é cliente. Quem virou cliente depois (ou cuja conversa se perdeu
-- na importação) ficava só com as mensagens novas. Agora a conversa guarda um
-- pedido (historico_pedido): nasce pedido na conversa de cliente, e o ⋯ da
-- conversa pede de novo. A ponte lê os pedidos, pede ao celular as mensagens
-- anteriores à mais antiga que o CRM tem e grava historico_feito/resultado.

alter table zap_conversas
  add column if not exists historico_pedido timestamptz,
  add column if not exists historico_feito timestamptz,
  add column if not exists historico_resultado text;

create index if not exists zap_conversas_historico_fila on zap_conversas (historico_pedido)
  where historico_pedido is not null and historico_feito is null;

create or replace function zap_historico_ao_nascer() returns trigger
language plpgsql as $$
begin
  if new.cliente_id is not null and new.historico_pedido is null then new.historico_pedido := now(); end if;
  return new;
end $$;
create or replace trigger zap_historico_nasce before insert on zap_conversas
  for each row execute function zap_historico_ao_nascer();

-- A mensagem mais antiga que todas as da conversa é histórico, e não novidade:
-- não mexe na prévia, no não-lidas, no status nem no robô.
create or replace function zap_eh_historico(m zap_mensagens) returns boolean
language sql stable as $$
  select m.quando_wa is not null and m.quando_wa < (select min(x.quando_wa) from zap_mensagens x
                                                     where x.conversa_id = m.conversa_id and x.id <> m.id
                                                       and x.direcao <> 'interna')
$$;

create or replace function zap_toque() returns trigger
language plpgsql as $$
declare volta boolean;
begin
  -- nota interna não mexe na prévia nem no não-lidas: a lista mostra a
  -- conversa com o CLIENTE, e não o bilhete que a equipe deixou
  if new.direcao = 'interna' then return new; end if;
  -- F286: o histórico antigo pedido ao celular não é mensagem nova
  if zap_eh_historico(new) then return new; end if;
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

-- o robô do menu também não responde ao histórico (a linha entra no corpo que já está no banco)
do $$
declare d text := pg_get_functiondef('zap_bot()'::regprocedure);
begin
  if position('zap_eh_historico' in d) = 0 then
    execute replace(d, $a$if new.direcao <> 'entrada' then return new; end if;$a$,
      $a$if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;$a$);
  end if;
end $$;
