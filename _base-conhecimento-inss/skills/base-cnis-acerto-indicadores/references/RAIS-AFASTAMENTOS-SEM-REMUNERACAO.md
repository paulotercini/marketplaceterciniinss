# RAIS e eSocial. Afastamentos sem Remuneração e Tempo de Contribuição

Roteiro para toda análise de CNIS que traga RAIS, dossiê previdenciário com bloco de afastamentos ou evento S-2230 do eSocial.

## Fundamento

- Tempo de contribuição é o período com contribuição obrigatória ou facultativa (Decreto 3.048/99, art. 19-C). O afastamento sem remuneração do empregado, doméstico ou intermitente conta apenas se houve contribuição facultativa no período (art. 19-C, VIII, c/c art. 11, §5º).
- O salário-maternidade conta (art. 19-C, II). O benefício por incapacidade intercalado com atividade conta como tempo (Lei 8.213/91, art. 55, II) e como carência (Tema 1125 STF; Súmula 73 TNU).
- O segurado suspenso ou licenciado sem remuneração entra em período de graça de 12 meses (Lei 8.213/91, art. 15, II). A qualidade de segurado não se perde de imediato.
- A competência zerada com vínculo aberto entra no PBC pelo salário mínimo, para empregado, doméstico e avulso, salvo jornada parcial ou intermitente (IN 128/2022, art. 223, §§2º e 3º, redação da IN 212/2026).

## Onde localizar

RAIS (até a substituição pelo eSocial), evento S-2230 do eSocial, GFIP e o extrato do CNIS com remunerações mês a mês, inclusive o bloco de ocorrências.

## Tabela 18 do eSocial (motivos de afastamento)

Códigos conforme o leiaute S-1.3, Tabela 18. Fonte de conferência: https://www.gov.br/esocial/pt-br/documentacao-tecnica (a vigência de vários códigos mudou em 19/07/2021; confira a versão vigente na data do afastamento). Código não confere direito por si: o que decide é a remuneração efetivamente paga e registrada.

**Grupo A. Remunerado ou com salário-maternidade (conta).**
15 férias ou recesso; 16 licença remunerada; 17 licença-maternidade; 18 prorrogação Empresa Cidadã; 19 aborto não criminoso; 20 adoção ou guarda judicial; 33 licença-maternidade de 180 dias da Lei 13.301/2016 (até 18/07/2021); 35 antecipação ou prorrogação da licença-maternidade por atestado; 43 prorrogação da Lei 15.156/2025; 53 gestante ou lactante afastada de atividade insalubre sem local salubre (CLT, art. 394-A, §3º).

**Grupo B. Benefício previdenciário.**
01 acidente ou doença do trabalho; 03 acidente ou doença não relacionados ao trabalho; 06 aposentadoria por invalidez. Os 15 primeiros dias são salário pago pelo empregador. O período em benefício conta se intercalado com atividade ou contribuição; requerer o cômputo expressamente.

**Grupo C. Em regra sem remuneração (alerta).**
07 acompanhamento de familiar enfermo; 11 cárcere; 21 licença não remunerada ou suspensão por obrigação legal; 27 suspensão para qualificação (CLT, art. 476-A); 30 suspensão disciplinar (até 18/07/2021); 34 inatividade do avulso por mais de 90 dias; 37 suspensão temporária do contrato (Lei 14.020/2020 e programa de 2021); 38 impedimento de escala do avulso; 41 e 42 qualificação com suspensão (Lei 14.457/2022); 44 suspensão por ajuizamento de rescisão indireta; 45 suspensão para inquérito de falta grave.

**Conferir caso a caso.** 12 e 13 candidatura eleitoral; 22 mandato eleitoral; 24 mandato sindical; 25 vítima de violência doméstica (Lei 11.340/2006, art. 9º, §2º, II); 29 serviço militar obrigatório, que conta por regra própria mediante certidão militar (Lei 8.213/91, art. 55, I; ver `base-servico-militar-obrigatorio`); 05, 10, 31, 39 e 40, próprios de servidor ou empregado público.

## Procedimento

1. Listar cada afastamento: empregador, CNPJ, início, fim, código e descrição.
2. Cruzar com as remunerações mensais do CNIS e com os benefícios do período.
3. Classificar no grupo A, B ou C pela remuneração efetiva, não apenas pelo código.
4. Emitir o alerta abaixo para cada período do grupo C e consolidar o total.
5. Escolher a providência.

```
[ALERTA - TEMPO DE CONTRIBUICAO]
Empregador. [Nome + CNPJ]
Vínculo. [admissão] a [rescisão ou "aberto"]
Afastamento sem remuneração de [data] a [data]
Motivo. [código] - [descrição]
Impacto. [X] meses e [Y] dias não computados para tempo de contribuição e carência.
Providência. [retificação, cômputo do intercalado, prova de remuneração, ajuste da DER]
```

## Providências

- Código lançado errado (ex.: licença-maternidade informada como licença não remunerada): retificação do eSocial pela empresa e RAC de vínculos e remunerações (IN 128/2022, Anexo I-B).
- Remuneração existente mas não informada: RAC com holerites, extratos bancários e CTPS. A omissão do empregador não prejudica o empregado (Lei 8.212/91, art. 30, I; Lei 8.213/91, art. 34, I).
- Suspensão revertida em juízo (códigos 44 e 45) com pagamento de salários: averbar pela sentença trabalhista (`base-rt-ajuizamento-vinculo-previdenciario`).
- Benefício intercalado: requerer o cômputo como tempo e carência.
- Afastamento sem remuneração em curso: o segurado pode contribuir como facultativo no período (Decreto 3.048/99, art. 11, §5º). A filiação facultativa não retroage (art. 11, §3º); para o passado, ajustar a DER e o planejamento.
- Sócio que manteve pró-labore no período: o tempo pode contar como contribuinte individual (`contribuinte-individual-in128`).
- Vínculo aberto com remuneração zerada em caso de alta do INSS e recusa do empregador: não pedir baixa do vínculo; ver `base-limbo-previdenciario-tema300`.

## Integração

`indenizacao-contribuicoes-atraso`, `contribuicoes-complementacao-ec103`, `periodo-graca-qualidade-segurado`, `base-planejamento-previdenciario`, `peticao-previdenciaria`, `base-precedentes-catalogo-vinculantes`.
