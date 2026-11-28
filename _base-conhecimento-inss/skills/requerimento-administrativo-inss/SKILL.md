---
name: requerimento-administrativo-inss
description: "Skill de requerimentos administrativos ao INSS (requerimento de benefício, cumprimento de exigência, recurso administrativo acompanhante, pedido de complementação, petição administrativa). Use SEMPRE que mencionar requerimento administrativo, petição administrativa ao INSS, pedido administrativo, cumprimento de exigência INSS, documento para protocolar no INSS, requerimento de pensão por morte administrativo, requerimento de aposentadoria administrativo, requerimento de BPC administrativo, requerimento de auxílio-doença administrativo, carta ao INSS, orientação de requerimento, modelo de requerimento INSS, instrução administrativa, petição para o servidor do INSS. NÃO use para petições judiciais (usar peticao-previdenciaria), recursos ao CRPS (usar skills CRPS) ou mandados de segurança."
---

# Skill de Requerimentos Administrativos ao INSS

## Princípio Fundamental

Requerimento administrativo não é petição judicial. O destinatário é o servidor do INSS, vinculado a normas internas (instruções normativas, portarias, manuais e checklists), que aplica o entendimento consolidado do órgão.

O requerimento não convence o servidor a decidir contra o entendimento do INSS. Ele instrui o processo e demonstra que o caso se enquadra nas hipóteses das normas internas. Requerimento longo, com teses jurídicas, é lido como discussão e cede ao checklist do sistema.

## Regras Estruturais

### Tom e Linguagem

O texto deve ser direto, objetivo e instrutivo. Frases curtas. Sem jargão jurídico. Sem citações de jurisprudência. Sem latinismos. Sem argumentação principiológica. O vocabulário deve refletir o universo normativo do INSS, não o universo processual do Poder Judiciário.

Dois-pontos apenas antes de citação literal ou de enumeração, como nas demais peças do escritório.

### Referências Normativas

Citar APENAS normas internas do INSS e legislação previdenciária direta. A ordem de preferência é a seguinte. Primeiro, IN 128/2022 (e suas alterações) com indicação do artigo e parágrafo específico. Segundo, Decreto 3.048/99 com indicação do artigo. Terceiro, Lei 8.213/91 com indicação do artigo. Quarto, portarias do INSS (DIRBEN, MPS) quando aplicáveis ao caso. Quinto, enunciados do CRPS quando consolidarem entendimento favorável.

NUNCA citar jurisprudência (temas repetitivos, repercussão geral, julgados de TRF) em requerimentos administrativos. O servidor não tem poder para afastar entendimento do INSS com base em jurisprudência, salvo quando houver memorando ou orientação interna determinando a aplicação do precedente. Se existir orientação interna do INSS aplicando determinado tema repetitivo, citar a orientação interna (memorando-circular, nota técnica), não o tema em si.

### Extensão

