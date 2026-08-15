-- Regressão da fundação do WhatsApp próprio: abrir conversa, casar com quem
-- já está no sistema, contar não-lidas e transferir sem perder o rastro.
-- ⚠ Este arquivo APAGA clientes, casos, leads e conversas: só rode num banco
--   de teste com o schema.sql aplicado, NUNCA no de produção.
--   psql "postgres://…" -q -f crm/fase2/testes/zap.sql

\set QUIET on
delete from zap_mensagens; delete from zap_transferencias; delete from zap_conversas;
delete from conversas; delete from leads; delete from casos; delete from clientes;
delete from colaboradores where inicial in ('X','Y');
insert into clientes (id, nome, telefone)
  values ('11111111-1111-1111-1111-111111111111','Maria','16 99999-0000');
insert into leads (id, nome, telefone, etapa)
  values ('22222222-2222-2222-2222-222222222222','João','16988881111','novo');
insert into colaboradores (id, nome, inicial, cor, papel)
  values ('33333333-3333-3333-3333-333333333333','Amanda teste','X','#c19c00','equipe'),
         ('44444444-4444-4444-4444-444444444444','Marcos teste','Y','#0f7b6c','equipe');
create temp table r(k text, v boolean);
-- esta suíte é da fundação, sem robô: com o bot ligado, a prévia da conversa
-- passaria a ser a resposta dele. O bot tem suíte própria (zap_bot.sql).
insert into config_app (chave, valor) values ('zap_bot_ligado','nao')
  on conflict (chave) do update set valor='nao';

-- ── abrir e casar com quem já existe ──────────────────────────────────────
-- (zap_abrir grava; ler no MESMO comando não enxerga a própria inserção —
--  por isso cada abertura vem antes, num bloco, e a conferência depois)
do $$ declare v uuid; begin
  v := zap_abrir('5516999990000','Maria S.');
  insert into r values ('t1 abre e acha o cliente pelo telefone',
    (select cliente_id='11111111-1111-1111-1111-111111111111' from zap_conversas where id=v));
end $$;
insert into r select 't2 outro formato é a MESMA conversa',
  zap_abrir('+55 (16) 99999-0000') = zap_abrir('16999990000');
insert into r select 't3 uma conversa só para o número',
  (select count(*)=1 from zap_conversas where chave=fone_chave('16999990000'));
do $$ declare v uuid; begin
  v := zap_abrir('16988881111','João B.');
  insert into r values ('t4 número de prospecto liga no lead',
    (select lead_id='22222222-2222-2222-2222-222222222222' and cliente_id is null
       from zap_conversas where id=v));
  v := zap_abrir('16977772222');
  insert into r values ('t5 desconhecido abre sem cliente nem lead',
    (select cliente_id is null and lead_id is null from zap_conversas where id=v));
end $$;
do $$ begin
  begin
    perform zap_abrir('123');
    insert into r values ('t6 telefone curto é recusado', false);
  exception when others then
    insert into r values ('t6 telefone curto é recusado',
      (select count(*)=0 from zap_conversas where telefone='123'));
  end;
end $$;
insert into r select 't7 guarda o nome do perfil',
  (select nome_perfil='João B.' from zap_conversas where chave=fone_chave('16988881111'));

-- ── mensagens mexem na conversa ───────────────────────────────────────────
insert into zap_mensagens (conversa_id, externo_id, direcao, texto, quando_wa)
  values (zap_abrir('16999990000'),'wa1','entrada','Doutor, saiu a perícia?',
          '2026-08-06 09:12:00-03');
