---
name: base-rubricas-pagamento-inss
description: Catálogo consolidado das rubricas de pagamento de benefícios previdenciários e assistenciais do INSS conforme Anexo IX da Portaria DIRBEN/INSS 992/2022 (Livro III, Manutenção de Benefícios). Use SEMPRE que envolver pagamento de benefício, leitura ou análise de HISCRE (Histórico de Créditos), CONCAL (Memória de Cálculo), INFBEN (Informações do Benefício), folha de pagamento INSS, contracheque do segurado, extrato bancário do benefício, análise de descontos indevidos, conferência de RMI, cumprimento de sentença previdenciária, cálculo de atrasados, RPV, precatório, devolução de valores, complemento positivo, decisão judicial sobre valores, revisão de teto, revisão IRSM, revisão art. 29, revisão art. 26, revisão art. 201, revisão de pecúlio, revisão Súmula 9, revisão ORTN/OTN/BTN, revisão URV, ACP IRSM, ACP-MP242, indenização SASSE, indenização Seringueiros, indenização Talidomida, ex-combatente, salário-família, abono PIS/PASEP, pensão alimentícia, consignação, empréstimo bancário, RMC (Reserva de Margem Consignável), IR retido na fonte, contribuição previdenciária 13º, abatimento dependente IR, abatimento maior 65 anos IR, calamidade pública, salário-família débito, complemento acompanhante, dupla atividade, contribuição sindical CONTAG COBAP ANAPPS SINDIAPI SINDNAPI SINTAPI SINTRAAPI FETRAF UNIBRASIL UNIDOS CENTRAPE ASBAPI FNTF ASTRE FITF CNTT RIAAM ABAMSP CONAFER SINAB ABSP STFERJ SINDAPB ASSISTENCIA PATRONAL, RFFSA, CBTU, ECT, PSS, PA-Pensão Alimentícia, IPMF, CPMF, devolução CPMF, auxílio emergencial MP 875/2019, antecipação calamidade. Use também ao verificar competência específica, código de rubrica não identificado, devolução tributária, valor líquido corrigido, diferença entre MR normal e MR judicial. Cruza com base-cnis-acerto-indicadores, base-meu-inss-pat-gerid-fluxo, base-portarias-dpmf-inss-hub, execucao-cumprimento-previdenciario, impugnacao-cumprimento-concomitantes, tributacao-beneficios-previdenciarios, base-juros-correcao-monetaria, base-cumprimento-sentenca-rpv-precatorio, base-revisao-teto-buraco-negro-verde, base-revisao-irsm-fevereiro-1994, base-revisao-art29-melhor-beneficio, base-revisao-reajuste-ortn-otn, base-revisao-vida-toda-rvt, base-devolucao-valores-irrepetibilidade-tema979-tema692, base-siglas-inss, peticao-previdenciaria, revisao-peticao. Postura exclusivamente pró-segurado. NÃO use para concessão isolada (Portaria 991/2022), para cadastro CNIS (Portaria 990/2022 e base-cnis-acerto-indicadores) nem para acumulação (Portaria 994/2022).
---

# Rubricas de Pagamento de Benefícios do INSS

## Objetivo

Cada rubrica é um código numérico do HISCRE, do extrato e dos demonstrativos de pagamento. Fonte: Anexo IX da Portaria DIRBEN/INSS 992, de 28/03/2022 (Livro III, Manutenção de Benefícios). A leitura da rubrica serve para:

1. conferir se o benefício é pago corretamente;
2. identificar descontos indevidos;
3. verificar se revisão judicial transitada em julgado foi implementada;
4. auditar cumprimento de sentença e cálculo de atrasados;
5. confrontar a folha com o pedido de RPV ou precatório;
6. detectar consignações irregulares e alterações de pensão alimentícia.

Toda rubrica de débito ou consignação merece auditoria, e toda rubrica de crédito pode estar faltando.

## Estrutura

As rubricas têm 11 dígitos, e os três últimos identificam o tipo. A tabela integral está em `references/CATALOGO-COMPLETO-RUBRICAS.md`.

| Bloco | Faixa | Natureza |
|-------|-------|----------|
| 100 | 101 a 160 | Créditos (rendas, abonos, complementos) |
| 200 | 201 a 253 | Débitos (descontos, tributação, consignações) |
| 300 | 301 a 329 | Diferenças, abatimentos e especiais |
| CP | 333 a 379 | Complementos positivos de revisões |
| 900 | 901 a 933 | Valores totais e consignações por entidade |

## Códigos críticos

