---
name: inicial-inss
description: Monta o protocolo administrativo pronto para anexar no Meu INSS - lê toda a pasta do cliente no Drive e as instruções do To Do, confere a documentação obrigatória do benefício (IN 128/2022), antecipa exigências, cura as provas, ordena os arquivos pela lógica do INSS (categoria + cronologia interna) na subpasta "Documentos Protocolo INSS", redige a petição administrativa de 1 folha e a ficha de protocolo. Use quando o destino for o requerimento administrativo (Meu INSS), não o Judiciário (nunca protocola).
---

Monte o requerimento administrativo de UM cliente, pronto para anexar no Meu INSS.
ARGUMENTO: `<Cliente|CPF>`. Leia ANTES o `CLAUDE.md` (doutrina; legenda P/M/I/D/A/C;
limitacoes do Drive; **Analise de PPP**; **Leitura de documentos - cadeia
OBRIGATORIA**; nomenclatura nome + DDMMAAAA; estilo do escritorio) e a(s)
skill(s) do beneficio (`ponte-*`, `base-*`). Gravacao automatica, com relatorio
ao final. NAO protocole, NAO envie nada, NAO sobrescreva arquivos. So prepare.

**Handoff da `/triagem`.** Se a triagem marcou "Pronto para /inicial-inss", comece
lendo o **parecer** e a secao **"Pendencias em aberto"** do cliente (subpasta `Claude`)
como ponto de partida, em vez de refazer o diagnostico.

Diferenca para o `/inicial`: aqui o destino e o **Meu INSS** (administrativo), nao o
Judiciario. Muda a subpasta, a numeracao/ordem dos arquivos e a peca (peticao
administrativa de 1 folha, sem lei/decreto).

## 1. Acesso e carregamento
- `python3 graph_bootstrap.py`.
- Localize a tarefa do cliente no To Do (por nome/CPF) com `graph_client`; use a
  tarefa ATIVA. Leia TODAS as instrucoes do corpo (historico), checklist e anexos.
- **Procure TODAS as tarefas do mesmo cliente em TODAS as listas** (por CPF e por
  nome). O mesmo cliente costuma ter tarefa na lista **INSS** e outra na **Judicial**.
  Leia todas e cruze antes de montar o protocolo, isso evita conflito e capta
  **litispendencia/duplicidade** (requerimento administrativo enquanto corre acao
  judicial sobre o mesmo beneficio). Use `python3 triagem_do_dia.py` (campo
  `outras_tarefas`) ou `graph_client`. Havendo via judicial paralela, **sinalize em
  destaque** e reavalie se o protocolo administrativo e mesmo o caminho.
- Identifique o **beneficio pretendido** e a **DER pretendida**.

## 2. Leitura integral (cadeia obrigatoria)
- Localize a pasta do cliente no Drive e **leia a INTEGRALIDADE** de cada documento
  (CNIS, PPP, laudos/relatorios medicos, exames, CTPS, documentos rurais,
  procuracoes, certidoes, identificacao). Use OCR/`download_file_content` base64
  quando `read_file_content` falhar; arquivo > ~10 MB que nao baixa: **sinalize**.
- Leia os anexos da tarefa (`todo_anexo.py`).
- **Extraia as datas internas** que definem a ordem (ver passo 5): periodos de
  trabalho de CADA PPP; data de confeccao de cada relatorio/exame medico; data do
  fato em cada documento rural (NF, contrato, bloco de produtor etc.).

## 3. Documentacao obrigatoria (IN 128/2022) — checklist anti-exigencia
- Consulte a skill do beneficio e liste os documentos **exigidos** para aquele
  pedido (ex.: especial -> PPP/LTCAT; BPC -> CadUnico/composicao familiar/laudos;
  rural -> autodeclaracao + inicio de prova material; pensao -> certidao de obito +
  prova de uniao/dependencia; incapacidade -> documentos medicos).
- **Destaque o que falta** e deixe a lista pronta para o Paulo solicitar ao cliente.

## 4. Antecipar a carta de exigencia (red-team do analista)
- Simule o que o analista do INSS costuma exigir naquele beneficio (qualidade de
  segurado/carencia, PPP sem campo X, periodo de carencia rural, atualizacao de
  CadUnico, laudo recente, etc.) e ja resolva/anexe o que der, ou aponte a
  pendencia no relatorio.

