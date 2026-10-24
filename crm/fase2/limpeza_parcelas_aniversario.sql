-- LIMPEZA: as "parcelas" que eram aniversário ou data de nascimento (24.10.2026)
-- Importações antigas do To Do leram itens como "Nascimento: 10/09/1959" e "Aniversário em 15/10/1964"
-- do checklist de 💵 Pagamentos como parcela a receber, com vencimento em 1959. No teste real de
-- 24.10.2026 eram 53, todas abertas e sem pagamento, e inchavam as "Vencidas" do Meu Dia e do Planejado.
-- A importação de hoje já não faz isso (migrar.py, e_parcela: nascimento e aniversário são dado).
-- Apaga só essas: vencimento antes de 2000, sem pagamento, e o texto fala de nascimento ou aniversário.

-- 1 · confira antes (deve mostrar 53 linhas)
select id, cliente_id, vencimento, descricao from pagamentos
 where vencimento < '2000-01-01' and status = 'aberto' and pago_em is null
   and coalesce(descricao,'') ~* 'nasc|anivers';

-- 2 · apague
delete from pagamentos
 where vencimento < '2000-01-01' and status = 'aberto' and pago_em is null
   and coalesce(descricao,'') ~* 'nasc|anivers';
