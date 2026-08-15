---
name: base-peticao-previdenciaria-padrao-visual
description: "Espelho versionado do padrão visual das petições do escritório Paulo Tercini. Replica peticao-previdenciaria com formatação A4, Bookman Old Style 12pt, espaçamento 1,5, cabeçalho timbrado, títulos de seção em tabelas pretas, recuo 2cm/4cm, proibição de dois-pontos, 5 componentes Visual Law, seção obrigatória de Efeitos Financeiros pelo Tema 1124/STJ e implementação em docx-js. Use SEMPRE que mencionar padrão visual petição, formatação petição Tercini, timbre escritório, título preto seção, tabela preta título, Visual Law petição, layout petição, docx-js Tercini, padrão A4, Bookman Old Style 12pt, dois-pontos vedado, recuo 2 cm 4 cm CRPS, linha do tempo, quadro resumo, síntese do caso duas linhas, ponto controvertido e o que se pede, regras anti-poluição Visual Law, teste do relance, fatos incontroversos, tabela comparativa, efeitos financeiros Tema 1124. Cruza com peticao-previdenciaria, revisao-peticao, precedentes-previdenciarios, tema-1124-instrucao-administrativa, mandado-seguranca-previdenciario, especificacao-provas, printscreen-impacto."
---

# Skill de Petições Previdenciárias – Escritório Paulo Tercini

## Visão Geral

Toda petição gerada segue rigorosamente o padrão visual do escritório Advocacia Previdenciária Dr. Paulo Roberto Tercini Filho. Entrega-se .docx com cabeçalho timbrado, formatação consistente e estrutura padronizada. As regras visuais desta skill foram extraídas diretamente das peças reais do escritório, mantidas como referência viva do padrão atual.

## Fluxo de Trabalho

1. Validar o tipo de petição (judicial JEF, judicial rito ordinário, mandado de segurança, recurso, peça administrativa ao INSS, peça administrativa ao CRPS)
2. Aplicar a formatação visual descrita neste arquivo
3. Aplicar as regras de conteúdo e Visual Law correspondentes ao tipo da peça
4. Gerar o .docx usando docx-js (pacote npm `docx`)
5. Validar o documento gerado e entregar via `present_files`

## Regras Críticas de Estilo do Escritório

Estas regras são inegociáveis e seguidas em TODAS as petições.

### Proibição Absoluta de Dois-Pontos

NUNCA utilize o caractere dois-pontos para introduzir explicações, listas, fundamentos, conclusões ou qualquer complemento lógico da frase. Sempre reestruture o período em frases independentes ou conectadas por conjunções. Se uma frase exigir explicação, inicie novo período.

**ERRADO:** "O benefício foi indeferido por dois motivos: falta de carência e ausência de incapacidade."
**CORRETO:** "O benefício foi indeferido por dois motivos. O primeiro é a falta de carência. O segundo é a ausência de incapacidade."

A única exceção são citações literais de legislação, jurisprudência ou ementas, onde os dois-pontos aparecem no texto original.

### Tom e Estilo de Redação

Texto persuasivo, técnico e firme. Parágrafos curtos. Opiniões contundentes sem hesitação. Tópicos organizados de forma lógica, clara e fundamentada. Sem uso de travessões longos como separadores de ideias. Travessão curto é permitido em referências como "Monte Alto – SP" ou "INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS".

---

## Padrão Visual do Escritório

Esta seção define a formatação exata extraída das peças reais do escritório. Valores em twips (1 cm = 567 twips) e EMU (914400 EMU = 1 polegada).

### Página e Margens

- Tamanho da página: **A4** (11907 × 16838 twips)
- Margem superior: **851 twips** (≈ 1,5 cm)
- Margem inferior: **1134 twips** (≈ 2 cm)
- Margem esquerda: **1560 twips** (≈ 2,75 cm)
- Margem direita: **1134 twips** (≈ 2 cm)
- Header (distância da borda): **720 twips** (≈ 1,27 cm)
- Footer (distância da borda): **720 twips** (≈ 1,27 cm)
- Largura útil de conteúdo: **9213 twips** (após margens esquerda e direita)
- `<w:titlePg/>` ativado para que primeira página tenha header/footer próprios

### Fonte e Tipografia do Corpo

- Fonte principal do corpo: **Bookman Old Style**, tamanho **12pt** (24 half-points)
- Alinhamento padrão do corpo: **Justificado** (`AlignmentType.JUSTIFIED`)
- Espaçamento entre linhas: **1,5 linhas** (line: 360, lineRule: auto)
- Espaçamento antes/depois de parágrafos: **12pt** (before: 240, after: 240)
- Recuo de primeira linha do corpo argumentativo:
  - **2 cm (1134 twips)** para petições judiciais (JEF, rito ordinário, mandado de segurança, recursos judiciais)
  - **4 cm (2268 twips)** para petições administrativas ao CRPS (recurso ordinário, recurso especial, embargos, revisão de acórdão)

### Header da Primeira Página (timbre)

A primeira página exibe cabeçalho timbrado em tabela de duas colunas, sem bordas visíveis nas células.

**Tabela do header.**
- Coluna 1: **1668 twips**, contém a logo do escritório
- Coluna 2: **7620 twips**, contém o texto de identificação centralizado
- Todas as bordas das células: `nil` (invisíveis)
- Altura da linha: 993 twips

**Logo (coluna 1).**
- Arquivo real do escritório. `logo-tercini.PNG`, **538x421 px** (proporção 1,278), tipo **PNG**
- Alinhada à direita
- Dimensões de inserção. **Altura padrão 75 px, largura calculada pela proporção real do arquivo** (para o logo atual, 96x75). NUNCA usar largura fixa sem ler a proporção do arquivo
- Nota histórica (Onda 69). A especificação anterior "Imagem JPEG, cx=791210 cy=712470" correspondia a 83x75 e DISTORCIA o logo real. Está superada. O tipo é detectado dinamicamente pelo arquivo encontrado, e as dimensões derivam do cabeçalho binário da imagem

**Texto de identificação (coluna 2), centralizado.**
- Linha em branco (Bell MT, 8pt, espaçador superior)
- "ADVOCACIA PREVIDENCIÁRIA" — Bell MT, negrito, **24pt** (48 half-points)
- "DR. PAULO ROBERTO TERCINI FILHO" — Arial Unicode MS, espaçamento exato 240
- "OAB/SP 331.110" — Arial Unicode MS, espaçamento exato 240

**Linha horizontal separadora.** Parágrafo vazio após a tabela com borda inferior `single, sz=6, color=auto` (preto).

### Header das Demais Páginas

A partir da segunda página, o header é vazio (apenas um parágrafo em branco com espaçamento). Sem logo, sem timbre.

### Footer da Primeira Página

Apenas na primeira página, com linha horizontal acima e endereço/contatos centralizados.

- Parágrafo vazio com borda inferior `single, sz=6, color=auto` (separador superior)
- "Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP" — Arial Unicode MS, centralizado
- "Tel: 16-3242-2908 – Cel: 16-98140-9271" — Arial Unicode MS, centralizado

### Footer das Demais Páginas

Footer das páginas seguintes é vazio. **Não exibir número de página** em nenhuma página da petição.

### Endereçamento ao Juízo

- Alinhamento: **Justificado**
- **Negrito** + **CAIXA ALTA**
- Fonte: Bookman Old Style 12pt
- Sem recuo de primeira linha
- Espaçamento padrão (before: 240, after: 240, line: 360)

Exemplos por tipo de peça.

- **JEF judicial**: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DO EGRÉGIO JUIZADO ESPECIAL FEDERAL DE [CIDADE], ESTADO DE SÃO PAULO."
- **Rito ordinário**: "EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) FEDERAL DA ___ VARA FEDERAL DA SUBSEÇÃO JUDICIÁRIA DE [CIDADE], SEÇÃO JUDICIÁRIA DE SÃO PAULO."
- **Mandado de segurança**: idêntico ao rito ordinário, dirigido à Vara Cível Federal ou Vara Previdenciária competente (consultar skills `mandado-seguranca-previdenciario` e `ms-competencia-autoridade-coatora`).
- **Turma Recursal**: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL PRESIDENTE DA EGRÉGIA TURMA RECURSAL DOS JUIZADOS ESPECIAIS FEDERAIS DA 3ª REGIÃO."
- **CRPS**: "ILMO. SR. PRESIDENTE E DEMAIS MEMBROS DA __ CÂMARA DE JULGAMENTO DO CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL (CRPS)" ou "ILMO. SR. PRESIDENTE E DEMAIS MEMBROS DA __ JUNTA DE RECURSOS DO CONSELHO DE RECURSOS DA PREVIDÊNCIA SOCIAL (CRPS)".

