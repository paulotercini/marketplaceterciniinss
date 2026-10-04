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

### Pedido de documentos ao cliente (Onda 164, 02/10/2026)

O titular comparou duas listas de documentos para o mesmo caso de pensão por morte. A gerada pelo plugin falava com o juiz, chamava a cliente de "autora", citava artigo da IN 128/2022, número de benefício e de requerimento, tinha treze itens e expunha à cliente a suspeita sobre a data de um atestado e o histórico de tentativas de suicídio. A gerada pelo ChatGPT falava com a cliente pelo nome, explicava em uma frase o que precisava ser provado e trazia sete itens com o lugar onde obter cada documento. O titular aprovou a segunda forma, e ela é o padrão.

O pedido de documentos ao cliente segue sete regras. Primeira, fala com a pessoa pelo nome, em "você" ou "a senhora", com saudação curta. Segunda, diz em uma ou duas frases o que precisa ser provado e por quê, sem artigo de lei, sem número de benefício e sem número de requerimento. Terceira, diz qual é a prioridade, quantos documentos e de que período. Quarta, traz no máximo sete itens numerados, cada um com o documento, onde se consegue e o período exigido. Quinta, só entra o que o cliente consegue obter, e o que o escritório obtém sozinho, como a cópia do processo administrativo, as comunicações do Meu INSS e o CNIS, fica na anotação interna da tarefa. Sexta, nenhuma estratégia, suspeita ou divergência é explicada ao cliente, e o documento é pedido sem o motivo interno. Sétima, nenhum dado sensível desnecessário aparece na mensagem, e o pedido de documentos médicos usa termos neutros, como relatórios e receitas médicas de determinado período.

A linguagem é a do cliente. Escreve-se "morava com sua mãe" e "ajudava no seu sustento", e não "residência comum" e "dependência econômica". Os dois-pontos antes da lista são admitidos.

**Modelo aprovado, com os dados do caso substituídos por marcadores.**

> [Nome], bom dia! Tudo bem?
>
> Para pedir a pensão por morte, precisamos comprovar que você dependia financeiramente da sua mãe, e essa prova não foi feita quando você fez o pedido ao INSS.
>
> Fiz uma relação dos documentos que podem ajudar. Veja, por favor, quais deles você consegue obter. O mais importante é conseguirmos pelo menos dois documentos que mostrem que vocês moravam juntas e que sua mãe ajudava no seu sustento, de preferência entre [mês e ano] e [mês e ano].
>
> 1. Prontuário da internação na [hospital], principalmente se constar seu endereço ou sua mãe como responsável ou acompanhante. Você pode pedir esse prontuário no próprio hospital.
> 2. Notas de farmácia e recibos de consultas médicas pagos pela sua mãe, entre [ano] e [ano].
> 3. Declaração de Imposto de Renda da sua mãe, caso você constasse como dependente.
> 4. Plano de saúde, seguro de vida, plano funerário ou outro cadastro em que você apareça como dependente ou beneficiária dela.
> 5. Contas, boletos, faturas ou correspondências em seu nome no endereço [endereço], entre [ano] e [ano].
> 6. O atestado médico original que foi apresentado ao INSS.
> 7. Nome, RG, CPF e endereço de até três pessoas, como vizinhos, amigos ou colegas, que saibam que você morava com sua mãe e que ela ajudava no seu sustento. Parentes próximos não podem ser testemunhas.
>
> Veja o que você tem ou consegue obter e me avise, por favor.

O modelo corrige dois defeitos do texto original do ChatGPT. O item das testemunhas pedia parentes e, na frase seguinte, os excluía, e o original trazia a concordância "precisa ser documentos". Os parentes que não podem depor estão no art. 447, § 2º, I, do CPC, e a regra deve ser conferida no MCP `normas` antes de constar de peça.

### "Recebi uma ligação/mensagem dizendo que é do INSS"

Núcleo, alertar para golpe, o INSS não liga pedindo dados, senha ou pagamento, orientar a não clicar em link e a encaminhar o print ao escritório. Registrar. Se o cliente já forneceu dados ou pagou, VERMELHO.

### "Posso trabalhar enquanto espero?" / "Posso fazer bico?"

NÃO é template. A resposta depende do benefício (em incapacidade pode derrubar o caso, em aposentadoria comum é indiferente, em auxílio-acidente não prejudica). AMARELO sempre, Amanda registra a pergunta e o Paulo responde.

### "Chegou um valor na minha conta" / "Caiu um pagamento"

