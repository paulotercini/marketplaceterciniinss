# Guia dos Fluxos do Escritório — /triagem, /inicial e /inicial-inss

Instruções completas dos três fluxos de trabalho do escritório Paulo R. Tercini
Filho (OAB/SP 331.110), atuação exclusivamente pró-segurado. Este documento
compila o conteúdo das skills `triagem`, `inicial` e `inicial-inss`. Toda saída
em português do Brasil com acentuação correta, datas em horário de Brasília.

---

## Espinha comum aos três fluxos

Antes de qualquer coisa, ler o `CLAUDE.md` e o `CLAUDE-OPERACIONAL.md` por
inteiro (doutrina, personalização, legenda P/M/I/D/A/C, limitações do Drive,
nomenclatura, estilo, mapa de ativação de skills, verificações obrigatórias).

Invariantes que valem para os três:

- Garantir o acesso ao Microsoft Graph (`python3 graph_bootstrap.py`).
- Procurar TODAS as tarefas do mesmo cliente, em TODAS as listas (por CPF e por
  nome). O mesmo cliente costuma ter tarefa na lista INSS e outra na Judicial.
  Cruzar o histórico antes de agir, para capturar litispendência e duplicidade.
- Ler a pasta do cliente no Drive pela cadeia de leitura obrigatória (leitura
  integral, conferência da última para a primeira página, OCR em português,
  registro do que não foi lido).
- Só citar jurisprudência conferida no catálogo interno ou na fonte oficial, e
  só se favorece o segurado. Marcar `[CONFERIDO]` ou `[NÃO CONFIRMADO]`. Nunca
  inventar dado, número, data, tese ou precedente.
- Gravação automática, sem etapa de aprovação prévia. Estilo do escritório (sem
  dois pontos lógicos, sem travessão, sem "não é X, é Y", frases curtas).
- NÃO protocolar, NÃO enviar mensagens, NÃO renomear nem apagar no Drive (só
  criar arquivos novos e listar renomeações sugeridas). Apagar temporários locais.

Encadeamento, a `/triagem` diagnostica e recomenda; conforme o "Próximo passo
recomendado", segue-se `/inicial` (via judicial) ou `/inicial-inss` (via
administrativa), reaproveitando o parecer já gravado.

---

# 1. /triagem — diagnóstico diário

Triagem das tarefas do To Do atribuídas a Paulo vencendo hoje, cruzando com o
Drive, a base de conhecimento e o CNIS, gravando conclusão mais parecer.
Complementa pareceres existentes (não refaz) e mantém a lista de pendências em
aberto. Serve para a fila do dia ou para um cliente específico passado como
argumento.

## 0. Postura e rigor (vale para toda a triagem)

- Português do Brasil com acentuação correta em tudo (conclusão, parecer,
  mensagem, nome de arquivo). O `todo_conclusao.py` aborta conclusão sem acento.
- Proibido inventar. Todo dado vem lido de documento. Sem documento, "não consta
  / a confirmar". Sem confirmação de norma, tema ou precedente, "Não localizado".
  Jurisprudência só depois de conferida em `base-precedentes-catalogo-vinculantes`
  (e na fonte oficial quando a rede permitir) e só se favorece o segurado.
- Estilo do escritório, sem dois pontos como separador lógico, sem travessão, sem
  "não é X, é Y", sem abertura ou fecho genérico. Frases curtas, fato ligado ao
  direito, negrito no que importa.

## 1. Garantir acesso ao Microsoft Graph

`python3 graph_bootstrap.py`.

## 2. Coletar as tarefas do dia

`python3 triagem_do_dia.py` (sem argumento = hoje, BRT). Grava `triagem_hoje.json`.

- Se `total` = 0, informar que não há tarefas e PARAR.
- Cada item traz `lista`, `list_id`, `task_id`, `title`, `body`, `checklist`,
  `anexos`, `cliente_chave`, `outras_tarefas` e `ja_triado_hoje`.
- Múltiplas tarefas do mesmo cliente (obrigatório cruzar), quando `outras_tarefas`
  não estiver vazio, ler TODAS, tratar o cliente uma vez só com análise
  consolidada e gravar a mesma conclusão (C) em cada tarefa, uma referenciando a
  outra. Captura litispendência (pedido administrativo mais ação judicial sobre o
  mesmo benefício).