insert into r select 't8 entrada conta como não lida',
  (select nao_lidas=1 from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't9 a prévia é a última linha',
  (select ultimo_texto='Doutor, saiu a perícia?' from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't10 vale o relógio do WhatsApp, não o nosso',
  (select ultima_em='2026-08-06 09:12:00-03' from zap_conversas where chave=fone_chave('16999990000'));

insert into zap_mensagens (conversa_id, direcao, autor_id, texto, status)
  values (zap_abrir('16999990000'),'saida','33333333-3333-3333-3333-333333333333','Saiu sim!','fila');
insert into r select 't11 resposta nossa não vira não-lida',
  (select nao_lidas=1 from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't12 mas atualiza a prévia',
  (select ultimo_texto='Saiu sim!' from zap_conversas where chave=fone_chave('16999990000'));

insert into zap_mensagens (conversa_id, direcao, tipo, texto)
  values (zap_abrir('16999990000'),'entrada','audio',null);
insert into r select 't13 sem texto, a prévia diz o tipo',
  (select ultimo_texto='[audio]' from zap_conversas where chave=fone_chave('16999990000'));

-- ── a conversa resolvida reabre sozinha ───────────────────────────────────
update zap_conversas set status='resolvida', nao_lidas=0 where chave=fone_chave('16988881111');
insert into zap_mensagens (conversa_id, direcao, texto)
  values (zap_abrir('16988881111'),'entrada','esqueci de perguntar uma coisa');
insert into r select 't14 cliente que volta reabre a conversa',
  (select status='aberta' from zap_conversas where chave=fone_chave('16988881111'));
update zap_conversas set status='resolvida' where chave=fone_chave('16988881111');
insert into zap_mensagens (conversa_id, direcao, texto)
  values (zap_abrir('16988881111'),'saida','de nada');
insert into r select 't15 resposta nossa não reabre',
  (select status='resolvida' from zap_conversas where chave=fone_chave('16988881111'));

-- ── dedupe: a ponte pode reprocessar a mesma mensagem ─────────────────────
do $$ begin
  begin
    insert into zap_mensagens (conversa_id, externo_id, direcao, texto)
      values (zap_abrir('16999990000'),'wa1','entrada','Doutor, saiu a perícia?');
    insert into r values ('t16 mensagem repetida é recusada', false);
  exception when unique_violation then
    insert into r values ('t16 mensagem repetida é recusada', true);
  end;
end $$;

-- ── transferência deixa rastro ────────────────────────────────────────────
update zap_conversas set atendente_id='33333333-3333-3333-3333-333333333333', status='resolvida'
  where chave=fone_chave('16999990000');
do $$ begin
  perform zap_transferir((select id from zap_conversas where chave=fone_chave('16999990000')),
                         '44444444-4444-4444-4444-444444444444','vai para o judicial');
end $$;
insert into r select 't17 o novo atendente assume',
  (select atendente_id='44444444-4444-4444-4444-444444444444'
     from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't18 e a conversa volta a ficar aberta',
  (select status='aberta' from zap_conversas where chave=fone_chave('16999990000'));
insert into r select 't19 fica registrado de quem para quem e por quê',
  (select de_id='33333333-3333-3333-3333-333333333333'
      and para_id='44444444-4444-4444-4444-444444444444'
      and motivo='vai para o judicial' from zap_transferencias limit 1);
do $$ begin
  begin
    perform zap_transferir('00000000-0000-0000-0000-000000000000',
                           '44444444-4444-4444-4444-444444444444');
    insert into r values ('t20 transferir conversa inexistente falha', false);
  exception when others then
    insert into r values ('t20 transferir conversa inexistente falha', true);
  end;
end $$;

-- ── quem vira cliente depois é religado à ficha ───────────────────────────
insert into clientes (id, nome, telefone)
  values ('55555555-5555-5555-5555-555555555555','Antônio','16977772222');
do $$ declare v uuid; begin
  v := zap_abrir('16977772222');
  insert into r values ('t21 conversa antiga acha o cliente novo',
    (select cliente_id='55555555-5555-5555-5555-555555555555' from zap_conversas where id=v));
end $$;

-- ── apagar a conversa leva as mensagens junto ─────────────────────────────
delete from zap_conversas where chave=fone_chave('16988881111');
insert into r select 't22 apagar conversa apaga as mensagens dela',
  (select count(*)=0 from zap_mensagens m
    where not exists (select 1 from zap_conversas c where c.id=m.conversa_id));

-- ── nota interna: mora na conversa e NUNCA sai ────────────────────────────
do $$ declare v uuid; begin
  v := zap_abrir('16912340000','Interna');
  insert into zap_mensagens (conversa_id, direcao, autor_id, texto, status)
  values (v, 'interna', '33333333-3333-3333-3333-333333333333',
          'cliente já ligou 3x hoje, tratar com paciência', 'interna');
end $$;
insert into r select 't23 a nota interna fica guardada na conversa',
  (select count(*)=1 from zap_mensagens where direcao='interna');
insert into r select 't24 e NÃO conta como não lida',
  (select nao_lidas=0 from zap_conversas where chave=fone_chave('16912340000'));
insert into r select 't25 nem vira a prévia da lista (que é a conversa com o cliente)',
  (select ultimo_texto is null from zap_conversas where chave=fone_chave('16912340000'));
do $$ begin
  begin
    insert into zap_mensagens (conversa_id, direcao, texto, status)
    select id, 'interna', 'isso não pode sair', 'fila'
      from zap_conversas where chave=fone_chave('16912340000');
    insert into r values ('t26 o BANCO recusa nota interna na fila de envio', false);
  exception when check_violation then
    insert into r values ('t26 o BANCO recusa nota interna na fila de envio', true);
  end;
end $$;
do $$ begin
  begin
    update zap_mensagens set status='fila' where direcao='interna';
    insert into r values ('t27 e recusa também mudar uma nota já gravada para fila', false);
  exception when check_violation then
    insert into r values ('t27 e recusa também mudar uma nota já gravada para fila', true);
  end;
end $$;
insert into r select 't28 a nota continua intacta depois da tentativa',
  (select count(*)=1 from zap_mensagens where direcao='interna' and status='interna');

update config_app set valor='sim' where chave='zap_bot_ligado';   -- religa o robô
\set QUIET off
select k, case when v then 'ok' else 'FALHOU' end as resultado
  from r order by (substring(k from '^t(\d+)'))::int;
select count(*) filter (where not v or v is null) as falhas from r;