### Número do Processo

- **Negrito**
- Bookman Old Style 12pt
- Sem recuo
- Formato judicial: "Processo nº. XXXXXXX-XX.XXXX.X.XX.XXXX" ou "Proc. n.: XXXXXXX"
- Formato administrativo: "Processo administrativo nº XXXXXXX" e/ou "NB XXX.XXX.XXX-X"

### Qualificação das Partes

A qualificação é redigida em parágrafo único de texto corrido, com recuo de primeira linha de 2 cm (judicial) ou 4 cm (CRPS), alinhado justificado.

Elementos do parágrafo de qualificação na ordem.

1. Nome do autor em **CAIXA ALTA + NEGRITO** (inline, sem parágrafo isolado)
2. Qualificação civil (nacionalidade, estado civil, profissão, RG, CPF, endereço)
3. Conexão com a peça ("vem, respeitosamente, perante V. Exa., propor a presente")
4. **Nome da ação em CAIXA ALTA + NEGRITO**, inline, no próprio parágrafo de qualificação (não em parágrafo isolado destacado)
5. "que move em face do INSTITUTO NACIONAL DO SEGURO SOCIAL – INSS", com **INSS em CAIXA ALTA + NEGRITO**
6. Encerramento ("pelos fatos e fundamentos a seguir expostos")

### Títulos de Seção — Tabela Preta

**Padrão visual obrigatório do escritório.** Cada título de seção é renderizado como uma **tabela de uma célula com fundo preto e texto branco em negrito**, alinhado à esquerda. Esse é o elemento visual mais identificável das peças do escritório e substitui qualquer outra formatação de cabeçalho.

**Estrutura técnica da tabela de título.**

- Largura da tabela: **9214 twips** (preferível) ou 9071 twips, casando com a largura útil de conteúdo
- Tabela de **uma única coluna e uma única linha**
- `tblPr` com `<w:shd w:val="clear" w:color="auto" w:fill="000000"/>`
- `tcPr` com mesmo `<w:shd>` aplicado à célula
- Margens da célula (`tcMar`): top=80, bottom=80, left=120, right=120 (para garantir respiro nas bordas e impedir que o texto encoste em margens dos sistemas eletrônicos)
- Sem bordas explícitas
- `tblLook w:val="04A0" w:firstRow="1"`

**Conteúdo da célula.**

- Parágrafo com `spacing after="0" line="240" lineRule="auto"` e `jc="both"`
- Fonte: **Bookman Old Style 12pt** (sz=24)
- **Negrito** ativado
- **Cor branca explícita** (`<w:color w:val="FFFFFF"/>`) para garantir contraste em todos os renderizadores
- Texto no formato "N. TÍTULO" (número arábico, ponto, espaço, título em caixa alta)
- Subtítulos seguem o formato "N.N. SUBTÍTULO" (numeração hierárquica, ex. "3.1.")

**Exemplos reais do escritório.**

- `1. DOS FATOS`
- `2. DO CERCEAMENTO DE DEFESA PELO INDEFERIMENTO DE ESCLARECIMENTOS DA AVALIAÇÃO SOCIAL`
- `3. DO MÉRITO`
- `3.1. DA IMPUGNAÇÃO OBJETIVA DA PONTUAÇÃO ATRIBUÍDA PELO PERITO MÉDICO`
- `4. DA REAFIRMAÇÃO DA DER`
- `5. DOS PEDIDOS`

**Regra de títulos persuasivos.** O título de seção funciona como antecipação do argumento, não como rótulo burocrático. O julgador que lê apenas os títulos pretos já forma juízo da tese. Sempre que houver elementos fáticos disponíveis, o título incorpora a conclusão antecipada.

- Em vez de "2. DA INCAPACIDADE", usar "2. DA INCAPACIDADE TOTAL E PERMANENTE COMPROVADA DESDE MARÇO DE 2024"
- Em vez de "2. DO TEMPO ESPECIAL", usar "2. DA EXPOSIÇÃO HABITUAL E PERMANENTE A RUÍDO DE 89 dB(A) NO PERÍODO DE 2005 A 2023"
- Em vez de "2. DA QUALIDADE DE SEGURADO", usar "2. DA QUALIDADE DE SEGURADO MANTIDA PELO PERÍODO DE GRAÇA ATÉ A DATA DO ÓBITO"

O título genérico fica reservado para situações em que não houver elementos fáticos suficientes para antecipação (raro em peças bem instruídas).

### Fechamento e Assinatura

- "Pede deferimento." ou "Nestes Termos, Pede e Espera Deferimento."
- Local e data: "Monte Alto, [data por extenso]."
- Assinatura centralizada, com espaçamento maior antes (line break ou parágrafo vazio):
  - **PAULO ROBERTO TERCINI FILHO** (Bookman Old Style 12pt, negrito, caixa alta, centralizado)
  - **OAB/SP 331.110** (Bookman Old Style 12pt, negrito, centralizado)

### Peças com Duas Partes (Petição de Encaminhamento + Razões)

Recurso Inominado, Pedido de Uniformização à TNU, Agravo Interno e Recurso Especial ao CRPS possuem duas partes na mesma peça.

1. **Petição de encaminhamento** dirigida ao juízo ou presidente do órgão, com identificação das partes, fundamentação do cabimento e pedido de remessa. Termina com assinatura
2. Quebra de página
3. **Razões recursais** com cabeçalho próprio centralizado em caixa alta espaçada (ex. "E G R É G I A   T U R M A   R E C U R S A L" ou "COLENDA TURMA / EMÉRITOS JULGADORES"), identificação das partes (Recorrente/Apelante/Agravante e Recorrido/Apelado/Agravado) e desenvolvimento da fundamentação com os títulos pretos numerados

---

## Limite de Jurisprudência na Petição

Jurisprudência não deve ocupar mais de uma página em toda a petição. A técnica é transcrever apenas o precedente mais forte (o mais recente, objetivo e que melhor se enquadra na tese) e enumerar os demais de forma organizada.

**Estrutura obrigatória para fundamentação jurisprudencial.**

1. Transcrever o precedente-chave com a ementa ou trecho relevante em itálico, identificando tribunal, número, relator e data. Máximo de 15 linhas para a transcrição
2. Listar os precedentes complementares em formato resumido, sem transcrição de ementa. Formato "No mesmo sentido, [Tribunal], [número do processo], Rel. [nome], julgado em [data]"
3. Se houver tema repetitivo ou repercussão geral aplicável, este é sempre o precedente-chave a ser transcrito

**No JEF**, limitar a um precedente transcrito + no máximo três complementares listados. **No rito ordinário**, um precedente transcrito + até cinco complementares. **No CRPS**, as regras de enunciados e pareceres vinculantes da skill `admissibilidade-barreiras-crps` prevalecem.

**Hierarquia de citações por proximidade.** As citações jurisprudenciais funcionam como âncoras de convencimento. Quanto mais próximas da realidade do caso em tempo, jurisdição e instância, maior o poder persuasivo. Ordem de preferência obrigatória.

1. Temas repetitivos e repercussão geral aplicáveis ao caso (sempre precedem qualquer outra citação)
2. Súmulas do tribunal competente (TRF3, TNU ou STJ, conforme o rito)
3. Julgados recentes do próprio tribunal ou turma recursal competente (TRF3 3ª Seção, turmas recursais de SP)
4. Julgados recentes de outros TRFs (TRF4, TRF1), somente quando consolidam orientação ausente no TRF3

Doutrina, artigos acadêmicos e livros jurídicos não devem ser citados em petições do escritório, salvo instrução expressa do usuário para caso específico. Julgados antigos (mais de 5 anos sem reafirmação recente) e de tribunais de outras regiões devem ser evitados quando existir precedente mais recente e próximo do tribunal competente.

### Citações de Legislação e Jurisprudência

Citações longas (ementas, trechos de lei) devem ser formatadas em **itálico**, com recuo esquerdo de 2268 twips (4 cm). Podem manter dois-pontos quando são transcrições literais.

---

## Seção Obrigatória — Efeitos Financeiros (Petições Iniciais de Concessão e Revisão)

Toda petição inicial de concessão ou revisão de benefício previdenciário DEVE conter uma seção própria intitulada "DOS EFEITOS FINANCEIROS" (ou variação adequada ao caso, como "DOS EFEITOS FINANCEIROS — DA PROVA PRODUZIDA NA DER [data]"), renderizada com o título preto padrão.

