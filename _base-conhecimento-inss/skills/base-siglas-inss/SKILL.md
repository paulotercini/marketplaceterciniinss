---
name: base-siglas-inss
description: Glossário consolidado das siglas, acrônimos e abreviações usadas no INSS, na Previdência Social e no contencioso previdenciário, com definições técnicas e contextualização pró-segurado. Use SEMPRE que mencionar sigla INSS, abreviação previdenciária, o que significa CNIS APS CAT DER DIB DCB DIP DAT DDB DEPEND DESDOBRADO DIC DID DII DN DO DRB FAP GEX GFIP GPS HRP HISCRE INFBEN JRPS MR NTEP NB NIT PAB PBC PCMSO PESCPF PESCRE PESNOM PI PIS PLENUS SISBEN PNS PR RGPS RMI REVSIT RPV SABI SMR CRPS CTC CTPS CPF CADPF CEI CONBAS CONCAL CONPRI CONREAJ COM-RMI CNPS RPC RPPS DARF DCTF GR RAC RAT SAT, glossário INSS, dicionário previdenciário, o que significa DER, o que é PBC, definição RMI, sigla DIP, conferir CNIS, leitura HISCRE, abreviação INFBEN, identificar sigla em laudo INSS, sigla CRPS, sigla PJe INSS. Acionar AUTOMATICAMENTE quando o cliente, o segurado ou o advogado precisar identificar significado de sigla em documento do INSS, decisão administrativa, sentença, acórdão, laudo pericial, CNIS, carta de concessão, comunicado de decisão, indeferimento, recurso, despacho administrativo. Cruza com cnis-acerto-indicadores, base-meu-inss-pat-gerid-fluxo, base-legislacao-fontes-primarias, peticao-previdenciaria, base-jef-previdenciario, base-jef-trf3-manual-2025. Postura exclusivamente pró-segurado. NÃO use para conceitos doutrinários complexos sem ligação com siglas (estes ficam nas skills temáticas específicas).
---

# Glossário Consolidado de Siglas do INSS, da Previdência Social e do Contencioso Previdenciário

## ATENÇÃO PRELIMINAR

Esta skill é o glossário operacional consolidado de siglas, acrônimos e abreviações usadas pelo INSS, pela Previdência Social, pelo CRPS, pelos tribunais e nas peças do contencioso previdenciário.

Fonte primária. Glossário do escritório Paulo Roberto Tercini Filho, consolidado a partir das normas vigentes (Lei 8.213/91, Decreto 3.048/99, IN 128/2022, Portarias DPMF/DIRBEN/INSS), Manual JEF TRF3, Manual TNU 10ª edição, jurisprudência catalogada e prática forense.

Objetivo. Permitir leitura técnica imediata de qualquer documento do INSS pelo advogado e tradução adequada ao cliente.

Postura pró-segurado exclusiva.

## 1 BLOCO A - CADASTROS E IDENTIFICAÇÃO

### CNIS - Cadastro Nacional de Informações Sociais

Banco de dados mantido pela DATAPREV e administrado pelo INSS. Contém vínculos empregatícios, salários-de-contribuição, contribuições previdenciárias, benefícios recebidos e indicadores. Acesso restrito (apenas servidor INSS, segurado, advogado com procuração e perito judicial autorizado). Base para concessão automática e revisão de benefícios. Cruzar com `cnis-acerto-indicadores`.

### CTPS - Carteira de Trabalho e Previdência Social

Documento de prova de vínculo empregatício. Tem presunção de veracidade (Súmula 12 TST). Atualmente, digital pelo eSocial, mas a versão física segue válida.

### CADPF - Cadastro da Pessoa Física

Base de dados do CPF mantida pela Receita Federal. Integrada ao CNIS para vinculação do trabalhador.

### CEI - Cadastro Específico do INSS

Cadastro de matrículas de empresas, obras e equiparados perante o INSS. Substituído gradualmente pelo CNPJ + CAEPF (Cadastro de Atividade Econômica da Pessoa Física).

### CAEPF - Cadastro de Atividade Econômica da Pessoa Física

Substituiu o CEI para pessoas físicas com atividade econômica. Vincula contribuinte individual a sua atividade.

