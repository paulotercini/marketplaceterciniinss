---
name: base-vedacao-novo-requerimento-in203-in208
description: "Vedação de novo requerimento de benefício INSS durante processo em curso e prazo de 30 dias para recurso — regras dos arts. 576-A da IN 128/2022, inseridos pela IN 203/2026 e complementados pela IN 208/2026. Use SEMPRE que mencionar novo requerimento INSS após indeferimento, reapresentação de pedido, reprotocolo de benefício, segundo requerimento mesma espécie, DER reapresentada, prazo para novo requerimento INSS, art. 576-A IN 128, vedação requerimento simultâneo, processo em curso benefício, aguardar decisão INSS, prazo recurso ordinário administrativo, recurso CRPS depois de indeferimento, DER após indeferimento, reapresenta pedido INSS, quando posso pedir de novo, segundo protocolo mesma espécie, IN 203/2026, IN 208/2026. Cruza com base-meu-inss-pat-gerid-fluxo, base-crps-panorama-geral, base-ms-decadencia-omissao-demora, base-incapacidade-b31-temporaria, base-jef-previdenciario."
---

# Vedação de Novo Requerimento durante Processo em Curso — IN 203/2026 e IN 208/2026

## Marco normativo

IN PRES/INSS nº 203, de 24 de abril de 2026, DOU 24/04/2026. Acrescentou o art. 576-A à IN PRES/INSS nº 128/2022. Texto central do caput: "É vedada a apresentação de novo requerimento pelo interessado enquanto houver processo em curso referente à mesma espécie de benefício."

IN PRES/INSS nº 208, de 19 de maio de 2026, DOU 20/05/2026. Complementou o mesmo art. 576-A, consolidando que o interessado somente pode apresentar novo requerimento após a decisão do requerimento anterior e o decurso do prazo de trinta dias para interposição de recurso ordinário administrativo.

Ambas as normas estão em vigor desde suas respectivas datas de publicação.

Revogação conexa: a IN 203/2026 revogou a Resolução 438/2014, que regia o protocolo da Data de Entrada do Requerimento (DER). Os procedimentos de DER passam a seguir exclusivamente a IN 128/2022 e alterações posteriores.

## Hipóteses de aplicação

Primeiro cenário: segurado teve requerimento indeferido e deseja imediatamente reapresentar o mesmo pedido com novos documentos. A IN 203/2026 proíbe. O processo anterior precisa estar encerrado e o prazo recursal de 30 dias precisa ter decorrido, ou o recurso precisa ter sido julgado.

Segundo cenário: segurado tem dois requerimentos da mesma espécie em andamento simultâneo. A vedação obriga o INSS a indeferir o segundo liminarmente.

Terceiro cenário: segurado ingressou com recurso ao CRPS. Enquanto o recurso estiver pendente, o processo está em curso e não cabe novo requerimento da mesma espécie.

Quarto cenário: segurado perdeu o prazo de recurso (30 dias) e aguardou passivamente. Após os 30 dias sem recurso interposto, o prazo se esgota e novo requerimento é cabível.

## Exceções expressas

A norma excepciona dois grupos. O primeiro é o pedido de revisão (pedido de reconsideração), que tem regras próprias e não se confunde com novo requerimento da mesma espécie. O segundo são os benefícios por incapacidade temporária e por incapacidade permanente (arts. 340 e 346 da IN 128/2022), que têm dinâmica de prorrogação e restabelecimento com regras específicas.

Para B31 especificamente, prorrogação (P1) dentro do prazo não é vedada. Restabelecimento após cessação também não é afetado da mesma forma, mas protocolo de novo B31 após indeferimento da mesma espécie sujeita-se à regra se o processo anterior ainda estiver em aberto.

## Riscos identificados

O risco principal é o escritório protocolar novo requerimento antes de expirado o prazo recursal de 30 dias, gerando indeferimento liminar por questão formal, sem análise do mérito. Isso impacta a DIB do benefício futuro e atrasa o direito do cliente.

O segundo risco é deixar o prazo recursal de 30 dias fluir passivamente sem recorrer ao CRPS, perdendo a oportunidade de discutir o indeferimento no âmbito administrativo.

O terceiro risco é confundir a revogação da Resolução 438/2014 com mudança substantiva na DER. A DER continua sendo a data do protocolo e as regras de retroação continuam válidas, mas o procedimento operacional de DER em segundo protocolo precisa ser revisado à luz da nova norma.

## Estratégia administrativa

Ao receber notificação de indeferimento, imediatamente avaliar se há fundamento para recurso ao CRPS. O prazo recursal de 30 dias corre da ciência da decisão. Protocolar o recurso é mais eficaz do que aguardar e reapresentar, porque o recurso mantém o processo em curso e interrompe o prazo prescricional.

Se a decisão for mantida pelo CRPS, somente depois da decisão do recurso inicia o novo prazo de 30 dias para novo requerimento, caso cabível.

Antes de protocolar qualquer novo requerimento, verificar no PAT se há processo anterior da mesma espécie em aberto. Acionar `base-meu-inss-pat-gerid-fluxo` para o fluxo de consulta no PAT.

## Estratégia judicial

Se houver urgência médica ou deterioração do estado de saúde que impeça aguardar o prazo administrativo, MS perante a JEF fundamentado na lesão a direito líquido e certo ao processo administrativo célere. Acionar `base-ms-decadencia-omissao-demora`.

Ação ordinária ou JEF para discussão do mérito do indeferimento, paralelamente ao recurso administrativo quando permitido pelo juízo. Acionar `base-jef-previdenciario`.

## Documentação que o cliente precisa preparar

Para recurso ao CRPS: documentação médica atualizada com CID, assinatura do profissional e registro no conselho, exames complementares datados, atestados com descrição funcional da limitação. Acionar `base-crps-panorama-geral` para o fluxo recursal.

Para novo requerimento após esgotado o prazo: checklist completo de documentos para a espécie pretendida. Verificar qualidade de segurado e carência na nova DER.

## Integração com outras skills do escritório

- `base-meu-inss-pat-gerid-fluxo` para consultar processo em aberto no PAT antes de novo protocolo
- `base-crps-panorama-geral` para recurso ordinário administrativo dentro dos 30 dias
- `base-ms-decadencia-omissao-demora` para MS por mora ou para urgência que impeça aguardar o prazo
- `base-incapacidade-b31-temporaria` para a exceção dos benefícios por incapacidade
- `base-jef-previdenciario` para via judicial paralela ou subsequente

## Link oficial das normas fonte

- IN PRES/INSS nº 208/2026: https://www.legisweb.com.br/legislacao/?id=495991
- IN PRES/INSS nº 203/2026: https://pprev.com.br/in-203-2026-inss-veda-novo-requerimento/
