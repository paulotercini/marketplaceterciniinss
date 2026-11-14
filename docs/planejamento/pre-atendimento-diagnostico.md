# Pré-atendimento: diagnóstico do fluxo atual

Leitura de `crm/fase2/app.html` em 14.11.2026. Parte 1 de 3 do replanejamento.

## Telas e botões

- **Identificação** (Cadastro): Dossiê, Atualizar, quadro Aposentadoria e o botão **+ atendimento**, visível apenas ao advogado (`podeAtender`).
- **Modo atendimento** em tela cheia (`ATEND_SUBS`): Primeiro atendimento (`painelPA`), Mapa do dossiê, Análise de Direito (`painelDireito`) e Documentos (`painelDocumentosAtend`), com **Salvar pré-caso** (`concluirEtapa`) e **Sair** (`sairModoAtendimento`, que descarta o pré-caso não salvo).
- **Fim de Documentos**: Criar caso (`criarCasoDoAtend`), Criar aposentadoria futura e Encerrar.
- **Honorários**: aba própria do cliente; a proposta nasce da concessão (`propostaHonorarios`), e não do atendimento.

## Tabelas

- `casos`: o pré-caso é a linha com `pre_caso = true`, `precaso` (natureza, honorários, etapas, desfecho) e `ad` (escolhas da Análise de Direito).
- `clientes.campos`: `atendimento`, `docs_pedidos`, `pc_arquivados` e os legados `precasos` e `ad_modulos`.
- `analises_direito`, `lembretes`, `pagamentos`, `anexos`.

## Onde ficam as anotações hoje

Em `clientes.campos.atendimento`, no cadastro do cliente, presas ao pré-caso apenas pelo `precaso_id`. Os documentos a pedir ficam em `campos.docs_pedidos`; a análise, em `casos.ad` e `analises_direito`.

## Lacunas

1. As anotações não moram na linha do pré-caso e não passam ao caso criado.
2. O início do atendimento é pouco visível e restrito ao advogado.
3. Primeiro atendimento e Mapa repetem a mesma leitura do dossiê.
4. O desfecho existe apenas no último passo de Documentos.
5. Honorários e contrato não têm passo no fluxo; o caso nasce sem eles.
6. Não há etapa de conclusão do cliente depois do pagamento.
7. Os legados em `campos` coexistem com a linha de `casos`.
