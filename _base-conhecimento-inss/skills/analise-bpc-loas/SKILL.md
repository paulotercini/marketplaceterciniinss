---
name: analise-bpc-loas
description: "Análise técnica de BPC/LOAS pela Portaria Conjunta MDS/INSS 2/2015 e TCQ. Use SEMPRE que mencionar BPC, LOAS, benefício assistencial, avaliação biopsicossocial, perícia BPC, TCQ, gatilho elevação funções corpo, agravante estrutura, prognóstico desfavorável, Portaria 34/2025, Portaria 37/2026, Lei 15.157/2025, dispensa reavaliação, impedimento permanente irreversível irrecuperável, Decreto 6.214/2007, Lei 8.742/93, miserabilidade, renda per capita, grupo familiar, indeferimento BPC, qualificador N L, Teleperícia BPC, Portaria 19/2026. Use TAMBÉM em casos de TEA, autismo, Asperger, F84, 6A02, CID 11 autismo, Lei 12.764, Berenice Piana, CIPTEA, Lei 13.977, Tema 376 TNU, comorbidades autismo, criança autista, dupla codificação CID DSM-5-TR, nível de suporte autismo. Abrange análise domínio a domínio, gatilhos, confronto com documentação médica, renda e grupo familiar, estratégia administrativa ou judicial. NÃO use para aposentadoria PCD nem incapacidade."
---

# Análise Técnica de BPC/LOAS pela Portaria Conjunta 2/2015 e TCQ

## Visão geral

Esta skill analisa requerimentos, indeferimentos e avaliações biopsicossociais do BPC/LOAS da pessoa com deficiência. Verifica os qualificadores da Portaria Conjunta MDS/INSS nº 2/2015, domínio a domínio, nos três componentes (Fatores Ambientais, Atividades e Participação, Funções do Corpo), a aplicação dos gatilhos de elevação, o confronto com a Tabela Conclusiva de Qualificadores (TCQ) e a estratégia administrativa ou judicial. Requisitos gerais, renda e grupo familiar estão nas skills remetidas ao final; aqui entram apenas na medida do roteiro de análise.

**Alerta. O método Fuzzy não se aplica ao BPC.** O Fuzzy integra o IF-BrA (Índice de Funcionalidade Brasileiro Aplicado), instrumento da aposentadoria da pessoa com deficiência (LC 142/2013), aprovado pela Portaria Interministerial SDH/MPS/MF/MOG/AGU nº 1, de 27/01/2014. O instrumento do BPC usa qualificadores CIF de 0 a 4 processados pela TCQ, sem escala de 25/50/75/100 pontos e sem domínios sensíveis por tipo de impedimento. Caso de aposentadoria PCD vai para `base-aposentadoria-pcd-lc142` e `base-pcd-if-bra-metodologia`.

## Regras de análise

**Honestidade.** Se a avaliação do INSS estiver correta, dizer isso. Antes, verificar sempre os gatilhos de elevação de Funções do Corpo, a coerência de cada domínio com a documentação médica, a identificação das barreiras e se a pontuação reflete o desempenho real, e não a capacidade teórica.

**Fontes.** Nenhum artigo, súmula, tema ou precedente sem conferência. Sem base normativa, declarar a controvérsia.

## Marco normativo

CF/88, art. 203, V. Lei 8.742/1993 (LOAS), art. 20: §2º (conceito de pessoa com deficiência), §2º-A (concessão administrativa ou judicial sujeita a avaliação, Lei 15.077/2024), §3º (renda igual ou inferior a 1/4 do salário mínimo, Lei 14.176/2021), §6º (avaliação médica e social pela perícia médica e pelo serviço social do INSS) e §10 (impedimento de longo prazo, mínimo de 2 anos). Lei 13.146/2015, art. 2º, §1º (avaliação biopsicossocial). Decreto 6.214/2007, art. 16 (avaliação), com as alterações do Decreto 12.534/2025.

