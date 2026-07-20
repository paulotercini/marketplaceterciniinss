---
name: requerimento-administrativo-inss
description: "Skill de requerimentos administrativos ao INSS (requerimento de benefício, cumprimento de exigência, recurso administrativo acompanhante, pedido de complementação, petição administrativa). Use SEMPRE que mencionar requerimento administrativo, petição administrativa ao INSS, pedido administrativo, cumprimento de exigência INSS, documento para protocolar no INSS, requerimento de pensão por morte administrativo, requerimento de aposentadoria administrativo, requerimento de BPC administrativo, requerimento de auxílio-doença administrativo, carta ao INSS, orientação de requerimento, modelo de requerimento INSS, instrução administrativa, petição para o servidor do INSS. NÃO use para petições judiciais (usar peticao-previdenciaria), recursos ao CRPS (usar skills CRPS) ou mandados de segurança."
---

# Skill de Requerimentos Administrativos ao INSS

## Princípio Fundamental

Requerimento administrativo NÃO é petição judicial. O destinatário é um servidor do INSS, frequentemente sem formação jurídica, cuja atuação é totalmente vinculada a normas internas (manuais, instruções normativas, portarias e checklists). O servidor não decide de forma discricionária. Ele aplica o entendimento consolidado do órgão.

A consequência prática é que o advogado nunca vai convencer o servidor a decidir contra o entendimento do INSS. Mas pode ajudá-lo a decidir a favor do segurado, facilitando a instrução do processo administrativo e demonstrando que o caso se enquadra nas hipóteses previstas nas normas internas.

O erro mais comum é escrever para convencer quando o objetivo deveria ser instruir. Requerimentos longos, formais e cheios de teses jurídicas são ignorados pelo servidor, que percebe a peça como discussão jurídica e vai direto ao sistema aplicar o checklist interno.

## Regras Estruturais

### Tom e Linguagem

O texto deve ser direto, objetivo e instrutivo. Frases curtas. Sem jargão jurídico. Sem citações de jurisprudência. Sem latinismos. Sem argumentação principiológica. O vocabulário deve refletir o universo normativo do INSS, não o universo processual do Poder Judiciário.

A proibição absoluta de dois pontos do escritório se mantém também nos requerimentos administrativos.

### Referências Normativas

Citar APENAS normas internas do INSS e legislação previdenciária direta. A ordem de preferência é a seguinte. Primeiro, IN 128/2022 (e suas alterações) com indicação do artigo e parágrafo específico. Segundo, Decreto 3.048/99 com indicação do artigo. Terceiro, Lei 8.213/91 com indicação do artigo. Quarto, portarias do INSS (DIRBEN, MPS) quando aplicáveis ao caso. Quinto, enunciados do CRPS quando consolidarem entendimento favorável.

NUNCA citar jurisprudência (temas repetitivos, repercussão geral, julgados de TRF) em requerimentos administrativos. O servidor não tem poder para afastar entendimento do INSS com base em jurisprudência, salvo quando houver memorando ou orientação interna determinando a aplicação do precedente. Se existir orientação interna do INSS aplicando determinado tema repetitivo, citar a orientação interna (memorando-circular, nota técnica), não o tema em si.

### Extensão

O requerimento deve caber em poucas páginas. O ideal é uma a três páginas. Se o documento ultrapassar quatro páginas, revisar criticamente para eliminar repetições, fundamentação jurídica excessiva e parágrafos que não agregam informação nova. O servidor lê dezenas de requerimentos por dia. A concisão é condição de eficácia.

### Formato

Quando possível, adotar formato tabular para apresentação de dados. Tabelas com campos estruturados (espécie de benefício, falecido/instituidor, data do óbito, qualidade de segurado, dependência, DIB pretendida) comunicam mais em menos espaço e facilitam a conferência pelo servidor.

## Estrutura do Requerimento

### Cabeçalho

Utilizar o timbre do escritório (mesmo header da peticao-previdenciaria). Endereçar ao "Ilmo. Sr. Chefe da Agência do INSS de [cidade]" ou, quando o processamento for centralizado, ao "Ilmo. Sr. Responsável pela Central de Análise de Benefícios (CEAB)".

### Identificação do Segurado/Requerente

Nome completo, CPF, NIT/PIS, data de nascimento, endereço, telefone e e-mail. Se o requerimento for feito por procurador, incluir dados do procurador e referência à procuração.

### Objeto do Requerimento

