---
description: Monta a peticao inicial pronta para distribuir - le toda a pasta do cliente no Drive e as instrucoes do To Do, confere as citacoes de jurisprudencia/legislacao, faz leitura adversaria (red-team), ajusta a peca e organiza a subpasta "Documentos da Peticao Inicial" (numerada, fatiada, curada) para PJe/ESAJ/Eproc
---

Monte a peticao inicial e o jogo de provas de UM cliente, deixando tudo pronto
para distribuicao. ARGUMENTO: `<Cliente|CPF>`. Leia ANTES o `CLAUDE.md` (doutrina;
legenda P/M/I/D/A/C; limitacoes do Drive; **Modelos de peticao - Padrao Ouro**;
**Analise de PPP**; **Leitura de documentos - cadeia OBRIGATORIA**; nomenclatura
nome + DDMMAAAA; estilo do escritorio). Gravacao automatica, com relatorio ao
final. NAO protocole, NAO envie nada, NAO sobrescreva arquivos. So prepare.

**Handoff da `/triagem`.** Se a triagem marcou "Pronto para /inicial", comece lendo
o **parecer** e a secao **"Pendencias em aberto"** do cliente (subpasta `Claude`) como
ponto de partida, em vez de refazer o diagnostico.

## 1. Acesso e carregamento
- `python3 graph_bootstrap.py`.
- Localize a tarefa do cliente no To Do (por nome/CPF) com `graph_client`
  (`list_lists`/`list_tasks`); use a tarefa ATIVA. Extraia list_id, task_id e
  **leia TODAS as instrucoes do corpo** (historico inteiro), checklist e anexos.
- **Procure TODAS as tarefas do mesmo cliente em TODAS as listas** (por CPF e por
  nome), nao so a que originou o pedido. E comum o mesmo cliente ter tarefa na lista
  **INSS** e outra na **Judicial**. Leia todas e cruze antes de montar a peca, isso
  evita conflito e capta **litispendencia/duplicidade** (acao judicial e requerimento
  administrativo sobre o mesmo beneficio). Use `python3 triagem_do_dia.py`
  (`outras_tarefas`) ou `graph_client`. Havendo tarefa paralela, **sinalize em
  destaque** e ajuste a estrategia.

## 2. Leitura integral (cadeia obrigatoria)
- Localize a pasta do cliente no Drive e **leia a INTEGRALIDADE** de cada documento
  (CNIS, PPP, laudos, CTPS, processo/PA, procuracoes, comprovantes). Use OCR/
  `download_file_content` em base64 quando `read_file_content` falhar; se um arquivo
  exceder ~10 MB para download, **sinalize** e registre como nao lido.
- Leia tambem os anexos da tarefa (`todo_anexo.py`).
- **No PA de auxilio-acidente ou beneficio por incapacidade, SEMPRE localize e leia (a)
  a(s) folha(s) da PERICIA MEDICA FEDERAL** (laudo SABI/CADMED, em regra nas ULTIMAS
  folhas), o documento CONTROVERSO que a inicial deve **rebater ponto a ponto**, **e (b)
  a decisao/comunicacao de INDEFERIMENTO** (sempre no PA concluido), de onde se extrai o
  NB, a data e o MOTIVO exato. Nao suponha, leia. Ver CLAUDE.md.
- **Competencia (foro)**, cliente de **Monte Alto/SP** litiga na Justica Federal da
  **Subseccao de Catanduva/SP** (TRF3), foro federal padrao do escritorio.
- Localize e leia a **peticao inicial ja existente** (subpasta `Claude`) e o
  **MODELO OURO** correspondente (beneficio + esfera) na pasta Modelos Ouro 2.0
  (id `10WkDbxiBnmSSFMFzkW-rcPqTqk6614Rm`; a antiga "Peticoes Ouro" sera excluida).

## 3. Conferencia de citacoes (anti-citacao falsa)
- Para CADA sumula, Tema (STF/STJ/TNU), Enunciado CRPS, REsp/precedente e
  dispositivo legal citado na peca: confira no catalogo interno
  (`base-precedentes-catalogo-vinculantes/references/CATALOGO-*`) e, quando a rede
  permitir, na fonte oficial (STF/STJ/TNU/Planalto) via WebSearch/WebFetch.
