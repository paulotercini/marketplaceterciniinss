# Aposentadoria Especial Pós EC 103/2019 — Fundamentos e Cenários

## 1. Fundamentos normativos

EC 103/2019, art. 21. Regra de transição da aposentadoria especial por pontos. Exige tempo mínimo de 15, 20 ou 25 anos de atividade especial. Pontuação (idade mais tempo de contribuição) de 66, 76 e 86 pontos respectivamente.

EC 103/2019, art. 19, §1º, III. Regra permanente da aposentadoria especial. Idade mínima de 55 anos (risco alto, 15 anos), 58 anos (risco médio, 20 anos) ou 60 anos (risco baixo, 25 anos).

EC 103/2019, art. 25, §2º. Permite a conversão de tempo especial em comum para períodos cumpridos até 13 de novembro de 2019.

Lei 8.213/91, art. 57. Disciplina a aposentadoria especial.

Lei 8.213/91, art. 57, §3º. Considera-se especial o tempo de trabalho permanente em exposição a agentes nocivos acima dos limites de tolerância, de forma habitual e não ocasional.

Lei 8.213/91, art. 57, §8º. Veda o retorno à atividade especial após a concessão.

Decreto 3.048/99, arts. 64 a 69-A. Regulamenta a aposentadoria especial.

## 2. Tabela de pontos da transição (art. 21 EC 103)

Risco alto (15 anos, exposição a agentes classificados como de maior nocividade). Pontuação de 66 pontos em 13 de novembro de 2019, progredindo 1 ponto por ano.

Risco médio (20 anos, exposição a agentes de nocividade intermediária). Pontuação de 76 pontos em 13 de novembro de 2019, progredindo 1 ponto por ano.

Risco baixo (25 anos, exposição a agentes de menor nocividade relativa). Pontuação de 86 pontos em 13 de novembro de 2019, progredindo 1 ponto por ano.

## 3. Cenários operacionais pró-segurado

### Cenário 1 — Metalúrgico com 25 anos de ruído em 13/11/2019

Direito adquirido à aposentadoria especial pré-reforma. Acionar `base-aposentadoria-direito-adquirido` e `base-especial-ruido`.

### Cenário 2 — Metalúrgico com 22 anos em 13/11/2019

Se continuar exposto até 25 anos e atingir 86 pontos (idade mais tempo), elegível pela transição por pontos. Se preferir, converte os 25 anos em comum pelo fator 1,40 (somente períodos até 13/11/2019) e agrega a tempo comum para outras regras. Comparação obrigatória.

### Cenário 3 — Enfermeira com 18 anos de exposição a biológicos em 13/11/2019

Tempo especial de risco médio (20 anos). Para transição por pontos, precisa de 20 anos de exposição mais 76 pontos. Se atingir em 2024, elegível. Se não, converter períodos pré-reforma e aposentar por regra comum. Acionar `base-especial-agentes-biologicos`.

### Cenário 4 — Eletricitário com 10 anos em 13/11/2019

Insuficiente para direito adquirido. Se continuar exposto até 15 anos (risco alto) e atingir 66 pontos, elegível pela transição. Acionar `base-especial-eletricidade-periculosidade`.

### Cenário 5 — Operador de motosserra com 20 anos em 13/11/2019

Exposição a vibração como risco médio. Transição por 76 pontos. Acionar `base-especial-vibracao`.

### Cenário 6 — Químico industrial exposto a hidrocarbonetos

Agente classificado como de alto risco (cancerígeno se ativo na LINACH). Acionar `base-especial-agentes-quimicos` e `base-especial-epi` para refutação.

### Cenário 7 — Frentista exposto a benzeno

Agente cancerígeno LINACH. Aposentadoria especial qualitativa. Tema 1090 STJ afasta neutralização por EPI. Acionar `base-especial-agentes-quimicos`.

### Cenário 8 — Conversão de tempo especial em comum

Segurado com 18 anos de atividade especial (risco baixo) em 13/11/2019. Conversão em comum pelo fator 1,40 = 25 anos e 2 meses de tempo comum equivalente. Agrega à transição comum ou à regra permanente comum.

## 4. Agentes nocivos e classificação de risco

Risco alto. Substâncias químicas cancerígenas (LINACH), radiações ionizantes, amianto, sílica, agentes biológicos em alguns cenários. 15 anos.

Risco médio. Ruído acima dos limites, calor, frio, vibração de corpo inteiro, alguns químicos, biológicos em hospitais e similares. 20 anos.

Risco baixo. Agentes em menor concentração ou nocividade relativa. 25 anos.

A classificação específica depende do quadro anexo ao Decreto 3.048/99 e da jurisprudência consolidada. Em caso de dúvida, aplicar a interpretação mais favorável ao segurado.

## 5. Documentos essenciais

PPP (Perfil Profissiográfico Previdenciário) de cada empregador.
LTCAT (Laudo Técnico das Condições do Ambiente de Trabalho).
SB-40 e DSS-8030 para períodos anteriores à obrigatoriedade do PPP.
CAT (Comunicação de Acidente de Trabalho) se houver nexo acidentário.
NR-15 e quadro de anexos.
PGR (Programa de Gerenciamento de Riscos).
NR-1 item 1.5.7 e plano de ação.
Histórico de saúde do segurado.

## 6. Conversão de tempo especial

Até 13/11/2019. Conversão permitida nos fatores tradicionais.

Homem. Fator 1,40 para risco baixo (25 anos). Fator 1,75 para risco médio (20 anos). Fator 2,33 para risco alto (15 anos).

Mulher. Fator 1,20 para risco baixo. Fator 1,50 para risco médio. Fator 2,00 para risco alto.

Após 13/11/2019. Conversão vedada. Apenas utilização em aposentadoria especial pura.

## 7. Cruzamento com outras skills

Acionar `auditoria-ppp` para cada PPP.
Acionar `base-especial-ruido`, `base-especial-epi`, `base-especial-agentes-quimicos`, `base-especial-agentes-biologicos`, `base-especial-vibracao`, `base-especial-eletricidade-periculosidade` conforme o agente.
Acionar `retificacao-ppp` para notificar empresa.
Acionar `defesa-probatoria-especial` para EPI e prova alternativa.
Acionar `base-aposentadoria-direito-adquirido` para períodos fechados em 13/11/2019.
Acionar `base-aposentadoria-transicao-ec103` e `base-aposentadoria-regra-permanente-ec103` para comparativos.
Acionar `base-calculo-rmi-ec103` para cálculo da RMI.

## 8. Alerta estratégico

Primeiro, sempre iniciar pela auditoria do PPP. Sem PPP auditado, não há cálculo confiável.

Segundo, converter mentalmente o tempo especial em comum e simular aposentadoria por tempo comum pós-reforma. Comparar com aposentadoria especial pura e com direito adquirido se houver.

Terceiro, em caso de indeferimento administrativo por suposta ausência de habitualidade, invocar Tema 211 TNU e Tema 205 TNU.

Quarto, em caso de negativa por EPI eficaz, invocar Tema 1090 STJ e Tema 555 STF. Acionar `base-especial-epi`.
