---
name: base-rpps-na-otica-do-rgps
description: "Skill base sobre o Regime Próprio de Previdência Social (RPPS) na ótica do segurado do RGPS, com foco em contagem recíproca, certidão de tempo de contribuição (CTC), migração de regime e desaverbação. Use SEMPRE que mencionar RPPS, regime próprio, servidor público, certidão tempo contribuição, CTC, contagem recíproca, art. 96 Lei 8.213, art. 201 §9º CF, EC 103/2019 RPPS, migração RGPS para RPPS, migração RPPS para RGPS, desaverbação, exoneração, demissão servidor, posse cargo público, art. 130 IN 128/2022, Portaria SPS 154/2008, regime próprio municipal, abono permanência, Tema 1054 STF, Tema 942 STF (RE 1.014.286). Hub para o segurado do RGPS que tem ou teve vínculo com RPPS, com defesa contra negativa de averbação, recusa de CTC e perda de tempo. NÃO use para servidor público em ação contra ente federativo (foco no RGPS). Cruza com cnis-acerto-indicadores e peticao-previdenciaria."
---

# RPPS na ótica do RGPS

## 1. Quando acionar esta skill

Acione SEMPRE que o segurado do RGPS tiver vínculo com o RPPS (atual ou pretérito), especialmente em casos de necessidade de CTC, contagem recíproca, migração ou desaverbação.

## 2. Marco normativo

A CF/88 no art. 201 §9º assegura a contagem recíproca entre RGPS e RPPS. A Lei 8.213/91 no art. 96 disciplina a contagem. A IN INSS 128/2022 no art. 130 detalha o procedimento. A Portaria SPS 154/2008 padronizou a CTC. A EC 103/2019 alterou regras de migração e tempo.

## 3. Eixos centrais pró-segurado

A contagem recíproca é direito constitucional. Não há vedação para o uso de tempo do RPPS no RGPS, e vice-versa.

A CTC é documento de emissão obrigatória pelo ente público. Negativa configura ato ilegal.

A desaverbação é direito do segurado, exceto se já houver concessão de benefício no regime.

A migração com manutenção do tempo anterior é regra. EC 103 não alterou o direito adquirido.

O abono permanência é direito do servidor que opta por permanecer em atividade. Não é tempo perdido.

## 4. Fragilidades adversárias mais comuns

O ente público recusa emissão de CTC. Refute com art. 96 Lei 8.213 e dever de cooperação.

O INSS recusa averbação de tempo do RPPS. Refute com art. 201 §9º CF.

O INSS aplica fator previdenciário ao tempo do RPPS. Refute com regras específicas de cálculo.

O INSS recusa desaverbação. Refute com direito potestativo do segurado.

## 5. Estratégia processual

A defesa pró-segurado pivota em mandado de segurança contra negativa de CTC pelo ente público, ação ordinária para averbação no RGPS, recurso ao CRPS. Combinar com `base-contagem-reciproca-rgps-rpps`, `peticao-previdenciaria` e `mandado-seguranca-previdenciario`.

## 6. Documentos essenciais

CTC do RPPS. Histórico funcional. Termo de exoneração ou demissão. Comprovação de não recebimento de benefício pelo RPPS. CNIS.

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
