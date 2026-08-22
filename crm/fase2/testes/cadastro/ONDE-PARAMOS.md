# Onde paramos — 22.08.2026, versão 09.55

## F56 · A data de volta à vista: o "Concluir em" do To Do no CRM (09.55)

Pedido do Paulo (com prints do To Do): lá, o "Concluir em" é UMA data
exposta que diz quando o cliente volta à mesa — fácil de ver e entender.
No CRM cada anotação pode ter data (mais poderoso), mas nada fica exposto.

**proximaDataDe(cliId)** calcula a resposta sem burocracia nova: varre
anotações com lembrar_em não resolvidas, lembretes ativos (proximo_em),
prazos fatais de casos abertos e agendamentos (eventos futuros) e devolve
{venceu, proxima} — venceu é a cobrança MAIS ANTIGA já passada (nota,
lembrete ou prazo; agendamento que passou já aconteceu, não cobra),
proxima é a menor data >= hoje.

**A pílula no topo da ficha** (linha do CPF): vencida = vermelha
"⏰ venceu DD.MM · motivo"; futura = azul "📅 volta DD.MM · motivo";
nenhuma = cinza tracejada "sem próxima data — marque nas Anotações"
(cliente sem cobrança marcada é cliente esquecido; a ausência também é
informação). Clique → irParaData(tipo) leva à aba onde a data mora
(nota→Cadastro/anotações, lembrete→aba 9, prazo→Casos, evento→Perícias,
com fallback no Cadastro quando a aba não existe).

**Nas Anotações**: nota com lembrar_em e sem resolvida abre a linha com a
pílula colorida (azul futura, vermelha vencida); resolvida mostra só o
registro neutro. E ehNotaPendente ganhou o critério lembrar_em < hoje —
a nota "volta 20.08" que passa de 20.08 sem resolução entra SOZINHA nas
Pendências em aberto. O quadro também mostra a pílula da data.

Teste volta56.js (10 provas, datas relativas a hoje para não apodrecer).
Suíte: 45 arquivos verde.

# Onde paramos — 22.08.2026, versão 09.54

## F55 · A ficha respira: a mesa se arruma sozinha e o rodapé fala português (09.54)

Pedido do Paulo: página do cliente com informação demais, e a solução
"flechinha/mais" não serve — tem que ser intuitivo para colaborador com
contato mínimo. E o atribuir / lembrar em / tarefa com prazo das anotações
precisa ficar fácil. Autorizada mudança estrutural.

**A mesa se arruma sozinha (colapso por ESTADO, não por clique).** Bloco
resolvido recolhe numa linha verde que INFORMA a decisão (o corpo fica no
DOM dentro de `<details class="mesa-feito">` sem marker; "alterar" à
direita reabre). Critérios: bloco 1 quando todo pré-caso vivo tem
espécie+natureza (+via+cidade se incapacidade); bloco 4 quando a análise
mais recente é de HOJE; Honorários vive sempre recolhido com o padrão (ou
o ajuste) na própria linha — literal "Padrão do escritório" preservado.
Três regras de convivência: mexeu (mudarPreCaso/novoPreCaso) → mesaAberta
abre o bloco até a ficha fechar (não recolhe embaixo da mão de quem
edita); abrirFicha com troca de cliente → mesaAberta.clear(); aberto no
toque → ontoggle grava no Set e sobrevive à repintura.

**Linha-guia no topo.** Uma frase âmbar "Falta fazer: definir a espécie ·
registrar a análise (passo 4) · resolver N pendências" gerada do estado —
ou verde "Fluxo em ordem — só resta a decisão final". O leigo lê o topo e
sabe onde clicar.

