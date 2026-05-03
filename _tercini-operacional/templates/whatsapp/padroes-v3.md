# Templates de Mensagens WhatsApp

## Padrão Operacional do Escritório

**Advocacia Previdenciária**
Paulo Roberto Tercini Filho — OAB/SP 331.110
Monte Alto/SP

*Versão 3 — Consolidação de 39 conversas reais — 20 blocos | 173 templates*

---

## Sumário

A organização segue 20 blocos. Cada bloco reúne templates relacionados a uma situação específica do atendimento previdenciário.

- Bloco I — Bot e Triagem Inicial — 15 templates
- Bloco II — Saudações Humanas — 5 templates
- Bloco III — Agendamento e Confirmação de Consulta — 14 templates
- Bloco IV — Comunicação Sobre Perícia — 14 templates
- Bloco V — Documentos Médicos e Solicitações — 11 templates
- Bloco VI — Concessão, Cessação e Prorrogação — 9 templates
- Bloco VII — Pagamento e Atrasados — 12 templates
- Bloco VIII — Indeferimento Administrativo — 6 templates
- Bloco IX — Análise Técnica de Aposentadoria — 7 templates
- Bloco X — Cumprimento de Sentença e Implantação — 7 templates
- Bloco XI — Operações Acessórias (gov.br, GPS, FGTS) — 13 templates
- Bloco XII — PPP, CTC e Documentos da Empresa — 7 templates
- Bloco XIII — Aviso e Resposta a Golpes — 8 templates
- Bloco XIV — Transferência Interna — 7 templates
- Bloco XV — Encerramentos Cordiais — 5 templates
- Bloco XVI — Recursos e Acompanhamento Judicial — 8 templates
- Bloco XVII — Detecção e Resposta a Golpe Sofisticado — 6 templates
- Bloco XVIII — Servidor Público, Direitos PCD e Cota — 4 templates
- Bloco XIX — Indicações, Procuração e Outras Áreas — 7 templates
- Bloco XX — Boas Práticas de Uso dos Templates — 8 templates

---

## Introdução

Esta versão consolida os padrões de mensagens do escritório no atendimento via WhatsApp a partir de trinta e nove conversas reais com clientes. Os templates estão organizados por finalidade. Cada bloco identifica quando usar a mensagem, traz o texto-modelo com placeholders entre chaves duplas e indica variantes ou observações de uso.

Os placeholders devem ser substituídos manualmente antes do envio. Os campos mais frequentes são {{NOME}}, {{TRATAMENTO}} para usar "senhor" ou "senhora", {{TRATAMENTO_POSSESSIVO}} para "seu" ou "sua", {{DATA}}, {{HORARIO}}, {{VALOR}}, {{CIDADE}} e {{BANCO}}. Os campos {{ATENDENTE}} e {{TURNO}} acomodam respectivamente a voz que assina e a saudação adequada ao horário.

Os templates preservam o estilo coloquial natural do WhatsApp da equipe. Esse estilo difere do estilo técnico exigido nas peças processuais e foi mantido propositalmente para que a comunicação com o cliente continue acessível.

As vozes do escritório identificadas são Dr. Paulo Tercini, Dra. Amanda Garcez, Dr. Marcos, André Dellavechia, Ingrid, Luana e Beatris (estas duas últimas em registros mais antigos). Cada voz tem assinatura própria no modelo asterisco-Nome-dois-pontos-asterisco, com linha em branco antes do conteúdo.

Convenções operacionais. Dr. Paulo Tercini reside em Matão e atende presencialmente no escritório de Monte Alto preferencialmente às quartas-feiras. Em outros dias, costuma atender por ligação telefônica agendada ou por mensagem. Atendimentos presenciais com Dr. Paulo, portanto, devem ser ofertados como primeira opção em quartas-feiras.

Dra. Amanda Garcez concentra o atendimento jurídico de incapacidade, BPC e acompanhamento processual. Dr. Marcos atua em casos do CRPS, em comunicações rápidas sobre alertas e pagamentos, e em alguns atendimentos diretos. André Dellavechia e Ingrid são as primeiras vozes humanas após o bot, voltadas a triagem e agendamento.

O escritório fica na Rua Rui Barbosa, 663, Centro, Monte Alto-SP, em frente ao INSS. O telefone fixo é (16) 3242-2908. Há períodos em que o telefone fixo fica inoperante e o atendimento se concentra integralmente no WhatsApp.

---

## Bloco I — Bot e Triagem Inicial

### 1.1 — Boas-vindas com solicitação de nome

**Quando usar.** Primeira mensagem do cliente que ainda não está cadastrado.

> Olá, seja bem-vindo(a) a *Advocacia Previdenciária*!
>
> Prestamos atendimento jurídico previdenciário especializado em benefícios e serviços do INSS.
>
> Aqui sua questão previdenciária é analisada com atenção e você recebe orientação clara para seguir com segurança.
>
> Informe seu nome completo para que possamos iniciar o atendimento.

### 1.2 — Menu principal padrão

**Quando usar.** Após cliente informar nome ou em retornos de cliente já cadastrado.

> Olá, bem-vindo(a) à *Advocacia Previdenciária*.
>
> ⚠️ *ATENÇÃO com o golpe do falso advogado. Não solicitamos PIX, depósito ou transferência para liberação de valores* ⚠️
>
> Atendemos de *segunda a sexta-feira, das 07h às 17h*
>
> Ligações somente pelo fixo *(16) 3242-2908*
>
> *Digite a opção desejada para ser atendido(a) (somente o número):*
>
> *1* *-* *Agendar atendimento*
> *2* *-* *Consultar andamento de processo ou benefício*
> *3* *-* *Enviar documentos*
> *4* *-* *Financeiro*
> *5* *-* *Outras dúvidas ou orientações*

### 1.3 — Menu principal alternativo (telefone inoperante)

**Quando usar.** Em períodos em que o fixo não está funcionando, substitui o aviso anti-golpe pelo aviso de inoperância.

> Olá, seja bem-vindo(a) à *Advocacia Previdenciária*.
>
> Nosso horário de atendimento é de *segunda a sexta-feira, das 07:00 às 17:00h*.
>
> ⚠️ *ATENÇÃO: Nosso telefone fixo está inoperante no momento. Qualquer dúvida busque nosso atendimento presencial ou aguarde ser atendido no Whatsapp.*
>
> *Para ser atendido(a), digite a opção desejada (somente o número):*
>
> *1* *-* *Agendar atendimento*
> *2* *-* *Consultar andamento de processo ou benefício*
> *3* *-* *Enviar documentos*
> *4* *-* *Financeiro*
> *5* *-* *Outras dúvidas ou orientações*

### 1.4 — Submenu de outras dúvidas

**Quando usar.** Cliente seleciona opção 5 (Outras dúvidas).

> A escolha de uma das opções abaixo é necessária para direcionar sua mensagem à equipe responsável.
>
> *1* *-* Dúvidas relacionadas a benefícios ou serviços do INSS
> *2* *-* Dúvidas relacionadas a outros assuntos

### 1.5 — Submenu de consulta de processo

**Quando usar.** Cliente quer acompanhar processo via internet.

> A consulta de seu benefício ou processo pode ser realizada diretamente no site do INSS ou do Tribunal.
>
> Informe a opção desejada e eu te guiarei no acesso de forma simples e rápida.
>
> *1* *-* Consultar o benefício no MEUINSS
> *2* *-* Consultar o processo no Conselho de Recursos
> *3* *-* Consultar processo judicial
> *4* *-* Não sei onde está localizado o meu benefício ou processo

### 1.6 — Resposta com links de consulta

**Quando usar.** Após cliente escolher opção de consulta.

> *MEUINSS* - http://meu.inss.gov.br
> *Conselho de Recursos do INSS* - https://consultaprocessos.inss.gov.br
> *Tribunal de Justiça de São Paulo* - https://esaj.tjsp.jus.br/cpopg/open.do
> *Tribunal Regional Federal 1ª Instância* - https://pje1g.trf3.jus.br/pje/ConsultaPublica/listView.seam
> *Tribunal Regional Federal 2ª Instância* - https://pje2g.trf3.jus.br/pje/ConsultaPublica/listView.seam

### 1.7 — Triagem cliente já existente

**Quando usar.** Cliente seleciona opção "Falar com Advogado" em fluxo antigo.

> Antes de transferir nossa conversa para um especialista, informe se já é nosso cliente?
>
> *Digite somente o número da opção desejada.*
>
> *1* *-* Sim, sou cliente!
> *2* *-* Não, ainda não sou cliente!

### 1.8 — Confirmação de cliente — atendimento com exclusividade

**Quando usar.** Cliente já cadastrado seleciona opção sim.

> Certo, {{NOME}}! Aguarde que a partir de agora nossos Advogados irão lhe prestar *atendimento com exclusividade.*
> Já temos aqui todas as suas informações.
> *Em que podemos auxiliar hoje?*

### 1.9 — Fila de atendimento

> *Iremos fornecer o melhor horário para o seu atendimento.*
> Aguarde um momento, logo você será atendido.

### 1.10 — Fila com escrita livre

> Escreva sua dúvida.
> A mensagem será analisada pela equipe e o retorno será feito conforme a ordem de atendimento.
> Aguarde um momento, logo você será atendido.

### 1.11 — Solicitação de digitação correta

**Quando usar.** Cliente envia texto livre ao invés do número solicitado.

> *Por favor, digite o número da sua opção para que possa ser atendido.*

### 1.12 — Recebimento fora do horário

**Quando usar.** Cliente envia mensagem fora do expediente ou em finais de semana.

> Recebi sua mensagem. Em breve retornarei.
>
> ⚠️ *ATENÇÃO com o golpe do falso advogado. Nunca solicitamos PIX, depósito ou transferência para liberação de valores* ⚠️
>
> Ligações somente pelo fixo (16) 3242-2908 de segunda a sexta-feira, das 07h às 17h.

