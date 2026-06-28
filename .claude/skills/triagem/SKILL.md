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
  `checklist`, `anexos`, `cliente_chave` (CPF ou nome), `outras_tarefas` (as demais
  tarefas ATIVAS do mesmo cliente em QUALQUER lista, com `lista`/`due`/`task_id`) e
  `ja_triado_hoje`.
- **Múltiplas tarefas do mesmo cliente (OBRIGATÓRIO cruzar).** Quando `outras_tarefas`
  não estiver vazio, o cliente tem mais de uma tarefa (ex.: uma na lista **INSS** e
  outra na **Judicial**). Antes de processar, **leia TODAS elas**, trate o cliente
  **uma vez só** com uma análise consolidada e grave **a mesma conclusão (C) em cada
  tarefa** referenciando a outra. Isso evita conflito e captura risco de
  **litispendência/duplicidade** (pedido administrativo e ação judicial sobre o mesmo
  benefício, como manda a verificação do Tema 1124/Tema 350). O relatório do script já
  imprime a seção "CLIENTES COM MÚLTIPLAS TAREFAS", confira-a.
- **Já triado hoje (evitar conflito, sempre COMPLEMENTAR).** Se `ja_triado_hoje` for
  `true`, já existe conclusão (C) com a data de hoje no corpo, sinal de que outra
  execução/sessão do cowork já tratou o cliente. NÃO refaça do zero e NÃO duplique
  (nem nova (C) repetida, nem parecer/arquivo repetido no Drive). Mas também **NÃO
  ignore**, esse é o ponto, LEIA a conclusão (C) e o parecer já gravados e
  **COMPLEMENTE** apenas o que ainda falta ou o que a entrada mais nova pede, somando
  ao que existe (mesma lógica do modo COMPLEMENTO do passo a). Não havendo nada a
  acrescentar, registre que já estava triado e siga, sem regravar.

## 3. Processar CADA tarefa (gravação automática, sem aprovação prévia)
Para não sobrecarregar o contexto, delegue cada cliente a um subagente
general-purpose, passando o item do JSON e estas instruções. Lembre o subagente
de ler o `CLAUDE.md` primeiro.

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

c) **Ativar e LER as skills certas (porta OBRIGATÓRIA, antes de qualquer tese).**
   1. Nomeie o **benefício** pleiteado.
   2. Resolva, pelo "Mapa de ativação de skills" do `CLAUDE.md`, os nomes EXATOS
      das skills `base-*`/`ponte-*` desse benefício e dos agentes/temas envolvidos.
      Se tiver dúvida sobre o nome, use **Grep/Glob em `_base-conhecimento-inss/
      skills/`** para achar o arquivo certo. Nunca chute nome de skill nem invente.
   3. **ABRA E LEIA, com a ferramenta Read, o `SKILL.md` de cada skill resolvida**
      (e os arquivos em `references/` quando houver), ANTES de afirmar qualquer
      coisa. SEMPRE leia `base-precedentes-catalogo-vinculantes` e o seu
      `references/CATALOGO-*` antes de citar Tema, Súmula ou Enunciado; SEMPRE
      `base-cnis-acerto-indicadores` ao analisar CNIS; SEMPRE
      `base-documentos-comprobatorios-in128` para o checklist de documentos.
   4. Toda tese, precedente, artigo e regra afirmada tem de vir de **uma skill lida
      ou de um documento**, marcada `[CONFERIDO]`. O que não estiver em skill nem em
      documento é "Não localizado" ou `[NÃO CONFIRMADO]`, jamais de memória.
   5. No parecer e no status, registre a linha **"Skills consultadas: <lista>"**.
   6. Rode as verificações automáticas obrigatórias do CLAUDE.md que couberem
      (Tema 1124, decadência do art. 103, qualidade de segurado, tutela de urgência,
      acumulação EC 103, EPI/ruído Tema 555, IN 128/2022 etc.).
   7. **Pesquisa de jurisprudência na web (sempre ativa)** — além do catálogo, use
      `WebSearch` para **achar julgados FAVORÁVEIS** à tese, confirme na fonte oficial
      com `WebFetch` quando abrir (CJF/STF/Planalto) e marque `[CONFERIDO]`/`[NÃO
      CONFIRMADO]` (ver CLAUDE.md, "Pesquisa de jurisprudência na web"). Nada inventado.

