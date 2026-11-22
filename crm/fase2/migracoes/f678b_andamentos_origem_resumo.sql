-- F678 · a anotação do resumo diário do WhatsApp usa a origem 'zap_resumo'
alter table public.andamentos drop constraint if exists andamentos_origem_check;
alter table public.andamentos add constraint andamentos_origem_check
  check (origem = any (array['app','todo','dou','whatsapp','pat','crps','pje','zap_resumo']));
