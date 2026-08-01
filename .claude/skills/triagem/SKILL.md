---
name: triagem
description: Triagem diária das tarefas do To Do atribuídas a Paulo (vencendo hoje), cruzando com o Drive, base de conhecimento e CNIS, gravando a conclusão (C). Parecer .docx só sob demanda (regra permanente do escritório), nunca por padrão. Complementa análises já existentes (não refaz) e mantém a lista de pendências em aberto. Use para processar a fila do dia, ou para triar um cliente específico passado como argumento.
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
- **Último andamento é triagem MINHA, não reanalisar (decisão do Paulo, 31.07.2026).**
  Antes de qualquer coisa, olhe a **primeira entrada do corpo** (a mais recente). Se ela
  for uma **(C)** minha, o caso já foi analisado e **nada humano entrou depois**, então
  **NÃO refaça a análise**. Releia o fecho `PRÓXIMO:`/`BLOQUEIO:` daquela (C) e feche o
  cliente com uma linha de status ("já triado em DD.MM, sem entrada nova, PRÓXIMO
  mantido"), **sem gravar nova (C)** e sem gastar subagente. A fila só volta a exigir
  análise quando um humano lançar entrada nova ((P), (D), (M), (I) ou (A)). Duas
  exceções, e só elas, **reanalise mesmo assim** se (i) a própria (C) anterior apontou
  uma providência que era **para você executar** e ela continua por fazer, ou (ii) há
  **prazo** vencendo dentro de 15 dias registrado no corpo, hipótese em que a nova (C)
  serve de lembrete do prazo.
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
   tentando outro método.
   - **PDF ou imagem ESCANEADA (sem camada de texto), rota de OCR que funciona
     (31.07.2026).** Quando o Read devolver o PDF vazio, ilegível ou só com ruído, o
     arquivo é imagem, não texto. **Não desista e não deduza pelo nome do arquivo.**
     Rode **`python3 pdf_ocr.py "<arquivo.pdf>" [destino] [--paginas 1-5] [--dpi 200]`**,
     que renderiza cada página em PNG, e **LEIA cada PNG gerado com a ferramenta Read**
     (o modelo enxerga a imagem, esse é o OCR; não existe tesseract no container).
     Página densa ou carimbo apagado, repita a página com `--dpi 300`. Documento longo,
     fatie com `--paginas`. Só depois de tentar essa rota é que uma folha pode ser
     declarada ilegível, e aí diga **qual folha** e por quê.
   CNIS, PPP, rurais e médicos têm leitura integral
   obrigatória; dúvida ou rasura vira **alerta para o Paulo confirmar**. Na triagem
   **NÃO pause**, REPORTE no parecer quantas páginas há, o que diz cada documento e o
   resultado da conferência (e o que não foi lido).
   - **No PA de auxílio-acidente ou benefício por incapacidade, SEMPRE localize (a) a(s)
     folha(s) da PERÍCIA MÉDICA FEDERAL** (laudo SABI/CADMED, em regra nas ÚLTIMAS
     folhas), o documento controverso a desconstituir ponto a ponto na futura inicial,
     **e (b) a decisão/comunicação de INDEFERIMENTO** (sempre no PA concluído), extraindo
     o NB, a data e o MOTIVO exato. Não suponha, leia (ver CLAUDE.md).

e) **Aplicar a doutrina do assistente** (seção correspondente do CLAUDE.md):
   - **A tarefa manda FAZER, então FAÇA (decisão do Paulo, 31.07.2026).** Entrada como
     "23.07.2026 (P): Manifestar sobre os cálculos" é ordem de serviço, não recado.
     Produza a peça, não se limite a recomendar que ela seja feita. Ordem, (1) procure
     na pasta do cliente e na subpasta `Claude` se a peça **já existe**; existindo, NÃO
     refaça, **confira-a** pela regra do parágrafo seguinte; (2) não existindo, leia os
     documentos que fundamentam o ato (no exemplo, a conta de liquidação, a sentença e
     o acórdão), rode `base-revisao-peticao-aprofundada` sobre a minuta, gere o **.docx**
     com `docx_escritorio.py` no padrão do escritório e suba para a subpasta `Claude`
     com `gdrive_upload.py`; (3) na (C), diga que a peça **está pronta na pasta**, o que
     ela sustenta e o que falta para protocolar. Só deixe de produzir quando faltar
     documento **indispensável** (aí a (C) vira BLOQUEIO nominando o documento) ou quando
     o ato for de outro colaborador, hipótese de encaminhamento.
   - **Arquivo PRONTO na pasta exige conferência aprofundada, nunca chancela
     (decisão do Paulo, 31.07.2026).** Achando peça, RAC, formulário, procuração ou
     recurso já pronto e aguardando protocolo, **não escreva que "está pronto"** sem
     conferir. Rode a skill **`base-revisao-peticao-aprofundada`** sobre o arquivo
     (5 níveis anti-alucinação mais as 5 camadas) e confira **dado a dado contra os
     documentos da pasta**, qualificação e dados cadastrais (nome, CPF, NIT, endereço,
     estado civil), o objeto (o que exatamente se pede alterar, o período, a empresa, o
     agente nocivo, o NB, a DER), a competência e o rito, a fundamentação e os pedidos,
     e a assinatura e os anexos. **Achando erro, REFAÇA o documento** com a correção,
     suba a versão corrigida para a subpasta `Claude` e diga na (C) **o que estava errado
     e o que foi corrigido**. Exemplo do Paulo, RAC na pasta, confira se os dados
     cadastrais e o que se quer alterar estão corretos, e se não estiverem, refaça.
   - Conferir se a documentação do benefício está correta e completa; faltando
     algo importante (ex.: RG), destacar.
   - Analisar o **CNIS** (leitura obrigatória, costuma estar na pasta) e apontar
     indicadores a corrigir antes de protocolar (PREC, PEXT, PVNC, IGN, vínculo sem
     data fim, concomitância, competência abaixo do mínimo a complementar ou agrupar).
     **RAC proativa**, achando erro que precise de correção, **monte a RAC mesmo sem
     pedido** (vínculo sem data fim, extemporâneo, ausente comprovado pela CTPS/CAGED/
     RAIS, divergência de rescisão), escolhendo o Anexo certo da pasta `Formulários
     IN128` (ver CLAUDE.md, "Modelos e formulários"). Não faça RAC só por contribuição
     abaixo do mínimo. Cálculo de tempo/RMI/valor da causa é no **Prévius** (você não
     acessa), deixe o alerta pedindo o cálculo e procure na pasta o que o Paulo já
     deixou.
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
   - **Requerimento de benefício por incapacidade no INSS, os quatro dados obrigatórios
     (decisão do Paulo, 31.07.2026).** Sempre que a tarefa for pedir B31/B91/B92 ou
     auxílio-acidente no Meu INSS, a análise e a (C) têm de trazer, expressamente,
     (1) a **data de início dos sintomas**, (2) **quais são os sintomas**, (3) a
     **atividade** exercida pelo segurado e (4) a **descrição dessa atividade** (o que
     ele de fato faz no dia a dia, esforço, postura, peso, repetição, exposição), que é
     o que liga a doença à incapacidade para **aquele** trabalho. Cada um dos quatro
     vem **lido do documento** (relatório médico, prontuário, CTPS, PPP, CNIS) ou da
     entrada do histórico. Faltando algum, **não invente**, escreva "não consta" e leve
     para o BLOQUEIO da (C), com a **mensagem pronta ao cliente** perguntando exatamente
     o que falta (a data em que os sintomas começaram, o que sente, onde trabalha e o
     que faz na função).
   - **PCD**, identificar se aplica **IF-BrA** (LC 142) ou **IF-BrM** (BPC).
   - **Documento a produzir (tome a iniciativa, deixe pronto na subpasta `Claude`).**
     Use os modelos vivos do Drive, NUNCA do zero (ver CLAUDE.md, "Modelos e
     formulários do escritório"). **Procuração** pelo pacote `Novo - Procuração Adm. e
     Judicial - D. Pobreza - Contrato - Recibo de Entrega de Docs1.docx` (preencher os
     campos `<...>`, remover o campo do dado que faltar, assinalar o benefício e a
     Atualização Cadastral no Termo de Representação, ajustar o Contrato pelo realce de
     cor e retirar o realce, paginar uma peça por folha; só não finalizar se faltar
     nome, CPF e endereço). **Auxílio-doença direto no INSS**, procuração própria
     `Procuração Adm. e Contrato Auxílio Doença.docx`, já de prontidão. **RAC e
     formulários** (atualização de contribuições em atraso, Autodeclaração de segurado
     especial, declaração de endereço etc.) pela pasta `Formulários IN128` e
     `_Modelos Procurações`, escolhendo o Anexo certo. **Petição** passa por
     `base-revisao-peticao-aprofundada` antes de gerar e busca o modelo nas Petições
     Ouro. **Relatório médico** pela espécie + MODELO OURO (Reginaldo Augusto Garcia),
     1 folha.
   - **Tarefa de outro colaborador** (Marcão, Amanda, Ingrid, André), fazer o
     **encaminhamento no parecer** (de quem é e o que precisa fazer), sem executar
     fora do escopo.

f) **Gerar a CONCLUSÃO ultracurta (regra do Paulo, quanto mais retriagem, mais curta).**
   Na PRIMEIRA triagem do cliente, uma ou duas frases com o achado essencial, nada
   além. **TETO RÍGIDO (decisão do Paulo, 14.07.2026), a (C) inteira, achado MAIS
   fecho, cabe em no máximo três ou quatro linhas, cerca de 600 caracteres. Se passou
   disso, você escreveu demais, corte, o detalhe (valores, números de processo,
   cronologia, fundamentação) vive no HISTÓRICO e no relatório, NUNCA na (C).** Exemplo
   do tamanho certo (Edson), "B31 previdenciário (NB ...) concedido até 31/07/2026,
   benefício administrativo, a lista Pagamentos só acompanha a mensalidade. A
   documentação médica da prorrogação já está na pasta e o P1 abre em 16/07. PRÓXIMO:
   protocolar o P1 no Meu INSS em 16/07 | BLOQUEIO: nenhum". Nas SEGUINTES (retriagem/complemento), registre APENAS o delta desde a última
   (C) ("Nada novo desde DD.MM" quando for o caso), sem repetir o que o histórico logo
   abaixo já guarda. **Obrigação da retriagem (função de lembrete, decisão do Paulo,
   NUNCA remover): antes de escrever o delta, RELEIA o histórico e as pendências
   listadas abaixo no corpo da tarefa e VERIFIQUE se algo listado ficou sem fazer
   (documento nunca trazido, prazo se aproximando, providência anotada e esquecida).
   O que estiver pendente e dormindo entra no delta como lembrete expresso ("segue
   pendente desde DD.MM: X"), porque o valor da triagem é justamente lembrar o que
   passaria despercebido.** Direto sem perder conteúdo, o conteúdo detalhado fica no histórico
   e no fecho. SEMPRE terminar com o **fecho estruturado em uma linha**, que é o estado
   do caso que a próxima triagem lê primeiro (e por isso barateia as triagens 2ª, 3ª e
   4ª do mesmo cliente):
   `PRÓXIMO: <ação objetiva> | BLOQUEIO: <o que falta, ou "nenhum">`
   (sem campo QUEM, decisão do Paulo de 14.07.2026, o fecho termina no BLOQUEIO; o
   PRÓXIMO já diz quem age. Os dois-pontos do fecho são estruturais, formato de log,
   mesma exceção do prefixo "DD.MM.AAAA (C): ".) NÃO iniciar com data ou prefixo (o script adiciona). Sem `**`.
   Nunca inventar; faltando documento, dizer claramente.
   `python3 todo_conclusao.py "<list_id>" "<task_id>" "<conclusão>"`

g) **Parecer .docx SÓ SOB DEMANDA (regra permanente do escritório, decisão do Paulo).**
   Por padrão a triagem entrega **apenas a conclusão (C)** no To Do (passo f), que é o
   **registro primário**. **NÃO gere o parecer .docx a menos que o Paulo peça
   explicitamente.** Sem parecer, leve para a conclusão (C) o essencial (achado,
   pendências bloqueantes e próximo passo). **Quando o Paulo pedir o parecer**, aí sim
   gere em .docx no padrão do escritório com `docx_escritorio.py` (auto-shrink no
   `salvar()`). **NÃO use Google Doc para o parecer.** Casos simples, **máximo UMA página**. Casos de **aposentadoria/tempo,
   PPP, períodos rurais ou processo judicial** seguem a estrutura de divisões da
   **"Análise da Vida Completa"** do CLAUDE.md (cabeçalho tabelado, conclusão no topo,
   vida contributiva cronológica com PPP período a período e rural, contagem de tempo,
   o que o cliente obteve, caminhos a/b/c), com a regra de uma página como exceção.
   **Sempre apurar se o cliente tem ação contra o INSS** (litispendência/averbação
   pendente, checar o PDF do processo na pasta, o To Do, o CNIS/PA, ou pedir a lista
   do PDPJ ao Paulo). Suba o .docx **para a subpasta `Claude`** do cliente
   (criar a subpasta com `create_file` mime folder se não existir) com
   **`python3 gdrive_upload.py "<arquivo.docx>" "<id_subpasta_Claude>" "Parecer -
   <Cliente> - DD.MM.AAAA.docx"`** (upload direto pela API, sem base64 pelo contexto).
   Título `Parecer - <Cliente> - DD.MM.AAAA` (arquivo novo a cada data; o Drive não
   atualiza nem apaga). **Todos os documentos gerados** (parecer, procuração, RAC,
   relatório médico, autodeclaração etc.) ficam **dentro da subpasta `Claude`**, subidos
   pelo mesmo `gdrive_upload.py`. Apague o arquivo temporário local depois. Se o
   `gdrive_upload.py` falhar por falta de escopo de escrita (token só de leitura),
   avise que é preciso reautenticar (`gdrive_authcode.py`), e, como contingência,
   entregue o .docx ao Paulo pelo chat e registre a pendência de upload. Texto **enxuto
   e humano**, como o Paulo escreveria. Antes de fechar, **revise nas skills** (toda
   tese ancorada em skill lida ou documento, proibido inventar). Conteúdo, contexto do
   benefício, checklist de documentos com faltantes em destaque, achados do CNIS,
   pendências do histórico, lista de renomeações sugeridas e mensagem ao cliente quando
   aplicável.
   - **OBRIGATÓRIO as "Pendências em aberto"** (de forma enxuta na conclusão (C) por
     padrão, e como seção final em destaque quando houver parecer), listando tudo o que
     ainda falta (ex.: falta RG, falta PPP da Cica,
     falta comprovante de residência, indicador de CNIS a corrigir, prazo a
     confirmar). No modo complemento, essa seção é **carregada do parecer anterior
     e atualizada** (o que foi resolvido sai, o que continua pendente permanece, o
     que surgiu entra). É o alerta que mantém o caso organizado e impede esquecer o
     que falta.
   - **OBRIGATÓRIO, terminar com a linha "Próximo passo recomendado"** (ver CLAUDE.md,
     "Encadeamento dos fluxos"), classificando o caso em **Pronto para `/inicial`**,
     **Pronto para `/inicial-inss`** ou **Aguardando <documento/decisão>**.

h) Retornar 1 linha de status: cliente, modo (completo ou complemento), conclusão
   resumida, link do parecer **(quando gerado sob demanda)**, pendências em aberto,
   **próximo passo recomendado**.

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
  "Skills consultadas" tem de existir no parecer, quando gerado sob demanda.

