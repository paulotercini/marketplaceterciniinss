---
name: peticao-previdenciaria
description: "Criação de petições previdenciárias no padrão do escritório Paulo Roberto Tercini Filho (OAB/SP 331.110), incluindo política de tutela de urgência e liminar. Use SEMPRE que pedir para redigir, criar, gerar ou montar qualquer petição, recurso, contestação, embargos, agravo, pedido de uniformização, recurso administrativo, recurso especial ao CRPS, mandado de segurança ou qualquer peça processual previdenciária. Use quando mencionar petição inicial, recurso inominado, embargos de declaração, agravo interno, pedido TNU, recurso ordinário, recurso especial CRPS, ação de concessão, ação de restabelecimento, pensão por morte, aposentadoria, auxílio-doença, BPC/LOAS, tutela de urgência, tutela antecipada, liminar, antecipação de tutela, medida liminar. Fase 0, consultar o MCP acervo, vedado reaproveitar texto de um cliente em peça de outro. NÃO use para análise de casos, pareceres ou respostas que não resultem em documento formal. Toda peça segue o Método Tercini (Onda 174), em Markdown medido e convertido."
---

# Petições Previdenciárias do Escritório Paulo Tercini

Toda peça sai em .docx no padrão visual do escritório, com cabeçalho timbrado e títulos em tabela preta. A partir da Onda 140 a redação e a formatação são etapas SEPARADAS, porque escrever prosa dentro de código docx-js degradava o texto, e as regras de estilo se perdiam entre milhares de palavras de mecânica.

## Fase 0, consultar o acervo do escritório (Onda 149)

Antes de escrever a primeira linha, consulta-se o MCP `acervo` para ver como o escritório já sustentou a tese. É passo do fluxo, não sugestão. A busca começa por `buscar_tese_acervo` pelo termo da tese e SEM filtro de benefício, que é o campo fraco, e o trecho encontrado se lê inteiro por `obter_trecho_acervo`, porque o resultado da busca vem cortado no meio da frase. Consulta que zera pede uma palavra a menos antes de virar conclusão sobre o acervo.

**A vedação vale em voz alta.** O trecho é ponto de partida para redação NOVA, conferida contra os autos deste cliente. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO, e o próprio servidor devolve essa vedação em toda resposta.

**O trecho é anonimizado, o arquivo de origem não.** O nome do cliente sai como `[NOME]` e o processo como `[PROCESSO]`, mas `caminho_da_peca_acervo` devolve o caminho de verdade, e quem abrir o arquivo verá nome, CPF e dado médico. A anonimização tem três falhas medidas em 20/09/2026, nome embutido sem separador que escapa no nome do arquivo, protocolo e data que ficam em claro no trecho, e palavra comum apagada por engano, como "Contribuição" e "Benefícios", virando `[NOME]`. Nenhuma delas dispensa a conferência antes do uso.

**Dois limites impedem ler a base como estatística.** O campo `beneficio` não é confiável, porque a maioria das peças protocoladas veio com ele nulo e há peça de BPC classificada como incapacidade, de modo que filtrar por matéria esconde mais do que seleciona. E nenhuma peça tem resultado anotado, de modo que a base não diz o que venceu. A distribuição da `visao_geral_acervo` é contagem de arquivo classificado por heurística, não desempenho do escritório.

**Número de peça não entra em peça nem em parecer.** A base é reingerida e o tamanho muda no mesmo dia. Afirmação sobre cobertura sai da `visao_geral_acervo` chamada naquela sessão, nunca de memória.

A forma de pesquisar, os filtros confiáveis e os que não são, e o que foi medido em 20/09/2026, estão em `references/PESQUISA-NO-MCP-ACERVO.md`.

## Fluxo em três fases, obrigatório

**Fase 1, redigir em Markdown.** A peça inteira é escrita como texto, num arquivo `peca.md`, com a gramática mínima da seção seguinte. Nesta fase a única preocupação é o que se diz e como se diz. Nenhuma linha de JavaScript.

