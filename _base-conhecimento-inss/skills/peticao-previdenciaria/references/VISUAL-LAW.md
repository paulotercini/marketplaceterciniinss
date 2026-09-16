# Componentes Visual Law

Onda 140 (16/09/2026). Documentação dos cinco componentes, da síntese do caso em duas ou três linhas (Onda 118) e das regras de combinação. Em Markdown, todo componente é uma tabela `| a | b |`, e o `md2docx.js` a converte no padrão, com a primeira coluna em negrito. O teto é de TRÊS componentes por peça, com o quadro-resumo sempre entre eles.

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

**Limite de eventos (apertado na Onda 118).** Entre 4 e 6 eventos. Linha do tempo com mais de seis marcos vira lista e perde a função. Se o caso tiver mais, selecionar os que decidem, e o critério é perguntar de cada evento se a sua remoção mudaria a compreensão da controvérsia. Não mudando, sai.

### Componente 2 — Quadro-Resumo (caseSummaryBox) [REFORMADO NA ONDA 104]

**Finalidade única.** Dizer ao julgador, em segundos, DUAS coisas. Qual é o ponto controvertido e o que se pede. Nada além disso.

**Quando usar.** Obrigatório em toda petição inicial de concessão e restabelecimento e em todo recurso. Opcional nas demais peças.

**Posição na petição.** Imediatamente após a qualificação das partes e a indicação "pelos fatos e fundamentos a seguir expostos", antes do primeiro título preto numerado.

**Estrutura.** Tabela de duas colunas com cabeçalho preto único "SÍNTESE DO CASO", com DUAS linhas, ou TRÊS no máximo quando o valor em disputa for o coração do caso.

- Linha 1, rótulo **Ponto controvertido**. UMA frase, máximo de 25 palavras, que nomeia a única questão que o julgador precisa decidir. Sem histórico, sem citação de norma, sem data que não seja essencial à controvérsia.
- Linha 2, rótulo **O que se pede**. UMA frase, máximo de 25 palavras, com a providência pretendida em linguagem direta. Em recurso, a reforma pretendida. O valor mensal ou total em disputa PODE fechar esta frase, como no exemplo canônico.
- Linha 3, OPCIONAL e rara, somente quando um dado quantitativo isolado decidir o caso e não couber na linha 2 sem inchá-la. Rótulo livre de uma ou duas palavras.

**EXEMPLO CANÔNICO, validado pelo escritório em 19/08/2026 (Onda 118).** Caso real de redutor de acumulação em pensão.

- Ponto controvertido. "O INSS reduziu pensão por morte concedida em **23/09/2008**, aplicando redutor criado pela EC 103/2019 por causa de aposentadoria concedida em 2025."
- O que se pede. "Reforma da sentença para **suprimir o redutor de acumulação** e restituir R$ 245,14 mensais desde setembro de 2025."

Por que este exemplo é o padrão. Bate o olho e entende. As datas que aparecem são AS DUAS que decidem o caso (concessão pré-reforma e fato novo pós-reforma). O negrito marca só o núcleo. O valor aparece uma única vez, na providência. Nenhuma palavra sobra.

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

**Limite de linhas (Onda 118).** Máximo de 5 fatos. A tabela existe para REDUZIR o campo de decisão, e dez linhas o ampliam de volta. Fato incontroverso que não sustenta nenhum pedido não entra. As colunas Prova e Fonte podem ser fundidas em uma única coluna "Prova" quando a origem for o próprio documento, encurtando a tabela.

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

**Limite de pontos (apertado na Onda 118).** Entre 2 e 4 pontos de confronto, agrupando por eixo temático o que exceder. Em confronto testemunhal, entre 2 e 3 contradições. O confronto ganha pela precisão do golpe, não pela quantidade, e o quarto ponto fraco desvaloriza os três fortes.

### Componente 5 — Tabela-Resumo Pedido x Fundamento (requestSummaryTable)

**Quando usar.** Obrigatória em petições iniciais com dois ou mais pedidos autônomos (ex. reconhecimento de tempo especial + conversão + concessão, ou concessão de benefício + indenização por dano moral). Recomendada em réplicas e memoriais com múltiplos pontos. Opcional em peças com pedido único simples.

**Posição na petição.** Imediatamente antes dos pedidos, como última seção argumentativa da peça. Pode receber título preto "SÍNTESE DOS PEDIDOS E FUNDAMENTOS" ou ser inserida sem subtítulo.

**Estrutura.** Tabela de duas colunas.

- Coluna 1: **Pedido/Alegação** (largura 4000 twips), Bookman Old Style 10pt negrito
- Coluna 2: **Fundamento** (largura 5213 twips), Bookman Old Style 10pt, indicando dispositivo legal, tema repetitivo ou prova

**Cabeçalho**: fundo preto, texto branco em negrito.

**Limite de linhas (apertado na Onda 118).** Máximo 6 linhas, com os acessórios (custas, honorários, AJG) agrupados em linha única. UM fundamento por linha, o mais forte. Empilhar três dispositivos e dois temas na mesma célula transforma o resumo em nova argumentação, que é exatamente o que ele existe para evitar.

### Combinação de Componentes [REFORMADA NA ONDA 118]

**Teto de TRÊS componentes por peça, sendo o quadro-resumo sempre um deles.** A regra anterior mandava empilhar os cinco na inicial típica, e o resultado eram peças carregadas que cansavam a leitura. Visual Law funciona por contraste, e cinco tabelas não contrastam com nada.

Escolha dos outros dois, pelo que DECIDE o caso concreto.

- A controvérsia é de SEQUÊNCIA de eventos (cessação, limbo, qualidade de segurado, prazo). Linha do tempo.
- A controvérsia é de CONFRONTO com o que o INSS ou a sentença afirmou. Tabela comparativa.
- A vitória depende de FIXAR o que já está provado (JEF, MS, réplica). Fatos incontroversos.
- Há DOIS OU MAIS pedidos autônomos que o juiz pode confundir. Pedido x fundamento.

Componente que não disputa a decisão não entra, ainda que ficasse bonito. O quarto e o quinto só aparecem em peça excepcionalmente complexa, com justificativa registrada, e nunca todos os cinco.

Em petições simples (ex. restabelecimento por cessação automática), bastam o quadro-resumo e a linha do tempo.

Em mandados de segurança, usar no mínimo o quadro-resumo, a linha do tempo e os fatos incontroversos.

Em réplicas, usar no mínimo a tabela de fatos incontroversos/controvertidos (Componente 3 adaptado, com colunas "Fato alegado", "Impugnação pelo INSS" e "Situação processual").

Em memoriais, usar no mínimo o quadro-resumo no formato canônico (Ondas 104 e 118) e, quando pertinente, um printscreen de jurisprudência (Componente 5 da skill `printscreen-impacto`).

Em recursos, avaliar caso a caso. A tabela comparativa é o componente mais útil em sede recursal, confrontando a sentença com as provas não valoradas.

### Exclusão de Componentes

O usuário pode solicitar a exclusão de qualquer componente com instruções como "sem Visual Law", "sem quadro-resumo", "sem linha do tempo", "petição apenas textual" ou equivalentes. Nesse caso, omitir o componente solicitado e manter os demais, salvo instrução expressa de exclusão total.

---