Extensão de referência de uma folha, como na `inicial-inss`. O servidor decide por norma infralegal e trava de sistema. Declarar o teto antes de redigir, nomear em uma frase o que se pede e por qual dispositivo, e o dado que sustenta o pedido acompanha cada pedido. Passou da folha, retira-se apenas a repetição, nunca o dado que o servidor precisa para deferir. Regra 10 do protocolo e `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

### Formato

Quando possível, adotar formato tabular para apresentação de dados. Tabelas com campos estruturados (espécie de benefício, falecido/instituidor, data do óbito, qualidade de segurado, dependência, DIB pretendida) comunicam mais em menos espaço e facilitam a conferência pelo servidor.

## Estrutura do Requerimento

### Cabeçalho

Utilizar o timbre do escritório (mesmo header da peticao-previdenciaria). Endereçar ao "Ilmo. Sr. Chefe da Agência do INSS de [cidade]" ou, quando o processamento for centralizado, ao "Ilmo. Sr. Responsável pela Central de Análise de Benefícios (CEAB)".

### Identificação do Segurado/Requerente

Nome completo, CPF, NIT/PIS, data de nascimento, endereço, telefone e e-mail. Se o requerimento for feito por procurador, incluir dados do procurador e referência à procuração.

### Objeto do Requerimento

Uma frase direta identificando o que se pretende. Exemplos de formulação adequada. "Apresenta requerimento de concessão de pensão por morte (B21)." Ou "Apresenta documentação complementar para cumprimento de exigência formulada no processo administrativo nº [número], NB [número]."

### Quadro-Resumo de Dados

Tabela com os dados essenciais do caso, adaptada à espécie de benefício. O quadro-resumo é o elemento central do requerimento administrativo. Ele substitui parágrafos descritivos por informação organizada e verificável.

**Para pensão por morte (B21/B93).** Campos obrigatórios no quadro incluem espécie de benefício, falecido/instituidor, data do falecimento, qualidade de segurado (com referência ao último vínculo ou contribuição no CNIS), dependência da requerente (com referência ao documento comprobatório), duração do casamento ou união estável (com referência à certidão), duração do benefício (com fundamentação legal) e DIB pretendida.

**Para aposentadoria (B42/B46/B41).** Campos obrigatórios incluem espécie de benefício, regra aplicável (pré-reforma, transição, pós-EC 103), tempo de contribuição total, carência, idade na DER, DIB pretendida e observações (complementação pendente, período rural, tempo especial).

**Para incapacidade (B31/B91/B94).** Campos obrigatórios incluem espécie de benefício, CID principal, data de início dos sintomas (DIS) declarada no Meu INSS, data de início da incapacidade (DII), último vínculo ou contribuição, carência, qualidade de segurado e documentos médicos apresentados com referência a cada documento. A DIS declarada no Meu INSS precisa ser fixada em conformidade com o Protocolo de Autodeclaração da skill `analise-documental-incapacidade`. A data declarada é a verdadeira, coerente com a documentação médica; a orientação evita erro de preenchimento e nunca altera o fato.

**Para BPC/LOAS (B87).** Campos obrigatórios incluem requerente, tipo de impedimento, composição do grupo familiar (nomes e vínculos), renda per capita calculada (com referência aos documentos) e CadÚnico (NIS e data de atualização).

### Exposição dos Fatos

Parágrafos curtos e diretos descrevendo a situação fática. Sem adjetivação. Sem argumentação. Apenas fatos verificáveis com referência aos documentos anexados. Cada afirmação deve remeter ao documento comprobatório ("conforme certidão de óbito em anexo", "conforme extrato CNIS em anexo").

### Enquadramento Normativo

Uma seção curta, em linguagem simples, que liga o fato ao requisito. Sem transcrição de artigos (o servidor conhece a legislação). O artigo entra apenas quando extremamente necessário, isto é, quando o pedido depende dele ou quando o INSS costuma negar contra norma expressa, e entra por remissão curta na frase. Exemplo adequado. "A pensão por morte não exige carência. O instituidor mantinha a qualidade de segurado na data do óbito, porque o CNIS registra contribuições até [competência] e o óbito ocorreu dentro do período de graça (art. 15, II, da Lei 8.213/91)."

### Documentos Anexos

Lista numerada de todos os documentos que acompanham o requerimento. Cada item com descrição concisa. A numeração deve ser sequencial e referenciada no corpo do requerimento.

### Pedido

Uma frase direta com o que se requer. "Diante do exposto, requer a concessão do benefício de pensão por morte (B21), com DIB na data do óbito ([data])." O pedido não cita artigo.

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

O preenchimento equivocado compromete o benefício. Data imprecisa, sem apoio documental, abre espaço à alegação de preexistência ou de falta de carência. Data idêntica à da declaração médica gera contradição documental. Descrição técnica copiada do relatório soa artificial e pode gerar suspeita de fraude.

A orientação ao preenchimento é etapa obrigatória do requerimento administrativo de B31, B91, B94 e de BPC com componente de incapacidade. O advogado NUNCA deixa a cliente preencher sozinha.

O protocolo operacional completo (distinção DIS/DID/DII, análise retroativa do CNIS, escolha da data mais defensável, redação humanizada em primeira pessoa, revisão de coerência clínica, templates por CID) está consolidado na skill `analise-documental-incapacidade`, seção "Protocolo de Autodeclaração nos Campos do Meu INSS". Consultar e aplicar obrigatoriamente.

O texto final da autodeclaração deve ser fornecido à cliente em formato pronto para copiar e colar, acompanhado da data exata a ser inserida no campo formal.

### Campos do formulário do Meu INSS e o Tema 1124

O formulário eletrônico pergunta se há tempo especial, tempo rural, atividade de professor e outros dados que definem o que o INSS vai analisar. Resposta "não" em campo que o caso exige pode ser lida como indeferimento forçado. A TNU já tratou assim o "não" em período especial, e a 14ª e a 9ª Turmas Recursais de SP mantiveram extinções mesmo com PPP anexado e pedido escrito no corpo do requerimento. A 1ª Turma Recursal de SP e a 9ª Turma do TRF4 decidiram em sentido contrário, e os embargos de declaração do Tema 1124 vedaram o indeferimento automático sem oportunidade de complementação. Como a divergência persiste e o risco recai sobre o segurado, a regra é não depender dela.

Regras do escritório. Responder "sim" em todo campo que corresponda a período ou condição que o caso vai pedir. Repetir o pedido no corpo do requerimento, com a lista dos períodos e dos documentos. Anexar os documentos no próprio protocolo. Pedir expressamente a justificação administrativa quando faltar documento. Guardar o comprovante do protocolo e a tela de resumo do formulário. Antes do protocolo, o advogado confere o formulário campo a campo e nunca deixa o cliente preencher sozinho. Julgados em `tema-1124-instrucao-administrativa/references/APLICACAO-TRF3-TEMA-1124.md`.

## Integração com Skills Complementares

Antes de redigir qualquer requerimento administrativo, consultar as seguintes skills conforme o caso.

**base-documentos-comprobatorios-in128.** Fonte primária sobre quais documentos são exigidos pelo INSS para cada categoria de segurado e espécie de direito. Consultar SEMPRE antes de montar a lista de documentos do requerimento.

**inss-canais-atendimento.** Para orientar o cliente sobre onde e como protocolar o requerimento (Meu INSS, agência presencial, modalidade de atendimento).

**base-cnis-acerto-indicadores.** Quando o CNIS apresentar indicadores bloqueantes, orientar sobre a documentação necessária para supri-los no requerimento.

**analise-documental-incapacidade.** Para requerimentos de B31, B91 e B94, verificar os requisitos documentais das Portarias Conjuntas 13, 14 e 15/2026 E aplicar obrigatoriamente o Protocolo de Autodeclaração nos Campos do Meu INSS (seção específica daquela skill) para orientar o preenchimento dos campos "Data de início dos sintomas" e "Descrição dos sintomas" antes do protocolo.

**contribuicoes-complementacao-ec103.** Para requerimentos que dependam de complementação de contribuições abaixo do mínimo ou DARF 1872.

**tema-1124-instrucao-administrativa.** Para garantir que o requerimento administrativo esteja suficientemente instruído antes do eventual ajuizamento, preservando os efeitos financeiros desde a DER.

**triagem-caso-novo.** Esta skill pode ser acionada pela triagem quando o caso exigir requerimento administrativo antes de qualquer ação judicial.

## Regras de Formatação

Aplicar o mesmo padrão visual do escritório (Bookman Old Style 12pt, espaçamento 1.5, timbre e rodapé). Recuo de primeira linha de 4 cm, o padrão administrativo (opção `--crps` da `base-peticao-previdenciaria-padrao-visual`). Tabelas seguem o mesmo estilo visual dos componentes Visual Law da peticao-previdenciaria (bordas SINGLE, header com fundo cinza claro).

## Anti-patterns (O que NUNCA incluir)

Transcrição de ementas de julgados. Citação de temas repetitivos ou repercussão geral. Argumentação sobre princípios constitucionais. Referência a doutrina ou artigos acadêmicos. Superlativos e adjetivação ("extrema necessidade", "gravidade ímpar"). Frases que pareçam contestação, impugnação ou réplica. Uso de "Excelentíssimo" ou "Meritíssimo" (são tratamentos do Poder Judiciário). Petição judicial disfarçada de requerimento.

Teste final: se o documento parecer petição judicial, refazê-lo.

## Referências

Consultar `references/FORMATTING.md` da skill peticao-previdenciaria para os parâmetros técnicos de formatação do .docx, adaptando apenas o endereçamento e o recuo.

## Decisor simulado antes do protocolo

Antes de protocolar, submeter a minuta e a relação de documentos ao agente `servidor-chefe-inss`, que decide por checklist e por trava de sistema, como o cargo real decide. Ele devolve DEFERIDO, EXIGÊNCIA, INDEFERIDO ou NÃO CONCLUÍDO POR PENDÊNCIA, com a motivação normativa e a lista fechada do que faria virar deferimento. Requerimento sustentado apenas em tese judicial tende ao indeferimento, porque o servidor não aplica precedente do STJ nem relativiza critério legal.

## Prazo de trinta dias da exigência e desistência

Pelos arts. 574, § 4º, II, e 600, parágrafo único, da IN 128/2022, na redação da IN PRES/INSS 212, de 06/08/2026, a falta de manifestação sobre exigência após 30 dias da ciência configura desistência, com encerramento sem análise do mérito. Não há decisão de mérito a recorrer, e a ação judicial enfrenta a falta de interesse de agir e o Tema 1124 do STJ.

Regra do escritório: lançar o termo final na agenda ao registrar a exigência. Sem cumprimento integral, manifestar-se no prazo com o que houver e pedir dilação, pois a desistência decorre da falta de manifestação, não do cumprimento parcial.

Registrar também o art. 566, § 9º, que SUSPENDE os prazos do INSS enquanto o processo estiver em exigência. Isso afeta o cálculo do tempo de mora para eventual mandado de segurança.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

Forma da peça: `peticao-previdenciaria/references/ESTILO-MODELO.md`, seção "A mesma peça em todos os ritos".
