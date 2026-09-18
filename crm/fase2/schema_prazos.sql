-- F116 · AS TRÊS NATUREZAS DE DATA (decisão do Paulo, 18.09.2026).
-- O CRM passa a distinguir o que antes era só "lembrar em".
--   PRAZO FATAL   o dia em que o direito morre. Já existia e continua em
--                 casos.prazo, casos.exigencia_prazo e no "recorrer até"
--                 calculado da decisão. Nada aqui muda isso.
--   COMPROMISSO   o dia em que alguém vai FAZER o trabalho, por exemplo
--                 escrever a petição. É o padrão de toda tarefa de andamento.
--   LEMBRETE      o aviso que não é trabalho marcado, por exemplo voltar a
--                 falar do caso de aposentadoria futura.
-- A natureza mora na tarefa do andamento; a tabela lembretes, que é do
-- cliente e se repete, continua sendo lembrete por definição.
alter table andamento_tarefas
  add column if not exists natureza text not null default 'compromisso';
do $$ begin
  alter table andamento_tarefas
    add constraint andamento_tarefas_natureza_ck
    check (natureza in ('compromisso','lembrete'));
exception when duplicate_object then null; end $$;

-- F119 · A ETAPA do caso, o passo dentro da fase (decisão do Paulo, 18.09.2026,
-- a partir da arquitetura fase → etapa → tarefa observada na ADVBOX).
-- A FASE é o trilho grande e já existe (🌻 INSS, 🖥 Conselho, 👪 Judicial).
-- A ETAPA é onde o caso está dentro dele, "aguardando perícia", "em exigência",
-- "aguardando sentença". É o estado que o escritório DECLARA, e é ele que um
-- dia o cliente vai ler no portal, no lugar da frase deduzida do último evento.
alter table casos add column if not exists etapa text;
