-- F678 · resumo diário do WhatsApp às 22h de Brasília (01h UTC), pedido do Paulo em 21.11.2026
select cron.schedule('zap-resumo-diario', '0 1 * * *', 'select public.zap_resumo_vez()');
