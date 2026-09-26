---
name: base-especial-ppp-mudanca-layout-historico
description: "Skill base sobre as mudanças históricas do layout do Perfil Profissiográfico Previdenciário (PPP), com auditoria pró-segurado dos formulários antigos (DSS-8030, DIRBEN-8030, SB-40, DISES-BE 5235), do PPP em layout 2003 a 2017 e do PPP eSocial atual. Use SEMPRE que mencionar mudança de layout PPP, PPP antigo, PPP histórico, PPP eSocial, formulário SB-40, DSS-8030, DIRBEN-8030, DISES-BE 5235, layout 2003 PPP, layout 2017 PPP, S-2240, S-2245, S-2299, eSocial periculosidade, PPP digital, retificação PPP por mudança de layout, perda de dados em mudança, conversão de campos antigos, transposição de SB-40 para PPP, comparação SB-40 PPP, agente nocivo em layout antigo, EPC EPI campo histórico. Hub para defesa do segurado quando empresa apresenta documento em layout incompatível com fato gerador, ou quando INSS exige formulário inadequado para o período. NÃO use para auditoria isolada de PPP atual sem componente de mudança de layout. Cruza com auditoria-ppp, tempo-especial-peticoes-por-rito, peticao-previdenciaria."
---

# PPP. Mudanças de Layout e Formulários Históricos

## 1. Quando acionar esta skill

Acione SEMPRE que houver dúvida sobre o formulário aplicável ao período, divergência entre o layout do PPP e o fato gerador, ou auditoria de documento histórico (SB-40, DSS-8030, DIRBEN-8030). A skill protege o segurado de exigências formais incompatíveis com o regime vigente à época.

## 2. Marco normativo histórico

Antes de 1995, os formulários eram DISES-BE 5235 e SB-40 (Decretos 53.831/64 e 83.080/79). Entre 1995 e 2003, o DSS-8030 substituiu, com requisitos mais técnicos pela Lei 9.032/95. A partir de 1º/01/2004 vigorou o PPP no layout instituído pela IN INSS/DC 99/2003 e mantido em essência até 2017 (IN 77/2015).

Em 2017, o eSocial passou a substituir gradualmente o PPP. Os eventos S-2240 (condições ambientais), S-2245 (treinamentos) e S-2299 (desligamento) integram o regime digital. A IN INSS 128/2022 consolidou o regime atual.

## 3. Eixos centrais pró-segurado

A regra é tempus regit actum. O formulário aplicável é o vigente à data do trabalho.

A empresa que apresenta DSS-8030 quando o trabalho é anterior a 1995 não macula o documento. Pelo contrário, o DSS-8030 supre o SB-40.

A empresa que apresenta PPP atual (layout 2003 ou eSocial) com cobertura de período anterior é válida, desde que a fonte primária (LTCAT, GFIP) esteja preservada.

A ausência de migração entre layouts não pode prejudicar o segurado. Cabe ao INSS aceitar conversão de campos.

## 4. Fragilidades adversárias mais comuns

O INSS recusa SB-40 sob alegação de obsolescência. Refute com tempus regit actum e Súmula 198 TFR.

O INSS recusa PPP eSocial sob alegação de ausência de carimbo. Refute com a IN 128/2022, que dispensa carimbos quando há assinatura digital ICP-Brasil.

O INSS exige formulário não vigente à época. Refute com hierarquia normativa.

O INSS desconsidera PPP histórico que cobre múltiplos períodos com layouts diferentes. Refute com a possibilidade de reconstituição documental.

## 5. Estratégia processual

A defesa pró-segurado pivota em retificação de PPP pela empresa quando viável (skill `retificacao-ppp`), produção de prova testemunhal e perícia indireta. Combinar com `auditoria-ppp` e `base-especial-categoria-profissional-pre1995`.

## 6. Documentos essenciais

Formulário aplicável à época. LTCAT contemporâneo. GFIP. CTPS. CNIS. Quando histórico, declaração de empresa sucessora.

## 7. Fontes

Consulte os arquivos `references/FUNDAMENTOS-E-CENARIOS.md` e `references/JURISPRUDENCIA-E-REFUTACAO.md`.

## Hub de portarias administrativas

Hub das Portarias DPMF/DIRBEN/INSS aplicáveis a este benefício. Acionar `base-portarias-dpmf-inss-hub` para identificar quais Portarias regem o procedimento administrativo, o cálculo, as ratificações e os recursos no caso concreto.

## MCPs da casa

Antes de redigir, consulte os três servidores locais do plugin, nesta ordem. Os três localizam e não conferem, e nenhum autoriza a marca [CONFERIDO].

Legislação. Todo dispositivo citado nesta skill se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo. Para tese de direito adquirido, `redacao_na_data`, que responde por ano. A citação em peça exige a `fonte_oficial` que a resposta devolve. Detalhe em `base-legislacao-fontes-primarias`.

Jurisprudência do TRF3 e das Turmas Recursais. Localize pelo MCP `trf3`, com `buscar_acordaos_trf3` (consulta, `polo_recorrente`, `resultado`, `orgao_julgador` e datas) e `obter_acordao_trf3` no id devolvido. `resultado` e `polo_recorrente` são inferidos. O achado nasce [NÃO CONFIRMADO] e só entra na peça depois de aberto no portal do TRF3, na forma de `pesquisa-jurisprudencia-chrome`. TNU e CRPS ficam no MCP `iurisprudencia`.

Acervo do escritório. Consulte pelo MCP `acervo` o que o escritório já sustentou neste tema. Comece por `buscar_tese_acervo` com os termos centrais desta skill e, achando trecho útil, leia o argumento inteiro com `obter_trecho_acervo`. Para saber em que peças um precedente já foi usado, chame `precedentes_do_acervo` e leia o campo `corte` da resposta, porque o mesmo número de Tema existe em mais de uma corte. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.