### NIT - Número de Identificação do Trabalhador

Número único do trabalhador. Inicialmente diferente do PIS/PASEP, mas hoje pode coincidir. Identifica o segurado no CNIS.

### PIS - Programa de Integração Social

Número de inscrição do trabalhador da iniciativa privada. Também pode servir como NIT para fins previdenciários.

### PASEP - Programa de Formação do Patrimônio do Servidor Público

Análogo ao PIS para servidores públicos.

### NB - Número do Benefício

Identificação única do benefício previdenciário concedido pelo INSS. Formato típico de 10 dígitos (precedido da espécie B). Ex. 123.456.789-0.

## 2 BLOCO B - DATAS E MARCOS PROCESSUAIS

### DER - Data da Entrada do Requerimento

Data em que o segurado protocolou junto ao INSS o pedido de concessão de um benefício. Marco para fixação da DIB e para os efeitos financeiros (juros, prescrição quinquenal, atrasados).

### DIB - Data do Início do Benefício

Data efetiva de início do benefício. Normalmente coincide com a DER, mas há exceções (pensão por morte de menor com requerimento até 90 dias do óbito retroage à data do falecimento; revisão de DCB indevida; DIB anterior à DER por reafirmação - Tema 995 STJ).

### DIP - Data do Início do Pagamento

Data efetiva em que os valores mensais começam a ser depositados. Pode ser posterior à DIB. Diferença entre DIB e DIP gera os "atrasados".

### DCB - Data da Cessação do Benefício

Data em que o benefício foi cessado pelo INSS. Pode ocorrer por alta médica, óbito, maioridade (pensão), revisão administrativa ou irregularidade. Cessação indevida é objeto de impugnação.

### DAT - Data do Afastamento do Trabalho

Data a partir da qual o segurado não exerce mais atividade laborativa. Importante para a verificação da qualidade de segurado e do período de graça.

### DDB - Data do Despacho do Benefício

Data em que o INSS profere o despacho concessório ou denegatório do benefício.

### DIC - Data do Início das Contribuições

Primeira contribuição registrada no CNIS. Marco para análise de tempo de contribuição.

### DID - Data do Início da Doença

Data a partir da qual o segurado é diagnosticado com a moléstia. CRÍTICA na aposentadoria PCD da LC 142/2013 e em pensão por morte por doença preexistente.

### DII - Data do Início da Incapacidade

Data a partir da qual o segurado se torna incapacitado para o trabalho. CRÍTICA para verificar qualidade de segurado em B31 e B91 (Súmula 11 TRU 3 - Skill `base-tru-trf3-sumulas-jurisprudencia`).

### DN - Data de Nascimento

### DO - Data do Óbito

Marco em pensão por morte para retroação da DIB conforme art. 74 Lei 8.213/91.

### DRB - Data da Regularização do Benefício

Data em que o INSS regulariza administrativamente o benefício.

### DPL - Data do Pagamento

### DPR - Data do Protocolo do Recurso

Marco para verificar tempestividade do recurso administrativo ao CRPS.

### DUC - Data da Última Contribuição

Marco para verificar período de graça e qualidade de segurado.

## 3 BLOCO C - CÁLCULO E SALÁRIOS

### RMI - Renda Mensal Inicial

Valor inicial do benefício na DIB, após aplicados o fator previdenciário, o coeficiente de cálculo e os redutores aplicáveis. Não coincide necessariamente com o salário-de-benefício. Cruzar com `base-calculo-rmi-ec103`.

### SB - Salário-de-Benefício

Média aritmética dos salários-de-contribuição corrigidos do PBC. Base para o cálculo da RMI.

### SC - Salário-de-Contribuição

Valor base sobre o qual incide o desconto da contribuição previdenciária do segurado. Limitado pelo teto do RGPS. Cruzar com `base-salario-contribuicao-limites`.

### PBC - Período Básico de Cálculo

Intervalo no qual são apurados os salários-de-contribuição do segurado para o cálculo do benefício. Após Lei 9.876/1999, todo o período desde 07/1994. Antes, os últimos 36 salários-de-contribuição em até 48 meses. Cruzar com `base-revisao-vida-toda-rvt`.

### MR - Mensalidade Reajustada