- Marque cada citacao como `[CONFERIDO]` ou `[NAO CONFIRMADO - revisar]`. **Nunca**
  mantenha citacao nao verificada nem invente jurisprudencia. Corrija numeros/teses
  trocados.
- **Pesquisa ATIVA de julgados favoraveis (nao so confirmacao).** Use `WebSearch` para
  encontrar temas, sumulas e acordaos FAVORAVEIS a tese e fortalecer a peca, e citar
  decisoes que ajudem na procedencia. Confirme na fonte oficial com `WebFetch` quando
  abrir (CJF/STF/Planalto), os portais STJ SCON, TRF3 e eproc TNU NAO abrem (403/503).
  Favoravel confirmado entra como `[CONFERIDO]`, favoravel nao confirmado como
  `[NAO CONFIRMADO]` (lead para o Paulo conferir), nunca inventado. Ver CLAUDE.md,
  "Pesquisa de jurisprudencia na web".

## 4. Leitura adversaria (red-team)
- Simule a contestacao do INSS/procuradoria. Cheque se a inicial antecipa cada
  defesa tipica aplicavel: previo requerimento administrativo (Tema 350/STF) e
  Tema 1124/STJ; decadencia; prescricao quinquenal; qualidade de segurado/carencia;
  PPP extemporaneo ou sem NEN; EPI eficaz (Tema 555); coabitacao na pensao; etc.
- Consulte `base-revisao-peticao-aprofundada`, `base-efeito-translativo-tema-1124-defesa`
  e as `base-especial-*`/`defesa-probatoria` pertinentes. Reforce a peca contra cada
  fragilidade encontrada.

## 5. Coerencia fato x prova x valor
- Toda alegacao de fato e o valor da causa devem estar amparados por um documento
  na pasta; todo documento juntado deve ser citado na peca. Aponte **fatos orfaos**
  (sem prova) e **provas orfas** (nao citadas) e ajuste.

## 6. Curadoria das provas (incluir SO o que ajuda)
- Selecione apenas a prova que beneficia o segurado. **Exclua** documento incorreto
  ou prejudicial (ex.: PPP errado, laudo contrario, documento de outro cliente).
- No parecer, mantenha uma secao **"NAO JUNTAR"** listando cada documento excluido
  e o motivo.
- Para prova fraca porem **sanavel**, indique como fortalece-la (retificar PPP,
  pedir LTCAT/PGR, pericia indireta - Sumula 198/TFR, justificacao administrativa,
  CTC) e o que falta solicitar antes de distribuir.

## 7. Ajuste da peca (sem sobrescrever)
- Aplique as correcoes (citacoes, red-team, coerencia, padrao ouro/visual) e salve
  a versao ajustada como **NOVO** arquivo na subpasta `Claude`:
  `Peticao Inicial - <Cliente> - DDMMAAAA (revisada)`. Preserve o original.

## 8. Revisao aprofundada OBRIGATORIA (base-revisao-peticao-aprofundada) — autocorrecao
- SEMPRE, antes de fechar a peca, rode a skill `base-revisao-peticao-aprofundada`
  sobre a versao revisada (passo 7): protocolo anti-alucinacao de 5 niveis
  (existencia, vigencia, redacao literal, modulacao, numero de processo/precedente)
  e as 5 camadas (formal, normativa, fatica, argumentativa, integridade probatoria),
  com severidade quadrupla (BLOQUEANTE / CRITICO / IMPORTANTE / MENOR).
- **Corrija automaticamente** os achados sanaveis, sem voltar a perguntar (coerente
  com a gravacao automatica deste fluxo): padrao visual/formatacao, dois-pontos
  logicos, referencia por ID, redacao literal de artigos, numero/tese de precedente
  trocado (substituir pela versao `[CONFERIDO]`), competencia territorial/material,
  fato classificado como "incontroverso" que o INSS impugnou (reclassificar como
  controvertido), fatos orfaos e provas orfas. Gere a peca ja corrigida mantendo o
  versionamento do passo 7 — **sem sobrescrever** o original.