Uma frase direta identificando o que se pretende. Exemplos de formulação adequada. "Apresenta requerimento de concessão de pensão por morte (B21), com base no art. 74 da Lei 8.213/91." Ou "Apresenta documentação complementar para cumprimento de exigência formulada no processo administrativo nº [número], NB [número]."

### Quadro-Resumo de Dados

Tabela com os dados essenciais do caso, adaptada à espécie de benefício. O quadro-resumo é o elemento central do requerimento administrativo. Ele substitui parágrafos descritivos por informação organizada e verificável.

**Para pensão por morte (B21/B93).** Campos obrigatórios no quadro incluem espécie de benefício, falecido/instituidor, data do falecimento, qualidade de segurado (com referência ao último vínculo ou contribuição no CNIS), dependência da requerente (com referência ao documento comprobatório), duração do casamento ou união estável (com referência à certidão), duração do benefício (com fundamentação legal) e DIB pretendida.

**Para aposentadoria (B42/B46/B41).** Campos obrigatórios incluem espécie de benefício, regra aplicável (pré-reforma, transição, pós-EC 103), tempo de contribuição total, carência, idade na DER, DIB pretendida e observações (complementação pendente, período rural, tempo especial).

**Para incapacidade (B31/B91/B94).** Campos obrigatórios incluem espécie de benefício, CID principal, data de início dos sintomas (DIS) declarada no Meu INSS, data de início da incapacidade (DII), último vínculo ou contribuição, carência, qualidade de segurado e documentos médicos apresentados com referência a cada documento. A DIS declarada no Meu INSS precisa ser fixada em conformidade com o Protocolo de Autodeclaração da skill `analise-documental-incapacidade` — NUNCA usar data anterior à consolidação da qualidade de segurada e carência.

**Para BPC/LOAS (B87).** Campos obrigatórios incluem requerente, tipo de impedimento, composição do grupo familiar (nomes e vínculos), renda per capita calculada (com referência aos documentos) e CadÚnico (NIS e data de atualização).

### Exposição dos Fatos

Parágrafos curtos e diretos descrevendo a situação fática. Sem adjetivação. Sem argumentação. Apenas fatos verificáveis com referência aos documentos anexados. Cada afirmação deve remeter ao documento comprobatório ("conforme certidão de óbito em anexo", "conforme extrato CNIS em anexo").

### Enquadramento Normativo

Uma seção curta indicando os dispositivos legais e normativos que fundamentam o pedido. Sem transcrição de artigos (o servidor conhece a legislação). Indicar apenas o artigo e o diploma, com uma frase conectando ao caso concreto. Exemplo adequado. "O benefício de pensão por morte é devido aos dependentes do segurado que falecer, nos termos do art. 74 da Lei 8.213/91, independentemente de carência (art. 26, I). A qualidade de segurado do instituidor na data do óbito está comprovada pelo CNIS, que registra contribuições até [competência], com período de graça vigente nos termos do art. 15, II, da Lei 8.213/91."

### Documentos Anexos

Lista numerada de todos os documentos que acompanham o requerimento. Cada item com descrição concisa. A numeração deve ser sequencial e referenciada no corpo do requerimento.

### Pedido

Uma frase direta com o que se requer. "Diante do exposto, requer a concessão do benefício de pensão por morte (B21), com DIB na data do óbito ([data]), nos termos do art. 74 da Lei 8.213/91."

### Fechamento

Local, data e assinatura do advogado no padrão do escritório.

## Requerimentos Específicos

### Cumprimento de Exigência (Carta de Exigência)

Quando o INSS emitir carta de exigência, o requerimento de cumprimento deve mapear cada exigência ao documento que a satisfaz. Formato obrigatório de tabela com duas colunas. Coluna 1, "Exigência do INSS" (reproduzir literalmente o texto da exigência). Coluna 2, "Documento apresentado" (identificar o documento e sua numeração na lista de anexos).

Se alguma exigência for juridicamente indevida (ex. exigência não prevista em lei, exigência de prova já apresentada, exigência de avaliação quantitativa para agente nocivo qualitativo), indicar de forma objetiva o fundamento normativo que afasta a exigência. Neste caso específico, pode-se citar o dispositivo legal ou normativo que demonstra a inadequação da exigência, mantendo tom instrutivo e não confrontativo.

### Complementação de Documentação

Quando o segurado precisar complementar documentação fora do contexto de carta de exigência, o requerimento deve identificar o processo administrativo (NB e protocolo), listar os documentos complementares e indicar o objetivo da complementação (suprir lacuna, atualizar informação, substituir documento).

### Pedido de Revisão Administrativa