- Já triado hoje (`ja_triado_hoje` = true), não refazer do zero nem duplicar. Ler
  a (C) e o parecer já gravados e COMPLEMENTAR só o que falta. Nada a acrescentar,
  registrar que já estava triado e seguir.

## 3. Processar CADA tarefa (gravação automática)

Delegar cada cliente a um subagente, passando o item do JSON e lembrando de ler o
`CLAUDE.md` e o `CLAUDE-OPERACIONAL.md` primeiro.

a) **Verificar se já existe parecer** na subpasta `Claude` do cliente. Define o
   modo. NÃO existe → modo COMPLETO (análise integral, itens b a g). JÁ existe →
   modo COMPLEMENTO, não refaz do zero, lê o parecer mais recente e o histórico,
   faz só o que a nova data pede, o novo parecer é incremental.

b) **Entender a pendência** pelo `body` (entradas mais recentes no topo), pelo
   `checklist` e pelos `anexos`. Identificar o benefício pleiteado e o que o Paulo
   precisaria fazer. Manter coerência com a análise anterior.

c) **Ativar e LER as skills certas (porta obrigatória, antes de qualquer tese).**
   1. Nomear o benefício.
   2. Resolver pelo mapa de ativação do `CLAUDE.md` os nomes EXATOS das skills
      `base-*`/`ponte-*`. Em dúvida, Grep/Glob em `_base-conhecimento-inss/skills/`.
      Nunca chutar nome.
   3. ABRIR E LER o `SKILL.md` de cada skill (e os `references/`), antes de
      afirmar. Sempre `base-precedentes-catalogo-vinculantes` e seu `CATALOGO-*`
      antes de citar Tema/Súmula/Enunciado; sempre `base-cnis-acerto-indicadores`
      ao analisar CNIS; sempre `base-documentos-comprobatorios-in128` no checklist.
   4. Toda tese, precedente, artigo e regra vem de skill lida ou documento, marcada
      `[CONFERIDO]`. O resto é "Não localizado" ou `[NÃO CONFIRMADO]`.
   5. Registrar a linha "Skills consultadas: <lista>".
   6. Rodar as verificações automáticas do CLAUDE.md que couberem (Tema 1124,
      decadência art. 103, qualidade de segurado, tutela de urgência, acumulação
      EC 103, EPI/ruído Tema 555, IN 128/2022 etc.).
   7. Pesquisa de jurisprudência na web (sempre ativa), `WebSearch` para achar
      julgados FAVORÁVEIS, confirmar na fonte oficial com `WebFetch` quando abrir
      (CJF/STF/Planalto), marcar `[CONFERIDO]`/`[NÃO CONFIRMADO]`. Nada inventado.

d) **Localizar a pasta do cliente** no Drive (`search_files` por nome ou CPF) e
   listar arquivos. Anexo da tarefa lê-se com
   `python3 todo_anexo.py "<list_id>" "<task_id>" "trecho"`. Cadeia de leitura
   obrigatória, mapear TODOS os documentos com leitura integral, refazer da última
   para a primeira página com OCR em português, identificar as folhas não lidas.
   CNIS, PPP, rurais e médicos têm leitura integral obrigatória. Na triagem NÃO
   pausar, REPORTAR no parecer. No PA de auxílio-acidente ou incapacidade, sempre
   localizar (a) a perícia médica federal (laudo SABI/CADMED, em regra nas últimas
   folhas) e (b) a decisão de indeferimento (NB, data e motivo exato).