- **Honestidade radical (nao autocorrigir as cegas):** citacao de norma ou
  precedente NAO CONFIRMADA em fonte primaria e **removida/suspensa**, jamais
  inventada ou mantida. Achado BLOQUEANTE que exija decisao estrategica do Paulo
  (tese central apoiada em precedente inexistente, pedido incompativel com o rito,
  ausencia de previo requerimento Tema 1124/STJ, dado fatico que contraria o CNIS)
  **nao se resolve sozinho** — aplique o que for tecnico e **sinalize o restante em
  destaque** no relatorio de prontidao.
- Registre no parecer e no relatorio o **log da revisao**: total de achados por
  severidade, o que foi autocorrigido e o que permanece pendente (com localizacao e
  a correcao aplicada/sugerida).

## 9. Montar a subpasta "Documentos da Peticao Inicial"
- Crie, dentro da pasta do cliente, a subpasta **`Documentos da Peticao Inicial`**
  (mime folder).
- **Procuracao judicial e documentos a produzir** pelos modelos vivos do Drive (nunca
  do zero, ver CLAUDE.md "Modelos e formularios do escritorio"). Pacote `Novo -
  Procuracao Adm. e Judicial...Docs1.docx`, preenchendo `<...>`, removendo o campo do
  dado que faltar, assinalando o beneficio e a Atualizacao Cadastral no Termo,
  ajustando o Contrato pelo realce de cor (e retirando o realce), com a Declaracao de
  Hipossuficiencia do mesmo pacote. CNIS com erro, montar a RAC pelo Anexo certo de
  `Formularios IN128`. Tempo/RMI e **valor da causa** sao no **Previus** (alertar).
- Para cada documento a juntar, garanta um PDF proprio nomeado
  **`NN - <Tipo do Documento> - DDMMAAAA.pdf`** (NN = ordem de distribuicao, 2
  digitos). Ex.: `01 - Procuracao Judicial - 17062026.pdf`.
- **Fatie PDFs combinados**: baixe o original (`download_file_content` base64) para
  um arquivo local; separe por faixas de pagina com
  `python3 pdf_split.py <entrada.pdf> "1-2:Procuracao Judicial" "3:Declaracao de Hipossuficiencia" ...`
  (usa pypdf); suba cada parte com `create_file` na subpasta de destino. Os
  originais permanecem intactos na pasta principal.
- Se um sistema impuser limite de tamanho por arquivo, quebre o PDF grande em
  partes que caibam (e nomeie `... (parte 1 de N)`).
- Primeiro arquivo da subpasta: **`00 - Indice de Provas - DDMMAAAA`** (Google Doc),
  com a tabela *documento -> fato que prova -> item/paragrafo da inicial* e o
  checklist de admissibilidade por sistema/rito (PJe-JEF / ESAJ-TJSP / Eproc-Federal),
  inclusive previo requerimento administrativo.
- Apague os arquivos temporarios locais criados no fatiamento.

## 10. Gravar e relatar
- Conclusao (C) no To Do (`todo_conclusao.py`): max. 4 linhas, com o que foi
  montado, citacoes corrigidas/nao confirmadas, provas excluidas e bloqueios.
- Atualize o parecer na subpasta `Claude` (inclua a secao "NAO JUNTAR", o indice de
  provas e o resultado do red-team).
- **Relatorio de prontidao**: "Pronto para distribuir? SIM/NAO", sistema/rito
  sugerido, e a lista de bloqueios (ex.: falta procuracao assinada, falta comprovar
  previo requerimento, arquivo > 10 MB nao lido, citacao nao confirmada).

## Regras
- So juntar prova que ajuda; nunca jogar documento inutil/prejudicial no jogo de
  provas. Nunca citar jurisprudencia nao conferida.
- NAO renomear/apagar no Drive os originais (so criar novos na subpasta). NAO
  protocolar/distribuir (por ora; no futuro a juntada sera feita por controle do
  navegador). NAO enviar mensagens (so deixar prontas).
- Toda saida em portugues do Brasil com acentuacao correta; datas em BRT.
