# Aposentadoria Especial Pós EC 103/2019. Fundamentos e Cenários

## 1. Fundamentos normativos

EC 103/2019, art. 21. Regra de transição da aposentadoria especial por pontos. Exige tempo mínimo de 15, 20 ou 25 anos de atividade especial. Pontuação (idade mais tempo de contribuição) de 66, 76 e 86 pontos respectivamente. A IN 128/2022, art. 262, aplica essa regra ao filiado até 13/11/2019. O Decreto 3.048/99, art. 188-P, caput, ressalva a esse segurado o direito de opção pela aposentadoria do art. 64 [CONFERIDO, norma_inss e Planalto, 04/10/2026]. Não foi objeto da ADI 6309 e permanece em vigor.

EC 103/2019, art. 19, §1º, I. Regra permanente da aposentadoria especial, que a IN 128/2022, art. 260, aplica ao filiado a partir de 14/11/2019. Exige exposição de 15, 20 ou 25 anos e carência. As idades de 55, 58 e 60 anos das alíneas a, b e c foram declaradas inconstitucionais na ADI 6309 (STF, Plenário, j. 03/06/2026, Red. p/ acórdão Min. André Mendonça, 6 votos a 5, acórdão no DJe de 02/10/2026) [CONFERIDO, inteiro teor]. O Decreto 3.048/99, art. 64, I a III, e a IN 128/2022, art. 260, I a III, ainda reproduziam essas idades em 04/10/2026. A opção do filiado anterior à reforma por esta regra, agora sem idade, é tese a sustentar, detalhada no alerta de alcance da SKILL.md.

EC 103/2019, art. 25, §2º. Permite a conversão de tempo especial em comum para períodos cumpridos até 13 de novembro de 2019 e a veda para o tempo posterior. Declarado constitucional na ADI 6309, por 9 votos a 2.

Lei 8.213/91, art. 57. Disciplina a aposentadoria especial.

Lei 8.213/91, art. 57, §3º. Exige a comprovação do tempo de trabalho permanente, não ocasional nem intermitente, em condições especiais que prejudiquem a saúde ou a integridade física.

Lei 8.213/91, art. 57, §8º. Veda o retorno à atividade especial após a concessão.

Decreto 3.048/99, arts. 64 a 69 e 188-P. Regulamenta a aposentadoria especial (o art. 70 foi revogado pelo Decreto 10.410/2020).

## 2. Tabela de pontos da transição (art. 21 EC 103)

Atividade de 15 anos (mineração subterrânea em frente de produção). Pontuação fixa de 66 pontos (art. 21, I, da EC 103/2019).

Atividade de 20 anos (amianto; mineração subterrânea afastada da frente de produção). Pontuação fixa de 76 pontos (art. 21, II, da EC 103/2019).

Atividade de 25 anos (demais agentes). Pontuação fixa de 86 pontos (art. 21, III, da EC 103/2019).

A pontuação do art. 21 é fixa. O artigo tem apenas os incisos I a III e os §§ 1º a 3º (apuração de idade e tempo em dias, valor do benefício e servidores), sem progressão. A progressão anual de 1 ponto é do art. 15, e a de 6 meses, do art. 16.

## 3. Cenários operacionais pró-segurado

### Cenário 1. Metalúrgico com 25 anos de ruído em 13/11/2019

Direito adquirido à aposentadoria especial pré-reforma. Acionar `base-aposentadoria-direito-adquirido` e `base-especial-ruido`.

### Cenário 2. Metalúrgico com 22 anos em 13/11/2019

Se continuar exposto até 25 anos e atingir 86 pontos (idade mais tempo), elegível pela transição por pontos. Se preferir, converte em comum pelo fator 1,40 apenas os 22 anos cumpridos até 13/11/2019; os anos posteriores entram sem conversão e se agregam ao tempo comum para outras regras. Comparação obrigatória.

### Cenário 3. Enfermeira com 18 anos de exposição a biológicos em 13/11/2019

