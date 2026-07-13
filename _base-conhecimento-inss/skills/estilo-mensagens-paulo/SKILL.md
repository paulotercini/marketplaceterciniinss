---
name: estilo-mensagens-paulo
description: "Estilo autêntico do Paulo nas mensagens de WhatsApp a clientes, extraído das conversas reais do escritório (corpus calibrado em 13.07.2026, exports de 14 conversas). Use SEMPRE que redigir mensagem pronta para cliente na /triagem, na /inicial, em cobrança de documento, aviso de concessão/indeferimento, orientação de perícia ou retorno de andamento. Inclui os antipadrões (chatbot e colaboradores) que NÃO devem ser imitados. Cruza com a seção Mensagens para clientes do CLAUDE.md."
---

# Estilo das mensagens do Paulo (WhatsApp)

## Como este corpus foi construído (confiança)

Exports reais de 14 conversas do WhatsApp do escritório. No número atendem o
chatbot, a Dra. Amanda, a Ingrid, o André e o Dr. Marcos, então a autoria foi
filtrada assim, mensagens de colaborador vêm assinadas em negrito no topo
(`*Dra. Amanda Garcez:*`, `*André Dellavechia:*`, `*Ingrid:*`, `*Dr. Marcos:*`),
o chatbot se identifica por templates repetidos, menus numerados e respostas
instantâneas. O que sobra sem assinatura e sem cara de template é o Paulo. O
corpus autêntico é pequeno e coerente; na dúvida entre dois tons, escolha o mais
curto e mais direto.

## O jeito do Paulo (imitar)

**Curto e direto, uma ideia por mensagem.** Frases curtas, sem preâmbulo, sem
fecho cerimonioso. A mensagem existe para o cliente saber o que aconteceu e o
que fazer.

**Primeira pessoa, com posição.** O Paulo diz o que decidiu e por quê, em
linguagem simples. Exemplo real: "Eu não estou dando entrada nessa ação pq
entendo ser melhor aguardar os votos dos ministros do Supremo que ainda faltam.
Se forem favoráveis a dar certo essa revisão irei fazer sim, mas por enquanto
não é vantajoso pq se perder pode ser que tenha que pagar as custas do processo
e os honorários do advogado do INSS."

**Direito traduzido, sem juridiquês.** Situação processual em termos do dia a
dia. Exemplo real: "Sobre o FGTS ainda está em julgamento no Supremo. Tem 2
votos apenas e os dois são favoráveis, mas como modulação para corrigir os
valores somente daqui pra frente." Outro: "Se realmente seguirem esse
entendimento não vai gerar atrasados pra ninguém."

**Instrução prática com o próximo passo concreto.** Exemplos reais: "Quando
conseguir o laudo médico envia pra mim ou leva no escritório que já daremos
seguimento." "Qualquer dia desses passa lá no escritório novamente que a Amanda
verifica no aplicativo do celular se tem o extrato da Petito." "Iremos precisar
acessar o aplicativo do FGTS do senhor novamente."

**Tom pessoal e próximo, sem formalidade excessiva.** Chama pelo nome, usa
"bom dia/boa tarde" simples, responde no registro do cliente ("Lembro sim").
Contrações naturais aparecem ("pq", "pra"), mas na mensagem redigida pela
triagem prefira a forma por extenso, mantendo o mesmo ritmo. O modelo canônico
do CLAUDE.md vale como régua: "José, bom dia! Tudo bem? O seu benefício foi
concedido. Em uma semana o INSS divulga a data do primeiro pagamento e eu aviso
assim que souber."

**Compromisso de retorno explícito.** Quando depende de algo, o Paulo diz quem
faz e quando avisa ("eu aviso assim que souber", "já daremos seguimento").

## Antipadrões (NUNCA imitar)

**O chatbot.** Saudação institucional ("Olá! Seja bem-vindo(a) a Advocacia
Previdenciária!"), menus numerados, "nossa equipe jurídica irá analisar",
"Excelente!", "Disponha! Fico feliz em ter ajudado", "conte conosco", pedido de
dados em tom de formulário. Esse tom corporativo NÃO é o Paulo.

**O tom de colaborador assinado.** As mensagens da Amanda, do André e da Ingrid
têm cabeçalho de assinatura e outro registro. A mensagem redigida para o Paulo
enviar não leva assinatura em negrito.

**Vícios de IA.** Parágrafos longos, listas desnecessárias, "espero ter
ajudado", explicações que o cliente não pediu, emojis em série. No máximo a
cordialidade natural de um "Tudo bem?".

## Receita da mensagem da triagem

1. Nome do cliente + saudação curta ("Dona Maria, bom dia! Tudo bem?").
2. A notícia ou o pedido em uma ou duas frases, no concreto.
3. O próximo passo de quem recebe ("me envia por aqui", "passa no escritório").
4. Quando houver espera, o compromisso de retorno ("te aviso assim que sair").
5. Nada de assinatura, nada de menu, nada de juridiquês.

## Manutenção

Corpus em `scratchpad` da sessão de origem; ao receber novos exports do Paulo
(idealmente conversas em que ele mesmo atendeu do início ao fim), recalibrar os
exemplos reais desta skill e registrar a data.
