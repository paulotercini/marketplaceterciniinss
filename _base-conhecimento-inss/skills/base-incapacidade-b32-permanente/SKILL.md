---
name: base-incapacidade-b32-permanente
description: "Aposentadoria por incapacidade permanente B32 pós EC 103/2019, ótica pró-segurado. Use SEMPRE que mencionar B32, aposentadoria por invalidez, arts. 42 a 47 Lei 8.213, acréscimo 25% grande invalidez, art. 42 §2º doença preexistente, conversão B31 em B32, prognóstico desfavorável, laudo B32, RMI B32 60% mais 2% excedente, RMI B92 acidentária 100%, art. 26 §2º III e §3º II EC 103, Tema 1095 STF, Tema 982 STJ superado, Súmula 47 TNU, Tema 272 TNU, isenção de reavaliação art. 101, assistência permanente, insuscetibilidade reabilitação, reavaliação periódica, MP 739/2016, Programa Revisão, Portaria Conjunta 14/2026, análise documental B32, Portaria 991/2022 (reconhecimento), Portaria 992/2022 (manutenção). Cruza com auditoria-laudo-pericial, analise-documental-incapacidade, peticao-previdenciaria, base-incapacidade-b31-temporaria, base-incapacidade-acidentaria-b92, ntep-nexo-acidentario, base-calculo-rmi-ec103 e orientacao-cliente-pericia."
---

# Aposentadoria por incapacidade permanente (B32) após a EC 103/2019

Convenção de espécies (códigos INSS): B31 auxílio por incapacidade temporária previdenciário; B91 acidentário; B32 aposentadoria por incapacidade permanente previdenciária; B92 acidentária; B94 auxílio-acidente.

## Escopo

Concessão, cálculo, acréscimo de 25%, reavaliação e cessação do B32. Cenários em `references/FUNDAMENTOS-E-CENARIOS.md`; precedentes e refutações em `references/JURISPRUDENCIA-E-REFUTACAO.md`. B92 em `base-incapacidade-acidentaria-b92`.

## Requisitos

1. Qualidade de segurado na DII (`periodo-graca-qualidade-segurado`).
2. Carência de 12 contribuições, salvo as dispensas do art. 26, II (ver `base-incapacidade-b31-temporaria`).
3. Incapacidade total e permanente, com insuscetibilidade de reabilitação para atividade que garanta a subsistência (Lei 8.213/91, art. 42).
4. Incapacidade não preexistente à filiação, salvo progressão ou agravamento (art. 42, §2º).

Incapacidade parcial com condições pessoais desfavoráveis (idade, escolaridade, histórico profissional) sustenta o B32 (Súmula 47 TNU). Recuperação que dependa de cirurgia não autoriza, por si, o B32: verificar a viabilidade de reabilitação (Tema 272 TNU).

## DIB e RMI

- DIB: dia seguinte à cessação do B31; sem B31, 16º dia do afastamento (empregado) ou DII (demais), ou DER se decorridos mais de 30 dias (art. 43, §1º).
- RMI previdenciária, fato gerador desde 14/11/2019: 60% da média, mais 2% por ano de contribuição acima de 20 anos (homem) ou 15 anos (mulher) (EC 103/2019, art. 26, §2º, III, e §5º).
- RMI acidentária (B92): 100% da média (art. 26, §3º, II). A diferença justifica investigar sempre o nexo (`ntep-nexo-acidentario`).
- Fato gerador até 13/11/2019: 100% do salário de benefício (Lei 8.213/91, art. 44). Conversão de B31 sem retorno ao trabalho: Súmula 557 STJ.

## Acréscimo de 25%

Devido ao aposentado por incapacidade permanente que necessite de assistência permanente de outra pessoa, ainda que ultrapasse o teto (art. 45). O Anexo I do Decreto 3.048/99 é exemplificativo. Pedir expressamente, com laudo e, se possível, relatório social. Não se estende a outras aposentadorias (Tema 1095 STF, RE 1.221.446, que superou o Tema 982 STJ).

## Reavaliação e cessação