Esta seção é obrigatória porque o Tema 1124/STJ condiciona o termo inicial dos efeitos financeiros ao momento em que a prova foi produzida. Sem fundamentação expressa, o juiz pode deslocar a DIB da DER para a citação, causando perda substancial de atrasados.

**Conteúdo obrigatório.**

1. Classificar expressamente cada documento essencial em uma das três categorias, identificando por ID no PJe.

   a) **Já apresentado ao INSS na DER** — documento que integrava o processo administrativo desde o requerimento. Enquadra o caso no cenário 2.1 do Tema 1124 (DIB na DER)

   b) **Complementar a prova já existente** — documento produzido em juízo que apenas confirma, detalha ou reforça o conjunto probatório já presente na via administrativa. Enquadra o caso no cenário 2.2 do Tema 1124, afastando a incidência do cenário 2.3 por aplicação da distinção entre prova nova e prova complementar (TRF4, 5ª Turma, Apelação Cível 5015397-63.2023.4.04.7112, j. 25/11/2025)

   c) **Novo, inexistente na via administrativa** — documento que surge exclusivamente em juízo. Se inevitável, fundamentar a impossibilidade material de apresentação anterior e argumentar, quando possível, que o requerimento administrativo já era apto e que o INSS descumpriu o dever de oportunizar complementação

2. Fundamentar expressamente que a DIB deve ser fixada na DER (ou na data do preenchimento dos requisitos, se posterior à DER), invocando o cenário aplicável do Tema 1124/STJ

3. Se o INSS não emitiu carta de exigência quando deveria, fundamentar a omissão do dever de cooperação (art. 176-C, Decreto 3.048/99) e enquadrar no cenário 2.2 do Tema 1124

4. Se houver duas ou mais DERs, demonstrar a continuidade do conjunto probatório entre elas, indicando que os documentos da DER posterior "apenas confirmaram" o acervo já existente, para preservar os efeitos financeiros desde a DER mais antiga

**Posição na petição.** Após a fundamentação de mérito (ex. "DO DIREITO", "DA ATIVIDADE ESPECIAL", "DA INCAPACIDADE") e antes dos pedidos. Em petições com múltiplas causas de pedir, a seção de efeitos financeiros é a última antes dos pedidos.

**Exceções.** Não incluir esta seção em embargos de declaração, agravos internos, recursos ao CRPS (salvo quando o mérito recursal envolver efeitos financeiros) ou mandados de segurança.

---

## Gratuidade de Justiça — Técnica de Demonstração Objetiva

O pedido de gratuidade de justiça não deve ser genérico. A hipossuficiência é evidenciada com dados concretos e documentos vinculados.

**Técnica obrigatória.** Quando renda e despesas do segurado estiverem disponíveis, a seção de gratuidade contém tabela de receitas e despesas com três colunas: "Receita/Despesa", "Valor" e "Documento (ID)". Lista o rendimento mensal total, as despesas fixas comprovadas (aluguel, plano de saúde, alimentação, medicamentos, contas básicas) e a renda livre resultante. Cada linha referencia o documento comprobatório por ID no PJe.

**Posição.** Em petições iniciais de concessão e restabelecimento, pode figurar como primeira seção numerada (antes dos fatos) ou como preliminar.

**Quando não usar a tabela.** Se os dados não estiverem disponíveis, usar formulação direta com referência à autodeclaração e ao art. 99 §3º do CPC, sem tabela. A tabela só agrega valor quando os dados são concretos e documentados.

---

## Pedidos

- Introduzidos por "Diante do exposto, requer" ou fórmula similar
- Itens com letras minúsculas (a, b, c, d...) ou algarismos arábicos (1, 2, 3...)
- Sem recuo especial diferenciado, alinhamento justificado
- Recuo de primeira linha mantido conforme o padrão do rito

---

## Petições Envolvendo Pendências do CNIS

Quando a petição envolver indeferimento ou não cômputo de período por pendência no CNIS, seguir o protocolo adicional obrigatório.

**Passo 1.** Consultar a skill `cnis-acerto-indicadores` para identificar a sigla, descrição e impacto do indicador que motivou a restrição.

**Passo 2.** Identificar os argumentos de impugnação específicos do indicador. Os indicadores mais contestáveis são PDIV-DADOS-GFIP (algoritmo Levenshtein), PEXT (extemporaneidade), PDT-NASC-FIL-INV (trabalho infantil), PVIN-MAND-ELETIVO-TOTAL, PVIN-TRAB-INTERM, indicadores de reclamatória trabalhista e indicadores de empresa encerrada (PADM-EMPR, PRES-EMPR, PREM-EMPR).

**Passo 3.** Na seção "DO DIREITO", incluir subseção específica denominada "DA IRREGULARIDADE DO INDICADOR [SIGLA]" ou "DO BLOQUEIO INDEVIDO NO CNIS", com os seguintes elementos.

1. Identificação precisa do indicador (sigla e descrição oficial da Portaria DIRBEN/INSS 990/2022, alterada pela 1.316/2025)
2. Demonstração de que o indicador opera como presunção relativa (juris tantum), ilidível por prova
3. Confronto entre o indicador e a documentação comprobatória do segurado, referenciando cada documento por ID no PJe
4. Fundamentação normativa (art. 19, Lei 8.213/91 — direito ao cômputo; art. 29-A — responsabilidade do empregador pelo recolhimento; princípios do art. 5º, IV e XI, Lei 13.460/2017)
5. Se aplicável, invocação dos princípios transversais de defesa (vedação de punir segurado por omissão do empregador; primazia da realidade; caráter informativo e não constitutivo do CNIS)

**Passo 4.** Na seção "DOS EFEITOS FINANCEIROS", classificar os documentos que suprem o indicador nas categorias do Tema 1124/STJ, demonstrando que a prova já existia na DER.

---

## Política de Tutela de Urgência e Liminar

### Regra Geral — Petições Iniciais (JEF e Rito Ordinário)

**NÃO incluir pedido de tutela de urgência** nas petições iniciais. A petição contém apenas os pedidos de mérito. Esta é a conduta padrão do escritório para todas as ações previdenciárias (concessão, restabelecimento, revisão, conversão, pensão por morte, BPC/LOAS, aposentadoria especial, etc.).

**Exceção.** Somente incluir se o usuário expressamente solicitar ("inclua tutela de urgência", "quero tutela antecipada", "faça com liminar", "com pedido de urgência" ou equivalente inequívoco).

### Regra Especial — Mandado de Segurança

No mandado de segurança, o pedido de **medida liminar SEMPRE deve ser incluído** (art. 7º, III, Lei 12.016/2009), salvo pedido expresso em contrário. Fundamentar com relevância do fundamento (fumus boni iuris) e risco de ineficácia (periculum in mora). Seção própria após fundamentação jurídica e antes dos pedidos.

### Quadro-Resumo da Política

| Tipo de petição | Tutela/Liminar | Condição para alterar |
|---|---|---|
| Inicial JEF | NÃO incluir | Somente se pedir expressamente |
| Inicial rito ordinário | NÃO incluir | Somente se pedir expressamente |
| Mandado de segurança | SEMPRE incluir | Somente se pedir para omitir |
| Recursos, embargos, agravos | Não se aplica | Avaliar caso a caso |

---

## Componentes Visual Law

O escritório adota cinco componentes de Visual Law em petições previdenciárias, todos integrados ao .docx com **paleta preto/branco** alinhada ao padrão visual dos títulos de seção. Sem cores semânticas. A diferenciação se faz por marcadores textuais entre colchetes, símbolos tipográficos e formatação (negrito, itálico, sombreamento cinza para linhas alternadas).

### Princípio de Paleta

Toda tabela Visual Law segue a paleta visual do escritório.

- **Cabeçalho da tabela**: fundo preto (`fill="000000"`), texto branco (`color="FFFFFF"`), Bookman Old Style **10pt** (size 20) negrito, alinhado à esquerda ou centralizado conforme o componente
- **Corpo da tabela**: fundo branco ou cinza muito claro (`fill="F2F2F2"`) para linhas alternadas (zebra), texto preto Bookman Old Style **10pt** (size 20)
- **Bordas**: `single, sz=4, color=000000`
- **Margens internas das células**: top=40, bottom=40, left=80, right=80 (twips). Mais enxutas do que parágrafos do corpo, para diferenciar tabela de texto corrido e economizar espaço vertical
- **Spacing dos parágrafos dentro das células**: `before=0, after=0, line=240, lineRule=auto`, para impedir herança do estilo default do documento
- **Linha de marcador semântico** entre colchetes em caixa alta (ex. `[FAVORÁVEL]`, `[DESFAVORÁVEL]`, `[PROCESSUAL]`, `[PROVA]`, `[INCONTROVERSO]`, `[CONTROVERTIDO]`, `[PARCIAL]`), em negrito, antes do conteúdo da célula. Sem cor distintiva, apenas o rótulo textual carrega o sentido