## 5. Curadoria e ordenacao (logica do INSS)
- **Cure**: junte so o que ajuda; **exclua** documento prejudicial/incorreto (ex.:
  PPP errado, exame de outro cliente). Mantenha no parecer a secao **"NAO JUNTAR"**
  com cada exclusao e o motivo.
- **Ordem dos arquivos** = categoria (na sequencia abaixo) e, **dentro de cada
  categoria, ordem CRONOLOGICA do que esta escrito no documento** (nao a data do
  arquivo):
  1. Procuracao Administrativa
  2. Documento de Identificacao (RG/CPF/CNH)
  3. Certidao (Nascimento ou Casamento)
  4. **PPPs** — na ordem dos **periodos de trabalho** (mais antigo -> mais recente),
     lidos do proprio PPP
  5. **Relatorios medicos** — ordem cronologica (data do relatorio)
  6. **Exames medicos** — ordem cronologica (data do exame)
  7. **Documentos rurais** — ordem cronologica pelo conteudo (ex.: NF 1999 antes do
     contrato de parceria 2008)
  8. Demais (CNIS, comprovante de residencia, CadUnico, autodeclaracao etc.)
- **Documentos a PRODUZIR pelos modelos vivos do Drive** (nunca do zero, ver CLAUDE.md
  "Modelos e formulários do escritório"). Procuracao administrativa pelo pacote `Novo -
  Procuracao Adm. e Judicial...Docs1.docx` (ou, sendo auxilio-doenca direto no INSS, a
  `Procuracao Adm. e Contrato Auxilio Doenca.docx`), preenchendo os campos `<...>`,
  removendo o campo do dado que faltar, assinalando o beneficio e a Atualizacao
  Cadastral no Termo de Representacao e ajustando o Contrato pelo realce de cor (e
  retirando o realce). RAC pelo Anexo certo de `Formularios IN128`; Autodeclaracao de
  segurado especial e demais formularios (contribuicoes em atraso, declaracao de
  endereco) pela mesma pasta. CNIS com erro corrigivel, **montar a RAC mesmo sem pedido**.
  Calculo de tempo/RMI e no **Previus** (alertar). Deixe os documentos prontos na
  subpasta `Claude` e inclua a procuracao no jogo do protocolo.

## 6. Montar a subpasta "Documentos Protocolo INSS"
- Crie, dentro da pasta do cliente, a subpasta **`Documentos Protocolo INSS`**.
- Nomeie cada arquivo com **prefixo de 2 digitos pela ordem de leitura** (passo 5):
  **`NN - <Tipo> - DDMMAAAA.pdf`**. Quando ajudar a leitura, inclua o periodo/data
  no nome (ex.: `04 - PPP Cica (10.1995-03.2001).pdf`,
  `06 - Relatorio Medico Dr. Silva 12.03.2019.pdf`,
  `08 - Documento Rural NF 1999.pdf`).
- Primeiro arquivo: **`00 - Requerimento Administrativo - DDMMAAAA`** (a peticao de
  1 folha do passo 7).
- **Fatie PDFs combinados** com `pdf_split.py` (baixar base64 -> separar por faixas
  -> subir via `create_file`); originais ficam intactos. Respeite o **limite de
  tamanho por arquivo do Meu INSS: 5 MB** — todo arquivo que exceder 5 MB deve ser
  quebrado em partes que caibam (nomear `... (parte 1 de N)`). Apague os temporarios.

## 7. Peticao administrativa de 1 folha (norte para o analista)
- **No maximo uma folha.** E um norte para bater o olho e entender o pedido — **sem
  explicacoes, sem fundamentacao**. Conteudo enxuto:
  - qualificacao minima do segurado e do procurador (OAB/SP 331.110);
  - **o que se requer** (beneficio + especie/B, DER pretendida);
  - **rol de documentos anexados** na ordem (espelha a subpasta).
- **NAO citar lei nem decreto.** Se for indispensavel citar legislacao, **apenas
  Instrucao Normativa do INSS ou suas portarias**. Tom direto, sem dois-pontos como
  separador logico. Salve como `00 - Requerimento Administrativo - DDMMAAAA` na
  subpasta e tambem na subpasta `Claude`.