### 1.13 — Documentos necessários para atendimento

**Quando usar.** Cliente solicita primeiro atendimento previdenciário.

> Para os nossos atendimentos, é essencial ter a *senha de acesso do GOV.BR ou MEU INSS*. Verifique com nossos especialistas como criar esse acesso, caso ainda não possua.
>
> Demais documentos necessários:
>
> - RG e CPF ou CNH;
> - Carteiras de Trabalho (se possuir);
> - Carnês de Contribuição para a Previdência Social (se possuir).

### 1.14 — Submenu presencial ou videochamada

> Aguarde um momento. Irei fornecer o horário mais adequado para o seu atendimento. A sua preferência é por atendimento *presencial* ou *videochamada?*

### 1.15 — Resposta a cliente de outra cidade

**Quando usar.** Cliente informa que mora longe e pergunta sobre videochamada.

> *{{ATENDENTE}}:*
>
> A nossa equipe é formada por *Advogados especialistas em Direito Previdenciário* que estão prontos para auxiliá-lo(a).
>
> Priorizamos o atendimento *presencial* ou por *videochamada*, pois há vários fatores que precisam ser analisados e certamente teremos uma análise mais aprofundada do seu caso.
>
> {{NOME}}, podemos agendar atendimento ou prefere receber nosso auxílio por aqui? Se optar pelo atendimento por este meio, pode digitar sua dúvida e iremos responder o mais breve possível.

---

## Bloco II — Saudações Humanas

### 2.1 — Abertura padrão

**Quando usar.** Primeiro contato humano após triagem do bot.

> *{{ATENDENTE}}:*
>
> Olá {{NOME}}, {{TURNO}}! Tudo bem?

> **Variantes.** "Bom dia", "Boa tarde", "Boa noite". Para tratamento formal usar "Olá, senhor {{NOME}}, bom dia!".

### 2.2 — Abertura curta

**Quando usar.** Cliente recorrente que se comunica com frequência.

> *{{ATENDENTE}}:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?

### 2.3 — Abertura ampliada com oferta de ajuda

> *{{ATENDENTE}}:*
>
> Olá {{NOME}}, {{TURNO}}!
>
> Como posso lhe ajudar?

### 2.4 — Abertura solidária com agradecimento

**Quando usar.** Cliente envia mensagem longa ou sensível.

> *{{ATENDENTE}}:*
>
> {{NOME}}, {{TURNO}}! Tudo bem e {{TRATAMENTO}}?

### 2.5 — Pedido de desculpa por demora

**Quando usar.** Atendimento foi prestado com atraso ou cliente esperou muito.

> *{{ATENDENTE}}:*
>
> Primeiro gostaria de pedir desculpa pela ausência de resposta anteriormente. Irei verificar o ocorrido para não ter havido resposta.

---

## Bloco III — Agendamento e Confirmação de Consulta

### 3.1 — Oferta de horário inicial

> *{{ATENDENTE}}:*
>
> Tem horário disponível no dia {{DATA}}. {{TRATAMENTO}} consegue vir nesse dia às {{HORARIO}}?

### 3.2 — Oferta com agenda apertada

> *{{ATENDENTE}}:*
>
> Na {{DIA_SEMANA}} a agenda está um pouco apertada.
> Tem por volta das {{HORARIO_ALT_1}} também.
> Se ainda assim complicar {{TRATAMENTO}}, na {{DIA_ALTERNATIVO}} {{TRATAMENTO}} está mais livre.

### 3.3 — Disponibilidade do Dr. Paulo (Matão/quartas)

**Quando usar.** Cliente pede dia que não é quarta-feira.

> *{{ATENDENTE}}:*
>
> É que de {{DIA_INDISPONIVEL}} o Dr. Paulo não atende aqui, ele é de Matão.
>
> O Dr. Paulo só atende de quarta-feira. Na próxima quarta-feira {{TRATAMENTO}} consegue vir?

### 3.4 — Atendimento por telefone como alternativa

**Quando usar.** Cliente impossibilitado de comparecer pessoalmente.

> *{{ATENDENTE}}:*
>
> Na {{DIA_TELEFONE}} às {{HORARIO}} o Dr. Paulo consegue te ligar para vocês conversarem.
> Pode ser?

### 3.5 — Encaminhamento à Dra. Amanda

**Quando usar.** Não há vaga com Dr. Paulo na semana e cliente concorda.

> *{{ATENDENTE}}:*
>
> Se não for possível também posso agendá-lo(a) para algum outro dia com a Dra. Amanda. Ela trabalha nos casos junto com o Dr. Paulo, então seria como passar o caso diretamente para ele.

### 3.6 — Confirmação de agendamento

> *{{ATENDENTE}}:*
>
> Agendado então, obrigada. Uma boa tarde!

> **Variantes.** Equivalentes — "Combinado, deixei agendado!", "Marcado, Sr. {{NOME}}!", "Então está marcado."

### 3.7 — Confirmação na véspera de consulta

**Quando usar.** Tarde anterior à consulta marcada. Padrão da Ingrid.

> *Ingrid:*
>
> Boa tarde! Entramos em contato para confirmar sua presença na consulta marcada para amanhã, às {{HORARIO}}h. Agradecemos o retorno.

### 3.8 — Resposta após confirmação do cliente

> *Ingrid:*
>
> Confirmado então, obrigada. Uma boa tarde!

### 3.9 — Reagendamento por indisponibilidade do Dr. Paulo

**Quando usar.** Dr. Paulo precisou cancelar atendimento previamente marcado.

> *Ingrid:*
>
> {{TURNO}} {{NOME}}! Tudo bem? O Dr. Paulo infelizmente não vai conseguir atender semana que vem, ele gostaria de remarcar o horário para {{NOVO_DIA}} no dia {{NOVA_DATA}}.
>
> {{TRATAMENTO}} consegue vir?

### 3.10 — Endereço do escritório

> *{{ATENDENTE}}:*
>
> Rua Rui Barbosa, 663 — Centro
> Em Monte Alto-SP
> É de frente para o INSS

### 3.11 — Custo da consulta

**Quando usar.** Cliente pergunta valor da consulta inicial.

> *{{ATENDENTE}}:*
>
> O valor da consulta são R$100,00 ou pode ser feita uma avaliação na página do escritório.

### 3.12 — Pagamento da consulta por PIX

**Quando usar.** Consulta por videochamada — cobrança antecipada via PIX.

> *{{ATENDENTE}}:*
>
> Pode ser por PIX!
> A chave é 224.627.048-09
> Paulo Roberto Tercini Filho

### 3.13 — Confirmação de videochamada

> *{{ATENDENTE}}:*
>
> {{TRATAMENTO}} prefere chamada de vídeo ou ligação telefônica?
>
> Pelo Whatsapp mesmo.

### 3.14 — Duração média da consulta

> *{{ATENDENTE}}:*
>
> Varia conforme o caso, mas em média costuma durar em torno de 1h.

---

## Bloco IV — Comunicação Sobre Perícia

### 4.1 — Perícia administrativa agendada

> *{{ATENDENTE}}:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> INFORMAMOS QUE SUA PERICIA MEDICA DE {{TIPO_BENEFICIO}} FOI MARCADA PARA O DIA, HORA E LOCAL ABAIXO:
> {{DATA}} – {{HORARIO}} - INSS DE {{CIDADE}}
> ENDEREÇO: {{ENDERECO_INSS}}
> FAVOR LEVAR DOCUMENTOS PESSOAIS E TODOS OS EXAMES E ATESTADOS RELATIVOS AO {{TIPO_OCORRENCIA}}.

### 4.2 — Perícia administrativa — variante curta

> *Dr. Paulo Tercini:*
>
> Bom dia {{NOME}}, tudo bem?
>
> Foi agendada a perícia médica:
> Data — {{DATA}} às {{HORARIO}}h
> Local — INSS de {{CIDADE}}
>
> Segue o comprovante do agendamento.

### 4.3 — Perícia judicial em Central de Perícias do Fórum

**Quando usar.** Variante completa, em prosa, com endereço integral.

> *{{ATENDENTE}}:*
>
> Estou passando para informar a respeito da sua perícia que foi agendada com o Dr. {{NOME_PERITO}} no dia {{DATA}}. Local — {{ENDERECO_COMPLETO}}, Central de Perícias do Fórum Estadual, cidade de {{CIDADE}}-SP. Horário — {{HORARIO}}h.

### 4.4 — Perícia judicial agendada — formato completo

> *{{ATENDENTE}}:*
>
> Olá {{NOME}}, {{TURNO}}!
>
> Sua perícia judicial foi agendada.
>
> O agendamento está previsto para o dia {{DATA_EXTENSO}}, às {{HORARIO}} horas a ser realizada no endereço {{ENDERECO_PERITO}}.
>
> Perito {{NOME_PERITO}}, CRM/SP {{CRM}}.

### 4.5 — Atendimento prévio à perícia

**Quando usar.** Sempre após comunicar perícia, para alinhar quesitos e orientações.

> *{{ATENDENTE}}:*
>
> Vamos combinar de deixar agendado atendimento para {{TRATAMENTO}} vir conversar com o Dr. Paulo dias anteriores à perícia. Aí ele passa as informações para {{TRATAMENTO}}, pode ser? Acredito que fica até mais fácil de relembrar.

### 4.6 — Lembrete da perícia

> *Dr. Paulo Tercini:*
>
> Bom dia, {{NOME}}! Tudo bem?
>
> Passando para lembrar da perícia que será amanhã as {{HORARIO}}h no INSS de {{CIDADE}}.

### 4.7 — Reagendamento via 135

**Quando usar.** Cliente em recuperação, com cirurgia, indisponível na data marcada.

> *Dr. Paulo Tercini:*
>
> Liga novamente e informa seus dados que irão te perguntar e também diz que não poderá comparecer porque {{MOTIVO}}.
>
> Muitas vezes precisa insistir um pouco com os atendentes pq são bem ruins.
>
> Eles precisam reagendar e é só {{TRATAMENTO}} que eles aceitam que peça o reagendamento.