- O aposentado pode ser convocado a reavaliação (art. 101). Isentos, se não retornaram à atividade: maiores de 60 anos, ou de 55 anos com 15 anos de benefício contados da concessão do B32 ou do B31 que o precedeu (art. 101, §1º, na redação da Lei 15.157/2025, observados os §§4º a 6º do art. 43; conferir na fonte oficial a vigência do inciso I, afetado pela MP 871/2019). A isenção não alcança o exame para o acréscimo de 25% ou a pedido do aposentado (§2º).
- Recuperação da capacidade gera mensalidades de recuperação, com redução gradual (art. 47). O retorno voluntário à atividade cancela o benefício (art. 46).
- Cessação sem exame específico ou sem recuperação demonstrada: restabelecimento direto em juízo (Tema 350 STF) com tutela de urgência.

## Estratégia

1. Laudo especializado com diagnóstico, evolução, prognóstico e impossibilidade de reabilitação.
2. B31 que se prolonga com prognóstico desfavorável: pedir a conversão em B32, com DIB na data da incapacidade permanente provada.
3. Reabilitação inviável atestada no próprio programa: conversão em B32 (art. 62, §1º).
4. Doença preexistente: demonstrar agravamento posterior à filiação (art. 42, §2º); se o trabalho contribuiu, concausa (art. 21, I) e B92.
5. No JEF, incapacidade parcial: Súmula 47 TNU; implantação por tutela de urgência (CPC, art. 300; Lei 10.259/2001, art. 4º).

## Fungibilidade aplicável

Acionar `base-fungibilidade-previdenciaria` (REsp 2.246.096/MG, Tema 217 TNU, Tema 1018 STJ, Tema 995 STJ, vedação à conversão prejudicial).

## Hub de portarias administrativas

Portarias DIRBEN/INSS 991/2022 e 992/2022: `base-portarias-dpmf-inss-hub`. A Portaria Conjunta MPS/INSS 14/2026 amplia de 30 para 90 dias a duração do B31 por análise documental (prorrogada pela Portaria Conjunta 43/2026); não regula o B32 (`analise-documental-incapacidade`).

## Redação da peça

Seguir o bloco "Aposentadoria por incapacidade permanente" de `peticao-previdenciaria/references/REDACAO-POR-ESPECIE.md`. Validação formal do relatório médico: `base-validacao-formal-laudo-medico-checklist-ab`. Acumulação com pensão por morte (EC 103/2019, art. 24): `base-acumulacao-beneficios-ec103-art24`. Segurado especial: `base-segurado-especial-autodeclaracao-arts-92-93-94`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Peça: `peticao-previdenciaria`. B31: `base-incapacidade-b31-temporaria`. Acidentário: `ntep-nexo-acidentario` e `base-incapacidade-acidentaria-b92`. RMI: `base-calculo-rmi-ec103`. Laudo: `auditoria-laudo-pericial`. Análise documental: `analise-documental-incapacidade`. Perícia: `orientacao-cliente-pericia` e `base-pericia-medica-federal-telepericia`. B94: `base-auxilio-acidente-b94-pos-reforma`.

## Médicos conferentes

No B32 o que decide é a insuscetibilidade de reabilitação, e essa conclusão depende de prognóstico clínico. Despachar o médico da área com os documentos antes de fechar a tese.

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

Havendo mais de uma área nos documentos, despachar até três agentes, os das áreas que decidem o caso. Os pareceres voltam em uma página cada, em linguagem simples, e o que eles apontarem entra no prognóstico, na análise de reabilitação e no acréscimo de 25% quando houver necessidade de terceiro.

O parecer médico é instrumento interno. Orienta a peça, os quesitos e o pedido ao médico assistente, e não vai aos autos como prova nem substitui laudo de assistente nem assistente técnico habilitado.

## Juízo de Catanduva

O juízo concede a incapacidade permanente apenas quando o laudo pericial a afirma e confere a qualidade de segurado na DII fixada pelo perito. O acréscimo de 25% depende de quesito específico sobre a assistência permanente de terceiro. Quando o perito separa a DII da data da incapacidade permanente, a sentença deve ser conferida, porque o corpus traz caso em que a DIB seguiu a data mais tardia. Blocos literais em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`.
