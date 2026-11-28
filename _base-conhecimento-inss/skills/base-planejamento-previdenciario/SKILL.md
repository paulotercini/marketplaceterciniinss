---
name: base-planejamento-previdenciario
description: "Planejamento previdenciário do segurado do INSS, simulação da melhor DER, direito adquirido pré-EC 103/2019, regras de transição, reafirmação da DER, melhor benefício e revisão preventiva. Use SEMPRE que mencionar planejamento previdenciário, melhor DER, simulação de benefício, direito adquirido EC 103, regra de transição, reafirmação DER, Tema 995 STJ, Tema 334 STF, melhor benefício, fator previdenciário, 100 por cento salário benefício, cenários de aposentadoria, contribuição facultativa estratégica, complementação EC 103, carência futura, período de graça, teto previdenciário, simulação Meu INSS, salário-de-benefício, mês competente, revisão preventiva, checklist pré-aposentadoria, estratégia do segurado, auditoria CNIS pré-aposentadoria. Cruza com peticao-previdenciaria, base-cnis-acerto-indicadores, base-calculo-rmi-ec103, base-aposentadoria-direito-adquirido, base-aposentadoria-transicao-ec103, reafirmacao-der e contribuicoes-complementacao-ec103."
---

# Planejamento Previdenciário

## Escopo

Simulação de cenários para identificar a regra mais vantajosa, a melhor DER e as contribuições que valem o custo. Postura pró-segurado: o parecer compara todas as regras cabíveis antes de recomendar.

## Fundamentos

- CF, art. 5º, XXXVI (direito adquirido); art. 201 (RGPS); art. 195, §14 (competência abaixo do mínimo não conta).
- EC 103/2019: art. 3º (direito adquirido até 13/11/2019); arts. 15 a 21 (transições); art. 26 (cálculo); art. 29 (complementação, agrupamento e utilização do excedente).
- Lei 8.213/91 e Lei 9.876/99 (fator previdenciário); Lei 8.212/91, art. 21 (alíquotas do contribuinte individual e do facultativo).
- IN 128/2022, art. 577 (reafirmação da DER e melhor benefício na via administrativa).

## Pilares

1. Auditoria do CNIS antes de qualquer simulação (agente `analista-cnis`; `base-cnis-acerto-indicadores`). Pendência, competência abaixo do mínimo e alíquota reduzida mudam a data do direito e a média.
2. Direito adquirido até 13/11/2019 (`base-aposentadoria-direito-adquirido`).
3. Transições: pontos (art. 15), idade progressiva (art. 16), pedágio de 50% (art. 17), pedágio de 100% (art. 20), especial por pontos (art. 21) e regras do professor.
4. Regra permanente (`base-aposentadoria-regra-permanente-ec103`).
5. Cálculo da RMI em cada regra (`base-calculo-rmi-ec103`), inclusive o descarte do art. 26, §6º.
6. Gestão das contribuições futuras: valor, alíquota e complementação.
7. Melhor DER e reafirmação.

## Pontos que decidem

- O fator previdenciário incide apenas no pedágio de 50% (art. 17, parágrafo único) e nas regras de direito adquirido que o preveem. Nas demais transições o coeficiente é de 60% mais 2% por ano acima de 20 (H) ou 15 (M), salvo o pedágio de 100%, com 100% da média.
- Cada ano adicional de contribuição soma 2 pontos percentuais no coeficiente; o descarte do art. 26, §6º, eleva a média, mas o tempo descartado sai do cômputo.
- Contribuição abaixo do salário mínimo após 13/11/2019 não conta sem complementação, agrupamento ou utilização do excedente (EC 103, art. 29; `contribuicoes-complementacao-ec103`).
- Contribuinte individual e facultativo: 20% sobre o salário de contribuição (Lei 8.212/91, art. 21). O plano simplificado de 11% ou 5% não conta para a aposentadoria por tempo de contribuição sem complementação (art. 21, §3º).
- Salário de contribuição alto em poucos meses tem efeito diluído na média de todos os salários desde 07/1994; simular antes de recomendar contribuição pelo teto.
- Contribuição em atraso de contribuinte individual exige prova da atividade e, fora do período de graça, não conta para carência (`indenizacao-contribuicoes-atraso`).

## Alertas

- A simulação do Meu INSS não substitui o cálculo manual; conferir o CNIS e cada regra.
- O requerimento fixa a DER. Pedido prematuro pode gerar concessão em regra pior; pedir reafirmação expressa (IN 128, art. 577; Tema 995 STJ).
- Benefício concedido: a decadência de 10 anos alcança o direito ao melhor benefício (Tema 966 STJ). Revisão preventiva dentro do prazo (`decadencia-revisao-previdenciaria`).
- A aposentadoria é irrenunciável. A desistência exige pedido de arquivamento antes do primeiro pagamento ou do saque do FGTS ou do PIS (Decreto 3.048/99, art. 181-B, §2º).

## Parecer

Uma página, com cenários ranqueados (a, b, c) e o número que decide cada um: DER, coeficiente, RMI estimada e custo das contribuições. Escrita conforme `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

`base-calculo-rmi-ec103`, `base-aposentadoria-direito-adquirido`, `base-aposentadoria-transicao-ec103`, `base-aposentadoria-regra-permanente-ec103`, `reafirmacao-der`, `base-cnis-acerto-indicadores`, `contribuicoes-complementacao-ec103`, `base-contagem-reciproca-rgps-rpps`, `base-fungibilidade-previdenciaria`, `base-portarias-dpmf-inss-hub`.
