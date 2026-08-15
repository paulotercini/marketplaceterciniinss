# Limbo Previdenciário. Roteiro Probatório e Cenários

Reference operacional da skill `base-limbo-previdenciario-tema300`. Postura exclusivamente pró-segurado.

---

## 1. O que exatamente precisa ser provado

O Tema 300 da TNU não se aplica por alegação. A 8ª Turma Recursal de São Paulo o afastou por falta de prova, e o filtro que ela usou é o padrão a ser vencido.

São dois fatos constitutivos, e ambos precisam de lastro documental.

**Fato A. A cessação do benefício ou o indeferimento.** Prova-se por carta de concessão, extrato do Meu INSS, comunicado de decisão, DCB no CNIS ou INFBEN. É o fato mais fácil e quase nunca falta.

**Fato B. O impedimento patronal ao retorno.** É onde os casos morrem. Prova-se pelo roteiro do item 2. O Enunciado 302/2026 do TRT7 desdobra esse fato em dois momentos, a comunicação da alta pelo trabalhador e a recusa pela empresa.

Um terceiro elemento é pressuposto e costuma vir de graça. **O contrato permaneceu vivo no período.** Prova-se por CNIS, CTPS Digital, RAIS e PPP.

---

## 2. Roteiro probatório em oito graus

Ordem de força decrescente. Buscar sempre o grau mais alto disponível antes de descer.

### Grau 1. Sentença trabalhista transitada em julgado

Prova soberana. Reconhece o limbo, define o responsável pelos salários e, quando há execução, recompõe a cadeia contributiva.

Foi o que venceu no RI 5001689-93.2024.4.03.6317 da 2ª Turma Recursal de São Paulo. A empregadora recolheu todas as contribuições do período nos autos da RT, o que derrubou a alegação de tempo fictício do INSS.

Juntar a sentença, o acórdão se houver, a certidão de trânsito e a comprovação do recolhimento das contribuições. Acionar `base-reclamatoria-trabalhista-prova-previdenciaria` para o regime de aceitação.

### Grau 2. RAIS com afastamento declarado em período sem benefício

Declaração oficial do empregador ao Ministério do Trabalho. Pela regra D.3 do Manual da RAIS, o afastamento declarado pressupõe concessão pelo INSS. Se não havia benefício, o empregador declarou afastamento previdenciário inexistente.

Somar à remuneração zerada, que pela regra D.3(a) é confissão de que nada foi pago. Detalhamento completo, tabela de códigos e sete teses probatórias em `TABELA-RAIS-AFASTAMENTOS-D2.md`.

### Grau 3. CTPS Digital com contrato marcado como Aberto

Alimentada pelo eSocial, reflete declaração atual da empresa. Vale mais que o CAGED porque não carrega o vício histórico de falha de baixa.

Valor probatório extra quando há eventos posteriores ao afastamento, sobretudo reajustes salariais aplicados durante o período sem trabalho. Reajuste aplicado a quem não trabalha é reconhecimento de que o contrato está vivo.

### Grau 4. PPP com lotação encerrada na data de emissão

PPP emitido com o período de lotação encerrado na data da emissão, e não em data de rescisão, declara o trabalhador como integrante do quadro naquele momento. É declaração da própria empresa, com responsável técnico identificado.

Cruzar com `auditoria-ppp` quando houver também discussão de agente nocivo.

### Grau 5. ASO de retorno concluindo pela inaptidão

Prova típica e a mais intuitiva, porém não indispensável. A empresa frequentemente se recusa a emitir, ou emite e não entrega cópia.

Quando existir, é prova direta do Fato B. Quando não existir, não desistir do caso, subir para os graus 2, 3 e 4 e produzir o grau 6.

### Grau 6. Notificação extrajudicial

Instrumento de construção de prova, não de coleta. Comunica a alta ou o indeferimento e requer o exame de retorno e a reassunção do posto.

Constitui exatamente a prova da comunicação exigida pelo Enunciado 302/2026 do TRT7. Qualquer resposta serve, inclusive o silêncio, desde que documentado por AR ou por certificação de entrega.

Deve ser produzida o quanto antes, de preferência antes de qualquer requerimento administrativo. Acionar `base-notificacao-extrajudicial-mapeamento-institucional`.

### Grau 7. Contribuição sindical recolhida no período sem trabalho

Indício de contrato vivo. Isolado é fraco, somado aos graus 2 a 4 reforça a convergência de fontes.

### Grau 8. E-mails e mensagens com o RH

Prova mais fraca. Foi rejeitada isoladamente pela 8ª Turma Recursal quando tardia e genérica.

Ganha força quando contemporânea ao fato, quando identifica o interlocutor e o cargo, e quando traz recusa expressa. Perde força quando produzida anos depois, às vésperas da ação, o que sugere prova fabricada para o processo.

---

## 3. Cenários típicos

### Cenário A. Contrato ainda vivo, cliente procura o escritório agora

