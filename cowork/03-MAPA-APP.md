# Mapa do `crm/fase2/app.html`

Índice navegável de um arquivo de **13.381 linhas** — 696 funções, um
`<style>`, um `<script>` e o HTML no meio. Gerado por
`cowork/mapa_app.py`, que lê o arquivo e extrai tudo: faixas de linha, funções,
chamadas ao banco, seletores, estado global e injeções de estilo. **Rodar de
novo depois de mexer no app refaz o mapa** — não edite este arquivo à mão:

```
python3 cowork/mapa_app.py
```

Levantado com o app na versão **09.00**.

## As cinco faixas do arquivo

| Faixa | Linhas | O que tem |
|---|---|---|
| Cabeçalho e `<style>` | 1–1409 | tokens, reset e todo o CSS por componente |
| HTML do login | 1413–1446 | a tela de e-mail e senha |
| HTML do app | 1447–1505 | a moldura: barra, coluna do meio, ficha, modais |
| `<script>` | 1506–13379 | **11.873 linhas** — o sistema inteiro |
| `<style>` de impressão e extras | 12738–12747 · 13077–13081 · 13167–13177 | folhas menores no fim do arquivo |


## CSS, seção por seção

As faixas vêm dos comentários `/* ── título ── */` que o próprio arquivo usa.

| Linhas | Seção |
|---|---|
| 31–91 | login |
| 92–370 | MENU RECOLHIDO |
| 371–562 | a pauta |
| 563–712 | Fatos do benefício |
| 713–773 | compositor: escrever primeiro, Registrar por último |
| 774–801 | apagar o próprio comentário |
| 802–970 | arquivos do processo |
| 971–981 | importar do PAT/GERID |
| 982–1232 | F9 · CADASTRO: grade de 12 colunas |
| 1233–1345 | CELULAR |
| 1346–1393 | F8 · FICHA EM DUAS COLUNAS (protótipo aprovado) |
| 1394–1409 | F8 · COMPOSER ENXUTO |

## O `<script>`, seção por seção

| Linhas | Seção |
|---|---|
| 1511–1563 | CONFIGURAÇÃO (preencher na instalação — ver COMO-INSTALAR.md) |
| 1564–1606 | Tudo neste sistema é horário de Brasília e português do Brasil |
| 1607–1664 | pesquisa |
| 1665–1685 | o rascunho do andamento (por caso, só nesta sessão do navegador) |
| 1686–1714 | API (PostgREST + GoTrue por fetch, com paginação e refresh) |
| 1715–1767 | Arquivos (Storage) |
| 1768–1961 | login |
| 1962–2172 | estrutura de navegação |
| 2173–2347 | biblioteca de ícones SVG do menu (espec. 5.3) |
| 2348–2447 | o e-Recursos (CRPS), traduzido |
| 2448–2471 | decisões (o que mais importa) |
| 2472–2484 | julgamento / pauta |
| 2485–2494 | movimentos das partes |
| 2495–2500 | perícia médica |
| 2501–2642 | tramitação interna |
| 2643–2649 | o que o PAT chama de serviço, e o que o CRM chama de benefício |
| 2650–2668 | pedido de benefício |
| 2669–2674 | recurso: lista Conselho de Recursos, não INSS |
| 2675–2679 | revisão de benefício já concedido |
| 2680–2683 | dinheiro |
| 2684–2688 | serviço administrativo: não abre caso, acontece DENTRO de um |
| 2689–2848 | APURAÇÃO DE IRREGULARIDADE |
| 2849–3543 | importar do PAT/GERID (INSS) |
| 3544–3857 | coluna do meio |
| 3858–3913 | Meu Dia (com filtro por colaborador) |
| 3914–3961 | aplicar a coleta do e-Recursos |
| 3962–4138 | ⚖️ a coleta do PJe (acervo do TRF3) |
| 4139–4239 | a ESCOLHA À MÃO |
| 4240–4533 | ⚖️ o PROCESSO COMPLETO (coleta 'pje-processo') |
| 4534–4623 | marcar frases numa anotação |
| 4624–4693 | 📣 Novidades |
| 4694–4984 | 📌 DAR SEGUIMENTO |
| 4985–5014 | 🧹 Cuidar do acervo |
| 5015–5067 | 🗓️ Planejado (a agenda: filtros por período e por colaborador) |
| 5068–5118 | Minhas Tarefas (particulares) |
| 5119–5229 | Novo Cliente (botão do topo) |
| 5230–5269 | visão 🤖 Claude (sugestões com aprovação humana) |
| 5270–5307 | 📥 Menções (caixa de entrada) |
| 5308–5348 | 📄 Modelos de documentos (gerenciar) |
| 5349–5391 | 📌 Quadro Kanban (fases) |
| 5392–5480 | 💼 Vendas (funil de prospectos) |
| 5481–5930 | 💬 WhatsApp: a caixa de entrada do escritório |
| 5931–5995 | 💰 Quando o benefício cai na conta |
| 5996–6017 | ⚙️ Configurações: o que antes só se mudava no banco |
| 6018–6039 | quem atende |
| 6040–6070 | horário e interruptores |
| 6071–6089 | avisos |
| 6090–6104 | o robô |
| 6105–6115 | a ponte |
| 6116–6238 | o robô dos recursos (CRPS) |
| 6239–6270 | 📣 Marketing (o que estamos trabalhando + público por benefício) |
| 6271–6295 | agenda e dashboard |
| 6296–6458 | 📅 Calendário (o mês inteiro numa tela, como a agenda do Google) |
| 6459–6518 | escolher o fundo da lista |
| 6519–6633 | arrastar |
| 6634–6741 | ＋ Adicionar, fixo no pé da lista |
| 6742–6790 | quem já leu o comentário ("visto" da equipe) |
| 6791–6831 | o ＋ do comentário: o mesmo assunto pode ter dois prazos |
| 6832–6959 | concluir: a baixa é sua, e o que você fez vira comentário |
| 6960–7095 | rotina do escritório |
| 7096–7148 | qual processo? |
| 7149–7952 | ficha do cliente |
| 7953–7961 | as duas telas do processo |
| 7962–8129 | a data sai do próprio texto (como o Todoist faz) |
| 8130–8183 | Datas prováveis de aposentadoria |
| 8184–8343 | Homem ou mulher pelo primeiro nome |
| 8344–8409 | LOAS idoso e o CadÚnico |
| 8410–8423 | Último toque pelo WhatsApp |
| 8424–8551 | Esteira de revisão: nenhum processo fica 90 dias sem um olhar |
| 8552–8726 | 🔔 Lembretes do cliente |
| 8727–8924 | anotação do To Do (🙏 Aposentadorias Futuras) -> andamento de um caso |
| 8925–8998 | alterar o cadastro |
| 8999–9056 | anexar o documento (é para isto que o celular vai à casa do cliente) |
| 9057–9143 | Fatos do benefício |
| 9144–9191 | cópia fiel de regras/marcadores.js |
| 9192–9283 | pensão por morte |
| 9284–9626 | fim da cópia |
| 9627–9660 | a linha do tempo do escritório |
| 9661–9681 | 🌻 Andamentos INSS (PAT/Meu INSS) |
| 9682–9773 | 🗄 arquivar POR PROCESSO |
| 9774–10127 | 📖 Caso completo: todas as fontes numa linha do tempo só |
| 10128–10190 | cópia fiel de robo-crps/separar.js |
| 10191–10192 | fim da cópia |
| 10193–10268 | um caso para cada recurso |
| 10269–10530 | recurso de consulta manual |
| 10531–11022 | UM CASO, VÁRIOS PROCESSOS |
| 11023–11116 | celular |
| 11117–11144 | DCB: a data em que o benefício cessa sozinho |
| 11145–11587 | a escolha obrigatória do comentário |
| 11588–11644 | 📞 O REGISTRO DO AVISO |
| 11645–11868 | 💰 A CORRENTE DE CONFERÊNCIA (regra do Paulo, 13.08) |
| 11869–11988 | ⇄ fundir dois casos |
| 11989–12237 | catálogo de documentos (espelho do site interno) |
| 12238–12285 | telefones em lista |
| 12286–12434 | a grade |
| 12435–12800 | OS DOCUMENTOS DO ESCRITÓRIO |
| 12801–13092 | O QUADRO DO ATENDIMENTO |
| 13093–13234 | 📄 SOLICITAR DOCUMENTOS NO MEIO DA ANOTAÇÃO (pedido do Paulo) |
| 13235–13275 | arranque |
| 13276–13317 | atalhos de teclado |
| 13318–13379 | celular: barra de baixo e busca no alto da lista |

---

## Que função desenha cada tela

O caminho é sempre o mesmo: um clique muda uma variável global, chama
`render()` (coluna do meio) ou `repintarFicha()` (ficha), e a função abaixo
devolve HTML que é jogado com `innerHTML`. **Não há framework** — quem repinta
é quem escreve a string.

| Tela | Função | Linha |
|---|---|---:|
| Barra da esquerda (listas e visões) | `montarSidebar()` | 2230 |
| Coluna do meio — despachante | `render()` | 3730 |
| Linha do cliente na lista | `cartaoCliente()` | 3558 |
| Ficha do cliente (moldura, abas) | `pintarFicha()` | 7199 |
| Aba **Cadastro** | `painelCadastroFicha()` | 7518 |
| Cadastro › Identificação | `fichaIdentificacao()` | 12342 |
| Cadastro › Anotações | `caixaAtendimento()` | 12806 |
| Cadastro › Documentos | `caixaDocumentos()` | 12777 |
| Cadastro › Documentos (catálogo por benefício) | `catalogoNoCadastro()` | 7614 |
| Cadastro › Consulta | `painelConsulta()` | 7639 |
| Cadastro › Mensagens | `painelMensagensFicha()` | 7782 |
| Aba **Lembretes** | `painelLembretes()` | 8596 |
| Aba **Casos** — cartão de fatos | `blocoFatos()` | 9372 |
| Casos › Andamentos do Escritório | `painelEscritorio()` | 9560 |
| Casos › Andamentos INSS | `painelINSS()` | 9737 |
| Casos › Recurso (CRPS) | `painelCRPS()` | 10078 |
| Casos › Andamentos do CNJ | `painelCNJ()` | 10656 |
| Casos › Caso completo | `painelTudo()` | 9832 |
| Aba **Perícias** | `painelPericiasFicha()` | 7650 |
| Aba **Honorários** | `painelPagamentosFicha()` | 7717 |

### As telas da coluna do meio (fora da ficha)

| Visão (`visao`) | Função | Linha |
|---|---|---:|
| `meudia` | `renderMeuDia()` | 3859 |
| `agenda` | `renderAgenda()` | 6272 |
| `calendario` | `renderCalendario()` | 6378 |
| `planejado` | `renderPlanejado()` | 5017 |
| `dashboard` | `renderDash()` | 6700 |
| `novidades` | `renderNovidades()` | 4924 |
| `quadro` | `renderQuadro()` | 5359 |
| `vendas` | `renderVendas()` | 5405 |
| `whatsapp` | `renderWhats()` | 5495 |
| `acervo` | `renderAcervo()` | 4993 |
| `config` | `renderConfig()` | 6004 |
| `claude` | `renderClaude()` | 5231 |
| `mencoes` | `renderMencoes()` | 5271 |
| `particulares` | `renderParticulares()` | 5089 |
| `docmodelos` | `renderModelosDoc()` | 5309 |
| `novocliente` | `renderNovoCliente()` | 5120 |
| `patinss` | `renderImportarPat()` | 3210 |
| `rotinas` | `renderRotinas()` | 7026 |
| `parcerias` | `renderParcerias()` | 6680 |
| `marketing` | `renderMarketing()` | 6240 |

As listas por fase (🗓 Tarefas com Prazo, 🙋 Escritório, 🌻 INSS, 👪 Judicial,
🖥 Conselho, 💡 Petições, 🙏 Aposentadorias Futuras) não têm função própria:
caem no fim de `render()`, que monta os cartões com `cartaoCliente()`.


---

## Onde estão as chamadas ao Supabase

Toda chamada passa por `api()`. A tabela abaixo é o índice por tabela do banco:
onde se lê, onde se escreve e de qual função.

