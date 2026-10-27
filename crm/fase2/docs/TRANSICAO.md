# A transição do To Do para o CRM em níveis

Decisões do Paulo em 20.10.2026. O To Do era simples: escrever a anotação e mais nada. O CRM novo tem muitas
opções e é difícil aprender tudo de uma vez. A transição mantém a anotação no centro e liga o resto aos poucos.

## Princípio

A **anotação é o centro** em todos os níveis. O que o CRM faz com ela continua rodando por trás: lê "verificar
em 24/08", o protocolo, a perícia e a DCB, calcula o prazo e os requisitos. Quem só escreve não perde nada, e quem
está no nível completo vê tudo o que o outro escreveu.

## Os níveis (por colaborador)

| Nível | O que se vê |
|---|---|
| 0 · Primeiro acesso | Só a 📅 Agenda (a integrada ao Google Agenda), que é a tela inicial e a única lista do menu, e a Identificação do cliente. A pesquisa acha o cliente e abre só a Identificação; o Novo Cliente funciona. |
| 1 · Andamentos dos portais | O nível 0 e a aba Casos, somente leitura: só as abas INSS, Recurso (CRPS) e Judicial, sem o campo de escrever, sem os prazos e sem os botões que gravam (ficam os de trocar de aba, abrir o documento, copiar e marcar como lido). As etapas aparecem, mas não se escolhem. Decisão do Paulo de 27.10.2026: o colaborador se familiariza com a agenda, o cadastro e os andamentos antes de escrever. |
| 2 · Anotação | A linha do tempo do Escritório, o campo de escrever com os tipos e as Sugestões, os prazos à vista, o Lembrar em e o que a onda ligou. No atendimento, as telas simples até a onda delas. É o nível em que se deixa o To Do. |
| 3 · Completo | O CRM inteiro. |

- O nível é **por colaborador** e quem define é o Paulo (menu da conta, "Níveis da equipe").
- Ao ligar a transição, **todos começam no nível 0 (primeiro acesso), menos o Paulo**, que fica no 3 (ajuste do Paulo de 21.10.2026).
- Em qualquer tela simples há "Ver … completo", que vale para a sessão: nada fica trancado.
- Sem a transição ligada, todos veem o CRM completo, como antes.

## As ondas

Cada onda liga um conjunto de recursos para quem está nos níveis 1 e 2. A ordem vai do gesto mais repetido ao mais
complexo:

1. Lembrar em, "Em análise · +7 d" e Concluir.
2. Sem resposta, Pedir ao cliente e Trouxe documentos.
3. Perícia: agendar, avisar e compareceu.
4. Movimentou, acordo e Ouvidoria.
5. Primeiro atendimento em quadros e Documentos completo.
6. Análise de Direito por requisitos.

A troca de onda é do Paulo, no mesmo botão. Para decidir quando passar, o banco diz, por pessoa, quantas anotações
escritas à mão o botão da onda teria feito (o mesmo levantamento da F247).

## Onde está no código (F249)

`config_app.crm_transicao = {ligada, onda, niveis: {colaborador_id: 1|2|3}}`; `transicao`, `nivelDe`, `meuNivel`,
`ondaAtual`, `aplicarNivel` (põe `data-nivel` no `<html>` e esconde o que a onda ainda não ligou, `REC_ONDA`),
`telaSimples` (`ONDA_TELA`: Primeiro atendimento e Documentos na onda 5, Análise de Direito na 6), `paSimples`,
`adSimples`, `docSimples`, `verCompleto`, `abrirTransicao` (o painel do Paulo).