## 3.6 Revisão Sistema 2 — Antiviés (LER e aplicar `sistema-2-antivies`)
Passada a porta de qualidade, rode a skill **`sistema-2-antivies`** sobre a própria
análise, antes de gravar. Percorra os seis vieses (ancoragem, recência, deferência
à perícia, confirmação a favor da própria tese, enquadramento do benefício,
negligência de base), corrija o que estiver enviesado e **nomeie o gargalo honesto**
da tese. Por padrão isso se reflete na **conclusão (C)** e no status (o gargalo vai
para as pendências e pode mudar o próximo passo). Quando houver parecer sob demanda,
registre nele a seção **"Revisão Sistema 2 — Antiviés"** (vieses encontrados e
corrigidos, e os afastados), e leve o gargalo para "Pendências em
aberto". A revisão pode **rebaixar** o próximo passo (de Pronto para Aguardando
documento) quando expuser pendência bloqueante, isso é acerto do método.

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
  `triagem.py`, `triagem_do_dia.py`, `todo_anexo.py`, `todo_conclusao.py`,
  `pdf_ocr.py` (leitura de escaneado, exige PyMuPDF/`fitz`), `docx_escritorio.py`,
  `gdrive_upload.py` e um `graph_tokens.json` valido.
- **MCP:** Google Drive (search_files, read_file_content, download_file_content,
  create_file) e Microsoft To Do via Microsoft Graph.
- **Skills de apoio (base/ponte):** `base-precedentes-catalogo-vinculantes`,
  `base-cnis-acerto-indicadores`, `base-documentos-comprobatorios-in128` e a `base-*`/
  `ponte-*` do beneficio de cada cliente, alem do `CLAUDE.md` do escritorio (que traz
  o mapa de ativacao de skills e as verificacoes automaticas).
