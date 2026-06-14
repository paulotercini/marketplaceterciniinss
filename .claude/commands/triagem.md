---
description: Triagem diaria das tarefas do To Do atribuidas a Paulo (vencendo hoje), cruzando com o Drive e gravando conclusao + parecer
---

Execute a triagem diaria completa do escritorio. Siga EXATAMENTE os passos abaixo.

## 1. Garantir acesso ao Microsoft Graph
Rode `python3 graph_bootstrap.py` para garantir que o token esta valido.

## 2. Coletar as tarefas do dia
Rode `python3 triagem_do_dia.py` (sem argumento = hoje, horario de Brasilia).
Isso grava `triagem_hoje.json`. Leia esse arquivo.
- Se `total` = 0, informe que nao ha tarefas atribuidas a Paulo vencendo hoje e PARE.
- Caso contrario, cada item traz: `lista`, `list_id`, `task_id`, `title`
  (padrao "Nome do Cliente #CPF"), `body`, `checklist` e `anexos`.

## 3. Processar CADA tarefa (gravacao automatica, sem revisao previa)
Para nao sobrecarregar o contexto, processe os clientes em paralelo delegando cada
um a um subagente general-purpose. De a cada subagente o item correspondente do
JSON e estas instrucoes:

a) Entender a pendencia pelo `body` (entradas mais recentes no topo, formato
   `DD.MM.AAAA (X):`), pelo `checklist` e pelos `anexos`.
b) Localizar a pasta do cliente no Drive via `mcp__3253ed5d-045d-444e-9865-d53d8b387f77__search_files`
   (`title contains 'NOME'` ou `fullText contains 'CPF'`) e listar os arquivos
   (`parentId = '<id_da_pasta>'`).
c) Ler os documentos relevantes a pendencia com
   `mcp__3253ed5d-045d-444e-9865-d53d8b387f77__read_file_content`. Se a pendencia
   citar um anexo da tarefa ("em anexo"), ler com
   `python3 todo_anexo.py "<list_id>" "<task_id>" "trecho do nome"`.
d) Gerar uma CONCLUSAO objetiva, NO MAXIMO 4 LINHAS, focada na pendencia: o que
   foi verificado, o achado e o proximo passo. NAO iniciar com data/prefixo (o
   script adiciona "DD.MM.AAAA (C): " sozinho). Nunca inventar dados que nao
   estejam nos documentos; se faltar documento, dizer claramente.
e) Gravar a conclusao no To Do:
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusao>"`
f) Garantir a subpasta "Claude" na pasta do cliente (search_files por
   `title = 'Claude' and parentId = '<pasta>'`; se vazio, criar com create_file
   mime `application/vnd.google-apps.folder`). Salvar um parecer mais completo
   nessa subpasta com create_file (`text/plain` vira Google Doc), titulo
   "Parecer - <Cliente> - <DD.MM.AAAA>".
g) Retornar 1 linha de status: cliente, conclusao resumida, link do parecer e se
   ha documento faltante.

## 4. Relatorio final
Consolide os retornos dos subagentes numa tabela: Cliente | Conclusao | Parecer |
Pendencia. Destaque no topo as tarefas que ficaram bloqueadas por documento
faltante ou prazo a confirmar.

## Regras
- Escopo: somente tarefas atribuidas a Paulo (P) vencendo hoje (ja filtradas).
- Conclusao SEMPRE <= 4 linhas, em portugues, direta.
- Gravacao automatica em todas; sem etapa de aprovacao.
- Apague quaisquer scripts/arquivos temporarios que criar (mantenha apenas os
  pareceres no Drive e as conclusoes no To Do).
