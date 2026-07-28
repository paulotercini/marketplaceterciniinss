---
name: estudo-pre-pericia
description: Gera o ESTUDO PRÉ-PERÍCIA, documento INTERNO do advogado, em tópicos curtos, para conduzir a reunião com o cliente antes da perícia agendada. Não é a orientação entregue ao cliente (essa é a orientacao-cliente-pericia), é o roteiro lido na frente do cliente na reunião de preparação. Use SEMPRE que mencionar estudo pré-perícia, roteiro de reunião antes da perícia, reunião pré-perícia, preparar reunião de perícia, explicar a perícia ao cliente, ponto decisivo da perícia, documento interno de perícia, cópia integral do processo no Drive, OCR Stirling, linha do tempo do processo por ID. Identifica o ponto que decide a perícia do caso concreto por benefício, incapacidade na equação atividade habitual contra limitação, BPC nos domínios da Portaria Conjunta MDS/INSS 2/2015 com barreiras, aposentadoria PCD nos domínios do IF-BrA da Portaria Interministerial 1/2014 com a LBI, auxílio-acidente no nexo entre sequela e redução da capacidade. Cruza com orientacao-cliente-pericia e as skills do benefício. NÃO use para o entregável ao cliente nem para laudo já produzido.
---

# Estudo Pré-Perícia — Roteiro Interno da Reunião com o Cliente

## O que é e o que não é

Documento INTERNO do advogado. Não se entrega ao cliente. É lido em voz alta na reunião de preparação, dias antes da perícia agendada. Por isso a forma manda tanto quanto o conteúdo, tópicos de UMA linha, frases que se falam naturalmente, zero parágrafo longo, zero juridiquês na parte que será verbalizada.

Não confundir com a `orientacao-cliente-pericia`, que produz o documento ENTREGÁVEL ao cliente (WhatsApp ou impresso). As duas peças convivem no mesmo caso, o estudo guia a reunião, a orientação fica com o cliente depois dela. Os references daquela skill (INCAPACIDADE, BPC-LOAS, APOSENTADORIA-PCD, AUXILIO-ACIDENTE, PERICIA-ADMINISTRATIVA) valem como fonte de conteúdo aqui, sem duplicação.

## Princípio que organiza tudo

Cada perícia tem UM ponto que a decide. O estudo existe para que o advogado saiba qual é esse ponto no caso concreto e concentre a reunião nele. Cliente que sai da reunião sabendo explicar o ponto decisivo com as próprias palavras ganha a perícia que o processo permite ganhar. Cliente afogado em dez instruções genéricas esquece todas.

Honestidade radical. A reunião NUNCA ensaia exagero ou simulação. Ensina o cliente a descrever a realidade da limitação dele em linguagem funcional. Perito desmascara teatro, e teatro desmascarado derruba caso tecnicamente forte.

## Etapa zero, OBRIGATÓRIA. Puxar e ler a cópia integral do processo

O estudo NUNCA se redige de memória ou de resumo. A cópia integral do processo fica na pasta do cliente no Google Drive, e a skill SEMPRE a localiza e lê antes de qualquer redação (localizar a pasta por nome ou CPF via search_files, baixar o PDF da cópia integral). Sem a cópia no Drive e sem PDF anexado na conversa, pedir o arquivo e PARAR.

Protocolo de análise do processo, executar na ordem, só avançar após concluir o item anterior.

1. Pedir o PDF se não estiver anexado nem no Drive. Informar o total de páginas por contagem programática.

2. Rodar OCR em português pelo Stirling (localhost:8081) em tudo que estiver sem camada de texto, ANTES de qualquer leitura. Informar quantas páginas exigiram OCR e quais continuaram ilegíveis. Nas ilegíveis, tentar método alternativo e, se falhar, PARAR e avisar o usuário com o número exato das folhas.

3. Montar a linha do tempo com ID de cada ato relevante, da inicial até a última decisão, indicando contestação, provas produzidas, laudo pericial, sentença e recursos já interpostos.

4. Leitura INTEGRAL obrigatória de CNIS, PPP, documentos rurais, laudos e relatórios médicos, laudo pericial judicial, sentença, acórdão, demais decisões e, principalmente, da decisão atacada. Rasura ou dúvida, PARAR e perguntar.

Só depois da etapa zero concluída o fluxo abaixo começa. A linha do tempo e a leitura integral alimentam diretamente as seções 1, 6 e 7 do estudo (o ponto decisivo sai do que o processo REALMENTE contém, os documentos da mão do cliente saem dos IDs reais, e a nota técnica registra o que a leitura revelou de fragilidade).

## Fluxo de trabalho

Primeiro, coletar o caso. Benefício pleiteado, rito (administrativo ou judicial), data e local da perícia, ocupação real do CNIS, documentos médicos dos autos por ID, laudo administrativo anterior se houver. Esses dados saem da etapa zero, não de perguntas ao usuário que o processo já responde.