e) **Aplicar a doutrina do assistente.**
   - Conferir se a documentação do benefício está completa; faltando algo
     importante (ex.: RG), destacar.
   - Analisar o CNIS e apontar indicadores a corrigir antes de protocolar (PREC,
     PEXT, PVNC, IGN, vínculo sem data fim, concomitância, competência abaixo do
     mínimo). RAC proativa achando erro que precise de correção, escolhendo o Anexo
     certo de `Formulários IN128`. Cálculo de tempo/RMI/valor da causa é no Prévius
     (deixar o alerta e procurar o que o Paulo já deixou na pasta).
   - Reler o histórico e alertar pendências esquecidas.
   - Documento a terminar, buscar ou criar já preenchido. "Verificar digitalização",
     analisar no contexto. MS, listar os documentos que faltam.
   - Apontar renomeações sugeridas (nome atual → nome correto).
   - Precisando avisar o cliente, redigir a mensagem pronta para copiar.
   - Incapacidade (B31/B91/B92, auxílio-acidente), verificar carência, qualidade de
     segurado e DII dentro do período de manutenção, com alerta se a DII cair fora, e
     doença que isenta de carência.
   - PCD, identificar se aplica IF-BrA (LC 142) ou IF-BrM (BPC).
   - Documento a produzir, tomar a iniciativa pelos modelos vivos do Drive, nunca do
     zero (procuração pelo pacote padrão, auxílio-doença pela procuração própria, RAC
     e formulários pela pasta `Formulários IN128`, petição passa por
     `base-revisao-peticao-aprofundada` e busca o Modelo Ouro, relatório médico pela
     espécie mais Modelo Ouro de Reginaldo Augusto Garcia, uma folha).
   - Tarefa de outro colaborador, fazer o encaminhamento no parecer, sem executar
     fora do escopo.

f) **Gerar a CONCLUSÃO**, ultraenxuta (2 a 3 linhas), só o achado e o próximo
   passo, sem iniciar com data (o script põe o prefixo). No modo complemento,
   registra só o que foi feito na nova data.
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusão>"`

g) **Salvar o parecer SEMPRE em .docx** no padrão do escritório
   (`docx_escritorio.py`), nunca Google Doc. Casos simples, máximo uma página.
   Casos de aposentadoria/tempo, PPP, rural ou processo judicial seguem a estrutura
   da "Análise da Vida Completa" (cabeçalho tabelado, conclusão no topo, vida
   contributiva cronológica com PPP período a período e rural, contagem de tempo, o
   que o cliente obteve, caminhos a/b/c). Sempre apurar se o cliente tem ação contra
   o INSS. Subir à subpasta `Claude` com
   `python3 gdrive_upload.py "<arquivo.docx>" "<id_subpasta_Claude>" "Parecer - <Cliente> - DD.MM.AAAA.docx"`.
   Falhando o upload por falta de escopo de escrita, avisar que é preciso
   reautenticar (`gdrive_authcode.py`) e entregar o .docx pelo chat como
   contingência. Obrigatório, seção final "Pendências em aberto" em destaque, e a
   linha final "Próximo passo recomendado" (Pronto para /inicial, Pronto para
   /inicial-inss ou Aguardando <documento/decisão>).

h) Retornar 1 linha de status, cliente, modo, conclusão resumida, link do parecer,
   pendências em aberto, próximo passo recomendado.

## 3.5 Porta de qualidade (revisar ANTES de gravar)

- Português, ortografia e acentuação corretas em TODO o texto, inclusive no
  parecer. Sem dois pontos lógicos, sem travessão, sem "não é X, é Y".
- Direito, cada benefício, tese, artigo e precedente ancorado em skill lida ou
  documento. Nada inventado. Não conferido, removido ou `[NÃO CONFIRMADO]`.
- Skills, você de fato LEU o catálogo de precedentes e a(s) skill(s) do benefício.
  A linha "Skills consultadas" tem de existir.

## 4. Relatório final

Tabela Cliente | Modo | Conclusão | Parecer | Pendências em aberto. No topo,
destacar as tarefas bloqueadas por documento faltante, indicador de CNIS ou prazo.

## Regras

- Escopo, tarefas atribuídas ao Paulo (P) vencendo hoje. Cliente específico como
  argumento, processar só a tarefa ativa dele (mesma cadeia b a h).
- Conclusão sempre até 4 linhas, acentuada, direta. Gravação automática.
- Não renomear nem apagar no Drive (só listar renomeações). Não enviar mensagens.
  Não usar Gmail salvo pedido. Apagar temporários locais.
- Handoff, por padrão a triagem só diagnostica. Pedido explícito ("montar"/"seguir")
  mais caso Pronto (sem pendência bloqueante), encadeia o fluxo recomendado,
  reaproveitando o parecer. Nunca encadeia havendo pendência bloqueante.

## Dependências no ambiente

