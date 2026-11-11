-- F531 · decisão do Paulo (11.11.2026): o prazo vem só do Microsoft To Do.
-- Apaga as 47 tarefas abertas criadas pelo assistente; cópia em _bkp_tf_ass_20261111.
-- destrutiva-confirmada: Paulo, na thread dos prazos, em 11.11.2026
delete from andamento_tarefas
 where id in (select id from _bkp_tf_ass_20261111)
   and concluida_em is null;
