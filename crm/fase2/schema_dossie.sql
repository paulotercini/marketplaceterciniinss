-- ── Dossiê do cliente · o que CADA PORTAL tem e não tem ─────────────────────
-- A extensão "Dossiê do cliente" (crm/fase2/dossie) baixa os documentos da
-- sessão gov.br e os anexa à ficha (anexos.origem = 'dossie'). O PDF que veio
-- já fica em `anexos`; o que o portal disse que NÃO EXISTE (sem CTC, sem CAT,
-- sem PPP, benefício sem laudo, "não possui deficiência") só aparecia na faixa
-- da página e sumia. Aqui fica o resumo de cada rodada, por portal, para a
-- ficha mostrar "sem CTC", "sem PPP" sem ninguém abrir o Meu INSS de novo.
--
-- {
--   "meuinss":  {"em": "2026-10-10T14:03:00Z", "baixados": ["CNIS · CNIS completo", …],
--                "inexistentes": ["CTC: sem protocolo", …], "falhas": []},
--   "mte":      {…}, "recursos": {…}, "hc": {…}
-- }
-- Uma chave por portal; a rodada nova substitui só a do portal que rodou.
alter table clientes add column if not exists dossie jsonb;

-- Rodar o dossiê de novo substitui o PDF (x-upsert). Substituir objeto existente é UPDATE em
-- storage.objects, e o bucket só tinha insert/select/delete: a segunda rodada dava 400 em tudo
-- (medido em 13.10.2026). Aplicado no Supabase como migração anexos_storage_update_para_upsert_do_dossie.
drop policy if exists anexos_atualizar on storage.objects;
create policy anexos_atualizar on storage.objects for update to authenticated
  using (bucket_id = 'anexos') with check (bucket_id = 'anexos');