Normas operacionais vigentes. Portaria Conjunta MDS/INSS nº 34, de 09/10/2025 (procedimentos do BPC; revogou as Portarias Conjuntas 3/2018, 7/2020, 14/2021, 18/2021, 22/2022 e 28/2024, art. 34). Portaria Conjunta MDS/INSS nº 2, de 30/03/2015 (instrumento de avaliação), alterada pela Portaria Conjunta MDS/MPS/INSS nº 37, de 01/04/2026. Lei 15.157/2025 (art. 21, §5º, da LOAS: dispensa de avaliação periódica do impedimento permanente, irreversível ou irrecuperável, salvo fundada suspeita de fraude ou erro). Portaria Conjunta DPMF/INSS nº 19/2026 (Teleperícia no BPC, vigência em 13/04/2026).

Síntese da Portaria 34/2025 (requisitos do art. 6º, grupo familiar do art. 7º, exclusões e deduções do art. 8º, renda na DER do art. 11, §2º, padrão médio do art. 13, §4º, III, revisão dos arts. 28 e 29) em `base-bpc-loas-requisitos` e `bpc-renda-grupo-familiar`. Redação literal da Portaria 37/2026 em `base-bpc-impedimento-longo-prazo/references/PORTARIA-CONJUNTA-37-2026-CONFERIDA-DOU.md`.

## Teleperícia no BPC

A Portaria Conjunta DPMF/INSS 19/2026 permite a avaliação médico-pericial inicial e a reavaliação por videoconferência: o requerente comparece à APS, onde há triagem, termo de consentimento e digitalização dos documentos, e o perito atua remotamente. A avaliação social não muda. A Portaria 34/2025, art. 13, §4º, II, também admite videoconferência para as duas avaliações.

Posição do escritório. Mobilidade (d4), Cuidado Pessoal (d5) e as funções que exigem exame físico (b4, b7) dependem de observação direta. Em quadros sensoriais, neurológicos, ortopédicos e psiquiátricos, requerer avaliação presencial. Cessação ou indeferimento após Teleperícia em quadro que exigia exame físico: impugnar por inadequação do método ao caso, com demonstração dos domínios subavaliados, e requerer em juízo perícia presencial. Análise do laudo em `auditoria-laudo-pericial`.

## O instrumento de avaliação (Portaria Conjunta MDS/INSS 2/2015)

### Estrutura

O instrumento vigente está nos Anexos I (16 anos ou mais) e II (menor de 16 anos) da Portaria 2/2015. Não é o IFBrM (Índice de Funcionalidade Brasileiro Modificado), validado (Resolução CONADE 01/2020) mas não adotado por ato conjunto para substituir o instrumento vigente. Não é o IF-BrA.

Competências. O assistente social qualifica Fatores Ambientais e os domínios d6 a d9 (art. 5º). O perito médico qualifica Funções do Corpo e os domínios d1 a d5 (art. 6º) e responde aos quesitos do art. 7º.

### Componentes e domínios

**Fatores Ambientais (assistente social).** e1 Produtos e Tecnologia; e2 Condições de Habitabilidade e Mudanças Ambientais; e3 Apoio e Relacionamentos; e4 Atitudes; e5 Serviços, Sistemas e Políticas.

**Atividades e Participação.** Perito médico: d1 Aprendizagem e Aplicação de Conhecimento; d2 Tarefas e Demandas Gerais; d3 Comunicação; d4 Mobilidade; d5 Cuidado Pessoal. Assistente social: d6 Vida Doméstica; d7 Relações e Interações Interpessoais; d8 Áreas Principais da Vida; d9 Vida Comunitária, Social e Cívica.

**Funções do Corpo (perito médico).** b1 Mentais; b2 Sensoriais e Dor; b3 Voz e Fala; b4 Cardiovascular, Hematológico, Imunológico e Respiratório; b5 Digestivo, Metabólico e Endócrino; b6 Geniturinárias e Reprodutivas; b7 Neuromusculoesqueléticas e Movimento; b8 Pele.

### Escala de qualificadores (CIF)