**Rodapé em cápsulas com pergunta.** "Como marcar?" (chips ⭐/🔥/⏳ com
:has(:checked)), "Quem cuida disso?" (chips com avatar colorido + NOME,
classe .at-eq preservada), "Lembrar quando?" (atalhos + date à vista),
"⏰ Prazo fatal?" (NOVO: id at-prazo — com exatamente 1 caso em andamento,
a nota sai "⏰ [PRAZO dd.mm.aaaa]" e o caso vai para 🗓 Tarefas com Prazo,
mesmo shape do 📌; sem caso, barra com aviso; 2+ casos, manda para o 📌).
FRASE-VIVA (#at-frase, fraseAcao/atualizarFraseNota) confirma em
português o efeito antes do clique. O 📌 dar seguimento fala a mesma
língua: perguntas nos rótulos, nomes nos chips e #seg-frase.

Testes: mesa55.js novo (14 provas). Ajustes de regressão: fluxo.js
(rotulos e cláusula por textContent — honorários vive recolhido),
precaso.js intacto (a regra "mexeu→fica aberto" o salvou), extracoes.js
ganhou a espera de boot (mesma corrida do emoji.js). Suíte: 44 arquivos.

# Onde paramos — 22.08.2026, versão 09.53

## F54 · Pacote do Paulo: PJe de volta, cadastro exigente, vínculo na análise, incapacidade com cidade e Pendências em aberto (09.53)

Cinco pedidos numa mensagem só, todos entregues:

1. **Tela do PJe sumida na aba CNJ (bug real).** Caso com o processo só
na LISTA `processos[]` (sem `k.processo` preenchido) não tinha "principal",
e `pjeDoProcesso(..., ehPrincipal=false)` descartava a coleta do PJe cujo
texto não repete o número — resultado: `temPje=false` e a caixa invisível.
Fix em painelCNJ: `!p || p.principal || ps.length===1` (um processo só na
lista É o principal de fato). Reproduzido e confirmado antes do fix.

2. **Cadastro pela anotação rápida exige nome completo e telefone.**
arNovoCliente recusa nome com uma palavra só; o campo #ar-tel aparece nos
ramos cliente novo E interessado; salvarAnotacaoRapida barra gravação com
menos de 10 dígitos. Telefone vai em clientes.telefone / leads.telefone.

3. **Vínculo da triagem viaja para a Análise de Direito.** Bloco novo na
triagem (select #tri-vinc: empregado/CI/facultativo/não contribui + mês
"desde" quando empregado) grava em triagem.vinculo via salvarTriagem.
salvarAnalise anexa "Vínculo (triagem): X." ao contexto quando o texto
ainda não menciona vínculo. Helper rotVinculo/salvarVinculoTriagem.

4. **Incapacidade pergunta a cidade e abre o checklist.** No pré-caso com
espécie de incapacidade: input "em qual cidade?" (grava pc.cidade — define
competência e local da perícia) e o bloco "2 · Documentos" nasce
`<details open>`. Bug achado pelo teste: ehIncap não casava
"Auxílio-doença" (dsa vira "auxilio-doenca" com hífen e o regex pedia
espaço) — regex agora `auxilio[ -]?doenca`.

5. **Pendências em aberto.** Anotação antiga com tarefa pendente não morre
soterrada: quadro "Pendências em aberto (N)" no topo do bloco 3 das
Anotações lista toda nota não resolvida que seja urgente, marcada
"pendência" (checkbox novo na criação) ou com checklist incompleto —
com botão "Resolvida" (grava resolvida={em,quem}, selo verde na lista,
sai do quadro). ehNotaPendente/quadroPendencias/resolverNotaAtendimento.

Testes: pacote54.js novo (14 provas). Regressões esperadas ajustadas:
fluxo.js (bloco 2 agora nasce ABERTO para incapacidade), rapida.js
(preenche #ar-tel nos fluxos de criação). emoji.js ganhou espera de boot
(D.cliPorId povoado) — corrida antiga que aflorou. Suíte: 43 arquivos.

# Onde paramos — 19.08.2026, versão 09.52

## F53 · Anotação rápida: as duas saídas sempre embaixo da lista (09.52)

Refinamento pedido pelo Paulo: qualquer parte do nome lista os clientes
embaixo (já fazia), e SEMPRE deve haver saída de criação embaixo da
lista — mesmo quando a busca acha homônimos parciais.

Com 3+ letras, abaixo dos resultados aparecem sempre duas saídas:
"➕ Cadastrar como CLIENTE novo" (arNovoCliente → POST clientes só com
o nome, a anotação entra como atendimento urgente via PATCH campos, o
cliente entra em D/cliPorId/casosDoCliente + reindexarCliente para a
busca achar na hora, e a ficha abre para completar o cadastro) e
"➕ Anotar como INTERESSADO" (F52, funil Vendas). Pegadinha de teste: o
mock do rapida.js respondia escrita sem eco de representation — o POST
clientes devolvia vazio e o fluxo caía no catch; igualado aos demais
testes (eco com id). rapida.js com 20 provas; suíte 42.

# Onde paramos — versão 09.51

## F52 · Anotação rápida com porta fixa e interessados (09.51)

Feedback do Paulo sobre a F50: não achou o ⚡ do canto, e o campo tem
que estar VISÍVEL, mais fácil que a busca, com o mínimo de clique — e
tem que servir para quem nem cliente é ainda.

Porta nova FIXA no topo da barra lateral, acima da busca: o campo
"⚡ Anotação rápida — nome…" com borda azul de destaque. Clicou, o
painel abre com o cursor já no nome (onfocus → anotacaoRapida). Enter
no texto guarda (Shift+Enter quebra linha). O ⚡ do canto continua (é
a porta do celular). Destinos: cliente com caso → andamento + caso 🔥
(F50); cliente sem caso → anotação urgente do atendimento (F50); e o
NOVO, quem não é cliente → botão "➕ {nome} ainda não é cliente" cria
INTERESSADO no funil 💼 Vendas (POST leads, origem "ligação/balcão",
a anotação vai em beneficio_interesse — o campo que o cartão do funil
exibe; sem coluna nova no banco). De lá, o caminho já existente
"→ virar cliente" completa o ciclo. rapida.js com 16 provas; suíte 42.

# Onde paramos — versão 09.50

## F51 · Julgamento no seguimento: resultado, não "preparação" (09.50)

Correção pedida pelo Paulo: quando a novidade é agendamento de
JULGAMENTO do CRPS, o seguimento sugeria "📞 Avisar {cliente} que o
julgamento foi agendado… oferecer atendimento de preparação antes" —
texto de PERÍCIA, errado para julgamento (não há presença nem
preparação do cliente no CRPS).

Agora, julgamento é rito próprio nas duas portas: no modal 📌 o texto
pré-escrito é "⚖️ Julgamento agendado para DD.MM.AAAA às HH:MM.
Verificar o resultado no dia seguinte.", a data de lembrar já vem no
dia útil seguinte (isso já existia) e o chip do ADMIN (o Paulo,
colAdmin() = papel admin na equipeAtiva) nasce marcado — atribuição
padrão dele; a véspera de "mensagem ao cliente" não é oferecida nem
criada. No 1 clique/lote (aplicarPericia), julgamento agenda o evento
e cria UMA tarefa de conferir o resultado no dia útil seguinte para o
admin — sem 📞 nem véspera. Perícia/audiência seguem exatamente como
eram (prova de regressão no teste). Teste julgamento.js, 11 provas;
novidades.js atualizado à regra nova; suíte 42 arquivos.

# Onde paramos — versão 09.49

## F50 · ⚡ Anotação rápida — o botão que atende o telefone (09.49)

Pedido do Paulo: cliente liga ou aparece no balcão e o colaborador
precisa anotar na hora, sem procurar ficha, e o registro deve nascer
urgente ("é comum o cliente ir até o escritório e não ficar anotação
nenhuma").

Botão ⚡ FIXO no canto da tela (fab-rapida), desktop e celular (no
celular fica acima da barra e some quando a ficha está aberta — lá o
composer manda). Abre uma caixa com três coisas: busca de cliente
(pesquisar() com lista de 6), a anotação e os toggles 🔥 urgente (JÁ
LIGADO) e ⭐ importante. Cliente COM caso ativo: a anotação vira
andamento e o caso é marcado urgente/importante via PATCH (Object.assign
no k local — o 🔥 aparece sem recarregar); com mais de um caso ativo, um
select escolhe (pré-selecionado no mais recente). Cliente SEM caso: vira
anotação do atendimento (campos.atendimento) com urgente:true e origem
"rapida" — sobe na mesa do atendimento e migra ao caso pela regra do
F30. Sem cliente escolhido ou sem texto, nada grava. Teste rapida.js,
11 provas; suíte 41 arquivos.

# Onde paramos — versão 09.48

## F49 · A análise de direito no trilho do primeiro atendimento (09.48)

Pedido do Paulo: a análise geralmente nasce no primeiro atendimento, e
precisava de um elo entre triagem, anotações e análise, com campos
preenchíveis no momento das anotações.

A mesa do atendimento ganhou o passo "4 · Análise de Direito deste
atendimento", logo depois das anotações, com o MESMO formulário da aba
⚖️ (formAnalise, renderizado uma vez só: quando a aba 8 está ativa ele
vive lá — IDs únicos). Acima do formulário, a linha de estado
statusAnalise: âmbar "Ainda sem análise de direito" ou verde "Análise de
DD.MM.AAAA — melhor caminho: X" com "ver histórico". A MESMA linha
aparece na TRIAGEM (com atalho para as Anotações), e o fecho da triagem
registra no histórico "Análise de direito registrada em X" ou
"PENDENTE". Análise salva SEM caso ativo vira ANOTAÇÃO do atendimento
(origem "analise"), que migra para os andamentos quando o pré-caso virar
caso, pela regra do F30 que já existia.

Regras da casa que morderam: a aba Cadastro é LIMPA de pictogramas
(emoji.js vigia) — statusAnalise, formAnalise e linhaCenario saíram sem
emoji (✕ virou CAD_IC.fechar, ⭐ virou "melhor", + em ASCII); e fluxo.js
ganhou a ordem nova dos blocos (1, 2, 3, 4-análise, honorários, e
agora?). Teste analise-direito.js com 5 provas novas (23), suíte 40.

# Onde paramos — versão 09.47

## F48 · ⚖️ ANÁLISE DE DIREITO — a memória dos atendimentos (09.47)

O coração do escritório, pedido do Paulo: o cliente lembra da análise de
2020, o escritório não. Cada análise registra QUANDO foi feita (retroativa
entra com a data original), o que foi combinado (contexto) e os CENÁRIOS
calculados na época, regra + data prevista + valor, com ⭐ no melhor
caminho. Data que já chegou fica verde ("✓ direito alcançado").

Tabela nova analises_direito (cenários em jsonb) — PENDENTE DO PAULO
rodar crm/fase2/schema_analise_direito.sql no Supabase; sem ela, as telas
avisam e nada quebra (D.analises null ≠ []). Entradas: aba própria na
ficha (sempre visível, abaAtiva 8) e visão "direito" na barra lateral com
sub-menu Análises | Dashboard. O contador da barra é acionável, clientes
cuja análise mais recente diz que o direito JÁ chegou e não aposentaram.

Integrações deliberadas, nada duplicado: salvar grava comentário nos
andamentos de TODOS os casos ativos do cliente (uma chamada, corpo em
array); o 🎂 "avisar na época" reusa aposentadorias + avisoApos (Meu Dia
3 meses antes); as anotações antigas do To Do (lista 🙏, espelhadas nos
lembretes aposentadoria_futura) aparecem na aba com "→ virar análise",
que pré-preenche o formulário e carimba a anotação (analise_id) para não
ser oferecida de novo. Dashboard: tiles (total, clientes, já podem,
próximos 12 meses, 2+ anos para rever), lista "comunicar" com WhatsApp,
próximas aposentadorias com 🎂, barras por regra. 📋 copiar gera o resumo
pronto para WhatsApp ou petição. Fonte marca manual | Prévius | To Do
(a importação automática dos PDFs do Prévius fica para quando o Paulo
mandar os primeiros cálculos). Teste analise-direito.js, 18 provas;
suíte 40 arquivos. Rubrica interna 98/100.

# Onde paramos — versão 09.46

## F47 · Botão 🔄 agora — sincronizar com o To Do pelo próprio CRM (09.46)

Pedido do Paulo: um botão no CRM para atualizar a sincronização com o
Microsoft To Do. A sincronização roda numa GitHub Action de hora em hora
(crm-sync.yml, 07h–20h seg–sáb); o botão dispara a MESMA Action na hora,
pelo workflow_dispatch da API do GitHub.

O 🔄 agora fica ao lado do carimbo "To Do há X min" no rodapé da barra
(pintado pelo montarSidebar, não pelo render — pegadinha que derrubou o
teste). Precisa de um token fino do GitHub (só o repositório, permissão
Actions: Read and write), pedido UMA vez por prompt e guardado em
config_app na chave gh_token, valendo para a equipe toda; 401/403 apaga
o token e pede outro no próximo clique. Aceito o disparo (204), o botão
vira ⏳ e espiarSync confere todo_sync_em a cada 30 s; carimbo avançou =
carregar() + montarSidebar() + render() e aviso "To Do sincronizado ✔".
Sem confirmação em 15 min, desiste e manda olhar a aba Actions. Teste
sync-agora.js, 7 provas (workflow certo, token recusado esquecido, ⏳,
recarga com carimbo novo); suíte 39 arquivos.

PENDENTE DO PAULO: criar o token em github.com → Settings → Developer
settings → Fine-grained tokens (repositório marketplaceterciniinss,
Actions: Read and write) e colar no primeiro clique do botão.

# Onde paramos — versão 09.45

## F46 · No Caso completo, o colaborador aparece com nome e cor (09.45)

Pedido do Paulo: no Caso completo, registro vindo do escritório não pode
sair só com a inicial "P" — tem que levar o nome e a cor do colaborador,
como na conversa do Escritório.

fatosDoCasoTodo agora carrega quem/avIni/avCor no item do escritório (a
inicial saiu de dentro do texto, onde vivia como "P: ..."); painelTudo
passa isso a tlOficial pelos campos em/rot/corAv; e tlOficial ganhou o
corAv — presente, o avatar sai com a COR do colaborador (sem av-fonte),
ausente, o selo neutro de fonte de sempre. Marco continua com ⭐ no
avatar, mas o rot segue sendo o nome. O 📋 copiar em texto sai com
"[Escritório · Nome]". Três provas novas em paineis.js (16 no total),
suíte 38 arquivos.

# Onde paramos — versão 09.44

## F45 · Uma estrutura para todas as linhas do tempo + Caso completo primeiro (09.44)

Pedido do Paulo: andamentos do INSS, recursos CRPS e andamentos CNJ na
mesma estrutura de layout do Escritório, e o Caso completo como a
primeira tela ao clicar no cliente.

Nasceu tlOficial(itens, vazio), o esqueleto único das linhas do tempo
oficiais: cada item {q, em, rot, texto, forte, cls, html} vira `li` com
separador de dia (tl-dia via dataRelativa), selo da fonte (.av-fonte no
avatar), NOME da fonte + hora (.autor-nome/.tl-hora) e marco destacado
(li.tudo-marco quando forte). Convertidos: painelINSS (🌻/🏢), Recurso
CRPS via blocoRecurso (⭐ crps-est, 📄 crps-pdf e caixaResumo
preservados no html do item), CNJ histórico (⚖️, decisão como marco) e
caixaPje. O painelTudo também migrou e agora abre com o compositor: o
composerCaso(k) foi EXTRAÍDO de painelEscritorio e é reusado nos dois.

subAba padrão virou "tudo" e abrirFicha força "tudo" a cada troca de
cliente — abrir um cliente É abrir o Caso completo, com o compositor em
cima e a visão inteira embaixo. Teste paineis.js, 13 provas (primeira
tela, compositor gravando do Tudo, as quatro abas no mesmo esqueleto,
⭐ preservado, Sentença como marco no Tudo e no CNJ); celular2.js,
comentarios.js e conversa.js passaram a forçar subAba="escritorio"
porque testam o painel do Escritório. Suíte 38 arquivos.

# Onde paramos — versão 09.43

## F44 · Toda movimentação do PAT consta em 📣 (09.43)

Pedido do Paulo com captura do PAT: protocolos com "Última Atualização"
avançando e nada em Novidades. A importação só gerava novidade quando a
SITUAÇÃO mudava, quando vinha comentário ou agendamento — protocolo que
se mexeu sem mudar nada disso entrava calado, e a PRIMEIRA situação
importada também ("primeira vez não é mudança").

Duas regras novas no plano da importação: (1) protocolo casado cujo
carimbo `atualizado_em` do portal é novo e sem outra novidade na mesma
rodada entra em `plano.atualizacoes` e vira "INSS · Movimentação no
protocolo N — situação: X (portal atualizado em TS)", com origem_id
`atualizacao:{proto}:{carimbo}` (deduplicado pelo banco — importar de
novo não repete; backfill silencioso de campo NÃO suprime, porque não
gera linha nenhuma em 📣); (2) a primeira situação vira "INSS ·
Situação registrada: X". A conferência mostra o contador "movimentações
p/ 📣" e o botão Aplicar as inclui na conta. Teste pat-novidades.js, 6
provas direto na função pura do plano + no aplicar; suíte 37 arquivos.

# Onde paramos — versão 09.42

## F43 · A ficha nunca mais fica presa no "abrindo a ficha…" (09.42)

Bug reportado pelo Paulo com captura: clicou num cliente da lista do
Conselho e a coluna ficou em "abrindo a ficha…" para sempre. O
placeholder engolia exceções: das seis consultas da abertura, a de
CREDENCIAIS era a única sem catch — um erro dela rejeitava o
Promise.all e nada mais acontecia, sem mensagem. E havia uma segunda
mina, plantada pela F41: o equipeAtiva() passou a incluir ativo NULO,
então uma linha de colaborador pela metade no banco (sem nome/inicial
— ex-funcionário, robô antigo) entrava nos chips do composer e
derrubava a pintura inteira (nome.split de null).

Correção em três camadas: toda perna da abertura com .catch (inclusive
o fallback do fallback dos andamentos), o corpo inteiro
busca+pintarFicha num try/catch que vira tela de erro com "↻ tentar de
novo" e "voltar à lista" (nunca mais falha muda), e equipeAtiva exige
linha utilizável (ativo!==false && nome && inicial). Teste
ficha-blindada.js, 4 provas: colaborador quebrado fora dos chips e
ficha pintando; credenciais em 500 e a ficha abrindo com degradação
("sem senha"). Suíte 36 arquivos.

# Onde paramos — versão 09.41

## F42 · A CONVERSA DO CASO (09.41)

O salto estrutural pedido pelo Paulo ("100 vezes melhor, layout e
interação entre colaboradores"). A linha do tempo do escritório deixou
de ser uma lista zebrada e virou uma conversa de equipe, com a
assinatura na colaboração: **abrir o caso e ver exatamente o que chegou
desde a sua última visita**.

A faixa "🔵 N nova(s) para você" abre a conversa, com "✔ marcar todas
como lidas" (liTudoNaFicha, sobre a andamentos_lidos que já existia);
cada comentário não lido leva fundo e filete azul, e a fronteira
"você já tinha visto daqui para baixo" fecha o bloco novo. Dias
separam a leitura (Hoje/Ontem/data, reuso de dataRelativa). Registro
de SISTEMA (situação do INSS, 📅 agendamentos, 🗓 vésperas, notícias
de importação, ✔ prazo cumprido) encolhe para uma linha central
discreta — MAS volta a cartão cheio se carrega tarefa ou não foi lido
(função nunca some por estética, ehEventoSistema). Cada comentário
mostra nome do autor na cor do time + hora; @menções destacadas
(destacarMencoes, sobre o texto já escapado); 👍 ciente em um toque —
gravado como resposta só-emoji (zero migração de schema) e agregado
em chip com as iniciais; ações (👍 ↩ ✕) numa barra revelada no hover,
sempre visível no celular.

Teste conversa.js, 15 provas; casos2.js ajustado (os `li` estruturais
tl-dia/tl-sys/tl-fim-novas entram na conta de seletores posicionais);
suíte 33 arquivos.

**Rodada de endurecimento (mesma 09.41, sem mudança no app):** as duas
deduções da rubrica da F41 fecharam com prova. celular2.js (7 provas,
390px): modo celular ativo, faixa do não lido, nada estoura a largura,
ações sempre visíveis sem hover, marcar-todas tocável (38px) e
funcionando no toque, composer registrando. extracoes.js (7 provas):
chip do prazo enquanto digita, data do texto → lembrete do caso, DCB
16/09 → 2026-09-16 com alarme, protocolo → ficha + índice de pesquisa,
"documentos solicitados: X; Y" → checklist, perícia citada →
agendamento. Rubrica: **100/100** nos termos dos 20 critérios. Suíte
35 arquivos.

## F41 · Anotações e comentários de ponta a ponta (09.40)

Auditoria pedida pelo Paulo com meta de nota (>95/100), depois de olhar
como To Do, Planner, ADVBOX e Astrea tratam anotação, comentário e
atribuição. O que mudou, em ordem de peso:

**Um predicado de equipe.** Metade do app filtrava `c.ativo` (some quem
tem ativo NULO) e a outra metade `ativo!==false`. Agora existe
`equipeAtiva()` e toda superfície usa a mesma régua — colaborador com
cadastro incompleto não desaparece mais de metade das telas.

**A mesma linguagem em toda superfície de atribuição.** A anotação do
atendimento trocou o select de UMA pessoa pelos chips de iniciais do
composer, com multi-atribuição (`nota.atribuidos`, retrocompatível com
`atribuido`), atalhos Hoje/Amanhã/+7 e a regra do composer para o
lembrete: sem responsável marcado, o lembrete é de quem escreveu (um
lembrete POR responsável quando há vários). A nota grava `autor_id`
(o ✕ de apagar não depende mais do primeiro nome).

**👥 todos em um clique** no TAREFA PARA do composer, no ＋ do
comentário, no 📌 seguimento e no atendimento — uma tarefa por
colaborador ativo (padrão Astrea de distribuir para a equipe).

**↩ responder em qualquer comentário** (padrão Planner Task chat): o
clique arma `responde_a`, um chip "respondendo a …" aparece sobre o
composer (cancelável) e a resposta entra ANINHADA no comentário
original — o mesmo canal que a conclusão de tarefa já usava. Trocar de
ficha desarma.

**@ com menu** na barra do composer: lista a equipe, insere @Primeiro
e a menção nasce no Registrar. E @Fulano que não é ninguém da equipe
AVISA em vez de morrer calado. O +7 dias entrou no LEMBRAR EM (o
tfDia já entendia "7"; faltava o botão).

**Frases prontas voltaram a nascer**: a criação estava morta (o input
nf-texto não existia em tela nenhuma) — agora vive no painel de
sugestões, Enter salva para toda a equipe.

**Código morto removido**: o fluxo ENCAMINHAR inteiro (caixa nunca
renderizada, botões nunca emitidos — o 📌 seguimento da F40 o
substitui), menuLembrar e salvarPrazo. Na remoção, semMarcador/
emItens/alternarFrase foram restauradas (eram vizinhas vivas).

Nota da rubrica (20 critérios × 5): **98/100** — deduções em A5
(extrações DCB/protocolo sem teste novo dedicado) e D4 (sem teste
mobile dedicado às superfícies alteradas). Teste comentarios.js, 22
provas; precaso.js atualizado para os chips; suíte 32 arquivos.

## F40 · Nada da importação entra calado (09.39)

O caso real que motivou: novidade do INSS, o CRM perguntou "é o mesmo
caso?", a resposta foi sim — e o julgamento agendado (24/08/26 14:20)
não apareceu em 📣 Novidades. Três portas vazavam: o "é o mesmo —
juntar" e o "é outro — criar" deixavam comentários e agendamentos do
protocolo "para a próxima importação" (agora `ingerirDetalheNoCaso`
puxa tudo na hora, com dedupe pelo banco), e todo agendamento gravava
o evento na aba 🩺 sem linha em 📣 (agora cada evento importado tem a
sua novidade "📅 ... agendado para ..."). As novidades novas entram em
`D.novid` na memória (`novidadeNaMemoria`) — sem F5.

No 📌 dar seguimento (agora com esse NOME no botão das novidades):
`eventoNoTexto` reconhece julgamento e data com ano de 2 dígitos;
LEMBRAR vem sugerido para o dia seguinte útil quando é julgamento
(conferir o resultado), com atalhos véspera / dia seguinte / 3 dias
úteis antes ancorados NA DATA DO EVENTO (os antigos eram relativos a
hoje); e a linha ⏰ PRAZO recebe a data fatal, prefixa a anotação
"[PRAZO DD.MM.AAAA]" e manda o caso para 🗓 Tarefas com Prazo (mesmo
canal da F38). Concordância por tipo (`evFem`): "o julgamento foi
agendado", "a perícia foi agendada". E o 📋 copia o nome do cliente na
ficha e na linha da novidade. Teste novidades.js, 16 provas; suíte 31
arquivos.

## F39 · A pesquisa não prende mais o menu (09.38)

Com uma busca ativa, clicar em qualquer lista ou visão da barra lateral
não ia: o clique trocava a `visao`, mas o render() via `buscaTxt`
preenchido e repintava a pesquisa por cima — era preciso clicar no ✕
antes de conseguir sair. Agora um helper único (`limparBusca()`) zera
`buscaTxt`, esvazia os DOIS campos (desktop e celular) e esconde os
DOIS ✕; ele roda no clique de `.lista-item`, no ＋ Novo cliente e no
`irCel` da barra do celular (que já limpava o texto, mas deixava o ✕
aceso — corrigido de carona). O ✕ continua funcionando como antes.
Teste pesquisa.js, 13 provas; suíte 30 arquivos.

## F38 · Tarefas com Prazo no CRM e o deferido que continua (09.37)

Prazo processual não se perde: a anotação do caso marcada com ⏰ exige a
DATA FATAL, sai prefixada "[PRAZO DD.MM.AAAA]" na linha do tempo e move
o caso para 🗓 Tarefas com Prazo (fase outro + mover_para, o mesmo
canal do select — o To Do acompanha quando o ESCREVER_TODO ligar),
guardando a lista de origem em ronda.prazo_de (JSONB existente, sem
migração). A lista 🗓 ordena os GRUPOS pela menor data fatal. O "✔
prazo cumprido" propõe devolver à lista de ORIGEM já selecionada, com
seletor para trocar (decisão do Paulo), limpa o prazo e registra
"[PRAZO CUMPRIDO]". E a janela do Encerrar ganhou o terceiro caminho
"⚖️ Gerou — e o processo CONTINUA (cumprimento de sentença)": lança os
honorários em Pagamentos, grava o resultado e o marco [DECISÃO] SEM
mudar a fase — o caso segue em Judicial. Teste prazos.js, 16 provas;
suíte 29 arquivos.

## F37 · A ficha do caso com fundo próprio (09.36)

Pedido do Paulo (com captura): a grade de fatos (espécie, protocolo,
NB, DER, DIB, decisão, responsável, documentos solicitados) agora tem
fundo azulado (--azul-fundo, token que já existia) — dado oficial num
tom, conversa dos andamentos em branco. Só CSS (.fx, .fatos-pe,
.fx-prorrog). Alternativas creme e cinza apresentadas em
f37-opcoes.html; trocar é um token.

## F36 · De Lembretes também se gera o caso (09.35)

O lembrete que nasceu de um atendimento (origem precaso) tem agora DOIS
botões: "↺ voltar ao atendimento" e "Gerar o caso". Gerar dali reativa o
pré-caso e segue o MESMO gerarCasoDoPre da mesa — com três melhorias que
valem para os dois caminhos: a via da incapacidade é exigida pela
própria função (não só pelo botão), o lembrete de origem se desativa ao
gerar (o acompanhamento acabou — existe caso), e sem o select da mesa a
fase sai da via (adm→inss, jud→petição inicial), nunca "escritorio".

## REGRA PERMANENTE · A REGRA DA VOLTA (decisão do Paulo, 16.08.2026)

**Toda transição do CRM precisa do caminho de volta — por erro ou por
vontade. Toda atualização futura nasce pensando no "voltar/desfazer".**

## F35 · A regra da volta, aplicada ao sistema inteiro (09.34)

Auditoria completa das transições. Já tinham volta: passos e porta da
triagem (clique alterna), reabrir triagem (F30), caso ↔ atendimento
(F34 + Gerar o caso), concluir tarefa com desfazer (F12), mover de
lista, importante/urgente, checklist de nota, apagar andamento e anexo
(autor). Cinco NÃO tinham e ganharam: (1) caso encerrado se REABRE — o
↺ ao lado do carimbo devolve à lista de origem, limpa resultado e
registra quem reabriu ([DECISÃO] na linha do tempo; honorários lançados
ficam); (2) "Somente gerar lembrete" se desfaz — "↺ voltar ao
atendimento" na aba Lembretes (e no card): o pré-caso volta à mesa e o
lembrete se desativa; (3) pré-caso tirado vai à lixeira
(campos.pc_lixeira) e a mesa oferece "↺ restaurar"; (4) "entregue"
marcado por engano se desmarca no clique (chip avisa); (5) anotação do
atendimento e registro avulso do PRÓPRIO autor se apagam (só o autor vê
o ×). Sem volta consciente, anotado como pendência: fundir casos
(reversão exigiria snapshot do estado anterior). Teste desfazer.js, 17
provas; suíte 28 arquivos.

## F34 · O caminho de volta — caso que não é caso vira atendimento (09.33)

O diagnóstico: a migração antiga transformou as tarefas da lista 🙋
Escritório em CASOS, mas quem está ali é cliente em NEGOCIAÇÃO (atrás de
documento), sem caso. Desde a 08.99 o migrar.py não cria mais caso para
tarefa nova dessa lista (vira anotação no cadastro); faltava desfazer os
657 legados. O que entrou: botão "↩ não é caso" ao lado do Encerrar
(qualquer caso ativo) e o lote "converter todos" no cabeçalho da lista
Escritório (decisão do Paulo: todos de uma vez). A conversão é o inverso
do gerarCasoDoPre: andamentos → anotações com o MESMO id (o id que o
migrar.py usa no dedupe — a sync substitui em vez de duplicar), tarefas
abertas → docs_pedidos no formato da sync (id = caso), anexos → cadastro,
benefício → pré-caso (id derivado do caso: reconverter não duplica), e o
caso é APAGADO — o que faz a sincronização passar a alimentar as
anotações do cliente (o migrar só trata como caso o que JÁ existe no
banco; a tarefa no To Do fica intacta). Perícia e pagamento (caso_id NOT
NULL) travam a conversão com aviso. Cliente convertido fica 🟡 em
atendimento com Anotações abertas. Teste conversao.js, 17 provas; suíte
27 arquivos. IMPORTANTE ao rodar o lote em produção: são ~657 casos,
alguns minutos de conversão com avisos de progresso a cada 25.

## F33 · A lista de documentos nasce fechada (09.32)

O bloco "2 · Documentos que o cliente vai trazer" do fluxo virou
`<details>` fechado: só o título com o resumo (quantos itens, quantos
já pedidos) fica à vista, e o clique abre a lista — tela mais limpa,
pedido do Paulo. O summary carrega a classe `.rotulo-caso` para a
prova de ordem do fluxo continuar valendo.

## F32 · O CPF é a chave, conferido enquanto se digita (09.31)

Na tela da recepção, o CPF digitado responde na hora, logo abaixo do
campo: já cadastrado mostra "⚠ Este CPF já é de <Nome> · N processo(s)
— não cadastre de novo" com o botão "Abrir o cadastro" (mesmo com o
nome escrito diferente, o CPF vincula — a regra do Paulo); válido e
livre ganha o ✓ verde; dígito verificador errado avisa e o submit barra
(cpfValido = módulo 11 + exclusão de dígitos repetidos). Cadastrar sem
CPF continua permitido, para nunca travar o balcão. A janela de CPF
repetido no submit segue como segunda trava (confere também o banco).

## F31 · Documentos no fluxo e Consulta dentro de Documentos (09.30)

A procuração, a declaração de pobreza, o contrato e o resto da
`caixaDocumentos` aparecem LOGO ABAIXO do "Gerar o caso", no fim do
fluxo do atendimento: quem está gerando imprime ali mesmo, colhe a
assinatura e clica, sem trocar de tela. `especieDoCliente` ganhou o
fallback do pré-caso vivo (o contrato do fluxo sai na variante certa —
antes sairia no padrão). O menu Documentos incorporou a Consulta
(pedido do Paulo): um painel só com documentos para assinar, catálogo
do INSS e os portais com CPF; o botão Consulta saiu do trilho
(`irSubCad("consulta")` mapeia para "documentos") e a visibilidade de
Documentos passou ao portão da triagem (triada OU com caso — o botão
carrega a Consulta, que já era desse portão). Suíte: 26 arquivos,
fluxo.js com 31 provas.

## F30 · O Atendimento virou FLUXO (09.29)

A ordem do Paulo, na tela: 1) espécie (select com "outros — escrever")
e natureza concessão/revisão/acerto, com a via administrativa ou
judicial OBRIGATÓRIA nos benefícios por incapacidade (adm pré-seleciona
fase INSS e mostra o padrão de 20% sobre as parcelas); 2) documentos que
o cliente vai trazer; 3) anotações com atribuir/lembrar/anexar (📎 novo
no compositor); 4) honorários — o padrão do escritório vem da variante
do CONTRATO (HONOR_RESUMO + cláusula completa num details), e o ajuste
combinado grava em `campos.honor_ajuste[variante]` e entra no contrato
impresso como "DISPOSIÇÃO EXPRESSA EM CONTRÁRIO" (textoContrato ganhou o
parâmetro); 5) decisão por último — Gerar o caso (leva direto ao botão
Documentos, que só nasce com o caso), Somente gerar lembrete (as
anotações passam a aparecer na aba Lembretes) ou Não gerar.