Scripts na raiz (`graph_bootstrap.py`, `graph_client.py`, `triagem.py`,
`triagem_do_dia.py`, `todo_anexo.py`, `todo_conclusao.py`) e `graph_tokens.json`
válido. MCP do Google Drive e do Microsoft To Do. Skills de apoio
(`base-precedentes-catalogo-vinculantes`, `base-cnis-acerto-indicadores`,
`base-documentos-comprobatorios-in128` e a do benefício) mais o `CLAUDE.md`.

---

# 2. /inicial — petição inicial judicial

Monta a petição inicial e o jogo de provas de UM cliente, pronto para distribuir
no PJe/ESAJ/Eproc. ARGUMENTO `<Cliente|CPF>`. Nunca protocola, nunca envia, nunca
sobrescreve. Só prepara.

Handoff da `/triagem`, se marcou "Pronto para /inicial", começa lendo o parecer e
a seção "Pendências em aberto" do cliente, em vez de refazer o diagnóstico.

## 1. Acesso e carregamento

- `python3 graph_bootstrap.py`.
- Localizar a tarefa do cliente no To Do (por nome/CPF) com `graph_client`, usar a
  ativa, extrair `list_id`/`task_id` e ler TODAS as instruções do corpo, checklist
  e anexos.
- Procurar TODAS as tarefas do cliente em TODAS as listas. Havendo tarefa paralela
  na outra via, sinalizar em destaque e ajustar a estratégia (litispendência).

## 2. Leitura integral (cadeia obrigatória)

- Localizar a pasta do cliente e ler a INTEGRALIDADE de cada documento (CNIS, PPP,
  laudos, CTPS, processo/PA, procurações, comprovantes). OCR/`download_file_content`
  base64 quando `read_file_content` falhar; arquivo acima de ~10 MB, sinalizar.
- Ler os anexos da tarefa (`todo_anexo.py`).
- No PA de auxílio-acidente ou incapacidade, sempre localizar e ler (1) a perícia
  médica federal (laudo SABI/CADMED, últimas folhas), documento controverso a
  rebater ponto a ponto, e (2) a decisão de indeferimento (NB, data, motivo exato).
- Localizar e ler a petição inicial já existente (subpasta `Claude`) e o MODELO
  OURO correspondente (benefício mais esfera) na pasta Modelos Ouro 2.0
  (id `10WkDbxiBnmSSFMFzkW-rcPqTqk6614Rm`).

## 3. Conferência de citações (anti-citação falsa)

- Para cada súmula, Tema (STF/STJ/TNU), Enunciado CRPS, REsp/precedente e
  dispositivo legal citado, conferir no catálogo interno e, quando a rede permitir,
  na fonte oficial. Marcar `[CONFERIDO]` ou `[NÃO CONFIRMADO - revisar]`. Corrigir
  números/teses trocados. Nunca manter citação não verificada nem inventar.
- Pesquisa ATIVA de julgados favoráveis com `WebSearch`, confirmar na fonte oficial
  com `WebFetch` quando abrir (STJ SCON, TRF3 e eproc TNU não abrem). Favorável
  confirmado entra `[CONFERIDO]`, não confirmado `[NÃO CONFIRMADO]`, nunca inventado.

## 4. Leitura adversária (red-team)

- Simular a contestação do INSS. Checar se a inicial antecipa cada defesa típica,
  prévio requerimento (Tema 350/STF) e Tema 1124/STJ, decadência, prescrição
  quinquenal, qualidade de segurado/carência, PPP extemporâneo ou sem NEN, EPI
  eficaz (Tema 555), coabitação na pensão etc.
- Consultar `base-revisao-peticao-aprofundada`,
  `base-efeito-translativo-tema-1124-defesa` e as `base-especial-*`/defesa
  pertinentes. Reforçar a peça contra cada fragilidade.
- Competência (foro), cliente de Monte Alto/SP litiga na Subseção de Catanduva/SP
  (TRF3, JEF de Catanduva), salvo prova de domicílio em outra subseção.

## 5. Coerência fato × prova × valor

- Toda alegação de fato e o valor da causa amparados por documento na pasta; todo
  documento juntado citado na peça. Apontar fatos órfãos (sem prova) e provas órfãs
  (não citadas) e ajustar.

