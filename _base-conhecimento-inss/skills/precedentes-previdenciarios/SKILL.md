---
name: precedentes-previdenciarios
description: Skill de precedentes vinculantes previdenciários (STJ, STF, TNU). Use SEMPRE que redigir petição, recurso, embargos, agravo, mandado de segurança ou peça processual previdenciária. Use SEMPRE que auditar sentença, acórdão, decisão administrativa ou laudo pericial. Use SEMPRE que mencionar tema repetitivo, repercussão geral, tema TNU, precedente vinculante, tese firmada, recurso sobrestado, suspensão nacional, PEDILEF, REsp repetitivo ou jurisprudência vinculante previdenciária. Use quando as skills peticao-previdenciaria, base-auditoria-adversarial-decisao-judicial, auditoria-laudo-pericial, analise-bpc-loas, aposentadoria-deficiencia ou qualquer skill previdenciária do escritório for acionada. Fonte primária de fundamentação jurisprudencial. Consultar ANTES de redigir fundamento jurídico em peça previdenciária.
---

# Precedentes vinculantes previdenciários

## Função

Guia de uso estratégico dos precedentes vinculantes e qualificados (STF, STJ, TNU) no caso concreto, em postura pró-segurado. O texto literal das teses está no catálogo `base-precedentes-catalogo-vinculantes` (`references/CATALOGO-TEMAS-STF.md`, `CATALOGO-TEMAS-STJ.md`, `CATALOGO-TEMAS-TNU.md` e `CATALOGO-ENUNCIADOS-CRPS.md`), e a situação de cada tema em `references/ATUALIZACAO-STATUS-2026-06.md` daquela skill. Esta skill não tem arquivos de referência próprios.

Precedente novo se pesquisa na forma de `pesquisa-jurisprudencia-chrome`. Precedente não aberto na fonte oficial entra como [NÃO CONFIRMADO].

## Instruções de uso

### Ao redigir petição

1. Identificar o eixo temático do caso.
2. Abrir o catálogo e conferir a tese literal e a situação de cada tema.
3. Verificar tema afetado com suspensão nacional que possa sobrestar o processo.
4. Incorporar os temas favoráveis ao segurado.
5. Antecipar e distinguir os temas que o INSS pode invocar.

### Ao auditar sentença ou acórdão

1. Verificar se a decisão contraria tema vinculante; se contrariar, fundamentar o recurso na violação do precedente qualificado (art. 927 do CPC).
2. Verificar se a matéria está sobrestada.
3. Usar os temas do STF sem repercussão geral (matéria infraconstitucional, como o Tema 1362/STF) para barrar RE do INSS.

### Ao auditar laudo pericial

Para incapacidade e BPC/LOAS, verificar se o laudo adota critério contrário a tese vinculante (por exemplo, Tema 173/TNU sobre impedimento de longo prazo e Temas 376 e 378/TNU sobre avaliação biopsicossocial).

### Ao analisar BPC/LOAS

Temas aplicáveis em conjunto: Tema 185/STJ (renda per capita não é a única prova), Tema 27/STF (critério de 1/4 do salário mínimo), Tema 312/STF (art. 34 do Estatuto do Idoso), Tema 640/STJ (exclusão analógica do benefício de idoso da renda per capita) e Temas 34, 70, 122, 173 e 187 da TNU.

### No processo administrativo (CRPS)

Precedente judicial serve de fundamento do recurso administrativo, e o enunciado do CRPS vincula as Juntas e Câmaras (art. 124 do Regimento Interno do CRPS, conferível por `regimento_inss_crps`). O dispositivo da Portaria MPS que admite o precedente judicial como fundamento [NÃO CONFIRMADO] deve ser conferido antes de citado.

## Remissões cruzadas frequentes

Estas são as conexões mais importantes entre temas de diferentes tribunais

### Decadência e prescrição
- Temas STJ 214, 544, 645, 966, 975 ↔ Tema STF 313 ↔ Temas TNU 120, 134 e 375 (o Tema 130/TNU foi cancelado no julgamento do Tema 375)