Valor atual do benefício após reajustes anuais, sem descontos (IR, consignações, empréstimos) nem acréscimos (salário-família, devolução CPMF).

### SMR - Salário Mínimo de Referência

Piso de cálculo previdenciário usado em determinadas situações.

### SM - Salário Mínimo

Marco constitucional do piso de benefícios previdenciários (art. 201 §2º CF).

### PNS - Piso Nacional de Salários

Instituído pelo art. 1º do Decreto-lei 2.351/1987 e extinto pelo art. 5º da Lei 7.789/1989. Súmula 15 TRF4 trata da questão.

### TETO - Teto do RGPS

Valor máximo de salário-de-contribuição e de benefício no RGPS. Reajustado anualmente.

## 4 BLOCO D - ÓRGÃOS, CONSELHOS E AUTORIDADES

### INSS - Instituto Nacional do Seguro Social

Autarquia federal responsável pela operacionalização do RGPS. Sucessor do INPS-IAPAS desde 1990.

### MPS - Ministério da Previdência Social

Pasta governamental responsável pela política previdenciária. Em 2025/2026 está vinculado ao governo federal como pasta autônoma.

### CRPS - Conselho de Recursos da Previdência Social

Órgão recursal administrativo do INSS. Estrutura. Juntas de Recursos (1ª instância recursal), Câmaras de Julgamento (2ª instância recursal) e Conselho Pleno (instância de uniformização). Cruzar com `base-crps-panorama-geral`.

### JRPS - Junta de Recursos da Previdência Social

Primeira instância do CRPS. Aprecia recurso ordinário em face de decisão denegatória do INSS.

### CAJ - Câmara de Julgamento

Segunda instância do CRPS. Aprecia recurso especial em face de acórdão da JR. Cruzar com `recursos-superiores-crps`.

### CP - Conselho Pleno

Última instância do CRPS, com função de uniformização.

### CNPS - Conselho Nacional de Previdência Social

Órgão de deliberação política sobre o RGPS. Composição tripartite (Governo, empregadores, trabalhadores).

### PFE/INSS - Procuradoria Federal Especializada junto ao INSS

Representação jurídica do INSS perante o Judiciário. Cruzar com `base-pfe-inss-anpd-dpu-conade`.

### APS - Agência da Previdência Social

Unidade de atendimento presencial do INSS.

### GEX - Gerência Executiva

Estrutura territorial do INSS que agrupa diversas APS sob comando único. Em São Paulo há GEX Sul, Norte, Leste, Oeste, ABC, Vale do Paraíba e outras.

### CEAB - Central Especializada de Análise de Benefícios

Estrutura nacional do INSS para análise concentrada de determinados benefícios. CEAB-DJ é a Central de Análise para cumprimento de Decisões Judiciais. Cruzar com `ms-competencia-autoridade-coatora`.

### CECALC - Central de Cálculos

Unidade do INSS responsável por cálculos de RMI e revisão.

### DATAPREV - Empresa de Tecnologia e Informações da Previdência Social

Empresa pública federal que opera os sistemas do INSS (CNIS, SISBEN, SABI, PLENUS, GERID, PAT).

## 5 BLOCO E - BENEFÍCIOS E ESPÉCIES

### B21 - Pensão por Morte

Espécie 21 = pensão por morte previdenciária urbana ou rural. Cruzar com `pensao-por-morte`.

### B31 - Auxílio por Incapacidade Temporária (antigo Auxílio-Doença)

Benefício temporário por incapacidade laboral.

### B91 - Aposentadoria por Incapacidade Permanente (antiga Aposentadoria por Invalidez)

Benefício permanente por incapacidade laboral total.

### B92 - Aposentadoria por Incapacidade Permanente Acidentária

B91 acidentário. Competência da Justiça Estadual.

### B94 - Auxílio-Acidente

Benefício indenizatório por sequela de acidente. Competência da Justiça Estadual. Cruzar com `auxilio-acidente-b94` e `base-auxilio-acidente-b94-pos-reforma`.

### B41/B42 - Aposentadorias por Idade (Urbana / Rural)

### B45 - Aposentadoria por Idade do Trabalhador Rural