### 4.8 — Documento que está com o advogado

**Quando usar.** Cliente pergunta se precisa levar à perícia documento entregue ao escritório.

> *Dr. Paulo Tercini:*
>
> Se for solicitado, pode dizer que entregou para o advogado e que está no processo.
>
> Qualquer documento que {{TRATAMENTO}} não tenha em mãos e que entregou pra mim pode dizer isso, pois o que vale mesmo é o que está no processo.

### 4.9 — Não pegar relatório prematuramente

> *Dr. Paulo Tercini:*
>
> Não é vantajoso pegar novo relatório médico agora em {{DATA}}. Provavelmente será agendado novo retorno no final do mês ou início do próximo mês e aí sim é melhor para pegar novo relatório.

### 4.10 — Acompanhante na perícia

**Quando usar.** Cliente pergunta se advogado vai junto à perícia.

> *Dr. Paulo Tercini:*
>
> Eu não vou junto nas perícias, pois não é permitida a entrada. Geralmente as pessoas que não dirigem pedem para algum familiar levar.

### 4.11 — Antecipação de perícia pelo INSS

**Quando usar.** INSS antecipa data antes do combinado.

> *Dr. Paulo Tercini:*
>
> Bom dia, {{NOME}}! Tudo bem?
>
> Recebi essa informação do INSS hoje de que foi antecipada a perícia para o dia {{NOVA_DATA}} as {{HORARIO}}h, tudo bem?

### 4.12 — Perícia agendada para data distante

**Quando usar.** Cliente preocupado com cessação antes da perícia.

> *Dr. Paulo Tercini:*
>
> As perícias do INSS têm sido agendadas para datas mais distantes em razão da alta demanda. Até a realização da perícia, o benefício permanece ativo. Caso o perito reconheça o direito, o pagamento continuará normalmente. Se o entendimento for contrário, o benefício será pago até a data da perícia.

### 4.13 — Mudança de agência por melhor fluxo

**Quando usar.** Cliente em situação delicada — aproveitar agência mais eficiente.

> *Dr. Paulo Tercini:*
>
> Em {{CIDADE_RUIM}} está demorando muito para agendar e está tendo aquela questão da perícia online que é ruim. É melhor agendarmos por {{CIDADE_BOA}}. Posso dar seguimento e fazer os agendamentos?

### 4.14 — Perícia presencial e avaliação social (BPC)

**Quando usar.** Comunicação dupla para BPC menor de idade.

> *Dr. Paulo Tercini:*
>
> Enviei os comprovantes dos agendamentos da perícia médica e da avaliação social.
> Perícia Médica — {{DATA_PER}} ({{DIA_SEMANA_PER}}) às {{HORARIO_PER}} no INSS de {{CIDADE_PER}}
> Avaliação Social — {{DATA_SOC}} ({{DIA_SEMANA_SOC}}) às {{HORARIO_SOC}} no INSS de {{CIDADE_SOC}}
>
> No dia {{DATA_LIGACAO}} ligo para você para explicar sobre a perícia, tudo bem?

---

## Bloco V — Documentos Médicos e Solicitações

### 5.1 — Pedido ao médico assistente — incapacidade

> *{{ATENDENTE}}:*
>
> A/C MÉDICO ASSISTENTE
> Favor fornecer relatório médico que deve estar legível, sem rasuras e conter:
>
> 1. O nome completo do paciente;
> 2. Informações sobre a doença ou CID;
> 3. Indicar o afastamento de atividades laborativas (de preferência constar 180 dias ou por prazo indeterminado);
> 4. A data de emissão;
> 5. A assinatura e carimbo do profissional com CRM, CRO ou RMS. A assinatura pode ser eletrônica.

> **Observação.** Anexar também o PDF padrão do escritório (Pedido para Médico Assistente Novo.pdf) sempre que disponível.

### 5.2 — Pedido ao médico — auxílio-acidente

**Quando usar.** Após alta do auxílio-doença, para reunir provas de sequela.

> *Dr. Paulo Tercini:*
>
> No médico do {{REGIAO_AFETADA}} vou te enviar um modelo de relatório médico que iremos precisar.
>
> Verifica se ele pode fornecer um relatório seguindo essa solicitação.

> **Observação.** O pedido para auxílio-acidente é diferente do de incapacidade — existe PDF próprio (Pedido para Médico Assistente - Auxílio-acidente.pdf).

### 5.3 — Modelo de relatório do fisioterapeuta

**Quando usar.** Cliente em fisioterapia, fisioterapeuta pode complementar.

> *Dr. Paulo Tercini:*
>
> Segue o modelo de relatório do fisioterapeuta. Tem vários campos em amarelo que ele precisa preencher, pois depende de exame físico.
>
> Eu já solicitei o benefício. Como ainda vai demorar um pouco para agendar a perícia, nesse meio tempo dá pra conseguir o relatório do fisioterapeuta.

### 5.4 — Solicitação de foto melhor

> *{{ATENDENTE}}:*
>
> {{TRATAMENTO}} consegue tirar uma foto mais aproximada?

### 5.5 — Foto da conta inteira

**Quando usar.** Comprovante de endereço cortado ou ilegível.

> *{{ATENDENTE}}:*
>
> Faz um favor {{NOME}}, tira a foto da conta inteira para demonstrar se é de água ou de energia.

### 5.6 — Avaliação positiva do laudo

> *Dr. Paulo Tercini:*
>
> Perfeito, o relatório médico está ótimo. {{COMPLEMENTO_OPCIONAL}}

### 5.7 — Falta de carimbo no laudo

> *Dr. Paulo Tercini:*
>
> Recebi o laudo médico. O que faltou foi o carimbo do médico que assinou. Precisaria desse carimbo para ter validade esse laudo.

### 5.8 — Pedido de documento atualizado para prorrogação

> *{{ATENDENTE}}:*
>
> Olá {{TRATAMENTO}} {{NOME}}, {{TURNO}}! Para dar prosseguimento ao seu benefício, tendo em vista que cessará dia {{DATA_CESSACAO}}, será necessário novo relatório médico para fazer a manutenção do benefício e passar pela perícia.

### 5.9 — Termo do laudo — atividades habituais

**Quando usar.** Cliente está como facultativo. Médico não deve usar "laborais".

> *Dr. Paulo Tercini:*
>
> O relatório médico consta a questão da incapacidade para atividades laborais. Isso é um problema para nós, pois você estava pagando o INSS como segurada facultativa que é quando não está trabalhando.
>
> Os médicos do INSS avaliam essa questão da forma da última contribuição.
>
> Somente trocar atividades laborais por atividades habituais. O médico citou duas vezes atividades laborais, precisaria trocar nos dois lugares. O restante pode ser tudo da mesma forma.
>
> De preferência colocar prazo indeterminado.

### 5.10 — Reforço do laudo com fundamentação técnica

**Quando usar.** Caso PCD ou aposentadoria por invalidez — reforçar nexo com a atividade.

> *Dr. Paulo Tercini:*
>
> Acredito ser válido já tentar um relatório que descreva que a exposição prolongada a {{AGENTE}} constitui fator contributivo reconhecido na literatura médica para {{CONSEQUENCIA}}.

### 5.11 — Solicitação de prontuário médico

**Quando usar.** Cliente foi atendido em hospital — precisa do prontuário completo.

> *Dr. Paulo Tercini:*
>
> Primeiro solicita através do site {{URL_HOSPITAL}}.
> Depois para retirar precisa ir lá.
>
> No prontuário vai ter algo mais detalhado que acredito que vai ser útil.

---

## Bloco VI — Concessão, Cessação e Prorrogação

### 6.1 — Concessão administrativa

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> {{TIPO_BENEFICIO}} foi concedido(a) 🙏🙏
>
> {{TRATAMENTO}} pode considerar que o benefício foi concedido de {{DIB}} a {{DCB}}.

### 6.2 — Concessão por análise documental

**Quando usar.** INSS concedeu sem perícia presencial.

> *Dr. Paulo Tercini:*
>
> Bom dia {{NOME}}, tudo bem?
>
> Tenho uma boa notícia. Foi concedido o benefício sem precisar passar por perícia. Concedeu de {{DIB}} a {{DCB}}.
>
> Ainda não foi divulgada a data do pagamento, mas logo que eu souber aviso.
>
> Em {{PROXIMA_DER}} poderemos solicitar novamente o benefício e será agendada perícia presencial, mas será necessário novo relatório médico.

### 6.3 — Encaminhamento à análise documental

**Quando usar.** Sistema encaminhou pedido para análise documental antes da perícia.

> *Dr. Paulo Tercini:*
>
> Não foi agendada a perícia médica. Encaminhou para análise documental, mas provavelmente irão agendar na sequência.
>
> Qualquer novidade eu aviso.

### 6.4 — Aviso sobre carta do INSS

**Quando usar.** Cliente envia foto de comunicado/carta enviada pelo INSS.

> *Dr. Marcos:*
>
> {{NOME}}, esse documento é apenas um comunicado que você conseguiu o benefício solicitado em {{MES_PEDIDO}}.
>
> O INSS sempre manda em atraso.

### 6.5 — Aviso de cessação iminente

> *{{ATENDENTE}}:*
>
> {{TRATAMENTO}} {{NOME}}, verifiquei que seu benefício cessa em {{DCB}}.
>
> Somente em {{MES_PROXIMO_DOC}} será necessário um novo documento médico.
>
> E posteriormente poderá ser necessária a perícia.

### 6.6 — Prorrogação automática

**Quando usar.** INSS prorrogou o benefício sem nova perícia.

> *{{ATENDENTE}}:*
>
> Olá, {{TURNO}}! O benefício {{POSSESSIVO}} foi prorrogado automaticamente.

### 6.7 — Prorrogação por longo prazo