Agente biológico é atividade de 25 anos (Portaria DIRBEN 991/2022, art. 285, III). Para a transição, precisa de 25 anos de exposição e 86 pontos. Se não atingir, converter os períodos até 13/11/2019 (fator 1,20) e aposentar por regra comum. Acionar `base-especial-agentes-biologicos`.

### Cenário 4. Eletricitário com 10 anos em 13/11/2019

Eletricidade é atividade de 25 anos. Insuficiente para direito adquirido; para a transição, 25 anos de exposição e 86 pontos, com o risco de a periculosidade não ser aceita após a EC 103. Acionar `base-especial-eletricidade-periculosidade`.

### Cenário 5. Operador de motosserra com 20 anos em 13/11/2019

Vibração é atividade de 25 anos. Transição com 25 anos de exposição e 86 pontos. Acionar `base-especial-vibracao`.

### Cenário 6. Químico industrial exposto a hidrocarbonetos

Atividade de 25 anos. Se o agente for cancerígeno do Grupo 1 da LINACH com CAS e previsto no Anexo IV, avaliação qualitativa (IN 128/2022, art. 298). Acionar `base-especial-agentes-quimicos` e `base-especial-epi` para refutação.

### Cenário 7. Frentista exposto a benzeno

Agente cancerígeno LINACH. Avaliação qualitativa (Tema 170 da TNU). Os EDcl no REsp 2.116.343/RJ (Tema 1090 do STJ) reconhecem os cancerígenos como hipótese excepcional quanto ao EPI. Acionar `base-especial-agentes-quimicos`.

### Cenário 8. Conversão de tempo especial em comum

Segurado com 18 anos de atividade especial (risco baixo) em 13/11/2019. Conversão em comum pelo fator 1,40 = 25 anos e 2 meses de tempo comum equivalente. Agrega à transição comum ou à regra permanente comum.

## 4. Agentes nocivos e classificação de risco

Quinze anos, pelo art. 285, I, da Portaria DIRBEN 991/2022. Mineração subterrânea em frentes de produção, com exposição à associação de agentes físicos, químicos ou biológicos.

Vinte anos, pelo art. 285, II. Exposição ao amianto e mineração subterrânea afastada das frentes de produção, com associação de agentes.

Vinte e cinco anos, pelo art. 285, III, para as demais situações, entre elas cancerígenos da LINACH, radiações ionizantes, sílica, agentes biológicos, ruído, calor e vibração.

A regra é de 25 anos; os tempos de 15 e 20 anos ficam restritos à mineração subterrânea e ao amianto (Anexo IV do Decreto 3.048/99).

## 5. Documentos essenciais

PPP (Perfil Profissiográfico Previdenciário) de cada empregador.
LTCAT (Laudo Técnico das Condições do Ambiente de Trabalho).
SB-40 e DSS-8030 para períodos anteriores à obrigatoriedade do PPP.
CAT (Comunicação de Acidente de Trabalho) se houver nexo acidentário.
PGR (Programa de Gerenciamento de Riscos).
Histórico de saúde do segurado.

## 6. Conversão de tempo especial

Até 13/11/2019. Conversão permitida nos fatores tradicionais.

Homem. Fator 1,40 para risco baixo (25 anos). Fator 1,75 para risco médio (20 anos). Fator 2,33 para risco alto (15 anos).

Mulher. Fator 1,20 para risco baixo. Fator 1,50 para risco médio. Fator 2,00 para risco alto.

Após 13/11/2019. Conversão vedada (art. 25, §2º, da EC 103, constitucional na ADI 6309). Apenas utilização em aposentadoria especial pura.

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

Terceiro, em caso de indeferimento administrativo por suposta ausência de habitualidade, invocar o art. 65 do Decreto 3.048/99 e, em agentes biológicos, os Temas 205 e 211 da TNU.

Quarto, em caso de negativa por EPI eficaz, invocar Tema 1090 STJ e Tema 555 STF. Acionar `base-especial-epi`.
