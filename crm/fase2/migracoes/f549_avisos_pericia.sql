-- F549 (13.57, pedido do Paulo de 12.11.2026): lembrete da perícia e da avaliação social pelo WhatsApp,
-- em D-7, D-1 e outra data, contados em dias úteis (sem sábado, domingo e feriado nacional).
-- Cada lembrete se liga ou desliga na tela 🩺 Perícias (config_app.pericia_aviso_d7, _d1, _outra e
-- _outra_dias); todos nascem desligados. Independe de zap_avisos_ligado.

-- o dia útil que fica n dias úteis antes de p_dia
create or replace function pericia_dia_util_antes(p_dia date, p_n int) returns date
language plpgsql immutable set search_path = public as $$
declare d date := p_dia; k int := 0;
begin
  while k < p_n loop
    d := d - 1;
    if extract(isodow from d) < 6 and not qualidade_feriado(d) then k := k + 1; end if;
  end loop;
  return d;
end $$;

insert into config_app (chave, valor) values
  ('pericia_aviso_d7', 'nao'), ('pericia_aviso_d1', 'nao'),
  ('pericia_aviso_outra', 'nao'), ('pericia_aviso_outra_dias', '3'),
  ('pericia_aviso_texto', E'Olá, {nome}.\n\nO escritório Paulo Tercini lembra que a sua perícia médica no INSS está agendada para {dia}, {data}, às {hora}{local}.\n\nLeve documento de identidade com foto e todos os laudos, exames, receitas e relatórios médicos originais, inclusive os antigos, e chegue com 30 minutos de antecedência. A falta sem justificativa leva ao indeferimento do pedido.\n\nEm caso de dúvida, responda esta mensagem.'),
  ('social_aviso_texto', E'Olá, {nome}.\n\nO escritório Paulo Tercini lembra que a sua avaliação social no INSS está agendada para {dia}, {data}, às {hora}{local}.\n\nLeve documento de identidade com foto, comprovante de residência e os documentos de renda de todas as pessoas que moram com você. A falta sem justificativa leva ao indeferimento do pedido.\n\nEm caso de dúvida, responda esta mensagem.')
on conflict (chave) do nothing;

create or replace function zap_avisos_pericia(p_hoje date default null) returns int
language plpgsql security definer set search_path = public as $$
declare
  hoje date := coalesce(p_hoje, (now() at time zone 'America/Sao_Paulo')::date);
  ns int[] := '{}'; n int; r record; v_conv uuid; v_txt text; v_mod text; feitos int := 0;
  dias text[] := array['segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado','domingo'];
  cfg jsonb;
begin
  if p_hoje is null and not zap_no_horario(now()) then return 0; end if;
  select jsonb_object_agg(chave, valor) into cfg from config_app
   where chave like 'pericia_aviso_%' or chave = 'social_aviso_texto';
  if cfg->>'pericia_aviso_d7' = 'sim' then ns := ns || 7; end if;
  if cfg->>'pericia_aviso_d1' = 'sim' then ns := ns || 1; end if;
  if cfg->>'pericia_aviso_outra' = 'sim' and coalesce(nullif(cfg->>'pericia_aviso_outra_dias','')::int, 0) >= 1 then
    ns := ns || (cfg->>'pericia_aviso_outra_dias')::int;
  end if;
  foreach n in array ns loop
    for r in
      select e.id, e.data_hora, e.local, e.tipo, c.telefone, c.nome
        from eventos e join casos k on k.id = e.caso_id join clientes c on c.id = k.cliente_id
       where e.status = 'agendada' and e.tipo ~* '^(per[íi]cia|avalia)'
         and k.fase <> 'encerrado' and coalesce(c.telefone, '') <> ''
         and (e.data_hora at time zone 'America/Sao_Paulo')::date > hoje
         and pericia_dia_util_antes((e.data_hora at time zone 'America/Sao_Paulo')::date, n) = hoje
    loop
      v_mod := case when r.tipo ~* '^avalia' then cfg->>'social_aviso_texto' else cfg->>'pericia_aviso_texto' end;
      v_mod := replace(v_mod, '{dia}',
        dias[extract(isodow from (r.data_hora at time zone 'America/Sao_Paulo'))::int]);
      v_txt := zap_texto_aviso(v_mod, r.nome, r.data_hora, r.local, r.tipo, null);
      begin
        v_conv := zap_abrir(r.telefone, r.nome);
        insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, aviso_chave, aviso_ref)
        values (v_conv, 'saida', true, v_txt, 'fila',
                'pericia_d' || n || ':' || to_char(r.data_hora at time zone 'America/Sao_Paulo', 'YYYYMMDD'), r.id);
        feitos := feitos + 1;
      exception when unique_violation then null;
      end;
    end loop;
  end loop;
  return feitos;
end $$;

revoke execute on function zap_avisos_pericia(date) from public, anon;
grant execute on function zap_avisos_pericia(date) to authenticated;

-- os lembretes antigos da perícia e da avaliação social repetiriam os novos
update zap_avisos set ativo = false where chave in ('pericia_1d', 'pericia_3d', 'social_3d');

do $$ begin
  perform cron.schedule('pericia-avisos', '10 * * * *', 'select zap_avisos_pericia()');
exception when others then raise notice 'pg_cron indisponível: %', sqlerrm;
end $$;