**Quando usar.** Perito concedeu prorrogação por mais tempo que o cliente esperava.

> *Dr. Paulo Tercini:*
>
> Bom dia {{NOME}}, tudo bem?
>
> O seu benefício foi prorrogado até {{DCB}}. Agora tranquiliza um pouco até a próxima renovação sem precisar de fazer perícia.

### 6.8 — Permanência sem perícia

**Quando usar.** Solicitação onde se busca permanência sem perícia, posteriormente caberá perícia.

> *{{ATENDENTE}}:*
>
> No caso, nesta etapa de solicitação podemos conseguir a permanência do seu benefício, mas posteriormente deverá passar na perícia.

### 6.9 — Reapresentação ao trabalho após cessação

**Quando usar.** Cliente vai voltar ao trabalho após DCB.

> *Dr. Paulo Tercini:*
>
> O benefício está previsto para cessar em {{DCB}}, então no Hospital poderá se reapresentar a partir de {{DIA_SEGUINTE}}.

---

## Bloco VII — Pagamento e Atrasados

### 7.1 — Aviso de valor e data de saque (completo)

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> O primeiro benefício que solicitamos foi concedido de {{DIB}} a {{DCB}}. O valor total desse benefício estará disponível a partir do dia {{DATA_PAGAMENTO}} e o valor que poderá receber é R${{VALOR}}.
>
> Para sacar precisa ser em algum {{BANCO}}. Existe agência do {{BANCO}} em {{CIDADES_AGENCIAS}}. O que precisa levar é o seu documento de identificação, certidão de casamento, comprovante de endereço e o extrato de pagamento que irei encaminhar agora (pode apresentar pelo celular ou levar impresso).

### 7.2 — Pagamento simples

> *Dr. Marcos:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> Dia {{DATA_PAGAMENTO}}.
> {{CIDADE_AGENCIA_OPCIONAL}}

### 7.3 — Aviso múltiplos pagamentos

**Quando usar.** INSS divulgou várias datas de pagamento em sequência.

> *Dr. Paulo Tercini:*
>
> Bom dia {{NOME}}, tudo bem?
>
> O INSS divulgou as datas dos pagamentos. Em {{DATA_1}} terá R${{VALOR_1}} e em {{DATA_2}} terá R${{VALOR_2}}.
>
> Os pagamentos serão no Banco {{BANCO}} de {{CIDADE}}. Nesse caso precisa ir no {{BANCO}} de {{CIDADE}} para sacar. O melhor é ir após o dia {{DATA_2}} para sacar os dois pagamentos juntos.

### 7.4 — Resposta sobre demora dos atrasados

> *{{ATENDENTE}}:*
>
> {{TRATAMENTO}} {{NOME}}, conforme o Dr. Paulo conversou com {{TRATAMENTO}} na outra semana, o pagamento dos atrasados ficará mais para os meses seguintes, pois depende de cálculos serem apresentados e contestados e isso acaba demorando.

### 7.5 — Intervenção do Dr. Paulo em cobrança emocional

> *Dr. Paulo Tercini:*
>
> Eu sei que não está sendo fácil {{NOME}}, mas sempre fomos muito claros com você de que nessa fase iria demorar um pouco para agendar a perícia porque não depende de nós e sim do Juiz.
> Também fui muito claro de quando o INSS vai pagar aqueles atrasados. São situações que demoram para você e para todos. Logicamente eu também preferiria receber antes porque também preciso do dinheiro, mas as coisas não funcionam dessa forma no judiciário, tudo é muito lento.

### 7.6 — Esclarecimento sobre fluxo de atrasados

> *Dr. Paulo Tercini:*
>
> Como o Dr. Paulo conversou com {{TRATAMENTO}} aquele dia, para {{TRATAMENTO}} receber o dinheiro depende de autorização do juiz. Mesmo que o INSS tenha apresentado o cálculo, somente o juiz é quem pode liberar o pagamento e isso demora.

### 7.7 — Atrasados em revisão de longo curso

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> Não houve nenhum andamento. Ainda no aguardo do Juiz dar a decisão. Em {{COMARCA}} está demorando em torno de {{TEMPO_MEDIO}} para ter essa decisão. Infelizmente é sofrível essa demora, mas está tudo encaminhado para dar certo.

### 7.8 — Status processual — concluso para despacho

> *{{ATENDENTE}}:*
>
> O atual andamento — concluso para despacho — significa que está aguardando decisão do juiz para dar prosseguimento ao processo.

### 7.9 — Honorários sobre atrasados — cobrança

**Quando usar.** Cliente pergunta valor a pagar a título de honorários após implantação.

> *Dr. Paulo Tercini:*
>
> O total que irá receber R${{TOTAL}}. Os honorários são {{PERCENTUAL}}% que é R${{HONORARIO}}.

> **Observação.** O escritório utiliza o percentual livremente combinado com o cliente em contrato. Confrontar com Súmula 111/STJ e Tema 1050/STJ — a base sucumbencial recai sobre as parcelas vencidas até a sentença, não sobre vincendas.

### 7.10 — Modelo PIX para honorários

> *Dr. Paulo Tercini:*
>
> O PIX é meu CPF 224.627.048-09
> Muito obrigado!

### 7.11 — Honorários quando der certo

**Quando usar.** Cliente pergunta se precisa pagar antes do êxito.

> *Dr. Paulo Tercini:*
>
> Não precisa. Está tudo certo. O dia que fizermos a aposentadoria e der certo recebemos juntos 🙏

### 7.12 — Alerta contra empréstimo consignado

**Quando usar.** Banco liga oferecendo empréstimo após aposentadoria.

> *Dr. Paulo Tercini:*
>
> Provavelmente deve ser para fazer empréstimo consignado. Quando a pessoa aposenta os bancos ficam ligando para oferecer empréstimo. Esses empréstimos não valem a pena pq se paga muito juros.
>
> Quando o {{BANCO}} ligar para o {{NOME}} pede para explicarem se é um empréstimo. E também pede para o {{NOME}} não enviar foto dos documentos dele pq os bancos estão fazendo empréstimos mesmo sem a pessoa autorizar.

---

## Bloco VIII — Indeferimento Administrativo

### 8.1 — Comunicação do indeferimento

> *{{ATENDENTE}}:*
>
> Olá {{TRATAMENTO}} {{NOME}}, {{TURNO}}!
>
> Sim, o pedido {{POSSESSIVO}} foi negado.
>
> {{COMPLEMENTO_TRAMITE}}
>
> Vamos analisar o laudo emitido pelo perito negando o pedido.

> **Variantes.** Complementos típicos — "Nem foi encaminhado para perícia.", "Pois houve modificações das regras do INSS na semana passada e afetou os requerimentos que estavam em andamento."

### 8.2 — Estratégia subsequente padrão

> *{{ATENDENTE}}:*
>
> Verificaremos a viabilidade de ajuizar ação judicial. Mas precisaremos analisar o laudo do perito.
> De todo modo, para fazer outro pedido no INSS deve-se aguardar 30 dias.

> ⚠️ **ALERTA TÉCNICO.** Esse prazo de 30 dias é praxe operacional do INSS, não é prazo legal impeditivo. Não confronta com o ajuizamento imediato da ação judicial. Confrontar com Tema 1124/STJ — se houver documentação nova não apresentada, refazer pedido administrativo antes da ação. Se a documentação foi apresentada, ação judicial é viável de imediato.

### 8.3 — Pedido de novo benefício enquanto tramita reclamação

> *Dr. Paulo Tercini:*
>
> O que a gerência sugeriu é que abramos novo pedido de benefício enquanto se resolve esse que está pendente. Acredito que é um caminho viável.
> Se {{TRATAMENTO}} estiver de acordo, já solicito novamente para que seja agendada nova perícia o quanto antes.

> **Observação.** Esses pedidos paralelos preservam a DER original — o servidor deve garantir o pagamento desde o primeiro requerimento, conforme prevê a IN 128/2022.

### 8.4 — Honorários da ação judicial

> *{{ATENDENTE}}:*
>
> {{NOME}}, esse afastamento de agora sim é R${{VALOR_FIXO}}.
> Mas se tiver que entrar com a ação judicial os valores mudarão.
> Será {{PERCENTUAL}}% sobre os 6 primeiros pagamentos e {{PERCENTUAL}}% dos atrasados.

> ⚠️ **ALERTA TÉCNICO.** Confrontar com Súmula 111 do STJ e Tema 1050/STJ antes de uniformizar — a base sucumbencial recai apenas sobre as parcelas vencidas até a sentença.

### 8.5 — DIB anterior perdida — judicial necessário

**Quando usar.** INSS concedeu mas não retroagiu para data anterior.

> *Dr. Paulo Tercini:*
>
> O perito não retroagiu o início do benefício para {{DIB_DESEJADA}}, então esse período está perdido. A única forma de corrigi-lo é ajuizando o processo judicial.
>
> Se tiver interesse podemos fazer o processo. Ou ficará perdido esses {{TEMPO_PERDIDO}} e em {{MES_PROX}} teremos que tentar prorrogar no próprio INSS o benefício que agora foi concedido.

### 8.6 — Ação para retroativo (judicial)

> *Dr. Paulo Tercini:*
>
> Enquanto o processo tem andamento fica recebendo os períodos que o INSS for concedendo. Depois que der certo o processo recebe os períodos que ficou sem benefício, inclusive se o INSS negar a prorrogação também terá direito de receber no processo, por isso é válido ajuizar.

---

## Bloco IX — Análise Técnica de Aposentadoria

### 9.1 — Cálculo de aposentadoria por idade — projeção

