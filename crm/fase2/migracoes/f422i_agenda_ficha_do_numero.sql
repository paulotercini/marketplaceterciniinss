-- F422i · quem escreve por outra pessoa marca como 001, mas o atendimento já marcado se acha pela ficha do número
CREATE OR REPLACE FUNCTION public.zap_plantao_agenda(p_conversa uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare c zap_conversas; v_num uuid; v_cli uuid; v_nome text;
begin
  select * into c from zap_conversas where id = p_conversa;
  if not found then return null; end if;
  v_num := zap_cliente_do_numero(p_conversa);
  if c.contato_relacao is null then v_cli := v_num; end if;
  if v_cli is not null then select nome into v_nome from clientes where id = v_cli; end if;
  return jsonb_build_object('telefone', c.telefone, 'cliente_id', v_cli, 'cliente_numero', v_num, 'nome_ficha', v_nome,
                            'ligada', zap_agenda_ligada() or (coalesce(zap_conf_remarcando(c), false) and zap_conf_ia_remarca()));
end $function$;