### Regra Geral de Acionamento

Sempre que a petição se enquadre nos critérios abaixo, o componente Visual Law correspondente é incluído automaticamente, sem necessidade de solicitação expressa. O usuário pode pedir a exclusão de qualquer componente, caso a caso.

### Regras Transversais Anti-Poluição (Onda 104)

Valem para TODOS os componentes Visual Law, acima de qualquer regra específica. A tabela existe para o leitor ENXERGAR o direito em segundos, não para armazenar informação.

Primeira, uma ideia por linha e frase curta por célula. Célula com mais de 30 palavras se reescreve ou se divide. Célula que precisa de rolagem mental não é Visual Law, é parágrafo disfarçado.

Segunda, a tabela nunca repete o que o texto ao redor já disse com as mesmas palavras. Ou a tabela CONDENSA (e o texto detalha), ou a tabela CONFRONTA (e o texto conclui). Repetição é o principal enchimento identificado nas peças.

Terceira, hierarquia visual dentro da paleta preto/branco. O dado que decide (a data-chave, o marco, a providência) vai em NEGRITO dentro da célula, e apenas ele. Negrito em tudo é negrito em nada.

Quarta, informação cadastral não entra em componente Visual Law. Nome, NB, processo, endereço e qualificação vivem nos lugares próprios da peça.

Quinta, o teste do relance fecha todo componente. Olhar a tabela por dez segundos, sem ler o corpo da peça, e perguntar o que ela comunica. Se a resposta não for imediata e única, a tabela volta para enxugamento antes da peça sair.

Sexta, menos linhas comunicam mais. Os limites de cada componente (8 eventos na linha do tempo, 8 linhas no pedido x fundamento) são TETO. O alvo é sempre o menor número de linhas que preserve o sentido.

### Componente 1 — Linha do Tempo (timelineTable)

**Quando usar.** Obrigatória em toda petição inicial de concessão, restabelecimento e revisão de benefício. Obrigatória em mandados de segurança. Opcional em recursos e embargos, a critério do caso.

**Posição na petição.** Ao final da seção "DOS FATOS", após o último parágrafo narrativo e antes do título da seção seguinte.

**Estrutura.** Tabela de três colunas.

- Coluna 1: **Data** (largura 1600 twips, ≈ 2,8 cm), formato dd/mm/aaaa, centralizado
- Coluna 2: **Marcador** (largura 2200 twips, ≈ 3,9 cm), rótulo entre colchetes em caixa alta + negrito, centralizado
- Coluna 3: **Evento** (largura 5413 twips, ≈ 9,5 cm), descrição em texto corrido, justificado, com referência a ID quando aplicável

**Cabeçalho**: fundo preto, texto branco em negrito.

**Marcadores semânticos.**

- `[FAVORÁVEL]` — fatos que fortalecem a pretensão (admissão, contribuições, alta médica favorável, laudo positivo)
- `[DESFAVORÁVEL]` — atos do INSS contra o segurado (indeferimento, cessação, perícia administrativa negativa)
- `[PROCESSUAL]` — marcos processuais (DER, ajuizamento, citação, audiência, sentença, decisão monocrática)
- `[PROVA]` — provas produzidas (laudo particular, exames, PPP retificado, CTPS, certidões)

**Limite de eventos.** Entre 4 e 8 eventos para manter legibilidade. Se o caso tiver mais marcos relevantes, selecionar os mais estratégicos.

### Componente 2 — Quadro-Resumo (caseSummaryBox) [REFORMADO NA ONDA 104]

**Finalidade única.** Dizer ao julgador, em segundos, DUAS coisas. Qual é o ponto controvertido e o que se pede. Nada além disso.

**Quando usar.** Obrigatório em toda petição inicial de concessão e restabelecimento e em todo recurso. Opcional nas demais peças.

**Posição na petição.** Imediatamente após a qualificação das partes e a indicação "pelos fatos e fundamentos a seguir expostos", antes do primeiro título preto numerado.

**Estrutura.** Tabela de duas colunas com cabeçalho preto único "SÍNTESE DO CASO", e SOMENTE DUAS LINHAS.

- Linha 1, rótulo **Ponto controvertido**. UMA frase, máximo de 25 palavras, que nomeia a única questão que o julgador precisa decidir. Sem histórico, sem citação de norma, sem data que não seja essencial à controvérsia.
- Linha 2, rótulo **O que se pede**. UMA frase, máximo de 25 palavras, com a providência pretendida em linguagem direta. Em recurso, a reforma pretendida.

- Coluna 1: **Rótulo** (largura 3000 twips), Bookman Old Style 10pt negrito, sombreamento cinza claro `F2F2F2`
- Coluna 2: **Conteúdo** (largura 6213 twips), Bookman Old Style 10pt, com o NÚCLEO da frase em negrito (a data, o marco ou a providência que decide o caso)

**PROIBIÇÕES EXPRESSAS (Onda 104).** O quadro NÃO contém nome do segurado, NB, número de processo, DER, idade, CID, carência, qualidade de segurado, composição familiar nem qualquer campo cadastral. Tudo isso já está na qualificação, no endereçamento e no corpo da peça, e repetir no quadro só dilui o que importa. O quadro também NÃO contém fundamento jurídico (norma, tema, súmula), que pertence à seção DO DIREITO e ao Componente 5.

**Teste de aprovação do quadro.** Ler somente o quadro, sem o resto da peça. Se o leitor souber exatamente qual é a disputa e o que se pede, o quadro está pronto. Se sobrar qualquer informação que não contribua para essas duas respostas, cortar.

**Exemplo no padrão (caso de aposentadoria PCD com DID controvertida).**

- Ponto controvertido. "A decisão fixou a **DID em 31/12/2015** sem fundamentação, reduzindo o tempo como PCD do requerente."
- O que se pede. "Fixação da **DID em 08/11/1995** e concessão da aposentadoria **desde a DER**."

**Contraexemplo (proibido).** Quadro com oito linhas listando segurado, NB, DER, CID, carência e regra aplicável. Isso é ficha cadastral, não síntese, e cansa o leitor exatamente onde a peça precisava ganhá-lo.

### Componente 3 — Fatos Incontroversos (undisputedFactsTable)

**Quando usar.** Obrigatória em toda petição inicial em que houver pelo menos dois fatos incontroversos identificáveis. Obrigatória em mandados de segurança. Opcional em recursos.

**Posição na petição.** Entre a seção "DOS FATOS" e a seção "DO DIREITO". Pode receber seção própria denominada "DOS FATOS INCONTROVERSOS E PONTOS EM DISPUTA", com título preto padrão, ou ser inserida como elemento visual ao final da seção de fatos.

**Estrutura.** Tabela de quatro colunas.

- Coluna 1: **Fato** (largura 3500 twips), descrição objetiva do fato em texto corrido
- Coluna 2: **Status** (largura 2300 twips), rótulo entre colchetes em caixa alta + negrito, centralizado. Opções: `[INCONTROVERSO]`, `[CONTROVERTIDO]`, `[PARCIAL]`
- Coluna 3: **Prova (ID)** (largura 1700 twips), ID do documento no PJe, centralizado
- Coluna 4: **Fonte** (largura 1713 twips), origem da incontrovérsia ("INSS na decisão", "CNIS", "Certidão de óbito", "Laudo pericial")

**Cabeçalho**: fundo preto, texto branco em negrito.

**Classificação obrigatória.**

- `[INCONTROVERSO]` — fato que o INSS reconheceu na decisão administrativa ou que decorre de documento objetivo. O INSS não pode contestar sem produzir contraprova.
- `[CONTROVERTIDO]` — fato que o INSS negou expressamente ou que depende de prova pericial ou testemunhal ainda não produzida.
- `[PARCIAL]` — fato com reconhecimento parcial pelo INSS ou prova que admite mais de uma interpretação.

**Vinculação a provas.** Cada fato DEVE referenciar o documento comprobatório por ID. Nunca classificar fato como incontroverso sem indicar a prova.

**Efeito estratégico.** Fixa para o julgador o campo de decisão, reduzindo a controvérsia ao ponto realmente disputado. Especialmente eficaz no JEF, onde o juiz precisa decidir rapidamente.

### Componente 4 — Tabela Comparativa (comparisonTable)

