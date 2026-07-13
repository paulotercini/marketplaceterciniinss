---
name: estilo-mensagens-paulo
description: "Estilo autêntico do Paulo nas mensagens de WhatsApp a clientes, extraído das conversas reais do escritório (corpus calibrado em 13.07.2026 com 23 conversas, incluindo atendimentos feitos pessoalmente pelo Paulo de ponta a ponta). Use SEMPRE que redigir mensagem pronta para cliente na /triagem, na /inicial, em cobrança de documento, aviso de concessão/indeferimento, orientação de perícia ou retorno de andamento. Inclui os antipadrões (chatbot e colaboradores) que NÃO devem ser imitados. Cruza com a seção Mensagens para clientes do CLAUDE.md."
---

# Estilo das mensagens do Paulo (WhatsApp)

## Como este corpus foi construído (confiança)

Exports reais de 23 conversas do WhatsApp do escritório, incluindo conversas que o
Paulo atendeu pessoalmente do início ao fim (Ilson, Cassia, Elísio, Manoel). No
número também atendem o chatbot e os colaboradores, então a autoria foi filtrada,
colaborador assina em negrito no topo (`*Dra. Amanda Garcez:*`, `*André
Dellavechia:*`, `*Ingrid:*`, `*Dr. Marcos:*`), chatbot se revela por template
repetido, menu numerado e resposta instantânea. O que sobra sem assinatura e sem
cara de template é o Paulo. Na dúvida entre dois tons, escolha o mais curto e mais
direto.

## O jeito do Paulo (imitar)

**Sequência de mensagens curtas, não um textão.** O Paulo quebra o assunto em
mensagens de uma ou duas frases, saudação numa, a notícia noutra, o pedido na
seguinte. Exemplo real (sequência), "Boa tarde Ilson, tudo bem?" → "Irei precisar
de um comprovante de endereço recente em nome do senhor" → "Pode enviar uma foto
do comprovante de endereço".

**Saudação com o nome, simples.** "Bom dia Cassia", "Boa noite Ilson, tudo bem?",
"Bom dia, Fernando!". Com cliente mais velho usa "o senhor/a senhora", com os
demais o nome direto.

**A decisão com o porquê, em uma tacada.** Exemplo real, "Está parado. Fiz os
cálculos e só posso dar entrada no processo em setembro pq precisa ultrapassar
aquele limite dos 60 salários mínimos. Se eu entrar com o processo agora com
certeza perderemos, por isso preciso esperar até setembro."

**Números concretos, sempre.** Valor, alíquota e resultado na mesma frase.
Exemplos reais, "Fiz o cálculo. Se mantiver o padrão de contribuições que está
tendo hoje irá aposentar com aproximadamente R$3.100,00." "Hoje a sua contribuição
está sendo sobre R$4.800,00. Se for pagar como individual é 20%, que corresponde a
R$960,00 por mês."

**Estratégia em etapas, traduzida.** Exemplo real, "Em um primeiro momento será
concedida a aposentadoria normal e você já passa a receber os R$3.200,00 que está
previsto e depois fazemos a revisão para aumentar para R$4.300,00, pois essa é
mais demorada e dependerá de perícias."

**Lei citada só quando agrega, e explicada antes.** Primeiro a regra em linguagem
comum ("A Reforma da Previdência em 2019 estabeleceu a regra do descarte..."),
depois, se preciso, a referência ("A lei nova é de 05/05/2022", Lei 14.331/22).
Admite incerteza com naturalidade ("Se não me engano, em 2021 mudaram a lei...").

**Expectativa honesta, inclusive sobre demora.** Exemplo real, "É importante
lembrar que quando sair a aposentadoria não poderá continuar trabalhando no
município, mas isso vai demorar uns 4 anos no mínimo, pois os processos em
Catanduva não andam."

**Pedido de documento flexível e sem burocracia.** Exemplo real, "Você tem
documentos médicos para que possamos comprovar? Pode ser prontuário médico
antigo, audiometrias antigas que já tenha feito, qualquer documento serve."

**Compromisso de retorno explícito, com agenda.** Exemplos reais, "Em minha
agenda deixei anotado para entrar em contato quando a Cassia atingisse o tempo
para pedir a aposentadoria e ela atingiu o tempo." "Irei distribuir o processo e
assim que tiver alguma novidade entro em contato." "Entro em contato em setembro."
"O sistema do INSS não está funcionando para emitir o CNIS. Assim que eu
conseguir fazer o cálculo te aviso."

**Tranquilização direta quando o cliente teme algo.** Exemplo real, "Pode ficar
tranquilo que ninguém do INSS irá avisar o pessoal do banco. E eu também não
avisarei."

**Agendamento objetivo.** "No dia 15 tenho as 10 horas ou as 14 horas. Qual é
melhor?" "Ok, agendado." E cortesia curta, "Desculpa a demora para responder",
"Qualquer dúvida estou à disposição".

**Futuro com "Irei".** Marca dele, "Irei precisar", "Irei distribuir", "irá
aposentar". Contrações naturais aparecem ("pq", "pra"); na mensagem redigida pela
triagem prefira a forma por extenso, mantendo o mesmo ritmo. O modelo canônico do
CLAUDE.md segue como régua, "José, bom dia! Tudo bem? O seu benefício foi
concedido. Em uma semana o INSS divulga a data do primeiro pagamento e eu aviso
assim que souber."

## Antipadrões (NUNCA imitar)

**O chatbot.** Saudação institucional ("Olá! Seja bem-vindo(a) a Advocacia
Previdenciária!"), menus numerados, "nossa equipe jurídica irá analisar",
"Excelente!", "Disponha! Fico feliz em ter ajudado", "conte conosco", pedido de
dados em tom de formulário. Esse tom corporativo NÃO é o Paulo.

**O tom de colaborador assinado.** As mensagens da Amanda, do André e da Ingrid
têm cabeçalho de assinatura e outro registro. A mensagem redigida para o Paulo
enviar não leva assinatura em negrito.

**Vícios de IA.** Parágrafo longo, lista desnecessária, "espero ter ajudado",
explicação que o cliente não pediu, emoji em série. No máximo a cordialidade
natural de um "Tudo bem?".

## Receita da mensagem da triagem

1. Saudação curta com o nome ("Dona Maria, bom dia! Tudo bem?").
2. A notícia ou a decisão com o porquê, em uma ou duas frases, com número
   concreto quando houver (valor, data, prazo).
3. O próximo passo de quem recebe ("me envia por aqui", "passa no escritório",
   "qualquer documento serve").
4. O compromisso de retorno ("assim que sair eu te aviso").
5. Se a mensagem ficar longa, quebre em duas ou três curtas em sequência.
6. Nada de assinatura, nada de menu, nada de juridiquês.

## Manutenção

Corpus nos JSONs do scratchpad da sessão de origem (paulo_corpus_final,
paulo_corpus_novos, paulo_corpus_lote3). Ao receber novos exports, recalibrar os
exemplos reais desta skill e registrar a data.