Requerimento dirigido ao INSS solicitando revisão de benefício já concedido. Deve identificar o benefício (NB, espécie, DIB), o ponto a ser revisado (RMI, tempo de contribuição, período especial) e os documentos que fundamentam a revisão. Manter linguagem instrutiva. Indicar expressamente se há prazo decadencial em curso (consultar skill decadencia-revisao-previdenciaria).

### Autodeclaração nos Campos do Meu INSS (B31, B91, B94 e BPC com incapacidade)

O Meu INSS exige, no momento do requerimento de benefícios por incapacidade, o preenchimento obrigatório de dois campos de autodeclaração. "Data de início dos sintomas" e "Descrição dos sintomas". Essas declarações são vinculantes, ficam registradas no sistema e são confrontadas pelo perito com a documentação médica apresentada.

O preenchimento equivocado desses campos compromete o benefício. Data antiga entrega o argumento de preexistência ou ausência de carência. Data idêntica à da declaração médica gera contradição documental. Descrição técnica copiada do relatório soa artificial e pode gerar suspeita de fraude.

A orientação ao preenchimento é etapa obrigatória do requerimento administrativo de B31, B91, B94 e de BPC com componente de incapacidade. O advogado NUNCA deixa a cliente preencher sozinha.

O protocolo operacional completo (distinção DIS/DID/DII, análise retroativa do CNIS, escolha da data mais defensável, redação humanizada em primeira pessoa, revisão de coerência clínica, templates por CID) está consolidado na skill `analise-documental-incapacidade`, seção "Protocolo de Autodeclaração nos Campos do Meu INSS". Consultar e aplicar obrigatoriamente.

O texto final da autodeclaração deve ser fornecido à cliente em formato pronto para copiar e colar, acompanhado da data exata a ser inserida no campo formal.

## Integração com Skills Complementares

Antes de redigir qualquer requerimento administrativo, consultar as seguintes skills conforme o caso.

**documentos-comprobatorios-in128** — Fonte primária sobre quais documentos são exigidos pelo INSS para cada categoria de segurado e espécie de direito. Consultar SEMPRE antes de montar a lista de documentos do requerimento.

**inss-canais-atendimento** — Para orientar o cliente sobre onde e como protocolar o requerimento (Meu INSS, agência presencial, modalidade de atendimento).

**cnis-acerto-indicadores** — Quando o CNIS apresentar indicadores bloqueantes, orientar sobre a documentação necessária para supri-los no requerimento.

**analise-documental-incapacidade** — Para requerimentos de B31, B91 e B94, verificar os requisitos documentais das Portarias Conjuntas 13, 14 e 15/2026 E aplicar obrigatoriamente o Protocolo de Autodeclaração nos Campos do Meu INSS (seção específica daquela skill) para orientar o preenchimento dos campos "Data de início dos sintomas" e "Descrição dos sintomas" antes do protocolo.

**contribuicoes-complementacao-ec103** — Para requerimentos que dependam de complementação de contribuições abaixo do mínimo ou DARF 1872.

**tema-1124-instrucao-administrativa** — Para garantir que o requerimento administrativo esteja suficientemente instruído antes do eventual ajuizamento, preservando os efeitos financeiros desde a DER.

**triagem-caso-novo** — Esta skill pode ser acionada pela triagem quando o caso exigir requerimento administrativo antes de qualquer ação judicial.

## Regras de Formatação

Aplicar o mesmo padrão visual do escritório (Bookman Old Style 12pt, espaçamento 1.5, timbre e rodapé). Recuo de primeira linha de 4 cm (mesmo padrão judicial, não o de 5 cm do CRPS). Tabelas seguem o mesmo estilo visual dos componentes Visual Law da peticao-previdenciaria (bordas SINGLE, header com fundo cinza claro).

## Anti-patterns (O que NUNCA incluir)

Transcrição de ementas de julgados. Citação de temas repetitivos ou repercussão geral. Argumentação sobre princípios constitucionais. Referência a doutrina ou artigos acadêmicos. Superlativos e adjetivação ("extrema necessidade", "gravidade ímpar"). Frases que pareçam contestação, impugnação ou réplica. Uso de "Excelentíssimo" ou "Meritíssimo" (são tratamentos do Poder Judiciário). Petição judicial disfarçada de requerimento.

O teste final é comparar o documento com uma petição judicial. Se parecer uma petição, refazer. Requerimento administrativo tem cara, estrutura e linguagem próprias.

## Referências

Consultar `references/FORMATTING.md` da skill peticao-previdenciaria para os parâmetros técnicos de formatação do .docx, adaptando apenas o endereçamento e o recuo.