## 6. Curadoria das provas (incluir só o que ajuda)

- Selecionar só a prova que beneficia o segurado. Excluir documento incorreto ou
  prejudicial (PPP errado, laudo contrário, documento de outro cliente). Manter no
  parecer a seção "NÃO JUNTAR" com cada exclusão e o motivo.
- Prova fraca porém sanável, indicar como fortalecê-la (retificar PPP, pedir
  LTCAT/PGR, perícia indireta Súmula 198/TFR, justificação, CTC) e o que falta.

## 7. Ajuste da peça (sem sobrescrever)

- Aplicar as correções (citações, red-team, coerência, padrão ouro/visual) e salvar
  como NOVO arquivo na subpasta `Claude`,
  `Peticao Inicial - <Cliente> - DDMMAAAA (revisada)`. Preservar o original.

## 8. Revisão aprofundada obrigatória (autocorreção)

- Sempre, antes de fechar, rodar `base-revisao-peticao-aprofundada` sobre a versão
  revisada, protocolo anti-alucinação de 5 níveis (existência, vigência, redação
  literal, modulação, número de processo/precedente) e as 5 camadas (formal,
  normativa, fática, argumentativa, integridade probatória), severidade quádrupla
  (BLOQUEANTE / CRÍTICO / IMPORTANTE / MENOR).
- Corrigir automaticamente os achados sanáveis (padrão visual, dois pontos lógicos,
  referência por ID, redação literal, precedente trocado, competência, fato
  reclassificado, fatos e provas órfãos), sem sobrescrever o original.
- Honestidade radical, citação não confirmada é removida/suspensa, jamais inventada.
  Achado BLOQUEANTE que exija decisão estratégica do Paulo não se resolve sozinho,
  aplicar o técnico e sinalizar o restante em destaque.
- Registrar o log da revisão (achados por severidade, autocorrigido, pendente).

## 9. Montar a subpasta "Documentos da Peticao Inicial"

- Criar a subpasta `Documentos da Peticao Inicial` (mime folder) na pasta do cliente.
- Procuração judicial e documentos a produzir pelos modelos vivos do Drive, nunca do
  zero (pacote padrão, campos `<...>`, benefício e Atualização Cadastral no Termo,
  Contrato ajustado pelo realce de cor e realce retirado, Declaração de
  Hipossuficiência). CNIS com erro, RAC pelo Anexo certo. Valor da causa é no Prévius.
- Cada documento com um PDF próprio `NN - <Tipo do Documento> - DDMMAAAA.pdf`
  (NN = ordem de distribuição, 2 dígitos).
- Fatiar PDFs combinados com `pdf_split.py` (baixar base64, separar por faixas de
  página, subir com `create_file`). Originais intactos. Limite de tamanho por
  arquivo, quebrar em partes.
- Primeiro arquivo, `00 - Indice de Provas - DDMMAAAA` (Google Doc), tabela
  documento → fato que prova → item/parágrafo da inicial, mais o checklist de
  admissibilidade por sistema/rito (PJe-JEF / ESAJ-TJSP / Eproc-Federal), inclusive
  prévio requerimento. Apagar temporários locais.

## 10. Gravar e relatar

- Conclusão (C) no To Do, máx. 4 linhas, o que foi montado, citações
  corrigidas/não confirmadas, provas excluídas, bloqueios.
- Atualizar o parecer na subpasta `Claude` (seção "NÃO JUNTAR", índice de provas,
  resultado do red-team).
- Relatório de prontidão, "Pronto para distribuir? SIM/NÃO", sistema/rito sugerido,
  lista de bloqueios.

## Regras

- Só juntar prova que ajuda; nunca citar jurisprudência não conferida. Não
  renomear/apagar originais (só criar novos na subpasta). Não protocolar/distribuir.
  Não enviar mensagens. Tudo em pt-BR acentuado, datas em BRT.

## Dependências no ambiente

Scripts na raiz (`graph_bootstrap.py`, `graph_client.py`, `todo_anexo.py`,
`todo_conclusao.py`, `pdf_split.py`, `docx_escritorio.py`) e `graph_tokens.json`.
MCP do Google Drive e do To Do. Skills de apoio
(`base-precedentes-catalogo-vinculantes`, `base-revisao-peticao-aprofundada`,
`base-peticao-previdenciaria-padrao-visual`,
`base-efeito-translativo-tema-1124-defesa`, as `base-especial-*` e a `ponte-*` do
benefício) mais o `CLAUDE.md`. Acervo Modelos Ouro 2.0 no Drive.

