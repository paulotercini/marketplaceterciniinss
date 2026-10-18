# Atendimento em etapas

Estudo de 17.10.2026, a pedido do Paulo: as páginas longas do CRM parecem carregadas porque mostram tudo de uma vez.
A proposta mantém o conteúdo e muda o quanto se vê de uma vez, separando a página em passos.
Estudo com os protótipos: https://claude.ai/artifact/7naCSCHvExCjhJMBVdeouL

## Medida (telas de 700 px a 1000 px de largura, clientes fictícios dos testes F235 e F236)

| Página | Mediana | Pior caso | Vale separar em passos? |
|---|---|---|---|
| Caso completo | 5,6 | 8,3 | Não. Agrupar por mês, com só o mês atual e o anterior abertos |
| Análise de Direito | 2 a 4,4 | 4,5 | Sim |
| Visão do caso | 3,5 | 5,5 | Não. É um painel consultado várias vezes ao dia; mostrar os 5 andamentos mais recentes |
| Primeiro atendimento | 3,1 | 4,2 | Sim |
| Documentos | 3,1 | 3,6 | Sim |
| Honorários | 2,0 | — | Não |
| Identificação | 1,4 | — | Não |

## O modelo

- **Dois níveis.** Os quatro passos do atendimento ficam no topo. Dentro de cada página longa vai uma trilha com flechas, a mesma forma das etapas do caso.
- **Uma tela por passo.** O passo feito leva ✓, o aberto fica em destaque e o que tem risco tem o número em vermelho.
- **Nenhum passo é trancado.** O "Próximo" só sugere a ordem da conversa.
- **O urgente aparece em todos os passos.** O prazo correndo fica no alto de cada um.
- **Barra do pé.** Tem "← Anterior", "Próximo: nome do passo" e, no último passo, o botão de concluir.
- **"Ver tudo numa página".** Devolve a página inteira e fica lembrado no navegador (`crm_passos_tudo`).
- **O passo aberto vale por pré-caso** (`casos.ad.passos.<tela>`). Ao reabrir o atendimento, ele volta no mesmo ponto.
- **Os passos de fora só ficam escondidos.** Continuam na página, por isso as provas que leem o texto das telas seguem valendo.

## Ondas

1. **F238 (11.62), feita.** A trilha comum (`passosDaTela`, `passoPinta`, `passoIr`, `passoVai`, `passoTudo`) e o Primeiro atendimento em passos.
   - Cada quadro de `quadrosDoPA` é um passo, e o último é "Escolher os benefícios".
   - O quadro sem nada a mostrar entra no passo "Não encontrado".
   - Sem dossiê não há trilha.
2. **F239 (11.63), feita.** A Análise de Direito em passos no modo atendimento (fora dele fica como era). Quatro passos:
   - Benefício.
   - Já resolvido: em ordem e informativo, uma linha cada.
   - Falta responder: em risco, falta, a informar e divergente, com os campos.
   - Conclusão: "O que dá para fazer agora", tempos, considerações, "Registrar análise" e a linha que leva ao Desfecho.
3. **F240 (11.64), feita.** Documentos em passos no modo atendimento com pré-caso (fora dele fica como era): Assinar (com os gerados e assinados), Pedir ao cliente (com o que já temos no dossiê), Guia do pedido e Desfecho. Catálogo, consultas com o CPF, anexos da IN 128 e site interno ficam na gaveta "Ferramentas", fechada e à vista em todos os passos. A conversa da equipe continua abaixo da página, como nas outras abas do atendimento.
4. **F241 (11.65), feita.** Encurtar o caso, sem passos:
   - A linha do tempo do Escritório mostra os dias mais recentes, com ao menos 5 anotações e todas as não lidas. As mais antigas ficam no botão "Ver as N anotações mais antigas".
   - Prazos e compromissos mostra o próximo, o próximo prazo fatal, a perícia, os vencidos, os a confirmar e o que vence em 7 dias. As datas mais adiante ficam em "Ver mais N datas", na mesma ordem decrescente (F145).
   - O Caso completo, com mais de 12 registros, vem por mês dentro de cada fase. Ficam abertos o mês atual, o anterior e o mês mais recente do caso.

## Decidido

- **O Desfecho fica só no fim de Documentos** (Paulo, 17.10.2026). Na Análise de Direito, a Conclusão traz a linha "Ir ao Desfecho, em Documentos" (`linhaDesfecho`, `irDesfecho`).
- **Com um benefício só**, ele abre sozinho e a primeira visita começa depois do passo "Benefício".
- **Escolher o benefício** leva ao passo seguinte. O veredito do benefício fica à vista em todos os passos dele, e responder um campo recalcula sem trocar de passo.