Segundo, identificar o ponto decisivo pela espécie (mapa abaixo) e pelo caso concreto. O exemplo canônico do escritório, trabalhador de indústria com dor na coluna, o ponto não é a hérnia, é que a função exige ficar em pé e fazer esforço físico, e a coluna impede exatamente isso.

Terceiro, consultar as skills do benefício (relação abaixo) para os detalhes técnicos que o advogado precisa dominar na reunião, ainda que não verbalize todos.

Quarto, redigir o estudo no formato fixo abaixo, uma a duas páginas, e gerar o .docx interno (sem cabeçalho timbrado de peça, é documento de trabalho).

Quinto, quando o usuário pedir, gerar NA SEQUÊNCIA a orientação entregável pela `orientacao-cliente-pericia`, aproveitando o mesmo levantamento.

## Formato fixo do estudo

```
ESTUDO PRÉ-PERÍCIA — [NOME DO CLIENTE]
[Benefício] — Perícia em [data], [local], [rito]

1. O PONTO QUE DECIDE ESTA PERÍCIA
- [uma a três linhas, a equação do caso]

2. O QUE O PERITO VAI AVALIAR
- [três a seis tópicos de uma linha, na ordem provável do exame]

3. O QUE O CLIENTE PRECISA SABER EXPLICAR
- [tópicos de uma linha, cada um começando por um verbo]
- [cada tópico liga uma limitação a uma tarefa concreta]

4. PERGUNTAS PROVÁVEIS E COMO RESPONDER
- Pergunta. [pergunta típica] / Resposta. [núcleo da resposta verdadeira]

5. O QUE NUNCA FAZER
- [três a cinco tópicos, lista negativa da espécie]

6. DOCUMENTOS QUE VÃO NA MÃO DO CLIENTE
- [originais, cópias, caixas de medicamento, por ID quando dos autos]

7. NOTA TÉCNICA DO ADVOGADO (não verbalizar)
- [alertas do caso, fragilidade a monitorar, o que observar no laudo depois]
```

## Mapa do ponto decisivo por benefício

### Incapacidade (B31, B91, B92)

A equação é atividade habitual contra limitação. O perito não avalia doença, avalia se ESTA pessoa consegue exercer ESTA função. A reunião concentra em três coisas. O cliente sabe descrever a própria função em tarefas (quanto tempo em pé, quanto peso, qual movimento repetido). O cliente sabe ligar cada dor ou limitação a uma dessas tarefas. O cliente sabe contar a linha do tempo (quando começou, quando piorou, o que já tentou de tratamento).

Detalhe que muda perícia, condições pessoais. Idade, escolaridade e histórico só de trabalho braçal entram na conversa quando a tese incluir a inviabilidade real de reabilitação (Súmula 47 da TNU).

Em B91, acrescentar o prognóstico, por que não há perspectiva de voltar a nenhuma função compatível. Em acidentário (B91/B92), o nexo com o trabalho entra no roteiro (CAT, NTEP, história do acidente contada sempre do mesmo jeito).

### BPC/LOAS (B87/B88)

O ponto decisivo é o par avaliação médica MAIS avaliação social, nos instrumentos da Portaria Conjunta MDS/INSS 2/2015 (alterada pela Portaria Conjunta 37/2026). Explicar ao cliente, em linguagem simples, que são DUAS conversas, uma com o médico (funções e estruturas do corpo, atividades e participação) e uma com o assistente social (casa, renda, família, barreiras do dia a dia).

A reunião percorre os domínios avaliados com exemplos da vida do cliente, e não com os nomes técnicos. Como sai de casa, como usa transporte, como faz higiene e alimentação, como se comunica, o que na rua, na escola ou no posto de saúde o impede. Cada barreira concreta citada na reunião é ponto no instrumento, cruzar com a matriz de barreiras da `base-lbi-inclusao-barreiras-lei13146`.

Desde a Portaria Conjunta 37/2026, há a terceira pergunta sobre impedimento permanente, irreversível ou irrecuperável. Se o quadro do cliente comportar, a reunião prepara a resposta com naturalidade (o que já se tentou de tratamento e por que não resolveu, o que não está ao alcance dele custear).

Nunca esquecer o outro lado do BPC, a avaliação social alcança renda e composição do grupo familiar. Alinhar com o cliente quem mora na casa e o que dizer com precisão, sem ensaiar inverdade.

### Aposentadoria PCD (LC 142/2013)

O ponto decisivo é que NÃO se trata de incapacidade. O cliente pode estar trabalhando, e isso não prejudica nada. O que se avalia é a DEFICIÊNCIA funcional nos domínios do IF-BrA (Portaria Interministerial AGU/MPS/MF/SEDH/MP nº 1, de 27/01/2014), lida em conjunto com a LBI (Lei 13.146/2015), impedimento em interação com barreiras.

Erro clássico que a reunião existe para evitar, o cliente minimizar a limitação por orgulho ou por medo de parecer incapaz para o emprego atual. Explicar que a avaliação mede a dificuldade COM E SEM os apoios, e que relatar a rotina real (com as adaptações, os ajutórios da família, o esforço extra que ninguém vê) é o que pontua.

