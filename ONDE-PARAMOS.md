# Onde paramos — 16.08.2026, versão 09.26

## F27 · Novo Cliente = a tela da recepção (09.26)

Só o nome é obrigatório. O benefício é opcional e, preenchido, vira
PRÉ-CASO em `campos.precasos` (nunca caso — coerente com a F25: caso é
procuração + contrato). O relato do balcão é a primeira anotação de
`campos.atendimento`, com autor, e é ela que põe o cliente 🟡 na lista
Escritório; a escolha de fase e o agendamento no Google Agenda saíram da
tela. `clientesEmAtendimento` agora também conta quem só tem pré-caso.
Depois de cadastrar, a ficha abre direto em Anotações → Atendimento.
Teste `novocliente.js` (19 provas); suíte com 25 arquivos, 470 verificações.

## A rodada dos quinze pedidos (F22 a F26)

**F22 · layout dos Casos** (09.22). Ficha aberta encolhe a lateral para os
ícones (o ☰ é exceção da sessão, não preferência); fita colorida de
atribuição na borda dos cartões; o texto do andamento perdeu o teto de 72ch e
ocupa a largura; a bolinha oca morreu — o avatar é o nó da linha do tempo.

**F23 · cadastro** (09.23). O RG saiu do sistema e de TODOS os modelos
(inclusive o dos advogados — OAB, CPF e NIT qualificam); parceria com nome de
advogado buscável e editável do cadastro (com reindexação na hora); "mais
opções" trocou credencial por registro avulso com autor e data; cliente já
aposentado + caso de aposentadoria = aviso "provável revisão, não concessão",
derivado.

**F24 · triagem** (09.24). A porta de entrada "De qual caso se trata?" com as
doze famílias e o "ainda não sei" honesto (ficam só os passos padrão); as
perguntas do escritório que a advogada acrescenta e valem para todos (autor e
data); "Encerrar a triagem" manda o resumo para as Anotações SÓ com atenção
ou não conferido.

**F25 · o pré-caso** (09.25). "Gerado o caso" = procuração + contrato
assinado. Antes disso: pré-casos nas Anotações (mais de um, pelo +), com
espécie, natureza (concessão/revisão/acerto), marcadores rural/especial/
deficiência que abrem os tópicos das famílias, honorários, anexo que passa
para o caso, e o caminho alternativo "não gerar — acompanhar em Lembretes"
(data + responsável viram lembrete). Anotações com atribuição, lembrar (cria
lembrete com responsável, pronto para o WhatsApp), importante/urgente e
checklist assinado. Cliente amarelo "Em formação", menu dinâmico (só Cadastro
e Lembretes até o caso nascer), Cadastro com TRÊS divisões (Documentos/
Consulta/Mensagens viraram trilho dentro de Anotações). Gerar o caso
transfere as anotações como andamentos com data e autor originais.

**F26 · os modelos .docx da pasta do Drive**. Os dez modelos de
"_Modelos Procurações/Nova pasta" foram sobrescritos sem RG (do segurado e
dos advogados, remoção cirúrgica preservando negrito) e uniformizados em
Bookman Old Style 12, espaçamento 1,5. Os originais estão em
"_originais-antes-do-ajuste", dentro da mesma pasta.

## A suíte

451 verificações em 24 arquivos, todas passando. O LEIAME registra as
armadilhas de cada fase.

## O que continua com você

- 243 clientes sem CPF; a mão de volta CRM → To Do; confirmar as 2.621
  parcelas da F9.0; o rótulo do B26/Espécie 57; HARs do e-SAJ/eproc.
- Os ~555 ms da Agenda ao vivo seguem sem reprodução no arneço — medição ao
  vivo com DevTools antes de mexer.
- Conferir no seu navegador o leitor de PDF (Triagem → Ler o CNIS).

## Para a próxima rodada

1. O schema do banco não ganhou coluna nova: pré-casos, registros e porta da
   triagem moram em campos JSONB — nada a rodar no Supabase.
2. As perguntas do escritório usam config_app (chave triagem_extra) — também
   sem migração.
3. Se quiser o pré-caso também para clientes que JÁ têm casos (um caso novo
   se desenhando ao lado dos existentes), é uma evolução pequena: hoje o
   bloco aparece só para quem não tem caso nenhum.
