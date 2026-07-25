---
name: triagem
description: Triagem diária das tarefas do To Do atribuídas a Paulo (vencendo hoje), cruzando com o Drive, base de conhecimento e CNIS, gravando conclusão + parecer. Complementa pareceres já existentes (não refaz) e mantém a lista de pendências em aberto. Use para processar a fila do dia, ou para triar um cliente específico passado como argumento.
---

Execute a triagem diária do escritório. Leia antes o `CLAUDE.md` por inteiro
(doutrina do assistente, personalização do Paulo, legenda das iniciais,
limitações das ferramentas, nomenclatura, estilo e mapa de ativação de skills).
Siga EXATAMENTE os passos abaixo.

## 0. Postura e rigor (vale para toda a triagem)

- **Português do Brasil com acentuação correta** em tudo (conclusão, parecer,
  mensagem, nome de arquivo). Sem exceção. O `todo_conclusao.py` aborta conclusão
  sem acento, então escreva certo de primeira.
- **Proibido inventar.** Todo dado afirmado vem lido de documento. Sem documento,
  escreva "não consta / a confirmar". Sem confirmação de norma, tema ou
  precedente, escreva "Não localizado" e não afirme. Jurisprudência só depois de
  conferida em `base-precedentes-catalogo-vinculantes` (e, quando a rede permitir,
  na fonte oficial) e só se favorece o segurado. Marque `[CONFERIDO]` ou
  `[NÃO CONFIRMADO]`. Nunca apresente informação possivelmente desatualizada como
  vigente; sinalize quando o tema pode ter mudado.
- **Estilo do escritório** (ver CLAUDE.md, seção da personalização): sem dois
  pontos como separador lógico, sem travessão, sem a estrutura "não é X, é Y", sem
  abertura ou fecho genérico. Frases curtas, conteúdo denso, fato ligado ao
  direito. Negrito para destacar o que importa.

## 1. Garantir acesso ao Microsoft Graph
Rode `python3 graph_bootstrap.py`.

## 2. Coletar as tarefas do dia
Rode `python3 triagem_do_dia.py` (sem argumento = hoje, horário de Brasília).
Grava `triagem_hoje.json`, leia-o.
- Se `total` = 0, informe que não há tarefas atribuídas ao Paulo vencendo hoje e
  PARE.
- Cada item traz `lista`, `list_id`, `task_id`, `title` ("Nome #CPF"), `body`,
  `checklist`, `anexos`.

## 3. Processar CADA tarefa (gravação automática, sem aprovação prévia)
Para não sobrecarregar o contexto e impedir vazamento de dados entre clientes,
delegue cada cliente ao agente do plugin
`base-conhecimento-inss:triagem-caso` (Onda 82), um despacho por tarefa,
passando o item do JSON, os ponteiros da pasta no Drive e a instrução de
gravação do parecer. O agente já carrega o roteiro completo (modo
COMPLETO/COMPLEMENTO, leitura integral de CNIS/PPP/médicos/rurais, alertas
obrigatórios, relatório em 8 seções) e grava o parecer na subpasta Claude
quando instruído. Sem o agente disponível na sessão, delegue a um subagente
general-purpose com estas instruções. Em ambos os casos, lembre o agente de
ler o `CLAUDE.md` primeiro.

a) **Verificar se já existe parecer do cliente** na subpasta `Claude` da pasta
   dele no Drive (`search_files` por `title contains 'Parecer'` dentro do
   `parentId` da subpasta Claude). Isso define o modo de trabalho.

   - **NÃO existe parecer** → modo COMPLETO. Faça a análise integral (itens b a g).
   - **JÁ existe parecer** → modo COMPLEMENTO. NÃO refaça a análise do zero.
     **Leia o parecer mais recente** e o histórico do To Do, entenda o que já foi
     concluído e o que ficou pendente, e faça **apenas o que a tarefa da nova data
     pede**, somando ao que já existe. O novo parecer é incremental, referencia o
     anterior pelo título e traz o que mudou.

b) **Entender a pendência** pelo `body` (entradas (P)/(D)/(M)/(I)/(A)/(C), mais
   recentes no topo), pelo `checklist` e pelos `anexos`. Identificar o **benefício
   pleiteado** e o que o Paulo precisaria fazer. Manter coerência com a análise
   anterior; não contrarie premissa de parecer anterior sem dizer expressamente
   por quê.

c) **Ativar as skills certas** (ver "Mapa de ativação de skills" no CLAUDE.md).
   Leia a(s) skill(s) do benefício e dos agentes/temas envolvidos em
   `_base-conhecimento-inss/skills/`, e SEMPRE `base-precedentes-catalogo-vinculantes`
   antes de afirmar qualquer tese. Rode as verificações automáticas obrigatórias
   do CLAUDE.md que couberem (Tema 1124, decadência do art. 103, qualidade de
   segurado, tutela de urgência, IN 128/2022 etc.).

