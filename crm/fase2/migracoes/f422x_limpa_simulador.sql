-- destrutiva-confirmada: Paulo, 08.11.2026 00:58 UTC ("Aprovo")
-- Fecha as portas do teste das 105 conversas e apaga a fila do simulador.
update public.config_app set valor = 'nao' where chave in ('zap_ma_teste', 'zap_ma_simular');
do $$ begin perform cron.unschedule('sim100-tick'); exception when others then null; end $$;
drop function if exists public._sim100_tick();
drop table if exists public._sim100_fila, public._sim100;