Melhor cenário. Sequência recomendada.

1. Notificação extrajudicial imediata à empresa, comunicando a alta e requerendo exame de retorno e reassunção.
2. Requerimento administrativo instruído com a notificação, o AR e a documentação médica.
3. Avaliar reclamatória trabalhista em paralelo, para produzir a prova do grau 1 e recompor as contribuições.
4. Nunca requerer RAC de baixa do vínculo.

### Cenário B. Contrato já rescindido, limbo pretérito

Cenário comum. A prova do grau 6 não é mais produzível de forma contemporânea, então tudo depende dos graus 1 a 5.

Levantar RAIS de todos os anos-base do período, CTPS Digital completa, PPP e eventual RT já ajuizada. Se houver RT em curso ou transitada, verificar se o limbo foi objeto da causa de pedir.

Atenção ao termo inicial do período de graça, que corre da rescisão. Contar o art. 15 a partir daí, com as prorrogações do §1º e do §2º quando cabíveis. Acionar `periodo-graca-qualidade-segurado`.

### Cenário C. Pensão por morte, instituidor faleceu em limbo

Foi o cenário do precedente favorável da 2ª Turma Recursal. O dependente não vivenciou o limbo e frequentemente desconhece a história funcional do falecido.

Levantar CNIS do instituidor, RAIS, CTPS Digital e eventual RT. Se houver sentença trabalhista, o caso fica muito forte. Acionar `pensao-por-morte` e `ponte-workflow-pensao-por-morte`.

### Cenário D. Incapacidade atual, com limbo pretérito servindo de ponte

O limbo mantém a qualidade de segurado e permite alcançar DII posterior que o INSS considerava fora da manutenção. Cruzar com a DII fixada em perícia, atenção ao Tema 343 da TNU sobre a excepcionalidade de fixar a DII na data da perícia.

Acionar `base-incapacidade-b31-temporaria` ou `base-incapacidade-b91-permanente`, e `auditoria-laudo-pericial`.

### Cenário E. Empregador declarou afastamento como suspensão contratual

Cenário de risco. É a porta de defesa que o próprio voto do Tema 300 abriu.

Verificar se havia benefício ativo no período declarado. Sem benefício não há suspensão legítima por doença. Verificar também se o empregador usou códigos distintos em anos diversos, o que afasta a alegação de erro de preenchimento. Refutação completa no item 6.1 do reference de jurisprudência.

---

## 4. Alerta operacional crítico. Vedação de RAC

**Não protocolar RAC pedindo baixa do vínculo em aberto no CNIS.**

O vínculo aberto é ativo processual. É ele que sustenta a manutenção da qualidade de segurado pelo Tema 300. Encerrá-lo administrativamente destrói a tese e é irreversível na prática.

Esse alerta é exceção expressa à rotina de saneamento da skill `base-cnis-acerto-indicadores`, que em regra manda impugnar registro irregular. Sempre que o diagnóstico de limbo estiver aberto, a rotina de saneamento fica suspensa quanto ao vínculo em questão.

Registrar o alerta na tarefa do cliente no To Do para que nenhum colaborador protocole a RAC por rotina.

---

## 5. Checklist documental do caso de limbo

- CNIS completo com remunerações mês a mês.
- Extrato de vínculos com indicação de vínculo aberto.
- CTPS Digital completa, com todos os eventos.
- RAIS de todos os anos-base do período de limbo.
- PPP emitido pela empregadora.
- Carta de concessão, comunicado de decisão e histórico de benefícios.
- ASO de retorno ao trabalho, se houver.
- Notificação extrajudicial com AR, se houver.
- Documentação médica do período.
- Processo trabalhista integral, se houver.
- Comprovantes de contribuição sindical do período.
- E-mails e mensagens com RH, com data e identificação do interlocutor.

Cruzar com `base-documentos-comprobatorios-in128` para a carta de documentos ao cliente.

---

## 6. Fontes normativas

- Lei 8.213/91, arts. 15, 25, 27-A, 59 a 63, 74 a 80, 118.
- Lei 8.212/91, arts. 30 e 32.
- Decreto 3.048/99, art. 13.
- CLT, arts. 476 e 476-A.
- CPC, art. 373, I e §1º.
- Manual de Orientação da RAIS, itens D.1 a D.4 e E.3.

---

## Cruzamento com outras skills

- `base-limbo-previdenciario-tema300` (skill mãe).
- `periodo-graca-qualidade-segurado`.
- `base-reclamatoria-trabalhista-prova-previdenciaria`.
- `base-rt-ajuizamento-vinculo-previdenciario`.
- `base-cnis-acerto-indicadores`.
- `base-documentos-comprobatorios-in128`.
- `base-cpc-onus-prova-art373`.
- `base-notificacao-extrajudicial-mapeamento-institucional`.
- `tema-1124-instrucao-administrativa`.
- `peticao-previdenciaria`.
