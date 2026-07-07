---
description: Triagem diária das tarefas do To Do atribuídas a Paulo (vencendo hoje), cruzando com o Drive, base de conhecimento e CNIS, gravando conclusão + parecer. Complementa pareceres já existentes (não refaz) e mantém a lista de pendências em aberto.
---

Execute a triagem diária do escritório. Leia antes o `CLAUDE.md` **e o
`CLAUDE-OPERACIONAL.md`** por inteiro
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
  `checklist`, `anexos`, `cliente_chave`, `outras_tarefas` e `ja_triado_hoje`.
- **Múltiplas tarefas do mesmo cliente (OBRIGATÓRIO cruzar).** Quando `outras_tarefas`
  não estiver vazio, o cliente tem mais de uma tarefa (ex.: lista **INSS** e
  **Judicial**). Leia TODAS, trate o cliente uma vez só com análise consolidada e
  grave a mesma conclusão (C) em cada tarefa referenciando a outra, evitando conflito
  e capturando **litispendência/duplicidade**. O script imprime a seção "CLIENTES COM
  MÚLTIPLAS TAREFAS".
- **Já triado hoje (evitar conflito, sempre COMPLEMENTAR).** Se `ja_triado_hoje` for
  `true`, já há conclusão (C) de hoje no corpo (outra execução/sessão já tratou). NÃO
  refaça do zero e NÃO duplique, mas também **NÃO ignore**, LEIA o que já foi gravado e
  **COMPLEMENTE** só o que ainda falta ou o que a entrada mais nova pede, somando ao que
  existe. Nada a acrescentar, registre que já estava triado e siga, sem regravar.

## 3. Processar CADA tarefa (gravação automática, sem aprovação prévia)
Para não sobrecarregar o contexto, delegue cada cliente a um subagente
general-purpose, passando o item do JSON e estas instruções. Lembre o subagente
de ler o `CLAUDE.md` **e o `CLAUDE-OPERACIONAL.md`** primeiro.

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
   - **No PA de auxílio-acidente ou benefício por incapacidade, SEMPRE localize a(s)
     folha(s) da PERÍCIA MÉDICA FEDERAL** (laudo SABI/CADMED, em regra nas ÚLTIMAS
     folhas, o documento controverso a desconstituir) **e a decisão de INDEFERIMENTO**
     (sempre no PA concluído), extraindo NB, data e MOTIVO exato. Não suponha, leia.

e) **Aplicar a doutrina do assistente** (seção correspondente do CLAUDE.md):
   - Conferir se a documentação do benefício está correta e completa; faltando
     algo importante (ex.: RG), destacar.
   - Analisar o **CNIS** (leitura obrigatória) e apontar indicadores a corrigir
     (PREC, PEXT, PVNC, IGN, vínculo sem data fim, concomitância, competência abaixo
     do mínimo). **RAC proativa**, achando erro corrigível, **monte a RAC mesmo sem
     pedido** (vínculo sem data fim, extemporâneo, ausente comprovado, divergência de
     rescisão), pelo Anexo certo da pasta `Formulários IN128`. Não fazer RAC só por
     contribuição abaixo do mínimo. Cálculo de tempo/RMI/valor da causa é no
     **Prévius** (não acessível), deixe o alerta e procure o que o Paulo já deixou na
     pasta.
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
   - **Documento a produzir (iniciativa, deixar pronto na subpasta `Claude`).** Modelos
     vivos do Drive, nunca do zero (CLAUDE.md, "Modelos e formulários do escritório").
     **Procuração** pelo pacote `Novo - Procuração Adm. e Judicial - D. Pobreza -
     Contrato - Recibo de Entrega de Docs1.docx` (preencher `<...>`, remover o campo
     faltante, assinalar benefício e Atualização Cadastral no Termo, ajustar o Contrato
     pelo realce de cor e retirá-lo, paginar por folha; só não finalizar sem nome, CPF
     e endereço). **Auxílio-doença no INSS**, `Procuração Adm. e Contrato Auxílio
     Doença.docx` de prontidão. **RAC/formulários** (contribuições em atraso,
     Autodeclaração de segurado especial, declaração de endereço) pela pasta
     `Formulários IN128`/`_Modelos Procurações`. **Petição** passa por
     `base-revisao-peticao-aprofundada` e busca o MODELO OURO em Modelos Ouro 2.0.
     **Relatório médico** pela espécie + MODELO OURO (Reginaldo Augusto Garcia), 1 folha.
   - **Tarefa de outro colaborador** (Marcão, Amanda, Ingrid, André), fazer o
     **encaminhamento no parecer** (de quem é e o que precisa fazer), sem executar
     fora do escopo.

f) **Gerar a CONCLUSÃO** **ultraenxuta, 2 a 3 linhas**, só o achado e o próximo passo,
   leitura direta e sem enrolação. NÃO iniciar com data ou prefixo (o script adiciona
   "DD.MM.AAAA (C): "). Nunca inventar; faltando documento, dizer claramente. No modo
   complemento, registra só o que foi feito na nova data.
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusão>"`

g) **Salvar o parecer SEMPRE em .docx (Word)**, no padrão do escritório (gerar com
   `docx_escritorio.py`), **NÃO em Google Doc**. Casos simples, **máximo UMA página**.
   Casos de **aposentadoria/tempo, PPP, períodos rurais ou processo judicial** seguem a
   estrutura de divisões da **"Análise da Vida Completa"** do CLAUDE.md (cabeçalho
   tabelado, conclusão no topo, vida contributiva cronológica com PPP período a período
   e rural, contagem de tempo, o que o cliente obteve, caminhos possíveis a/b/c), aqui a
   regra de uma página é exceção. **Sempre apurar se o cliente tem ação contra o INSS**
   (litispendência/averbação pendente). Suba para a
   subpasta `Claude` do cliente (criar com `create_file` mime folder se não existir) com
   `python3 gdrive_upload.py "<arquivo.docx>" "<id_subpasta_Claude>" "Parecer -
   <Cliente> - DD.MM.AAAA.docx"` (upload direto pela API, sem base64 pelo contexto).
   **Todos os documentos gerados** (parecer, procuração, RAC, relatório, autodeclaração)
   ficam na subpasta `Claude`, subidos pelo mesmo `gdrive_upload.py`; apague o temporário
   local depois. Falhando por falta de escopo de escrita, avise para reautenticar
   (`gdrive_authcode.py`) e, como contingência, entregue o .docx pelo chat e registre a
   pendência. Texto **enxuto e humano**, como o Paulo escreveria. Antes de fechar,
   **revise nas skills** (toda tese ancorada em skill lida ou documento, proibido
   inventar). Conteúdo, contexto do benefício, checklist de documentos com faltantes em
   destaque, achados do CNIS, pendências do histórico, lista de renomeações sugeridas e
   mensagem ao cliente quando aplicável.
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
- Conclusão SEMPRE até 4 linhas, em português com acentuação, direta.
- Gravação automática em todas, sem etapa de aprovação.
- NÃO renomear nem apagar no Drive (só listar renomeações). NÃO enviar mensagens
  (só deixar prontas). NÃO usar Gmail salvo pedido explícito.
- Apagar arquivos temporários locais que criar.
- **Encadeamento (handoff)**, por padrão a triagem só diagnostica e recomenda o
  próximo passo. Quando o Paulo pedir ("montar"/"seguir" ou pedido explícito) E o
  caso estiver **Pronto** (sem pendência bloqueante), encadeie executando o fluxo
  recomendado (`/inicial` ou `/inicial-inss`) para aquele cliente, reaproveitando o
  parecer já gravado. Nunca encadeie havendo pendência bloqueante.
