---
description: Triagem diaria das tarefas do To Do atribuidas a Paulo (vencendo hoje), cruzando com o Drive, base de conhecimento e CNIS, gravando conclusao + parecer
---

Execute a triagem diaria do escritorio. Leia antes o `CLAUDE.md` (doutrina do
assistente, legenda das iniciais, limitacoes das ferramentas, regras de
nomenclatura e estilo). Siga EXATAMENTE os passos abaixo.

## 1. Garantir acesso ao Microsoft Graph
Rode `python3 graph_bootstrap.py`.

## 2. Coletar as tarefas do dia
Rode `python3 triagem_do_dia.py` (sem argumento = hoje, horario de Brasilia).
Grava `triagem_hoje.json` — leia-o.
- Se `total` = 0, informe que nao ha tarefas atribuidas ao Paulo vencendo hoje e PARE.
- Cada item traz: `lista`, `list_id`, `task_id`, `title` ("Nome #CPF"), `body`,
  `checklist`, `anexos`.

## 3. Processar CADA tarefa (gravacao automatica, sem aprovacao previa)
Para nao sobrecarregar o contexto, delegue cada cliente a um subagente
general-purpose, passando o item do JSON e estas instrucoes. Lembre o subagente
de ler o `CLAUDE.md` primeiro.

a) **Entender a pendencia** pelo `body` (entradas (P)/(D)/(M)/(I)/(A)/(C), mais
   recentes no topo), pelo `checklist` e pelos `anexos`. Identificar o **beneficio
   pleiteado** e o que o Paulo precisaria fazer.
b) **Consultar a base de conhecimento** `_base-conhecimento-inss/skills/` para o
   beneficio em questao (ex.: especial→base-especial-*, MS→base-ms-*, rural→
   base-segurado-especial-autodeclaracao-*, relatorio medico→base-modelo-*).
c) **Localizar a pasta do cliente** no Drive via
   `mcp__3253ed5d-045d-444e-9865-d53d8b387f77__search_files`
   (`title contains 'NOME'` ou `fullText contains 'CPF'`) e listar arquivos
   (`parentId = '<pasta>'`). Ler os documentos relevantes com `read_file_content`.
   Se a pendencia citar anexo da tarefa, ler com
   `python3 todo_anexo.py "<list_id>" "<task_id>" "trecho"`.
d) **Aplicar a doutrina do assistente** (secao correspondente do CLAUDE.md):
   - Conferir se a documentacao do beneficio esta correta/completa; faltando algo
     importante (ex.: RG), destacar.
   - Analisar o **CNIS** e apontar indicadores a corrigir antes de protocolar.
   - Reler o historico e alertar **pendencias esquecidas** (ex.: PPP nunca trazido).
   - Documento a terminar (ex.: autodeclaracao) → buscar/criar ja preenchido.
   - "Verificar digitalizacao" → analisar os docs digitalizados no contexto.
   - MS → listar documentos que faltam.
   - Apontar **renomeacoes sugeridas** (nome atual → nome correto), pois NAO da
     para renomear no Drive.
   - Se precisar avisar o cliente, **redigir a mensagem pronta para copiar**.
e) **Gerar a CONCLUSAO** objetiva, **max. 4 linhas**, com achado + proximo passo.
   NAO iniciar com data/prefixo (o script adiciona "DD.MM.AAAA (C): "). Nunca
   inventar dados; se faltar documento, dizer claramente.
f) **Gravar a conclusao** no To Do:
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusao>"`
g) **Salvar o parecer completo** na subpasta `Claude` da pasta do cliente
   (criar com create_file mime `application/vnd.google-apps.folder` se nao existir),
   titulo `Parecer - <Cliente> - DD.MM.AAAA` (text/plain → Google Doc). Incluir:
   contexto, checklist de documentos (faltantes em destaque), analise do CNIS,
   pendencias do historico, lista de renomeacoes sugeridas e mensagem ao cliente.
h) Retornar 1 linha de status: cliente, conclusao resumida, link do parecer,
   pendencias criticas (doc faltante, indicador CNIS, prazo).

## 4. Relatorio final
Tabela: Cliente | Conclusao | Parecer | Pendencia critica. No topo, destaque as
tarefas bloqueadas por documento faltante (ex.: RG), indicador de CNIS ou prazo
a confirmar.

## Regras
- Escopo: somente tarefas atribuidas ao Paulo (P) vencendo hoje (ja filtradas).
- Conclusao SEMPRE <= 4 linhas, em portugues, direta.
- Gravacao automatica em todas; sem etapa de aprovacao.
- NAO renomear/apagar no Drive (so listar renomeacoes). NAO enviar mensagens (so
  deixar prontas). NAO usar Gmail salvo pedido explicito.
- Apagar arquivos temporarios locais que criar.
