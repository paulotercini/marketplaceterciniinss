# A extensão — um botão por portal

## O que ela faz

Roda **na sua sessão já logada**, coleta o que mudou e entrega ao CRM. Você
não abre mais o Console, não cola script e não baixa arquivo.

Ela **coleta e entrega — não decide nada**. O que vira caso, o que atualiza
e o que pode ser duplicado continua sendo decidido na tela 📥 Importar do
INSS, com o plano na sua frente, como já era.

## Os dois botões

**🖥 Recursos (e-Recursos)** — faz tudo sozinho. Depois do login não há
captcha nenhum: ela pega no CRM os processos com número de recurso, consulta
um a um e entrega. Um clique, e pronto.

**🌻 INSS (PAT/GERID)** — faz tudo **menos um clique**. A lista do PAT exige
um token de reCAPTCHA, que a página só gera quando uma PESSOA aciona a
busca. A extensão abre a tela e preenche a data da última atualização e o
500 por página; **você clica em "Buscar"**; daí em diante ela faz o resto
sozinha — o detalhe de cada requerimento e a entrega.

Não mando o script clicar em "Buscar" de propósito. Seria exatamente o robô
que o captcha existe para barrar, e o convênio está no seu nome.

Depois da lista não há mais captcha: o detalhe abre com a mesma sessão. Foi
o que a sonda provou.

## Instalar (uma vez)

1. Rode o `schema_por_em_dia.sql` no Supabase — ele cria a tabela `coletas`,
   que é a fila onde a extensão entrega.
2. Chrome → `chrome://extensions` → ligue o **Modo do desenvolvedor** (canto
   superior direito).
3. **Carregar sem compactação** → escolha esta pasta (`extensao`).
4. Clique no ícone da extensão → **configurar e entrar no CRM** → cole o
   endereço do Supabase e a chave anônima. São os dois mesmos valores que
   estão no seu `app.html`.
5. Na mesma tela, mais abaixo, **entre com o seu e-mail e senha do CRM**.

O passo 5 não é opcional. O banco só devolve dados para quem entrou: com a
chave anônima sozinha, toda consulta responde "ok" com **lista vazia** — e a
extensão anuncia, convicta, que não há nenhum recurso cadastrado. A senha não
fica guardada: ela é usada uma vez, ali, para obter um crachá renovável, e
depois só o crachá vive na máquina. Dá para revogá-lo no Supabase e para sair
pelo botão **Sair** da mesma tela.

O popup avisa em vermelho enquanto esse login não existir.

## O dia a dia

1. Esteja logado no portal (gov.br, como sempre).
2. Clique no ícone da extensão.
3. **Recursos**: clique e espere.
   **INSS**: clique, e quando a faixa laranja pedir, clique em "Buscar".
4. Abra o CRM em **📥 Importar do INSS**. A coleta aparece esperando: você
   confere o plano e aplica.

O popup mostra há quantos dias cada portal foi atualizado. Quem não abre há
uma semana vê "faz 7 dias" antes de clicar.

## Quando não acontecer nada

Duas ferramentas, e as duas respondem em um clique.

**Para o CRM**, no popup: **🔎 Testar a ligação com o CRM**. Ele responde as
três perguntas de uma vez — quem está logado, quantas fichas o banco devolve e
quantas têm número de recurso. `0 ficha(s) visíveis` significa que o login não
está valendo; muitas fichas e `0 com número de recurso` significa que os
números realmente não estão cadastrados.

**Para o PAT**, no console da página (F12 → Console), procure as linhas com a
etiqueta azul **[CRM]**. Elas contam a história inteira:

- `extensão no ar nesta página` — a extensão está instalada e vale para esta
  página. **Se esta linha não existir, nada mais importa**: o problema é a
  instalação. Abra `chrome://extensions`, confira a versão e veja se há um
  erro em vermelho no cartão da extensão.
- `coletor confirmado dentro da página` — o coletor subiu. Se em vez dela vier
  uma faixa vermelha dizendo que o portal bloqueou o coletor, o problema é a
  política de segurança do site.
- `xhr: …/tarefa/consulta ← é a lista` — o gancho viu a busca.
- `resposta da lista: 184 tarefa(s)` — a lista chegou.
- `guardei 184 — clique em 🌻 INSS` — chegou antes do seu clique, e está
  guardada esperando.

A ordem dos cliques não importa mais: se você buscar primeiro e clicar na
extensão depois, ela continua de onde a busca parou.

## O que ela não faz, e não vai fazer

- Não gera, guarda ou reaproveita token de reCAPTCHA.
- Não faz login por você.
- Não clica em "Buscar".
- Não roda em servidor nem com você fora da máquina.

E respeita o limite de velocidade do portal: 3 segundos entre chamadas, e
para na primeira recusa em vez de insistir. Se parar, espere alguns minutos
e clique de novo — ela continua de onde estava.

## eproc TJSP (1º e 2º grau) — desde 1.7.0