### BPC/LOAS renda per capita
- Tema STJ 185 ↔ Temas STF 27, 312 ↔ Tema TNU 122

### Auxílio-reclusão critério de renda
- Tema STJ 896 ↔ Temas STF 89, 1017 ↔ Temas TNU 31, 169, 310

### Cumulação auxílio-acidente com aposentadoria
- Temas STJ 555, 556 ↔ Tema STF 599 ↔ Tema TNU 85

### Interesse de agir, requerimento apto e fixação de DIB
- Tema STJ 1124 (acórdão publicado em 06/11/2025, embargos julgados em 09/09/2026) ↔ Tema STF 350 ↔ Tema STJ 995 (reafirmação da DER). Defesa contra a aplicação de ofício em `base-efeito-translativo-tema-1124-defesa`

### Requerimento administrativo prévio
- Tema STJ 660 ↔ Tema STF 350 ↔ Tema TNU 10

### Prova de atividade rural
- Temas STJ 297, 554, 638 ↔ Temas TNU 2, 3, 37, 153

### Segurado especial × contribuinte individual rural. fronteira de enquadramento
- Tema STJ 1115 (REsp 1.947.404/RS, Primeira Seção, Rel. Min. Benedito Gonçalves, j. 23/11/2022), área superior a 4 módulos fiscais, por si só, NÃO descaracteriza o segurado especial. Alinhado à Súmula 30/TNU. Impacto direto na definição de enquadramento como CI rural (art. 90, I, IN 128/2022) versus segurado especial (art. 11, VII, Lei 8.213/91). Acionar skills `segurado-especial-rural` e `contribuinte-individual-in128`.

### Período de graça e qualidade de segurado
- Tema STJ 1352 (afetado) e Tema STJ 1360 (trânsito em julgado; o registro no MTE pode ser suprido por outros meios de prova, mas a mera ausência de anotação na CTPS ou no CNIS não basta) ↔ Temas TNU 239, 245, 255, 348, 349, 365 ↔ Tema STF 1421 ↔ Súmula 27 TNU

### EPI e atividade especial
- Tema STJ 1090 ↔ Tema STF 555 ↔ Temas TNU 188, 213

### Vigilante atividade especial
- Tema STF 1209 (adverso, j. 18/02/2026: vigilante não tem atividade especial) ↔ Tema STJ 1031 (sobrestado, não citar como vigente) ↔ Temas TNU 87 e 282 (conferir o alcance diante do Tema 1209/STF)

### Ruído limite de tolerância e metodologia
- Tema STJ 694 ↔ Tema STJ 1083 ↔ Temas TNU 174 e 317 (o Tema 58/TNU está superado)

**Detalhamento operacional para auditoria de PPP e petições de aposentadoria especial por ruído**

O Tema 1083/STJ (REsp 1.886.795/RS, 1ª Seção, Rel. Min. Gurgel de Faria, j. 18/11/2021, trânsito 13/08/2022) fixou que o NEN (Nível de Exposição Normalizado) é o parâmetro obrigatório para aferição do ruído quando constatados diferentes níveis sonoros. Na ausência do NEN, admite-se o nível máximo (pico) com perícia judicial que comprove habitualidade e permanência.

O Tema 174/TNU (PEDILEF 0505614-83.2017.4.05.8300/PE, j. 21/11/2018, trânsito 08/05/2019) estabeleceu que, a partir de 19/11/2003, é obrigatória a utilização das metodologias da NHO-01 da Fundacentro ou da NR-15, vedada a medição pontual. Aceita NHO-01 ou NR-15 como alternativas.

O Tema 317/TNU (julgado 18/09/2025, após anulação do julgamento anterior) fixou posição mais restritiva. A mera menção a "dosimetria" ou "dosímetro" no PPP não é suficiente para presumir observância da NHO-01 ou da NR-15. Exige-se indicação expressa da norma utilizada no PPP ou no LTCAT.