## 8. Revisao aprofundada OBRIGATORIA (base-revisao-peticao-aprofundada) — autocorrecao
- SEMPRE, antes de fechar, rode a skill `base-revisao-peticao-aprofundada` sobre o
  requerimento de 1 folha (passo 7) e sobre a coerencia do conjunto: protocolo
  anti-alucinacao de 5 niveis e as 5 camadas, com severidade quadrupla (BLOQUEANTE /
  CRITICO / IMPORTANTE / MENOR).
- **Foco no rito administrativo:** a peca **nao cita lei/decreto** (so IN/portaria do
  INSS, se indispensavel — conferir a taxonomia correta via
  `base-portarias-dpmf-inss-hub`); revalidar o **checklist da IN 128/2022** do
  beneficio (faltantes em destaque), o cruzamento **CNIS x documentos** e a
  **ordenacao** por categoria/cronologia interna (passo 5).
- **Corrija automaticamente** os achados sanaveis, sem voltar a perguntar: retirar
  lei/decreto indevidos, dois-pontos logicos, divergencia de dado (nome, NIT, datas,
  periodos) contra os documentos lidos, ordem dos anexos, citacao de portaria com
  taxonomia errada. Gere a versao corrigida do requerimento (subpasta `Claude` e
  `00 - Requerimento Administrativo`), **sem sobrescrever** o original.
- **Honestidade radical:** dado que nao foi lido em documento, ou citacao nao
  confirmada em fonte primaria, e **removido/marcado "a confirmar"**, nunca
  inventado. Achado BLOQUEANTE que dependa de decisao do Paulo ou de documento
  faltante **nao se resolve sozinho** — sinalize em destaque no relatorio.
- Registre o **log da revisao** no parecer e no relatorio (achados por severidade, o
  que foi autocorrigido, o que permanece pendente).

## 9. Ficha de protocolo (Meu INSS) — folha de cola
- Gere `Ficha de Protocolo INSS - <Cliente> - DDMMAAAA` (na subpasta `Claude`) para
  quem vai protocolar: **servico/beneficio a selecionar** no Meu INSS, **dados do
  segurado** (nome, CPF, NIT/NIS, nascimento), **DER pretendida**, e a **ordem de
  upload** dos anexos (00 -> NN). Inclua avisos (ex.: atualizar CadUnico antes).

## 10. Gravar e relatar
- Conclusao (C) no To Do (`todo_conclusao.py`): max. 4 linhas, com o que foi
  montado, documentos obrigatorios faltantes, exclusoes e bloqueios.
- Atualize/crie o parecer na subpasta `Claude` (checklist IN 128/2022 com faltantes
  em destaque, secao "NAO JUNTAR", exigencias antecipadas, lista de renomeacoes
  sugeridas e mensagem pronta ao cliente quando aplicavel).
- **Relatorio de prontidao**: "Pronto para protocolar? SIM/NAO", beneficio/servico,
  e bloqueios (ex.: falta procuracao assinada, falta RG, CadUnico desatualizado,
  PPP a retificar, arquivo > 5 MB a quebrar).

## Regras
- So juntar documento que ajuda; nunca anexar prova prejudicial/inutil. Peticao de 1
  folha sem lei/decreto (so IN/portaria do INSS, se indispensavel).
- NAO renomear/apagar os originais no Drive (so criar novos na subpasta). NAO
  protocolar/anexar no Meu INSS (por ora; no futuro o anexo sera por controle do
  navegador). NAO enviar mensagens (so deixar prontas).
- Toda saida em portugues do Brasil com acentuacao correta; datas em BRT.

## Dependencias (necessarias no ambiente, inclusive no cowork)
Esta skill executa ferramentas. Para rodar, o ambiente precisa de:
- **Scripts Python (raiz do repo):** `graph_bootstrap.py`, `graph_client.py`,
  `todo_anexo.py`, `todo_conclusao.py`, `pdf_split.py` e `graph_tokens.json` valido.
- **MCP:** Google Drive (search_files, read_file_content, download_file_content,
  create_file, copy_file) e Microsoft To Do via Microsoft Graph.
- **Skills de apoio (base/ponte):** `base-documentos-comprobatorios-in128`,
  `base-revisao-peticao-aprofundada`, `base-portarias-dpmf-inss-hub`,
  `base-precedentes-catalogo-vinculantes`, `base-cnis-acerto-indicadores` e a `base-*`/
  `ponte-*` do beneficio, alem do `CLAUDE.md` do escritorio.