---

# 3. /inicial-inss — protocolo administrativo (Meu INSS)

Monta o requerimento administrativo de UM cliente, pronto para anexar no Meu INSS.
ARGUMENTO `<Cliente|CPF>`. Nunca protocola, nunca envia, nunca sobrescreve. Só
prepara. Diferença para o `/inicial`, aqui o destino é o Meu INSS, muda a subpasta,
a numeração/ordem dos arquivos e a peça (petição administrativa de 1 folha, sem
lei/decreto).

Handoff da `/triagem`, se marcou "Pronto para /inicial-inss", começa lendo o
parecer e a seção "Pendências em aberto".

## 1. Acesso e carregamento

- `python3 graph_bootstrap.py`.
- Localizar a tarefa ativa do cliente (por nome/CPF), ler todo o corpo, checklist e
  anexos. Procurar TODAS as tarefas do cliente em todas as listas; havendo via
  judicial paralela, sinalizar e reavaliar se o administrativo é mesmo o caminho.
- Identificar o benefício pretendido e a DER pretendida.

## 2. Leitura integral (cadeia obrigatória)

- Ler a INTEGRALIDADE de cada documento (CNIS, PPP, laudos/relatórios, exames, CTPS,
  rurais, procurações, certidões, identificação). OCR/base64 quando falhar; arquivo
  acima de ~10 MB que não baixa, sinalizar.
- Ler os anexos da tarefa (`todo_anexo.py`).
- Extrair as datas internas que definem a ordem (passo 5), períodos de cada PPP,
  data de confecção de cada relatório/exame, data do fato em cada documento rural.

## 3. Documentação obrigatória (IN 128/2022) — checklist anti-exigência

- Consultar a skill do benefício e listar os documentos exigidos (especial →
  PPP/LTCAT; BPC → CadÚnico/composição familiar/laudos; rural → autodeclaração mais
  início de prova material; pensão → certidão de óbito mais prova de união/
  dependência; incapacidade → documentos médicos).
- Destacar o que falta, lista pronta para o Paulo solicitar ao cliente.

## 4. Antecipar a carta de exigência (red-team do analista)

- Simular o que o analista costuma exigir (qualidade/carência, PPP sem campo X,
  carência rural, CadÚnico, laudo recente etc.) e já resolver/anexar o possível ou
  apontar a pendência.

## 5. Curadoria e ordenação (lógica do INSS)

- Curar, juntar só o que ajuda, excluir o prejudicial/incorreto. Seção "NÃO JUNTAR"
  no parecer.
- Ordem dos arquivos = categoria (sequência abaixo) e, dentro de cada categoria,
  ordem CRONOLÓGICA do que está escrito no documento (não a data do arquivo):
  1. Procuração Administrativa
  2. Documento de Identificação (RG/CPF/CNH)
  3. Certidão (Nascimento ou Casamento)
  4. PPPs, na ordem dos períodos de trabalho (mais antigo → mais recente)
  5. Relatórios médicos, ordem cronológica (data do relatório)
  6. Exames médicos, ordem cronológica (data do exame)
  7. Documentos rurais, ordem cronológica pelo conteúdo
  8. Demais (CNIS, comprovante de residência, CadÚnico, autodeclaração etc.)
- Documentos a produzir pelos modelos vivos do Drive, nunca do zero (procuração
  administrativa pelo pacote padrão, ou a própria de auxílio-doença; RAC pelo Anexo
  certo; autodeclaração e formulários pela mesma pasta). CNIS com erro corrigível,
  montar a RAC mesmo sem pedido. Cálculo é no Prévius.

## 6. Montar a subpasta "Documentos Protocolo INSS"

- Criar a subpasta `Documentos Protocolo INSS` na pasta do cliente.
- Nomear cada arquivo com prefixo de 2 dígitos pela ordem de leitura,
  `NN - <Tipo> - DDMMAAAA.pdf`, incluindo o período/data quando ajudar
  (ex.: `04 - PPP Cica (10.1995-03.2001).pdf`).