**Conexão com a skill auditoria-ppp.** Esses três temas fundamentam a verificação obrigatória de metodologia na auditoria de PPP (eixo 3 do SKILL.md e itens C4.1, C4.1.1 e C4.1.2 do CHECKLIST.md da skill auditoria-ppp). A normalização do NEN pela jornada efetiva (NEN = NE + 10 × log₁₀(TE/480), fórmula da NHO-01 item 5.1.2) é a tese aplicável quando o LAVG está entre 82 e 85 dB(A) e a jornada excede 480 minutos, incluindo horas extras habituais comprovadas por contracheques.

### Reafirmação da DER
- Tema STJ 995 (julgado 22/10/2019, trânsito 29/10/2020) ↔ Tema STF 334 (direito ao melhor benefício) ↔ Tema STJ 1124 (fixação de DIB conforme origem da prova)
- TNU. Tese consolidada (PUIL 5001623-70.2022.4.02.5005/ES, Rel. João Carlos Cabrelon de Oliveira, julgado em 04/12/2024), reafirmação da DER administrativa para melhor benefício, afastada equiparação com desaposentação (Tema 503/STF)
- TNU. Juros na reafirmação pré-ajuizamento (Processo 0003337-85.2017.4.03.6303, Rel. Giovani Bigolin, 25/06/2025), juros desde a citação
- TNU. 6 precedentes confirmando tese em 2025 (PUILs 5010957-87, 0504516-58, 5001603-94, 5011229-93, 0107628-06, Processo 0002826-46), além do PEDILEF 5053159-26, provido em 07/08/2024
- TRF3. ApelRemNec 5007016-49.2019.4.03.6105 (10ª Turma, Rel. Leila Paiva Morrison, 10/05/2023). MS, reafirmação administrativa para aposentadoria especial
- TRF4. AC 5011644-55.2019.4.04.7204/SC, reafirmação "obrigatória" para 95 pontos
- Para detalhamento completo dos cenários, efeitos financeiros e juros, consultar a skill `reafirmacao-der`

### Atividades concomitantes
- Tema STJ 1070

### Honorários advocatícios sucumbenciais. base de cálculo (Tema 1050) e Súmula 111
- Tema STJ 1050 (REsp 1.847.731/RS, 1.847.860/RS, 1.847.766/SC e 1.847.848/SC, 1ª Seção, Rel. Des. Federal Manoel Erhardt, convocado TRF5, j. 28/04/2021, DJe 05/05/2021, trânsito 30/11/2021), "O eventual pagamento de benefício previdenciário na via administrativa, seja ele total ou parcial, após a citação válida, não tem o condão de alterar a base de cálculo para os honorários advocatícios fixados na ação de conhecimento, que será composta pela totalidade dos valores devidos." Fundamento central na distinção entre proveito econômico (art. 85, §2º, CPC) e valor a ser executado, com base no princípio da causalidade. Pagamentos administrativos pós-citação são compensados apenas do crédito principal na liquidação, sem reduzir a base dos honorários.
- Súmula 111/STJ, "Os honorários advocatícios, nas ações previdenciárias, não incidem sobre as prestações vencidas após a sentença." Ratificada pelo Tema 1105/STJ (REsp 1.880.529/SP, 1ª Seção, Rel. Min. Sérgio Kukina, j. 15/03/2023), que confirmou vigência sob o CPC/2015. Define o termo final da base (sentença ou acórdão concessório), complementando o Tema 1050 que define a composição.
- Tema STJ 1105 (REsp 1.880.529/SP, 1ª Seção, Rel. Min. Sérgio Kukina, j. 15/03/2023), manutenção da Súmula 111 no CPC/2015
- Súmula 76/TRF4, quando sentença improcedente e acórdão concessório, termo final dos honorários é a data do acórdão (aplicável por analogia no TRF3)

**Divergência TRF4 × STJ sobre "citação válida" como marco**

O TRF4 desenvolveu a tese da citação como "marco qualitativo" (não temporal), servindo para angularizar a relação processual. Pagamentos administrativos de benefício diverso do pleiteado não reduziriam a base, mesmo que anteriores à citação. O STJ rejeitou expressamente essa leitura, mantendo a citação como marco temporal objetivo.