**Fase 2, medir.** Rodar `python3 scripts/medir_peca.py peca.md --tipo inicial` (ou `inominado`, `laudo`, `crps`, `embargos`, `comum`, `memorial`, `ms`). O script devolve PASSA ou FALHA com a lista exata dos parágrafos fora do padrão. Peça que FALHA não segue. Reescreve-se o que o script apontou e mede-se de novo, quantas vezes for preciso. O relatório final da peça transcreve a última medição.

**Fase 3, converter.** Rodar `node scripts/md2docx.js peca.md saida.docx --logo <caminho da logo>` (na primeira vez, `npm install` dentro de `scripts/`, que instala o `docx`) (com `--crps` para recuo de 4 cm nas peças administrativas). O script aplica cabeçalho, logo, fonte, margens, títulos pretos, citações recuadas, tabelas e o fecho com local, data e assinatura. Depois, converter em PDF e abrir a primeira página para conferência visual, como sempre.

## O método do titular (Onda 174), lido antes de redigir

Toda peça, em todos os temas, segue `references/METODO-PETICAO-TERCINI.md`, extraído do modelo de petição inicial de incapacidade redigido pelo titular e fixado por ele como padrão do escritório. O método prevalece sobre `references/ESTILO-MODELO.md` na estrutura, nas fórmulas e na voz, e as medidas de parágrafo da Onda 163 continuam valendo. A petição inicial pronta, na gramática do conversor, está em `references/EXEMPLAR-PI-INCAPACIDADE.md`, e cada Modelo Ouro 2.0 traz o esqueleto da sua espécie já no método.

Na petição inicial a ordem é fixa. Endereçamento, qualificação copiada da procuração, nome da ação centralizado, INSS com a Gerência Executiva de São José do Rio Preto, e as seções 1. DA INEXISTÊNCIA DE AÇÃO JUDICIAL COM O MESMO OBJETO, 2. DOS FATOS (com a subseção do fato decisivo), 3. DO [BENEFÍCIO], eventuais seções adicionais e REQUERIMENTOS, seguidos de valor da causa, fecho e, havendo perícia, QUESITOS. As demais peças seguem o esqueleto da seção 4 do método.

A voz é a do titular. A parte é "a Parte Autora", o réu é "o Instituto Nacional do Seguro Social – INSS" e depois "a Autarquia Federal", a virada dos fatos é "Entretanto, está equivocado o entendimento da Autarquia Federal, pois..., senão vejamos", e o direito fecha por "Deste modo, Excelência, ... como medida de direito e de justiça". O documento é descrito pelo emitente, pelo registro profissional e pela data, com o trecho decisivo transcrito em ***"negrito e itálico"***, e a lei é transcrita em recuo, só no que decide, antes do parágrafo que a aplica ao caso.

## O estilo, calibrado no papel do escritório

Uma linha da peça, em Bookman Old Style 12, A4, margens do escritório, recuo de 2 cm e espaçamento 1,5, tem cerca de DEZ palavras. Medido em 16/09/2026 com soffice e pdftotext. Portanto, **o parágrafo de quatro a cinco linhas tem de 40 a 55 palavras, e o teto de seis linhas corresponde a 65**, que é o que o medidor cobra desde a Onda 163. Um parágrafo bom tem três ou quatro frases de 15 a 35 palavras, ligadas por transições, e desenvolve uma única ideia com começo, meio e fim. Os parágrafos-modelo estão em `references/ESTILO-MODELO.md`, lidos antes de redigir.

Não se escreve um parágrafo de oitenta palavras para cortar depois, porque o corte é o que produz o texto picado. Escreve-se dentro da medida desde a primeira versão. O medidor também recusa frases soltas em sequência, aponta a frase acima de 45 palavras e o parágrafo sem transição, e recusa adjetivo de intensidade, fórmula vazia, documento sem ID e dispositivo legal citado sem a frase que explica por que se aplica ao caso.

A voz é a que o titular fixou em `references/REDACAO-POR-ESPECIE.md`, com os pares de redação genérica e precisa por espécie. Antes de redigir, ler o bloco da espécie. A fórmula do parágrafo argumentativo é afirmar o fato, localizar a prova (por ID nos autos, e "em anexo" na petição inicial e no mandado de segurança), explicar a relevância e formular a consequência, e a peça abre pela controvérsia, de modo que o leitor saiba em três linhas qual é o benefício, por que foi negado e o que precisa decidir.

