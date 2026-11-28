---
name: base-honorarios-contratuais-cobranca
description: "Honorários contratuais e cobrança de clientes em advocacia previdenciária pró-segurado, distintos de honorários de sucumbência. Use SEMPRE que mencionar honorários contratuais, contrato de honorários advocatícios, cobrança de cliente, lista 💵 Pagamentos, Microsoft To Do Pagamentos, percentual sobre atrasados, percentual sobre mensalidade, honorários ad exitum, honorários iniciais, honorários por etapa, parcelamento de honorários, inadimplência cliente, distrato com cliente, retenção de documentos por inadimplência, ação de cobrança honorários, execução honorários OAB, retenção art 22 EAOAB, contrato escrito advocatício, honorários em RPV, destaque de honorários no precatório, antecipação cliente, cobrança preventiva, lembrete de pagamento, código de ética OAB cobrança. Cruza com base-cpc-honorarios-sucumbencia-previdenciaria, base-cumprimento-sentenca-rpv-precatorio, base-canais-falabr-corregedoria-cgu e base-aposentadoria-futura-pipeline."
---
# Honorários Contratuais e Cobrança de Clientes

## Escopo

Rotina operacional do escritório para fixar, registrar e cobrar os honorários contratuais. O regime jurídico do contrato (cláusulas, multa por revogação, destaque, execução, CED) está em `honorarios-contrato-previdenciario`. A sucumbência está em `base-cpc-honorarios-sucumbencia-previdenciaria`.

## Premissa

Contratual e sucumbência não se confundem (EAOAB, art. 22, caput, e art. 23). O cliente paga o contratual; o vencido paga a sucumbência. Na vitória, o escritório recebe os dois. Na derrota, recebe o contratual já pago.

## Modalidades usadas no escritório

A. Êxito (mais comum). 30% sobre os atrasados e 1 mensalidade do benefício, devida após a implantação.
B. Valor inicial. Entre R$ 500 e R$ 1.500, conforme a complexidade.
C. Por etapa. Para casos longos, com nota a cada etapa concluída.
D. Valor fixo total. Raro no previdenciário.

Todo cliente novo assina contrato escrito. Se recusar o escrito, registrar o acordo no corpo da tarefa com data e testemunhas e, se possível, gravar áudio de aceite.

## Registro na lista Pagamentos (Microsoft To Do)

Cada cliente da lista 💵 Pagamentos tem no corpo da tarefa:

```
[CASO]: espécie e número do processo
[HONORÁRIOS CONTRATUAIS]: 30% atrasados + 1 mensalidade
[HONORÁRIO INICIAL]: R$ ___ quitado em DD/MM/AAAA
[FORMA DE PAGAMENTO]: PIX [chave] ou parcelado
[STATUS]: aguardando crédito / implantado, falta mensalidade / inadimplente
FIXO: observações permanentes
```

Cada pagamento vira item de checklist com data e valor, no padrão `(A): Pagou R$ ___ em DD/MM/AAAA`. Tarefa sem corpo é cobrança às cegas; preencher antes de cobrar.

## Rotina de cobrança

Antes do crédito. Na implantação ou na liberação dos atrasados, criar tarefa com prazo na data prevista do crédito mais 7 dias e fazer contato proativo.
Até 30 dias do crédito confirmado sem resposta. Cobrança formal por WhatsApp ou e-mail, com mensagem respeitosa.
60 dias sem pagamento e duas tentativas sem resposta. Carta com AR.
90 dias. Notificação extrajudicial (`base-notificacao-extrajudicial-mapeamento-institucional`).
Última instância. Execução do contrato, nos termos de `honorarios-contrato-previdenciario`, seção 7. Protesto do contrato é vedado pelo CED, art. 52.

Em ação judicial, o meio mais seguro é o destaque dos honorários na RPV ou no precatório (EAOAB, art. 22, §4º): contrato juntado com a inicial e pedido reiterado antes da expedição.

## Situações frequentes

Cliente quer renegociar após o êxito. Ouvir; se a dificuldade for comprovada, conceder desconto por aditivo escrito.
Cliente diz que desconhecia o honorário. Sem registro escrito ou áudio, a prova fica difícil; daí a regra do contrato escrito.
Cliente faleceu. O crédito é dívida do espólio e se habilita no inventário. A pensão dos dependentes pede contrato novo.
Distrato ou troca de advogado. Honorários proporcionais ao serviço prestado; comunicar o novo patrono e o juízo.

## Tributação

Honorário contratual é receita tributável do escritório. Emitir nota fiscal e controlar por cliente. Na cobrança tardia, correção e juros seguem o contrato; na falta de pacto, IPCA e taxa legal (CC, arts. 389, parágrafo único, e 406, na redação da Lei 14.905/2024).

## Mensagens-modelo

Cobrança preventiva. "Olá, Sr./Sra. [NOME]. Seu benefício foi implantado e os atrasados foram liberados. Quando puder, acertamos o honorário combinado: R$ [VALOR], PIX [chave]."
Mensalidade. "Olá, como combinado, no mês da implantação fica devida 1 mensalidade do honorário, R$ [VALOR]. Prefere passar aqui ou fazer PIX?"
Atraso de 30 dias. "Olá, Sr./Sra. [NOME], ainda não recebemos o pagamento combinado. Se houver dificuldade, podemos conversar sobre alternativa."
Atraso de 60 dias. Texto formal, com referência ao contrato e oferta de parcelamento.

## Metas

Tempo entre implantação e quitação abaixo de 30 dias. Inadimplência abaixo de 5% da carteira. Nenhuma tarefa sem corpo na lista Pagamentos. Cobranças que chegam à execução abaixo de 1%.

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.

## Integração

`honorarios-contrato-previdenciario`, `base-cpc-honorarios-sucumbencia-previdenciaria`, `execucao-cumprimento-previdenciario` (destaque na requisição), `base-notificacao-extrajudicial-mapeamento-institucional`, `base-canais-falabr-corregedoria-cgu`.