**🏛 eproc TJSP (relação)** — lê a *Relação de Processos* (menu Relatórios)
com o último evento de cada processo e entrega ao CRM no mesmo formato do
PJe: a tela 📥 Importar casa pelo número do processo.

O TJSP tem quatro eprocs, um por host, e o seletor de perfil no topo da
página (SP / EF / CR / TJSP) abre cada um numa aba nova:

| perfil | host                        | o que é           |
|--------|-----------------------------|-------------------|
| SP     | eproc1g.tjsp.jus.br         | 1º grau cível     |
| EF     | eproc1g-ef.tjsp.jus.br      | execução fiscal   |
| CR     | eproc1g-crim.tjsp.jus.br    | criminal          |
| TJSP   | eproc2g.tjsp.jus.br         | 2º grau           |

O botão coleta o host da **aba ativa**. Para cobrir outro, troque o perfil
no topo do eproc (abre a aba do outro host, já logado) e clique de novo.
Sem aba de eproc aberta, o botão abre o 1º grau cível; se pedir login,
entre e clique de novo.

Com um **processo aberto** na aba ativa, o botão coleta a lista completa de
eventos dele (com a data de cada um), como no PJe.

Processos baixados ficam de fora — não movimentam.

## e-SAJ TJSP (1º e 2º grau) — desde 1.8.0

**⚖️ e-SAJ TJSP (acervo)** — o e-SAJ não tem relação de processos, e a
*consulta por OAB* só lista os processos em que a sua OAB está cadastrada na
parte (68 no 1º grau em 15.09.2026, de um acervo bem maior). Por isso a
lista-mãe são os seus **favoritos do navegador**: as pastas com nome no
padrão "A a J", "I a Z" (qualquer "X a Y"), que já são o jeito da casa de
acompanhar os processos ativos. A extensão lê essas pastas direto (permissão
"bookmarks"); processo novo entra quando você salva o favorito. Somam-se os
números `.8.26.` das fichas abertas do CRM e a consulta por OAB, que descobre
processo sem favorito e sem ficha — ele aparece em 📥 Importar como "sem
caso no CRM", para vincular.

Para cada processo o botão abre a ficha no e-SAJ (que dá situação e partes)
e pede as movimentações, um de cada vez, com pausa — uns 3 segundos por
processo. A ficha é obrigatória: o e-SAJ só devolve as movimentações do
processo cuja ficha foi aberta na sessão.

**Modo rápido.** Processo cuja ficha diz Arquivado/Baixado/Encerrado fica
anotado no navegador e, por 7 dias, não é consultado de novo. Uma rodada
completa semanal confere todos.

O e-SAJ trava "múltiplas consultas simultâneas" por sessão — durante a
coleta, não faça outras consultas nele; se travar, o coletor espera e
retoma sozinho.

Cada processo chega ao CRM com o link da ficha (`show.do?processo.codigo=…`),
que abre na sua sessão do e-SAJ, e com o nome das partes, que é o que
permite vincular processo novo a cliente pelo nome.

**Cumprimento de sentença e RPV (desde 1.12.0).** A ficha de cada processo
lista os seus incidentes (cumprimento de sentença, requisição de pagamento),
e a extensão lê todos eles na mesma rodada, estejam ou não nos favoritos.

**Recursos dentro do recurso (desde 1.12.0).** No 2º grau, os embargos de
declaração e o agravo interno de uma apelação têm o mesmo número dela e não
aparecem nos favoritos nem na consulta por OAB. Para todo número com
processo no 2º grau, ou com o 1º grau "em grau de recurso", a extensão
consulta o número no 2º grau e lê cada registro da caixa "Selecione o
processo" que a rodada ainda não leu. Cada processo leva as cinco
movimentações mais recentes, e o CRM grava as que ainda não conhece.

**Processo que não está nos favoritos "X a Y", nem no CRM, nem na consulta
por OAB não é visto.** As pastas "Processos / Parte 1…3" dos favoritos ficam
de fora de propósito: são o acervo antigo, quase todo extinto.

## Atualizar a extensão

A versão instalada é a da pasta `extensao` carregada em `chrome://extensions`,
e a pasta não se atualiza sozinha. O popup mostra a versão instalada e avisa
quando a publicada na `main` é outra. Para atualizar: na pasta do repositório
no computador, `git pull`; depois, em `chrome://extensions`, o botão ↻ da
extensão (ou "Atualizar"). Não precisa reinstalar nem entrar de novo no CRM.

## 📄 Um processo só, com as peças — desde 1.26.0

Para baixar as peças de **um** processo sem esperar a rodada inteira: abra o processo no
portal e clique no botão daquele portal no popup (não no "Atualizar tudo").

- **PJe**: abra o processo (Autos Digitais) e clique em ⚖️ PJe TRF3.
- **eproc**: abra o processo e clique em 🏛 eproc TJSP.
- **e-SAJ** (novo na 1.26.0): abra a ficha do processo (`show.do`) e clique em ⚖️ e-SAJ TJSP.