### B46 - Aposentadoria por Idade do Trabalhador Urbano

### B25 - Auxílio-Reclusão

### B80 - Salário-Maternidade

### B81 - Salário-Maternidade Acidentário

### B87 - BPC - Benefício de Prestação Continuada da Pessoa com Deficiência

### B88 - BPC - Benefício de Prestação Continuada do Idoso

### B57 - Pensão por Morte de Trabalhador Rural

### B23 - Pensão por Morte Rural

### B32 - Auxílio por Incapacidade Temporária Acidentário (B31 acidentário)

### B36 - Salário-Família

### B58 - Aposentadoria do Anistiado Político

### B83 - Aposentadoria por Idade do Pescador Artesanal (rural)

## 6 BLOCO F - DOCUMENTOS E CONSULTAS

### INFBEN - Informações do Benefício

Documento disponibilizado pelo INSS com dados essenciais do benefício (NB, DIB, DER, DIP, DCB, valor, titular, dependentes).

### HISCRE - Histórico de Créditos

Documento que relaciona os últimos pagamentos feitos ao segurado.

### CONBAS - Dados Básicos da Concessão

Documento que detalha os dados de concessão do benefício.

### CONCAL - Memória de Cálculo do Benefício

Documento que detalha o cálculo da RMI.

### CONPRI - Salários-de-Contribuição

Documento que lista os salários-de-contribuição considerados.

### CONREAJ - Simulação de Reajuste de Benefícios

### COM-RMI - Simulação de Cálculo da RMI

### REVSIT - Situação de Revisão do Benefício

### DESDOB - Informações de Desdobramento

Detalhes sobre dependentes e composição do benefício.

### DEPEND - Dependentes

Listagem dos dependentes habilitados ou inscritos.

### PESCPF - Pesquisa CPF

### PESCRE - Pesquisa Crédito

### PESNOM - Pesquisa Nome

### PI - Pedido de Informação

### PR - Pedido de Reconsideração (administrativo)

### CARTA DE CONCESSÃO

Documento formal que comunica a concessão do benefício. Não é INFBEN.

### CARTA DE INDEFERIMENTO

Documento formal que comunica o indeferimento. Marco para prazo de recurso administrativo (30 dias para JR).

### COMUNICADO DE DECISÃO

Documento padrão de decisão administrativa do INSS.

### CTC - Certidão de Tempo de Contribuição

Documento que comprova tempo de contribuição vertido ao RGPS para fins de contagem recíproca com o RPPS. Cruzar com `base-contagem-reciproca-rgps-rpps`.

### LTCAT - Laudo Técnico das Condições Ambientais de Trabalho

Documento empresarial que descreve as condições ambientais. Base para o PPP.

### PPP - Perfil Profissiográfico Previdenciário

Documento que sintetiza as condições de exposição a agentes nocivos. Crítico para aposentadoria especial e B94. Cruzar com `auditoria-ppp` e `base-especial-ppp-mudanca-layout-historico`.

### PCMSO - Programa de Controle Médico de Saúde Ocupacional

Programa empresarial de medicina do trabalho. Base para CAT e nexo causal.

### PGR - Programa de Gerenciamento de Riscos

Sucedeu PPRA pela NR-1 atualizada. Cruzar com `defesa-probatoria-especial`.

### PPRA - Programa de Prevenção de Riscos Ambientais

Antigo programa de gestão de riscos ambientais. Substituído pelo PGR.

### ASO - Atestado de Saúde Ocupacional

Documento individual de medicina do trabalho. Pode ter peso probatório retrospectivo.

### CAT - Comunicação de Acidente de Trabalho

Formulário oficial que comunica ao INSS a ocorrência de acidente de trabalho. Crítica para B92, B94 e ações acidentárias na Justiça Estadual.

### CIRB - Comunicado de Indeferimento de Benefício

## 7 BLOCO G - SISTEMAS E PLATAFORMAS

### SABI - Sistema de Acompanhamento de Benefício por Incapacidade

Sistema do INSS para gestão dos benefícios por incapacidade (B31, B91, B92).

### PLENUS / SISBEN - Sistema de Benefícios

Sistema integrado da DATAPREV de acesso restrito (servidor, segurado, advogado constituído). Contém INFBEN, HISCRE, CONCAL, CONBAS e demais documentos.

