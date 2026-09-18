# Gestação de Alto Risco e a Dispensa de Carência

Onda 142 (18/09/2026). Conferido em fonte oficial no DOU pelo navegador em 18/09/2026.

## A norma, com texto literal

A **Portaria Interministerial MPS/MS nº 15, de 3 de julho de 2026**, publicada no DOU de 24/07/2026, Seção 1, Edição Extra 138-A, página 4, acrescentou o inciso XVIII ao art. 2º da Portaria Interministerial MTP/MS nº 22, de 31/08/2022. O texto do inciso é apenas "XVIII - gestação de alto risco."

A ementa é o que mais importa para o caso, e vem transcrita na íntegra. "Altera a Portaria Interministerial MTP/MS nº 22, de 31 de agosto de 2022, para incluir a gestação de alto risco no rol de doenças e afecções que isentam de carência a concessão de benefícios por incapacidade no âmbito do Regime Geral de Previdência Social - RGPS, tendo em vista a determinação judicial proferida na Ação Civil Pública nº 5051528-83.2017.4.04.7100."

Assinam Wolney Queiroz Maciel, Ministro da Previdência Social, e Alexandre Rocha Santos Padilha, Ministro da Saúde. O fundamento declarado é o art. 26, II, da Lei 8.213/91, e a vigência começa na data da publicação.

## O achado que as fontes secundárias omitem

A portaria NÃO é iniciativa espontânea do Poder Executivo. Ela cumpre determinação judicial em Ação Civil Pública, e a própria ementa diz isso. Esse dado muda a estratégia, porque a norma administrativa passa a ser o reconhecimento tardio de um direito que a decisão judicial já assegurava antes de 24/07/2026.

Para a segurada que teve benefício indeferido por falta de carência ANTES da publicação, o argumento não se limita à portaria nova. Ele se apoia na decisão da ACP, que é anterior, e no caráter meramente declaratório do ato administrativo que a cumpre.

## O que está confirmado e o que não está

**Confirmado em fonte oficial.** A existência da portaria, a data, o número, o texto do inciso XVIII, a ementa com a menção à ACP e a assinatura dos dois ministros, tudo conferido no DOU em 18/09/2026.

**Não confirmado nesta rodada, e por isso NÃO se afirma em peça sem nova conferência.** O teor e a data da decisão da ACP, a autoria da ação, o alcance territorial e a existência de marco temporal ou de efeito retroativo expresso. A consulta processual do TRF4 bloqueou o acesso automatizado, e as informações que circulam em fontes secundárias, que indicam autoria da Defensoria Pública da União, decisão de janeiro de 2018 e abrangência nacional, convergem entre si mas não foram vistas na fonte primária.

**Consequência prática.** A portaria pode ser citada sem ressalva. A ACP, enquanto não conferida no TRF4, entra como fundamento a confirmar, e o pedido de retroação precisa ser sustentado no caso concreto e não em afirmação genérica de efeito retroativo.

## Os três requisitos que permanecem

A dispensa de carência resolve UM requisito, e o erro mais comum é tratá-la como se resolvesse o benefício. A segurada ainda precisa demonstrar os três.

Primeiro, a qualidade de segurada na data do início da incapacidade, aferida pelo art. 15 da Lei 8.213/91 e pelas prorrogações do período de graça, inclusive as que a IN 212/2026 estendeu a todas as categorias de segurados obrigatórios.

Segundo, a gestação de alto risco comprovada clinicamente, com relatório que descreva a condição que a caracteriza, como hipertensão gestacional, diabetes gestacional, placenta prévia, restrição de crescimento fetal, incompetência istmocervical ou histórico de perdas.

Terceiro, a incapacidade para o trabalho ou para a atividade habitual por mais de quinze dias consecutivos, na forma do art. 59, com recomendação médica de afastamento. Gestação de alto risco sem incapacidade documentada não gera o benefício.

## O que pedir ao médico assistente

O relatório precisa nomear a condição que torna a gestação de alto risco, indicar desde quando, e dizer expressamente que há recomendação de afastamento do trabalho, com o prazo. Deve descrever a limitação em relação à atividade habitual concreta da segurada, e não apenas o diagnóstico obstétrico.

O modelo está em `base-modelo-relatorio-medico-incapacidade-b31-b91-b92`, e a leitura clínica dos documentos cabe ao agente `medico-doencas-graves` quando houver comorbidade associada.

## Cruzamentos

`base-carencia-por-especie-art27a` para a disciplina geral da carência e das isenções do art. 26, II.
`base-incapacidade-b31-temporaria` para o B31 e a fixação da DII.
`base-salario-maternidade-pos-reforma` para a distinção entre o afastamento por incapacidade na gestação e o salário-maternidade, que são benefícios diversos e podem se suceder.
`perspectiva-genero-previdenciario` para a Resolução CNJ 492/2023, porque a negativa de benefício à gestante de alto risco é hipótese típica de exigência formal que recai de modo desigual.
`periodo-graca-qualidade-segurado` para a qualidade de segurada na DII.