0 Nenhuma (0 a 4%); 1 Leve (5 a 24%); 2 Moderada (25 a 49%); 3 Grave (50 a 95%); 4 Completa (96 a 100%). O qualificador final de cada componente é expresso em letra: N, L, M, G ou C.

Qualificador 0 em Funções do Corpo exige justificativa: "não foram observadas alterações" ou "ausência de elementos de convicção para qualificar". A segunda é impugnável quando há documentação médica do domínio. A pontuação reflete o desempenho no ambiente habitual; pontuação pela capacidade teórica vicia a avaliação.

### Qualificadores finais (Anexo III da Portaria 2/2015)

**Fatores Ambientais.** Média dos cinco domínios: [(e1+e2+e3+e4+e5) x 5] – 0,1.

**Atividades e Participação.** Média dos nove domínios: [(d1+...+d9) x 2,777777777777780] – 0,1. Sem gatilho de elevação.

**Funções do Corpo.** Maior qualificador atribuído entre b1 e b8. Sujeito aos gatilhos de elevação.

### Gatilhos de elevação de Funções do Corpo (art. 7º, I e II)

**Agravante de Estrutura do Corpo (art. 7º, I).** Quesito: há alterações em Estrutura do Corpo que configurem maiores limitações do que as observadas em Funções do Corpo? A resposta afirmativa eleva o qualificador final de Funções do Corpo em um nível (N para L, L para M, M para G, G para C; C permanece C), com indicação da estrutura afetada. Os domínios b1 a b8 captam a fisiologia; amputação, deformidade, destruição articular e lesão anatômica que limitam mais do que a função medida exigem o gatilho.

**Prognóstico Desfavorável (art. 7º, II).** Quesito: as alterações em Função ou Estrutura do Corpo configuram prognóstico desfavorável? Respostas: "Não", "Não é possível prognosticar" e "Sim". Apenas "Sim" eleva um nível. A elevação não é cumulativa com a do Agravante de Estrutura.

**Ponto central de impugnação.** Em toda análise, verificar se os gatilhos foram acionados e se deveriam ter sido, à luz da documentação médica. A elevação de L para M em Funções do Corpo pode inverter o resultado da TCQ.

### Quesito de resolução em menos de 2 anos (art. 7º, III)

Não eleva o qualificador. Resposta "Sim" leva ao indeferimento, independentemente da TCQ (art. 8º, parágrafo único, na redação da Portaria 37/2026). O perito deve considerar as barreiras da avaliação social, o tempo pregresso com o quadro e o acesso real ao tratamento. Resolução hipotética, sem acesso concreto ao tratamento, não sustenta o indeferimento.

### Impedimento permanente, irreversível ou irrecuperável (art. 7º, IV)

Incluído pela Portaria 37/2026, com definições no §2º e campo Sim/Não nos Anexos I e II. A resposta "Sim" fundamenta a dispensa de reavaliação do art. 21, §5º, da LOAS. Resposta "Não" sem fundamentação, em quadro evidentemente permanente, é ponto de impugnação.

### Art. 8º após a Portaria 37/2026

A redação original do art. 8º mandava indeferir quando o qualificador final de Funções do Corpo ou de Atividades e Participação fosse N ou L (incisos I e II). A Portaria 37/2026 deu nova redação ao artigo, sem reproduzir esses incisos: subsiste apenas o confronto com a TCQ (Anexo IV, não alterado) e o indeferimento por resolução em menos de 2 anos. Em peça, escrever que o art. 8º passou a vigorar com nova redação, sem afirmar revogação expressa. Indeferimento fundado apenas em N ou L isolado perdeu a base normativa própria; a TCQ, porém, continua a produzir resultado não favorável em várias dessas combinações, e o argumento é de incoerência interna da norma.

### Menor de 16 anos (Anexo II)

Domínios e unidades de Atividades e Participação adaptados à faixa etária. Limitação natural da idade não se confunde com limitação do impedimento. A mesma TCQ se aplica. Verificar se o avaliador usou o Anexo II. Tema 299/TNU: a análise da deficiência do menor de 16 anos não se restringe à limitação para o trabalho e abrange a análise social do núcleo familiar.

