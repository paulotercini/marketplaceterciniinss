-- F520 (pedido do Paulo de 11.11.2026): a mensagem automática do Offline (F397)
-- sai com a assinatura de quem atende a conversa, no formato da equipe
-- ("*Dr. Paulo Tercini:*" e linha em branco, F188). A ponte não assina mensagem
-- do robô (por_bot), por isso a assinatura vai no próprio texto.
create or replace function public.zap_offline_gatilho()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare c record; v_txt text; v_quem text;
begin
  if new.direcao <> 'entrada' or zap_eh_historico(new) then return new; end if;
  if zap_conf_resposta(new.id) then return new; end if;
  select z.id, z.offline_aviso_em, z.automatica, k.zap_offline_desde, k.zap_offline_msg, k.nome, k.assinatura_zap
    into c
    from zap_conversas z join colaboradores k on k.id = z.atendente_id
   where z.id = new.conversa_id and z.status <> 'resolvida';
  if c.id is null or c.zap_offline_desde is null or coalesce(c.automatica, false) then return new; end if;
  if c.offline_aviso_em is not null and c.offline_aviso_em >= c.zap_offline_desde then return new; end if;
  v_txt := coalesce(nullif(trim(c.zap_offline_msg), ''), zap_offline_padrao(c.nome));
  v_quem := nullif(trim(coalesce(c.assinatura_zap, c.nome, '')), '');
  if v_quem is not null then v_txt := '*' || v_quem || ':*' || E'\n\n' || v_txt; end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status)
  values (c.id, 'saida', true, v_txt, 'fila');
  update zap_conversas set offline_aviso_em = now() where id = c.id;
  return new;
end $function$;
