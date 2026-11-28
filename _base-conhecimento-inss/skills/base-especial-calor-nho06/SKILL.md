---
name: base-especial-calor-nho06
description: "Exposição ao calor para aposentadoria especial: código 1.1.1 do Decreto 53.831/64 (acima de 28 graus) e do Anexo I do Decreto 83.080/79, código 2.0.4 do Anexo IV dos Decretos 2.172/97 e 3.048/99, NR-15 Anexo 3, IBUTG, taxa metabólica, NHO-06 da Fundacentro, art. 293 da IN 128/2022 e Tema 323 da TNU (informações do PPP e LTCAT sobre calor). Use SEMPRE que mencionar calor aposentadoria especial, NHO-06, IBUTG, Anexo 3 NR-15, taxa metabólica, atividade leve, moderada ou pesada, regime intermitente, siderurgia, fundição, vidraria, padaria, cozinha industrial, forno, caldeira, forneiro, calor de fonte natural, trabalho a céu aberto, Portaria 1.359/2019, calor LTCAT, calor PPP. Cruza com auditoria-ppp, base-especial-epi, base-especial-frio-camara-frigorifica, base-especial-categoria-profissional-pre1995, tempo-especial-peticoes-por-rito e defesa-probatoria-especial."
---

# Calor e aposentadoria especial

## Quadro normativo por período (IN 128/2022, art. 293)

| Período | Critério |
|---|---|
| Até 05/03/1997 | Fonte artificial. Alternativamente, o mais favorável: (1) temperatura acima de 28 °C, sem exigência de IBUTG (Decreto 53.831/64, código 1.1.1, "jornada normal em locais com TE acima de 28°"); ou (2) atividades do Decreto 83.080/79, Anexo I, código 1.1.1 (indústria metalúrgica e mecânica dos códigos 2.5.1 e 2.5.2 do Anexo II, fabricação de vidros e cristais, alimentação de caldeiras a vapor a carvão ou lenha), por presunção. |
| 06/03/1997 a 18/11/2003 | Decretos 2.172/97 e 3.048/99, Anexo IV, código 2.0.4: calor acima dos limites da NR-15, Anexo 3, Quadros 1, 2 e 3, considerada a taxa de metabolismo por tipo de atividade e o regime de descanso. |
| 01/01/2004 a 10/12/2019 | Limites do Anexo 3 da NR-15 na redação anterior à Portaria SEPRT 1.359/2019, com avaliação pela NHO-06 da Fundacentro (facultada desde 19/11/2003). |
| A partir de 11/12/2019 | Anexo 3 da NR-15 na redação da Portaria 1.359/2019, aplicável a ambientes fechados ou com fonte artificial de calor; o próprio Anexo exclui atividades a céu aberto sem fonte artificial (item 1.1.1). Avaliação pela NHO-06. |

Na redação anterior do Anexo 3, Quadro 1, em regime contínuo, o limite de IBUTG era 30,0 °C para atividade leve, 26,7 °C para moderada e 25,0 °C para pesada. Em regime intermitente os limites sobem conforme a proporção de descanso. Os períodos de descanso no próprio local contam como tempo de serviço (IN 128/2022, art. 293, parágrafo único; CLT, art. 253).

## Tema 323 da TNU (informações exigidas no PPP ou LTCAT)

PUIL 0510577-41.2020.4.05.8200, Rel. Juiz Federal Rodrigo Rigamonte Fonseca, D.E. 13/11/2025. Tese em três partes:

- a) de 06/03/1997 a 18/11/2003, regime intermitente com descanso no próprio local (Quadro 1): a taxa de metabolismo não precisa constar; o tipo de atividade (leve, moderada ou pesada) sai da descrição do trabalho, se enquadrada em uma única categoria;
- b) no mesmo período, descanso em local diverso, ou atividades de categorias diferentes: a taxa de metabolismo média ponderada para uma hora (Kcal/h) é imprescindível (Quadro 2);
- c) a partir de 01/01/2004 (facultativamente 19/11/2003): são imprescindíveis a metodologia da NHO-06 e a taxa de metabolismo média ponderada em watts.

Calor de fonte natural: a TNU admitiu o enquadramento até 08/12/2019 (PUIL 0501381-83.2021.4.05.8306, D.E. 23/02/2023, citado no acórdão do Tema 323). O INSS, desde a IN 141/2022, restringe o inciso I do art. 293 a fonte artificial.

## Roteiro do caso

1. Separar os períodos da tabela.
2. Até 05/03/1997: buscar temperatura acima de 28 °C ou atividade do Decreto 83.080/79; a categoria profissional pode enquadrar sozinha (forneiro, fundidor, caldeireiro: `base-especial-categoria-profissional-pre1995`).
3. De 1997 a 2003: conferir se o PPP traz IBUTG, regime de trabalho e descrição que permita classificar a atividade. Faltando a taxa metabólica, aplicar o item "a" do Tema 323 quando o descanso for no próprio local.
4. Desde 2004: exigir NHO-06 e taxa metabólica no PPP; se faltarem, pedir o LTCAT à empresa e, persistindo a omissão, perícia judicial (CPC, art. 464), em vez de aceitar a improcedência.
5. EPI: calor raramente é neutralizado por EPI; aplicar o Tema 1090 do STJ e impugnar o PPP (Tema 213 da TNU). Ver `base-especial-epi`.

Cenários e prova em `references/FUNDAMENTOS-E-CENARIOS.md`. Refutação em `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

As Portarias DPMF, DIRBEN e INSS que regem procedimento, cálculo e recurso estão em `base-portarias-dpmf-inss-hub`.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

Auditoria do PPP em `auditoria-ppp`. EPI em `base-especial-epi`. Frio em `base-especial-frio-camara-frigorifica`. Categoria profissional em `base-especial-categoria-profissional-pre1995`. Prova em `defesa-probatoria-especial`. Peça por rito em `tempo-especial-peticoes-por-rito`.