### GERID - Gestão Integrada de Demanda

Plataforma de gestão de demanda do INSS.

### PAT - Plataforma de Atendimento

Plataforma para agendamento e atendimento. Cruzar com `base-meu-inss-pat-gerid-fluxo`.

### MEU INSS

Aplicativo e portal de autoatendimento do segurado. Substituído gradualmente pela GERID/PAT.

### eSocial

Sistema empresarial de informações trabalhistas. Substitui GFIP, GPS e outros documentos.

### PJe - Processo Judicial Eletrônico

Sistema de tramitação processual eletrônica dos tribunais (TRF3, JEF, CRPS digital).

### SEEU - Sistema Eletrônico de Execução Unificado

### SEI - Sistema Eletrônico de Informações (administrativo)

### ESAJ - Tribunal de Justiça (TJSP)

Sistema do TJSP para tramitação processual, inclusive nos Núcleos Especializados de Justiça 4.0 (Acidentes do Trabalho).

## 8 BLOCO H - REGIMES E CONCEITOS

### RGPS - Regime Geral de Previdência Social

Regime do INSS.

### RPPS - Regime Próprio de Previdência Social

Regime dos servidores públicos efetivos. Cruzar com `base-rpps-na-otica-do-rgps`.

### RPC - Regime de Previdência Complementar

Previdência privada complementar.

### TC - Tempo de Contribuição

### TF - Tempo Ficto

### TS - Tempo de Serviço

### CARÊNCIA

Número mínimo de contribuições mensais para fins de habilitação ao benefício. Variável por espécie. Cruzar com `base-carencia-por-especie-art27a`.

### PERÍODO DE GRAÇA

Período em que o segurado mantém a qualidade de segurado sem contribuir. Cruzar com `periodo-graca-qualidade-segurado`.

### DEPENDENTE

Pessoa cuja relação com o segurado justifica o recebimento de benefício derivado (pensão, salário-família).

### SEGURADO ESPECIAL

Trabalhador rural em economia familiar. Cruzar com `segurado-especial-rural`.

### SEGURADO FACULTATIVO

Pessoa sem atividade remunerada que se filia ao RGPS voluntariamente.

### SEGURADO OBRIGATÓRIO

Trabalhador filiado por força de lei (empregado, doméstico, contribuinte individual, avulso, segurado especial).

## 9 BLOCO I - FAP E NEXO ACIDENTÁRIO

### FAP - Fator Acidentário de Prevenção

Multiplicador do RAT/SAT. Empresas com mais acidentes pagam mais. Estimula prevenção. Cruzar com `base-portarias-dpmf-inss-hub`.

### RAT/SAT - Risco de Acidente do Trabalho / Seguro de Acidente do Trabalho

Contribuição empresarial para custeio do seguro de acidente.

### NTEP - Nexo Técnico Epidemiológico Previdenciário

Mecanismo automático que estabelece nexo entre doença e atividade laboral baseado no cruzamento CNAE x CID. Cruzar com `ntep-nexo-acidentario`.

### NEXO TÉCNICO

Vinculação entre a doença/sequela e o ambiente de trabalho. Tipos. Nexo profissional/causal (lista A do Decreto), nexo individual (perícia médica), nexo epidemiológico (NTEP).

## 10 BLOCO J - CONTRIBUIÇÕES E GUIAS

### GPS - Guia da Previdência Social

Documento de recolhimento de contribuição previdenciária. Substituída em grande parte pelo eSocial.

### GFIP - Guia de Recolhimento do FGTS e Informações à Previdência Social

Antiga guia das empresas. Substituída pelo eSocial.

### DARF - Documento de Arrecadação de Receitas Federais

Usado para indenização de contribuições (Códigos 1872 e 1873). Cruzar com `indenizacao-contribuicoes-atraso`.

### DCTF - Declaração de Débitos e Créditos Tributários Federais

### GRPS - Guia de Recolhimento da Previdência Social

### GR - Guia de Recolhimento

### CI - Contribuinte Individual

Categoria de segurado obrigatório. Trabalhador autônomo, MEI, sócio administrador, etc. Cruzar com `contribuinte-individual-in128`.