d) **Localizar a pasta do cliente** no Drive via `search_files`
   (`title contains 'NOME'` ou `fullText contains 'CPF'`) e listar arquivos
   (`parentId = '<pasta>'`). Ler os documentos relevantes com `read_file_content`,
   seguindo a cadeia de leitura integral do CLAUDE.md (CNIS, PPP, rurais e médicos
   têm leitura obrigatória da integralidade; documento de imagem só com OCR; em
   dúvida ou rasura, perguntar ao Paulo). Se a pendência citar anexo da tarefa,
   ler com `python3 todo_anexo.py "<list_id>" "<task_id>" "trecho"`.

e) **Aplicar a doutrina do assistente** (seção correspondente do CLAUDE.md):
   - Conferir se a documentação do benefício está correta e completa; faltando
     algo importante (ex.: RG), destacar.
   - Analisar o **CNIS** e apontar indicadores a corrigir antes de protocolar
     (PREC, PEXT, PVNC, IGN, vínculo sem data fim, concomitância, competência
     abaixo do mínimo a complementar ou agrupar).
   - Reler o histórico e alertar **pendências esquecidas** (ex.: PPP nunca trazido).
   - Documento a terminar (ex.: autodeclaração) buscar ou criar já preenchido.
   - "Verificar digitalização" analisar os documentos digitalizados no contexto.
   - MS listar os documentos que faltam.
   - Apontar **renomeações sugeridas** (nome atual para nome correto), pois NÃO dá
     para renomear no Drive.
   - Precisando avisar o cliente, **redigir a mensagem pronta para copiar**.

f) **Gerar a CONCLUSÃO** objetiva, **máx. 4 linhas**, com achado e próximo passo.
   NÃO iniciar com data ou prefixo (o script adiciona "DD.MM.AAAA (C): "). Nunca
   inventar dados; faltando documento, dizer claramente. No modo complemento, a
   conclusão registra só o que foi feito na nova data.
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusão>"`

g) **Salvar o parecer** na subpasta `Claude` da pasta do cliente (criar com
   create_file mime `application/vnd.google-apps.folder` se não existir), título
   `Parecer - <Cliente> - DD.MM.AAAA` (não sobrescreve o anterior, pois o Drive não
   atualiza nem apaga; cada data é um arquivo novo). O parecer contém contexto do
   benefício, checklist de documentos com faltantes em destaque, análise do CNIS,
   pendências do histórico, lista de renomeações sugeridas e mensagem ao cliente
   quando aplicável.
   - **OBRIGATÓRIO em todo parecer, uma seção final "Pendências em aberto"**, em
     destaque, listando tudo o que ainda falta (ex.: falta RG, falta PPP da Cica,
     falta comprovante de residência, indicador de CNIS a corrigir, prazo a
     confirmar). No modo complemento, essa seção é **carregada do parecer anterior
     e atualizada** (o que foi resolvido sai, o que continua pendente permanece, o
     que surgiu entra). É o alerta que mantém o caso organizado e impede esquecer o
     que falta.

h) Retornar 1 linha de status: cliente, modo (completo ou complemento), conclusão
   resumida, link do parecer, pendências em aberto.

## 4. Relatório final
Tabela: Cliente | Modo | Conclusão | Parecer | Pendências em aberto. No topo,
destaque as tarefas bloqueadas por documento faltante (ex.: RG), indicador de
CNIS ou prazo a confirmar, consolidando as pendências de todos os clientes.

## Regras
- Escopo somente tarefas atribuídas ao Paulo (P) vencendo hoje (já filtradas).
  Quando o pedido trouxer um cliente específico como argumento, localize a tarefa
  ativa dele por nome/CPF e processe só ela (mesma cadeia b a h).
- Conclusão SEMPRE até 4 linhas, em português com acentuação, direta.
- Gravação automática em todas, sem etapa de aprovação.
- NÃO renomear nem apagar no Drive (só listar renomeações). NÃO enviar mensagens
  (só deixar prontas). NÃO usar Gmail salvo pedido explícito.
- Apagar arquivos temporários locais que criar.

## Dependencias (necessarias no ambiente, inclusive no cowork)
Esta skill executa ferramentas. Para rodar, o ambiente precisa de:
- **Scripts Python (raiz do repo):** `graph_bootstrap.py`, `graph_client.py`,
  `triagem.py`, `triagem_do_dia.py`, `todo_anexo.py`, `todo_conclusao.py` e um
  `graph_tokens.json` valido.
- **MCP:** Google Drive (search_files, read_file_content, download_file_content,
  create_file) e Microsoft To Do via Microsoft Graph.
- **Skills de apoio (base/ponte):** `base-precedentes-catalogo-vinculantes`,
  `base-cnis-acerto-indicadores`, `base-documentos-comprobatorios-in128` e a `base-*`/
  `ponte-*` do beneficio de cada cliente, alem do `CLAUDE.md` do escritorio (que traz
  o mapa de ativacao de skills e as verificacoes automaticas).
