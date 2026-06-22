# Escopo da Varredura do DOU — Rotina de Monitoramento

Documento de referência da rotina diária de monitoramento do Diário Oficial da União do escritório Paulo Roberto Tercini Filho.

Define o que a varredura DEVE capturar e o que DEVE descartar. A rotina deve citar este arquivo como fonte do escopo do Passo 4 e do filtro de relevância dos Passos 4 e 5.

Versão definida em 22/06/2026, restringindo a varredura aos benefícios previdenciários (atividade-fim da banca) e eliminando o ruído institucional e administrativo.

---

## Princípio orientador

Só entra no relatório a matéria cujo conteúdo trate de concessão, revisão, cessação, cálculo, prazo ou litígio de benefício previdenciário ou assistencial. Mero aparecimento de termos institucionais não basta.

---

## Termos de busca (cada um isoladamente, sempre secao=DOU1)

### Benefícios e espécies
- "benefício previdenciário"
- "benefício assistencial"
- BPC
- LOAS
- aposentadoria
- "aposentadoria especial"
- "aposentadoria por idade"
- "aposentadoria por incapacidade"
- "pensão por morte"
- "auxílio-doença"
- "auxílio por incapacidade temporária"
- "auxílio-acidente"
- "auxílio-reclusão"
- "salário-maternidade"
- "salário-família"
- "seguro-defeso"

### Concessão, revisão e perícia (afetam diretamente o benefício)
- "perícia médica federal"
- PMF
- PPP
- biometria
- "prova de vida"
- "revisão de benefício"
- "renda mensal inicial"
- RMI
- "acumulação de benefícios"

### Recursal e marcos normativos que mudam regra de benefício
- CRPS
- "Conselho de Recursos"
- "EC 103"
- "Lei 8.213"
- "Decreto 3.048"
- "Decreto 10.410"
- "tema 1102"
- "tema 1124"
- "tema 1117"
- "acordo internacional previdenciário" (prioridade baixa)
- "Mercosul previdenciário" (prioridade baixa)

---

## Termos REMOVIDOS da captura

Os termos abaixo geravam ruído e NÃO devem mais ser usados como gatilho de listagem ampla. Servem apenas como filtro de órgão emissor, não como termo de busca.

- "Previdência Social"
- INSS
- RGPS
- "regime geral"

---

## Filtro de relevância reforçado

Descartar automaticamente, mesmo quando vindo do MPS ou do INSS:

- atos de pessoal e administrativos (posse, nomeação, exoneração, designação, substituição, diárias, extrato de contrato, termo aditivo, licitação, dispensa de licitação)
- custeio, arrecadação, dívida ativa, cobrança e parcelamento sem reflexo no valor do benefício
- gestão patrimonial, alienação de imóveis, dação em pagamento
- aparição da palavra "previdência" em editais de Inep, universidades e conselhos profissionais (filtrar pelo órgão emissor real)

---

## Decisões de fronteira (confirmadas pelo escritório em 22/06/2026)

- BPC/LOAS assistencial — MANTIDO. É atividade-fim da banca.
- Custeio e contribuições — MANTIDO apenas quando afeta valor do benefício (limites de salário-de-contribuição, alíquotas que mudam a RMI). DESCARTADO arrecadação, dívida ativa, cobrança e parcelamento puros.
- Acordos internacionais e Mercosul — MANTIDO, pois afeta totalização e benefício do cliente, porém em prioridade baixa.

---

## Histórico

- 22/06/2026 — Versão inicial. Escopo restringido a benefícios previdenciários a pedido do escritório, com remoção dos gatilhos institucionais amplos e reforço do filtro de relevância.