Pergunta sobre valores, VERMELHO por regra. Primeira resposta apenas, "vamos conferir a origem do crédito e retornamos hoje".

### Cliente sem resposta há dias cobra retorno

Núcleo, responder NO MESMO DIA ainda que sem novidade, "sem movimentação nova, o processo está em [fase], nós avisamos assim que mudar". Silêncio é o maior gerador de insatisfação, e insatisfação é gatilho VERMELHO. Registrar a cobrança no body.

## Forma das mensagens

Linguagem simples, frases curtas, sem juridiquês, tratamento respeitoso (senhor, senhora, o nome da pessoa). Uma informação por mensagem, no máximo duas. Sem promessa, sem adjetivo de expectativa ("ótima notícia" só quando a notícia É ótima e confirmada). Dois-pontos admitidos antes de lista. Pedido de documentos segue o modelo da seção própria acima. Toda mensagem enviada gera registro `(A):` no body da tarefa do cliente.

## Manutenção

Consulta nova que se repetir três vezes ganha entrada nesta skill, com o núcleo aprovado pelo Paulo. Mesma lógica do semáforo, o padrão de hoje nasce da decisão escalada de ontem.

## MCPs da casa

Pesquisa obrigatória (Onda 169). Nenhuma norma, súmula, tema, enunciado ou acórdão citado nesta skill entra em peça, parecer ou orientação sem passar antes pelo MCP próprio, e nenhum MCP autoriza sozinho a marca [CONFERIDO]. O achado nasce [NÃO CONFIRMADO] e só sobe a [CONFERIDO] depois de lido na fonte oficial, na forma de `pesquisa-jurisprudencia-chrome`.

Legislação. O dispositivo se transcreve do MCP `normas`, por `obter_artigo` no identificador da norma e no número do artigo (exemplo, `lei-8213-1991` e `57`), lendo o campo `texto` e a última ocorrência de cada parágrafo, e a redação de outra época se lê por `redacao_na_data`. A IN 128/2022 se confere também pelo `norma_inss` do MCP `iurisprudencia`, que versiona parágrafo a parágrafo e já traz alterações ausentes da base local, como as da IN PRES/INSS 212/2026. Norma ausente das duas bases exige a fonte oficial a cada uso.

Jurisprudência. Tema, súmula e enunciado se conferem primeiro no catálogo `base-precedentes-catalogo-vinculantes` e no catálogo complementar da `auditoria-citacoes`, com atenção ao homônimo de outra corte. Enunciado do CRPS se lê em `enunciados_pleno_inss_crps`, na redação vigente e nas anteriores. Acórdão da TNU se localiza em `buscar_acordaos_tnu`. Acórdão do TRF3 e das Turmas Recursais se localiza em `buscar_acordaos_trf3`, na base local, e em `buscar_acordaos_trf3_jef`, consulta ao vivo. Ação civil pública que o INSS cumpre se lê no `norma_inss`, Portaria Conjunta 94/2024.

Acervo do escritório. O que o escritório já sustentou se lê no MCP `acervo`, por `buscar_tese_acervo`, `obter_trecho_acervo` e `precedentes_do_acervo`, cujo campo `corte` evita o homônimo. Detalhe em `base-acervo-escritorio`.

**Vedação.** O acervo existe para o advogado LER o que já sustentou. Reaproveitamento automático de texto de um cliente em peça de outro é VEDADO. O trecho é ponto de partida para redação nova, conferida contra os autos e contra a legislação vigente na data. O trecho é anonimizado, e o arquivo de origem não é.

Protocolo completo, coberturas e limites medidos em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs".

Entrega no chat (Onda 171). O achado chega ao titular pela corrente e pelo órgão, sem número de processo, relator ou data, em até três parágrafos e com no máximo três dados concretos. A lista completa, com a marcação de cada item, vai em planilha anexa e na peça, na forma de `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração com outras skills

`processos-amanda-administrativo` para o semáforo e o quadro de delegação. `triagem` para a fila diária. `inss-canais-atendimento` para orientar canal e protocolo. `base-meu-inss-pat-gerid-fluxo` para conferir andamento antes de responder. `orientacao-cliente-pericia` quando a consulta for sobre perícia agendada. NÃO substitui parecer jurídico, peça ou orientação de estratégia, que são do advogado.

## Origem no atendimento transcrito (Onda 125)

Quando a resposta ao cliente nascer de atendimento gravado, a `transcricao-atendimento` roda antes e devolve o que foi efetivamente orientado e solicitado. A resposta padrão se constrói sobre esse registro, e não sobre a memória da conversa.