O trilho virou máquina de estados: Triagem some quando encerrada (o
resumo com atenções vira a primeira informação das Anotações, com
"reabrir triagem" — rastro em triagem.reaberta); Anotações some quando o
atendimento se resolve; Consulta e Mensagens subiram para o trilho
principal (anot-trilho morreu; irSubAnot é casca); "+ atendimento"
(classe .trilho-mais, NUNCA cad-mini) abre pré-caso novo para qualquer
cliente, inclusive quem já tem caso. Suíte: 26 arquivos, 528 provas
(fluxo.js com 26).

## F29 · O portão da triagem e a recepção que colhe tudo (09.28)

A tela da recepção colhe também a senha do Meu INSS (POST em credenciais,
o caminho da ficha, ao lado do CPF), o estado civil e a profissão (a
procuração precisa) e a cidade/UF com padrão Monte Alto/SP — cliente de
outra cidade grava a cidade digitada e a lista de CEPs não casa de
propósito. O portão novo: cliente sem caso e sem triagem encerrada vê SÓ
o Cadastro, e dentro dele só Identificação e Triagem; `triagemFechada(c)`
(= `triagemDe(c).atendimento`, que o fecharAtendimento já gravava) abre
Lembretes e Anotações. Até lá o relato do balcão aparece DENTRO da
Triagem (`.tri-balcao`), e o pré-caso da recepção já responde a porta
(familiaDaTriagem lê precasos). Encerrar a triagem sem caso leva direto
às Anotações recém-abertas. O CNIS anexado preenche sozinho nome da mãe
e NIT vazios da Identificação (campo preenchido não se toca). Testes:
novocliente.js 49 provas, pdfinss.js 48; precaso.js e consulta.js
ganharam a pré-condição do portão na fixtura.