| Tabela | Chamadas | Métodos | Funções que tocam |
|---|---:|---|---|
| `andamentos` | 37 | DELETE, PATCH, POST | `anexar`, `apagarAndamento`, `aplicarPje`, `aplicarPjeProc`, `casoViraLembrete`, `confirmarSeparacao` +24 |
| `clientes` | 19 | GET, PATCH, POST | `addNaLista`, `criarCasoDoAtendimento`, `criarCliente`, `criarCronogramaINSS`, `definirSexo`, `docEntregue` +9 |
| `casos` | 14 | DELETE, PATCH, POST | `addNaLista`, `confirmarSeparacao`, `criarCasoDoAtendimento`, `criarCasoDoRecurso`, `criarCasoPjeParaCliente`, `criarCliente` +7 |
| `eventos` | 12 | PATCH, POST | `aplicarPericia`, `cancelarEvento`, `compareceuEvento`, `extrairEvento`, `novoEvento`, `salvarAvisado` +3 |
| `andamento_tarefas` | 12 | PATCH, POST | `correnteConferencia`, `criar`, `elosDepoisDeConferir`, `enviarEncaminhamento`, `fecharTarefa`, `mudarLembrar` +4 |
| `coletas` | 11 | GET, PATCH | `aplicarCrps`, `aplicarPje`, `aplicarPjeProc`, `buscarColetas`, `conferirCrps`, `conferirPje` +5 |
| `tarefas` | 11 | PATCH, POST | `alternarMarcador`, `aplicarChecklistCaso`, `criarCasoDoAtendimento`, `ligarChecklistFicha`, `ligarTarefas`, `novaSubtarefa` +4 |
| `atribuicoes` | 9 | DELETE, POST | `addNaLista`, `confirmarSeparacao`, `criarCasoDoRecurso`, `criarCliente`, `fecharEsc`, `leadParaCliente` +1 |
| `lembretes` | 7 | PATCH, POST | `adiarLembrete`, `casoViraLembrete`, `criarCronogramaINSS`, `desligarLembrete`, `lembreteAvisado`, `salvarAnotacaoNoCaso` +1 |
| `andamentos_lidos` | 6 | DELETE, POST | `fecharTarefa`, `marcarLidas`, `marcarLido`, `marcarRevisado`, `novoAndamento` |
| `pagamentos` | 5 | PATCH, POST | `enviarPagamentos`, `fecharEsc`, `novoPgto`, `vincularPgto` |
| `credenciais` | 5 | POST | `copiarCred`, `novaCred`, `trocarSenha`, `verCred` |
| `colaboradores` | 4 | GET, PATCH | `guarda`, `iniciar` |
| `zap_mensagens` | 4 | DELETE, PATCH, POST | `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `soltarRascunho` |
| `aposentadorias` | 4 | DELETE, PATCH, POST | `apagarApos`, `lembrarApos`, `salvarApos` |
| `mencoes` | 3 | PATCH, POST | `criarMencoes`, `lerMencao`, `marcarLido` |
| `leads` | 3 | PATCH, POST | `leadParaCliente`, `novoLead`, `renderVendas` |
| `rpc` | 3 | POST | `cfgSalva`, `gravar`, `transferirConversa` |
| `lembrar_motivos` | 3 | PATCH, POST | `lbDesativar`, `lbSalvarMotivo` |
| `meu_dia` | 2 | DELETE | `alternarMeuDia` |
| `modelos_documento` | 2 | PATCH, POST | `novoModeloDoc`, `salvarModeloDoc` |
| `zap_conversas` | 2 | PATCH | `abrirConversa`, `mudarConversa` |
| `lista_pref` | 2 | POST | `reordenarListas`, `salvarFundo` |
| `rotinas_feitas` | 2 | DELETE | `marcarRotina` |
| `rotinas` | 2 | PATCH, POST | `apagarRotina`, `novaRotina` |
| `vinculos` | 2 | DELETE, POST | `novoVinculo`, `removerVinculo` |
| `anexos` | 2 | DELETE, POST | `anexar`, `apagarAnexo` |
| `credencial_vis` | 2 | POST | `copiarCred`, `verCred` |
| `config_app` | 1 | POST | `guardarCfgApp` |
| `sugestoes` | 1 | PATCH | `decidirSugestao` |
| `lembrete_avisos` | 1 | POST | `lembreteAvisado` |
| `frases_prontas` | 1 | POST | `novaFrase` |
| `modelos_mensagem` | 1 | POST | `novoModelo` |
| `documentos_beneficio` | 1 | PATCH | `salvarDocs` |

<details><summary>Cada chamada, com a linha</summary>


**`andamento_tarefas`**

- linha 4611 · POST · em `enviarEncaminhamento()`
- linha 4806 · POST · em `salvarSeguimento()`
- linha 4823 · POST · em `salvarSeguimento()`
- linha 4856 · POST · em `criar()`
- linha 6821 · POST · em `ntSalvar()`
- linha 6874 · PATCH · em `fecharTarefa()`
- linha 6898 · POST · em `fecharTarefa()`
- linha 6924 · PATCH · em `mudarLembrar()`
- linha 11225 · POST · em `novoAndamento()`
- linha 11633 · PATCH · em `salvarAvisado()`
- linha 11682 · POST · em `correnteConferencia()`
- linha 11697 · PATCH · em `elosDepoisDeConferir()`

**`andamentos`**

- linha 3428 · POST · em `tentar()`
- linha 3443 · POST · em `tentar()`
- linha 3454 · POST · em `tentar()`
- linha 3524 · POST · em `juntarUm()`
- linha 4302 · POST · em `aplicarPjeProc()`
- linha 4306 · POST · em `aplicarPjeProc()`
- linha 4342 · POST · em `aplicarPje()`
- linha 4445 · POST · em `so()`
- linha 4606 · POST · em `enviarEncaminhamento()`
- linha 4798 · POST · em `salvarSeguimento()`
- linha 4819 · POST · em `salvarSeguimento()`
- linha 4852 · POST · em `criar()`
- linha 5258 · POST · em `decidirSugestao()`
- linha 6881 · POST · em `fecharTarefa()`
- linha 7465 · POST · em `fecharEsc()`
- linha 8448 · POST · em `marcarRevisado()`
- linha 8751 · POST · em `salvarAnotacaoNoCaso()`
- linha 8804 · POST · em `casoViraLembrete()`
- linha 9020 · POST · em `anexar()`
- linha 10250 · POST · em `confirmarSeparacao()`
- linha 10259 · POST · em `confirmarSeparacao()`
- linha 10382 · POST · em `salvarManualNovidade()`
- linha 10496 · POST · em `criarCasoDoRecurso()`
- linha 11217 · POST · em `novoAndamento()`
- linha 11320 · PATCH · em `apagarAndamento()`
- linha 11324 · DELETE · em `apagarAndamento()`
- linha 11471 · POST · em `novaExigencia()`
- linha 11623 · POST · em `salvarAvisado()`
- linha 11677 · POST · em `correnteConferencia()`
- linha 11829 · POST · em `encerrarDeVez()`
- linha 11852 · POST · em `enviarPagamentos()`
- linha 11966 · POST · em `t()`
- linha 11976 · POST · em `t()`
- linha 12045 · POST · em `solicitarDocsCatalogo()`
- linha 12057 · POST · em `cumprirExigencia()`
- linha 12772 · POST · em `registrarDocGerado()`
- linha 12963 · POST · em `criarCasoDoAtendimento()`

**`andamentos_lidos`**

- linha 4975 · POST · em `marcarLidas()`
- linha 6885 · POST · em `fecharTarefa()`
- linha 6935 · DELETE · em `marcarLido()`
- linha 6940 · POST · em `marcarLido()`
- linha 8452 · POST · em `marcarRevisado()`
- linha 11236 · POST · em `novoAndamento()`

**`anexos`**

- linha 9017 · POST · em `anexar()`
- linha 9035 · DELETE · em `apagarAnexo()`

**`aposentadorias`**

- linha 8302 · PATCH · em `lembrarApos()`
- linha 8306 · POST · em `lembrarApos()`
- linha 8905 · POST · em `salvarApos()`
- linha 8912 · DELETE · em `apagarApos()`

**`atribuicoes`**

- linha 5210 · POST · em `criarCliente()`
- linha 5471 · POST · em `leadParaCliente()`
- linha 6671 · POST · em `addNaLista()`
- linha 7480 · POST · em `fecharEsc()`
- linha 7487 · DELETE · em `fecharEsc()`
- linha 10248 · POST · em `confirmarSeparacao()`
- linha 10494 · POST · em `criarCasoDoRecurso()`
- linha 11934 · DELETE · em `t()`
- linha 11937 · DELETE · em `t()`

**`casos`**

- linha 1864 · PATCH · em `patchCaso()`
- linha 3434 · POST · em `tentar()`
- linha 3482 · POST · em `criarMesmoAssim()`
- linha 4119 · POST · em `criarCasoPjeParaCliente()`
- linha 4122 · POST · em `criarCasoPjeParaCliente()`
- linha 5207 · POST · em `criarCliente()`
- linha 5468 · POST · em `leadParaCliente()`
- linha 6669 · POST · em `addNaLista()`
- linha 10242 · POST · em `confirmarSeparacao()`
- linha 10490 · POST · em `criarCasoDoRecurso()`
- linha 11530 · POST · em `novoCaso()`
- linha 11980 · DELETE · em `t()`
- linha 12025 · POST · em `solicitarDocsCatalogo()`
- linha 12952 · POST · em `criarCasoDoAtendimento()`

**`clientes`**

- linha 5197 · GET · em `criarCliente()`
- linha 5204 · POST · em `criarCliente()`
- linha 5466 · POST · em `leadParaCliente()`
- linha 6662 · GET · em `addNaLista()`
- linha 6667 · POST · em `addNaLista()`
- linha 8880 · PATCH · em `marcarAposentado()`
- linha 8919 · PATCH · em `definirSexo()`
- linha 8971 · PATCH · em `salvarCampo()`
- linha 12101 · PATCH · em `salvarPasta()`
- linha 12193 · PATCH · em `salvarCliCampo()`
- linha 12206 · PATCH · em `salvarCliCampo()`
- linha 12250 · PATCH · em `salvarTelefones()`
- linha 12258 · PATCH · em `salvarTelefones()`
- linha 12923 · PATCH · em `salvarEspecieAtendimento()`
- linha 12936 · PATCH · em `salvarNotaAtendimento()`
- linha 12979 · PATCH · em `criarCasoDoAtendimento()`
- linha 13012 · PATCH · em `criarCronogramaINSS()`
- linha 13039 · PATCH · em `pedirDocsAtendimento()`
- linha 13052 · PATCH · em `docEntregue()`

**`colaboradores`**

- linha 1830 · GET · em `iniciar()`
- linha 6167 · PATCH · em `guarda()`
- linha 6176 · PATCH · em `guarda()`
- linha 6183 · PATCH · em `guarda()`

**`coletas`**

- linha 3127 · GET · em `buscarColetas()`
- linha 3147 · PATCH · em `descartarColetasVelhas()`
- linha 3155 · GET · em `usarColeta()`
- linha 3467 · PATCH · em `tentar()`
- linha 3972 · GET · em `conferirPje()`
- linha 4250 · GET · em `conferirPjeProc()`
- linha 4312 · PATCH · em `aplicarPjeProc()`
- linha 4348 · PATCH · em `aplicarPje()`
- linha 4378 · GET · em `conferirCrps()`
- linha 4425 · GET · em `aplicarCrps()`
- linha 4450 · PATCH · em `so()`

**`config_app`**

- linha 1877 · POST · em `guardarCfgApp()`

**`credenciais`**

- linha 8993 · POST · em `trocarSenha()`
- linha 8995 · POST · em `trocarSenha()`
- linha 13215 · POST · em `copiarCred()`
- linha 13221 · POST · em `verCred()`
- linha 13230 · POST · em `novaCred()`

**`credencial_vis`**

- linha 13217 · POST · em `copiarCred()`
- linha 13223 · POST · em `verCred()`

**`documentos_beneficio`**

- linha 13201 · PATCH · em `salvarDocs()`

**`eventos`**

- linha 3461 · POST · em `tentar()`
- linha 4813 · POST · em `salvarSeguimento()`
- linha 4844 · POST · em `aplicarPericia()`
- linha 11108 · POST · em `extrairEvento()`
- linha 11558 · POST · em `novoEvento()`
- linha 11569 · PATCH · em `cancelarEvento()`
- linha 11579 · PATCH · em `compareceuEvento()`
- linha 11618 · POST · em `salvarAvisado()`
- linha 11626 · POST · em `salvarAvisado()`
- linha 11926 · PATCH · em `t()`
- linha 11929 · PATCH · em `t()`
- linha 11931 · PATCH · em `t()`

**`frases_prontas`**

- linha 11543 · POST · em `novaFrase()`

**`leads`**

- linha 5448 · PATCH · em `renderVendas()`
- linha 5458 · POST · em `novoLead()`
- linha 5474 · POST · em `leadParaCliente()`

**`lembrar_motivos`**

- linha 11434 · PATCH · em `lbSalvarMotivo()`
- linha 11440 · POST · em `lbSalvarMotivo()`
- linha 11451 · PATCH · em `lbDesativar()`

**`lembrete_avisos`**

- linha 8691 · POST · em `lembreteAvisado()`

**`lembretes`**

- linha 8679 · POST · em `v()`
- linha 8694 · POST · em `lembreteAvisado()`
- linha 8712 · PATCH · em `adiarLembrete()`
- linha 8721 · PATCH · em `desligarLembrete()`
- linha 8756 · PATCH · em `salvarAnotacaoNoCaso()`
- linha 8790 · POST · em `casoViraLembrete()`
- linha 13004 · POST · em `criarCronogramaINSS()`

**`lista_pref`**

- linha 6492 · POST · em `salvarFundo()`
- linha 6625 · POST · em `reordenarListas()`

**`mencoes`**

- linha 5290 · PATCH · em `lerMencao()`
- linha 5302 · POST · em `criarMencoes()`
- linha 6948 · PATCH · em `marcarLido()`

**`meu_dia`**

- linha 2137 · DELETE · em `alternarMeuDia()`
- linha 2140 · DELETE · em `alternarMeuDia()`

**`modelos_documento`**

- linha 5336 · PATCH · em `salvarModeloDoc()`
- linha 5343 · POST · em `novoModeloDoc()`

**`modelos_mensagem`**

- linha 12084 · POST · em `novoModelo()`

**`pagamentos`**

- linha 7498 · PATCH · em `fecharEsc()`
- linha 7507 · PATCH · em `fecharEsc()`
- linha 7707 · PATCH · em `vincularPgto()`
- linha 11720 · POST · em `novoPgto()`
- linha 11845 · POST · em `enviarPagamentos()`

**`rotinas`**

- linha 7081 · POST · em `novaRotina()`
- linha 7090 · PATCH · em `apagarRotina()`

**`rotinas_feitas`**

- linha 7011 · DELETE · em `marcarRotina()`
- linha 7014 · DELETE · em `marcarRotina()`

**`rpc`**

- linha 5884 · POST · em `transferirConversa()`
- linha 5902 · POST · em `gravar()`
- linha 6199 · POST · em `cfgSalva()`

**`sugestoes`**

- linha 5263 · PATCH · em `decidirSugestao()`

**`tarefas`**

- linha 5084 · PATCH · em `ligarTarefas()`
- linha 5112 · POST · em `novaTarefa()`
- linha 9362 · POST · em `alternarMarcador()`
- linha 10972 · POST · em `novaSubtarefa()`
- linha 10981 · PATCH · em `ligarChecklistFicha()`
- linha 11280 · POST · em `novoAndamento()`
- linha 11294 · POST · em `novoAndamento()`
- linha 12039 · POST · em `solicitarDocsCatalogo()`
- linha 12119 · POST · em `aplicarChecklistCaso()`
- linha 12973 · POST · em `criarCasoDoAtendimento()`
- linha 13140 · POST · em `solicitarDocsAnotacao()`

**`vinculos`**

- linha 7859 · POST · em `novoVinculo()`
- linha 7865 · DELETE · em `removerVinculo()`

**`zap_conversas`**

- linha 5619 · PATCH · em `abrirConversa()`
- linha 5862 · PATCH · em `mudarConversa()`

**`zap_mensagens`**

- linha 5714 · PATCH · em `soltarRascunho()`
- linha 5721 · DELETE · em `descartarRascunho()`
- linha 5748 · POST · em `enviarZap()`
- linha 5787 · POST · em `mandarArquivoZap()`

</details>


---

## O que NÃO pode ser renomeado

O JavaScript procura estes nomes **por string**. Renomear qualquer um deles no
HTML ou no CSS sem trocar também no script quebra a tela em silêncio — não dá
erro no console, o elemento simplesmente não é encontrado.

### `id` consultados por `getElementById` ou `#seletor`

| id | Vezes |
|---|---:|
| `conteudo-meio` | 25 |
| `sub-lista` | 21 |
| `app` | 14 |
| `modal` | 13 |
| `busca` | 9 |
| `zap-txt` | 9 |
| `and-texto` | 7 |
| `cad-ed` | 6 |
| `seg-data` | 5 |
| `busca-cel` | 4 |
| `busca-x` | 4 |
| `ed-campo` | 4 |
| `lembrar-box` | 4 |
| `preenche-box` | 4 |
| `tf-box` | 4 |
| `titulo-lista` | 4 |
| `busca-cel-x` | 3 |
| `lbm-grupo-novo` | 3 |
| `login-erro` | 3 |
| `ordem` | 3 |
| `add-nome` | 2 |
| `and-caso` | 2 |
| `ap-data` | 2 |
| `apos-form` | 2 |
| `arq-inp` | 2 |
| `at-docs` | 2 |
| `aviso` | 2 |
| `barra-cel` | 2 |
| `btn-entrar` | 2 |
| `cad-ed2` | 2 |
| `cred-` | 2 |
| `ct-txt` | 2 |
| `detalhe` | 2 |
| `doc-ben` | 2 |
| `doc-conteudo` | 2 |
| `esc-pje-busca` | 2 |
| `ex-desc` | 2 |
| `ex-prazo` | 2 |
| `hon-valor` | 2 |
| `lbm-grupo` | 2 |
| `lbm-texto` | 2 |
| `login-email` | 2 |
| `login-senha` | 2 |
| `mn-txt` | 2 |
| `nc-valor` | 2 |
| `ncl-dn` | 2 |
| `nk-ben` | 2 |
| `nl-nome` | 2 |
| `nt-titulo` | 2 |
| `pnc-ok` | 2 |
| `res-ed` | 2 |
| `rt-diames` | 2 |
| `seg-txt` | 2 |
| `sug-abrir` | 2 |
| `sug-box` | 2 |
| `tf-data` | 2 |
| `zap-arq` | 2 |
| `zap-dir` | 2 |
| `abrir-tudo` | 1 |
| `add-ben` | 1 |
| `add-rodape` | 1 |
| `ag-data` | 1 |
| `ag-hora` | 1 |
| `ag-tipo` | 1 |
| `agendar-tudo` | 1 |
| `and-prazo-chip` | 1 |
| `ap-esp` | 1 |
| `at-doc-extra` | 1 |
| `at-especie` | 1 |
| `at-fase` | 1 |
| `at-nota` | 1 |
| `av-data` | 1 |
| `av-hora` | 1 |
| `ben-` | 1 |
| `btn-lateral` | 1 |
| `btn-novo-cli` | 1 |
| `btn-processos` | 1 |
| `btn-som` | 1 |
| `cad-` | 1 |
| `cad-rg` | 1 |
| `cad-tel-novo` | 1 |
| `cad-tel-obs` | 1 |
| `cal-ano-sel` | 1 |
| `cal-mes-sel` | 1 |
| `campo-` | 1 |
| `cf-crps-cracha` | 1 |
| `cf-crps-salvar` | 1 |
| `cfg-key` | 1 |
| `cfg-url` | 1 |
| `chip-exig` | 1 |
| `chip-vencidas` | 1 |
| `crps-nup-` | 1 |
| `ct-prot` | 1 |
| `doc-destino` | 1 |
| `doc-editor-` | 1 |
| `doc-obs-` | 1 |
| `doc-txt-` | 1 |
| `ed-doc-` | 1 |
| `esc-pje-lista` | 1 |
| `exig-box` | 1 |
| `fd-nao` | 1 |
| `fd-ok` | 1 |
| `fundo-arq` | 1 |
| `grupo-dinamicas` | 1 |
| `grupo-fases` | 1 |
| `grupo-visoes` | 1 |
| `hon-enviar` | 1 |
| `hon-nao` | 1 |
| `hon-sim` | 1 |
| `hon-venc` | 1 |
| `jan-cancela` | 1 |
| `jan-hon` | 1 |
| `jan-hon-campos` | 1 |
| `jan-nao` | 1 |
| `jan-novo` | 1 |
| `janela` | 1 |
| `jd-extra` | 1 |
| `jd-lista` | 1 |
| `lb-gps` | 1 |
| `lb-titulo` | 1 |
| `lbm-titulo` | 1 |
| `ler-tudo` | 1 |
| `login-config` | 1 |
| `mais-opcoes` | 1 |
| `menu-mover` | 1 |
| `menu-processos` | 1 |
| `nc-tipo` | 1 |
| `ncl-caso` | 1 |
| `ncl-cpf` | 1 |
| `ncl-data` | 1 |
| `ncl-fase` | 1 |
| `ncl-hora` | 1 |
| `ncl-idade` | 1 |
| `ncl-nome` | 1 |
| `ncl-tel` | 1 |
| `ncl-tipo` | 1 |
| `nd-cat` | 1 |
| `nd-titulo` | 1 |
| `ne-caso` | 1 |
| `ne-data` | 1 |
| `ne-hora` | 1 |
| `ne-local` | 1 |
| `ne-tipo` | 1 |
| `nf-texto` | 1 |
| `nk-fase` | 1 |
| `nk-prazo` | 1 |
| `nl-ben` | 1 |
| `nl-origem` | 1 |
| `nl-tel` | 1 |
| `nm-ctx` | 1 |
| `nm-texto` | 1 |
| `nm-titulo` | 1 |
| `np-caso` | 1 |
| `np-data` | 1 |
| `np-desc` | 1 |
| `np-valor` | 1 |
| `nsub-` | 1 |
| `nt-prazo` | 1 |
| `pat-arq` | 1 |
| `pd-url` | 1 |
| `proc-novo-` | 1 |
| `rt-detalhe` | 1 |
| `rt-quando` | 1 |
| `rt-resp` | 1 |
| `rt-titulo` | 1 |
| `seg-evt` | 1 |
| `selo-menc` | 1 |
| `sem-js` | 1 |
| `sync-todo` | 1 |
| `tela-login` | 1 |
| `tf-escolher` | 1 |
| `tf-ninguem` | 1 |
| `txt-doc-` | 1 |
| `u-avatar` | 1 |
| `u-nome` | 1 |
| `u-papel` | 1 |
| `ver-novidades` | 1 |
| `vin-nome` | 1 |
| `vin-rel` | 1 |
| `visto-` | 1 |
| `zap-doc` | 1 |
| `zap-msgs` | 1 |
| `zs-` | 1 |
| `zt-motivo` | 1 |

### classes consultadas por `querySelector`, `closest` ou `classList`

| classe | Vezes |
|---|---:|
| `.on` | 39 |
| `.alvo` | 7 |
| `.detalhe-aberto` | 6 |
| `.lista-item` | 6 |
| `.solta` | 6 |
| `.arrastando` | 4 |
| `.ativa` | 4 |
| `.esc-aberto` | 4 |
| `.mini-lateral` | 4 |
| `.busca-aberta` | 3 |
| `.enc-quem` | 3 |
| `.escrever` | 3 |
| `.tf-dt` | 3 |
| `.anim-vista` | 2 |
| `.cartao` | 2 |
| `.coluna` | 2 |
| `.det-rolagem` | 2 |
| `.enc-data` | 2 |
| `.enc-dia` | 2 |
| `.enc-txt` | 2 |
| `.kcard` | 2 |
| `.lbm-lista` | 2 |
| `.meio` | 2 |
| `.menu-aberto` | 2 |
| `.modal-cx` | 2 |
| `.pr-campo` | 2 |
| `.zap-lado` | 2 |
| `.aberto` | 1 |
| `.at-doc` | 1 |
| `.avatares` | 1 |
| `.cal-it` | 1 |
| `.cel-tudo` | 1 |
| `.celular` | 1 |
| `.cfg-link` | 1 |
| `.cfg-reg` | 1 |
| `.crps-res-pe` | 1 |
| `.ct-rep` | 1 |
| `.doc-it` | 1 |
| `.enc` | 1 |
| `.evento` | 1 |
| `.fchip` | 1 |
| `.feito` | 1 |
| `.ficha-tudo` | 1 |
| `.jd-doc` | 1 |
| `.logado` | 1 |
| `.mt` | 1 |
| `.nov-cli` | 1 |
| `.off` | 1 |
| `.ordenar` | 1 |
| `.seg-quem` | 1 |
| `.sug-it` | 1 |
| `.tf-eq` | 1 |

### atributos `data-` lidos pelo script

| atributo | Vezes |
|---|---:|
| `data-cli` | 16 |
| `data-dia` | 5 |
| `data-fase` | 5 |
| `data-ler` | 4 |
| `data-revks` | 4 |
| `data-sug` | 4 |
| `data-atende` | 3 |
| `data-encaminhar` | 3 |
| `data-estrela` | 3 |
| `data-etapa` | 3 |
| `data-mnc` | 3 |
| `data-mnq` | 3 |
| `data-res` | 3 |
| `data-v` | 3 |
| `data-auto` | 2 |
| `data-cargo` | 2 |
| `data-caso` | 2 |
| `data-cel` | 2 |
| `data-conclui` | 2 |
| `data-confere` | 2 |
| `data-eq` | 2 |
| `data-equipe` | 2 |
| `data-f` | 2 |
| `data-fcol` | 2 |
| `data-fogo` | 2 |
| `data-lead` | 2 |
| `data-mp` | 2 |
| `data-mv` | 2 |
| `data-mz` | 2 |
| `data-partes` | 2 |
| `data-pcol` | 2 |
| `data-per` | 2 |
| `data-prazo` | 2 |
| `data-recebe` | 2 |
| `data-resultado` | 2 |
| `data-setor` | 2 |
| `data-subt` | 2 |
| `data-vv` | 2 |
| `data-zc` | 2 |
| `data-zf` | 2 |
| `data-zk` | 2 |
| `data-zt` | 2 |
| `data-acao` | 1 |
| `data-cancelar` | 1 |
| `data-col` | 1 |
| `data-di` | 1 |
| `data-enc` | 1 |
| `data-enviar` | 1 |
| `data-t` | 1 |

---

## Estado global

Não há gerenciador de estado: são variáveis soltas no topo do `<script>`. Quem
escreve numa delas muda a tela inteira na próxima pintura. A coluna "escrevem"
é a que importa quando algo aparece onde não devia.

Vale aqui o mesmo aviso da tabela de funções: a atribuição usa a definição mais
próxima acima da linha, então closure aninhada aparece com o nome do vizinho.
É pista para o grep, não verdade formal.

