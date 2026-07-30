---
name: atendimento-respostas-padrao
description: Respostas padrão do escritório às consultas repetitivas de clientes, com gatilhos de escalação embutidos. Use SEMPRE que mencionar responder cliente, mensagem para cliente, resposta padrão, cliente perguntou, o que responder ao cliente, andamento do processo, quando sai meu benefício, cliente cobrando retorno, cliente ansioso, modelo de mensagem WhatsApp, exigência do INSS explicar ao cliente, resultado da perícia explicar, processo demorando. Cada consulta típica tem núcleo de resposta verdadeira em linguagem simples, e TODA resposta passa antes pela lista de gatilhos de escalação, cliente insatisfeito ou falando em desistir, prazo correndo, honorário em discussão, valores de acordo ou RPV, suspeita de fraude, óbito, contato de outro advogado ou órgão. Presente gatilho, não se responde com padrão, escala ao Paulo pelo semáforo da processos-amanda-administrativo. Cruza com processos-amanda-administrativo, triagem e inss-canais-atendimento. NÃO use para parecer jurídico nem peça processual.
---

# Respostas Padrão de Atendimento com Gatilhos de Escalação

## Para que serve

O escritório recebe as mesmas perguntas todos os dias. Responder cada uma do zero consome tempo e gera resposta desigual. Esta skill dá o núcleo verdadeiro de cada resposta típica, em linguagem simples de WhatsApp, E a trava que impede o erro mais caro do atendimento padronizado, responder com template o que exigia o advogado.

Quem usa. Amanda no dia a dia (integrada ao semáforo da `processos-amanda-administrativo`), André e Ingrid na substituição, e o próprio Claude ao minutar mensagens.

## REGRA UM, os gatilhos de escalação vêm ANTES da resposta

Antes de qualquer resposta padrão, verificar a lista. Presente UM gatilho, a consulta NÃO recebe template. Vai para o Paulo pelo semáforo (VERMELHO), com registro no body da tarefa.

Cliente insatisfeito, alterado, mencionando desistência, troca de advogado, OAB ou reclamação. Prazo processual ou administrativo correndo relacionado à consulta. Honorário em qualquer discussão (valor, desconto, parcelamento, questionamento). Pergunta sobre valores de acordo, RPV, precatório ou atrasados (expectativa de valor só o advogado administra). Suspeita de fraude, documento estranho, dado que não fecha. Notícia de óbito, prisão ou incapacidade civil do cliente. Contato de outro advogado, de órgão público, de perito ou de imprensa. Pergunta cuja resposta verdadeira seria admitir erro do escritório. Terceiro pedindo informação do processo de outra pessoa (LGPD, só o titular ou procurador).

Em dúvida se é gatilho, é gatilho.

## REGRA DOIS, toda resposta padrão é verdadeira e verificada

Nenhuma resposta inventa andamento, prazo ou expectativa. Antes de responder sobre um processo, CONFERIR o processo (To Do, Drive, Meu INSS ou PJe). Nunca prometer resultado nem data que não dependa do escritório. Nunca dizer "está quase" sem base.

## As consultas típicas e o núcleo de cada resposta

### "Como está meu processo?" / "Tem novidade?"

Conferir o andamento REAL antes de responder. Núcleo, informar a última movimentação em linguagem simples, o que ela significa, e qual o próximo passo esperado com o responsável (nós, o INSS ou a Justiça). Sem previsão de data quando não houver prazo legal correndo. Fechar registrando no body `(A): Informado andamento X ao cliente.`

### "Quando sai meu benefício?" / "Quanto tempo demora?"

Núcleo, explicar que o prazo não depende do escritório, informar o prazo NORMATIVO quando existir (45 dias do art. 41-A, § 5º, da Lei 8.213/91 para o primeiro pagamento após concessão, prazos do acordo do RE 1.171.152 por espécie quando aplicável) e o que o escritório faz quando o prazo estoura (cobrança, MS por mora). Jamais chutar data.

### "O INSS me mandou uma carta de exigência, e agora?"

Núcleo, tranquilizar (exigência é pedido de documento, não indeferimento), pedir foto da carta, identificar o documento cobrado e o PRAZO da exigência. Exigência do rol padrão, Amanda cumpre (VERDE). Fora do rol ou prazo apertado, AMARELO ou VERMELHO.

### "Fiz a perícia, e agora?" / "O perito nem me examinou"

Núcleo, agradecer o relato IMEDIATO e colher tudo por escrito (o que o perito perguntou, quanto tempo durou, o que examinou), explicar que o resultado sai pelo Meu INSS ou nos autos e que o escritório monitora. O relato alimenta a `auditoria-laudo-pericial`. Relato de perícia irregular grave, registrar detalhado e marcar AMARELO para o Paulo avaliar impugnação.

### "Meu benefício foi negado" (cliente viu antes do escritório)

Gatilho VERMELHO por definição (indeferimento sempre escala). Núcleo da primeira resposta, acolher sem prometer, "recebemos, o doutor Paulo vai analisar a decisão e retornamos com a estratégia". Nada de opinar sobre chance de recurso no template.

### "Preciso levar algum documento?" / "O que falta de mim?"

Conferir o checklist do benefício (`base-documentos-comprobatorios-in128` e a carta de documentos do cliente). Núcleo, lista curta e específica do que falta DAQUELE cliente, com a forma de envio.

### "Recebi uma ligação/mensagem dizendo que é do INSS"

Núcleo, alertar para golpe, o INSS não liga pedindo dados, senha ou pagamento, orientar a não clicar em link e a encaminhar o print ao escritório. Registrar. Se o cliente já forneceu dados ou pagou, VERMELHO.

### "Posso trabalhar enquanto espero?" / "Posso fazer bico?"

NÃO é template. A resposta depende do benefício (em incapacidade pode derrubar o caso, em aposentadoria comum é indiferente, em auxílio-acidente não prejudica). AMARELO sempre, Amanda registra a pergunta e o Paulo responde.

### "Chegou um valor na minha conta" / "Caiu um pagamento"

Pergunta sobre valores, VERMELHO por regra. Primeira resposta apenas, "vamos conferir a origem do crédito e retornamos hoje".

### Cliente sem resposta há dias cobra retorno

Núcleo, responder NO MESMO DIA ainda que sem novidade, "sem movimentação nova, o processo está em [fase], nós avisamos assim que mudar". Silêncio é o maior gerador de insatisfação, e insatisfação é gatilho VERMELHO. Registrar a cobrança no body.

## Forma das mensagens

Linguagem simples, frases curtas, sem juridiquês, tratamento respeitoso (senhor, senhora, o nome da pessoa). Uma informação por mensagem, no máximo duas. Sem promessa, sem adjetivo de expectativa ("ótima notícia" só quando a notícia É ótima e confirmada). Sem dois-pontos introduzindo lista. Toda mensagem enviada gera registro `(A):` no body da tarefa do cliente.

## Manutenção

Consulta nova que se repetir três vezes ganha entrada nesta skill, com o núcleo aprovado pelo Paulo. Mesma lógica do semáforo, o padrão de hoje nasce da decisão escalada de ontem.

## Integração com outras skills

`processos-amanda-administrativo` para o semáforo e o quadro de delegação. `triagem` para a fila diária. `inss-canais-atendimento` para orientar canal e protocolo. `base-meu-inss-pat-gerid-fluxo` para conferir andamento antes de responder. `orientacao-cliente-pericia` quando a consulta for sobre perícia agendada. NÃO substitui parecer jurídico, peça ou orientação de estratégia, que são do advogado.