A persuasão segue as nove técnicas da seção "Persuasão com base empírica" de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md` (Ondas 157 e 160), lidas antes da redação. Na prática, o fato vem com número, data e ID, a narrativa segue a ordem de causa e consequência, o primeiro número lido é o do segurado, o argumento mais forte abre a seção, e o que o INSS já reconheceu serve de premissa. A defesa previsível do INSS é nomeada e refutada em parágrafo próprio, o que obriga o julgador a enfrentá-la (art. 489, § 1º, IV, do CPC), e a pretensão é descrita como aplicação ordinária de norma e precedente, nunca como pedido de exceção. Nenhuma técnica de PNL entra na peça. Em todas as peças, os títulos são formais e nominais, conforme a regra de títulos de `references/MECANICA-DOCX.md`, e a persuasão fica na primeira frase da seção, nunca no título.

## Gramática do Markdown da peça

`@endereco: texto` produz o endereçamento em negrito e caixa alta. `@processo: texto` produz a linha do processo. O parágrafo de qualificação é texto comum, com a qualificação e o INSS em `**negrito**`. `# TEXTO` produz a linha centralizada em negrito e caixa alta, usada no nome da ação ou do recurso, em "RAZÕES DO RECURSO INOMINADO" e em "QUESITOS". `## 1. TÍTULO` produz a tabela preta, e `### 1.1. SUBTÍTULO` também. `> texto` produz citação recuada em itálico, reservada a transcrição literal de lei, tese ou ementa, um parágrafo do dispositivo por bloco. `***"trecho"***` produz o trecho literal de documento em negrito e itálico. `| a | b |` produz tabela, e a primeira coluna sai em negrito. `@quebra` produz quebra de página, usada entre a interposição e as razões do recurso. `@fecho` produz "Termos em que,", "Pede deferimento.", a linha "Monte Alto/SP, [data por extenso]." e a assinatura, mantidos na mesma página. Todo o resto é parágrafo justificado com recuo.

Endereçamentos por tipo de peça, qualificação, a regra de títulos formais e nominais (Onda 162) e peças de duas partes estão em `references/MECANICA-DOCX.md`, e o modelo consulta essa referência para o TEXTO desses elementos, nunca para a formatação. Os componentes Visual Law, opcionais desde a Onda 174 e no máximo três por peça, estão em `references/VISUAL-LAW.md`, e a petição no método do titular não leva síntese inicial nem quadro-resumo.

## Regras Críticas de Estilo do Escritório

Estas regras são inegociáveis e seguidas em TODAS as petições.

### Dois-pontos (Onda 163)

Os dois-pontos são admitidos antes de citação literal de lei, ementa ou documento e antes de enumeração de pedidos ou de requisitos. Continuam vedados antes de miniconclusão ou de explicação que caberia no mesmo período, e nesse caso o complemento entra por conectivo ou subordinação, sem picar o texto.

**ERRADO.** "O benefício foi indeferido por dois motivos: falta de carência e ausência de incapacidade."
**TRUNCADO, também errado.** "O benefício foi indeferido por dois motivos. O primeiro é a falta de carência. O segundo é a ausência de incapacidade."
**CORRETO.** "O benefício foi indeferido pela falta de carência e pela ausência de incapacidade, e nenhum dos dois fundamentos resiste ao CNIS juntado."
**CORRETO, citação.** "O art. 59 da Lei 8.213/1991 dispõe nos seguintes termos:" seguido da transcrição recuada.

### Tom e Estilo de Redação

A peça é escrita em linguagem formal e jurídica, mas simples, no estilo que o titular fixou em 11/09/2026 e que está detalhado na regra 10 do protocolo. O texto é técnico, argumentativo e firme, e a firmeza vem da precisão com que expõe o fato, a prova e a norma, nunca de adjetivos ou de acusações. A frase "a decisão combatida revela-se manifestamente absurda e afronta os mais basilares princípios de justiça" não entra em peça do escritório. Em seu lugar escreve-se que "a decisão não examinou o documento apresentado pela parte autora, embora seu conteúdo seja relevante para a análise do requisito controvertido", porque essa segunda redação diz o que aconteceu, aponta a prova e deixa a consequência ao alcance do julgador.