### CAEPF - Cadastro de Atividade Econômica da Pessoa Física

## 11 BLOCO K - INDICADORES CNIS E PENDÊNCIAS

### PEXT - Pendência Externa

Indicador CNIS que impede concessão automática.

### PREC-MENOR-MIN - Recolhimento Menor que o Mínimo

Indicador de contribuição abaixo do salário mínimo (necessita complementação EC 103).

### PDIV-DADOS-GFIP - Divergência GFIP

### PVIN-IRREG - Vínculo Irregular

### PREC-FBR - Pendência de Recolhimento Federal

### PADM-EMPR - Pendência Administrativa do Empregador

### IAGRUP - Agrupamento de Contribuições

### ICOMPL-VR-SM-EC103 - Complementação Valor SM EC 103

### PSC-MEN-SM-EC103 - Salário-de-Contribuição Menor que SM EC 103

Cruzar com `cnis-acerto-indicadores` e `contribuicoes-complementacao-ec103`.

## 12 BLOCO L - EXECUÇÃO E PAGAMENTO

### RPV - Requisição de Pequeno Valor

Requisição de pagamento até 60 SM por beneficiário. Prazo de pagamento de 60 dias após expedição. Cruzar com `execucao-cumprimento-previdenciario` e `base-cumprimento-sentenca-rpv-precatorio`.

### PRECATÓRIO

Requisição de pagamento acima de 60 SM. Pagamento conforme cronograma constitucional.

### PAB - Pagamento Alternativo de Benefício

Forma de pagamento de benefício suspenso (mesmo se inativo).

### RPPS - Requisição de Pagamento Pequeno Solidário

Sigla pouco usada, eventualmente em determinados juízos.

## 13 BLOCO M - PROCESSUAIS

### PJe - Processo Judicial Eletrônico

### PAT - Pauta de Atendimento

### TJ-SP - Tribunal de Justiça do Estado de São Paulo

### TRF3 - Tribunal Regional Federal da 3ª Região

Competência sobre SP e MS.

### JEF - Juizado Especial Federal

Competência até 60 SM. Cruzar com `base-jef-trf3-manual-2025` e `base-jef-previdenciario`.

### TRU - Turma Regional de Uniformização

Cruzar com `base-tru-trf3-sumulas-jurisprudencia`.

### TNU - Turma Nacional de Uniformização

Cruzar com `base-tnu-admissibilidade-manual`.

### PUIL - Pedido de Uniformização de Interpretação de Lei

### PEDILEF - Pedido de Uniformização de Interpretação de Lei Federal

Sinônimo de PUIL.

### IRDR - Incidente de Resolução de Demandas Repetitivas

### IAC - Incidente de Assunção de Competência

### MS - Mandado de Segurança

### ED - Embargos de Declaração

### AI - Agravo de Instrumento

### RE - Recurso Extraordinário (STF)

### REsp - Recurso Especial (STJ)

### REE - Reexame Necessário

### TAC - Termo de Ajustamento de Conduta

### RT - Reclamação Trabalhista

Cruzar com `base-rt-ajuizamento-vinculo-previdenciario`.

## 14 BLOCO N - REABILITAÇÃO E DEFICIÊNCIA

### HRP - Habilitação e Reabilitação Profissional

Programa do INSS para reinserção do segurado incapacitado parcial. Art. 136 Decreto 3.048/99. Cruzar com `base-reabilitacao-profissional`.

### IFBr-A - Instrumento de Funcionalidade Brasileiro - Aposentadoria

Avaliação funcional para aposentadoria PCD da LC 142/2013. Cruzar com `aposentadoria-deficiencia`.

### IFBr-M - Instrumento de Funcionalidade Brasileiro - Modificado (BPC)

Avaliação funcional para BPC LOAS de deficiente.

### TCQ - Termo Consensual de Qualificação (BPC)

### CIF - Classificação Internacional de Funcionalidade

### CID - Classificação Internacional de Doenças

### DSM-5 / DSM-5-TR - Manual de Diagnóstico Estatístico

### PCD - Pessoa com Deficiência

Cruzar com `direitos-pcd-previdenciarios`.