| Código | Nomenclatura | Uso na auditoria |
|---|---|---|
| 101 | Valor total de MR do período | Confrontar com a RMI atualizada |
| 107 | Complemento positivo | Diferença retroativa paga; identificar a origem |
| 125 e 335 | CP, decisão judicial | Rastreia a implementação da sentença |
| 133 | Parcela dupla atividade | Atividades concomitantes (Lei 8.213/91, art. 32) |
| 156 a 158; 366 a 368 | CP, revisão teto (ativo, cessado, herdeiros) | Revisão de teto implementada |
| 369 a 372; 373 | CP, revisão art. 29; ACP-MP 242 | Revisão do art. 29, II, implementada |
| 143, 144; 374 | CP, IRSM Lei 10.999/04; ACP IRSM | Revisão IRSM implementada |
| 147 | CP, diferença ORTN/OTN/BTN | Revisão ORTN implementada |
| 201 | IR retido na fonte | Conferir isenção por doença grave |
| 202, 210, 213 | Pensão alimentícia | Conferir com a decisão vigente |
| 203, 216, 217 | Consignação, empréstimo, RMC | Exigir contrato e autorização |
| 219 a 250; 905 a 933 | Contribuições associativas e consignações por entidade | Exigir filiação e autorização expressas |
| 252, 253 | Desconto por acumulação | Conferir art. 124 da Lei 8.213/91 e art. 24 da EC 103 |
| 318 | Diferença entre MR normal e MR judicial | Decisão judicial implementada |
| 377, 378 | Diferença de renda e de 13º por acumulação | Conferir o cálculo do art. 24 da EC 103 |
| 928, 929 | Consignação por determinação judicial | Conferir valor fixo ou percentual |

## Checklist de leitura do HISCRE

1. Localizar a 101 e confrontar com a RMI atualizada.
2. Localizar complementos positivos (107, 123 a 139, 333 a 379) e identificar a origem.
3. Listar todos os débitos 2XX. Cada um precisa de base legal e, se consignação, de autorização do segurado.
4. Conferir revisões implementadas (106, 116, 117, 132, 143, 144, 147, 152, 153, 156 a 158, 366 a 374, 376).
5. Havendo 252, 253, 377 ou 378, conferir a acumulação pelo art. 124 da Lei 8.213/91 e pelo art. 24 da EC 103/2019 (`base-acumulacao-beneficios-ec103-art24`).
6. Havendo 216, 217, 321 ou 322, pedir o contrato de cada operação e apurar fraude.

## Alertas

1. **Empréstimo consignado ou RMC sem autorização.** A Lei 14.181/2021 reforçou a proteção do consumidor superendividado. Cabe repetição em dobro do indébito (CDC, art. 42, parágrafo único).
2. **Contribuição associativa sem filiação expressa.** A filiação não se presume. O art. 115, V, da Lei 8.213/91 admitia apenas o desconto autorizado pelo filiado, e a Lei 15.327/2026 revogou esse inciso. Cabe devolução administrativa ou judicial.
3. **IR retido sobre benefício isento.** Rubrica 201 com doença grave (Lei 7.713/88, art. 6º, XIV; Súmula 627 STJ): restituição administrativa ou repetição de indébito (`tributacao-beneficios-previdenciarios`).
4. **Decisão judicial não implementada.** Sem as rubricas 125 ou 335 após o trânsito em julgado, cabe cobrança do cumprimento (`base-ms-cumprimento-inss`, `mandado-seguranca-previdenciario`).
5. **Pensão alimentícia desatualizada.** Alteração judicial não refletida nas 202, 210 ou 213 exige comunicação ao INSS e, se preciso, medida judicial.
6. **Revisão de teto não implementada.** Benefício limitado ao teto, com direito reconhecido (RE 564.354, Tema 76; RE 937.595, Tema 930), sem as rubricas 156 a 158 ou 366 a 368 (`base-revisao-teto-buraco-negro-verde`).

## Fonte normativa

Anexo IX da Portaria DIRBEN/INSS 992/2022 (manutenção de benefícios). Não confundir com a Portaria 991/2022 (concessão). Panorama das Portarias 990 a 996 em `base-portarias-dpmf-inss-hub`.

## Integração

`base-cnis-acerto-indicadores`, `base-meu-inss-pat-gerid-fluxo`, `base-portarias-dpmf-inss-hub`, `execucao-cumprimento-previdenciario`, `impugnacao-cumprimento-concomitantes`, `tributacao-beneficios-previdenciarios`, `base-juros-correcao-monetaria`, `base-cumprimento-sentenca-rpv-precatorio`, `base-revisao-teto-buraco-negro-verde`, `base-revisao-irsm-fevereiro-1994`, `base-revisao-art29-melhor-beneficio`, `base-revisao-reajuste-ortn-otn`, `base-devolucao-valores-irrepetibilidade-tema979-tema692`, `base-acumulacao-beneficios-ec103-art24`, `base-siglas-inss`, `peticao-previdenciaria`, `revisao-peticao`.

## MCPs da casa

Pesquisa obrigatória. Norma, súmula, tema, enunciado ou acórdão citado nesta skill nasce [NÃO CONFIRMADO] e só entra em peça, parecer ou orientação depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`. A ordem de consulta dos MCPs (`normas`, `superiores`, `trf3`, `iurisprudencia` e `acervo`) e dos catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) está em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O acervo serve à leitura do que o escritório já sustentou, e o reaproveitamento automático de texto de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