## Modos de operação

### Modo 1. Análise de avaliação biopsicossocial

Roteiro, na ordem.

1. **Completude formal.** Avaliação médica e social realizadas; tipo de impedimento identificado; impedimento de longo prazo reconhecido; data provável de início fixada; padrão médio da avaliação social aplicado (Portaria 34/2025, art. 13, §4º, III, e Anexo II) e sua adequação ao caso.
2. **Domínio a domínio.** Atividades aplicáveis à faixa etária pontuadas; desempenho real e não capacidade; coerência entre perito e assistente social; coerência com a documentação médica; barreiras identificadas.
3. **Gatilhos e quesitos do art. 7º.** Respostas aos incisos I a IV, compatibilidade com a documentação e simulação do impacto da elevação na TCQ.
4. **Cálculo.** Conferir os qualificadores finais pelas fórmulas do Anexo III.
5. **Confronto documental.** CID divergente, limitação documentada não pontuada, internações e relatórios de profissionais assistentes.

### Modo 2. Caso para requerimento

Projetar o enquadramento provável, a documentação necessária, o grupo familiar (Portaria 34/2025, art. 7º), a renda na DER (art. 11, §2º), exclusões e deduções (art. 8º) e a viabilidade da prova do impedimento de longo prazo.

### Modo 3. Indeferimento ou decisão

Erros de avaliação (pontuação incompatível, domínio omitido, gatilho não acionado), de renda (rendimento indevido, dedução não aplicada, renda anterior à DER), de grupo familiar, desconsideração da Lei 13.146/2015, uso indevido do padrão médio e omissão de barreiras.

## Verificação obrigatória pela TCQ

1. Qualificador final de Fatores Ambientais (Q1).
2. Qualificador final de Atividades e Participação (Q2).
3. Qualificador final de Funções do Corpo (Q3), antes dos gatilhos.
4. Gatilho acionado: elevar Q3 em um nível, sem cumulação.
5. Confrontar Q1, Q2 e Q3 com o Anexo IV.
6. Resultado favorável ou não favorável.
7. Não favorável: identificar os domínios cuja correção inverte o resultado e simular o acionamento dos gatilhos omitidos.
8. Não favorável por N ou L em Q2 ou Q3: registrar a nova redação do art. 8º (Portaria 37/2026).
9. Campo do art. 7º, IV: "Sim" leva à dispensa de reavaliação (art. 21, §5º, LOAS); "Não" injustificado em quadro permanente é impugnável.

## Parecer de subavaliação (obrigatório)

Para cada domínio subavaliado: código CIF; profissional responsável (perito ou assistente social); qualificador atribuído e o devido; fundamento no confronto com a documentação médica e social; impacto na TCQ. É a peça central da impugnação no CRPS e em juízo.

## Pontos críticos da advocacia do BPC

**Critério de renda.** O STF declarou a inconstitucionalidade, sem pronúncia de nulidade, do art. 20, §3º, da LOAS (Tema 27, RE 567.985) e do parágrafo único do art. 34 do Estatuto do Idoso (Tema 312, RE 580.963). O STJ admite prova da miserabilidade por outros meios (Tema 185, REsp 1.112.557). Detalhe em `base-bpc-renda-per-capita-miserabilidade`.

**Renda na DER.** Para concessão, o INSS considera apenas a renda identificada na data do requerimento (Portaria 34/2025, art. 11, §2º). Indeferimento com base em renda anterior viola a norma.

**Padrão médio.** Admitido apenas para conceder ou manter o benefício (art. 13, §7º). Nos demais casos a avaliação social por assistente social é obrigatória; indeferimento com padrão médio contraria a própria portaria.

**Doença controlada.** O controle medicamentoso não afasta o impedimento de longo prazo, sobretudo em HIV/AIDS, transtornos psiquiátricos, epilepsia e doenças autoimunes.

