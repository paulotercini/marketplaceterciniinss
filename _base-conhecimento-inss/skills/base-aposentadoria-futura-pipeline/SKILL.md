---
name: base-aposentadoria-futura-pipeline
description: "Pipeline operacional pró-segurado de gestão da carteira de Aposentadorias Futuras, identificando o momento exato de acionamento, antecipação documental e contato preventivo. Use SEMPRE que mencionar carteira de aposentadoria futura, lista Aposentadorias Futuras, cliente esperando direito amadurecer, monitoramento de DER próxima, marco etário próximo, completar idade para aposentadoria, completar tempo de contribuição, gatilho de acionamento, contato preventivo cliente, maturação de direito, janela de protocolo, carteira potencial INSS, conversão futuro em ativo, follow-up de cliente em espera, dueDateTime D-60, contato D-90 preventivo, próxima ação aposentadoria futura, abandonadas Aposentadorias Futuras. Cruza com base-aposentadoria-regra-permanente-ec103, base-aposentadoria-transicao-ec103, base-aposentadoria-pcd-lc142, base-aposentadoria-direito-adquirido, ponte-orquestrador-previdenciario e base-cnis-acerto-indicadores."
---

# Pipeline de Aposentadorias Futuras

## Escopo

Gestão da lista Aposentadorias Futuras do Microsoft To Do (nome da lista com emoji inicial), que reúne clientes já atendidos cujo direito ainda não se completou. É a maior carteira potencial inativa do escritório e exige acompanhamento ativo.

## Premissa central

Cliente em Aposentadorias Futuras não está arquivado: aguarda, com acordo de retorno, o cumprimento do requisito. Sem contato no momento certo, o cliente procura outro advogado, protocola sozinho pelo Meu INSS ou perde a data mais vantajosa e recebe benefício menor.

## Regra dos 3 marcos temporais

Para cada tarefa em Aposentadorias Futuras com data alvo definida, configurar três marcos:

**Marco D-90 (90 dias antes da data alvo).** Contato preventivo. Não pede ação. Apenas reativa o relacionamento. Mensagem padrão "estamos chegando perto, vamos preparar a documentação". Confirma telefone, endereço, e checa se o cliente continuará com o escritório.

**Marco D-60 (60 dias antes da data alvo).** Contato operacional. Solicita CTPS atualizada, comprovante de residência recente, documento de identidade vigente, e atualiza CNIS. Marca atendimento presencial ou virtual para acerto de documentos.

**Marco D-0 (data alvo).** Protocolar requerimento administrativo no Meu INSS imediatamente após o cliente cumprir o requisito (idade, tempo de contribuição, deficiência caracterizada). Se o cliente atrasou a documentação, segurar até estar pronto, mas reabrir contato semanal.

## Configuração no Microsoft To Do

Cada tarefa em Aposentadorias Futuras deve ter no body, em formato fixo:

```
[BENEFÍCIO ALVO]: Aposentadoria por Idade Urbana / TC / PCD LC 142 / etc
[REQUISITO PENDENTE]: idade 65 / 35 anos contribuição / etc
[DATA ALVO]: 01/05/2027 (data exata em que o requisito é cumprido)
[ÚLTIMO CONTATO]: 02/05/2026 (data da última conversa registrada)
[CADÊNCIA DE CONTATO]: a cada 6 meses (entre acordos verbais com o cliente)
[HONORÁRIOS]: 30% atrasados + 1 mensalidade (preacordados)

FIXO: cliente quer ser avisado por WhatsApp antes
FIXO: tem documentos físicos no envelope X do armário
```

E no `dueDateTime` da tarefa, configurar a data alvo MENOS 60 dias (D-60). O Microsoft Graph não suporta múltiplos dueDateTimes, então adota-se o D-60 como gatilho operacional principal.

## Diagnóstico da carteira (levantamento de 2026)

O levantamento identificou:
- 377 tarefas totais, 336 abertas, 41 concluídas
- 154 abandonadas há mais de 180 dias
- 68 sem nenhuma entrada datada (vácuo informacional)
- 74 com data alvo nos próximos 180 dias (acionamento iminente)
- 271 onde Paulo é último autor (ou sem autor)

Há concentração de Aposentadoria por Idade Urbana (186 dos 336 abertos = 55 %), seguida de TC (54), Especial (43), PCD (37) e BPC (28).

## Rotina mensal de varredura

No primeiro dia útil de cada mês, executar `maturacao_aposentadorias.py` (a construir) que percorre a lista Aposentadorias Futuras e gera três relatórios:

1. **Acionamento iminente.** Tarefas cujo dueDateTime está nos próximos 60 dias. Aciona D-60.
2. **Pré-acionamento.** Tarefas cujo dueDateTime está entre 60 e 120 dias. Aciona D-90.
3. **Hibernação saudável.** Tarefas cuja data alvo está a mais de 120 dias. Apenas confirmar que não estão abandonadas (último contato há menos de 6 meses).

Para cada caso de acionamento, o script gera mensagem WhatsApp pronta usando os templates oficiais do escritório.

## Tratamento das 154 abandonadas

Triagem em sessão dedicada (Paulo + Amanda) com 4 destinos possíveis:

**Manter na lista.** Cliente confirmado em contato recente, data alvo ainda longe.