| Variável | Linha | Escrevem | Leem |
|---|---:|---|---|
| `sessao` | 1634 | `digitando`, `entrar`, `iniciar`, `renovar` | `api`, `dataSessao`, `subirArquivo`, `subirFundo` |
| `eu` | 1635 | `iniciar` | `addNaLista`, `alternarArquivo`, `alternarMeuDia`, `anexar`, `api`, `aplicarPje`, `aplicarPjeProc`, `assumirConversa` +72 |
| `D` | 1636 | `carregar` | `abrirAnexo`, `abrirDrive`, `abrirERecursos`, `abrirExplorer`, `abrirFicha`, `abrirSeguimento`, `abrirSmbot`, `acharArquivoCrps` +299 |
| `visao` | 1637 | `avisoCRPS`, `criarCliente`, `irCel`, `render`, `sinoSvg` | `abrirFundos`, `addNaLista`, `aplicarTema`, `cartaoCliente`, `ligarCartoes`, `marcarBarraCel`, `mostrarAddRodape`, `renderImportarPat` +1 |
| `filtroColab` | 1637 | `iniciar`, `render`, `tCol` | `blocoCrpsManual`, `doColab`, `renderMeuDia`, `rotinasDoDia`, `tfDo` |
| `filtroVencidas` | 1637 | `tCol` | — |
| `buscaTxt` | 1637 | `digitando`, `irCel`, `novaCred` | `abrirFundos`, `aplicarTema`, `marcarBarraCel`, `mostrarAddRodape`, `render` |
| `clienteAberto` | 1637 | `abrirFicha`, `fecharFicha`, `novaCred` | `adiarLembrete`, `alternarArquivo`, `alternarMarcador`, `anexar`, `apagarAndamento`, `apagarAnexo`, `apagarApos`, `cancelarEvento` +55 |
| `abaAtiva` | 1637 | `abrirFicha`, `agendarAtendimento`, `casoViraLembrete`, `checklistCaso`, `criarCasoDoAtendimento`, `criarCliente`, `criarCronogramaINSS`, `fecharFicha` +12 | `fecharEsc`, `pintarFicha` |
| `casoSel` | 1637 | `abrirFicha`, `criarCasoDoAtendimento`, `criarCliente`, `escolhido`, `fecharEscolha`, `item`, `novoCaso`, `pintarFicha` +2 | `catalogoNoCadastro`, `especieDoCliente`, `fecharEsc`, `janelaDocsAnotacao`, `novaExigencia`, `registrarDocGerado`, `soltarClienteNaLista`, `usarSugestao` |
| `subAba` | 1638 | `irSubAba` | `pintarFicha` |
| `instSel` | 1638 | `abrirFicha`, `painelCNJ` | — |
| `subCad` | 1639 | `abrirFicha`, `agendarAtendimento`, `criarCliente`, `irSubCad` | `fecharEsc`, `painelCadastroFicha` |
| `procSel` | 1643 | `abrirFicha`, `painelCNJ` | — |
| `fonteCnj` | 1643 | `abrirFicha`, `painelCNJ` | — |
| `nupSel` | 1643 | `abrirFicha`, `manual` | — |
| `balaoMenu` | 2329 | `etiquetaMenu` | `esconderEtiqueta` |
| `balaoAlvo` | 2329 | `esconderEtiqueta`, `etiquetaMenu` | `seguirEtiqueta` |
| `planoPat` | 3108 | `ligarImportarPat`, `tentar`, `usarColeta` | `aplicarPat`, `criarMesmoAssim`, `cx`, `ignorarProtocolo`, `juntarAoCaso`, `juntarProvaveis`, `juntarUm`, `telaImportarPat` |
| `arquivoPat` | 3108 | `ligarImportarPat`, `usarColeta` | — |
| `coletasPendentes` | 3123 | `buscarColetas` | `coletasPorFonte`, `renderImportarPat` |
| `soExigencia` | 3676 | `render` | — |
| `vistaAnimada` | 3729 | `render` | — |
| `planoPjeAtual` | 3969 | `aplicarPje`, `conferirPje` | `criarCasoEscolhidoPje`, `criarCasoPje`, `criarCasoPjeParaCliente`, `cx`, `escolherCasoPje`, `ignorarProcessoPje`, `limparIgnoradosPje`, `vincularEscolhidoPje` +3 |
| `planoPjeProcAtual` | 4247 | `aplicarPjeProc`, `conferirPjeProc` | `cx` |
| `planoCrpsAtual` | 4362 | `conferirCrps`, `so` | `cx` |
| `encaminhando` | 4488 | `enviarEncaminhamento`, `ligarEncaminhar` | — |
| `segItens` | 4734 | — | `abrirSeguimento`, `periciaRapida`, `segRegistrar` |
| `segAberto` | 4742 | `abrirSeguimento`, `salvarSeguimento` | — |
| `filtroPlan` | 5016 | `dataDe` | — |
| `filtroPlanColab` | 5016 | `dataDe` | — |
| `zapFiltro` | 5489 | `meu` | — |
| `zapAberta` | 5489 | `abrirConversa` | `alternarBot`, `cartaoConversa`, `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `msgDocumentos`, `mudarConversa`, `pintarConversa` +7 |
| `zapMsgs` | 5489 | `abrirConversa`, `recarregarMsgs` | `atualizarVistos`, `pintarConversa`, `verMidiaZap` |
| `zapTimer` | 5489 | `pararZapTimer`, `renderWhats` | — |
| `zapConvs` | 5489 | `recarregarZap` | `abrirConversa`, `alternarBot`, `enviarZap`, `mandarArquivoZap`, `meu`, `msgDocumentos`, `mudarConversa`, `pintarConversa` +3 |
| `zapNota` | 5491 | `alternarNota` | `enviarZap`, `pintarConversa` |
| `zapFotos` | 5566 | — | `assinarFotosZap`, `avatarZap` |
| `cfgAvisos` | 6002 | — | `renderConfig` |
| `cfgPassos` | 6002 | — | `renderConfig` |
| `calMes` | 6315 | `irMes`, `irVisaoCal` | `mesAtual` |
| `calVisao` | 6362 | `irMes`, `irVisaoCal` | `ordena`, `vizinho` |
| `calFiltro` | 6363 | `filtrarCal` | `ordena`, `renderCalendario`, `vizinho` |
| `arrastando` | 6523 | `ligarArrasteCartoes`, `ligarArrasteListas`, `soltarClienteNaLista` | — |
| `ntSel` | 6792 | `novaTarefaComentario`, `ntToggle` | `ntSalvar` |
| `ntData` | 6792 | `novaTarefaComentario`, `ntDia` | `ntSalvar` |
| `ctRep` | 6840 | `concluirTarefa`, `ctRepetir`, `fecharTarefa` | `ntSalvar` |
| `prazoDetectado` | 8115 | `fecharEsc`, `novoAndamento`, `pintarPrazoDoTexto` | — |
| `prazoCancelado` | 8115 | `fecharEsc`, `novoAndamento`, `pintarPrazoDoTexto`, `usarSugestao` | — |
| `tudoSoMarcos` | 9790 | `abrirFicha`, `painelTudo` | — |
| `_timerFolga` | 11076 | `folgaComposer` | — |
| `tfQuem` | 11148 | `novoAndamento`, `pintarFicha`, `tfNinguem`, `tfPessoa` | `salvarProrrog`, `tfDia` |
| `tfData` | 11148 | `novoAndamento`, `pintarFicha`, `tfDia` | `salvarProrrog` |
| `lbEditando` | 11338 | `lbEditar` | — |
| `lbMotivoEdit` | 11338 | `lbCarregarForm`, `lbEditar`, `lbFormHtml`, `lbSalvarMotivo` | — |
| `_docLinhas` | 11991 | `renderDocCatalogo` | `solicitarDocsCatalogo` |
| `timerBusca` | 13236 | `novaCred` | — |
| `timerCel` | 13321 | `digitando` | — |

---

## Onde o JavaScript injeta estilo

Duas formas, muito diferentes uma da outra.

**1. `elemento.style.X = …` — 86 pontos.**
É o estilo que muda depois da pintura: mostrar, esconder, medir e posicionar.
São estes os que brigam com o CSS, porque ganham dele sempre.

| Propriedade | Vezes | Linhas |
|---|---:|---|
| `style.display` | 54 | 1509, 1838, 2340, 2346, 3743, 5178, 6488, 6600, 6643, 7056, 7123, 7127 … |
| `style.height` | 9 | 5674, 5674, 5745, 7383, 7384, 8126, 8126, 11523, 11523 |
| `style.background` | 5 | 1848, 2023, 2031, 4780, 4781 |
| `style.left` | 3 | 2120, 2338, 7839 |
| `style.top` | 3 | 2121, 2339, 7840 |
| `style.backgroundImage` | 2 | 2021, 2024 |
| `style.color` | 2 | 2035, 2316 |
| `style.backgroundSize` | 1 | 2025 |
| `style.backgroundPosition` | 1 | 2026 |
| `style.backgroundAttachment` | 1 | 2027 |
| `style.setProperty/cssText` | 1 | 2036 |
| `style.overflowY` | 1 | 7385 |
| `style.paddingBottom` | 1 | 11066 |
| `style.bottom` | 1 | 11070 |
| `style.outline` | 1 | 11785 |

**2. `style="…"` dentro do HTML gerado — 457 linhas.**
É o estilo escrito junto do template. Não some com um `classList`, e é o que
sobra da reforma visual: cada um destes é um lugar onde o CSS por classe ainda
não chegou. Um pente fino por aqui é o caminho natural de uma fase F13.


---

## Todas as funções

Ordenadas por linha. A coluna "o que faz" vem do comentário que o próprio
código já tinha; quando não havia, vem do corpo (função de uma linha) ou da
assinatura — a coluna **de onde** diz qual é o caso, para ninguém confundir
descrição escrita com texto extraído. "Quem chama" sai da varredura de chamadas
no arquivo; `HTML inline` quer dizer que a chamada está num `onclick=` dentro de
um template.

**Um aviso sobre a coluna "quem chama".** A varredura atribui cada chamada à
definição de função mais próxima acima dela. Funcionaria perfeitamente se todo
o código fosse função top-level — e a maior parte é. Onde há closure aninhada
(um `.map(x => …)` dentro de uma função grande, um `onclick` montado em
string), a atribuição vai para a função que contém o trecho, o que costuma ser
o que se quer, mas pode apontar para a definição de uma linha que só está por
perto. Trate a coluna como **pista para o grep**, não como verdade formal.

| Linha | Função | O que faz | De onde | Quem chama |
|---:|---|---|---|---|
| 1527 | `guardar()` | Grava uma chave no localStorage (com try/catch: navegador em anônimo recusa). | escrito à mão | `digitando`, `editarFato`, `entrar`, `guardarConfig`, `irMes` +5 |
| 1531 | `ler()` | Lê uma chave do localStorage. | escrito à mão | `aplicarMenu`, `digitando`, `faltaConfig`, `linha`, `moeda` +2 |
| 1535 | `esquecer()` | Apaga uma chave do localStorage. | escrito à mão | `iniciar`, `pedirConfig`, `sair` |
| 1539 | `guardaFunciona()` | Testa se o navegador deixa gravar no localStorage. | escrito à mão | `entrar` |
| 1543 | `faltaConfig()` | Diz se o endereço do Supabase ainda é o texto de instalação. | escrito à mão | `digitando`, `ela mesma`, `entrar` |
| 1551 | `guardarConfig()` | Salva neste aparelho um endereço de banco diferente do padrão. | escrito à mão | `HTML inline` |
| 1569 | `hoje()` | A data de hoje no relógio de Brasília, mesmo com o aparelho em outro fuso. | escrito à mão | `HTML inline`, `abrirExigencia`, `abrirSeguimento`, `alternarMeuDia`, `bloco` +69 |
| 1571 | `agoraSP()` | A hora de agora em Brasília. | escrito à mão | `renderMeuDia` |
| 1577 | `_dt()` | timestamp do banco -> data e hora de Brasília. | comentário acima | `dataSP`, `horaSP` |
| 1582 | `_semFuso()` | function _semFuso(ts){ return ts && !/[Zz]/[+-]\d\d:?\d\d$/.test(ts); } | o próprio corpo | `dataSP`, `horaSP` |
| 1583 | `dataSP()` | Timestamp do banco → data de Brasília. | escrito à mão | `bloco`, `blocoRecurso`, `caixaPje`, `cancelarEvento`, `cartaoCliente` +19 |
| 1587 | `horaSP()` | Timestamp do banco → hora de Brasília. | escrito à mão | `bloco`, `blocoFatos`, `bolhaZap`, `cx`, `em15` +11 |
| 1592 | `fmtTS()` | Timestamp → DD.MM.AAAA. | escrito à mão | `bloco`, `blocoFatos`, `caixaArquivos`, `comentario`, `painelINSS` +13 |
| 1593 | `fmt()` | AAAA-MM-DD → DD.MM.AAAA. | escrito à mão | `abrirSeguimento`, `adiarLembrete`, `blocoApos`, `blocoCadunico`, `blocoCrpsManual` +64 |
| 1594 | `fmtCpf()` | 11 dígitos → [nº removido]. | escrito à mão | `avisoCpfRepetido`, `em15`, `fichaIdentificacao`, `pintarFicha`, `preencherDoc` +1 |
| 1595 | `digitosCpf()` | escapa TAMBÉM aspas e apóstrofos: sem isso, esc() protegia o miolo do | comentário dentro | `addNaLista`, `criarCliente`, `editarCampo`, `salvarCampo` |
| 1600 | `esc()` | Escapa HTML — é a barreira contra script vindo de texto de cliente. | escrito à mão | `HTML inline`, `abrirFundos`, `abrirSeguimento`, `anotacaoViraAndamento`, `avatarZap` +127 |
| 1602 | `escJs()` | Escapa texto que vai dentro de um atributo onclick. | escrito à mão | `HTML inline` |
| 1604 | `urlOk()` | href só de verdade: link de coleta (PAT/PJe) sem https na frente não entra | comentário acima | `blocoFatos`, `cx`, `linhaNovidade`, `painelCNJ` |
| 1605 | `dsa()` | Texto sem acento e em minúsculas, para comparar. | escrito à mão | `T`, `alternarFrase`, `aplicarChecklistCaso`, `aposDoCliente`, `avisoCpfRepetido` +24 |
| 1612 | `termosBusca()` | CPF, nº de processo, protocolo: vale o número inteiro, não os pedaços | comentário dentro | `pesquisar` |
| 1621 | `pesquisar()` | Procura clientes por nome, CPF, processo, protocolo ou NB. | escrito à mão | `render` |
| 1626 | `noNome()` | quem casa pelo NOME aparece primeiro; | comentário acima | `ela mesma` |
| 1632 | `moeda()` | Número → R$ com duas casas. | escrito à mão | `fecharEsc`, `novoPgto`, `painelPagamentosFicha`, `renderDash` |
| 1647 | `somLigado()` | som de retorno, como no To Do (gerado na hora — sem arquivo de áudio). | comentário acima | `plim`, `sinoSvg` |
| 1648 | `plim()` | O som curto de tarefa concluída. | escrito à mão | `aviso`, `confirmarSeparacao`, `criarCasoDoAtendimento`, `criarCasoDoRecurso`, `criarCronogramaINSS` +16 |
| 1668 | `guardarRascunho()` | o rascunho do andamento (por caso, só nesta sessão do navegador) ────── Guardar no sessionStorage e não no D: | comentário acima | `fecharEsc` |
| 1673 | `lerRascunho()` | Recupera o rascunho do andamento desta sessão do navegador. | escrito à mão | `fecharEsc` |
| 1676 | `limparRascunho()` | Apaga o rascunho depois que o andamento foi registrado. | escrito à mão | `novoAndamento` |
| 1679 | `aviso()` | O toast do rodapé. | escrito à mão | `abrirAnexo`, `abrirDecisao`, `abrirExplorer`, `abrirFicha`, `abrirTodasNovidades` +162 |
| 1687 | `api() async` | O único caminho até o Supabase: monta cabeçalho, trata 401 e devolve JSON. | escrito à mão | `abrirConversa`, `addNaLista`, `adiarLembrete`, `alternarMarcador`, `alternarMeuDia` +117 |
| 1720 | `subirArquivo() async` | Envia um arquivo para o Storage do Supabase. | escrito à mão | `anexar`, `mandarArquivoZap` |
| 1730 | `linkArquivo() async` | linkArquivo(caminho, segundos=120) | assinatura | `abrirAnexo`, `abrirDecisao`, `verMidiaZap` |
| 1735 | `abrirAnexo() async` | Abre um anexo do processo numa aba nova. | escrito à mão | `HTML inline` |
| 1744 | `todas() async` | Busca paginada — é ela que evita o corte silencioso em 1000 linhas do PostgREST. | escrito à mão | `abrirConversa`, `abrirFicha`, `alternarMeuDia`, `carregar`, `conferirPje` +6 |
| 1755 | `renovar() async` | Renova o token do Supabase antes de ele expirar. | escrito à mão | `api`, `blocoCadunico`, `digitando` |
| 1772 | `erroLogin()` | login ───────────────────────────────────────────────────────────────── A tela de login precisa DIZER o que houve. | comentário acima | `entrar`, `iniciar` |
| 1777 | `entrar() async` | Login por e-mail e senha no Supabase Auth. | escrito à mão | `digitando` |
| 1819 | `pedirConfig()` | abrir a caixa de configuração a qualquer momento, não só no primeiro acesso | comentário acima | `HTML inline` |
| 1824 | `sair()` | Encerra a sessão e limpa o guardado. | escrito à mão | `api`, `digitando` |
| 1829 | `iniciar() async` | O arranque: confere a sessão guardada e decide entre login e app. | escrito à mão | `digitando`, `entrar` |
| 1863 | `patchCaso()` | Ajuste do ESCRITÓRIO, não do navegador de cada um: | comentário acima | `alternarArquivo`, `alternarMarcador`, `aplicarPje`, `aplicarPjeProc`, `casoViraLembrete` +37 |
| 1870 | `tarefaNaMemoria()` | TODA tarefa criada em tela entra na memória NA HORA — gravar no banco e só aparecer no Meu Dia depois do F5 fazia a tarefa recém-criada "sumir" das listas (cria | comentário acima | `correnteConferencia`, `criar`, `enviarEncaminhamento`, `fecharTarefa`, `novoAndamento` +2 |
| 1875 | `cfgApp()` | function cfgApp(chave){ return (D.config//new Map()).get(chave); } | o próprio corpo | `abrirSmbot`, `avisoCRPS`, `blocoRevisao`, `estadoCRPS`, `estadoPonte` +6 |
| 1876 | `guardarCfgApp() async` | guardarCfgApp(chave, valor) | assinatura | `cfgSalva`, `ignorarProcessoPje`, `ignorarProtocolo`, `limparIgnoradosPat`, `limparIgnoradosPje` |
| 1883 | `carregar() async` | A carga inicial: traz colaboradores, clientes, casos e o resto para o D global. | escrito à mão | `addNaLista`, `aplicarPje`, `aplicarPjeProc`, `confirmarSeparacao`, `criarCasoDoRecurso` +6 |
| 2008 | `fundoDaLista()` | fundoDaLista(v) | assinatura | `abrirFundos`, `aplicarTema` |
| 2012 | `aplicarTema()` | como no Microsoft To Do: cada lista pinta o fundo da área de trabalho | comentário dentro | `render` |
| 2039 | `ativos()` | chip de prazo estilo semáforo 🚦 | comentário dentro | `blocoRevisao`, `blocoSemAcao`, `casosDaFase`, `dataDe`, `lim` +8 |
| 2041 | `chipPrazo()` | chip de prazo estilo semáforo 🚦 | comentário acima | `cartaoTarefa`, `kcardCaso` |
| 2046 | `diasAte()` | function diasAte(iso){ return Math.ceil((new Date(iso+"T12:00:00")-new Date(hoje()+"T12:00:00"))/864e5); } | o próprio corpo | `blocoCadunico`, `blocoFatos`, `caixaCadunico`, `chipDcb`, `chipExig` |
| 2047 | `chipExig()` | chipExig(k) | assinatura | `blocoFatos`, `kcardCaso`, `ultimo` |
| 2053 | `preencher()` | preenche um modelo de mensagem com os dados do cliente/evento | comentário acima | `copiarMsgExigencia`, `lembreteDoEvento`, `mandarArquivoZap`, `painelMensagensFicha` |
| 2061 | `modeloPor()` | link "criar evento" do Google Agenda (sem precisar de conexão/conta Google no app) | comentário dentro | `copiarMsgExigencia`, `lembreteDoEvento` |
| 2063 | `gcal()` | link "criar evento" do Google Agenda (sem precisar de conexão/conta Google no app) | comentário acima | `agendarAtendimento`, `criarCliente`, `painelPericiasFicha` |
| 2066 | `g()` | const g=d=>d.toLocaleDateString("sv").replace(/-/g,"")+"T"+d.toTimeString().slice(0,8).replace(/:/g,""); | o próprio corpo | `ela mesma` |
| 2073 | `listaDe()` | lista "efetiva" do caso: um mover pedido no app vale na hora, mesmo antes de o To Do acompanhar (escrever_todo faz o mover físico) | comentário acima | `blocoFatos`, `cartaoCliente`, `casosDaFase`, `escolherProcessoParaMover`, `item` +6 |
| 2078 | `clientesEmAtendimento()` | 🙋 ESCRITÓRIO NÃO É LISTA DE CASOS (08.99, pedido do Paulo). | comentário acima | `render`, `soTexto` |
| 2085 | `ultimaAnotacao()` | Tarefas com Prazo é a LISTA FIXA do To Do (não "tudo que tem data") — | comentário dentro | `clientesEmAtendimento` |
| 2088 | `casosDaFase()` | Tarefas com Prazo é a LISTA FIXA do To Do (não "tudo que tem data") — | comentário dentro | `render`, `soTexto` |
| 2101 | `fecharMenuMover()` | function fecharMenuMover(){ const m=document.getElementById("menu-mover"); if(m) m.remove(); } | o próprio corpo | `HTML inline`, `fase`, `menuMover`, `moverCaso` |
| 2102 | `menuMover()` | menuMover(ev, cliId) | assinatura | `ligarCartoes` |
| 2132 | `alternarMeuDia() async` | Meu Dia: liga e desliga. | comentário acima | `HTML inline` |
| 2149 | `moverCaso() async` | moverCaso(casoId, lista) | assinatura | `menuMover` |
| 2151 | `fase()` | const fase=(LISTAS_MOVER.find(([l])=>l===lista)//[])[1]; | o próprio corpo | `separarRecursos` |
| 2163 | `quantosNoMeuDia()` | o número do ☀️ na barra, como o To Do mostra: | comentário acima | `montarSidebar` |
| 2166 | `tfHoje()` | const tfHoje = k => (D.tarefasPorCaso.get(k.id)//[]).some(t=>t.lembrar_em===hoje()); | o próprio corpo | `ela mesma` |
| 2215 | `svgIc()` | título da lista (espec. 6.1): sempre azul-escuro, com o ícone SVG da lista | comentário dentro | `rotu`, `sinoSvg`, `tituloLista` |
| 2222 | `tituloLista()` | título da lista (espec. 6.1): | comentário acima | `render`, `renderAcervo`, `renderAgenda`, `renderCalendario`, `renderClaude` +16 |
| 2230 | `montarSidebar()` | Desenha a barra da esquerda inteira: listas, contadores, visões e o rodapé. | escrito à mão | `addNaLista`, `adiarLembrete`, `alternarMeuDia`, `apagarRotina`, `aplicarPje` +49 |
| 2249 | `rotu()` | rótulo = "☀️ Meu Dia" -> ícone + texto separados (o texto some no menu recolhido) ícone e texto em CÉLULAS SEPARADAS. | comentário acima | `soTexto`, `tfHoje` |
| 2255 | `soTexto()` | o nome sem o emoji: é ele que o leitor de tela anuncia e que a etiqueta do menu recolhido mostra | comentário acima | `ela mesma` |
| 2281 | `sinoSvg()` | sinoSvg = on => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" st | assinatura | `ela mesma` |
| 2330 | `etiquetaMenu()` | etiquetaMenu(el) | assinatura | `seguirEtiqueta`, `sinoSvg` |
| 2345 | `seguirEtiqueta()` | rolar o trilho com o mouse parado não pode apagar a etiqueta: | comentário acima | **ninguém** |
| 2346 | `esconderEtiqueta()` | ── o e-Recursos (CRPS), traduzido ──────────────────────────────────────── | comentário dentro | `aplicarMenu`, `sinoSvg` |
| 2357 | `CRPS()` | o e-Recursos (CRPS), traduzido ──────────────────────────────────────── Cópia de robo-crps/traduzir.js + comentarioDoEvento de ingerir.js, os dois com teste pró | comentário acima | `copiarCasoCompleto`, `salvarManualNovidade` |
| 2368 | `semAcento()` | alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake). | comentário dentro | `dataSessao`, `situacaoDe`, `traduzirEvento`, `traduzirProcesso` |
| 2374 | `limpar()` | alguns nomes de arquivo/eventos vêm com UTF-8 estragado (mojibake). | comentário acima | `sufDestino`, `traduzirEvento`, `traduzirProcesso` |
| 2390 | `orgaoJulgador()` | QUEM julgou — e, portanto, em que instância o recurso está. | comentário acima | `caixaResumo`, `comentarioDoEvento`, `orgaoCurto`, `orgaoDoAcordao` |
| 2424 | `orgaoDoAcordao()` | orgaoDoAcordao(texto) | assinatura | **ninguém** |
| 2434 | `orgaoCurto()` | a versão curta, para caber no fim da linha do andamento ("(25ª Junta)") | comentário acima | `sufDestino`, `sufOrgao` |
| 2441 | `dataSessao()` | data da sessão embutida no texto ("... | comentário acima | `ela mesma` |
| 2526 | `sufOrgao()` | "... - Acórdão: | comentário acima | `dataSessao` |
| 2528 | `sufDestino()` | "Encaminhamento - ([nº removido] para 25ª JR)" → " à 25ª Junta" | comentário acima | `dataSessao` |
| 2537 | `ehArquivoDeDecisao()` | o nome do arquivo diz se ele é o que DECIDE — é por ele que o coletor sabe o que vale a pena baixar (acórdão e decisão monocrática, não o acervo todo) | comentário acima | `traduzirEvento` |
| 2540 | `traduzirEvento()` | traduz UM evento cru {status, data, documentos} → objeto de andamento | comentário acima | `rerotular` |
| 2566 | `dataParaISO()` | converte "DD/MM/AAAA HH:MM:SS" → ISO, para ordenar/comparar | comentário acima | `chaveEvento`, `comentarioDoEvento`, `planoCrps`, `traduzirProcesso` |
| 2578 | `traduzirProcesso()` | traduz o processo INTEIRO (o JSON que a API devolve) para o bloco casos.crps | comentário acima | `planoCrps` |
| 2599 | `chaveEvento()` | dá a "impressão digital" de um evento, para o robô saber o que é NOVO entre uma varredura e outra (data + status cru bastam) | comentário acima | `marca`, `planoCrps` |
| 2605 | `rerotular()` | Corrigimos uma REGRA e o rótulo errado já está gravado na ficha. | comentário acima | **ninguém** |
| 2621 | `comentarioDoEvento()` | comentarioDoEvento(e) | assinatura | `planoCrps` |
| 2635 | `semSufixo()` | semSufixo(s) | assinatura | `comentarioDoEvento` |
| 2725 | `limpo()` | const limpo = s => String(s // '').trim().toUpperCase(); | o próprio corpo | `especieDe`, `juntar`, `resumoDoDetalhe`, `situacaoDe` |
| 2729 | `situacaoDe()` | const situacaoDe = s => SITUACOES[semAcento(limpo(s)).replace(/\s+/g, '_')] | o próprio corpo | `resumoDaLista`, `resumoDoDetalhe` |
| 2732 | `especieDe()` | a sigla diz o TIPO e os marcadores; o código do INSS, quando vem, tem a | comentário dentro | `resumoDoDetalhe` |
| 2761 | `dataIso()` | dataIso(br) | assinatura | `juntar` |
| 2768 | `eventosDe()` | eventosDe(det) | assinatura | `resumoDoDetalhe` |
| 2770 | `juntar()` | juntar = (lista, tipo) => (Array.isArray(lista) ? lista : []).map(a => ( | assinatura | `ela mesma`, `sugestoes` |
| 2782 | `comentariosDe()` | sem `id` do portal, a chave é data+texto. Descartar o comentário | comentário dentro | `resumoDoDetalhe` |
| 2799 | `resumoDaLista()` | resumoDaLista(t) | assinatura | `normalizarColeta` |
| 2813 | `resumoDoDetalhe()` | resumoDoDetalhe(d) | assinatura | `normalizarColeta` |
| 2865 | `digitos()` | const digitos = s => String(s // '').replace(/\D/g, ''); | o próprio corpo | `indexar`, `planoDeImportacao`, `protocolosDe` |
| 2867 | `protocolosDe()` | protocolosDe(k) | assinatura | `indexar` |
| 2873 | `indexar()` | indexar(D) | assinatura | `planoDeImportacao` |
| 2885 | `casosParecidos()` | casosParecidos(D, clienteId, lista, especie) | assinatura | `casoParecido`, `planoDeImportacao` |
| 2890 | `casoParecido()` | SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho | comentário dentro | **ninguém** |
| 2892 | `tituloDoCaso()` | SEPARAR O ÓBVIO DO DUVIDOSO. Sessenta e cinco decisões na mão é trabalho | comentário dentro | `planoDeImportacao` |
| 2905 | `palavrasDoBeneficio()` | palavrasDoBeneficio(t) | assinatura | `mesmoBeneficio` |
| 2912 | `mesmoBeneficio()` | duas palavras significativas em comum, ou tudo o que o nome mais curto tem | comentário acima | `porQueParecido` |
| 2919 | `porQueParecido()` | Recurso e revisão NÃO têm benefício próprio: o nome que veio do portal é | comentário dentro | `planoDeImportacao` |
| 2940 | `mudancasDoCaso()` | O que muda num caso que JÁ existe. | comentário acima | `planoDeImportacao` |
| 2954 | `eventosNovos()` | eventosNovos(det, jaTem, hoje) | assinatura | `planoDeImportacao` |
| 2963 | `andamentoDaMudanca()` | andamentoDaMudanca(k, det) | assinatura | `planoDeImportacao` |
| 2981 | `limparHtmlPat()` | limparHtmlPat(t) | assinatura | `comentariosNovos`, `fatosDoCasoTodo`, `linhaNovidade`, `painelINSS` |
| 2990 | `comentariosNovos()` | comentariosNovos(det, jaTem) | assinatura | `planoDeImportacao` |
| 3003 | `planoDeImportacao()` | planoDeImportacao(pat, D, hoje) | assinatura | `montarPlanoPat` |
| 3071 | `porTipo()` | const porTipo = l => l.reduce((m, x) => (m[x.tipo] = (m[x.tipo] // 0) + 1, m), {}); | o próprio corpo | `ela mesma` |
| 3090 | `conferirPlanoPat()` | conferirPlanoPat(pat, plano) | assinatura | `montarPlanoPat` |
| 3113 | `normalizarColeta()` | A COLETA DA EXTENSÃO CHEGA CRUA. | comentário acima | `ligarImportarPat`, `usarColeta` |
| 3124 | `buscarColetas() async` | buscarColetas() | assinatura | `aplicarPje`, `aplicarPjeProc`, `descartarColetasVelhas`, `renderImportarPat`, `so` +1 |
| 3134 | `coletasPorFonte()` | SÓ A MAIS NOVA DE CADA PORTAL INTERESSA. | comentário acima | `cx`, `descartarColetasVelhas` |
| 3144 | `descartarColetasVelhas() async` | sai da fila sem sumir do banco: fica com data de aplicação, como as usadas | comentário dentro | `HTML inline` |
| 3153 | `usarColeta() async` | usarColeta(id) | assinatura | `cx` |
| 3170 | `montarPlanoPat() async` | O "JÁ ESTÁ NA FICHA" TEM DE VIR DO BANCO NA HORA DE CONFERIR. | comentário acima | `ligarImportarPat`, `usarColeta` |
| 3185 | `patIgnorados()` | patIgnorados() | assinatura | `cx`, `ignorarProtocolo`, `montarPlanoPat` |
| 3190 | `ignorarProtocolo() async` | ignorarProtocolo(protocolo) | assinatura | `HTML inline` |
| 3204 | `limparIgnoradosPat() async` | limparIgnoradosPat() | assinatura | `HTML inline` |
| 3210 | `renderImportarPat()` | Tela de importação do PAT/INSS. | escrito à mão | `render` |
| 3234 | `telaImportarPat()` | telaImportarPat() | assinatura | `renderImportarPat` |
| 3236 | `cx()` | const cx = n => `<div class="id-card"><strong style="font-size:20px">${n[1]}</strong> | o próprio corpo | **ninguém** |
| 3392 | `ligarImportarPat()` | ligarImportarPat() | assinatura | `renderImportarPat` |
| 3403 | `aplicarPat() async` | erro FORA do laço (dado com forma inesperada, por exemplo) não pode sumir | comentário dentro | `HTML inline` |
| 3411 | `aplicarPatDeVerdade() async` | UM ERRO NÃO PODE PARAR O LOTE. A primeira versão abortava no primeiro | comentário dentro | `aplicarPat` |
| 3417 | `tentar() async` | const tentar = async (rotulo, f) => { try{ await f(); feitos++; } | o próprio corpo | `aplicarCrps`, `ela mesma`, `so` |
| 3479 | `criarMesmoAssim() async` | os possíveis duplicados só entram quando você manda, um por um | comentário acima | `HTML inline` |
| 3502 | `juntarProvaveis() async` | juntar o protocolo do PAT a um caso que já existe — o caminho certo quando o caso é o mesmo e só faltava o número anotado JUNTAR EM LOTE, SÓ OS PROVÁVEIS. | comentário acima | `HTML inline` |
| 3516 | `juntarUm() async` | o miolo de juntar, sem aviso nem redesenho: | comentário acima | `juntarAoCaso`, `juntarProvaveis` |
| 3535 | `juntarAoCaso() async` | juntarAoCaso(protocolo) | assinatura | `HTML inline` |
| 3558 | `cartaoCliente()` | A linha do cliente na lista: nome, CPF, prazo com semáforo, perícia e os botões de ação. | escrito à mão | `blocoRevisao`, `blocoSemAcao`, `dataDe`, `render`, `renderParcerias` +1 |
| 3603 | `em15()` | como no To Do: o nome em cima, e embaixo — miúdo e cinza — a data. | comentário acima | **ninguém** |
| 3654 | `diaDaSemana()` | diaDaSemana(iso) | assinatura | `dia` |
| 3658 | `dataRelativa()` | maisDias() pula para o próximo dia ÚTIL — na sexta, "amanhã" viraria | comentário dentro | `cx`, `em15`, `renderNovidades` |
| 3662 | `dia()` | maisDias() pula para o próximo dia ÚTIL — na sexta, "amanhã" viraria segunda e a etiqueta mentiria. | comentário acima | `ela mesma`, `tCol` |
| 3675 | `emExigencia()` | EM EXIGÊNCIA POR DOIS CAMINHOS. | comentário acima | `render` |
| 3678 | `grupoClientes()` | grupoClientes(casosSel) | assinatura | `blocoRevisao`, `blocoSemAcao`, `dataDe`, `render`, `renderParcerias` +1 |
| 3695 | `ligarCartoes()` | Liga o clique, o menu do botão direito e o arraste em cada cartão da lista. | escrito à mão | `dataDe`, `render`, `renderAcervo`, `renderParcerias`, `tCol` |
| 3730 | `render()` | O despachante da coluna do meio: decide qual tela desenhar a partir de `visao` e da busca. | escrito à mão | `HTML inline`, `addNaLista`, `adiarLembrete`, `alternarMeuDia`, `apagarRotina` +51 |
| 3859 | `renderMeuDia()` | Tela ☀️ Meu Dia. | escrito à mão | `render` |
| 3871 | `doColab()` | const doColab = k => !filtroColab // (D.atrDoCaso.get(k.id)//[]).includes(filtroColab); | o próprio corpo | `tfDo` |
| 3872 | `tfDo()` | const tfDo = (k, teste) => (D.tarefasPorCaso.get(k.id)//[]) | o próprio corpo | `ela mesma` |
| 3878 | `tCol()` | const tCol = t => !filtroColab // t.particular_de===filtroColab // !t.particular_de; | o próprio corpo | **ninguém** |
| 3923 | `planoCrps()` | aplicar a coleta do e-Recursos ──────────────────────────────────────── A extensão entrega o que o portal respondeu, cru. | comentário acima | `planoCrpsComMemoria` |
| 3970 | `conferirPje() async` | conferirPje(coletaId) | assinatura | `criarCasoPjeParaCliente`, `cx`, `ignorarProcessoPje`, `limparIgnoradosPje`, `vincularPjeNoCaso` +1 |
| 4055 | `nomesBatemPje()` | casamento TOLERANTE de nome: | comentário acima | `conferirPje` |
| 4056 | `T()` | const T = s => dsa(s).split(/\s+/).filter(t=>t && !["da","de","do","das","dos","e"].includes(t)); | o próprio corpo | `ela mesma` |
| 4066 | `linkPje()` | o endereço dos autos digitais que o próprio acervo carrega (id + chave ca) — é o "abrir no PJe" das Novidades e da ficha, aberto na sessão logada | comentário acima | `conferirPje`, `criarCasoPjeParaCliente`, `vincularPjeNoCaso` |
| 4072 | `clienteDasPartes()` | o lado da parte que não é órgão público = o cliente | comentário acima | `conferirPje`, `escolherCasoPje` |
| 4074 | `ehOrgao()` | const ehOrgao = s=>/INSS/INSTITUTO NACIONAL/UNI[AÃ]O/FAZENDA/CHEFE D/CAIXA ECON/GERENTE/i.test(s); | o próprio corpo | `ela mesma` |
| 4082 | `vincularPjeNoCaso() async` | o vínculo em si, usado pela sugestão automática E pela escolha à mão: | comentário acima | `vincularEscolhidoPje`, `vincularProcessoPje` |
| 4099 | `vincularProcessoPje() async` | vincularProcessoPje(numero) | assinatura | `HTML inline` |
| 4109 | `criarCasoPjeParaCliente() async` | caso Judicial novo já com o número — o caminho do SEGUNDO processo do mesmo cliente (nada de pendurar dois processos numa ficha só) e o da escolha à mão quando  | comentário acima | `criarCasoEscolhidoPje`, `criarCasoPje` |
| 4133 | `criarCasoPje() async` | criarCasoPje(numero) | assinatura | `HTML inline` |
| 4145 | `escolherCasoPje()` | a ESCOLHA À MÃO ────────────────────────────────────────────────────── O casamento automático por nome só age quando bate com UM cliente — e o print do Paulo mo | comentário acima | `HTML inline` |
| 4160 | `filtrarEscolhaPje()` | filtrarEscolhaPje(numero) | assinatura | `HTML inline`, `escolherCasoPje` |
| 4179 | `vincularEscolhidoPje() async` | vincularEscolhidoPje(numero, casoId) | assinatura | `HTML inline` |
| 4188 | `criarCasoEscolhidoPje() async` | criarCasoEscolhidoPje(numero, cliId) | assinatura | `HTML inline` |
| 4195 | `vincularTodosPje() async` | vincularTodosPje() | assinatura | `HTML inline` |
| 4211 | `pjeIgnorados()` | pjeIgnorados() | assinatura | `conferirPje`, `cx`, `ignorarProcessoPje` |
| 4216 | `ignorarProcessoPje() async` | ignorarProcessoPje(numero) | assinatura | `HTML inline` |
| 4222 | `limparIgnoradosPje() async` | limparIgnoradosPje() | assinatura | `HTML inline` |
| 4230 | `momentosPje()` | o MOMENTO de cada andamento do PJe já gravado (processo:dataThora), venha ele do acervo (mov:) ou do histórico completo (hist:) — é o que impede as duas fontes  | comentário acima | `conferirPje`, `conferirPjeProc` |
| 4238 | `hashDjb()` | ── ⚖️ o PROCESSO COMPLETO (coleta 'pje-processo') ─────────────────────── | comentário dentro | `conferirPjeProc` |
| 4248 | `conferirPjeProc() async` | conferirPjeProc(coletaId) | assinatura | `cx` |
| 4287 | `aplicarPjeProc() async` | aplicarPjeProc(coletaId) | assinatura | `HTML inline` |
| 4325 | `aplicarPje() async` | completa as fichas (classe/ajuizamento) antes dos movimentos; banco sem | comentário dentro | `HTML inline` |
| 4370 | `planoCrpsComMemoria() async` | O PLANO COM A MEMÓRIA COMPLETA — usado pelo conferir E pelo aplicar. | comentário acima | `aplicarCrps`, `conferirCrps` |
| 4376 | `conferirCrps() async` | conferirCrps(coletaId) | assinatura | `cx` |
| 4399 | `fundirBlocoCrps()` | RECOLHER NÃO PODE APAGAR O QUE FOI ACRESCENTADO. | comentário acima | `so` |
| 4401 | `marca()` | const marca = a => String(a.id // a.nome // ""); | o próprio corpo | `ela mesma` |
| 4424 | `aplicarCrps() async` | aplicarCrps(coletaId) | assinatura | `HTML inline` |
| 4436 | `so()` | const so = x => String(x//"").replace(/\D/g,""); | o próprio corpo | `acharArquivoCrps`, `blocoDe`, `ela mesma`, `formatarNup`, `nupsDoCaso` +1 |
| 4471 | `recadoDeFalhas()` | O QUE DIZER QUANDO A GRAVAÇÃO FALHA. | comentário acima | `juntarProvaveis`, `so`, `tentar` |
| 4490 | `caixaEncaminhar()` | caixaEncaminhar(a) | assinatura | **ninguém** |
| 4519 | `sugestoesDoTexto()` | as frases que quase sempre servem, pelo que o andamento diz. | comentário acima | `caixaEncaminhar` |
| 4546 | `semMarcador()` | marcar frases numa anotação ─────────────────────────────────────────── Pedir duas coisas de uma vez é o caso comum — "pede o PPP" E "avisa o cliente". | comentário acima | `pintarSugestoes` |
| 4547 | `emItens()` | emItens(linhas) | assinatura | `alternarFrase` |
| 4551 | `alternarFrase()` | alternarFrase(inp, frase, conhecidas) | assinatura | `inserirPreenchida`, `ligarEncaminhar`, `usarSugestao` |
| 4566 | `ligarEncaminhar()` | ligarEncaminhar() | assinatura | `render`, `renderNovidades` |
| 4593 | `enviarEncaminhamento() async` | enviarEncaminhamento(andId) | assinatura | `ligarEncaminhar` |
| 4640 | `novidades()` | os links das novidades não lidas, um por destino (o mesmo cliente com três | comentário dentro | `blocoNovidadesTopo`, `linksDasNovidades`, `montarSidebar`, `periciasEmLote`, `renderNovidades` |
| 4641 | `euLi()` | os links das novidades não lidas, um por destino (o mesmo cliente com três | comentário dentro | `ela mesma`, `lidosDe` |
| 4646 | `linksDasNovidades()` | os links das novidades não lidas, um por destino (o mesmo cliente com três avisos abre UMA aba): | comentário acima | `abrirTodasNovidades`, `renderNovidades` |
| 4666 | `abrirERecursos()` | 💬 SMBOT AO LADO DO NOME (pedido do Paulo): | comentário acima | `HTML inline` |
| 4674 | `abrirSmbot()` | abrirSmbot(cliId) | assinatura | `HTML inline` |
| 4683 | `abrirTodasNovidades()` | o costume do Paulo: viu a atualização, abre o processo. | comentário acima | **ninguém** |
| 4700 | `eventoNoTexto()` | 📌 DAR SEGUIMENTO ───────────────────────────────────────────────────── O andamento que chega de fora (INSS, Recurso, CNJ, PJe) pede um de três destinos: | comentário acima | `abrirSeguimento`, `aplicarPericia`, `linhaNovidade`, `periciasEmLote`, `renderNovidades` |
| 4721 | `diasUteisAntes()` | diasUteisAntes(iso, n) | assinatura | `HTML inline`, `abrirSeguimento`, `criar`, `salvarSeguimento` |
| 4727 | `evJaAgendado()` | os itens registrados nos renders (o texto pode ter aspas e acento — | comentário dentro | `abrirSeguimento`, `aplicarPericia`, `renderNovidades`, `salvarSeguimento` |
| 4735 | `segRegistrar()` | segRegistrar(casoId, texto, andId, deNovidade) | assinatura | `blocoRecurso`, `caixaPje`, `linhaNovidade`, `painelCNJ`, `painelINSS` +1 |
| 4739 | `segBtnHtml()` | const segBtnHtml = i => `<button class="btn-mini" onclick="abrirSeguimento(${i})" | o próprio corpo | `blocoRecurso`, `caixaPje`, `linhaNovidade`, `painelCNJ`, `painelINSS` +1 |
| 4743 | `abrirSeguimento()` | abrirSeguimento(i) | assinatura | `HTML inline` |
| 4785 | `salvarSeguimento() async` | salvarSeguimento() | assinatura | `HTML inline` |
| 4839 | `aplicarPericia() async` | a aplicação em UM clique (e em lote, nas Novidades): | comentário acima | `periciaRapida`, `periciasEmLote` |
| 4851 | `criar() async` | DOIS lembretes por perícia (pedido do Paulo): | comentário acima | `cx`, `ela mesma` |
| 4867 | `periciaRapida() async` | periciaRapida(i) | assinatura | `HTML inline` |
| 4874 | `periciasEmLote() async` | periciasEmLote() | assinatura | **ninguém** |
| 4889 | `blocoNovidadesTopo()` | as primeiras novidades, para caber no topo de outra lista sem tomar conta | comentário acima | `render` |
| 4901 | `linhaNovidade()` | uma linha da caixa de entrada, usada na lista 📣 e no topo do ⭐ | comentário acima | `blocoNovidadesTopo` |
| 4924 | `renderNovidades()` | Tela 📰 Novidades dos portais. | escrito à mão | `render` |
| 4966 | `liNaFicha() async` | liNaFicha(id) | assinatura | `HTML inline` |
| 4972 | `marcarLidas() async` | marcarLidas(ids) | assinatura | `HTML inline`, `enviarEncaminhamento`, `liNaFicha`, `render`, `renderNovidades` +1 |
| 4993 | `renderAcervo()` | Tela 📚 Acervo. | escrito à mão | `render` |
| 5005 | `quantosNoAcervo()` | quantos esperam ali — o mesmo critério dos dois blocos, sem montar a tela | comentário acima | `montarSidebar` |
| 5007 | `lim()` | const lim = (()=>{ const d=new Date(hoje()+"T12:00:00"); | o próprio corpo | **ninguém** |
| 5017 | `renderPlanejado()` | Tela 🗓 Planejado. | escrito à mão | `render` |
| 5022 | `em()` | a "data" de um caso no Planejado é a mais próxima entre o prazo do caso | comentário dentro | `HTML inline`, `dataDe`, `rot` |
| 5025 | `dataDe()` | a "data" de um caso no Planejado é a mais próxima entre o prazo do caso e as tarefas de comentário — e o filtro por pessoa olha a tarefa DELA | comentário acima | `ela mesma` |
| 5069 | `cartaoTarefa()` | Minhas Tarefas (particulares) ───────────────────────────────────────── | comentário acima | `tCol` |
| 5078 | `ligarTarefas()` | ligarTarefas() | assinatura | `renderParticulares`, `tCol` |
| 5089 | `renderParticulares()` | Tela 📋 Minhas Tarefas. | escrito à mão | `render` |
| 5106 | `novaTarefa() async` | "renovar OAB amanhã" / "ligar dia 15" -> data extraída do texto (estilo Todoist) | comentário dentro | `HTML inline` |
| 5120 | `renderNovoCliente()` | Tela ＋ Novo cliente. | escrito à mão | `render` |
| 5151 | `avisoCpfRepetido()` | CPF que já está no sistema não vira cliente novo: | comentário acima | `addNaLista`, `criarCliente` |
| 5181 | `mostrarIdadeNovo()` | a idade aparece já no cadastro: | comentário acima | `HTML inline` |
| 5187 | `criarCliente() async` | criarCliente() | assinatura | `HTML inline` |
| 5231 | `renderClaude()` | Tela 🤖 Claude (sugestões). | escrito à mão | `render` |
| 5249 | `decidirSugestao() async` | decidirSugestao(id, status) | assinatura | `HTML inline` |
| 5271 | `renderMencoes()` | Tela @ Menções. | escrito à mão | `render` |
| 5289 | `lerMencao() async` | lerMencao(id) | assinatura | `HTML inline` |
| 5295 | `criarMencoes() async` | criarMencoes(texto, casoId, andamentoId, extras) | assinatura | `novoAndamento` |
| 5309 | `renderModelosDoc()` | Tela 📄 Modelos de documento. | escrito à mão | `novoModeloDoc`, `render`, `salvarModeloDoc` |
| 5327 | `editarModeloDoc()` | editarModeloDoc(id) | assinatura | `HTML inline` |
| 5333 | `salvarModeloDoc() async` | salvarModeloDoc(id) | assinatura | `HTML inline` |
| 5340 | `novoModeloDoc() async` | novoModeloDoc() | assinatura | `HTML inline` |
| 5352 | `kcardCaso()` | kcardCaso(k) | assinatura | **ninguém** |
| 5359 | `renderQuadro()` | Tela 📌 Quadro (kanban por fase). | escrito à mão | `ligarQuadro`, `render` |
| 5373 | `ligarQuadro()` | ligarQuadro() | assinatura | `renderQuadro` |
| 5398 | `quandoFalou()` | "hoje 09:12" vale mais que a data cheia num cartão de funil: | comentário acima | `cartaoConversa`, `renderVendas` |
| 5405 | `renderVendas()` | Tela 💼 Vendas. | escrito à mão | `ela mesma`, `novoLead`, `render` |
| 5455 | `novoLead() async` | novoLead() | assinatura | `HTML inline` |
| 5464 | `leadParaCliente() async` | leadParaCliente(leadId) | assinatura | `HTML inline` |
| 5493 | `pararZapTimer()` | function pararZapTimer(){ if(zapTimer){ clearInterval(zapTimer); zapTimer=null; } } | o próprio corpo | `renderWhats` |
| 5495 | `renderWhats() async` | Tela 💬 WhatsApp. | escrito à mão | `render` |
| 5511 | `recarregarZap() async` | recarregarZap(silencioso) | assinatura | `renderWhats`, `transferirConversa` |
| 5529 | `estadoPonte()` | 2 minutos sem bater ponto: a ponte morreu, e é melhor dizer isso do que | comentário dentro | `enviarZap`, `meu`, `renderConfig` |
| 5540 | `pintarListaZap()` | pintarListaZap() | assinatura | `HTML inline`, `abrirConversa`, `mudarConversa`, `recarregarZap` |
| 5541 | `meu()` | const meu = c => c.atendente_id===eu.id; | o próprio corpo | `ela mesma` |
| 5567 | `avatarZap()` | avatarZap(c) | assinatura | `cartaoConversa`, `pintarConversa` |
| 5573 | `assinarFotosZap() async` | assinarFotosZap(cs) | assinatura | `recarregarZap` |
| 5584 | `nomeDaConversa()` | nomeDaConversa(c) | assinatura | `avatarZap`, `cartaoConversa`, `msgDocumentos`, `pintarConversa` |
| 5591 | `cartaoConversa()` | cartaoConversa(c) | assinatura | `meu` |
| 5607 | `telaVaziaZap()` | const telaVaziaZap = () => | o próprio corpo | `recarregarZap` |
| 5612 | `abrirConversa() async` | abrirConversa(id) | assinatura | `HTML inline`, `descartarRascunho`, `enviarZap`, `mandarArquivoZap`, `recarregarZap` +1 |
| 5624 | `recarregarMsgs() async` | recarregarMsgs() | assinatura | `recarregarZap` |
| 5633 | `atualizarVistos()` | só os selos de entrega mudaram: | comentário acima | `recarregarMsgs` |
| 5639 | `seloZap()` | const seloZap = m => m.direcao==="saida" ? (SELO[m.status]//"") : ""; | o próprio corpo | `atualizarVistos`, `bolhaZap` |
| 5641 | `pintarConversa()` | pintarConversa() | assinatura | `abrirConversa`, `alternarNota`, `mudarConversa`, `recarregarMsgs` |
| 5680 | `bolhaZap()` | bolhaZap(m, cli) | assinatura | `pintarConversa` |
| 5713 | `soltarRascunho() async` | Rascunho é aviso automático que a regra mandou conferir antes. | comentário acima | `HTML inline` |
| 5719 | `descartarRascunho() async` | descartarRascunho(id) | assinatura | `HTML inline` |
| 5726 | `alternarNota()` | alternarNota() | assinatura | `HTML inline` |
| 5734 | `verMidiaZap() async` | verMidiaZap(id) | assinatura | `HTML inline` |
| 5742 | `enviarZap() async` | nota interna nasce com direcao E status 'interna' — o banco recusa | comentário dentro | `HTML inline`, `pintarConversa` |
| 5766 | `tipoDoArquivo()` | O tipo importa: foto tem de chegar como FOTO, não como arquivo para baixar. | comentário acima | `mandarArquivoZap` |
| 5773 | `mandarArquivoZap() async` | mandarArquivoZap() | assinatura | `HTML inline` |
| 5798 | `preencheZap()` | Preenche um modelo com quem está DO OUTRO LADO da conversa. | comentário acima | `frasesZap` |
| 5817 | `frasesZap()` | frasesZap() | assinatura | `HTML inline` |
| 5849 | `msgDocumentos()` | A lista sai numerada e sem juridiquês: | comentário acima | `frasesZap` |
| 5860 | `mudarConversa() async` | mudarConversa(campos) | assinatura | `alternarBot`, `assumirConversa`, `resolverConversa` |
| 5867 | `assumirConversa()` | const assumirConversa = () => mudarConversa({atendente_id:eu.id, bot_ativo:false}); | o próprio corpo | `HTML inline` |
| 5868 | `alternarBot()` | const alternarBot = () => { const c=zapConvs.find(x=>x.id===zapAberta); | o próprio corpo | `HTML inline` |
| 5870 | `resolverConversa()` | const resolverConversa = () => { const c=zapConvs.find(x=>x.id===zapAberta); | o próprio corpo | `HTML inline` |
| 5873 | `transferirConversa() async` | transferirConversa() | assinatura | `HTML inline` |
| 5894 | `virarAndamento() async` | A mensagem NÃO vira andamento sozinha: | comentário acima | `HTML inline` |
| 5900 | `gravar() async` | gravar = async casoId | assinatura | `HTML inline`, `ela mesma` |
| 5915 | `ajudaQR()` | O código do QR é a credencial da sessão. Mandá-lo para um gerador de | comentário dentro | `HTML inline` |
| 5939 | `finalDoNB()` | 💰 Quando o benefício cai na conta ──────────────────────────────────── O final é o último algarismo do NB ANTES do traço: | comentário acima | `blocoPagamentoINSS`, `pagamentosDoNB` |
| 5945 | `pagamentosDoNB()` | próximos N pagamentos daquele final, a partir de hoje | comentário acima | `blocoPagamentoINSS` |
| 5956 | `ultimaCompetencia()` | até onde a tabela cadastrada alcança — passou disso, ninguém chuta data. | comentário acima | `blocoPagamentoINSS` |
| 5957 | `ultimoPagamento()` | const ultimoPagamento   = () => (D.inssCal//[]).reduce((m,x)=>x.pagamento>m?x.pagamento:m,""); | o próprio corpo | `blocoPagamentoINSS` |
| 5958 | `mesPorExtenso()` | const mesPorExtenso = iso => new Date(iso+"T12:00:00") | o próprio corpo | `blocoPagamentoINSS` |
| 5961 | `blocoPagamentoINSS()` | blocoPagamentoINSS(k) | assinatura | **ninguém** |
| 5988 | `salvarFaixaRenda() async` | salvarFaixaRenda(casoId, acima) | assinatura | `HTML inline` |
| 6004 | `renderConfig() async` | Tela ⚙️ Configurações. | escrito à mão | `cfgSalva`, `render` |
| 6150 | `estadoCRPS()` | estado do robô do CRPS, lido do config (nunca o crачhá em si) | comentário acima | `manual`, `renderConfig` |
| 6162 | `ligarConfig()` | quem atende | comentário dentro | `renderConfig` |
| 6163 | `guarda()` | quem atende | comentário dentro | `cfgSalva`, `ela mesma`, `linha` |
| 6189 | `cfgSalva()` | horário e interruptores | comentário acima | `ela mesma` |
| 6220 | `linha()` | avisos e passos do robô — a chave é o id, então dá para tratar igual | comentário acima | `ela mesma`, `menuMover`, `painelINSS`, `renderDocCatalogo` |
| 6240 | `renderMarketing()` | Tela 📣 Marketing. | escrito à mão | `render` |
| 6272 | `renderAgenda()` | Tela 🩺 Agenda de perícias. | escrito à mão | `render` |
| 6278 | `bloco()` | bloco=e | assinatura | **ninguém** |
| 6316 | `mesAtual()` | function mesAtual(){ return calMes // hoje().slice(0,7); } | o próprio corpo | `ordena` |
| 6317 | `itensDoCalendario()` | itensDoCalendario() | assinatura | `renderCalendario` |
| 6319 | `push()` | const push=(dia,tipo,texto,cliId,extra)=>{ if(dia) it.push({dia,tipo,texto,cliId,...extra}); }; | o próprio corpo | `addNaLista`, `alternarFrase`, `alternarMarcador`, `aplicarChecklistCaso`, `aplicarCrps` +70 |
| 6364 | `irVisaoCal()` | "Hoje" é a âncora: volta o mês para o corrente, senão trocar para Mês | comentário dentro | `HTML inline` |
| 6371 | `filtrarCal()` | function filtrarCal(t){ calFiltro = (calFiltro===t) ? null : t; render(); } | o próprio corpo | `HTML inline` |
| 6372 | `itemCal()` | itemCal(i) | assinatura | **ninguém** |
| 6378 | `renderCalendario()` | Tela 📅 Calendário. | escrito à mão | `render` |
| 6384 | `ordena()` | const ordena=a=>a.sort((x,y)=>(x.hora//"99")<(y.hora//"99")?-1:1); | o próprio corpo | `vizinho` |
| 6400 | `vizinho()` | const vizinho=n=>{ const d=new Date(ano, mm-1+n, 1, 12); | o próprio corpo | `HTML inline` |
| 6457 | `irMes()` | ── escolher o fundo da lista ───────────────────────────────────────────── | comentário dentro | `HTML inline` |
| 6463 | `abrirFundos()` | escolher o fundo da lista ───────────────────────────────────────────── O To Do deixa cada lista com a sua cara. | comentário acima | **ninguém** |
| 6490 | `salvarFundo() async` | salvarFundo(chave, valor) | assinatura | `HTML inline`, `subirFundo` |
| 6503 | `subirFundo() async` | subirFundo(chave) | assinatura | `HTML inline` |
| 6524 | `ligarArrasteCartoes()` | ligarArrasteCartoes() | assinatura | `ligarCartoes` |
| 6537 | `ligarArrasteListas()` | as listas do escritório podem ser reordenadas entre si | comentário dentro | `sinoSvg` |
| 6567 | `soltarClienteNaLista() async` | solta o cliente numa lista: | comentário acima | `ligarArrasteListas` |
| 6577 | `lista()` | const lista=(LISTAS_MOVER.find(([,f])=>f===fase)//[])[0]; | o próprio corpo | `criarCasoDoRecurso`, `menuMover`, `render`, `svgIc` |
| 6583 | `escolherProcessoParaMover()` | escolherProcessoParaMover(cliId, ks, fase) | assinatura | `soltarClienteNaLista` |
| 6602 | `moverProcessoSolto() async` | moverProcessoSolto(casoId, fase) | assinatura | `HTML inline` |
| 6612 | `ordemDasFases()` | ordem das listas do escritório: | comentário acima | `reordenarListas`, `soTexto` |
| 6613 | `pos()` | const pos = v => { const p=(D.prefPorLista//new Map()).get("fase:"+v); | o próprio corpo | `ela mesma` |
| 6617 | `reordenarListas() async` | reordenarListas(origem, destino) | assinatura | `ligarArrasteListas` |
| 6639 | `mostrarAddRodape()` | ＋ Adicionar, fixo no pé da lista ───────────────────────────────────── No To Do é assim que quase toda tarefa nasce: | comentário acima | `render` |
| 6650 | `addNaLista() async` | addNaLista() | assinatura | `digitando` |
| 6680 | `renderParcerias()` | Tela 🤝 Parcerias. | escrito à mão | `render` |
| 6696 | `barras()` | barras(pares) | assinatura | `renderDash` |
| 6700 | `renderDash()` | Tela 📊 Painel de números. | escrito à mão | `render` |
| 6746 | `lidosDe()` | quem já leu o comentário ("visto" da equipe) ────────────────────────── Cinza = ninguém confirmou ainda. | comentário acima | `ela mesma`, `marcarLido`, `vistos` |
| 6750 | `horaLocal()` | hora sempre no fuso de Franca: | comentário acima | `vistos` |
| 6759 | `tarefasDe()` | uma marca por pessoa: quem TEM tarefa neste comentário aparece com o | comentário dentro | `vistos` |
| 6760 | `vistos()` | uma marca por pessoa: quem TEM tarefa neste comentário aparece com o | comentário dentro | `comentario`, `marcarLido` |
| 6793 | `novaTarefaComentario()` | novaTarefaComentario(andId, casoId) | assinatura | `HTML inline` |
| 6809 | `ntToggle()` | function ntToggle(id){ ntSel = ntSel.includes(id) ? ntSel.filter(x=>x!==id) : [...ntSel, id]; } | o próprio corpo | `HTML inline` |
| 6810 | `ntDia()` | ntDia(d, el) | assinatura | `HTML inline` |
| 6815 | `ntSalvar() async` | ntSalvar(andId, casoId) | assinatura | `HTML inline` |
| 6841 | `ctRepetir()` | ctRepetir(d, el) | assinatura | `HTML inline` |
| 6846 | `concluirTarefa()` | concluirTarefa(id) | assinatura | `HTML inline` |
| 6869 | `fecharTarefa() async` | fecharTarefa(id) | assinatura | `HTML inline` |
| 6912 | `adiarTarefa()` | adiarTarefa(id) | assinatura | `HTML inline` |
| 6921 | `mudarLembrar() async` | mudarLembrar(id, data) | assinatura | `HTML inline` |
| 6932 | `marcarLido() async` | marcarLido(andId, jaLi) | assinatura | `HTML inline` |
| 6965 | `rotinaVenceHoje()` | rotinaVenceHoje(r, iso) | assinatura | `renderRotinas`, `rotinasDoDia` |
| 6974 | `rotinaFeitaHoje()` | rotinaFeitaHoje(r) | assinatura | `blocoRotinas` |
| 6977 | `quandoRotina()` | quandoRotina(r) | assinatura | `blocoRotinas`, `renderRotinas` |
| 6984 | `rotinasDoDia()` | rotinasDoDia() | assinatura | `blocoRotinas` |
| 6989 | `blocoRotinas()` | blocoRotinas() | assinatura | `tCol` |
| 7008 | `marcarRotina() async` | marcarRotina(id, jaFeita) | assinatura | `HTML inline` |
| 7026 | `renderRotinas()` | Tela 🔁 Rotinas internas. | escrito à mão | `render` |
| 7072 | `novaRotina() async` | novaRotina() | assinatura | `HTML inline` |
| 7088 | `apagarRotina() async` | apagarRotina(id) | assinatura | `HTML inline` |
| 7100 | `escolherProcesso()` | qual processo? ──────────────────────────────────────────────────────── Cliente com mais de um processo em aberto: | comentário acima | `pintarFicha` |
| 7102 | `ultimo()` | ultimo = k | assinatura | `ela mesma` |
| 7125 | `escolhido()` | escolhido(cliId, casoId) | assinatura | `HTML inline` |
| 7132 | `caixa()` | Abre o modal genérico com o HTML recebido. | escrito à mão | `abrirSeguimento`, `adiarTarefa`, `ajudaQR`, `anotacaoViraAndamento`, `concluirTarefa` +12 |
| 7140 | `fecharCaixa()` | fecharCaixa() | assinatura | `HTML inline`, `confirmarSeparacao`, `criarCasoEscolhidoPje`, `digitando`, `fecharTarefa` +14 |
| 7144 | `fecharEscolha()` | fecharEscolha() | assinatura | `HTML inline`, `moverProcessoSolto` |
| 7150 | `abrirFicha() async` | Abre a ficha de um cliente: busca as 6 consultas do cliente e manda pintar. | escrito à mão | `HTML inline`, `adiarLembrete`, `alternarArquivo`, `alternarMarcador`, `anexar` +80 |
| 7195 | `repintarFicha()` | Repinta a ficha SEM voltar à rede — é o que troca de aba e de sub-aba. | escrito à mão | `HTML inline`, `agendarAtendimento`, `criarCliente`, `escolhido`, `irAba` +7 |
| 7199 | `pintarFicha()` | Desenha a ficha do cliente inteira — cabeçalho, menu de abas e o painel da aba ativa. | escrito à mão | `abrirFicha`, `fecharEsc`, `painelConsulta`, `painelPagamentosFicha`, `painelPericiasFicha` +1 |
| 7317 | `rot()` | a etiqueta da aba diz o estado sem abrir: | comentário acima | `HTML inline`, `trilhaCaso` |
| 7383 | `crescer()` | Enter registra; Shift+Enter pula linha. | comentário acima | `HTML inline`, `fecharEsc` |
| 7398 | `abrirEsc()` | no celular o composer aberto come 190px do rodapé: quem estava | comentário dentro | **ninguém** |
| 7411 | `fecharEsc()` | as caixas que a barra abriu vão junto: sozinhas na tela, sem o botão | comentário dentro | **ninguém** |
| 7518 | `painelCadastroFicha()` | Aba Cadastro: monta o sub-menu e chama a divisão escolhida. | escrito à mão | `pintarFicha` |
| 7610 | `irSubCad()` | Troca a divisão do Cadastro e repinta. | escrito à mão | `HTML inline` |
| 7614 | `catalogoNoCadastro()` | Divisão Documentos: o catálogo de documentos por benefício (era a aba 8). | escrito à mão | `painelCadastroFicha` |
| 7639 | `painelConsulta()` | Divisão Consulta: o site interno do escritório embutido num iframe. | escrito à mão | `painelCadastroFicha` |
| 7650 | `painelPericiasFicha()` | Aba Perícias: a agenda de perícias e audiências do cliente. | escrito à mão | `rot` |
| 7685 | `vinculoDaParcela()` | aba 4 da ficha — extraída da pintarFicha (era um literal de 50 linhas) DE QUE BENEFÍCIO É ESTE DINHEIRO. | comentário acima | `painelPagamentosFicha` |
| 7702 | `vincularPgto() async` | vincularPgto(pgId, casoId) | assinatura | `HTML inline` |
| 7717 | `painelPagamentosFicha()` | Aba Honorários: parcelas do cliente, com a corrente de conferência. | escrito à mão | `rot` |
| 7782 | `painelMensagensFicha()` | Divisão Mensagens: modelos de mensagem prontos para o cliente. | escrito à mão | `painelCadastroFicha` |
| 7809 | `irAba()` | muda a aba ativa da ficha por código (ex.: | comentário acima | **ninguém** |
| 7812 | `fecharMenuProcessos()` | pop-up "⚖️ Processos": escolher o processo certo sem errar o destino | comentário acima | `item`, `menuProcessos` |
| 7814 | `menuCasosDoCliente()` | o mesmo menu, aberto pelo nome/avatar do cliente no topo da ficha | comentário acima | `HTML inline` |
| 7820 | `processosDe()` | Caso em fase de PAGAMENTO não é mais um processo em andamento: | comentário acima | `menuProcessos`, `pintarFicha`, `preencheZap`, `virarAndamento` |
| 7821 | `menuProcessos()` | a linha diz EM QUE LISTA o caso está (com o emoji do To Do — "👪 | comentário dentro | `HTML inline`, `menuCasosDoCliente` |
| 7828 | `item()` | a linha diz EM QUE LISTA o caso está (com o emoji do To Do — "👪 Judicial", "🙏 Aposentadorias Futuras"): | comentário acima | `alternarMarcador`, `solicitarDocsCatalogo` |
| 7852 | `novoVinculo() async` | vínculos entre clientes (parentes/amigos — o antigo checklist do To Do) | comentário acima | `HTML inline` |
| 7864 | `removerVinculo() async` | removerVinculo(vid) | assinatura | `HTML inline` |
| 7870 | `nomeDaEspecie()` | identidade didática do caso: | comentário acima | `editarFato`, `tituloCaso` |
| 7880 | `beneficioGenerico()` | O benefício é só outro jeito de escrever a espécie? Três formas reais: | comentário acima | `editarFato` |
| 7889 | `tituloCaso()` | decisão do Paulo (13.08): a ESPÉCIE define o título, sempre — nome | comentário dentro | `HTML inline`, `blocoFatos`, `casoViraLembrete`, `catalogoNoCadastro`, `conferirPje` +17 |
| 7901 | `consultaPendente()` | trilha completa em botões — inclui 💰 Pagamentos e ✔ Encerrado; | comentário acima | `painelCNJ` |
| 7921 | `inssFilaCaso()` | Régua da fila do INSS (casos.inss_fila, do inss_fila.py mensal): | comentário acima | `painelCNJ` |
| 7934 | `copiarInssFila()` | copiarInssFila(casoId) | assinatura | `HTML inline` |
| 7936 | `dbr()` | const dbr=i=>i?`${i.slice(8,10)}/${i.slice(5,7)}/${i.slice(0,4)}`:""; | o próprio corpo | `copiarDatajud`, `copiarMarco`, `copiarTrf3`, `ela mesma` |
| 7946 | `tituloOrgao()` | Andamento oficial na base pública do CNJ (casos.datajud, do datajud.py diário) | comentário acima | `blocoFatos`, `blocoRecurso`, `copiarCrps`, `copiarDatajud`, `datajudCaso` +1 |
| 7956 | `irSubAba()` | Troca a sub-aba da aba Casos e repinta. | escrito à mão | `HTML inline` |
| 7970 | `dataDoTexto()` | dataDoTexto(txt) | assinatura | `pintarPrazoDoTexto` |
| 7980 | `iso()` | const iso = d => d.toLocaleDateString("sv"); | o próprio corpo | `ela mesma` |
| 8008 | `sugestoes()` | Sugestões de texto: as frases prontas da equipe + os motivos do Lembrar. | comentário acima | `pintarSugestoes`, `usarSugestao` |
| 8058 | `alternarSugestoes()` | alternarSugestoes(casoId) | assinatura | `HTML inline` |
| 8068 | `pintarSugestoes()` | filtradas enquanto digita (aí aparecem sozinhas, como autocompletar); | comentário acima | `alternarSugestoes`, `fecharEsc`, `usarSugestao` |
| 8096 | `tfEscolherData()` | o campo de data só aparece quando é pedido — a barra fica limpa até lá | comentário acima | `HTML inline` |
| 8104 | `pintarPrazoDoTexto()` | enquanto digita: mostra a data que o sistema entendeu, para confirmar | comentário acima | `HTML inline`, `fecharEsc`, `usarSugestao` |
| 8116 | `usarSugestao()` | usarSugestao(el, k) | assinatura | `HTML inline` |
| 8145 | `dnIso()` | dn é DDMMAAAA (formato do To Do); | comentário acima | `caixaApos`, `dataIdadeApos`, `editarCampo`, `idadeDe` |
| 8151 | `somarAnos()` | 29/02 em ano não bissexto cai no dia 1º de março; puxar para 28/02 | comentário dentro | `dataIdadeApos`, `renovaCadunico` |
| 8158 | `menosMeses()` | menosMeses(iso, meses) | assinatura | `avisoApos` |
| 8167 | `diaUtilAntes()` | lembrete em fim de semana não é lembrete: | comentário acima | `avisoApos` |
| 8175 | `avisoApos()` | a data do aviso de uma aposentadoria: | comentário acima | `caixaApos`, `lembretesApos`, `salvarApos` |
| 8177 | `idadeDe()` | idade completa hoje, para mostrar junto do nascimento | comentário acima | `ehLoasIdoso`, `fichaIdentificacao`, `mostrarIdadeNovo` |
| 8217 | `_limpaLista()` | const _limpaLista = st => new Set([...st].filter(n=>!n.endsWith("-nao"))); | o próprio corpo | `ela mesma` |
| 8219 | `palpiteSexo()` | palpiteSexo(nome) | assinatura | `sexoDe` |
| 8241 | `sexoDe()` | Quem é o sexo deste cliente: | comentário acima | `aposAutomatica`, `caixaApos`, `dataIdadeApos` |
| 8248 | `dataIdadeApos()` | dataIdadeApos(cli) | assinatura | `aposAutomatica`, `caixaApos`, `idadeJaPassou` |
| 8254 | `idadeJaPassou()` | true quando a idade já tinha chegado antes do corte: | comentário acima | `caixaApos` |
| 8258 | `aposAutomatica()` | quem JÁ é aposentado não tem aposentadoria "provável": a Marcia (tempo | comentário dentro | `aposDoCliente`, `lembretesApos` |
| 8268 | `aposDoCliente()` | as gravadas + a automática, salvo quando já existe uma "Idade" à mão | comentário acima | `caixaApos`, `painelLembretes` |
| 8279 | `lembretesApos()` | todos os lembretes de aposentadoria do escritório, para a agenda. | comentário acima | `blocoApos`, `push` |
| 8298 | `lembrarApos() async` | adiar o aviso. Na automática ainda não há linha no banco: | comentário acima | `HTML inline` |
| 8319 | `blocoApos()` | no Meu Dia: o aviso que já chegou a hora. | comentário acima | `tCol` |
| 8351 | `ehLoas()` | ehLoas(k){ return /loas/bpc/assistencial/amparo social/i.test( | assinatura | `ehLoasIdoso` |
| 8353 | `ehLoasIdoso()` | ehLoasIdoso(k, cli) | assinatura | `blocoCadunico`, `caixaCadunico`, `push` |
| 8358 | `renovaCadunico()` | renovaCadunico(k) | assinatura | `blocoCadunico`, `caixaCadunico`, `msgCadunico`, `push`, `salvarCadunico` |
| 8361 | `msgCadunico()` | msgCadunico(cli, k) | assinatura | `blocoCadunico`, `caixaCadunico`, `copiarMsgCadunico` |
| 8371 | `caixaCadunico()` | caixaCadunico(k, cli) | assinatura | `painelEscritorio` |
| 8395 | `salvarCadunico() async` | salvarCadunico(casoId, valor) | assinatura | `HTML inline` |
| 8405 | `copiarMsgCadunico()` | copiarMsgCadunico(cliId, casoId) | assinatura | `HTML inline` |
| 8415 | `ultimoZap()` | Último toque pelo WhatsApp ──────────────────────────────────────────── O webhook do SMBot avisa QUE a pessoa falou, não o que ela disse — o conteúdo fica no pa | comentário acima | `fichaIdentificacao` |
| 8428 | `blocoRevisao()` | Esteira de revisão: nenhum processo fica 90 dias sem um olhar ───────── A mineração das fichas mostrou mediana de 114 dias sem registro. | comentário acima | `renderAcervo` |
| 8446 | `marcarRevisado() async` | marcarRevisado(ids) | assinatura | `renderAcervo`, `tCol` |
| 8466 | `avisoCRPS()` | A rede por baixo da rede: | comentário acima | `tCol` |
| 8472 | `blocoSemAcao()` | blocoSemAcao() | assinatura | `renderAcervo` |
| 8488 | `blocoCrpsManual()` | no Meu Dia: os recursos que o robô não enxerga e alguém tem de abrir no site. | comentário acima | `tCol` |
| 8527 | `blocoCadunico()` | no Meu Dia: CadÚnico vencido ou vencendo nos próximos 90 dias, de todos os clientes — inclusive dos casos já encerrados | comentário acima | `tCol` |
| 8576 | `lembretesDo()` | lembretesDo(cliId) | assinatura | `painelLembretes`, `pintarFicha` |
| 8579 | `rotuloTipoLembrete()` | rotuloTipoLembrete(t) | assinatura | `blocoLembretes`, `painelLembretes` |
| 8582 | `msgLembrete()` | msgLembrete(l, c) | assinatura | `HTML inline`, `zapAvisoLembrete` |
| 8586 | `cat()` | const cat=(GPS_CATEGORIAS.find(([cod])=>cod===d.codigo)//[])[1]//""; | o próprio corpo | **ninguém** |
| 8596 | `painelLembretes()` | Aba Lembretes: aposentadoria provável, lembretes ativos e o formulário do lembrete novo. | escrito à mão | `rot` |
| 8672 | `criarLembrete() async` | criarLembrete(cliId) | assinatura | `HTML inline` |
| 8673 | `v()` | const v=id=>{const e=document.getElementById(id);return e?e.value.trim():"";}; | o próprio corpo | `criarCronogramaINSS`, `ela mesma` |
| 8688 | `lembreteAvisado() async` | lembreteAvisado(id, canal) | assinatura | `HTML inline`, `zapAvisoLembrete` |
| 8703 | `zapAvisoLembrete()` | zapAvisoLembrete(id) | assinatura | `HTML inline` |
| 8709 | `adiarLembrete() async` | adiarLembrete(id, data) | assinatura | `HTML inline` |
| 8718 | `desligarLembrete() async` | desligarLembrete(id) | assinatura | `HTML inline` |
| 8733 | `anotacaoViraAndamento()` | anotação do To Do (🙏 Aposentadorias Futuras) -> andamento de um caso ── A análise é MANUAL de propósito: | comentário acima | `HTML inline` |
| 8744 | `salvarAnotacaoNoCaso() async` | salvarAnotacaoNoCaso(lembId, i, casoId) | assinatura | `HTML inline`, `anotacaoViraAndamento` |
| 8764 | `blocoLembretes()` | no Meu Dia: os lembretes que venceram, prontos para despachar dali mesmo | comentário acima | `tCol` |
| 8785 | `casoViraLembrete() async` | migração combinada com o Paulo: | comentário acima | `HTML inline` |
| 8811 | `caixaApos()` | caixaApos(cli) | assinatura | `painelLembretes` |
| 8873 | `marcarAposentado() async` | marcar à mão: 1 = já se aposentou, 0 = não, null = voltar à dúvida | comentário acima | `HTML inline` |
| 8890 | `novaApos()` | novaApos(cliId, data, especie) | assinatura | `HTML inline` |
| 8901 | `salvarApos() async` | salvarApos(cliId) | assinatura | `HTML inline` |
| 8911 | `apagarApos() async` | apagarApos(id) | assinatura | `HTML inline` |
| 8917 | `definirSexo() async` | definirSexo(cliId, sexo) | assinatura | `HTML inline` |
| 8936 | `editarCampo()` | editarCampo(campo, cliId) | assinatura | `HTML inline` |
| 8953 | `salvarCampo() async` | salvarCampo(campo, cliId) | assinatura | `HTML inline` |
| 8981 | `reindexarCliente()` | o índice da pesquisa guarda nome, CPF e telefone: | comentário acima | `criarCasoDoAtendimento`, `salvarCampo`, `salvarTelefones` |
| 8989 | `trocarSenha() async` | trocar a senha do Meu INSS: | comentário acima | `HTML inline` |
| 9004 | `nomeSeguro()` | nomeSeguro(n) | assinatura | `anexar`, `mandarArquivoZap`, `subirFundo` |
| 9007 | `anexar() async` | anexar(casoId, cliId) | assinatura | `HTML inline` |
| 9031 | `apagarAnexo() async` | apagarAnexo(id) | assinatura | `HTML inline` |
| 9040 | `tamArq()` | const tamArq = n => n==null ? "" : n>=1048576 ? (n/1048576).toFixed(1).replace(".",",")+" MB" | o próprio corpo | `caixaArquivos` |
| 9042 | `caixaArquivos()` | caixaArquivos(k) | assinatura | `painelEscritorio` |
| 9102 | `ehAcidentario()` | o retrato do processo judicial: é Mandado de Segurança? corre no JEF ou | comentário dentro | `blocoFatos` |
| 9108 | `dadosJudiciais()` | o retrato do processo judicial: | comentário acima | `blocoFatos` |
| 9125 | `recorrerAte()` | prazo de recurso: 30 dias da decisão (o escritório adota a data em que ela foi proferida como a da ciência). | comentário acima | `blocoFatos`, `push` |
| 9130 | `campoFato()` | campoFato(k, campo) | assinatura | `blocoFatos` |
| 9217 | `doCatalogo()` | doCatalogo(especie) | assinatura | `linhaMarcadores` |
| 9223 | `marcadoresDe()` | a ordem é a do catálogo, não a de clique: assim "Rural + Especial" é | comentário dentro | `alternar`, `alternarMarcador`, `avisoPedidoIgual`, `docsDosMarcadores`, `linhaMarcadores` +3 |
| 9239 | `alternar()` | alternar(k, slug) | assinatura | `alternarMarcador` |
| 9246 | `rotuloDoPedido()` | rotuloDoPedido(k) | assinatura | `carregar`, `reindexarCliente` |
| 9253 | `docsDosMarcadores()` | docsDosMarcadores(k, jaTem = []) | assinatura | `alternarMarcador` |
| 9270 | `dicaDoMarcador()` | dicaDoMarcador(slug, especie) | assinatura | `linhaMarcadores` |
| 9277 | `pedidosIguais()` | pedidosIguais(a, b) | assinatura | `avisoPedidoIgual` |
| 9289 | `linhaMarcadores()` | A linha que responde "o que estou pedindo aqui?" sem abrir nada. | comentário acima | `blocoFatos` |
| 9315 | `especieJaDiz()` | Nem toda espécie tem o que marcar. | comentário acima | `linhaMarcadores` |
| 9316 | `nome()` | const nome = (ESPECIES.find(([c])=>c===String(k.especie//"").toUpperCase())//[])[1]; | o próprio corpo | `frasesZap`, `pintarFicha` |
| 9326 | `avisoPedidoIgual()` | O mesmo cliente PODE ter dois pedidos da mesma espécie: | comentário acima | `linhaMarcadores` |
| 9334 | `alternarMarcador() async` | alternarMarcador(casoId, slug) | assinatura | `HTML inline` |
| 9372 | `blocoFatos()` | O cartão de fatos do processo, no topo da aba Casos. | escrito à mão | `rot` |
| 9500 | `somaMeses()` | (o 🔁 por caso da 08.55 durou um dia: | comentário acima | `casoViraLembrete`, `lembreteAvisado` |
| 9506 | `editarFato()` | edição no lugar: o lápis vira campo, salva ao sair e volta a ser texto | comentário acima | `HTML inline` |
| 9550 | `novoProtocolo() async` | novoProtocolo(casoId) | assinatura | `HTML inline` |
| 9560 | `painelEscritorio()` | Sub-aba Andamentos do Escritório: a linha do tempo escrita pela equipe. | escrito à mão | `rot` |
| 9633 | `comentario()` | a linha do tempo do escritório ──────────────────────────────────────── A conclusão de uma tarefa nasce como RESPOSTA do comentário que a pediu (andamentos.resp | comentário acima | `li` |
| 9640 | `linhaDoTempo()` | linhaDoTempo(ands) | assinatura | `painelEscritorio` |
| 9651 | `li()` | li = a | assinatura | **ninguém** |
| 9668 | `ehComentarioPat()` | 🌻 Andamentos INSS (PAT/Meu INSS) ──────────────────────────────────── Os comentários que aparecem no processo dentro do site do INSS, coletados pela extensão e  | comentário acima | `fatosDoCasoTodo`, `painelEscritorio` |
| 9671 | `comentariosPat()` | Os movimentos coletados do PJe pela extensão (origem='pje') são andamento | comentário dentro | `HTML inline`, `painelINSS` |
| 9677 | `andamentosPje()` | Os movimentos coletados do PJe pela extensão (origem='pje') são andamento OFICIAL do processo judicial: | comentário acima | `HTML inline`, `pintarFicha`, `pjeDoProcesso` |
| 9689 | `arqInfo()` | 🗄 arquivar POR PROCESSO ───────────────────────────────────────────── Arquivado não é do caso, é de cada processo: | comentário acima | `HTML inline`, `abaCnjArquivada`, `abaCrpsArquivada`, `abaPatArquivada`, `seloArquivo` |
| 9690 | `chaveCnj()` | as instâncias do CNJ como o painel mostra — helper único para o painel e | comentário dentro | `HTML inline`, `abaCnjArquivada`, `painelCNJ` |
| 9695 | `cnjInstancias()` | as instâncias do CNJ como o painel mostra — helper único para o painel e para a etiqueta da aba não divergirem | comentário acima | `abaCnjArquivada`, `fatosDoCasoTodo`, `painelCNJ` |
| 9701 | `abaPatArquivada()` | function abaPatArquivada(k){ return !!arqInfo(k,"pat"); } | o próprio corpo | `HTML inline` |
| 9702 | `abaCrpsArquivada()` | abaCrpsArquivada(k) | assinatura | `HTML inline` |
| 9706 | `abaCnjArquivada()` | abaCnjArquivada(k) | assinatura | `HTML inline` |
| 9710 | `alternarArquivo() async` | alternarArquivo(casoId, chave) | assinatura | `HTML inline` |
| 9723 | `seloArquivo()` | o selo + o botão, no canto direito do quadro do processo | comentário acima | `blocoRecurso`, `painelCNJ`, `painelINSS` |
| 9737 | `painelINSS()` | Sub-aba Andamentos INSS: o que o robô do PAT trouxe. | escrito à mão | `rot` |
| 9794 | `qSP()` | timestamp -> "AAAA-MM-DDTHH:MM" DE BRASÍLIA: | comentário acima | `fatosDoCasoTodo` |
| 9795 | `fatosDoCasoTodo()` | fatosDoCasoTodo(k, ands) | assinatura | `copiarCasoCompleto`, `painelTudo` |
| 9832 | `painelTudo()` | Sub-aba Caso completo: todas as fontes numa linha do tempo só. | escrito à mão | `rot` |
| 9861 | `copiarCasoCompleto()` | copiarCasoCompleto(casoId) | assinatura | `HTML inline` |
| 9880 | `crpsNups()` | 🖥 Recurso administrativo no CRPS (e-Recursos). | comentário acima | `abrirERecursos`, `avisoJuntos`, `criarCasoDoRecurso`, `painelCRPS`, `perguntarNovoCaso` +2 |
| 9887 | `crpsBlocos()` | crpsBlocos(k) | assinatura | `abaCrpsArquivada`, `acharArquivoCrps`, `blocoCrpsManual`, `blocoDoNup`, `copiarCrps` +7 |
| 9890 | `crpsTotalEventos()` | o que merece negrito no recurso: só o que DECIDE — acórdão e decisão | comentário dentro | `HTML inline` |
| 9899 | `decideOCaso()` | o que merece negrito no recurso: | comentário acima | `blocoRecurso`, `fatosDoCasoTodo` |
| 9907 | `caixaResumo()` | o quadro de UM recurso: apresentado como os andamentos do escritório — mesma zebra, mesma coluna de data à esquerda o resumo do que a decisão decidiu — o resumi | comentário acima | `blocoRecurso` |
| 9934 | `orgaoDaDecisao()` | QUEM julgou. A Junta de Recursos é a 1ª instância do CRPS: | comentário acima | `seloOrgao` |
| 9943 | `seloOrgao()` | seloOrgao(e, a) | assinatura | `blocoRecurso` |
| 9954 | `acharArquivoCrps()` | acha o arquivo dentro do bloco do recurso — os dois lados (ficha e resumidor) casam pelo mesmo par (nup, id do arquivo) | comentário acima | `conferirResumo`, `editarResumo`, `salvarResumo` |
| 9968 | `toggleImpCrps() async` | destacar a movimentação acende também o ⭐ do processo — é ele que faz o caso pular para a frente nas listas. | comentário acima | `HTML inline` |
| 9983 | `gravarCrps() async` | conferir é a diferença entre "a máquina achou" e "o escritório assinou" | comentário dentro | `conferirResumo`, `crpsAutomatico`, `crpsManual`, `manualSemNovidade`, `salvarManualAjuste` +3 |
| 9988 | `conferirResumo() async` | conferir é a diferença entre "a máquina achou" e "o escritório assinou" | comentário acima | `HTML inline` |
| 9999 | `editarResumo()` | corrigido à mão vira "curado": | comentário acima | `HTML inline` |
| 10010 | `salvarResumo() async` | salvarResumo(casoId, nup, marca) | assinatura | `HTML inline` |
| 10022 | `blocoRecurso()` | a decisão mais recente manda na Situação: é a instância em que o caso | comentário dentro | `manual` |
| 10078 | `painelCRPS()` | Sub-aba Recurso (CRPS): sessões e decisões do Conselho, por recurso. | escrito à mão | `rot` |
| 10080 | `manual()` | gerência dos números: lista com remover + campo para acrescentar | comentário dentro | `ela mesma` |
| 10137 | `nupsDoCaso()` | nupsDoCaso(k) | assinatura | `conferirPlano`, `planoCrps`, `planoDeSeparacao`, `t` |
| 10144 | `blocosDoCaso()` | blocosDoCaso(k) | assinatura | `conferirPlano`, `planoDeSeparacao`, `so`, `t` |
| 10147 | `formatarNup()` | formatarNup(d) | assinatura | `HTML inline`, `abrirERecursos`, `conferirPlano`, `confirmarSeparacao`, `criarCasoDoRecurso` +3 |
| 10152 | `tituloDoRecurso()` | tituloDoRecurso(k, nup, i) | assinatura | `blocoDe`, `criarCasoDoRecurso` |
| 10156 | `planoDeSeparacao()` | planoDeSeparacao(k) | assinatura | `confirmarSeparacao`, `separarRecursos` |
| 10160 | `blocoDe()` | const blocoDe = n => blocos.find(b => so(b.nup) === n) // null; | o próprio corpo | `ela mesma` |
| 10179 | `conferirPlano()` | conferirPlano(k, plano) | assinatura | `confirmarSeparacao`, `separarRecursos` |
| 10199 | `avisoJuntos()` | um caso para cada recurso ───────────────────────────────────────────── Cada recurso administrativo tem protocolo próprio, prazo próprio e decisão própria. | comentário acima | `manual` |
| 10210 | `separarRecursos()` | separarRecursos(casoId) | assinatura | `HTML inline` |
| 10233 | `confirmarSeparacao() async` | confirmarSeparacao(casoId) | assinatura | `HTML inline` |
| 10279 | `soDig()` | recurso de consulta manual ──────────────────────────────────────────── O e-Recursos só devolve o que está ligado ao CPF do procurador. | comentário acima | `HTML inline`, `abaCrpsArquivada`, `acrescentarProcesso`, `alternarNossoProcesso`, `blocoDoNup` +16 |
| 10280 | `quadroManual()` | quadroManual(b, k) | assinatura | `manual` |
| 10310 | `maisDiasISO()` | maisDiasISO(iso, dias) | assinatura | `manualSemNovidade`, `salvarManualNovidade` |
| 10314 | `blocoDoNup()` | blocoDoNup(k, nup) | assinatura | `crpsAutomatico`, `crpsManual`, `manualAjustar`, `manualSemNovidade`, `salvarManualAjuste` +1 |
| 10317 | `crpsManual() async` | crpsManual(casoId, nup) | assinatura | `HTML inline` |
| 10330 | `crpsAutomatico() async` | crpsAutomatico(casoId, nup) | assinatura | `HTML inline` |
| 10341 | `manualSemNovidade() async` | O botão que troca vinte anotações "não houve andamento" por uma linha só. | comentário acima | `HTML inline` |
| 10356 | `manualComNovidade()` | manualComNovidade(casoId, nup) | assinatura | `HTML inline` |
| 10368 | `salvarManualNovidade() async` | salvarManualNovidade(casoId, nup) | assinatura | `HTML inline` |
| 10390 | `manualAjustar()` | manualAjustar(casoId, nup) | assinatura | `HTML inline`, `crpsManual` |
| 10410 | `salvarManualAjuste() async` | salvarManualAjuste(casoId, nup) | assinatura | `HTML inline` |
| 10425 | `abrirDecisao() async` | abre a cópia do acórdão que mora no CRM (link assinado, curto) | comentário acima | `HTML inline` |
| 10434 | `copiarCrps()` | monta uma mensagem curta e clara para o cliente com a situação do(s) recurso(s) | comentário acima | `HTML inline` |
| 10449 | `salvarCrpsNup() async` | Um recurso por caso. Quando o caso já tem um número, o segundo NÃO entra junto: | comentário acima | `HTML inline` |
| 10466 | `perguntarNovoCaso()` | perguntarNovoCaso(k, nup) | assinatura | `salvarCrpsNup` |
| 10486 | `criarCasoDoRecurso() async` | criarCasoDoRecurso(k, nup) | assinatura | `salvarCrpsNup` |
| 10506 | `removerCrpsNup() async` | tira um número da lista (e o resultado dele, se já tinha sido consultado) | comentário acima | `HTML inline` |
| 10518 | `caixaPje()` | o quadro dos movimentos que a extensão colheu no painel do PJe — andamento oficial tanto quanto o DataJud, só que mais fresco (chega na hora da coleta) | comentário acima | `painelCNJ` |
| 10537 | `processosDoCaso()` | UM CASO, VÁRIOS PROCESSOS ──────────────────────────────────────────── O caso tem um ponto de partida (protocolo/NB) e dali ramifica: | comentário acima | `acrescentarProcesso`, `alternarNossoProcesso`, `gerenciaProcessos`, `painelCNJ`, `removerProcesso` |
| 10539 | `norm()` | const norm = p => (typeof p === "string" ? {numero:p} : {...p}); | o próprio corpo | **ninguém** |
| 10554 | `datajudDe()` | o andamento oficial daquele número: | comentário acima | `painelCNJ`, `rotuloProcesso` |
| 10560 | `rotuloProcesso()` | rotuloProcesso(k, p) | assinatura | `painelCNJ` |
| 10566 | `classeCurta()` | "MSCiv" -> "Mandado de Segurança"; | comentário acima | `rotuloProcesso` |
| 10575 | `fmtProc()` | fmtProc = n | assinatura | `acrescentarProcesso`, `gerenciaProcessos`, `removerProcesso`, `rotuloProcesso` |
| 10581 | `salvarProcessos() async` | o principal é o primeiro NOSSO que ainda está sendo acompanhado — é ele | comentário dentro | `acrescentarProcesso`, `alternarNossoProcesso`, `removerProcesso` |
| 10597 | `acrescentarProcesso() async` | acrescentarProcesso(casoId) | assinatura | `HTML inline` |
| 10608 | `alternarNossoProcesso() async` | alternarNossoProcesso(casoId, numero) | assinatura | `HTML inline` |
| 10613 | `removerProcesso() async` | removerProcesso(casoId, numero) | assinatura | `HTML inline` |
| 10619 | `gerenciaProcessos()` | o quadro de gerência, nos moldes do que a aba 🖥 Recurso já faz com os NUPs | comentário acima | `painelCNJ` |
| 10647 | `pjeDoProcesso()` | os movimentos do PJe DAQUELE processo: | comentário acima | `painelCNJ` |
| 10656 | `painelCNJ()` | Sub-aba Andamentos do CNJ: DataJud e coleta do PJe, por processo. | escrito à mão | `rot` |
| 10741 | `previsaoBox()` | A previsão é informação NOSSA, não do tribunal: | comentário acima | `painelCNJ` |
| 10768 | `marcoDoCaso()` | marcoDoCaso(k) | assinatura | `copiarMarco`, `marcoCaso` |
| 10776 | `marcoCaso()` | requisitório/alvará/pagamento em processo que ainda não está na fase de | comentário dentro | `painelCNJ` |
| 10792 | `copiarMarco()` | copiarMarco(casoId) | assinatura | `HTML inline` |
| 10806 | `datajudCaso()` | datajudCaso(k) | assinatura | **ninguém** |
| 10829 | `copiarDatajud()` | copiarDatajud(casoId) | assinatura | `HTML inline` |
| 10842 | `trf3Caso()` | Ordem de julgamento no TRF3 (casos.trf3, gravado pelo trf3_ordem.py diário) | comentário acima | **ninguém** |
| 10864 | `mesAno()` | mesAno(iso) | assinatura | `copiarPrevisao`, `previsaoBox`, `projecaoTrf3` |
| 10868 | `projecaoTrf3()` | projecaoTrf3(t) | assinatura | `trf3Caso` |
| 10878 | `copiarPrevisao()` | copiarPrevisao(casoId) | assinatura | `HTML inline` |
| 10897 | `copiarTrf3()` | copiarTrf3(casoId) | assinatura | `HTML inline` |
| 10909 | `trilhaCaso()` | trilhaCaso(k) | assinatura | **ninguém** |
| 10925 | `toggleImp() async` | toggleImp(casoId) | assinatura | `HTML inline` |
| 10932 | `toggleUrg() async` | toggleUrg(casoId) | assinatura | `HTML inline` |
| 10939 | `moverFase() async` | moverFase(casoId, fase) | assinatura | `HTML inline` |
| 10947 | `salvarBeneficio() async` | salvarBeneficio(casoId) | assinatura | `HTML inline` |
| 10955 | `subtarefasDe()` | checklist do caso (o "0 de 4" do To Do) | comentário acima | `alternarMarcador`, `blocoFatos`, `checklistCaso` |
| 10956 | `checklistCaso()` | checklistCaso(k) | assinatura | `blocoFatos` |
| 10969 | `novaSubtarefa() async` | novaSubtarefa(casoId) | assinatura | `HTML inline` |
| 10976 | `ligarChecklistFicha()` | ligarChecklistFicha() | assinatura | `fecharEsc` |
| 10993 | `dataNatural()` | dataNatural(texto) | assinatura | `novaTarefa` |
| 11016 | `fecharFicha()` | fecharFicha(rerender=true) | assinatura | `HTML inline`, `digitando`, `fecharEscolha`, `irCel`, `sinoSvg` |
| 11029 | `celular()` | function celular(){ return CEL.matches; } | o próprio corpo | `abrirEsc`, `crescer`, `faltaParaDocs`, `folgaComposer`, `marcarCelular` +1 |
| 11030 | `marcarCelular()` | marcarCelular() | assinatura | `iniciar` |
| 11036 | `fecharMenuCel()` | a ficha de celular abre enxuta (identidade, processo, comentários); o resto | comentário dentro | `irCel`, `marcarCelular`, `sinoSvg` |
| 11039 | `fichaTudo()` | a ficha de celular abre enxuta (identidade, processo, comentários); | comentário acima | `HTML inline` |
| 11045 | `irCel()` | irCel(destino) | assinatura | `HTML inline` |
| 11060 | `folgaComposer()` | no celular o campo de escrever fica preso no rodapé; | comentário acima | `abrirEsc`, `crescer`, `fecharEsc` |
| 11081 | `marcarBarraCel()` | marcarBarraCel() | assinatura | `irCel`, `render` |
| 11093 | `extrairEvento() async` | extrairEvento(texto, casoId) | assinatura | `novoAndamento` |
| 11118 | `ehIncapacidade()` | DCB: a data em que o benefício cessa sozinho ────────────────────────── | comentário acima | `blocoFatos` |
| 11120 | `chipDcb()` | chipDcb(k) | assinatura | `blocoFatos` |
| 11128 | `salvarDCB() async` | DCB nova rearma o alarme: a prorrogação pedida era da DCB antiga | comentário dentro | **ninguém** |
| 11137 | `salvarProrrog() async` | salvarProrrog(casoId, pedida) | assinatura | `HTML inline` |
| 11149 | `proxDiaUtil()` | proxDiaUtil(iso) | assinatura | `maisDias`, `recorrerAte` |
| 11154 | `maisDias()` | soma dias a UMA DATA qualquer (maisDias conta sempre a partir de hoje). | comentário dentro | `HTML inline`, `caixaEncaminhar`, `dataRelativa`, `ligarEncaminhar`, `tfDia` |
| 11160 | `somaDias()` | soma dias a UMA DATA qualquer (maisDias conta sempre a partir de hoje). | comentário acima | `editarFato`, `maisDias`, `recorrerAte` |
| 11166 | `tfPessoa()` | tfPessoa(id, btn) | assinatura | `HTML inline` |
| 11173 | `tfNinguem()` | tfNinguem(btn) | assinatura | `HTML inline` |
| 11178 | `tfDia()` | tarefa para alguém precisa de data: o "sem lembrete" só vale sem gente | comentário dentro | `HTML inline` |
| 11196 | `novoAndamento() async` | novoAndamento(casoUnico) | assinatura | `HTML inline` |
| 11305 | `abrirExigencia()` | a exigência abre pela sugestão "⚠ Exigência do INSS" (não tem mais botão) | comentário acima | `usarSugestao` |
| 11317 | `apagarAndamento() async` | apagar o próprio comentário: | comentário acima | `HTML inline` |
| 11339 | `lbMotivos()` | menu curto do Lembrar, no estilo do To Do: escolher a data e pronto. | comentário dentro | `lbCarregarForm`, `lbFormHtml`, `lbRender`, `lbSalvarMotivo`, `sugestoes` |
| 11345 | `menuLembrar()` | menu curto do Lembrar, no estilo do To Do: | comentário acima | **ninguém** |
| 11359 | `salvarPrazo() async` | salvarPrazo(casoId, iso) | assinatura | `HTML inline` |
| 11370 | `lbRender()` | A caixa antiga do Lembrar virou o EDITOR DAS SUGESTÕES: | comentário acima | `HTML inline`, `lbDesativar`, `lbEditar`, `lbSalvarMotivo` |
| 11389 | `lbEditar()` | lbEditar(casoId) | assinatura | `HTML inline` |
| 11394 | `lbFormHtml()` | lbFormHtml(casoId) | assinatura | `lbRender` |
| 11416 | `lbCarregarForm()` | lbCarregarForm(id) | assinatura | `HTML inline` |
| 11426 | `lbSalvarMotivo() async` | lbSalvarMotivo(casoId) | assinatura | `HTML inline` |
| 11448 | `lbDesativar() async` | lbDesativar(casoId,id) | assinatura | `HTML inline` |
| 11457 | `diaSemana()` | diaSemana(iso) | assinatura | `pintarPrazoDoTexto`, `salvarPrazo` |
| 11460 | `novaExigencia() async` | novaExigencia() | assinatura | `HTML inline` |
| 11479 | `montarPreenchimento()` | preenchimento guiado das frases: | comentário acima | `usarSugestao` |
| 11502 | `inserirPreenchida()` | inserirPreenchida() | assinatura | `HTML inline` |
| 11525 | `novoCaso() async` | novoCaso(cliId) | assinatura | `HTML inline` |
| 11539 | `novaFrase() async` | novaFrase() | assinatura | **ninguém** |
| 11551 | `novoEvento() async` | novoEvento() | assinatura | `HTML inline` |
| 11566 | `cancelarEvento() async` | cancelar não apaga: a linha fica na ficha como "cancelada" (histórico), mas sai das listas, dos contadores e do cartão do Meu Dia. | comentário acima | `HTML inline` |
| 11577 | `compareceuEvento() async` | perícia que passou e ACONTECEU: | comentário acima | `HTML inline` |
| 11586 | `nomeStatusEvento()` | como o status aparece nas listas — 'realizada' vira a palavra do Paulo | comentário acima | `bloco`, `painelPericiasFicha` |
| 11594 | `janelaAvisado()` | 📞 O REGISTRO DO AVISO ──────────────────────────────────────────────── Perícia agendada → o cliente é avisado LOGO. | comentário acima | `HTML inline` |
| 11609 | `salvarAvisado() async` | salvarAvisado(evId, comAtendimento) | assinatura | `HTML inline` |
| 11650 | `colPorNome()` | 💰 A CORRENTE DE CONFERÊNCIA (regra do Paulo, 13.08) ───────────────── André/Ingrid sinalizam um pagamento -> nasce a tarefa de HOJE para Marcos E Amanda conferi | comentário acima | `proximoElo` |
| 11651 | `proximoElo()` | proximoElo(quemId) | assinatura | `correnteConferencia` |
| 11666 | `casoDaParcela()` | O caso onde a corrente de conferência vai escrever. | comentário acima | `fecharEsc` |
| 11672 | `correnteConferencia() async` | correnteConferencia(casoId, resumo) | assinatura | `elosDepoisDeConferir`, `fecharEsc`, `novoPgto` |
| 11692 | `elosDepoisDeConferir() async` | o "✔ conferi": baixa TODAS as tarefas 💰 abertas do caso (a dupla de conferentes conta como uma etapa só) e chama o próximo elo | comentário acima | `fecharEsc` |
| 11705 | `novoPgto() async` | novoPgto() | assinatura | `HTML inline` |
| 11728 | `lembreteDoEvento()` | lembreteDoEvento(evId) | assinatura | `copiarLembrete`, `zapLembrete` |
| 11735 | `copiarLembrete() async` | copiarLembrete(evId) | assinatura | `HTML inline` |
| 11739 | `zapLembrete()` | zapLembrete(evId) | assinatura | `HTML inline` |
| 11752 | `fecharJanela()` | encerrar caso: resultado -> honorários? -> Pagamentos ou fim -> caso novo? A janela caminha em três perguntas, na ordem em que o escritório pensa: | comentário acima | `HTML inline`, `janelaEncerrar`, `janelaFundir`, `perguntaCasoNovo` |
| 11753 | `janelaEncerrar()` | janelaEncerrar(casoId) | assinatura | `HTML inline`, `fecharEsc` |
| 11790 | `perguntaCasoNovo()` | pergunta 3, no lugar da janela: | comentário acima | `encerrarDeVez`, `enviarPagamentos` |
| 11816 | `encerrarDeVez() async` | NÃO gerou honorários: encerra de vez, com autoria e hora | comentário acima | **ninguém** |
| 11837 | `enviarPagamentos() async` | GEROU honorários: o caso não morre — muda para a fase 💰 Pagamentos | comentário acima | **ninguém** |
| 11881 | `janelaFundir()` | ⇄ fundir dois casos ────────────────────────────────────────────────── Pedido negado que virou recurso, recurso que virou ação judicial: | comentário acima | `HTML inline` |
| 11909 | `fundirCasos() async` | fundirCasos(absorvidoId, destinoId) | assinatura | `HTML inline`, `janelaFundir` |
| 11918 | `t() async` | filhos em lote (id preservado — a sincronização não duplica depois) | comentário dentro | `ela mesma` |
| 11990 | `docPorNome()` | catálogo de documentos (espelho do site interno) ────────────────────── | comentário acima | `pedirDocsAtendimento`, `renderDocCatalogo`, `solicitarDocsCatalogo` |
| 11992 | `renderDocCatalogo()` | renderDocCatalogo() | assinatura | `HTML inline`, `fecharEsc` |
| 12016 | `solicitarDocsCatalogo() async` | solicitarDocsCatalogo() | assinatura | `HTML inline` |
| 12053 | `cumprirExigencia() async` | cumprirExigencia(casoId) | assinatura | `HTML inline` |
| 12061 | `copiarMsgExigencia() async` | copiarMsgExigencia(casoId) | assinatura | `HTML inline` |
| 12067 | `agendarAtendimento()` | agendarAtendimento(cliId) | assinatura | `HTML inline` |
| 12080 | `novoModelo() async` | novoModelo() | assinatura | `HTML inline` |
| 12089 | `abrirDrive()` | pasta do cliente — Drive (navegador) e Windows Explorer (protocolo crmpasta:) | comentário acima | `HTML inline` |
| 12093 | `abrirExplorer()` | abrirExplorer(cliId) | assinatura | `HTML inline` |
| 12098 | `salvarPasta() async` | salvarPasta(cliId) | assinatura | `HTML inline` |
| 12107 | `cklDe()` | checklist-modelo por benefício -> caso novo já nasce com o passo a passo | comentário acima | `aplicarChecklistCaso`, `checklistCaso` |
| 12113 | `aplicarChecklistCaso() async` | aplicarChecklistCaso(caso, silencioso) | assinatura | `HTML inline`, `addNaLista`, `criarCliente`, `leadParaCliente` |
| 12172 | `valCli()` | valCli(c, campo) | assinatura | `cadCampo`, `cadCampoRG`, `cadFaltando`, `editarCad`, `editarRG` |
| 12178 | `rotuloValor()` | rotuloValor(campo, v) | assinatura | `cadCampo` |
| 12184 | `cadFaltando()` | quais campos das peças estão em branco — o contador do título e o title | comentário acima | `fichaIdentificacao` |
| 12189 | `salvarCliCampo() async` | grava na coluna; banco sem a coluna (PGRST204/42703) cai em campos.civil | comentário acima | `guardarCad`, `guardarRG`, `salvarTelefones` |
| 12213 | `editarCad()` | editor no lugar: o campo vira input/select sem sair da grade | comentário acima | `HTML inline` |
| 12231 | `guardarCad() async` | guardarCad(campo, cliId) | assinatura | `HTML inline`, `editarCad` |
| 12241 | `telefonesDe()` | telefones em lista ──────────────────────────────────────────────────── `telefone` continua sendo o principal (é dele que o WhatsApp sai); | comentário acima | `fichaIdentificacao`, `marcarZap`, `novoTelefone`, `removerTelefone` |
| 12247 | `salvarTelefones() async` | salvarTelefones(cliId, lista) | assinatura | `marcarZap`, `novoTelefone`, `removerTelefone` |
| 12267 | `novoTelefone()` | novoTelefone(cliId) | assinatura | `HTML inline` |
| 12275 | `removerTelefone()` | removerTelefone(cliId, i) | assinatura | `HTML inline` |
| 12280 | `marcarZap()` | marcarZap(cliId, i) | assinatura | `HTML inline` |
| 12305 | `cadCampo()` | um campo da grade: cheio mostra o valor; | comentário acima | `fichaIdentificacao` |
| 12317 | `cadCampoRG()` | RG e órgão emissor: um campo na tela, duas colunas no banco | comentário acima | `fichaIdentificacao` |
| 12325 | `editarRG()` | editarRG(cliId) | assinatura | `HTML inline` |
| 12332 | `teclas()` | const teclas=e=>{ if(e.key==="Enter") guardarRG(cliId); if(e.key==="Escape") abrirFicha(cliId); }; | o próprio corpo | **ninguém** |
| 12335 | `guardarRG() async` | guardarRG(cliId) | assinatura | `HTML inline`, `teclas` |
| 12342 | `fichaIdentificacao()` | Divisão Identificação: a grade de 12 colunas com os dados civis (F9.1). | escrito à mão | `aplicarChecklistCaso`, `painelCadastroFicha` |
| 12413 | `civilDe()` | os documentos leem daqui: | comentário acima | `aplicarChecklistCaso`, `faltaParaDocs`, `preencherModeloDoc` |
| 12423 | `faltaParaDocs()` | o que ainda falta para os documentos saírem sem lacuna. | comentário acima | `caixaDocumentos` |
| 12521 | `variantePorEspecie()` | qual contrato a espécie pede — a escolha do Paulo, por palavra da espécie | comentário acima | `caixaDocumentos`, `corpoDoDoc` |
| 12529 | `textoContrato()` | textoContrato(chave) | assinatura | `corpoDoDoc` |
| 12700 | `preencherModeloDoc()` | troca os <MARCADORES> pelos dados do cliente — o que falta vira linha para preencher à caneta, nunca "undefined" nem espaço mudo | comentário acima | `corpoDoDoc` |
| 12716 | `especieDoCliente()` | a espécie que manda no contrato e no termo: | comentário acima | `caixaDocumentos`, `gerarDocEscritorio`, `gerarTodosDocs` |
| 12720 | `corpoDoDoc()` | corpoDoDoc(chave, c, especie) | assinatura | `gerarDocEscritorio`, `gerarTodosDocs` |
| 12725 | `folhaDoc()` | folhaDoc(d, c) | assinatura | `gerarDocEscritorio`, `gerarTodosDocs` |
| 12734 | `janelaImpressao()` | janelaImpressao(titulo, folhas) | assinatura | `gerarDocEscritorio`, `gerarTodosDocs` |
| 12751 | `gerarDocEscritorio()` | gerarDocEscritorio(chave, cliId) | assinatura | `HTML inline` |
| 12758 | `gerarTodosDocs()` | gerarTodosDocs(cliId, chaves) | assinatura | `HTML inline` |
| 12767 | `registrarDocGerado() async` | fica registrado no CRM o que foi impresso para o cliente assinar | comentário acima | `gerarDocEscritorio`, `gerarTodosDocs` |
| 12777 | `caixaDocumentos()` | Divisão Documentos: os botões que geram procuração, contrato e declarações. | escrito à mão | `painelCadastroFicha` |
| 12781 | `bt()` | const bt=(ch)=>`<button class="btn-mini" onclick="gerarDocEscritorio('${ch}','${c.id}')">📄 ${DOCS_ESCRITORIO[ch].rot}</button>`; | o próprio corpo | `ela mesma` |
| 12806 | `caixaAtendimento()` | Divisão Anotações: o quadro do atendimento de quem ainda não tem caso. | escrito à mão | `painelCadastroFicha` |
| 12917 | `salvarEspecieAtendimento() async` | salvarEspecieAtendimento(cliId) | assinatura | `HTML inline` |
| 12929 | `salvarNotaAtendimento() async` | salvarNotaAtendimento(cliId) | assinatura | `HTML inline` |
| 12944 | `criarCasoDoAtendimento() async` | o caso nasce do atendimento: | comentário acima | `HTML inline` |
| 12986 | `criarCronogramaINSS() async` | indicação de pagamento ao INSS: | comentário acima | `HTML inline` |
| 13018 | `docExtraAtendimento()` | docExtraAtendimento() | assinatura | `HTML inline` |
| 13028 | `pedirDocsAtendimento() async` | imprime a lista para o cliente levar E registra no CRM o que pedimos | comentário acima | `HTML inline` |
| 13045 | `docEntregue() async` | docEntregue(cliId, pi, ii) | assinatura | `HTML inline` |
| 13059 | `preencherDoc()` | modelos de documentos ({nome},{cpf},{nb}... | comentário acima | `gerarDocumento` |
| 13070 | `gerarDocumento()` | gerarDocumento(modeloId, cliId) | assinatura | `HTML inline` |
| 13087 | `docDe()` | documentos por benefício -> carta imprimível para o cliente | comentário acima | `caixaAtendimento`, `catalogoNoCadastro`, `editarDocs`, `imprimirDocs`, `janelaDocsAnotacao` +1 |
| 13099 | `janelaDocsAnotacao()` | 📄 SOLICITAR DOCUMENTOS NO MEIO DA ANOTAÇÃO (pedido do Paulo) ──────── Atendendo um cliente ANTIGO, a solicitação de documentos nasce onde a anotação está sendo  | comentário acima | `HTML inline` |
| 13124 | `docExtraAnotacao()` | docExtraAnotacao() | assinatura | `HTML inline` |
| 13132 | `solicitarDocsAnotacao() async` | solicitarDocsAnotacao(casoId) | assinatura | `HTML inline` |
| 13157 | `imprimirDocs()` | imprimirDocs(casoId) | assinatura | **ninguém** |
| 13163 | `imprimirListaDocs()` | imprimirListaDocs(c, beneficio, itens, obs) | assinatura | `imprimirDocs`, `pedirDocsAtendimento`, `solicitarDocsCatalogo` |
| 13188 | `editarDocs()` | editarDocs(casoId) | assinatura | **ninguém** |
| 13197 | `salvarDocs() async` | salvarDocs(casoId) | assinatura | `HTML inline` |
| 13205 | `copiar() async` | copiar(texto, msg) | assinatura | `HTML inline`, `abrirERecursos`, `abrirSmbot`, `copiarCasoCompleto`, `copiarCred` +10 |
| 13214 | `copiarCred() async` | copiarCred(id) | assinatura | `HTML inline` |
| 13220 | `verCred() async` | verCred(id) | assinatura | `HTML inline` |
| 13227 | `novaCred() async` | novaCred(cliId) | assinatura | `HTML inline` |
| 13265 | `aplicarMenu()` | Estado do menu lateral em UM lugar só. | comentário acima | `abrirFicha`, `digitando`, `fecharFicha`, `iniciar`, `irParaPesquisa` +1 |
| 13278 | `irParaPesquisa()` | atalhos de teclado ──────────────────────────────────────────────────── Ctrl+F (ou ⌘F) e "/" levam à pesquisa; | comentário acima | `digitando` |
| 13283 | `digitando()` | Reage ao que está sendo digitado na busca. | escrito à mão | `ela mesma` |

### Funções que ninguém chama (33)

Podem ser ganchos de `window` usados por `onclick` montado em string que a
varredura não pegou, restos de recurso desligado, ou código morto de verdade.
Conferir antes de apagar.

`seguirEtiqueta` (2345), `orgaoDoAcordao` (2424), `rerotular` (2605), `casoParecido` (2890), `cx` (3236), `em15` (3603), `tCol` (3878), `caixaEncaminhar` (4490), `abrirTodasNovidades` (4683), `periciasEmLote` (4874), `lim` (5007), `kcardCaso` (5352), `blocoPagamentoINSS` (5961), `bloco` (6278), `itemCal` (6372), `abrirFundos` (6463), `abrirEsc` (7398), `fecharEsc` (7411), `irAba` (7809), `cat` (8586), `li` (9651), `norm` (10539), `datajudCaso` (10806), `trf3Caso` (10842), `trilhaCaso` (10909), `salvarDCB` (11128), `menuLembrar` (11345), `novaFrase` (11539), `encerrarDeVez` (11816), `enviarPagamentos` (11837), `teclas` (12332), `imprimirDocs` (13157), `editarDocs` (13188)