> *Dr. Paulo Tercini:*
>
> Verifiquei aqui {{TRATAMENTO}} {{NOME}}.
> {{TITULAR}} tem atualmente {{TC_TOTAL}} de contribuição para o INSS. As contribuições estão todas em ordem, não precisamos fazer nada para regularizar. Para atingir os {{ANOS_NECESSARIOS}} faltam {{TEMPO_FALTANTE}}.
> Irá conseguir aposentar em {{DATA_APOSENTADORIA}}, então, mesmo após completar os {{IDADE_MINIMA}} anos em {{DATA_IDADE}}, precisará continuar contribuindo até {{DATA_APOSENTADORIA}} para ter direito à aposentadoria.
> Se tiver benefício por incapacidade durante esse período não modifica nada o direito de pedir a aposentadoria em {{DATA_APOSENTADORIA}}.

> **Observação.** Diretriz interna — jamais sugerir cessação de contribuições antes do cumprimento de todos os requisitos. Mesmo quando a idade mínima já é atingida, a contribuição segue importante para qualidade de segurado e proteção contra incapacidade e pensão por morte.

### 9.2 — Resposta com cálculo de cenários

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}. Tudo bem?
>
> Fiz a avaliação de sua aposentadoria.
>
> Realmente a primeira aposentadoria possível é {{PRIMEIRA_DATA_APOSENTADORIA}}. Hoje você tem o total de {{TC_TOTAL}} de tempo de contribuição{{COMPLEMENTO_TC_OPCIONAL}}.
>
> Atualmente a sua média contribuição está em R${{MEDIA_ATUAL}}. {{ANALISE_PROJECAO}}.
>
> Como está {{HORIZONTE}}, provavelmente teremos {{POSSIVEL_REFORMA}} e acredito que essas datas serão alteradas.

### 9.3 — Comparação entre cenários

> *Dr. Paulo Tercini:*
>
> Primeiro cenário. Continuar contribuindo com R${{CONTRIB}} e aguardar até {{ANO_FUTURO}} para receber cerca de R${{RMI_FUTURA}}.
> Segundo cenário. Aceitar a aposentadoria concedida agora no valor de {{RMI_ATUAL}}. Parar de recolher sobre R${{CONTRIB}} e receber um montante de aproximadamente R${{ECONOMIA}} até {{ANO_FUTURO}}.
>
> Vale lembrar que o salário mínimo tem reajuste anual. Projetando um aumento de cerca de R$100,00 por ano, em {{ANO_INTERMEDIARIO_1}} e em {{ANO_FUTURO}} o piso já estaria acima de R${{PISO_PROJETADO}}. A diferença entre os dois cenários ficaria em torno de R${{DIFERENCA_MENSAL}} mensais.

### 9.4 — Recomendação técnica firme

> *Dr. Paulo Tercini:*
>
> De qualquer forma, já está claro que compensa receber agora.
> Se você optar por esperar até {{ANO_FUTURO}}, abrirá mão de aproximadamente R${{VALOR_ABRIR_MAO}} no período. Depois da nova aposentadoria, seriam necessários cerca de {{ANOS_RECUPERAR}} anos só para recuperar esse valor, e isso se você efetivamente gastar os R${{VALOR_ABRIR_MAO}}. Nesse cenário, a espera demora muito para compensar.

### 9.5 — Reajuste anual diferenciado

> *Dr. Paulo Tercini:*
>
> Pensando na lógica de que as aposentadorias de salário mínimo sempre sobem mais do que as aposentadorias acima do salário mínimo, não demonstra ser vantajoso esperar, pois em poucos anos o valor que vai receber acima do mínimo vai chegar no salário mínimo.
> Nesse último ano as aposentadorias acima do mínimo subiram {{INPC}}%, enquanto que as aposentadorias de salário mínimo subiram {{REAJUSTE_MIN}}%.

### 9.6 — Conversão para aposentadoria por invalidez — alerta

**Quando usar.** Cliente em B31 com sinal de que perito vai converter em B32. Reduz RMI.

> *Dr. Paulo Tercini:*
>
> O médico do INSS faz isso já sabendo que irá diminuir sua renda, mas vamos buscar alternativas para subir a renda. A ideia é receber um pouco mais do que os R${{RMI_ATUAL}} que estava recebendo.
>
> Não será fácil, mas tem chance. Eu preciso enquadrar as suas doenças como decorrentes do trabalho que você exerceu durante a vida toda ou reconhecer a insalubridade para subir um pouco o valor do benefício, mas nesse caso não chega nos R${{RMI_ATUAL}}.
>
> O plano de saúde você poderá manter. O contrato de trabalho fica suspenso mesmo com a aposentadoria por invalidez, o que permite a manutenção do plano.

### 9.7 — Cliente sem tempo suficiente

**Quando usar.** Cliente idoso ainda não tem 15 anos — orientar a manter contribuição.

> *Dr. Paulo Tercini:*
>
> Eu sinceramente pagaria o INSS. Se tudo correr bem em {{ANOS_FALTANTES}} anos {{TITULAR}} aposenta e pode usufruir de mais um salário mínimo a partir dos {{IDADE_FINAL}} anos.
>
> E se acontecer algum problema de saúde no meio do caminho terá direito a um auxílio-doença ou aposentadoria por invalidez. Se não estiver pagando com certeza não terá direito a nada.
>
> São {{VALOR_MENSAL}} reais por mês. Acredito que é um investimento válido pq se precisar de um benefício terá um salário mínimo por mês.

---

## Bloco X — Cumprimento de Sentença e Implantação

### 10.1 — Aviso de prazo do INSS

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}!
>
> O INSS foi intimado para implantar o benefício no dia {{DATA_INTIMACAO}}.
>
> O prazo para cumprir é de 30 dias úteis. Encerra só no dia {{DATA_FIM_PRAZO}}.
>
> Geralmente cumprem em pouco tempo, mas nesse último mês está tudo travado e não estão implantando de ninguém porque houve uma atualização do sistema e não está funcionando.

### 10.2 — Sistema do INSS fora do ar

**Quando usar.** INSS não consegue informar valores ou implantar benefícios por instabilidade.

> *Dr. Marcos:*
>
> {{NOME}}, o sistema do INSS continua fora do ar.
> Entra em contato com a gente {{PROXIMO_DIA}}.
> Acredito que até lá volte a funcionar.

### 10.3 — Sistema fora do ar — variante longa

> *Dr. Paulo Tercini:*
>
> Boa tarde {{NOME}}
> Ainda não enviei mensagem sobre o agendamento, pois o sistema do INSS está fora do ar. Logo que eu conseguir acessar te aviso.

### 10.4 — Aviso de descumprimento e nova decisão

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}.
>
> O INSS ainda não implantou o benefício. O Juiz deu uma nova decisão no dia {{DATA_NOVA_DECISAO}} determinando a implantação no prazo de 10 dias sob pena de multa diária de R${{VALOR_MULTA}}.

### 10.5 — Aviso de implantação efetivada

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}!
>
> Agora à pouco foi implantado o benefício.
>
> Consta a implantação com data de cessação no dia {{DCB}}. Poderemos pedir a prorrogação a partir do dia {{DATA_PRORROGACAO}}.
>
> Agora demora uma semana para divulgarem o primeiro pagamento. Na próxima semana eu te aviso.

### 10.6 — Esclarecimento sobre divisão dos atrasados

> *Dr. Paulo Tercini:*
>
> Agora vai pagar de {{MES_INICIO}} de {{ANO_ATUAL}} pra frente.
> De {{MES_FIM_RETROATIVO}} de {{ANO_ANTERIOR}} para trás iremos receber no processo.
> E agora será aberto um novo processo para receber esses atrasados.

### 10.7 — Tramitação no Tribunal — calibrar expectativa

> *Dr. Paulo Tercini:*
>
> Se for para o Tribunal é pior ainda a depender do desembargador que receber o processo, infelizmente.
>
> Mas está tudo encaminhado para dar certo. Isso é importante. Depois recebe todas essas diferenças.

---

## Bloco XI — Operações Acessórias (gov.br, GPS, FGTS)

### 11.1 — Pedido de senha gov.br

> *{{ATENDENTE}}:*
>
> {{NOME}}, vou precisar da {{TRATAMENTO_POSSESSIVO}} senha do MEUINSS novamente ou que envie para mim o Extrato Previdenciário Completo que retira no site do MEUINSS.

### 11.2 — Solicitação de desabilitar 2FA

> *{{ATENDENTE}}:*
>
> Estou tentando verificar o andamento do pedido administrativo que fizemos no Meu INSS, mas não estou conseguindo por conta da verificação de duas etapas que está ativa no seu perfil do GOV.
> {{TRATAMENTO}} pode desabilitar para que possamos verificar o pedido?

### 11.3 — Tutorial de gerar código de acesso

> *{{ATENDENTE}}:*
>
> Quando {{TRATAMENTO}} vai logar no gov o celular abre uma página do google, correto?
>
> Verifica pra mim por favor se retornando ao aplicativo, abaixo do botão para entrar há um outro dizendo "gerar código de acesso".
>
> Pode clicar nele e colocar o número que estiver aparecendo nessa página.

### 11.4 — Reset do aplicativo gov.br

> *{{ATENDENTE}}:*
>
> Desinstala o aplicativo do GOV.BR do celular {{POSSESSIVO}} e instala novamente. Provavelmente vai funcionar.

### 11.5 — Solicitação de novo código (expirou)

> *{{ATENDENTE}}:*
>
> O código expira muito rápido e eu não vi sua mensagem.
> Pode enviar novamente, por favor.

### 11.6 — Orientação para pagamento de GPS

**Quando usar.** Cliente CI ou seu familiar pergunta como pagar pelo aplicativo do banco.

> *Dr. Paulo Tercini:*
>
> No aplicativo do banco precisa escolher a opção de pagamento de GPS. Não sei se no banco {{BANCO_DUVIDOSO}} tem essa opção. O que tenho certeza que tem é no aplicativo do banco do brasil e da caixa.
>
> Quando entrar em pagamento de GPS, os dados que irá precisar preencher são praticamente os mesmos. Em vez de constar "período de apuração" irá constar "competência" e {{TRATAMENTO}} deve colocar sempre o mês anterior ao que está pagando. Por exemplo, agora em {{MES_ATUAL}} coloca a competência {{MES_ANTERIOR}}.