**Quando usar.** Obrigatória em toda petição inicial em que o INSS tenha fundamentado expressamente o indeferimento. Obrigatória em impugnação a laudo pericial. Opcional em recursos quando a sentença tiver fundamentação específica a ser confrontada.

**Posição na petição.** Dentro da seção "DO DIREITO", após a fundamentação normativa geral e antes da argumentação específica do caso. Pode também ocupar seção própria denominada "DO CONFRONTO ENTRE A POSIÇÃO DO INSS E A PROVA DOS AUTOS".

**Estrutura.** Tabela de três colunas, larguras iguais (3071 twips cada).

- Coluna 1: **Posição do INSS** (ou "Sentença" em recursos, ou "Depoimento" em confronto de audiências)
- Coluna 2: **Prova dos autos** (ou "Contradição" em confronto de depoimentos)
- Coluna 3: **Conclusão** (inferência objetiva em uma frase)

**Cabeçalho**: fundo preto, texto branco em negrito, centralizado.

**Estrutura do confronto.** Cada linha isola um ponto específico de divergência. A coluna 1 reproduz, de forma concisa, o fundamento utilizado pela autarquia para indeferir. A coluna 2 indica a prova que contraria, sempre com ID do PJe. A coluna 3 apresenta, em uma frase curta e direta, a inferência lógica que o julgador deve extrair daquele confronto. A conclusão funciona como atalho mental, conduzindo o leitor à mesma percepção que o advogado pretende transmitir.

**Confronto de depoimentos.** Em peças com análise de audiência (alegações finais, memoriais pós-audiência, recurso inominado), a tabela é adaptada. Coluna 1, "Depoimento" (identificar a testemunha, a minutagem entre parênteses e transcrever apenas o trecho relevante, máximo 3 linhas). Coluna 2, "Contradição" (outro depoimento ou prova documental, com ID ou minutagem). Coluna 3, "Conclusão" (inferência objetiva em uma frase).

**Limite de pontos.** Entre 2 e 6 pontos de confronto. Se houver mais divergências, agrupar por eixo temático. Em confronto testemunhal, entre 2 e 4 contradições.

### Componente 5 — Tabela-Resumo Pedido x Fundamento (requestSummaryTable)

**Quando usar.** Obrigatória em petições iniciais com dois ou mais pedidos autônomos (ex. reconhecimento de tempo especial + conversão + concessão, ou concessão de benefício + indenização por dano moral). Recomendada em réplicas e memoriais com múltiplos pontos. Opcional em peças com pedido único simples.

**Posição na petição.** Imediatamente antes dos pedidos, como última seção argumentativa da peça. Pode receber título preto "SÍNTESE DOS PEDIDOS E FUNDAMENTOS" ou ser inserida sem subtítulo.

**Estrutura.** Tabela de duas colunas.

- Coluna 1: **Pedido/Alegação** (largura 4000 twips), Bookman Old Style 10pt negrito
- Coluna 2: **Fundamento** (largura 5213 twips), Bookman Old Style 10pt, indicando dispositivo legal, tema repetitivo ou prova

**Cabeçalho**: fundo preto, texto branco em negrito.

**Limite de linhas.** Máximo 8 linhas. Pedidos acessórios (custas, honorários, AJG) são agrupados em linha única.

### Combinação de Componentes

Uma petição inicial típica de concessão de B31 com indeferimento administrativo contém os cinco componentes, nesta ordem.

1. Quadro-resumo (após qualificação, antes do primeiro título preto)
2. Linha do tempo (ao final dos fatos)
3. Fatos incontroversos (entre fatos e direito)
4. Tabela comparativa (dentro do direito)
5. Tabela-resumo pedido x fundamento (antes dos pedidos)

Em petições mais simples (ex. restabelecimento por cessação automática), usar no mínimo o quadro-resumo e a linha do tempo.

Em mandados de segurança, usar no mínimo o quadro-resumo, a linha do tempo e os fatos incontroversos.

Em réplicas, usar no mínimo a tabela de fatos incontroversos/controvertidos (Componente 3 adaptado, com colunas "Fato alegado", "Impugnação pelo INSS" e "Situação processual").

Em memoriais, usar no mínimo o quadro-resumo no formato reformado de duas linhas (Onda 104) e, quando pertinente, um printscreen de jurisprudência (Componente 5 da skill `printscreen-impacto`).

Em recursos, avaliar caso a caso. A tabela comparativa é o componente mais útil em sede recursal, confrontando a sentença com as provas não valoradas.

### Exclusão de Componentes

O usuário pode solicitar a exclusão de qualquer componente com instruções como "sem Visual Law", "sem quadro-resumo", "sem linha do tempo", "petição apenas textual" ou equivalentes. Nesse caso, omitir o componente solicitado e manter os demais, salvo instrução expressa de exclusão total.

---

## Regras de Qualidade Redacional

### Proibição de Argumentação Genérica

Toda afirmação fática na petição DEVE conter pelo menos um elemento verificável (data, valor, número de documento, referência a laudo ou ID de documento nos autos). Frases que não contenham nenhum elemento verificável são provavelmente genéricas e devem ser reescritas.

**Anti-patterns proibidos.** As frases abaixo e suas variações NUNCA devem aparecer em petições do escritório, pois são genéricas, vazias de informação e não auxiliam o julgador a decidir.

"O segurado encontra-se em estado de extrema necessidade." → Substituir por fatos concretos sobre renda, composição familiar e despesas, com referência a documentos.

"A situação é de gravidade ímpar." → Substituir pela descrição objetiva da condição clínica, com CID, data do diagnóstico e referência ao laudo.

"O indeferimento causou profundo abalo." → Substituir pela descrição das consequências concretas (cessação de renda, interrupção de tratamento, risco alimentar), com datas e valores.

"O autor passa por severas dificuldades financeiras." → Substituir pela situação específica (valor da renda familiar, número de dependentes, despesas médicas documentadas).

A regra geral é direta. Quanto mais específica a afirmação fática, mais difícil para o julgador proferir decisão padrão genérica. Fatos específicos exigem respostas específicas.

### Técnica de Demonstração de Urgência

Quando a petição contiver pedido de urgência (liminar em MS ou tutela de urgência quando expressamente solicitada), NUNCA utilizar formatação gritante ("URGENTE" em letras garrafais, cores, sublinhados) para sinalizar urgência. Nos sistemas eletrônicos, isso não acelera o trâmite e pode gerar efeito negativo na credibilidade da peça.

Em vez de dizer que é urgente, demonstrar a urgência. A técnica exige três elementos.

1. **Prejuízo real, mensurável e imediato.** Quantificar o dano concreto (meses sem renda, valor das despesas médicas não custeadas, risco clínico documentado), sempre com referência a documento comprobatório por ID.

2. **Primeira página para gerar impacto.** Usar o espaço da primeira página (quadro-resumo) para trazer os elementos fáticos principais e resumir o objeto urgente da petição. O julgador deve compreender a urgência antes de virar a página.

3. **Peso das consequências nos ombros do julgador.** Demonstrar que a demora gera consequência irreversível. Não é "o autor precisa do benefício com urgência". É "sem a concessão, o autor ficará sem acesso ao tratamento quimioterápico iniciado em [data], conforme relatório médico ID [xxx], com risco de progressão tumoral documentado no parecer ID [yyy]".

### Estrutura de Réplica Previdenciária

Quando a peça solicitada for réplica (art. 350 do CPC), seguir a estrutura abaixo em vez do formato tradicional de "contestação da contestação".

**Seção 1 — Delimitação dos pontos controvertidos e incontroversos.** Tabela de três colunas no padrão Visual Law preto/branco. Coluna 1, "Fato alegado na inicial". Coluna 2, "Impugnação pelo INSS". Coluna 3, "Situação processual" com rótulo `[INCONTROVERSO]` ou `[CONTROVERTIDO]`. Cada fato relevante da inicial é classificado com base na contestação. Fatos não impugnados especificamente presumem-se verdadeiros (art. 341 CPC). Essa tabela coloca o autor no controle da narrativa e orienta a leitura do juiz.

**Seção 2 — Réplica apenas aos pontos controvertidos.** Trabalhar exclusivamente sobre os pontos classificados como controvertidos. Cada ponto recebe subseção própria com argumento direto, referência a documento por ID e confronto específico com a impugnação do INSS. Compartimentalizar evita digressões e mostra ao juiz exatamente onde está o conflito.

**Seção 3 — Reconsideração do pedido de tutela (quando aplicável).** Se houve tutela de urgência na inicial que foi indeferida, a réplica pode ser o momento de pedir reconsideração com nova roupagem de evidência.

