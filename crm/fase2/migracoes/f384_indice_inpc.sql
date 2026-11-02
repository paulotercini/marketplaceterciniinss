-- F384 (12.42) · a série do INPC para o valor estimado da Análise de Direito (Lei 8.213/91, art. 29-B).
-- O CRM lê config_app.indice_inpc = {fonte, baixado, serie:{"AAAA-MM": pct}}. A série vem do SGS 188 do Banco Central,
-- pedida pelo pg_net no dia 15 de cada mês e gravada meia hora depois (o pg_net responde depois, em net._http_response).
create or replace function public.inpc_pedir() returns void language plpgsql security definer set search_path to 'public' as $$
declare r bigint;
begin
  r := net.http_get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.188/dados?formato=json&dataInicial=01/07/1994', timeout_milliseconds := 30000);
  insert into config_app(chave, valor) values ('indice_inpc_pedido', r::text)
  on conflict (chave) do update set valor = excluded.valor;
end $$;

create or replace function public.inpc_gravar() returns void language plpgsql security definer set search_path to 'public' as $$
declare c text;
begin
  select content into c from net._http_response
   where id = (select valor::bigint from config_app where chave='indice_inpc_pedido') and status_code = 200;
  if c is null or left(c,1) <> '[' then return; end if;
  insert into config_app(chave, valor)
  select 'indice_inpc', json_build_object('fonte','INPC mensal (IBGE), série 188 do SGS do Banco Central',
      'baixado', to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD'),
      'serie', (select json_object_agg(substr(e->>'data',7,4)||'-'||substr(e->>'data',4,2), (e->>'valor')::numeric)
                from json_array_elements(c::json) e))::text
  on conflict (chave) do update set valor = excluded.valor;
end $$;

revoke all on function public.inpc_pedir() from public, anon, authenticated;
revoke all on function public.inpc_gravar() from public, anon, authenticated;

select cron.schedule('inpc-pedir', '0 12 15 * *', 'select public.inpc_pedir()');
select cron.schedule('inpc-gravar', '30 12 15 * *', 'select public.inpc_gravar()');
