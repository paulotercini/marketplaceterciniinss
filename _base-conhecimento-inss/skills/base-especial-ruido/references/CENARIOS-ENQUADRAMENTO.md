# Cenários de Enquadramento do Ruído

Operacionalização do Comunicado CRPS 99/2025 combinada com o Tema 174 TNU, o Tema 317 TNU e a revisão do Enunciado 13 do CRPS de 09/12/2024.

## Cenário 1 — Indicação isolada da NHO-01

O PPP traz, no campo 15.5, "NHO-01" sem menção a NEN. A tese de defesa do segurado é que essa indicação basta, porque o NEN é inerente à metodologia da NHO-01. Esta é a posição firmada pelo CRPS após a revogação do inciso III do Enunciado 13 em 09/12/2024 e compatível com o Tema 174 TNU.

Postura processual recomendada é afirmar a presunção de regularidade da medição e, em caso de impugnação pelo INSS, devolver o ônus probatório para a autarquia demonstrar que houve ruptura metodológica.

## Cenário 2 — Indicação isolada do NEN

O PPP traz, no campo 15.4, o valor em dB(A) identificado como NEN, mas o campo 15.5 não menciona norma técnica. A tese do segurado é que o NEN é tecnologia rastreável à NHO-01, sendo ilegítima a recusa pelo simples fato de a norma técnica não estar nominada.

O Tema 317 TNU não derroga essa tese. A exigência do Tema 317 é que a "dosimetria" ou "dosímetro" não baste como informação, mas o NEN, como grandeza normalizada, já pressupõe metodologia específica.

## Cenário 3 — NEN combinado com indicação da NHO-01

Cenário ideal para o segurado. Há NEN no campo 15.4 e NHO-01 no campo 15.5. Pedido de enquadramento deve ser deferido de plano. Em caso de indeferimento, cabe recurso administrativo com citação direta ao Comunicado CRPS 99/2025 e ao Enunciado 13 do CRPS na redação vigente.

## Cenário 4 — NR-15 acompanhada de NEN expresso

O PPP menciona NR-15 no campo 15.5 e indica NEN no campo 15.4. A tese do Tema 174 TNU se aplica plenamente. A exigência do PEDILEF 0001717 é atendida, pois a NR-15 por si só não normaliza para jornada de 480 minutos, mas, havendo NEN expresso, a normalização foi feita e o segurado pode invocar a presunção relativa de regularidade.

Em recurso, citar o PEDILEF 0001717, reforçando que a menção à NR-15 gera presunção relativa de regularidade cabendo ao INSS provar a irregularidade.

## Cenário 5 — Ruído em faixa limítrofe com jornada superior a 480 minutos

O PPP traz exposição a ruído na faixa de 82 a 85 dB(A) sem normalização, e o segurado cumpria habitualmente jornada superior a 480 minutos em virtude de horas extras. A tese do segurado é pedir a normalização pela fórmula da NHO-01.

A fórmula aplicada é a seguinte, em texto corrido.

NEN igual a NE mais dez vezes o logaritmo na base dez do quociente entre o tempo de exposição em minutos e quatrocentos e oitenta.

Para jornada de dez horas, ou seja, seiscentos minutos, o acréscimo é de aproximadamente um vírgula noventa e sete decibéis. Assim, um NE declarado de 83,5 dB(A) se transforma em NEN de aproximadamente 85,5 dB(A), ultrapassando o limite de 85 dB(A) e configurando especialidade.

Documentação probatória requerida inclui contracheques com valores de horas extras pagas, folhas de ponto com registro de jornada efetiva, CNIS com vínculo correspondente e, se for o caso, Reclamação Trabalhista reconhecendo horas extras habituais.

## Cenário 6 — Menção exclusiva a "dosimetria" ou "dosímetro" no campo 15.5

Cenário mais frágil para o segurado, pois o Tema 317 TNU fixou que essa menção não é suficiente para presumir o atendimento à NHO-01 ou à NR-15. Estratégia recomendada em etapas.

Etapa primeira é identificar no próprio PPP campo 15.4 se a grandeza é NEN. Se for, aplicar tese do cenário 2.

Etapa segunda é apresentar o LTCAT e o PGR ou PPRA como documentos complementares, demonstrando a metodologia utilizada no laudo ambiental. A skill `documentos-comprobatorios-in128` tem o rol.

Etapa terceira é, se a prova documental não resolver, oficiar a empresa para retificação do PPP. A skill `retificacao-ppp` automatiza o expediente.

Etapa quarta é pedido de perícia indireta por similaridade, com invocação do art. 369 e art. 370 CPC e dos Enunciados 91 e 225 FONAJEF. Skill `defesa-probatoria-especial` cobre esse ponto.

## Cenário 7 — Exposição mista com múltiplos agentes

O PPP declara ruído concomitante a outros agentes, como vibração, calor ou químicos. A tese do segurado é que a especialidade se configura pelo agente predominante, sem exigência de demonstração isolada para cada um. A anotação no campo 15.4 do agente ruído acima do limite é suficiente, mesmo que o PPP registre concomitância com agentes qualitativos.

## Cenário 8 — Período de laudo extemporâneo

O INSS recusa o PPP afirmando que o LTCAT foi emitido em data posterior ao período laborado. A tese do segurado é que o laudo extemporâneo é válido quando demonstra que as condições ambientais se mantiveram estáveis no período, conforme Súmula 68 TNU.

A skill `retificacao-ppp` contém modelo de oficio à empresa para obtenção de laudo com retroatividade expressa.

## Roteiro de aplicação

Ao receber um PPP de ruído, siga a ordem.

Primeiro, identifique o período de prestação laboral e situe na evolução normativa em `EVOLUCAO-NORMATIVA.md`.

Segundo, identifique o cenário aplicável acima.

Terceiro, verifique a jurisprudência em `JURISPRUDENCIA.md`.

Quarto, monte a tese de superação conforme `TESES-REFUTACAO-INSS.md`.

Quinto, acione `auditoria-ppp` para a auditoria técnica e `peticao-previdenciaria` para a redação da peça.