**Parágrafo de quatro a cinco linhas, no máximo seis (Onda 163).** Cada parágrafo desenvolve uma única ideia com começo, meio e fim, em três ou quatro frases completas ligadas por transições, como "ocorre que", "por essa razão", "de modo que", "ainda assim" e "nem se diga que". A regra de extensão não autoriza o parágrafo telegráfico, feito de frases soltas que o leitor precisa costurar sozinho, e a partir do segundo parágrafo de cada seção a abertura retoma o anterior.

**Argumentação ligada aos fatos.** O parágrafo argumentativo típico expõe o que aconteceu, indica a prova que sustenta a afirmação, com o ID do documento no PJe, e explica como a norma se aplica àquele fato. Fato sem prova é alegação, e norma sem fato é doutrina. A peça convence quando os três aparecem juntos, no mesmo parágrafo, na ordem em que o julgador precisa deles.

**Fundamentação seletiva.** Cita-se o dispositivo que decide a questão e explica-se, em uma frase, por que ele se aplica ao caso. A enumeração de artigos, incisos e parágrafos sem essa explicação é a forma mais comum de prolixidade nas peças geradas, e o titular a apontou expressamente. Dois dispositivos explicados valem mais do que dez listados. O mesmo vale para precedentes, que já têm o limite de uma página em toda a peça.

**A amostra de voz.** Os pares de redação genérica e precisa que o titular fixou para cada espécie de benefício estão em `references/REDACAO-POR-ESPECIE.md`, com sete técnicas transversais, controvérsia no início, condição clínica ligada às tarefas, o que cada documento comprova, cronologia como argumento, impugnação por falha identificável, omissão que altera o resultado e humanização com fatos verificáveis. Antes de redigir a fundamentação de qualquer espécie, ler o bloco correspondente e escrever no mesmo registro.

**Pedidos específicos.** Cada pedido nomeia a providência, o benefício ou período a que se refere e o fundamento que o sustenta, em coerência com os fatos narrados. Pedido genérico, do tipo "seja julgada procedente a ação", só aparece como fecho depois dos pedidos concretos.

**Sobre os dois-pontos.** Admitidos antes de citação literal e de enumeração, vedados antes de miniconclusão. Quando o complemento cabe no período, entra por conectivo ou subordinação, e nunca por frases curtas em sequência. Travessão longo como separador de ideias segue vedado. Travessão curto é permitido só em referências como "Dr. [nome] – CRM nº [__]" e "Instituto Nacional do Seguro Social – INSS".

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

## Proteção obrigatória dos efeitos financeiros (Petições Iniciais de Concessão e Revisão)

Toda petição inicial de concessão ou revisão protege o termo inicial na DER, e o método do titular (Onda 174) define onde. Quando toda a prova integrou o processo administrativo, DOS FATOS afirma que os documentos em anexo foram apresentados ao INSS na DER e o item 3 dos REQUERIMENTOS fixa o termo inicial na DER. Quando há documento que não foi ao INSS, duas ou mais DERs, prova técnica judicial que confirma documento do processo administrativo ou omissão do INSS em emitir exigência, entra a seção adicional "DOS EFEITOS FINANCEIROS", sem acréscimo de data ou de fato no título (regra de títulos da Onda 162), entre a seção do benefício e os REQUERIMENTOS.

A proteção é obrigatória porque o Tema 1124/STJ condiciona o termo inicial dos efeitos financeiros ao momento em que a prova foi produzida. Sem fundamentação expressa, o juiz pode deslocar a DIB da DER para a citação, causando perda substancial de atrasados.

**Conteúdo obrigatório.**