### 11.7 — GPS paga como DARF — restituição

> *Dr. Paulo Tercini:*
>
> Sim, está inválido. Posso tentar solicitar a restituição no site da Receita Federal. Demoram muito para responder, mas geralmente dá certo. Posso pedir?

### 11.8 — Necessidade de elevar nível gov.br

> *Dr. Paulo Tercini:*
>
> Para conseguir solicitar, a senha GOV.BR {{POSSESSIVO}} precisa ser prata ou ouro.
> Terá que entrar no celular {{POSSESSIVO}} no aplicativo GOV.BR e aumentar o nível da conta.
> Quando atualizar {{TRATAMENTO}} me avisa que faço o pedido.

### 11.9 — Confecção de carnê para CI

> *Dr. Paulo Tercini:*
>
> Eu não estou no escritório hoje, mas posso pedir para a advogada que está lá já deixar pronto o carnê para {{TRATAMENTO}} pegar.
> Fazemos um carnê novo. Eu tenho os dados {{POSSESSIVO}} aqui.
>
> O pagamento desse mês de {{MES}} pode ser feito até {{DATA_LIMITE}}.

### 11.10 — Lembrete proativo de contribuição

**Quando usar.** Cliente CI/facultativo segue calendário pré-combinado.

> *Dr. Paulo Tercini:*
>
> Bom dia, {{NOME}}! Tudo bem?
>
> Estou entrando em contato para lembrar sobre a importância de realizar o pagamento ao INSS, a fim de manter sua vinculação como segurada ativa no sistema.
>
> A competência de pagamento deve ser a {{COMPETENCIA}} e o valor é o mesmo R${{VALOR_GPS}}.

### 11.11 — Plano de contribuição programada (CI)

**Quando usar.** Cliente recebe orientação detalhada sobre quais meses pagar.

> *Dr. Paulo Tercini:*
>
> Competência {{COMPETENCIA_INICIAL}}
> Código {{CODIGO_GPS}}
> Identificador {{NIT}}
> Valor {{PERCENTUAL}}% do salário mínimo, atualmente R${{VALOR}}
>
> Pagar as competências {{INTERVALO_1}}.
> Não pagar as competências {{INTERVALO_PULAR_1}}.
> Pagar a competência {{INTERVALO_2}}.
> E ir seguindo a mesma ordem.
>
> Os pagamentos devem ser feitos do dia 01 até o 15 dia do mês.

### 11.12 — Saque do FGTS por aposentadoria

**Quando usar.** Cliente recém-aposentado pergunta sobre saque de FGTS/PIS.

> *Dr. Paulo Tercini:*
>
> O PIS é destinado para quem é servidor público e o saque é no Banco do Brasil. {{TRATAMENTO}} tem direito a sacar o FGTS.
>
> Precisa baixar o aplicativo FGTS no celular e fazer o cadastro. Depois de fazer o cadastro precisa escolher a opção de saque em razão da aposentadoria.
>
> Se precisar de ajuda pode vir até aqui no escritório que ajudo.

### 11.13 — Indicador IREC-INDPEND no CNIS

**Quando usar.** Cliente envia print do MEU INSS com pendência indicada.

> *Dra. Amanda Garcez:*
>
> Esse apontamento deve ser porque você contribui na forma simplificada. Verifiquei na sua pasta que o Dr. Paulo indicou contribuir até {{COMPETENCIA_X}}, voltará a contribuir em {{COMPETENCIA_Y}}.
>
> Quando abrimos seu CNIS, constam todas as suas contribuições previdenciárias durante a vida. Os indicadores apontados, conferi aqui, tratam-se de indicadores referentes a remunerações em outros anos.
>
> Os indicadores destacam que a contribuição do referido mês e ano está abaixo do mínimo, pode ser em razão de dispensa, férias, ou seja, é normal. O indicador IREC-INDPEND pode apontar que existem indicadores no seu CNIS a serem observados, mas não que seja especificamente daquele período.

---

## Bloco XII — PPP, CTC e Documentos da Empresa

### 12.1 — Solicitação de descrição da atividade

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}!
>
> A {{EMPRESA}} solicitou uma pequena descrição de qual era a sua atividade na época da {{ANTIGA_RAZAO_SOCIAL}}. Poderia descrever o que fazia no seu trabalho naquela época?

### 12.2 — Confirmação de PPP em ordem

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> Revisei o PPP da {{EMPRESA}} e o documento está correto.
> {{COMPLEMENTO_PROXIMO_PASSO}}

### 12.3 — Cobrança de PPP em atraso

> *Dr. Paulo Tercini:*
>
> Da {{EMPRESA}} também irei cobrar para ver se adiantam.
> Quanto às demais empresas, conforme for conseguindo os documentos pode enviar pra mim.

### 12.4 — Pedido de CTC ou DTC à entidade pagadora

> *{{ATENDENTE}}:*
>
> Conversei com o doutor aqui. Ele disse que {{TRATAMENTO}} deve abrir um protocolo na {{ENTIDADE}} solicitando o DTC, uma vez que a declaração de tempo de contribuição é algo obrigatório a ser fornecido.
> Eles devem te entregar.

### 12.5 — PPP de contribuinte individual (autônoma)

**Quando usar.** Juiz solicita PPP de período em que cliente trabalhou como autônomo.

> *Dr. Paulo Tercini:*
>
> No processo de aposentadoria, o juiz solicitou o PPP referente ao período de {{PERIODO}}, quando {{TRATAMENTO}} contribuía como autônomo.
> Mesmo não sendo obrigatório apresentar PPP para contribuinte individual, pois o essencial são as provas do exercício da atividade, considero mais seguro atendermos à solicitação. Por isso, preparei o PPP e também uma declaração sobre as atividades desenvolvidas naquela época.
>
> Peço que verifique se a descrição da atividade está correta ou se devo incluir alguma informação. Após sua confirmação, precisarei colher sua assinatura nos dois documentos. Caso tenha carimbo profissional, será importante utilizá-lo também.

### 12.6 — Pedido para empresa adversa em juízo

**Quando usar.** Empresa do passado precisa fornecer documento — escritório envia ofício.

> Bom dia {{NOME}}, tudo bem?
> Deixei pronto o documento para {{TRATAMENTO}} levar no RH da {{EMPRESA}}. Pode passar no escritório para buscar.
> Como não estou no escritório hoje, pedi para o Dr. Marcos assinar em meu lugar.
> Deixei o documento impresso em duas vias. A via que está junto com os PPPs {{TRATAMENTO}} deixa lá na empresa e a outra via {{TRATAMENTO}} coleta a assinatura de quem receber lá (isso serve de prova que eles receberam nosso pedido).
> Qualquer dúvida estou à disposição.

### 12.7 — Identificação de testemunhas para processo

**Quando usar.** Caso de pensão por morte ou união estável que precisa de testemunhas.

> *Dr. Paulo Tercini:*
>
> Sim, podemos utilizar os dois como testemunhas.
>
> Irei encaminhar o recurso com a apresentação dos dois como testemunhas e tendo alguma novidade aviso a senhora.
>
> Muito obrigado 🙏🙏

> **Observação.** Solicitar do cliente — nome completo, RG, CPF, endereço completo, vínculo com o falecido.

---

## Bloco XIII — Aviso e Resposta a Golpes

### 13.1 — Resposta longa a relato de tentativa de golpe

> *{{ATENDENTE}}:*
>
> Olá {{NOME}}, {{TURNO}}.
>
> Essa conversa que {{TRATAMENTO}} teve não foi com o doutor Paulo, são golpistas se passando por ele!
>
> {{TRATAMENTO}} chegou a compartilhar alguma informação bancária?

### 13.2 — Resposta curta de emergência (Dr. Marcos)

**Quando usar.** Cliente recebe ligação ou mensagem suspeita ao vivo. Três mensagens curtas, em sequência.

> *Dr. Marcos:*
>
> {{NOME}}
>
> (em mensagem seguinte)
>
> *Dr. Marcos:*
>
> É GOLPE
>
> (em mensagem seguinte)
>
> *Dr. Marcos:*
>
> Não passe nenhuma informação

### 13.3 — Confirmação que escritório é legítimo

> *Ingrid:*
>
> Nós não somos golpe, {{TRATAMENTO}} {{NOME}}. Mas se tiver outro número entrando em contato com você se passando por nós, aí é golpe.
>
> É sempre bom verificar antes. Obrigada eu, uma boa tarde!

### 13.4 — Orientação para denunciar e bloquear

> *{{ATENDENTE}}:*
>
> Se possível, denuncia e bloqueia o número. Várias pessoas fazendo isso talvez o WhatsApp banir o número dos golpistas.

### 13.5 — Aviso recorrente em onda de golpes

**Quando usar.** Em dias de pico de tentativas de golpe.

> *Ingrid:*
>
> {{TURNO}} {{NOME}}! Tudo bem? Tem números se passando por nós. Qualquer número além desse que mandar mensagem é golpe. Sempre verifica antes de passar qualquer informação. Teve cliente que já caiu no golpe hoje.
>
> {{TRATAMENTO}} poderia bloquear e denunciar, por favor? Obrigada.

### 13.6 — Reconhecimento ao cliente atento

> *{{ATENDENTE}}:*
>
> Está ocorrendo isso diariamente. Está bastante complicado. É importante sempre ir denunciando para que o whatsapp derrube o número.
> Muito obrigado por avisar.

### 13.7 — Mensagem em massa anti-golpe

> MENSAGEM AUTOMÁTICA: Estão utilizando nosso nome para praticar golpe e solicitar dinheiro. Não transfiram dinheiro. Obrigado!

### 13.8 — Pedido de desculpa por demora atribuível a onda de golpes