**Acumulação.** Vedada com outro benefício da seguridade social, salvo assistência médica, pensão especial de natureza indenizatória e as transferências de renda do art. 6º, parágrafo único, e do art. 203, VI, da CF e da Lei 10.835/2004 (art. 20, §4º, da LOAS). BPC de outro membro fica fora da renda (art. 20, §14, LOAS; Portaria 34/2025, art. 8º, I, "d").

**Auxílio-inclusão.** Constatada atividade remunerada da pessoa com deficiência, o INSS concede o auxílio-inclusão de ofício, se atendidos os requisitos do art. 26-A da LOAS (art. 26-B, §2º; Portaria 34/2025, art. 31, §1º, I); não sendo possível, suspende o BPC em caráter especial (art. 21-A da LOAS).

**Barreiras.** Laudo restrito ao corpo descumpre o modelo biopsicossocial (Lei 13.146/2015, art. 2º, §1º) e o art. 7º, §1º, da Portaria 2/2015, na redação da Portaria 37/2026.

## Transtorno do Espectro Autista no BPC

### Equiparação legal

A pessoa com TEA é considerada pessoa com deficiência para todos os efeitos legais (Lei 12.764/2012, art. 1º, §2º; regulamento no Decreto 8.368/2014). A Convenção sobre os Direitos das Pessoas com Deficiência tem estatura de emenda constitucional (Decreto Legislativo 186/2008 e Decreto 6.949/2009). A Lei 13.977/2020 criou a Carteira de Identificação da Pessoa com TEA (CIPTEA). A Lei 14.626/2023 assegurou atendimento prioritário à pessoa com TEA (Lei 10.048/2000).

Para o BPC, o diagnóstico não dispensa a prova do impedimento de longo prazo e de seu impacto: Tema 376/TNU, "o diagnóstico de Transtorno do Espectro Autista (TEA) não dispensa a avaliação biopsicossocial para a caracterização da condição de Pessoa com Deficiência para fins de BPC/LOAS". Instruir sempre com documentação funcional, e não apenas com a CIPTEA.

### CID-10 e CID-11

A CID-10 permanece em uso no Brasil até a implantação sistêmica da CID-11; exigência prematura de codificação CID-11 pelo INSS não tem base. Data e ato formal de transição: Não localizado em fonte oficial (há apenas nota técnica do Ministério da Saúde citada em fontes secundárias).

Na CID-11, F84.0, F84.1, F84.5, F84.8 e F84.9 correspondem ao código 6A02, com especificadores de deficiência intelectual e de linguagem funcional (6A02.0 a 6A02.5, 6A02.Y e 6A02.Z). A síndrome de Rett (F84.2) passou a LD90.4.

Os níveis de suporte 1, 2 e 3 são especificadores do DSM-5-TR (Associação Americana de Psiquiatria), não da CID-11. Recomendar ao médico assistente registrar separadamente o subcódigo CID e o nível de suporte do DSM-5-TR, com descrição funcional por domínio.

### Comorbidades

As comorbidades frequentes (deficiência intelectual, TDAH, ansiedade, epilepsia, distúrbios do sono) acrescentam impedimentos que devem ser pontuados em domínios próprios. Em peça, citar percentuais apenas com a fonte primária lida (metanálise ou vigilância oficial); material de divulgação não fundamenta argumento processual. Avaliação que ignora comorbidades documentadas subavalia b1 e os domínios correspondentes de Atividades e Participação.

### Impedimento permanente e dispensa de reavaliação

O TEA é condição neurodesenvolvimental vitalícia. O requisito de 2 anos (art. 20, §10, LOAS; Tema 173/TNU) está atendido pela natureza do quadro, e impedimento de longo prazo não se confunde com incapacidade laboral. O relatório médico deve registrar que o impedimento é permanente, irreversível e irrecuperável, nos termos do art. 7º, §2º, da Portaria 2/2015, para a dispensa do art. 21, §5º, da LOAS.

### Domínios tipicamente afetados

