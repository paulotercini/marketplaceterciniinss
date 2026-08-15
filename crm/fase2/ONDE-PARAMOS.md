# Onde paramos — 15.08.2026, versão 09.17

## O que foi feito nesta rodada

**F15 · contraste e alvo de toque** (09.13). Auditoria no CRM em uso, tela a
tela. Doze cores de texto reprovavam nos 4,5:1 da WCAG; cinco alvos de clique
ficavam abaixo de 24×24 px, três deles nas quinze telas.

A primeira medida que fiz estava **errada** — ignorava o canal alfa e
comparava texto claro com fundo transparente. Refiz compondo o alfa pela
cadeia de pais até o primeiro fundo opaco. Nenhuma correção foi aplicada com
a medida errada.

**F16 · a travada** (09.14 e 09.15). O que mais pesa no uso não era cor.
`hoje()` montava um formatador de fuso a cada chamada e era chamada 5.790
vezes num filtro só.

| tela | antes | depois |
|---|---|---|
| ☀️ Meu Dia | 1.601 ms | 25 ms |
| montarSidebar | 1.206 ms | 34 ms |
| quantosNoMeuDia | 1.138 ms | 2 ms |
| Planejado | 1.082 ms | 161 ms |

Mesma causa em `dataSP`, `horaSP` e `agoraSP`, que serviam a Agenda e ao
Calendário. E um erro que derrubava a tela inteira: `visao="fase:pagamento"`
fazia `FASES.find(...)[1]` sem guarda.

**F17 · a espécie dentro da triagem** (09.16 e 09.17). Doze famílias de
espécie, cada uma com três ou quatro pontos de conferência, cada uma nomeando
a skill do escritório de onde o ponto veio. Entram entre o passo 7 e a
conclusão, com etiqueta da espécie. A ferramenta do site interno aparece no
passo em que serve. "Encerrar o atendimento" escreve uma linha no histórico
do caso.

Dois erros reais que o teste achou: "Recurso especial ou incidente" caía na
família da aposentadoria especial, e `casoSel` sobrevivia à troca de ficha, de
modo que o atendimento de um cliente seria lançado no processo de outro.

## A suíte

248 verificações em 16 arquivos, em `crm/fase2/testes/cadastro`. O LEIAME
registra as armadilhas — inclusive as três desta rodada, todas do arquivo de
teste e não do programa.

## O que continua com você

- 243 clientes sem CPF (duplicata esperando o dia em que alguém escrever o CPF
  no título da tarefa do To Do)
- a mão de volta CRM → To Do, decisão em aberto
- confirmar que a F9.0 destravou as 2.621 parcelas — não tenho acesso ao banco
- o rótulo do B26 e da Espécie 57: enquanto forem código de NB cru, esses
  casos seguem com os oito passos fixos
- HARs do e-SAJ e do eproc, resumos de acórdãos

## O que eu proponho para a próxima

1. Agenda ainda leva 558 ms e Calendário 555 ms: sobrou trabalho por evento,
   não mais formatador.
2. Os 16 arneses no workflow do GitHub Actions, que hoje só roda o `tests/`
   Python.
3. Um Supabase de homologação, para provar o banco e não só a tela.
