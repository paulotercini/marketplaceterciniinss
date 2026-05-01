---
name: ponte-workflow-cumprimento-sentenca
description: "Workflow pró-segurado de cumprimento de sentença previdenciária, costurando elaboração de cálculos, expedição de RPV ou precatório, IR sobre atrasados, destaque de honorários e impugnação ao cumprimento deficiente do INSS. Use SEMPRE que mencionar workflow cumprimento, pipeline cumprimento, execução previdenciária, RPV precatório, cálculo de atrasados, planilha contadoria, IR atrasados, RRA, deságio JEF, dialeticidade, impugnação cumprimento INSS, descumprimento Tema 1.070, Cecalc Fábrica de Cálculos, destaque honorários, base sucumbencial. Cruza com execucao-cumprimento-previdenciario, impugnacao-cumprimento-concomitantes, peticao-previdenciaria. NÃO use para fase de conhecimento ou recurso de mérito."
---

# Workflow Cumprimento de Sentença

## 1. Quando acionar

Sempre que houver sentença ou acórdão transitado em julgado favorável ao segurado e necessidade de implementação. Inclui RPV, precatório, cumprimento de revisão pelo Tema 1.070/STJ, cumprimento de acordo homologado, impugnação ao cumprimento promovido pelo INSS e execução invertida.

## 2. Pipeline executável

### Passo 1. Triagem do título executivo

Identificar o título. Sentença, acórdão, acordo homologado. Verificar trânsito em julgado e o exato comando do dispositivo.

Acionar `coisa-julgada-previdenciaria` para mapear os limites objetivos e subjetivos da coisa julgada.

Quando houver coisa julgada progressiva (parcela transitada e parcela pendente), acionar `base-cpc-coisa-julgada-progressiva`.

### Passo 2. Cotejo com o CNIS

Acionar `cnis-acerto-indicadores` para conferir o CNIS atualizado contra a planilha do INSS. Identificar vínculos não computados, salários de contribuição divergentes, indicadores PEXT que ainda bloqueiem implementação.

Quando o cumprimento for de revisão pelo Tema 1.070/STJ, acionar `impugnacao-cumprimento-concomitantes` desde já para identificar padrões de descumprimento e contribuições não somadas.

### Passo 3. Cálculo dos atrasados

Acionar `base-juros-correcao-monetaria` para definição dos índices aplicáveis. Considerar Tema 905/STJ, Lei 11.960/2009, IPCA-E, Selic conforme o período.

Acionar `base-cumprimento-sentenca-rpv-precatorio` para regime de pagamento.

Quando houver concomitância de atividades, acionar `base-revisao-atividades-concomitantes-tema1070` para garantir soma correta.

### Passo 4. Tributação

Acionar `tributacao-beneficios-previdenciarios` para IR sobre atrasados (RRA, art. 12-A da Lei 7.713/88, Tema 368/STF). Considerar isenção por doença grave (Súmula 627/STJ, Tema 1373/STF). Verificar tabela vigente na Lei 15.270/2025.

### Passo 5. Honorários

Acionar `honorarios-contrato-previdenciario` para cálculo da base sucumbencial (Tema 1050/STJ, Súmula 111/STJ) e destaque em RPV ou precatório (art. 22 §4º EAOAB).

Acionar `base-cpc-honorarios-sucumbencia-previdenciaria` para fundamentação adicional.

### Passo 6. Estratégia de renúncia

Quando o valor exceder a alçada do JEF, avaliar renúncia ao excedente para garantir RPV mais célere. Acionar `execucao-cumprimento-previdenciario` para análise da estratégia (Tema 1030/STJ, art. 17 §4º Lei 10.259).

### Passo 7. Recursos do INSS

Quando o INSS recorrer parcialmente, acionar `execucao-cumprimento-previdenciario` para checklist de dialeticidade (art. 1.010 III CPC, art. 932 III CPC). Recurso dissociado não merece conhecimento.

### Passo 8. Impugnação ao cumprimento promovido pelo INSS

Quando o INSS apresentar planilha menor que o devido, acionar `impugnacao-cumprimento-concomitantes` para padrões de descumprimento. Verificar se Cecalc validou cálculo do INSS sem cotejo independente.

### Passo 9. Verificações obrigatórias

Devolução de valores via `base-devolucao-valores-irrepetibilidade-tema979-tema1034` quando o INSS pleitear repetição.

Dano moral via `base-dano-moral-previdenciario` quando o atraso ou descumprimento gerar dano moral autônomo.

### Passo 10. Redação da peça e revisão

Acionar `peticao-previdenciaria` para a peça executiva ou impugnação. Acionar `revisao-peticao` para auditoria final.

## 3. Documentos essenciais

Sentença ou acórdão transitado. Carta de Concessão. CNIS atualizado. Planilha do INSS quando houver. HISCRE. Hispag. Comprovantes de pagamento parcial quando houver. Contrato de honorários para destaque.

## 4. Pontos críticos pró-segurado

INSS apresenta cálculo deficiente como regra. Cotejo independente é obrigatório.

Cecalc tem tendência a importar cálculo do INSS sem cotejo. Impugnar com `impugnacao-cumprimento-concomitantes`.

Deságio de 5% no JEF (art. 17 §4º Lei 10.259) é renunciável quando valor cabe na RPV sem renúncia.

IR retido na fonte sobre atrasados deve respeitar RRA. Excesso é repetível.

Honorários sucumbenciais incidem sobre o proveito econômico, observada a Súmula 111/STJ. Destaque em RPV ou precatório é direito do advogado.

Dialeticidade. Recurso do INSS sem impugnar fundamentos específicos é dissociado e não deve ser conhecido.

## 5. Postura

Pró-segurado e pró-advogado integral. Maximizar o valor recebido pelo segurado, garantir destaque dos honorários, refutar deduções indevidas pelo INSS e usar a impugnação como ferramenta ofensiva sempre que o cumprimento for deficiente.