**Seção 4 — Pedidos de prova relevantes.** Reiterar apenas os pedidos de prova ainda relevantes à luz da contestação, de maneira específica e direcionada. Aplicar a técnica da skill `especificacao-provas`.

A regra central é que a réplica NÃO responde a cada linha da contestação. Falar demais sobre a contestação incha a peça, dá luz ao que tem menos impacto e pode até fortalecer a narrativa contrária. A réplica eficaz entrega foco ao juiz sobre o que é necessário, o que já está resolvido e o que ainda está pendente.

### Memorial Previdenciário (Framework EVO Adaptado)

Quando a peça for memorial (sustentação oral no CRPS, turma recursal, câmara do TRF3), aplicar o framework EVO (Essencial, Visual, Organizado) adaptado ao previdenciário.

**Limite absoluto.** Duas páginas. Memorial com mais de duas páginas será ignorado. O desembargador ou conselheiro só lê o memorial quando percebe, à primeira vista, que ele reduz o custo cognitivo. Memorial com cara e volume de petição elimina suas chances antes da primeira linha.

**Estrutura obrigatória.** Uma página ideal, duas máximo.

1. Questão central do recurso. Uma frase com o benefício, o segurado e o ponto de divergência
2. Fundamentos para reforma. O tema repetitivo ou precedente vinculante aplicável, com tese transcrita
3. Provas e resultados. Referência aos IDs dos documentos-chave e o que cada um demonstra
4. Um precedente visual de impacto (printscreen do precedente-chave com destaque, na lateral ou no corpo, usando técnica da skill `printscreen-impacto`)
5. Pedido final. Um parágrafo com o pedido e valor, quando aplicável

O memorial NÃO repete os argumentos da petição ou do recurso. Contém apenas o essencial que pode influenciar o voto.

### Confronto de Depoimentos em Audiência

Quando a peça (alegações finais, memoriais pós-audiência, recurso inominado) envolver análise de depoimentos colhidos em audiência, aplicar o protocolo abaixo em vez de transcrições longas ou simples referência às minutagens.

**O que NÃO funciona.** Transcrições integrais ou longas dos depoimentos. Simplesmente apontar minutagens sem confronto. Formato de texto corrido descrevendo o que cada testemunha disse. Esses formatos exigem que o julgador refaça mentalmente o trabalho de cruzamento, o que raramente acontece com a profundidade necessária.

**Técnica obrigatória.** Utilizar o Componente 4 (Tabela Comparativa) adaptado ao confronto testemunhal. A tabela cria contraste visual imediato e coloca a contradição em perspectiva sem exigir esforço interpretativo do julgador.

**Curadoria das contradições.** Um bom curador não aponta todas as contradições. Seleciona as principais, que geram maior impacto e fazem o julgador questionar todo o restante. Entre 2 e 4 contradições é o ideal. Acima de 5, o efeito se dilui.

**Parágrafo de fechamento.** Após a tabela, parágrafo único conectando as contradições à tese principal. O processo é uma disputa de narrativas. O julgador não analisa a tese isoladamente, mas a credibilidade dela frente à da parte contrária. As contradições demonstradas devem conduzir à conclusão de que a versão adversária é incoerente, fortalecendo a narrativa do segurado.

---

## Implementação Técnica em docx-js

A geração do .docx usa o pacote npm `docx`. Os blocos abaixo são as referências canônicas de implementação dos elementos visuais. Use-os como base e adapte ao caso concreto.

### Setup Básico

```javascript
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, AlignmentType, BorderStyle, WidthType,
  ShadingType, HeightRule, PageBreak, HeaderReferenceType, FooterReferenceType
} = require('docx');
```

### Estilos Default

```javascript
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Bookman Old Style", size: 24 }, // 12pt
        paragraph: {
          spacing: { before: 0, after: 0, line: 360, lineRule: "auto" },
          alignment: AlignmentType.JUSTIFIED
        }
      }
    }
  },
  sections: [/* ... */]
});
```

**Regra crítica de spacing.** O estilo default declara `before: 0, after: 0`. Cada parágrafo que precisar de respiro entre o próximo declara o `after` explicitamente. Esse padrão evita que parágrafos vazios criados para espaçamento entre tabelas e títulos acumulem 12pt antes + 12pt depois herdados, e dá controle total sobre o ritmo visual da peça.

**Parágrafos de texto corrido do corpo (endereçamento, número do processo, qualificação, fundamentação, pedidos)**: declarar `spacing: { before: 0, after: 240, line: 360, lineRule: "auto" }`. Os 12pt depois (240 twips) criam o respiro entre parágrafos sem acumular com o próximo.

**Parágrafos vazios de espaçamento visual** (entre tabela e título, entre seções): declarar `spacing: { before: 0, after: 0 }`. Use o helper abaixo.

**Parágrafos dentro de células de tabela Visual Law**: `spacing: { before: 0, after: 0, line: 240, lineRule: "auto" }`. Já forçado nos helpers `cabecalhoPreto` e `celulaCorpo`.

```javascript
function parVazio() {
  return new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: "" })]
  });
}

function parCorpo(opts) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 0, after: 240, line: 360, lineRule: "auto" },
    indent: { firstLine: opts.indent || 1134 }, // 2 cm judicial, 2268 = 4 cm CRPS
    children: opts.children
  });
}
```

### Seção com Página A4 e Margens do Escritório

```javascript
{
  properties: {
    page: {
      size: { width: 11907, height: 16838 }, // A4
      margin: {
        top: 851, right: 1134, bottom: 1134, left: 1560,
        header: 720, footer: 720
      }
    },
    titlePage: true // ativa header/footer próprios na primeira página
  },
  headers: {
    first: new Header({ children: [/* header timbrado */] }),
    default: new Header({ children: [new Paragraph({})] }) // vazio
  },
  footers: {
    first: new Footer({ children: [/* footer endereço */] }),
    default: new Footer({ children: [new Paragraph({})] }) // vazio, sem número de página
  },
  children: [/* corpo da petição */]
}
```

### Header da Primeira Página (timbre)

**Importante.** Todos os parágrafos do header e do footer devem ter `spacing: { before: 0, after: 0, line: 240, lineRule: ... }` explícito. Sem isso, o estilo default do documento (com `before: 240, after: 240, line: 360`) sobrepõe e empurra o bloco do timbre para baixo, descolando "ADVOCACIA" de "PREVIDENCIÁRIA" e separando as linhas de identificação. Use `lineRule: "auto"` para os parágrafos do nome do escritório e `lineRule: "exact"` para "DR. PAULO ROBERTO TERCINI FILHO" e "OAB/SP 331.110", reproduzindo o padrão XML original.