**Mover para Clientes Encerrados.** Cliente sumiu há mais de 2 anos sem retornar contato, ou já se aposentou em outro escritório (verificar Meu INSS).

**Acionar agora.** Data alvo já passou ou está a menos de 90 dias e tarefa estava sem ação. Tratar como urgência.

**Cancelar.** Cliente faleceu (verificar). Sucessores podem ser candidatos a pensão por morte.

## Documentação prévia obrigatória

Por padrão, ao cadastrar cliente em Aposentadorias Futuras, registrar no body:

- Espécie de benefício e regra de cálculo aplicável
- Lista de contribuições já comprovadas
- Lista de contribuições faltantes ou questionáveis
- Acordo de honorários (escrito ou verbal documentado)
- Telefone, e-mail, endereço atualizados
- Forma de contato preferida (WhatsApp, ligação, presencial)

Isso evita que, na hora do acionamento, perca-se tempo refazendo onboarding.

## Hipóteses-armadilha

**Cliente perdeu qualidade de segurado durante a espera.** Verificar período de graça, contribuições facultativas em manutenção. Se perdeu, recalcular janela.

**Surgiu regra mais favorável.** Reavaliar periodicamente as hipóteses alternativas (transição ou permanente, tempo especial, deficiência).

**Cliente já cumpre outra regra antes da data alvo.** Comparar a RMI imediata com a da regra futura (por exemplo, art. 17 com fator previdenciário contra art. 15 ou 20) e o valor acumulado das parcelas.

**Cliente faleceu sem aposentar.** Pensão por morte para dependentes. Skill `base-pensao-por-morte-pos-reforma`.

## Estratégia administrativa

Protocolo no Meu INSS no dia em que o requisito é cumprido. Pedido antecipado tende ao indeferimento; se feito, requerer a reafirmação da DER no próprio processo administrativo (IN 128/2022, art. 577; Tema 995 STJ). Na aposentadoria especial, o segurado que permanece na atividade nociva tem o benefício cessado após a implantação (Tema 709 STF): orientar o afastamento antes.

Havendo mais de uma regra cumprida, simular todas e requerer a mais vantajosa, com pedido expresso de análise do melhor benefício (Tema 334 STF).

## Estratégia judicial

Se o INSS ultrapassa o prazo de análise do acordo homologado no RE 1.171.152/STF, MS por mora administrativa (`base-ms-decadencia-omissao-demora`).

Se INSS indefere DER cumprida, recurso ordinário ao CRPS em 30 dias. Skill `ponte-workflow-crps`.

Divergência de cálculo: revisão administrativa ou judicial logo após a concessão, dentro do prazo de 10 anos do art. 103 da Lei 8.213/91.

## Integração com outras skills do escritório

- `base-aposentadoria-direito-adquirido` para regras transitórias
- `base-aposentadoria-regra-permanente-ec103`, `base-aposentadoria-transicao-ec103` para enquadramento
- `base-aposentadoria-pcd-lc142` para PCD
- `base-cnis-acerto-indicadores` para auditoria documental antes do protocolo
- `base-ms-decadencia-omissao-demora` para mora pós-DER
- `ponte-orquestrador-previdenciario` para casos com pluralidade de hipóteses

## Métrica de sucesso

Indicadores a acompanhar mensalmente:
- Quantidade de clientes em Aposentadorias Futuras (estável é OK)
- Conversões para protocolado (meta crescente)
- Taxa de abandono (clientes sem contato há mais de 1 ano - meta zero)
- Tempo médio entre data alvo e protocolo efetivo (meta 0 a 30 dias)

## Link operacional

Lista no Microsoft To Do, `Aposentadorias Futuras`. Acessível pelo conector Microsoft Graph com escopo `Tasks.ReadWrite`.

Script auxiliar `maturacao_aposentadorias.py` (em construção no repositório `paulotercini/marketplaceterciniinss`).

## MCPs da casa

Consulta obrigatória aos MCPs. Toda análise, peça ou orientação feita com esta skill parte de pesquisa prévia nos MCPs, antes da redação. O `normas` dá o dispositivo e o `norma_inss` do `iurisprudencia` dá a IN 128/2022; o `superiores` dá o tema e a decisão do STF e do STJ; o `iurisprudencia` e o `trf3` dão os acórdãos da TNU, do CRPS, do TRF3 e das Turmas Recursais de SP e MS sobre a mesma questão; o `acervo` dá o que o escritório já sustentou. As decisões localizadas servem de controle da tese. A resposta informa se elas confirmam ou contrariam o caminho adotado, e a divergência é enfrentada antes do protocolo. Norma, súmula, tema, enunciado ou acórdão não localizado no MCP nem lido na fonte oficial leva [NÃO CONFIRMADO] e fica fora da peça. A ordem de consulta, a cobertura de cada base e os catálogos (`base-precedentes-catalogo-vinculantes` e catálogo complementar da `auditoria-citacoes`) estão em `base-legislacao-fontes-primarias`, seção "Protocolo de pesquisa obrigatória nas MCPs". O reaproveitamento automático de texto do acervo de um cliente em peça de outro é vedado. A entrega no chat segue `base-protocolo-operacional-escritorio/references/PADRAO-DE-ESCRITA.md`.