Precedentes TRF4 (leitura qualitativa, favorável ao advogado)
- AG 5025093-90.2021.4.04.0000 (6ª Turma, Rel. Des. Julio Guilherme Berezoski Schattschneider, 11/09/2021), origem da tese qualitativa
- AG 5046160-77.2022.4.04.0000 (9ª Turma, Rel. Des. Paulo Afonso Brum Vaz, j. 16/05/2023), citação como vocatio, finalidade de angularizar relação processual, referência não temporal mas qualitativa
- AG 5046190-15.2022.4.04.0000 (6ª Turma, Rel. Des. João Batista Pinto Silveira, 16/12/2022), distinguishing para benefício inacumulável preexistente, proveito econômico = diferença entre benefícios

Precedentes STJ (leitura temporal, restritiva)
- AgInt no REsp 2.088.158/PR (2ª Turma, Rel. Min. Francisco Falcão, j. 04/12/2023), vedação de inclusão de valores pré-citação na base
- AgInt no REsp 2.097.977/RS (2ª Turma, Rel. Min. Francisco Falcão, j. 26/02/2024), mesmo sentido, interpretação a contrario sensu do Tema 1050
- REsp 2.192.331/RS (2ª Turma, Rel. Min. Maria Thereza de Assis Moura, j. 10/12/2025), confirmação expressa de que citação = marco temporal objetivo, rejeitando tese qualitativa do TRF4

**Regra operacional.** No TRF3, adotar a posição conservadora do STJ (marco temporal) nos cálculos de execução. Reservar a tese qualitativa do TRF4 como argumento subsidiário. Consultar a skill `honorarios-contrato-previdenciario` para cálculo prático e interação com honorários contratuais.

### Compensação de benefício inacumulável em cumprimento de sentença
- Tema STJ 1207 (REsp 2.039.614, 1ª Seção, Rel. Min. Gurgel de Faria, j. 28/06/2024, trânsito fev/2025), compensação mês a mês, limitada ao valor do título judicial por competência, vedado saldo negativo, vedada execução invertida ou restituição indevida
- IRDR 14/TRF4 (5023872-14.2017.4.04.0000, 3ª Seção, Rel. Jorge Antonio Maurique, j. 28/05/2018, trânsito 17/11/2021), mesma tese do Tema 1.207, origem regional da tese com trânsito anterior
- Tema TNU 195 (PEDILEF 5068010-43.2016.4.04.7100, Rel. Isadora Segalla Afanasieff, j. 18/09/2020), compensação pelo total dos valores recebidos em período concomitante, vedado saldo negativo para o segurado
- RCIJEF 5001446-98.2024.4.04.7004 (3ª TR Paraná, Rel. João Batista Brito Osório, j. 14/04/2025), estende a vedação de saldo negativo também a benefícios concedidos administrativamente em que a compensação traga prejuízo ao segurado

### Adicional de 25%
- Tema STJ 982 superado pelo Tema STF 1095, que restringe o acréscimo à aposentadoria por incapacidade permanente

### Devolução de valores de tutela revogada
- Tema STJ 692 ↔ Tema STF 799
- AR 5020232-32.2019.4.04.0000 (TRF4, 3ª Seção, Rel. Roger Raupp Rios), balizas do Tema 692 para proteger o mínimo existencial. Desconto limitado a 30% do benefício ativo (item 3). Obrigação de ressarcir subsiste com base no art. 15, III, da Lei 8.213/91 (item 4). Liquidação nos próprios autos conforme art. 302, parágrafo único, do CPC (item 5). Preservação de montantes capazes de garantir dignidade do devedor e família, com manifestação prévia obrigatória antes de decisão sobre desconto, possibilidade de afastamento total da pretensão de devolução se demonstrada imprescindibilidade para subsistência digna (item 6). Impossibilidade absoluta de desconto quando benefício for de valor mínimo (item 7). Se não houver benefício ativo, aplicam-se regras gerais de impenhorabilidade.

### Gratuidade da justiça e critérios objetivos
- Tema STJ 1178 (Corte Especial, j. 17/09/2025, acórdão publicado em 18/03/2026, trânsito em julgado), vedação de indeferimento automático por critérios objetivos, presunção relativa da declaração de hipossuficiência, uso suplementar após procedimento do art. 99 §2º CPC