Percorrer os sete domínios com exemplos da rotina, sensorial, comunicação, mobilidade, cuidados pessoais, vida doméstica, educação e trabalho, socialização. Preparar também a DID, o cliente precisa saber contar DESDE QUANDO convive com a deficiência, com os marcos que os documentos pretéritos sustentam.

### Auxílio-acidente (B94)

O ponto decisivo é o NEXO em duas pontas. Primeira ponta, a sequela veio do acidente (ou da doença ocupacional), linha do tempo curta e sempre igual. Segunda ponta, a sequela consolidada REDUZ a capacidade para o trabalho que ele exercia, ainda que ele continue trabalhando.

Frase-guia da reunião, "o benefício não exige que o senhor esteja incapaz, exige que o senhor faça o mesmo trabalho com mais dificuldade, mais devagar ou com mais esforço do que antes". O cliente precisa saber dar dois ou três exemplos concretos dessa dificuldade a mais (o que fazia em uma hora e hoje faz em duas, o movimento que evita, a ajuda que passou a pedir).

Cuidado com a armadilha da melhora, o perito pergunta se melhorou. Melhora da DOR não é recuperação da FUNÇÃO. O cliente responde sobre o que consegue e o que não consegue fazer, não sobre como se sente hoje.

### Perícia administrativa e Teleperícia (qualquer espécie)

Quando o ato agendado for administrativo, somar o reference PERICIA-ADMINISTRATIVA da `orientacao-cliente-pericia` e a `base-pericia-medica-federal-telepericia`. Em Teleperícia, a reunião cobre o cenário (lugar iluminado, documentos digitalizados à mão, acompanhante quando necessário) e o direito de recusar o método quando o quadro exigir exame físico.

## Relação de skills por benefício (consultar antes de redigir)

Incapacidade. `base-incapacidade-b31-temporaria`, `base-incapacidade-b91-permanente`, `base-incapacidade-acidentaria-b92`, `analise-documental-incapacidade`, `ntep-nexo-acidentario` e o reference INCAPACIDADE da `orientacao-cliente-pericia`.

BPC. `analise-bpc-loas`, `base-bpc-impedimento-longo-prazo` (com o reference da Portaria Conjunta 37/2026 conferida no DOU), `bpc-renda-grupo-familiar`, `base-lbi-inclusao-barreiras-lei13146` e o reference BPC-LOAS da `orientacao-cliente-pericia`.

Aposentadoria PCD. `aposentadoria-deficiencia`, `base-aposentadoria-pcd-lc142`, `base-pcd-if-bra-metodologia`, `base-pcd-did-retroativa`, `base-lbi-inclusao-barreiras-lei13146` e o reference APOSENTADORIA-PCD da `orientacao-cliente-pericia`.

Auxílio-acidente. `auxilio-acidente-b94`, `base-auxilio-acidente-b94-pos-reforma`, `base-b94-sequela-minima-tema201`, `base-b94-nexo-acidentario-ntep` e o reference AUXILIO-ACIDENTE da `orientacao-cliente-pericia`.

Por patologia, somar a skill temática quando existir (`base-pcd-fibromialgia-lei15176` com o roteiro de individualização da Onda 87, `deficiencia-auditiva-previdenciaria`, TEA nas skills de BPC e PCD).

## Regras invioláveis

Primeira, documento interno. Jamais entregar, enviar ou deixar cópia com o cliente. O entregável é o da `orientacao-cliente-pericia`.

Segunda, tópicos de uma linha na parte verbalizável. Se um tópico precisa de vírgula tripla, ele vira dois tópicos.

Terceira, nunca ensaiar mentira, exagero ou teatro. A preparação lícita ensina a descrever a verdade em linguagem funcional.

Quarta, dados do cliente ficam no documento do caso. Nunca registrar nome ou dado de cliente em skill ou memória permanente.

Quinta, o estudo é personalizado. Se o texto sobrevive à troca do nome do cliente, ele não está pronto.

Sexta, português correto do padrão do escritório, sem dois-pontos introduzindo lista na prosa.

## Nota de grafia (registro de manutenção)

A portaria do IF-BrA aparece na base ora como "Portaria Interministerial AGU/MPS/MF/MP/PR nº 1, de 27/01/2014", ora como "Portaria Interministerial AGU/MPS/MF/SEDH/MP nº 1, de 27/01/2014" (grafia usada pelo usuário e comum na literatura). É a MESMA norma. Pendência de uniformização futura pela grafia do texto oficial, a conferir na fonte primária.

## Integração com outras skills

`orientacao-cliente-pericia` gera o entregável do cliente na sequência. `triagem-caso` fornece o dossiê quando o caso veio da fila. `auditoria-laudo-pericial` entra DEPOIS da perícia, sobre o laudo produzido, e a nota técnica do estudo (seção 7) alimenta os quesitos dela. `relatorio-medico-assistente` quando a reunião revelar que falta relatório do médico assistente.
