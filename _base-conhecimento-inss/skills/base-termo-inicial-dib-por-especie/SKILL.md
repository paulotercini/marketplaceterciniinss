---
name: base-termo-inicial-dib-por-especie
description: "Skill base sobre Data de Início do Benefício (DIB) e Data de Início do Pagamento (DIP) por espécie no RGPS, com sistematização de regras e exceções pró-segurado. Use SEMPRE que mencionar DIB previdenciária, data de início de benefício, data de entrada de requerimento DER, art. 49 Lei 8.213, art. 74 Lei 8.213, DIB B31, DIB B32, DIB B91, DIB B92, DIB B94, DIB B21, DIB B25, DIB B41, DIB B42, DIB BPC, retroação DIB, DIB pensão por morte 90 dias, DIB pensão por morte 180 dias, marco temporal pensão, art. 76 Lei 8.213, DIB auxílio-doença afastamento, art. 60 Lei 8.213, ouvidoria DIB, prazo 30 dias, prazo 90 dias, retroação ao óbito, DIB salário-maternidade, DIB BPC art. 21 LOAS, DIB aposentadoria por idade, DIB aposentadoria por tempo. Hub para defesa pró-segurado da DIB mais favorável em cada espécie. NÃO use para DIP isolada (cumprimento de sentença) nem decadência (skill própria). Cruza com peticao-previdenciaria, precedentes-previdenciarios e revisao-peticao."
---

# Termo Inicial. DIB por Espécie

## 1. Quando acionar esta skill

Acione SEMPRE que houver dúvida sobre a DIB aplicável, especialmente em situações de retroação, fixação ao DER, ao afastamento, ao óbito ou à incapacidade. A skill consolida o regime mais favorável ao segurado em cada espécie.

## 2. Marco normativo

A Lei 8.213/91 disciplina a DIB em diversos artigos. O art. 49 trata da aposentadoria. O art. 60 trata do auxílio-doença. O art. 74 trata da pensão por morte. O art. 76 trata da DIB excepcional. O art. 80 trata do auxílio-reclusão. A Lei 8.742/93, no art. 21, trata do BPC. As Leis 13.846/2019 e 13.183/2015 alteraram pontos relevantes. A IN INSS 128/2022 detalha o procedimento.

## 3. Eixos centrais pró-segurado

A DIB do auxílio-doença empregado é o décimo sexto dia do afastamento, se requerido em até 30 dias. Após 30 dias, é a DER (art. 60 §1º).

A DIB do auxílio-doença não empregado é a DER ou a data do afastamento se DER em até 30 dias.

A DIB da aposentadoria por idade, tempo de contribuição e especial é a DER (art. 49).

A DIB da pensão por morte é a data do óbito quando requerida em até 180 dias (filhos menores de 16 anos) ou em até 90 dias (demais dependentes) — art. 74, I, redação da Lei 13.846/2019; após os prazos, a DIB é a DER.

A DIB do BPC é a DER (art. 21 LOAS).

A DIB do auxílio-acidente é o dia seguinte à cessação do auxílio-doença (art. 86).

## 4. Fragilidades adversárias mais comuns

O INSS aplica DER quando deveria aplicar afastamento. Refute com art. 60 §1º.

O INSS recusa retroação ao óbito em pensão por morte. Refute com art. 74.

O INSS aplica DIB tardia em BPC. Refute com art. 21 LOAS.

O INSS desconsidera afastamento em auxílio-doença. Refute com prova médica.

## 5. Estratégia processual

A defesa pró-segurado pivota em pedido expresso de DIB favorável, prova do afastamento ou óbito, e fundamentação no art. específico. Combinar com `peticao-previdenciaria`, `pensao-por-morte` e `base-incapacidade-b31-temporaria`.

## 6. Documentos essenciais

DER. Prova de afastamento. Atestado médico. Certidão de óbito. CTPS. CNIS.

## 7. Fontes

Consulte os arquivos `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