> *André Dellavechia:*
>
> Boa tarde {{NOME}}, tudo bem?
> Te peço perdão pela demora, o escritório vem passando por um momento turbulento, estão se passando pelos advogados aqui para aplicar golpes.

---

## Bloco XIV — Transferência Interna

### 14.1 — Transferência para o Dr. Paulo

> *{{ATENDENTE}}:*
>
> {{TRATAMENTO}} {{NOME}}, vou transferir para o Dr. Paulo conversar com {{TRATAMENTO}}. Aguarde por favor, obrigada!

### 14.2 — Verificação pendente com o Dr. Paulo

> *{{ATENDENTE}}:*
>
> Estou aguardando o Dr. Paulo me informar a respeito do {{TRATAMENTO_POSSESSIVO}} caso.

### 14.3 — Encaminhamento à Dra. Amanda

> *Ingrid:*
>
> {{TURNO}} {{NOME}}! Tudo bem? Eu vou passar para a Dra. Amanda tirar suas dúvidas, e aí é só aguardar que ela já te responde.

### 14.4 — Aguardar verificação curta

> *{{ATENDENTE}}:*
>
> Vou verificar para {{TRATAMENTO}}, só um instante por favor!

### 14.5 — Confirmação após retorno do advogado

> *{{ATENDENTE}}:*
>
> Confirmei as informações com o Dr. Paulo, {{TRATAMENTO}} {{NOME}}!
> Ele me informou que {{INFORMACAO}}.

### 14.6 — Encaminhamento de áudio para o Dr.

> *{{ATENDENTE}}:*
>
> Vou repassar a informação para o Dr. Paulo. Vou aguardar a definição do procedimento por ele.

### 14.7 — Recusa de áudio com solicitação de texto

**Quando usar.** Áudio extenso ou pouco claro — pedir texto.

> *Dra. Amanda Garcez:*
>
> Teve muito atendimento, {{TRATAMENTO}} {{NOME}}. Então, não foi possível, vamos fazer o seguinte. Envia um áudio que transfiro para ele, fica mais fácil dele conseguir responder.

---

## Bloco XV — Encerramentos Cordiais

### 15.1 — Agradecimento curto

> *{{ATENDENTE}}:*
>
> Eu que agradeço!

> **Variantes.** Equivalentes — "Eu que agradeço, {{NOME}}!", "Tudo bem, obrigada!", "Tá joia, muito obrigado!".

### 15.2 — Despedida com bom desejo

> *{{ATENDENTE}}:*
>
> Obrigado, {{NOME}}!
> Excelente {{PERIODO}}. Deus abençoe.

> **Variantes.** Períodos — "final de semana", "semana", "feriado".

### 15.3 — Resposta a "de nada"

> *{{ATENDENTE}}:*
>
> De nada!

### 15.4 — Despedida em situação delicada

> *Dr. Paulo Tercini:*
>
> Pode ficar tranquilo(a) que tudo se ajustará.
> Eu vou te deixando avisado.
> Obrigado e excelente final de semana.

### 15.5 — Mensagem de fim de ano

> Agradeço a confiança dedicada durante esse ano e que em {{ANO_PROXIMO}} possamos compartilhar muitas vitórias.
> *Conte comigo!* — Paulo Roberto Tercini Filho

---

## Bloco XVI — Recursos e Acompanhamento Judicial

### 16.1 — Status — concluso, citação inicial, decisão

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}! Tudo bem?
>
> O último andamento foi em {{DATA}}, em que o processo foi encaminhado ao gabinete do Juiz para que ele dê a decisão inicial. Essa decisão inicial é onde o Juiz avalia sobre o nosso pedido de gratuidade de justiça e também determina a citação do INSS para responder no processo.
>
> Em {{COMARCA}} está demorando em torno de {{TEMPO_MEDIO}} para ter essa decisão inicial. Infelizmente é bem lento, mas estamos acompanhando.

### 16.2 — Sentença desfavorável e embargos

> *{{ATENDENTE}}:*
>
> O andamento atual do seu processo se encontra em aguardo do julgamento dos embargos de declaração feito pelo Dr. Paulo, pois o juiz na sentença {{MOTIVO_SENTENCA}}.
>
> Sendo assim, o Dr. Paulo fez um recurso de embargos de declaração questionando os fundamentos utilizados pelo juiz na sentença. Após os embargos poderá ser feito um novo recurso caso os embargos sejam negados.

### 16.3 — EPI e agente biológico — TRF e teses

> *Dr. Paulo Tercini:*
>
> Em {{DATA_SENTENCA}} o juiz julgou de forma contrária o processo, pois entendeu que existia EPI eficaz no seu caso. O juiz de {{COMARCA}} entende dessa forma em todos os casos que tem exposição aos agentes nocivos biológicos.
>
> Em {{DATA_RECURSO}} fiz um recurso direcionado para o próprio juiz de {{COMARCA}} para que ele analise novamente a questão do EPI, pois tem o laudo da {{ENTIDADE}} de que não há EPI eficaz no seu trabalho.
>
> Caso ele mantenha a decisão de forma contrária, irei apresentar o recurso para São Paulo. Apesar da demora, o procedimento é assim mesmo. No Tribunal, principalmente, o entendimento é de que inexiste EPI eficaz no caso de agente biológico. Acredito que vai dar certo!

> **Observação.** Discussão tem sustentação no Tema 555/STF, IRDR 15/TRF4 e Tema 1090/STJ. Skills defesa-probatoria-especial e auditoria-ppp devem ser consultadas antes de redigir manifestações ou recurso.

### 16.4 — Cobrança Ouvidoria + Gerência regional

> *Dr. Paulo Tercini:*
>
> {{NOME}}, {{TURNO}}!
>
> A reclamação na ouvidoria ainda consta em análise. No dia {{DATA_COBRANCA}} também cobrei andamento daquele pedido interno que eu havia solicitado e em {{DATA_EMAIL}} a gerência encaminhou novo e-mail para a gerência regional. Ambos os e-mails ainda sem resposta.
>
> Eu vou mantendo as cobranças, pode ficar tranquilo. Como esses últimos e-mails foram enviados na última {{DIA_SEMANA}}, irei cobrar novamente mais para o meio da semana.

### 16.5 — Aguardando resposta de Brasília (STJ/STF)

**Quando usar.** Processo em recurso especial ou extraordinário, demora longa.

> *Dr. Paulo Tercini:*
>
> Ainda não tem resposta de Brasília. Acredito que ainda vai demorar um pouco. Em Brasília é demorado.
>
> Não houve nenhuma movimentação até o momento.

### 16.6 — Tempo médio de tramitação no JEF

> *Dr. Paulo Tercini:*
>
> Existe prova suficiente para conseguirmos ganhar, mas o processo tem muitos trâmites, como a perícia médica que vai avaliar a real condição da incapacidade, e depois quem decide é o juiz. Pra agendarem a perícia judicial demora quase 6 meses. Está sendo tudo muito lento. Vamos trabalhar para ter êxito. Com fé em Deus vamos conseguir 🙏

### 16.7 — Mandado de Segurança contra INSS

**Quando usar.** Cliente compareceu à perícia/avaliação social mas sistema do INSS não registrou. Reclamação na ouvidoria não respondeu.

> *Dr. Paulo Tercini:*
>
> Até o momento não tivemos resposta da reclamação da ouvidoria e nem da agência do INSS de {{CIDADE}}. Eu irei fazer um processo judicial que chama Mandado de Segurança para que force o INSS a reabrir o processo administrativo para fazer a avaliação social.
>
> Eu faço um pedido de liminar agora para o juiz determinar a reabertura do processo administrativo e para agendar a avaliação. Se decidir de forma favorável é rápido. Se decidir de forma contrária é melhor solicitarmos o benefício novamente porque aí acaba demorando.
>
> Na maioria das vezes o juiz não decide de início sobre a liminar, mas pede para o INSS prestar informações e aí eles reabrem o processo e agendam a perícia. Isso é bem rápido. Acredito ser bem difícil de ter uma decisão contra, pois está bem claro que erraram, mas existe a possibilidade.

### 16.8 — Após denegação de liminar

**Quando usar.** Liminar negada — orientar abrir novo benefício.

> *Dr. Paulo Tercini:*
>
> O pedido de liminar para agendar novamente a avaliação social não foi aceito pela {{JUIZA}}. Estou aguardando o INSS se manifestar no processo e a depender do que responderem vai ser melhor solicitar o benefício novamente do que ficar esperando o processo. Provavelmente nos próximos dias já vou ter uma posição sobre isso.

---

## Bloco XVII — Detecção e Resposta a Golpe Sofisticado

### 17.1 — Identificação rápida pelo atendente

**Quando usar.** Cliente envia print ou texto extenso de mensagens recebidas oferecendo indenização milionária ou liberação de valores.

> *{{ATENDENTE}}:*
>
> {{NOME}}, é golpe.
> Só um minuto que ja te explico melhor.

### 17.2 — Explicação ampla com origem dos dados

> *{{ATENDENTE}}:*
>
> Estão se passando pelo doutor Paulo, o número não é dele. Eles vêm tentando aplicar esse golpe em vários clientes.
>
> Eles pegam os dados do(a) {{TRATAMENTO}} pois por conta da legislação brasileira os processos são públicos para qualquer um que tenha a validação dos advogados para consultar.
>
> {{TRATAMENTO}} chegou a passar algum dinheiro ou informação bancária para eles?

### 17.3 — Cliente já entregou conta bancária

**Quando usar.** Cliente passou número da conta para o golpista, mas não fez transferência.

> *{{ATENDENTE}}:*
>
> Nesse caso está tudo bem. Só bloquear e denunciar o número.
>
> Não tem relação nenhuma com a gente, é golpe mesmo. O DDD {{DDD_FALSO}} inclusive é de bem longe daqui.
>
> Normalmente não dá nada não, eles só pedem para obter credibilidade. Se {{TRATAMENTO}} não se sentir segura, vá até o atendimento do banco para confirmar se há algo a ser feito. Mas normalmente não dá nada.

