---
name: pensao-por-morte
description: "Hub de estratégia e precedentes da pensão por morte (B21/B93). Use SEMPRE que redigir peça ou parecer de pensão e quando mencionar união estável INSS, filho inválido, menor sob guarda, DIB pensão, Tema 81 TNU, Tema 7 TNU, Tema 15 TNU, Tema 32 TNU, Tema 39 TNU, Tema 45 TNU, Tema 118 TNU, Tema 148 TNU, Tema 284 TNU, Tema 286 TNU, Súmula 37 TNU filho universitário, Súmula 52 TNU, Súmula 63 TNU, Tema 371 TNU, REsp 2103603, Tema 1421 STJ, REsp 2240220, IRDR 35 TRF4, DIB menor 16 anos 180 dias, complementação post mortem, SicalcWeb 1872, concubinato impuro, ex-cônjuge sem alimentos, filho universitário, renúncia pensão BPC, certidão óbito prova rural. Para as REGRAS pós-reforma (cotas, duração do art. 77 §2º, acumulação da EC 103, B93, Leis 13.135, 13.846 e 15.108, Portaria DIRBEN 4/2025), ver base-pensao-por-morte-pos-reforma. Acionar com peticao-previdenciaria, precedentes-previdenciarios, base-documentos-comprobatorios-in128, triagem-caso-novo. NÃO use para auxílio-reclusão ou incapacidade."
---

# Pensão por Morte. Estratégia e Precedentes

Regras (dependentes, cotas, duração, acumulação, DIB, prova legal) em `base-pensao-por-morte-pos-reforma`; prova da união estável em `base-pensao-por-morte-uniao-estavel-prova`; fluxo em `ponte-workflow-pensao-por-morte`. Esta skill concentra precedentes, estratégia e triagem. Referências: `references/DIB-MARCOS-TEMPORAIS.md` e `references/COMPLEMENTACAO-POST-MORTEM.md`.

## 1. Dependentes. Precedentes

- Filho inválido: presunção relativa de dependência (Tema 114 TNU), afastada só por renda que torne o filho autossuficiente. A invalidez deve existir na data do óbito (Tema 118 TNU, adverso).
- Filho com deficiência intelectual, mental ou grave: o trabalho remunerado não impede a concessão nem a manutenção da cota (Lei 8.213/91, art. 77, §6º). A Portaria DIRBEN/PFE/INSS 4/2025 admite invalidez posterior à maioridade, desde que anterior ao óbito [NÃO CONFIRMADO].
- Filho universitário: a cota cessa aos 21 anos (Tema 7 e Súmula 37 TNU, adversos).
- Neto: fora do rol legal; só como menor sob guarda ou tutelado, com prova de dependência.
- Menor sob guarda: Tema 732 STJ, Lei 15.108/2025 e Tema 1271 STF pendente (detalhe na skill de regras).
- Ex-cônjuge sem alimentos: Tema 45 TNU, com dependência superveniente à separação provada antes do óbito (transferências, pagamento de contas, declaração de imposto de renda).
- Concubinato: Tema 15 TNU e Temas 526 e 529 STF, adversos. Caminho: provar a separação de fato.
- Sentença estadual de união estável: prova relevante, mas sem efeito de coisa julgada contra o INSS que não foi parte; o Juízo de Catanduva a recusou sem o INSS. Instruir com prova própria.

## 2. Qualidade de segurado do instituidor

- Súmula 416 STJ e Tema 148 TNU (adverso): sem qualidade, a pensão exige requisitos de aposentadoria já reunidos.
- Tema 39 TNU: rurícola sem qualidade exige idade e carência da aposentadoria rural reunidas antes do óbito.
- Período de graça, prorrogações (Temas 255, 338 e 365 TNU; Tema 1360 STJ), limbo (Tema 300 TNU) e contribuições abaixo do mínimo (Tema 349 TNU, suspenso pelo Tema 1467 STF) em `periodo-graca-qualidade-segurado` e `base-limbo-previdenciario-tema300`.
- Tema 32 TNU: certidão de óbito com profissão rural é início de prova material da condição de segurado especial (`segurado-especial-rural`).