O processo vai ao 📥 Importar com as peças. No e-SAJ, as peças seguem a regra da rodada:
só de processo não arquivado com caso previdenciário aberto no CRM; a faixa avisa quando
não desceram por isso.

## 🔁 Atualizar tudo, de verdade — desde 1.25.0

- **Um clique faz a rodada inteira**: INSS (o seu clique em "Buscar"), e-Recursos, e-SAJ, acervo do
  PJe e relação do eproc; depois os **prazos dos tribunais**; por último o **completar processos**.
  Os botões separados continuam para quem quiser rodar só uma parte.
- **Sessões conferidas antes**: a aba aberta que está na tela de login (ou responde com ela) aparece
  no popup com o botão "entrar de novo", que traz a aba para a frente; "rodar assim mesmo" segue.
  A aba que falta é aberta pela rodada, como antes.
- **Aviso do Chrome no fim** (também do "PJe e eproc", dos prazos e do completar): o resumo de cada
  fonte, e o clique abre o CRM já no 📥 Importar (`?ir=patinss`). Ao atualizar para a 1.25, o Chrome
  pede a permissão de notificações.

## 📁 e-SAJ: peças só de caso previdenciário — desde 1.24.0

Além de não estar arquivado e ter caso aberto no CRM, o processo só baixa peças quando
o assunto do caso é previdenciário (aposentadoria, auxílio, BPC, pensão, revisão, acerto
de CNIS…) ou ainda está em branco. Caso aberto de falência, execução, cobrança, ação
contra banco, ação civil pública etc. continua recebendo as movimentações, sem peças.

## ⚖️ PJe e eproc num clique — desde 1.23.0

O botão **⚖️ PJe e eproc: acervo e completar** faz, em ordem, o que antes eram três
cliques: lê o acervo do PJe e a relação do eproc em cada aba aberta (os dois graus do
PJe, os hosts do eproc; sem aba, abre a do 1º grau), e essas coletas já vão para o
📥 Importar, onde você confere enquanto o resto roda; **depois** completa os processos
(baixa as peças) do que movimentou. Os botões separados continuam para quem quiser
rodar só uma parte.

## 📁 e-SAJ: documentos só dos casos ativos — desde 1.22.0

No e-SAJ, sentença, pasta digital e anexos só descem do processo que **não
está arquivado** e cujo número está num **caso aberto no CRM**. O processo que
só vem dos favoritos ou da consulta por OAB, sem caso aberto, entrega as
movimentações ao 📥 Importar e não baixa documento. Para trazer os documentos
de um processo, abra o caso (ou ponha o número num caso aberto) e rode de novo.

## 🔎 Completar só o que movimentou — desde 1.21.0

O "completar processos" do PJe compara o último movimento do acervo com a
cronologia já entregue ao CRM e **abre só o processo que movimentou** desde
então (ou que nunca foi completado). Rode o ⚖️ PJe (acervo) antes, para o
"último movimento" estar em dia. Rodada interrompida continua de onde parou,
porque o que já foi entregue não é reaberto. Documento que devia descer e
falhou (o PJe respondeu 404, por exemplo) traz o processo de volta na rodada
seguinte, até 3 tentativas por documento; depois disso só quando movimentar.

## 📁 Processo arquivado não baixa documento — desde 1.20.0

No e-SAJ (ficha "Arquivado/Baixado/Encerrado") e no PJe (cronologia com
"Arquivado definitivamente" sem "Desarquivado" depois), a extensão guarda as
movimentações e **não baixa** sentença, pasta digital nem anexos: era o acervo
antigo que fazia a rodada levar horas. O que já foi baixado antes fica no CRM.

## 🕰 Sessão que não cai — desde 1.17.0

Enquanto uma aba do PAT, do e-SAJ, do PJe, do eproc ou do e-Recursos estiver
aberta, a extensão toca o site a cada 4 min para a sessão não cair por
inatividade. Fechou a aba, para. PJe e eproc são tocados no endereço da própria
aba (o eproc derruba a sessão com link sem assinatura); o e-Recursos, de dentro
da aba, com o token da página. Durante o "📚 Completar processos" o PJe não é
tocado. Não segura login que expira por tempo fixo (gov.br/CAS, o PJe depois de
~8 h de uso): aí é relogar mesmo.

## 🔁 Atualizar tudo — desde 1.9.0

Um clique roda e-Recursos, PJe, eproc e e-SAJ ao mesmo tempo, cada um na
sua aba e em segundo plano (as abas que faltarem são abertas atrás). Para
o PJe e o eproc, roda uma vez por aba aberta: com o 1º e o 2º grau abertos,
cobre os dois. O INSS vem primeiro e para a frente, porque o reCAPTCHA
exige o seu clique em "Buscar" — é o único passo humano que sobra, e ele
acontece enquanto os outros já rodam. Onde faltar login, a fonte falha sozinha e o resumo no popup avisa.

O que continua igual: nada é gravado no CRM sem você conferir em 📥 Importar.