```javascript
// Carrega logo com fallback em múltiplos caminhos e suporte a PNG/JPG.
// Onda 54 (v1.44.0). Busca case-insensitive nas extensões e aspect ratio dinâmico.
// Onda 69 (v1.59.0). Resolução DINÂMICA dos caminhos do sandbox Cowork/Claude.
//   Causa raiz do cabeçalho sem logo. As bases anteriores eram só Windows
//   (C:\Users\VAIO\...) e relativas. No sandbox Linux do Cowork o mount é
//   /sessions/<nome-da-sessao>/mnt/INSS/assets/ e o <nome-da-sessao> MUDA a cada
//   sessão. Sem resolver esse caminho, o logo nunca era encontrado e a peça saía
//   SEM timbre. A resolução agora deriva de process.cwd() e de glob em /sessions.
function resolverBasesLogo() {
  const bases = [];
  // 1. Sandbox Cowork/Claude (Linux). Deriva a raiz da sessão do cwd atual.
  //    cwd típico. /sessions/<nome>/... — raiz da sessão é /sessions/<nome>.
  try {
    const cwd = process.cwd();
    const m = cwd.match(/^(\/sessions\/[^\/]+)/);
    if (m) {
      bases.push(path.join(m[1], 'mnt', 'INSS', 'assets', 'logo-tercini'));
      bases.push(path.join(m[1], 'mnt', 'INSS', 'assets', 'logo'));
    }
  } catch (e) { /* continue */ }
  // 2. Glob defensivo. Qualquer sessão montada em /sessions com a pasta INSS.
  try {
    if (fs.existsSync('/sessions')) {
      for (const sess of fs.readdirSync('/sessions')) {
        bases.push(path.join('/sessions', sess, 'mnt', 'INSS', 'assets', 'logo-tercini'));
        bases.push(path.join('/sessions', sess, 'mnt', 'INSS', 'assets', 'logo'));
      }
    }
  } catch (e) { /* continue */ }
  // 3. Windows local do escritório (execução fora do sandbox).
  bases.push('C:\\Users\\VAIO\\INSS\\assets\\logo-tercini');
  bases.push('C:\\Users\\VAIO\\INSS\\assets\\logo');
  // 4. Relativos ao script.
  bases.push(path.join(__dirname, 'assets', 'logo-tercini'));
  bases.push(path.join(__dirname, 'assets', 'logo'));
  bases.push('./assets/logo-tercini');
  bases.push('./assets/logo');
  return bases;
}

function carregarLogoTercini() {
  const bases = resolverBasesLogo();
  // Extensões testadas em ambas as caixas (case-insensitive para robustez).
  const extensoes = ['.png', '.PNG', '.jpg', '.JPG', '.jpeg', '.JPEG'];
  for (const base of bases) {
    for (const ext of extensoes) {
      const candidato = base + ext;
      try {
        if (fs.existsSync(candidato)) {
          const buffer = fs.readFileSync(candidato);
          const extLower = ext.slice(1).toLowerCase();
          const tipo = extLower === 'jpeg' ? 'jpg' : extLower;
          return { buffer, tipo, caminho: candidato };
        }
      } catch (e) { /* continue */ }
    }
  }
  return null;
}

// Calcula dimensões preservando aspect ratio do arquivo real.
// Altura padrão de 75 px. Largura calculada a partir da proporção real da imagem.
// Onda 69. Fallback corrigido de 83x75 para 96x75 (proporção 1,278 do
// logo-tercini.PNG real de 538x421). O fallback antigo DISTORCIA o logo.
// Onda 69. Implementada leitura de dimensões JPEG pelos SOF markers.
function calcularDimensoesLogo(buffer, tipo) {
  const ALTURA_PADRAO = 75;
  const FALLBACK = { width: 96, height: 75 }; // proporção do logo real 538x421
  try {
    if (tipo === 'png') {
      // Cabeçalho PNG. Bytes 16-19 = width, bytes 20-23 = height.
      const larguraReal = buffer.readUInt32BE(16);
      const alturaReal = buffer.readUInt32BE(20);
      if (larguraReal > 0 && alturaReal > 0) {
        return {
          width: Math.round(ALTURA_PADRAO * (larguraReal / alturaReal)),
          height: ALTURA_PADRAO
        };
      }
    }
    if (tipo === 'jpg') {
      // Varre segmentos JPEG até um SOF (C0-CF, exceto C4, C8, CC).
      let i = 2; // pula FF D8
      while (i + 9 < buffer.length) {
        if (buffer[i] !== 0xFF) { i++; continue; }
        const marker = buffer[i + 1];
        const isSOF = marker >= 0xC0 && marker <= 0xCF &&
                      marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;
        if (isSOF) {
          const alturaReal = buffer.readUInt16BE(i + 5);
          const larguraReal = buffer.readUInt16BE(i + 7);
          if (larguraReal > 0 && alturaReal > 0) {
            return {
              width: Math.round(ALTURA_PADRAO * (larguraReal / alturaReal)),
              height: ALTURA_PADRAO
            };
          }
          break;
        }
        const len = buffer.readUInt16BE(i + 2);
        i += 2 + len;
      }
    }
  } catch (e) {
    console.warn('[ALERTA] Falha ao ler dimensões do logo. Usando fallback.', e.message);
  }
  return FALLBACK;
}

const logo = carregarLogoTercini();
if (!logo) {
  // Onda 69. Logo ausente é ERRO BLOQUEANTE, não aviso. A peça NÃO deve ser
  // entregue sem timbre. Interromper e alertar o usuário.
  throw new Error('[BLOQUEANTE] Logo do escritório NÃO localizado em nenhum caminho de busca (sandbox /sessions/*/mnt/INSS/assets/, C:\\Users\\VAIO\\INSS\\assets\\ e relativos). A petição NÃO pode ser gerada sem o timbre. Confirme que logo-tercini.PNG está na pasta assets da pasta INSS selecionada.');
}
console.log('[OK] Logo carregado de ' + logo.caminho + ' (tipo ' + logo.tipo + ')');

const dimensoesLogo = logo ? calcularDimensoesLogo(logo.buffer, logo.tipo) : { width: 83, height: 75 };

const logoCell = logo
  ? new TableCell({
      width: { size: 1668, type: WidthType.DXA },
      borders: noBorders(),
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              data: logo.buffer,
              type: logo.tipo, // detectado dinamicamente: "png" ou "jpg"
              transformation: dimensoesLogo // calculadas dinamicamente preservando aspect ratio
            })
          ]
        })
      ]
    })
  : new TableCell({
      width: { size: 1668, type: WidthType.DXA },
      borders: noBorders(),
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Paragraph({ spacing: { before: 0, after: 0 } })]
    });

const headerFirst = new Header({
  children: [
    new Table({
      width: { size: 9288, type: WidthType.DXA },
      columnWidths: [1668, 7620],
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          height: { value: 993, rule: HeightRule.ATLEAST },
          children: [
            logoCell,
            new TableCell({
              width: { size: 7620, type: WidthType.DXA },
              borders: noBorders(),
              margins: { top: 0, bottom: 0, left: 0, right: 0 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
                  children: [new TextRun({ text: "", font: "Bell MT", size: 16 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
                  children: [new TextRun({
                    text: "ADVOCACIA PREVIDENCIÁRIA",
                    font: "Bell MT", bold: true, size: 48
                  })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "exact" },
                  children: [new TextRun({
                    text: "DR. PAULO ROBERTO TERCINI FILHO",
                    font: "Arial Unicode MS"
                  })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0, line: 240, lineRule: "exact" },
                  children: [new TextRun({
                    text: "OAB/SP 331.110",
                    font: "Arial Unicode MS"
                  })]
                })
              ]
            })
          ]
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } }
    })
  ]
});

function noBorders() {
  return {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };
}
```

### Footer da Primeira Página (endereço)

```javascript
const footerFirst = new Footer({
  children: [
    new Paragraph({
      spacing: { before: 0, after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: [new TextRun({
        text: "Rua Rui Barbosa, nº. 663, Centro, Monte Alto – SP",
        font: "Arial Unicode MS"
      })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: [new TextRun({
        text: "Tel: 16-3242-2908 – Cel: 16-98140-9271",
        font: "Arial Unicode MS"
      })]
    })
  ]
});
```

### Título de Seção (tabela preta)

Função utilitária para gerar o título preto padrão do escritório.

```javascript
function tituloSecaoPreto(numero, texto) {
  return new Table({
    width: { size: 9214, type: WidthType.DXA },
    columnWidths: [9214],
    shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9214, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { after: 0, line: 240, lineRule: "auto" },
                alignment: AlignmentType.JUSTIFIED,
                children: [
                  new TextRun({
                    text: `${numero}. `,
                    font: "Bookman Old Style", size: 24, bold: true, color: "FFFFFF"
                  }),
                  new TextRun({
                    text: texto.toUpperCase(),
                    font: "Bookman Old Style", size: 24, bold: true, color: "FFFFFF"
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Uso: tituloSecaoPreto("3.1", "Da Impugnação Objetiva da Pontuação")
```

### Visual Law — Cabeçalho de Tabela Preto

Helper para cabeçalho preto em qualquer tabela Visual Law. Bordas e alinhamento vertical são definidos em cada célula para garantir renderização idêntica no Microsoft Word e no LibreOffice.

```javascript
function cabecalhoPreto(textos, larguras) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return new TableRow({
    tableHeader: true,
    children: textos.map((t, i) => new TableCell({
      width: { size: larguras[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: "000000", color: "auto" },
      borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
      verticalAlign: "center",
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
        children: [new TextRun({
          text: t, bold: true, color: "FFFFFF",
          font: "Bookman Old Style", size: 20 // 10pt
        })]
      })]
    }))
  });
}
```

### Visual Law — Célula de Corpo com Zebra

```javascript
function celulaCorpo(texto, largura, opts = {}) {
  const runs = Array.isArray(texto) ? texto : [{ text: texto, bold: opts.bold || false }];
  const hMargin = opts.tightMargin ? 40 : 80;
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return new TableCell({
    width: { size: largura, type: WidthType.DXA },
    shading: opts.zebra
      ? { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" }
      : undefined,
    borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
    verticalAlign: "center",
    margins: { top: 40, bottom: 40, left: hMargin, right: hMargin },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      children: runs.map(r => new TextRun({
        text: r.text,
        font: "Bookman Old Style",
        size: opts.size || 20, // 10pt default no corpo das tabelas
        bold: r.bold || false,
        italics: r.italic || false
      }))
    })]
  });
}
```