## 3. DIB do menor e do incapaz

- Óbito desde 18/01/2019: Tema 1421 STJ (REsp 2.240.220/PR e 2.256.869/SP, j. 10/06/2026), adverso: requerimento do filho menor de 16 anos após 180 dias não retroage. Requerer sempre dentro de 180 dias. Perdido o prazo, sustentar distinção só com óbice concreto imputável ao INSS.
- Óbito anterior a 18/01/2019: no JEF, Tema 81 TNU (prazo do art. 74 não corre contra o menor impúbere). Fora do JEF, o REsp 2.103.603/PB (STJ, 1ª Turma, j. 10/09/2025) separa DIB e prescrição: requerimento tardio leva a DIB à DER, sem prescrição das parcelas posteriores. Há embargos de divergência na Primeira Seção [NÃO CONFIRMADO].
- Pedido subsidiário em todo caso: DIB na DER, sem prescrição contra o menor ou incapaz (art. 103, parágrafo único, c/c Código Civil, art. 198, I).
- Habilitação tardia de incapaz (art. 76): efeitos desde a habilitação, com discussão sobre a retroação.

## 4. Complementação post mortem

Resumo; detalhe em `references/COMPLEMENTACAO-POST-MORTEM.md`.
- Contribuição paga em vida abaixo do mínimo pode ser complementada pelos dependentes (EC 103/2019, art. 29, I). A IN 128/2022, art. 106, §§1º e 2º, só aceita a complementação após o óbito para empregado, doméstico, avulso e contribuinte individual prestador de serviço a empresa a partir de 11/2019, e para diferenças de reajuste do salário mínimo; para os demais, tese judicial.
- Facultativo de baixa renda com recolhimentos não validados: complementação de 5% para 11% ou 20% (Tema 286 TNU), com efeitos financeiros desde a complementação.
- Contribuição nunca paga não se regulariza após o óbito, salvo a devida por empresa tomadora (Súmula 52 TNU; Tema 26 TNU).

## 5. Renúncia de cota para BPC

Tema 284 TNU: o dependente pode renunciar à cota para receber o BPC, se preencher os requisitos da Lei 8.742/93. A cota renunciada que reverte a outro membro do grupo entra na renda per capita (`bpc-renda-grupo-familiar`).

## 6. Vias

CRPS; JEF até 60 salários mínimos; rito ordinário acima disso. Mandado de segurança só na Vara Federal, nunca no JEF, por exemplo para recusa de emissão da guia de complementação (`ms-competencia-autoridade-coatora`). Requerimento prévio (`tema-1124-instrucao-administrativa`). Tutela: `base-cpc-tutela-provisoria-previdenciaria`.

## 7. Checklist de triagem

1. Data do óbito e lei aplicável (Súmula 340 STJ).
2. Qualidade do instituidor ou requisitos de aposentadoria já reunidos.
3. Classe do dependente e prova exigida.
4. União estável: óbito antes ou depois de 18/01/2019 (Súmula 63 e Tema 371 TNU).
5. Idade do dependente: duração e prazo de 90 ou 180 dias.
6. Contribuições do instituidor: 18 contribuições, recolhimentos abaixo do mínimo, complementação.
7. Prazo do requerimento e DIB.
8. Prescrição, que não corre contra menor e incapaz.
9. Via processual.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Juízo de Catanduva

O juízo recusou união estável provada só por testemunhas, documento posterior ao óbito e sentença estadual sem o INSS. A peça traz início de prova material dos 24 meses anteriores ao óbito, em nome dos dois e no mesmo endereço. Blocos em `base-juizo-catanduva/references/BLOCOS-BENEFICIOS.md`.

## Integração

Peça: `peticao-previdenciaria`. Auditoria de decisão: `base-auditoria-adversarial-decisao-judicial`. Documentos: `base-documentos-comprobatorios-in128` e `atendimento-respostas-padrao`. Indenização: `indenizacao-contribuicoes-atraso`. Auxílio-reclusão: `auxilio-reclusao-previdenciario`. Precedentes: `precedentes-previdenciarios`.