### EPCD - Estatuto da Pessoa com Deficiência (Lei 13.146/2015)

## 15 BLOCO O - ASSISTÊNCIA SOCIAL

### LOAS - Lei Orgânica da Assistência Social (Lei 8.742/1993)

### BPC - Benefício de Prestação Continuada

Cruzar com `analise-bpc-loas`.

### SUAS - Sistema Único de Assistência Social

### CRAS - Centro de Referência de Assistência Social

### CREAS - Centro de Referência Especializado de Assistência Social

### CADÚNICO - Cadastro Único para Programas Sociais

Cadastro obrigatório para BPC. Cruzar com `base-cadastro-domiciliar-cadunico-in21-2026`.

### MDS - Ministério do Desenvolvimento e Assistência Social, Família e Combate à Fome

## 16 BLOCO P - SIGLAS PROCESSUAIS RECURSAIS

### RAC - Requerimento de Acerto Cadastral

Formulário de acerto de pendências no CNIS. Cruzar com `cnis-acerto-indicadores`.

### ROA - Recurso Ordinário Administrativo (à JR do CRPS)

### REA - Recurso Especial Administrativo (à CAJ do CRPS)

### PMF - Perito Médico Federal

Servidor do INSS responsável pela perícia médica.

### DPMF - Diretoria de Perícia Médica Federal

Estrutura do INSS responsável pelas perícias médicas. Sucessora da DPMF.

### CFM - Conselho Federal de Medicina

### CRM - Conselho Regional de Medicina

### TÉRMINO DE TRATAMENTO

Marco para consolidação de lesões (B94) ou alta médica (B31).

## 17 BLOCO Q - TRIBUTAÇÃO

### IR - Imposto de Renda

### IRRF - Imposto de Renda Retido na Fonte

### DIRF - Declaração do Imposto sobre a Renda Retido na Fonte

### RRA - Rendimentos Recebidos Acumuladamente

Cruzar com `tributacao-beneficios-previdenciarios`.

## 18 USO ESTRATÉGICO

### Identificação rápida em decisão administrativa

Ao receber qualquer decisão do INSS (carta de concessão, indeferimento, comunicado), confrontar com este glossário para identificar siglas e seu significado técnico. Não pressupor entendimento prévio. Conferir.

### Tradução para o cliente

Cliente leigo. Usar nome por extenso da sigla + breve explicação. Exemplo. "Sua DIB (Data de Início do Benefício) foi fixada em 01/03/2024, o que significa que seu auxílio começa a contar dessa data, mesmo que o pagamento só ocorra a partir da DIP (Data do Início do Pagamento)."

### Identificação de armadilhas

Algumas siglas se confundem. Ex. DAT (Data de Afastamento) e DCB (Data de Cessação do Benefício) NÃO são sinônimas. Ex. DER (Data de Entrada do Requerimento) e DIB (Data de Início do Benefício) podem coincidir mas não obrigatoriamente.

### Verificação em CNIS e INFBEN

Após cada nova petição, conferir se o INFBEN e CONCAL/CONBAS refletem corretamente DIB, DIP, DCB e RMI.

## 19 CRUZAMENTO COM OUTRAS SKILLS

Esta skill deve ser acionada AUTOMATICAMENTE quando.

- Leitura de documentos do INSS (HISCRE, INFBEN, CONCAL, CONBAS, CONPRI).
- Análise de CNIS para identificar indicadores.
- Redação de petição ou recurso onde aparecerem siglas técnicas.
- Tradução para o cliente.

Cruzar com.

- `cnis-acerto-indicadores`. Indicadores CNIS.
- `base-meu-inss-pat-gerid-fluxo`. Plataformas do INSS.
- `base-legislacao-fontes-primarias`. Marcos normativos das siglas.
- `peticao-previdenciaria`. Geração da peça.
- `base-jef-trf3-manual-2025`. JEF TRF3.
- `base-jef-previdenciario`. JEF.

## 20 ALERTA FINAL

Este glossário é VIVO. Novas siglas aparecem com a edição de Portarias e a evolução do PJe/eSocial. Atualizar trimestralmente.

Fonte principal. Glossário do escritório Paulo Roberto Tercini Filho.

Última revisão. 13/06/2026.