- **Funções do Corpo.** b1 (funções mentais globais e específicas: atenção, memória, emoção, percepção, cognição superior, linguagem); b2 em alterações sensoriais; epilepsia associada agrava b1 e sustenta prognóstico desfavorável.
- **Atividades e Participação, perito.** d1 (sobretudo com deficiência intelectual ou prejuízo de linguagem), d3 (nuclear em 6A02.2 a 6A02.5), d5 (suporte intenso).
- **Atividades e Participação, assistente social.** d7 (nuclear), d8, d9 e d6.
- **Fatores Ambientais.** e3 (dependência do cuidador), e4 (barreiras atitudinais), e5 (acesso a terapias, atendimento educacional especializado, mediador).

### Gatilhos no TEA

Agravante de Estrutura: acionável quando há achado estrutural documentado (neuroimagem, EEG alterado, síndrome genética associada), com indicação de "sistema nervoso". Prognóstico Desfavorável: a natureza vitalícia do quadro, sobretudo com comorbidades, sustenta a resposta "Sim"; resposta "Não" exige fundamentação, cuja ausência é impugnável.

### Documentação na transição

CIPTEA; relatório médico com CID-10 (F84.x) e, quando possível, CID-11 (6A02.x), nível de suporte do DSM-5-TR e descrição funcional por domínio; relatórios de fonoaudiologia, terapia ocupacional, psicologia, neuropsicologia e psicopedagogia; relatórios escolares (plano educacional individualizado, atendimento educacional especializado, mediador); declarações do CRAS ou CREAS.

### Jurisprudência aplicável

Tema 27/STF; Tema 312/STF; Tema 185/STJ. Súmula 79/TNU: comprovação das condições socioeconômicas por laudo de assistente social, auto de constatação ou, inviabilizados esses meios, prova testemunhal. Súmula 80/TNU: necessidade de avaliação social por assistente social ou outras providências aptas a revelar a condição vivida no meio social. Tema 173/TNU (impedimento mínimo de 2 anos). Tema 299/TNU (menor de 16 anos). Tema 376/TNU (TEA exige avaliação biopsicossocial). TRF3, ApCiv 5000875-90.2025.4.03.6141 (7ª Turma, j. 07/11/2025), sobre negativa genérica de que autismo não seria deficiência [NÃO CONFIRMADO]. Precedente vinculante sobre efeito da migração CID-10 para CID-11 em direito já constituído: Não localizado; sustentar com o art. 5º, XXXVI, da CF e o art. 6º da LINDB.

## Estrutura do relatório

Relatório formal em .docx no padrão do escritório (`base-peticao-previdenciaria-padrao-visual`). Título: "ANÁLISE TÉCNICA – BPC/LOAS – AVALIAÇÃO BIOPSICOSSOCIAL (Portaria 2/2015)", seguido de identificação do requerente, NB, tipo de impedimento e data da avaliação.

1. Síntese do caso.
2. Renda e grupo familiar (composição, renda bruta, exclusões do art. 8º, I, deduções do art. 8º, §4º, renda per capita, enquadramento ou flexibilização).
3. Qualificadores domínio a domínio (atividades aplicáveis, pontuação de cada profissional ou padrão médio, avaliação crítica).
4. Gatilhos e quesitos do art. 7º.
5. Classificação (qualificadores com e sem elevação; resultado da TCQ; divergência com o INSS demonstrada).
6. Confronto com a documentação médica.
7. Conclusão e estratégia (requerimento, recurso ao CRPS, ação judicial no JEF ou na Vara Federal conforme o valor da causa, impugnação da avaliação, nova avaliação, tutela de urgência, perícia judicial).
8. Quesitos para perícia judicial sobre cada domínio controvertido, os gatilhos e a coerência com a documentação.

## Extensão

