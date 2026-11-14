# Pré-atendimento no CRM: diagnóstico do fluxo atual

Leitura de `crm/fase2/app.html` em 14.11.2026, sem alteração em produção.

## Telas e botões

- **Identificação** (aba Cadastro): dados, Contato, Aposentadoria, Atendimentos presenciais, botão **Dossiê** (balcão) e **+ atendimento**, visível apenas ao advogado (`podeAtender`).
- **+ atendimento** (`novoAtendimento`) cria o pré-caso e abre a tela cheia com quatro passos: Primeiro atendimento (`painelPA`), Mapa do dossiê, Análise de Direito (`painelDireito`) e Documentos (`painelDocumentosAtend`).
- Cabeçalho do atendimento: **Anotações** (gaveta), **Salvar pré-caso** (`concluirEtapa`) e **Sair** (`sairModoAtendimento`, que descarta o pré-caso não salvo).
- Fim de Documentos: **Criar caso** (`criarCasoDoAtend`), **Criar aposentadoria futura** e **Encerrar**.
- **Honorários**: aba própria da ficha (`painelPagamentosFicha`), alimentada pela proposta de honorários na concessão (`propostaHonorarios`), sem ligação com o pré-caso.

## Tabelas

- `casos`: o pré-caso é linha com `pre_caso = true` na fase Escritório; objeto em `casos.precaso`, escolhas da análise em `casos.ad`.
- `analises_direito`, `lembretes` (aposentadoria futura), `pagamentos`, `anexos`.

## Onde ficam hoje as anotações do pré-atendimento

Em `clientes.campos.atendimento` (lista no cadastro do cliente, presa ao pré-caso por `precaso_id`) e documentos pedidos em `clientes.campos.docs_pedidos`. Ao virar caso, o caso mostra o quadro "Do atendimento", mas as anotações não viram andamentos do caso.

## Lacunas

1. **Três nomes para a mesma etapa**: "+ atendimento", "Atender" e "pré-caso", sem botão "Pré-atendimento".
2. **Oito subabas no Cadastro** (Identificação, Triagem, Anotações, Documentos, Primeiro atendimento, Mapa, Análise, Mensagens), com Documentos duplicado dentro e fora do atendimento.
3. **Anotações fora do caso**: vivem no cadastro e não entram na linha do tempo do caso criado.
4. **Honorários desligados**: o pré-caso guarda apenas um campo de texto; as parcelas nascem só na concessão, nunca no "Criar caso".
5. **Sem conclusão do cliente**: não há etapa de encerramento que reúna caso, pagamentos e arquivamento.
6. **Recepção à margem**: faz o cadastro e avisa pelo Pronto do balcão, mas não acompanha o pré-caso.
