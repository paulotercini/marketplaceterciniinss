-- F827 · recado do amparo (ordem expressa do Paulo de 27.11.2026)
-- 1. O amparo sai SOMENTE quando o cliente cobra resposta (zap_amparo_cobra), como na F623: sai o critério
--    "ou 2 horas sem resposta" que a F674 tinha posto em zap_amparo_vez.
-- 2. zap_conf_agradece reconhece o agradecimento no fim da frase curta ("avisei ele, obrigada"), salvo pedido.
-- 3. zap_amparo_enviar: a primeira mensagem do dia leva o aviso do golpe ao fim, como a IA principal
--    (comAvisoGolpe/enviadosHoje no zap_plantao: nenhuma saída de hoje falou do golpe); e não grava mais a nota
--    interna com o mesmo texto da mensagem (a mensagem já está na conversa e as menções avisam a equipe).

do $$
declare d text; n text;
begin
  d := pg_get_functiondef('public.zap_amparo_vez'::regproc);
  n := replace(d, 'and (zap_amparo_cobra(m.texto) or m.criado_em <= p_agora - interval ''2 hours'')) then continue; end if; -- F674 · ou 2 h sem resposta',
    'and zap_amparo_cobra(m.texto)) then continue; end if; -- F827 · somente a cobrança (F623), sem o critério de 2 horas');
  if n = d and position('F827' in d) = 0 then raise exception 'F827: trecho de zap_amparo_vez não encontrado'; end if;
  execute n;
end $$;

create or replace function public.zap_conf_agradece(p_tipo text, p_texto text)
returns boolean language plpgsql immutable as $$
declare t text;
begin
  if p_tipo = 'figurinha' then return true; end if;
  if p_tipo <> 'texto' then return false; end if;
  t := lower(trim(coalesce(p_texto, '')));
  if t = '' or length(t) > 40 or t like '%?%' then return false; end if;
  -- só emoji e pontuação
  if regexp_replace(t, '[[:alnum:]]', '', 'g') = t then return true; end if;
  t := trim(regexp_replace(t, '[^[:alnum:][:space:]áàâãéêíóôõúç]', ' ', 'g'));
  -- F827 · "avisei ele, obrigada": o agradecimento que fecha a frase curta encerra, salvo pedido ("quero remarcar, obrigada")
  if t ~ '(^|\s)(obrigad[oa]s?|grat[oa]s?|agrade[cç]o)$'
     and t !~ '(^|\s)(quer|precis|pod|poss|gostari|favor|remarc|desmarc|cancel|n[aã]o|ajud|mand|envi|lig)' then
    return true;
  end if;
  -- toda palavra precisa ser de agradecimento ou concordância: "ok, mas quero remarcar" segue para quem responde
  return not exists (select 1 from regexp_split_to_table(t, '\s+') w
    where w <> '' and w !~ '^(grat|agradec|obrigad|brigad)' and w not in ('ok','okay','obg','muito','valeu','vlw','beleza','blz',
      'combinado','certo','ta','tá','bom','está','esta','até','ate','lá','la','show','perfeito','isso','sim','amém','amem',
      'deus','abençoe','abencoe','graças','gracas','a','o','e','confirmado','entendi','entendido','doutor','doutora','dr','dra',
      'então','entao','tchau','dia','tarde','noite','boa','vou','estarei','eu','tudo','bem','ótimo','otimo','legal','joia','jóia',
      'tranquilo','abraço','abraços','abraco','abracos','agradeço','agradeco','de','nada','pela','pelo','atenção','atencao'));
end $$;

-- O envio, comum ao texto fixo e à resposta da IA: mensagem, menções e a marca do amparo.
create or replace function public.zap_amparo_enviar(p_conv uuid, p_txt text, p_and boolean, p_agora timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_min int := coalesce(nullif((select valor from config_app where chave = 'zap_amparo_min'), '')::int, 60);
  v_local timestamp := p_agora at time zone 'America/Sao_Paulo';
  v_dia text := to_char(v_local, 'YYYY-MM-DD');
  v_rec boolean := exists (select 1 from colaboradores where ativo and cargo = 'recepcao');
  c record;
  v_txt text := p_txt;
  v_aviso text;
  v_adv uuid;
begin
  select * into c from zap_conversas where id = p_conv;
  -- F827 · o aviso do golpe vai ao fim quando nada enviado hoje falou do golpe (o mesmo texto de AVISO_GOLPE no zap_plantao)
  if p_txt !~* '(golpe|falso advogado)' and not exists (
       select 1 from zap_mensagens m
        where m.conversa_id = c.id and m.direcao = 'saida'
          and m.criado_em >= (v_local::date)::timestamp at time zone 'America/Sao_Paulo'
          and m.texto ~* '(golpe|falso advogado)') then
    v_txt := p_txt || E'\n\n' || 'Atenção ao golpe do falso advogado: o escritório não solicita PIX ou transferência para liberar valores '
      || 'e não agenda audiência por vídeo ou telefone. Este é o único WhatsApp do escritório, exclusivo para mensagens; '
      || 'as ligações são feitas somente pelo telefone fixo (16) 3242-2908.';
  end if;
  insert into zap_mensagens (conversa_id, direcao, por_bot, texto, status, criado_em)
  values (c.id, 'saida', true, '*Assistente do escritório:*' || E'\n\n'
          || case when extract(hour from v_local) < 12 then 'Bom dia. ' when extract(hour from v_local) < 18
                  then 'Boa tarde. ' else 'Boa noite. ' end || v_txt, 'fila', p_agora);
  v_aviso := case when p_and then '⚠ URGENTE: ' else '' end
    || 'Cliente sem resposta há mais de ' || v_min || ' minutos. A assistente do escritório informou que a equipe responderá em breve'
    || case when p_and then ' (pedido de andamento).' else '.' end || ' Responda a conversa.';
  -- F827 · sem a nota interna com o mesmo texto da mensagem (F599 gravava as duas)
  v_adv := zap_advogado_da_conversa(c.id);
  insert into mencoes (para_id, conversa_id, cliente_id, texto)
  select k.id, c.id, c.cliente_id, v_aviso
    from colaboradores k
   where k.ativo
     and (k.id = c.atendente_id or k.id = v_adv
          or (v_rec and k.cargo = 'recepcao')
          or (not v_rec and k.cargo = 'estagiario'));
  update zap_conversas set amparo = jsonb_build_object(
      'em', p_agora, 'dia', v_dia,
      'n', case when amparo->>'dia' = v_dia then coalesce((amparo->>'n')::int, 0) + 1 else 1 end)
   where id = c.id;
end $$;

revoke execute on function public.zap_amparo_enviar(uuid, text, boolean, timestamptz) from public, anon, authenticated;