1. Classificar expressamente cada documento essencial em uma das três categorias, identificando-o pelo emitente e pela data (na inicial o documento segue "em anexo").

   a) **Já apresentado ao INSS na DER** — documento que integrava o processo administrativo desde o requerimento. Enquadra o caso no cenário 2.1 do Tema 1124 (DIB na DER)

   b) **Complementar a prova já existente** — documento não essencial ou prova técnica judicial que apenas confirma, detalha ou reforça o conjunto probatório já suficiente na via administrativa. Enquadra o caso no item 2.1 do Tema 1124 e na exceção final do item 1.6, com DIB na DER. Os embargos de declaração de 09/09/2026 confirmaram que a perícia judicial que confirma o PPP apresentado ao INSS leva a DIB à DER quando o INSS não ofertou a complementação da prova

   c) **Surgido depois do ajuizamento ou impossível de obter antes** — documento que só pôde existir em juízo. Enquadra o caso no item 2.3, com DIB na citação, e exige a demonstração da impossibilidade material. O documento que já existia e não foi levado ao INSS, como um novo PPP, NÃO entra nesta categoria, porque os embargos de 09/09/2026 determinam a extinção sem mérito nesse caso, e o caminho é o novo requerimento antes da ação

2. Fundamentar expressamente que a DIB deve ser fixada na DER (ou na data do preenchimento dos requisitos, se posterior à DER), invocando o cenário aplicável do Tema 1124/STJ

3. Se o INSS não emitiu carta de exigência nem ofereceu justificação administrativa quando deveria, fundamentar a omissão do dever legal (art. 88 da Lei 8.213/1991 e arts. 176 e 176-E do Decreto 3.048/99, conferidos no MCP `normas`) e enquadrar no item 2.2 do Tema 1124, citando o esclarecimento dos embargos de declaração de 09/09/2026, que vedou o indeferimento automático, por servidor ou por ferramenta automatizada, de requerimento apto sem essa oportunidade

4. Se houver duas ou mais DERs, demonstrar a continuidade do conjunto probatório entre elas, indicando que os documentos da DER posterior "apenas confirmaram" o acervo já existente, para preservar os efeitos financeiros desde a DER mais antiga

**Posição na petição.** Como seção adicional, depois da seção do benefício (por exemplo, "3. DA APOSENTADORIA ESPECIAL") e de eventual DA REAFIRMAÇÃO DA DER, sempre a última antes dos REQUERIMENTOS.

**Exceções.** Não incluir esta seção em embargos de declaração, agravos internos, recursos ao CRPS (salvo quando o mérito recursal envolver efeitos financeiros) ou mandados de segurança.

---

## Gratuidade de Justiça — Técnica de Demonstração Objetiva

O pedido de gratuidade de justiça não deve ser genérico. A hipossuficiência é evidenciada com dados concretos e documentos vinculados.

**Técnica obrigatória.** Quando renda e despesas do segurado estiverem disponíveis, a seção de gratuidade contém tabela de receitas e despesas com três colunas: "Receita/Despesa", "Valor" e "Documento (ID)". Lista o rendimento mensal total, as despesas fixas comprovadas (aluguel, plano de saúde, alimentação, medicamentos, contas básicas) e a renda livre resultante. Cada linha referencia o documento comprobatório por ID no PJe.

**Posição.** No método do titular, a gratuidade é o item 2 dos REQUERIMENTOS, pelos arts. 98 e 99 do CPC, nunca pelo art. 4º da Lei 1.060/50, revogado pelo art. 1.072, III, do CPC. A tabela entra como seção adicional só quando houver dado concreto e risco real de impugnação, e na réplica quando o INSS impugnar a gratuidade.

**Quando não usar a tabela.** Se os dados não estiverem disponíveis, usar formulação direta com referência à autodeclaração e ao art. 99 §3º do CPC, sem tabela. A tabela só agrega valor quando os dados são concretos e documentados.

---

## Pedidos

- Seção final com o título literal "REQUERIMENTOS", introduzida por "Ante o exposto, requer:"
- Itens em algarismos arábicos, na ordem do método (citação, gratuidade, condenação com correção e juros "na forma do Manual de Cálculos da Justiça Federal", subsidiário em 3.1, custas e honorários só no rito ordinário, provas), seguidos do valor da causa pelo art. 292, §§ 1º e 2º, do CPC
- Sem recuo especial diferenciado, alinhamento justificado
- Recuo de primeira linha mantido conforme o padrão do rito

---

## Petições Envolvendo Pendências do CNIS

Quando a petição envolver indeferimento ou não cômputo de período por pendência no CNIS, seguir o protocolo adicional obrigatório.