## F28 · A recepção completa: sexo, endereço por CEP e menção da triagem (09.27)

Sexo (Mulher/Homem, valores F/M da coluna `sexo`) entra no cadastro da
recepção porque decide a data da aposentadoria (o `sexoDe` prefere o
confirmado ao palpite pelo nome). O endereço sai da lista de 1.048 CEPs de
Monte Alto (arquivo do Paulo, embutido no app como `CEPS_MONTE_ALTO`): a
recepção digita a rua, o CEP, o bairro e Monte Alto/SP saem sozinhos, e a
gravação usa o MESMO `gravarEnderecoCli` da ficha (sete colunas + espelho
`endereco` da procuração). Rua ambígua (existe em mais de um bairro) exige
escolher da lista; rua de fora grava como digitada, sem CEP inventado.
Todo cliente novo dispara menção aos advogados (mesma escolha de ⚙️ do
aviso de caso novo; quem cadastrou não se avisa) com "dar seguimento na
triagem" — a menção nasce presa ao cliente (`mencoes.cliente_id`, ALTER
idempotente acrescentado ao `schema_por_em_dia.sql`; sem rodar o ALTER o
app cai no fallback e a menção chega só com o texto). A caixa 📥 resolve
a ficha também por `cliente_id`. Teste `novocliente.js` com 32 provas.

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
