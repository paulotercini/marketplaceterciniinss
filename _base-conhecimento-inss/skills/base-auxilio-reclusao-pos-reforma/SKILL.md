---
name: base-auxilio-reclusao-pos-reforma
description: "Auxílio-reclusão B25 pós EC 103/2019, ótica pró-segurado. Use SEMPRE que mencionar auxílio-reclusão, B25, dependentes de preso, segurado recluso, baixa renda preso, art. 80 Lei 8.213, MP 871/2019, Tema 1162 STJ, Tema 896 STJ, Tema 357 TNU, Tema 310 TNU, Tema 89 STF, Tema 1421 STJ, art. 382 IN 128, art. 383 IN 128, art. 392 IN 128, prisão provisória, flexibilização critério renda, média 12 salários prisão, divisor fixo 12, progressão regime auxílio-reclusão, monitoramento eletrônico, cessação auxílio-reclusão, carência 24 contribuições reclusão, certidão judicial prisão, EC 103/2019 auxílio-reclusão, teto baixa renda, desempregado preso renda zero, tempus regit actum reclusão, direito adquirido progressão regime, regime semiaberto preso, REsp 2240220, REsp 2256869, IRDR 35 TRF4, Lei 13.846/2019. Cruza com auxilio-reclusao-previdenciario, peticao-previdenciaria, precedentes-previdenciarios, ms-competencia-autoridade-coatora, periodo-graca-qualidade-segurado e triagem-caso-novo."
---

# Auxílio-Reclusão (B25). Requisitos

Esta skill concentra os requisitos legais e a cessação. Precedentes, estratégia, cálculo dos divisores e checklist de triagem ficam em `auxilio-reclusao-previdenciario`. Cenários em `references/FUNDAMENTOS-E-CENARIOS.md`; refutação em `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Base normativa

- CF, art. 201, IV: auxílio-reclusão aos dependentes do segurado de baixa renda.
- Lei 8.213/91, art. 80 (redação da Lei 13.846/2019): devido nas condições da pensão por morte, cumprida a carência do art. 25, IV, aos dependentes do segurado de baixa renda recolhido à prisão em regime fechado que não receba remuneração da empresa, auxílio-doença, pensão por morte, salário-maternidade, aposentadoria ou abono de permanência.
  - §1º: o requerimento se instrui com certidão judicial do recolhimento efetivo à prisão, e a manutenção exige prova de permanência na condição de presidiário.
  - §3º: baixa renda é a renda, apurada na forma do §4º, igual ou inferior ao valor do art. 13 da EC 20/98, corrigido pelos índices do RGPS.
  - §4º: a renda é a média dos salários de contribuição dos 12 meses anteriores ao mês do recolhimento à prisão.
- Lei 8.213/91, art. 25, IV: carência de 24 contribuições.
- EC 103/2019, art. 27: limite de renda bruta corrigido pelos índices do RGPS (caput) e cálculo na forma da pensão por morte, sem exceder 1 salário mínimo (§1º).
- Decreto 3.048/99, arts. 116 a 119.
- IN 128/2022, arts. 381 a 392, e art. 198 (carência).
- Portaria Interministerial MPS/MF anual: valor do limite de baixa renda na data da prisão.

## Regime aplicável pela data da prisão

| Item | Prisão até 17/01/2019 | Prisão desde 18/01/2019 |
|---|---|---|
| Regime prisional | fechado e semiaberto | fechado (art. 80) |
| Carência | isenta (IN 128/2022, art. 198, I) | 24 contribuições (art. 198, II) |
| Baixa renda | último salário de contribuição; desempregado sem renda atende (Tema 896 STJ) | média dos 12 meses (art. 80, §4º) |
| Progressão para o semiaberto | mantém o benefício (Tema 357 TNU; IN 128/2022, art. 383, §4º) | cessa (art. 392, I, "a") |

Valor: até 12/11/2019, 100% da aposentadoria por invalidez a que o segurado teria direito; desde 13/11/2019, cálculo da pensão por morte limitado a 1 salário mínimo (EC 103/2019, art. 27, §1º).

## Regras da IN 128/2022

- Art. 381, §1º: os requisitos se aferem na data da reclusão, independentemente da data do requerimento.
- Art. 382: conta a pena em regime fechado e a prisão provisória, preventiva ou temporária. Equiparam-se o adolescente de 16 a 18 anos internado e o segurado em medida de segurança de internação (§1º, redação da IN 188/2025). Prisão domiciliar ou monitoramento eletrônico não afastam o benefício se o regime for o fechado (§3º). Livramento condicional, semiaberto e aberto não geram o benefício (§2º).
- Art. 383, §5º: sem salário de contribuição nos 12 meses anteriores, o segurado é de baixa renda. §6º: com menos de 12 salários, média dos existentes. §7º: a competência abaixo do limite mínimo não entra na média.
- Art. 392: cessa pela progressão (semiaberto ou aberto, se a prisão é desde 18/01/2019; aberto, se anterior), soltura ou livramento condicional, fuga, aposentadoria do recluso, óbito e extinção da última cota. Nova captura ou regressão de regime é novo fato gerador (§1º).

## Dependentes e DIB

Rol do art. 16 da Lei 8.213/91 e rateio da pensão (detalhe em `base-pensao-por-morte-pos-reforma`). DIB na prisão se o requerimento entra em 180 dias para o filho menor de 16 anos e em 90 dias para os demais (art. 80 c/c art. 74, I); fora do prazo, na DER (Tema 1421 STJ, adverso).

## Defesa dos dependentes, em ordem

1. Fixar a data da prisão e o regime normativo.
2. Recalcular a média do art. 80, §4º, excluídas as competências abaixo do mínimo (art. 383, §7º).
3. Sem salário de contribuição nos 12 meses, baixa renda pelo art. 383, §5º.
4. Prisão provisória e monitoramento eletrônico em regime fechado geram o benefício (art. 382, II e §3º).
5. Prisão anterior a 18/01/2019: Tema 896 STJ, Tema 1162 STJ (excedente ínfimo) e Tema 357 TNU.

## Via processual

Requerimento pelo Meu INSS com certidão judicial; recurso ao CRPS; ação judicial. Mandado de segurança só na Vara Federal, nunca no JEF, para cessação ou omissão sem dilação probatória (`ms-competencia-autoridade-coatora`).

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

Estratégia e precedentes: `auxilio-reclusao-previdenciario`. Qualidade de segurado: `periodo-graca-qualidade-segurado`. Carência: `base-carencia-por-especie-art27a`. Pensão por óbito do recluso: `base-pensao-por-morte-pos-reforma`. Fungibilidade: `base-fungibilidade-previdenciaria`. Peça: `peticao-previdenciaria`. Portarias: `base-portarias-dpmf-inss-hub`.