- Primeiro arquivo, `00 - Requerimento Administrativo - DDMMAAAA` (a peça de 1
  folha do passo 7).
- Fatiar PDFs combinados com `pdf_split.py`. Respeitar o limite de 5 MB por arquivo
  do Meu INSS, quebrar o que exceder. Apagar temporários.

## 7. Petição administrativa de 1 folha (norte para o analista)

- No máximo uma folha, um norte para bater o olho, sem explicações, sem
  fundamentação. Conteúdo, qualificação mínima do segurado e do procurador (OAB/SP
  331.110), o que se requer (benefício mais espécie/B, DER pretendida), rol de
  documentos anexados na ordem (espelha a subpasta).
- NÃO citar lei nem decreto. Se indispensável, apenas IN do INSS ou suas portarias.
  Gerar e entregar SEMPRE em .docx editável (`docx_escritorio.py`), a conversão para
  PDF é só para o upload final. Salvar como `00 - Requerimento Administrativo -
  DDMMAAAA` (.docx) na subpasta de protocolo e também na `Claude`.

## 8. Revisão aprofundada obrigatória (autocorreção)

- Sempre, antes de fechar, rodar `base-revisao-peticao-aprofundada` sobre o
  requerimento e a coerência do conjunto, protocolo anti-alucinação de 5 níveis e 5
  camadas, severidade quádrupla.
- Foco no rito administrativo, a peça não cita lei/decreto (só IN/portaria do INSS,
  conferir a taxonomia via `base-portarias-dpmf-inss-hub`), revalidar o checklist da
  IN 128/2022, o cruzamento CNIS × documentos e a ordenação por categoria/cronologia.
- Corrigir automaticamente os sanáveis (retirar lei/decreto indevidos, dois pontos
  lógicos, divergência de dado contra os documentos, ordem dos anexos, taxonomia de
  portaria), sem sobrescrever o original.
- Honestidade radical, dado não lido em documento ou citação não confirmada é
  removido/"a confirmar", nunca inventado. BLOQUEANTE que dependa do Paulo ou de
  documento faltante, sinalizar em destaque.
- Registrar o log da revisão.

## 9. Ficha de protocolo (Meu INSS) — folha de cola

- Gerar `Ficha de Protocolo INSS - <Cliente> - DDMMAAAA` (subpasta `Claude`) para
  quem vai protocolar, serviço/benefício a selecionar no Meu INSS, dados do segurado
  (nome, CPF, NIT/NIS, nascimento), DER pretendida, ordem de upload (00 → NN) e
  avisos (ex.: atualizar CadÚnico antes).

## 10. Gravar e relatar

- Conclusão (C) no To Do, máx. 4 linhas, o que foi montado, obrigatórios faltantes,
  exclusões, bloqueios.
- Atualizar/criar o parecer na subpasta `Claude` (checklist IN 128/2022 com
  faltantes em destaque, seção "NÃO JUNTAR", exigências antecipadas, renomeações
  sugeridas, mensagem ao cliente quando aplicável).
- Relatório de prontidão, "Pronto para protocolar? SIM/NÃO", benefício/serviço e
  bloqueios (falta procuração assinada, falta RG, CadÚnico desatualizado, PPP a
  retificar, arquivo acima de 5 MB a quebrar).

## Regras

- Só juntar documento que ajuda. Petição de 1 folha sem lei/decreto (só IN/portaria
  se indispensável). Não renomear/apagar originais (só criar novos). Não
  protocolar/anexar no Meu INSS. Não enviar mensagens. Tudo em pt-BR acentuado,
  datas em BRT.

## Dependências no ambiente

Scripts na raiz (`graph_bootstrap.py`, `graph_client.py`, `todo_anexo.py`,
`todo_conclusao.py`, `pdf_split.py`) e `graph_tokens.json`. MCP do Google Drive e
do To Do. Skills de apoio (`base-documentos-comprobatorios-in128`,
`base-revisao-peticao-aprofundada`, `base-portarias-dpmf-inss-hub`,
`base-precedentes-catalogo-vinculantes`, `base-cnis-acerto-indicadores` e a do
benefício) mais o `CLAUDE.md`.