### Pensão por morte e menor sob guarda
- Tema STJ 732 ↔ Tema STF 1271 (mérito pendente)

### Aposentadoria por invalidez cálculo EC 103/2019
- Tema STF 1300 (adverso, j. 18/12/2025, trânsito em 18/04/2026) ↔ Tema TNU 318 (sobrestado, matéria resolvida pelo Tema 1300/STF)

### Acumulação de benefícios e redutor do art. 24 da EC 103/2019
- ADI 7051/STF (cálculo da pensão, art. 23) ↔ Tema 1300/STF (cálculo aposentadoria por invalidez, art. 26, § 2º, III) ↔ Tema 359/STF (teto sobre soma) ↔ Temas 377 e 384/STF (cada vínculo isolado em cargos acumuláveis) ↔ Tema 627/STF (cargos constitucionalmente acumuláveis fora da vedação do art. 11 da EC 20/98, uso por analogia) ↔ RE 1.510.285/DF AgR (redutor pós-óbito 13/11/2019)
- **Controvérsia na Primeira Turma do STF [NÃO CONFIRMADO].** Aplicação do redutor do art. 24 sobre aposentadoria anterior à reforma quando a pensão é posterior à EC 103/2019. Conferir os acórdãos no MCP `superiores` antes de citar.
- Súmula 359/STF (lei vigente ao tempo da reunião dos requisitos), base do direito adquirido. Detalhamento em `base-acumulacao-beneficios-ec103-art24`

### Contribuinte individual atividade especial
- Tema STJ 1291 (julgado 10/09/2025) ↔ Temas TNU 33, 188

### Auxílio-reclusão flexibilização renda
- Tema STJ 1162 (j. 12/11/2025, com modulação; RE pendente) ↔ Temas STJ 896, TNU 31, 169, 310

### Violência doméstica e afastamento remunerado
- Tema STF 1370 (julgado 16/12/2025)

### Contribuição única e divisor mínimo
- Tema TNU 353 (julgado 2025) ↔ Tema TNU 359

### Limbo previdenciário
- Tema STF 1421 (mérito pendente) ↔ Tema TNU 300 (o Tema 301/TNU trata de segurado especial e atividade urbana)

## Modulação de efeitos

- Tema STJ 1162: aplica-se às prisões ocorridas a partir de 27/11/2024, início do julgamento, sem devolução de valores pagos por decisões anteriores (tese conferida no MCP `superiores` em 28/11/2026).
- Tema STJ 692: tese revista com desconto limitado a 30% do benefício ativo; modulação [NÃO CONFIRMADO], conferir no acórdão da Pet 12.482.
- Tema STF 1209, Tema STF 1300 e Tema STF 1370: sem modulação de efeitos registrada no catálogo.

## Marcadores de situação

Sem marcador, tese firmada e vigente. **[SUSPENSO]**, suspensão nacional. **[EM JULGAMENTO]**, julgamento iniciado. **[AFETADO]** ou **[PENDENTE]**, aguardando julgamento. **[SOBRESTADO]**, aguardando tribunal superior. **[CANCELADO]**, verificar o tema substituto. **[SUPERADO]**, novo entendimento prevalece. **[SEM TESE]**, sem tese firmada.

## Temas pendentes de interesse (MCP superiores, 28/11/2026)

- Tema 1421/STF: limbo previdenciário e período de graça.
- Tema 1390/STF: aposentadoria compulsória do empregado público aos 75 anos (art. 201, § 16, da CF).
- Tema 1435/STF: licença-maternidade a um dos homens de união homoafetiva (caso de servidor municipal).
- Tema 382/TNU, julgado em 15/04/2026 contra o segurado (tolueno por via cutânea).

## Regra de ouro

Nenhuma peça previdenciária se finaliza sem a consulta aos precedentes aplicáveis. A omissão de precedente vinculante favorável é falha técnica, e a não antecipação de precedente contrário é risco processual.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
