-- F678 · Resumo diário automático do WhatsApp como anotação do caso (aprovado em 21.11.2026)
-- Às 18h (Brasília), cada conversa de cliente com ficha que teve mensagem do cliente no dia vai à
-- Edge Function zap_anotacao no modo resumo. O modelo separa o que é pertinente a cada caso e grava
-- uma anotação por caso (origem 'zap_resumo'); o que não é do caso (agendamento, pagamento, dúvida
-- geral) é descartado. Substitui a fila de sugestões por mensagem (zap_anotacao_ligada = 'nao').

create or replace function public.zap_resumo_pegar(p_conversa uuid, p_dia date)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare c zap_conversas;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found or c.cliente_id is null then return null; end if;
  if exists (select 1 from andamentos a join casos k on k.id = a.caso_id
             where k.cliente_id = c.cliente_id and a.origem = 'zap_resumo'
               and a.origem_id like 'zap_resumo:' || c.id || ':' || p_dia || ':%') then return null; end if;
  return jsonb_build_object(
    'conversa_id', c.id, 'cliente_id', c.cliente_id, 'dia', p_dia,
    'casos', (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'beneficio', k.beneficio, 'fase', k.fase,
                'etapa', k.etapa, 'apelido', k.apelido) order by k.criado_em desc), '[]'::jsonb)
              from casos k where k.cliente_id = c.cliente_id and k.fase <> 'encerrado'),
    'mensagens', (select coalesce(jsonb_agg(jsonb_build_object(
                    'hora', to_char(coalesce(m.quando_wa, m.criado_em) at time zone 'America/Sao_Paulo', 'HH24:MI'),
                    'quem', case when m.direcao = 'entrada' then 'Cliente'
                                 when coalesce(m.por_bot, false) or m.bot_ia is not null or m.aviso_chave is not null then 'Assistente automático'
                                 else coalesce((select nome from colaboradores where id = m.autor_id), 'Escritório') end,
                    'texto', left(coalesce(nullif(trim(m.texto), ''), '[' || coalesce(m.tipo, 'arquivo') || coalesce(' ' || m.midia_nome, '') || ']'), 800))
                  order by coalesce(m.quando_wa, m.criado_em)), '[]'::jsonb)
                  from (select * from zap_mensagens m
                        where m.conversa_id = c.id and m.direcao in ('entrada', 'saida') and m.apagada_em is null
                          and coalesce(m.status, '') not in ('rascunho', 'agendada', 'interna')
                          and (coalesce(m.quando_wa, m.criado_em) at time zone 'America/Sao_Paulo')::date = p_dia
                        order by coalesce(m.quando_wa, m.criado_em) limit 150) m));
end $$;

create or replace function public.zap_resumo_vez(p_dia date default null)
returns integer language plpgsql security definer set search_path to 'public' as $$
declare v_dia date := coalesce(p_dia, (now() at time zone 'America/Sao_Paulo')::date); v_n int := 0; r record;
begin
  if coalesce((select valor from config_app where chave = 'zap_resumo_ligado'), 'nao') <> 'sim' then return 0; end if;
  for r in select distinct c.id from zap_conversas c join zap_mensagens m on m.conversa_id = c.id
           where c.cliente_id is not null and m.direcao = 'entrada'
             and (coalesce(m.quando_wa, m.criado_em) at time zone 'America/Sao_Paulo')::date = v_dia loop
    begin
      perform net.http_post(url := (select valor from config_app where chave = 'zap_anotacao_url'),
                            body := jsonb_build_object('resumo', r.id, 'dia', v_dia),
                            headers := zap_fn_cabecalho(), timeout_milliseconds := 60000);
      v_n := v_n + 1;
    exception when others then null;
    end;
  end loop;
  return v_n;
end $$;

insert into config_app (chave, valor) values ('zap_resumo_ligado', 'sim')
  on conflict (chave) do update set valor = 'sim';
update config_app set valor = 'nao' where chave = 'zap_anotacao_ligada';

do $$ begin
  perform cron.unschedule('zap-resumo-diario') where exists (select 1 from cron.job where jobname = 'zap-resumo-diario');
  perform cron.schedule('zap-resumo-diario', '0 21 * * *', 'select public.zap_resumo_vez()');  -- 18h de Brasília
end $$;