d) **Localizar a pasta do cliente** no Drive via `search_files`
   (`title contains 'NOME'` ou `fullText contains 'CPF'`) e listar arquivos
   (`parentId = '<pasta>'`). Anexo da tarefa lê-se com
   `python3 todo_anexo.py "<list_id>" "<task_id>" "trecho"` (canal do To Do, sem o
   limite de 10 MB do Drive; PDF grande baixa local e lê-se com a ferramenta Read).
   **Cadeia de leitura obrigatória** (CLAUDE.md), mapear TODOS os documentos com
   leitura INTEGRAL, **refazer da última para a primeira página (conferência)** com
   **OCR em português**, e **identificar exatamente as folhas que não conseguiu ler**,
   tentando outro método. CNIS, PPP, rurais e médicos têm leitura integral
   obrigatória; dúvida ou rasura vira **alerta para o Paulo confirmar**. Na triagem
   **NÃO pause**, REPORTE no parecer quantas páginas há, o que diz cada documento e o
   resultado da conferência (e o que não foi lido).

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
   - **Incapacidade** (B31/B91/B92, auxílio-acidente), verificar carência, qualidade
     de segurado e **DII dentro do período de manutenção**, com alerta se a DII cair
     fora, e checar **doença que isenta de carência**.
   - **PCD**, identificar se aplica **IF-BrA** (LC 142) ou **IF-BrM** (BPC).
   - **Documento a produzir**, procurar o modelo primeiro na **pasta do cliente** e
     depois nas **Petições Ouro**; petição passa por `base-revisao-peticao-aprofundada`
     antes de gerar; procuração pelo modelo `_Modelos de Procurações / Nova Procuração…`;
     relatório médico pela espécie + MODELO OURO (Reginaldo Augusto Garcia), 1 folha.
   - **Tarefa de outro colaborador** (Marcão, Amanda, Ingrid, André), fazer o
     **encaminhamento no parecer** (de quem é e o que precisa fazer), sem executar
     fora do escopo.

f) **Gerar a CONCLUSÃO** **ultraenxuta, 2 a 3 linhas**, só o achado e o próximo passo,
   leitura direta e sem enrolação. NÃO iniciar com data ou prefixo (o script adiciona
   "DD.MM.AAAA (C): "). Nunca inventar; faltando documento, dizer claramente. No modo
   complemento, registra só o que foi feito na nova data.
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusão>"`

g) **Salvar o parecer em .docx, no máximo UMA página**, no padrão do escritório
   (gerar com `docx_escritorio.py`), na subpasta `Claude` da pasta do cliente (criar
   se não existir), título `Parecer - <Cliente> - DD.MM.AAAA` (arquivo novo a cada
   data; o Drive não atualiza nem apaga). Texto **enxuto e humano**, como o Paulo
   escreveria. Antes de fechar, **revise nas skills** (toda tese ancorada em skill
   lida ou documento, proibido inventar). Conteúdo, contexto do benefício, checklist
   de documentos com faltantes em destaque, achados do CNIS, pendências do histórico,
   lista de renomeações sugeridas e mensagem ao cliente quando aplicável.
   - **OBRIGATÓRIO em todo parecer, uma seção final "Pendências em aberto"**, em
     destaque, listando tudo o que ainda falta (ex.: falta RG, falta PPP da Cica,
     falta comprovante de residência, indicador de CNIS a corrigir, prazo a
     confirmar). No modo complemento, essa seção é **carregada do parecer anterior
     e atualizada** (o que foi resolvido sai, o que continua pendente permanece, o
     que surgiu entra). É o alerta que mantém o caso organizado e impede esquecer o
     que falta.
   - **OBRIGATÓRIO, terminar com a linha "Próximo passo recomendado"** (ver CLAUDE.md,
     "Encadeamento dos fluxos"), classificando o caso em **Pronto para `/inicial`**,
     **Pronto para `/inicial-inss`** ou **Aguardando <documento/decisão>**.

h) Retornar 1 linha de status: cliente, modo (completo ou complemento), conclusão
   resumida, link do parecer, pendências em aberto, **próximo passo recomendado**.

## 3.5 Porta de qualidade (revisar ANTES de gravar a conclusão e o parecer)
Antes de gravar qualquer coisa, releia o que escreveu e só prossiga se passar nos três:
- **Português**, ortografia e acentuação corretas em TODO o texto, inclusive no
  PARECER (não só na conclusão, que já tem trava). Sem dois pontos como separador
  lógico, sem travessão, sem "não é X, é Y".
- **Direito**, cada benefício, tese, artigo e precedente está ancorado em skill lida
  ou em documento. Nenhum dado, número, data, Tema ou Súmula inventado. Precedente
  não conferido foi removido ou marcado `[NÃO CONFIRMADO]`. Postura pró-segurado.
- **Skills**, você de fato LEU `base-precedentes-catalogo-vinculantes` e a(s) skill(s)
  do benefício (passo c). Se não leu, volte ao passo c antes de afirmar. A linha
  "Skills consultadas" tem de existir no parecer.

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
- **Encadeamento (handoff)**, por padrão a triagem só diagnostica e recomenda o
  próximo passo. Quando o Paulo pedir ("montar"/"seguir" ou pedido explícito) E o
  caso estiver **Pronto** (sem pendência bloqueante), encadeie executando o fluxo
  recomendado (`inicial` ou `inicial-inss`) para aquele cliente, reaproveitando o
  parecer já gravado. Nunca encadeie havendo pendência bloqueante.

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