Parecer de até 2 páginas, veredito na primeira linha, domínio a domínio apenas onde houver ponto controvertido. Antes de escrever, nomear em uma frase o ponto que decide. Regra 10 do protocolo e `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Skills complementares

- `base-bpc-loas-requisitos`. Requisitos estruturais, Decreto 12.534/2025 e Tema 385/TNU.
- `bpc-renda-grupo-familiar`. Grupo familiar, exclusões, deduções, irrepetibilidade, herdeiros, auxílio-inclusão e Decreto 12.534/2025 (Bolsa Família na renda).
- `base-bpc-renda-per-capita-miserabilidade`. Critério judicial de miserabilidade.
- `base-bpc-comprometimento-renda`. Deduções de gastos (Anexo I da Portaria 34/2025).
- `base-bpc-impedimento-longo-prazo`. Impedimento de longo prazo e Portaria 37/2026.
- `base-pcd-fibromialgia-lei15176`. Fibromialgia.
- `deficiencia-auditiva-previdenciaria`. Deficiência auditiva.
- `base-aposentadoria-pcd-lc142`. Redirecionamento para aposentadoria PCD.
- `direitos-pcd-previdenciarios`. Direitos extraprevidenciários da PCD.
- `base-modelo-relatorio-medico-bpc-loas-deficiente`. Relatório do médico assistente.

## Lei Brasileira de Inclusão como fundamento obrigatório

Acionar sempre `base-lbi-inclusao-barreiras-lei13146`. Pela Lei 13.146/2015, art. 2º, pessoa com deficiência é a que tem impedimento de longo prazo que, em interação com uma ou mais barreiras, pode obstruir a participação plena e efetiva em igualdade de condições. Sem barreira demonstrada, o caso se reduz a diagnóstico.

Percorrer as seis barreiras do art. 3º, IV (urbanísticas, arquitetônicas, nos transportes, nas comunicações e na informação, atitudinais e tecnológicas), registrando a existente com fato concreto e documento por ID. Cobrar os quatro incisos do art. 2º, §1º: impedimentos nas funções e estruturas do corpo; fatores socioambientais, psicológicos e pessoais; limitação no desempenho de atividades; restrição de participação. O conceito tem base convencional com estatura de emenda constitucional, o que impede ato infralegal de restringi-lo.

## Médicos conferentes

O médico da área traduz a condição clínica para os domínios da Portaria 2/2015 e para os gatilhos. Despachar com os documentos antes de fechar a análise.

| Se os documentos tratarem de | Despachar ao agente |
|---|---|
| Coluna, lombar, cervical, hérnia de disco, ciática, estenose, artrodese, CID M40 a M54 | `base-conhecimento-inss:medico-coluna` |
| Joelho, menisco, ligamento cruzado, artrose de joelho, prótese, quadril, tornozelo, fascite plantar | `base-conhecimento-inss:medico-membro-inferior` |
| Ombro, manguito rotador, supraespinhal, bursite, capsulite, CID M75 | `base-conhecimento-inss:medico-ombro` |
| Punho, mão, dedo, amputação, túnel do carpo, tenossinovite, epicondilite, LER e DORT | `base-conhecimento-inss:medico-membro-superior` |
| Depressão, ansiedade, bipolar, esquizofrenia, TEPT, burnout, CAPS, CID F20 a F48 | `base-conhecimento-inss:medico-psiquiatra` |
| Fibromialgia, artrite reumatoide, lúpus, espondilite, artrose difusa, osteoporose | `base-conhecimento-inss:medico-reumatologista` |
| Visão monocular, cegueira, glaucoma, retinopatia, surdez, audiometria, PAIR, implante coclear | `base-conhecimento-inss:medico-sensorial` |
| Câncer, infarto, insuficiência cardíaca, AVC, epilepsia, Parkinson, DPOC, insuficiência renal, HIV | `base-conhecimento-inss:medico-doencas-graves` |

Até três agentes, os das áreas que decidem o caso. Pareceres de uma página, em linguagem simples, incorporados à análise domínio a domínio e aos gatilhos. O parecer médico é instrumento interno: orienta a peça e os quesitos e não vai aos autos como prova.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Juízo de Catanduva

O juízo confere a renda de cada integrante no CNIS e no sistema do INSS, presume renda de quem recolhe como contribuinte individual e julga prejudicada a análise econômica quando o laudo afasta o impedimento. A peça traz a composição exata do grupo familiar do art. 20, §1º, da LOAS, quem fica fora dele e as despesas extraordinárias quantificadas e documentadas. Blocos literais em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`, seção BPC.