**Passo 1.** Consultar a skill `cnis-acerto-indicadores` para identificar a sigla, descrição e impacto do indicador que motivou a restrição.

**Passo 2.** Identificar os argumentos de impugnação específicos do indicador. Os indicadores mais contestáveis são PDIV-DADOS-GFIP (algoritmo Levenshtein), PEXT (extemporaneidade), PDT-NASC-FIL-INV (trabalho infantil), PVIN-MAND-ELETIVO-TOTAL, PVIN-TRAB-INTERM, indicadores de reclamatória trabalhista e indicadores de empresa encerrada (PADM-EMPR, PRES-EMPR, PREM-EMPR).

**Passo 3.** Na seção "DO DIREITO", incluir subseção específica denominada "DO INDICADOR [SIGLA] NO CNIS" ou "DO ACERTO DO VÍNCULO NO CNIS", com os seguintes elementos.

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

2. **Primeira página para gerar impacto.** Usar o espaço da primeira página (o início de DOS FATOS, ou o quadro-resumo quando o titular o pedir) para trazer os elementos fáticos principais e resumir o objeto urgente da petição. O julgador deve compreender a urgência antes de virar a página.

3. **Peso das consequências nos ombros do julgador.** Demonstrar que a demora gera consequência irreversível. Não é "o autor precisa do benefício com urgência". É "sem a concessão, o autor ficará sem acesso ao tratamento quimioterápico iniciado em [data], conforme relatório médico ID [xxx], com risco de progressão tumoral documentado no parecer ID [yyy]".

### Estrutura de Réplica Previdenciária

Quando a peça solicitada for réplica (art. 350 do CPC), seguir a estrutura abaixo em vez do formato tradicional de "contestação da contestação". No esqueleto do método, as seções 1 e 2 abaixo formam "1. DA CONTESTAÇÃO" e "2. DAS RAZÕES PARA REJEITAR A DEFESA", e o pedido de prova entra nos REQUERIMENTOS.

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


## Referências Cruzadas com Outras Skills

Antes de gerar qualquer petição, esta skill aciona automaticamente as skills complementares.

- `precedentes-previdenciarios` — para fundamentação jurisprudencial
- `base-revisao-peticao-aprofundada` — para auditoria automática após geração
- `triagem-caso-novo` — quando o caso não está enquadrado
- `cnis-acerto-indicadores` — quando houver pendência de CNIS
- `tema-1124-instrucao-administrativa` — para seção de efeitos financeiros
- `decadencia-revisao-previdenciaria` — em revisões
- `documentos-comprobatorios-in128` — para checklist documental
- `mandado-seguranca-previdenciario` + `ms-competencia-autoridade-coatora` — em MS
- `auditoria-laudo-pericial`, `auditoria-ppp` — quando houver laudo/PPP para auditar
- `printscreen-impacto` — para inserção de documentos reais com destaque
- MCP `acervo` — na Fase 0, para ler o que o escritório já sustentou, e MCP `normas` pela `base-legislacao-fontes-primarias` quando for citar dispositivo
- `reafirmacao-der`, `tutela-urgencia` (interna) — conforme política

A revisão final do conteúdo da petição é responsabilidade da skill `base-revisao-peticao-aprofundada`, acionada automaticamente após esta skill concluir a geração, na ordem única de execução dela. A `revisao-peticao` é apenas redirecionamento para ela desde a Onda 139.


## Orçamento declarado antes da redação (Onda 120)

Antes de escrever a primeira linha, declarar o tipo de peça, o orçamento de páginas correspondente e a distribuição por seção. Exemplo para petição inicial de 7 páginas, endereçamento e qualificação 0,5, fatos 2, direito 3, Parágrafo de Realidade 0,5, pedidos 1.

A distribuição é plano de trabalho, não promessa. Seção que estourar o previsto sinaliza que ali há fundamento acessório sendo desenvolvido como se fosse decisivo, e é onde a fusão de fundamentos deve atuar primeiro.

Peça sem orçamento declarado cresce por acúmulo, porque cada skill acionada acrescenta e nenhuma subtrai. O orçamento por tipo de peça e a passada de corte estão na Camada 6 da `base-revisao-peticao-aprofundada`.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
