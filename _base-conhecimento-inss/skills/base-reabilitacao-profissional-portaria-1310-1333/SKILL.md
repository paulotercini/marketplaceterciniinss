---
name: base-reabilitacao-profissional-portaria-1310-1333
description: "Skill base sobre Reabilitação Profissional do INSS regulada pelas Portarias DIRBEN/INSS 1.310/2025 e 1.333/2026, com defesa do segurado contra cessação prematura, suspensão indevida, encerramento abusivo do PRP, recusa de encaminhamento e conversão administrativa de B31 em B91. Use SEMPRE que mencionar reabilitação profissional, RP, PRP, Portaria DIRBEN 1.310/2025, Portaria DIRBEN 1.333/2026, justificativa de faltas em até 7 dias, recusa abandono RP, suspensão 60 dias RP, suspensão recluso, encerramento PRP, retorno ao trabalho, encaminhamento à PMF, agendamento convocatório, não necessita RP, conversão B31 em B91, alta sem reabilitação, art. 89 e 92 da Lei 8.213/91, art. 62 §2º Lei 8.213, certificado de reabilitação, função compatível, mercado de trabalho, equipe de reabilitação. Hub específico para teses pró-segurado em RP. Cruza com mandado-seguranca-previdenciario e peticao-previdenciaria. NÃO use para auxílio-doença comum, aposentadoria por incapacidade isolada ou BPC."
---

# Reabilitação Profissional pelas Portarias DIRBEN/INSS 1.310/2025 e 1.333/2026

## 1. Quando acionar esta skill

Acione SEMPRE que o caso envolver a reabilitação profissional regulada pelas Portarias DIRBEN/INSS 1.310/2025 e 1.333/2026. A skill é hub do regime atualizado da RP, com olhar exclusivamente pró-segurado.

## 2. Marco normativo

A skill consolida a Lei 8.213/91 nos arts. 62, 89 a 93, o Decreto 3.048/99 nos arts. 136 a 141, e principalmente as Portarias DIRBEN/INSS 1.310/2025 e 1.333/2026, que disciplinam o Programa de Reabilitação Profissional (PRP), o encaminhamento à PMF, o agendamento convocatório, a justificativa de faltas, a recusa, o abandono, a suspensão e o encerramento.

## 3. Eixos centrais pró-segurado

A justificativa de faltas em até 7 dias é direito do segurado. O INSS não pode encerrar o PRP por falta única sem oportunizar a justificativa.

A recusa e o abandono autorizam suspensão por 60 dias e não encerramento imediato. O encerramento direto sem prazo de retorno é nulidade processual sanável por mandado de segurança.

A suspensão de 60 dias do recluso decorre dos arts. 14 e 29, §2º A e B, das Portarias DIRBEN, e não autoriza cancelamento do benefício de origem.

O retorno ao trabalho com função compatível encerra o PRP com certificado, nos termos do art. 53, e gera aposentadoria se não houver função compatível em mercado.

A "não necessita de RP" exige fundamentação técnica. Nas conclusões puramente médicas, sem avaliação social e funcional, o ato é nulo por violação ao art. 89 da Lei 8.213/91.

A conversão administrativa de B31 em B91 deve ocorrer quando comprovada a impossibilidade de reabilitação, sem necessidade de novo requerimento, sob pena de obstaculização indevida pelo INSS.

## 4. Fragilidades adversárias mais comuns

O INSS encerra o PRP sem encaminhar à PMF, sem avaliação social, ou apenas com base em conclusão genérica do médico perito. Isso viola o caráter multidisciplinar do art. 89 da Lei 8.213/91 e o art. 62 §2º.

O INSS também extingue o benefício antes do encerramento formal do PRP, gerando limbo previdenciário. Há precedente firme de que a alta deve ser precedida de certificado de reabilitação ou aposentadoria, sob pena de manutenção judicial do benefício.

## 5. Estratégia processual

A defesa pró-segurado pivota em mandado de segurança contra ato de encerramento abusivo, ação ordinária para conversão de B31 em B91, e recurso ao CRPS contra cessação prematura. Combinar com as skills `base-incapacidade-b91-permanente`, `base-pericia-medica-federal-telepericia` e `base-ms-liminar-art7-iii`.

## 6. Documentos essenciais

Reúna o agendamento convocatório, comprovantes de comparecimento, atestados de justificativa de faltas, parecer da equipe multidisciplinar, função identificada como compatível, certificado de reabilitação se houver, e relatório de retorno ao trabalho.

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