### 17.4 — Confirmação pelo banco

**Quando usar.** Cliente quer extra segurança após contato com golpista.

> *{{ATENDENTE}}:*
>
> Sugiro ir até o caixa eletrônico ou no atendimento do banco pessoalmente para confirmar que não há lançamentos. Mantenha o aplicativo do banco com biometria ativa e troque a senha de acesso por precaução.

### 17.5 — Pergunta pessoal de prova

**Quando usar.** Cliente desconfia até do número oficial após onda de golpes — pede que o advogado confirme dado pessoal.

> *Dr. Paulo Tercini:*
>
> Sou eu, {{NOME}}. {{TRATAMENTO}} nasceu em {{ANO_NASCIMENTO}} e o telefone do escritório que {{TRATAMENTO}} já usou é (16) 3242-2908. Se quiser, podemos conversar por ligação agora pelo fixo.
>
> Bom que está atenta. Está sendo essencial nesse momento.

### 17.6 — Reabertura do atendimento normal pós-golpe

**Quando usar.** Após confirmar que era golpe e cliente bloquear o número.

> *{{ATENDENTE}}:*
>
> Perfeito. Agora me conta, em que posso ajudar?

---

## Bloco XVIII — Servidor Público, Direitos PCD e Cota

### 18.1 — Exoneração de servidor por aposentadoria

**Quando usar.** Cliente é servidor que vai aposentar e precisa formalizar exoneração no órgão.

> *Dr. Paulo Tercini:*
>
> {{NOME}}, com a aposentadoria deferida, {{TRATAMENTO}} precisará formalizar a exoneração junto ao {{ORGAO}}. Em geral o processo se faz pelo RH/Departamento de Pessoal apresentando a carta de concessão do benefício.
>
> Se {{TRATAMENTO}} preferir, posso preparar um requerimento de exoneração para protocolar.

### 18.2 — Cota PCD na empresa — orientação geral

**Quando usar.** Cliente retornou ao trabalho com sequela e empresa demanda laudo PCD para cota.

> *Dra. Amanda Garcez:*
>
> Para {{TRATAMENTO}} comprovar a deficiência que possui não precisa o laudo médico ser exclusivamente de um médico do trabalho, salvo se a empresa está exigindo isso.
>
> O laudo médico, desde que emitido por médico e relatando a sua condição de deficiência e as razões que causam as limitações, atende, preenchidos os requisitos do documento (CID, data, identificação do paciente).
>
> Se {{TRATAMENTO}} retornou para a empresa e não consegue exercer a atividade que fazia antes, a empresa obrigatoriamente tem que readaptar para uma função adequada. Existe previsão legal de reserva de vagas para deficientes.

### 18.3 — Auxílio-acidente vs auxílio-doença — escolha de relatório

**Quando usar.** Cliente recebe vários relatórios — usar seletivamente.

> *Dr. Paulo Tercini:*
>
> Esse relatório irá servir para anexarmos junto no pedido de Auxílio-Acidente. O que preciso ver com {{TRATAMENTO}} é se vai utilizar esse relatório médico também para afastar do trabalho ou se vai continuar trabalhando.
>
> Para o nosso processo de auxílio-acidente esse relatório não utilizarei. Irei utilizar os outros.

### 18.4 — Atestado de 7 dias para empresa

**Quando usar.** Cliente fica afastado por menos de 15 dias.

> *Dr. Paulo Tercini:*
>
> Leva o original para a empresa.

---

## Bloco XIX — Indicações, Procuração e Outras Áreas

### 19.1 — Recebimento de indicação

> *Dr. Paulo Tercini:*
>
> Tudo bem, entrarei em contato. Qual o nome do(a) cliente?
> Muito obrigado pela indicação!

### 19.2 — Cliente em outras áreas — encaminhamento

**Quando usar.** Cliente pergunta sobre direito civil, dano moral, prefeitura, IPTU.

> *Dr. Paulo Tercini:*
>
> Eu não atuo nessa área. O outro advogado no escritório faz isso. Posso indicar.
>
> Eu só trabalho com processo de aposentadoria, mas indico o outro advogado do escritório que pode auxiliar nisso.

### 19.3 — Negativa franca de revisão sem fundamento

**Quando usar.** Cliente pergunta sobre revisão de FGTS ou tese sem chance de êxito.

> *Dr. Paulo Tercini:*
>
> Por enquanto não está dando certo. Vai ser julgado no Supremo no dia {{DATA_JULGAMENTO}}, mas acredito que não irá dar certo pq o impacto para o governo pagar essas revisões seria muito alto.
>
> Se a decisão for favorável irei fazer essas revisões, mas por enquanto não vale a pena.

### 19.4 — Recepção de documentos por terceiro

**Quando usar.** Familiar ou conhecido envia documentos em nome de cliente.

> *Dr. Paulo Tercini:*
>
> Boa noite, {{NOME_TERCEIRO}}!
> Perfeito, recebi os documentos. Amanhã entro em contato para dizer se deu certo de gerar o boleto.
> Muito obrigado!

### 19.5 — Validação por chamada de rotina

**Quando usar.** Cliente fora de Monte Alto, atendimento agendado por telefone com Dr. Paulo.

> *Dr. Paulo Tercini:*
>
> Bom dia {{NOME}}, tudo bem?
> Aqui é o Paulo Tercini, advogado. Estou ligando para falar sobre {{ASSUNTO}}.

### 19.6 — Documento como print no lugar de PDF

**Quando usar.** Cliente não consegue gerar PDF, manda print do app do banco.

> *Dr. Marcos:*
>
> Não tem problema.

### 19.7 — Defesa apresentada — explicação ao cliente

> *Dr. Marcos:*
>
> {{NOME}}, bom dia! Tudo bem?
> Eles apresentaram a defesa deles. Vou me manifestar sobre a defesa e depois o processo volta para mesa do Juiz.

---

## Bloco XX — Boas Práticas de Uso dos Templates

### 20.1 — Tratamento — quando usar "senhor" ou "senhora"

**Quando usar.** Diretriz interna não-textual.

> Default — usar "senhor"/"senhora" com clientes idosos, em primeiro contato e em situações formais (concessão, decisão judicial, indeferimento, intimação).
> Cliente que adota tom informal e respondem como "você" — manter "você" após o primeiro turno.
> Cliente jovem que se apresenta pelo primeiro nome — "você" desde o início.
> Manter coerência ao longo de toda a conversa.

### 20.2 — Quando ligar em vez de mensagear

> Sempre que houver explicação técnica longa de cálculo, projeção ou estratégia de aposentadoria.
> Sempre que houver necessidade de orientar o cliente em tempo real para a perícia médica ou pericial social.
> Sempre que houver decisão judicial relevante (concessão, sentença, decisão de tutela, indeferimento de liminar).
> Sempre que houver risco de mal-entendido emocional, especialmente em situações de saúde grave.

### 20.3 — Repetição do aviso anti-golpe

> Sempre que cliente mencionar contato suspeito, ligação estranha, mensagem de número desconhecido, oferta de liberação de valor, depósito antecipado ou cobrança não combinada — repetir aviso anti-golpe e oferecer confirmação por pergunta pessoal (template 17.5).
> Sempre que cliente solicitar valor a depositar em chave PIX desconhecida — solicitar foto da mensagem para verificar e confirmar pelo fixo (16) 3242-2908.

### 20.4 — Confirmação de cálculos antes de enviar

> Antes de enviar valores, percentuais ou datas — verificar fontes oficiais (CNIS, MEU INSS, processo, contrato de honorários).
> Cálculos previdenciários nunca devem ser apresentados ao cliente sem o CNIS completo. Se houver dúvida, indicar exatamente quais informações estão faltando.

### 20.5 — Transcrição literal de extratos do INSS

> Quando o cliente solicitar valores e datas constantes em extrato do MEU INSS — transcrever literalmente os dados, não interpretar nem ajustar para "arredondar".
> Em caso de divergência entre o extrato e a expectativa do cliente — apontar a divergência e propor verificação.

### 20.6 — Escalação ao Dr. Paulo

> Sempre que houver dúvida técnica de mérito (cálculo, viabilidade, estratégia), o atendente diz "vou transferir para o Dr. Paulo" e aguarda. Não opina.
> Sempre que houver decisão sobre ajuizar nova ação, recurso especial, mandado de segurança ou agendamento estratégico de perícia — Dr. Paulo decide.
> Para decisões financeiras (honorários, prestação de contas, parcelamento) — Dr. Marcos é a referência.

### 20.7 — Acordo administrativo — alerta

**Quando usar.** INSS oferece acordo administrativo após tutela.

> Antes de aceitar qualquer acordo administrativo proposto pelo INSS — solicitar análise técnica do Dr. Paulo. Acordos administrativos podem prejudicar o cliente em pagamentos vincendos, retroativos ou na própria DIB. Não responder sozinho.
> Confrontar com Súmula 111/STJ e Tema 1050/STJ antes de pactuar honorários.

### 20.8 — Anexação obrigatória de PDFs

> Sempre que enviar comprovante de agendamento, carta de concessão, agendamento de perícia ou histórico de créditos — anexar o PDF original do INSS, não apenas descrever.
> Cliente acompanha melhor com o documento à mão e isso evita confusão sobre datas, locais e valores.
> Se cliente não conseguir gerar PDF de print, aceitar a imagem (template 19.6).

---

## Notas Finais

Estes templates devem ser revisados e atualizados sempre que houver mudança normativa relevante (Portarias do INSS, Decisões da Justiça Federal, Resoluções do CRPS). Sugere-se revisão periódica para incluir novas situações encontradas na rotina diária do escritório.

Este documento serve como referência operacional, não substitui o uso técnico das skills jurídicas em casos concretos. Antes de qualquer petição, recurso ou auditoria, devem ser consultadas as skills do ecossistema do escritório com o rigor técnico aplicável.