A fonte do corpo das tabelas é 10pt (size 20), menor do que os 12pt do texto corrido da petição. Isso diferencia tabela de texto e permite mais informação por linha. Margens internas de 40 (vertical) e 80 (horizontal) twips mantêm tudo enxuto sem perda de legibilidade. O parágrafo dentro da célula força `before=0, after=0, line=240` para impedir herança do estilo default do documento, que descolaria as linhas. As bordas são declaradas em cada célula individualmente (não apenas no `tblBorders` da tabela mãe), garantindo renderização consistente entre Microsoft Word e LibreOffice em tabelas de 4 ou mais colunas. O `verticalAlign: "center"` em cada célula evita que conteúdo curto fique colado no topo quando conteúdo longo na linha empurra a altura para cima.

### Validação Final

Após gerar o buffer com `Packer.toBuffer(doc)`, salvar o arquivo, validar com o script padrão de docx (quando disponível) e SEMPRE executar a Verificação Obrigatória do Cabeçalho Pós-Geração (seção própria, Onda 69) antes de entregar via `present_files`.

```bash
# Validação estrutural (se o script estiver disponível no ambiente)
python /mnt/skills/public/docx/scripts/office/validate.py peticao.docx

# Verificação obrigatória do cabeçalho (Onda 69) - as 3 checagens
unzip -l peticao.docx | grep -i "word/media"
unzip -p peticao.docx word/header1.xml word/header2.xml word/header3.xml 2>/dev/null | grep -c "ADVOCACIA"
unzip -p peticao.docx word/document.xml | grep -c "titlePg"
```

Peça que falhe em qualquer checagem do cabeçalho NÃO é entregue.

---

## Logo do Escritório

### Caminhos de Busca (Atualizado Onda 69 - v1.59.0)

REGRA DE OURO. O ambiente de execução decide o caminho. A skill geradora resolve as bases DINAMICAMENTE nesta ordem e usa o primeiro arquivo encontrado.

**Bloco 1 - Sandbox Cowork/Claude (Linux). SEMPRE testado primeiro.**

1. `<raiz da sessão derivada de process.cwd()>/mnt/INSS/assets/logo-tercini.(png|PNG|jpg|JPG|jpeg|JPEG)`. A raiz é extraída do padrão `/sessions/<nome-da-sessao>` do diretório de trabalho atual. O `<nome-da-sessao>` MUDA a cada sessão do Cowork, por isso o caminho NUNCA deve ser fixado literalmente.
2. Glob defensivo em `/sessions/*/mnt/INSS/assets/` para qualquer sessão montada.

**Bloco 2 - Windows local do escritório.**

3. `C:\Users\VAIO\INSS\assets\logo-tercini.(png|jpg|jpeg)` e `logo.(png|jpg|jpeg)`.

**Bloco 3 - Relativos.**

4. `<diretório da skill>/assets/` e `./assets/` com os mesmos nomes.

Em Python (geração via skill docx), aplicar a mesma lógica com `os.getcwd()`, `re.match(r'^(/sessions/[^/]+)', cwd)` e `glob.glob('/sessions/*/mnt/INSS/assets/logo*')`.

### Suporte a Formato

A implementação detecta automaticamente o formato pela extensão, testada em ambas as caixas (`.png`, `.PNG`, `.jpg`, `.JPG`, `.jpeg`, `.JPEG`). O arquivo real do escritório chama-se `logo-tercini.PNG` (extensão MAIÚSCULA). O parâmetro `type` do `ImageRun` é definido dinamicamente conforme o arquivo encontrado.

### Logo Ausente é ERRO BLOQUEANTE (Onda 69)

Comportamento anterior (até v1.58.0). Logo ausente gerava apenas um `console.warn` e a petição saía SEM timbre. Esse era o principal motivo de cabeçalho incorreto, porque no sandbox do Cowork os caminhos Windows nunca existem e o alerta passava despercebido.

Comportamento atual. Logo ausente INTERROMPE a geração com `throw new Error('[BLOQUEANTE] ...')`. A peça sem timbre não é entregue. O Claude deve então localizar o logo (`find /sessions -iname 'logo-tercini*' 2>/dev/null`), confirmar o mount da pasta INSS e regenerar.

### Dimensões (atualizado Onda 69)

As dimensões são calculadas DINAMICAMENTE preservando o aspect ratio do arquivo real.

Comportamento.
- PNG. A função `calcularDimensoesLogo` lê os bytes 16-23 do cabeçalho para obter width/height nativos.
- JPEG. Leitura implementada na Onda 69 pelos SOF markers (C0-CF, exceto C4, C8, CC), extraindo height/width dos bytes 5-8 do segmento.
- Fixa altura em **75 px** (padrão do layout do header).
- Calcula largura proporcional. `Math.round(75 × larguraReal / alturaReal)`.
- Fallback para **96×75** (proporção 1,278 do logo real 538×421) SOMENTE se a leitura binária falhar. O fallback antigo de 83×75 DISTORCIA o logo e foi eliminado.

**Exemplos práticos.**

| Logo real | Proporção | Width calculado | Height final |
|-----------|-----------|-----------------|--------------|
| 538×421 px (atual) | 1.278 | 96 px | 75 px |
| 512×512 px | 1.000 | 75 px | 75 px |
| 400×300 px | 1.333 | 100 px | 75 px |
| 600×450 px | 1.333 | 100 px | 75 px |

### Verificação Obrigatória do Cabeçalho Pós-Geração (Onda 69)

Antes de entregar QUALQUER petição, executar as três checagens no .docx gerado. O .docx é um ZIP.

```bash
# 1. O logo está embarcado? Deve listar ao menos um arquivo em word/media/.
unzip -l peticao.docx | grep -i "word/media" || echo "[FALHA] SEM LOGO NO DOCX"

# 2. O timbre textual está no header? Deve encontrar ADVOCACIA.
unzip -p peticao.docx word/header1.xml word/header2.xml word/header3.xml 2>/dev/null | grep -c "ADVOCACIA" || echo "[FALHA] SEM TIMBRE TEXTUAL"

# 3. A âncora do titlePage existe? Deve encontrar titlePg no sectPr.
unzip -p peticao.docx word/document.xml | grep -c "titlePg" || echo "[FALHA] SEM titlePage - header da 1a pagina nao sera diferenciado"
```

Se qualquer checagem falhar, NÃO entregar. Diagnosticar, corrigir e regenerar. Registrar no relatório de revisão da peça (`base-revisao-peticao-aprofundada`) a linha "Cabeçalho verificado. Logo embarcado, timbre presente, titlePage ativo."

Armadilha conhecida do docx-js. Sem `titlePage: true` nas properties da seção, o `headers.first` é ignorado e o Word usa o `default` (vazio) em todas as páginas. Sem `spacing` explícito zerado nos parágrafos do header, o estilo default (before/after 240, line 360) desloca o timbre. Ver seção Header da Primeira Página.

### Característica Visual do Logo

O logo do escritório consiste em duas formas triangulares em tons de cinza (claro e escuro) sobrepostas em uma curva vermelha estilizando uma balança da justiça. PNG com fundo transparente para integração com cabeçalho timbrado.

### Documentação Completa

Ver `assets/README-LOGO.md` na pasta da skill para o procedimento completo de configuração e troubleshooting do logo.

---

## Referências Cruzadas com Outras Skills

Antes de gerar qualquer petição, esta skill aciona automaticamente as skills complementares.

- `precedentes-previdenciarios` — para fundamentação jurisprudencial
- `revisao-peticao` — para auditoria automática após geração
- `triagem-caso-novo` — quando o caso não está enquadrado
- `cnis-acerto-indicadores` — quando houver pendência de CNIS
- `tema-1124-instrucao-administrativa` — para seção de efeitos financeiros
- `decadencia-revisao-previdenciaria` — em revisões
- `documentos-comprobatorios-in128` — para checklist documental
- `mandado-seguranca-previdenciario` + `ms-competencia-autoridade-coatora` — em MS
- `auditoria-laudo-pericial`, `auditoria-ppp` — quando houver laudo/PPP para auditar
- `printscreen-impacto` — para inserção de documentos reais com destaque
- `base-peticao-paragrafo-de-realidade` — para o Parágrafo de Realidade obrigatório antes dos pedidos, em peça de pessoa física
- `reafirmacao-der`, `tutela-urgencia` (interna) — conforme política

A revisão final do conteúdo da petição é responsabilidade da skill `revisao-peticao`, acionada automaticamente após esta skill concluir a geração.
