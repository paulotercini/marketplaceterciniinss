# Passagem de bastão — 30.08.2026

Escrito no fim de uma sessão que perdeu o acesso ao GitHub no meio do
caminho. Tudo o que está aqui foi conferido; o que ficou por publicar está
dito com essas palavras.

**Leve para a sessão nova dois arquivos:** este e o `F80-09.76.patch`.

---

## 1. A primeira coisa a fazer: publicar o F80

É a única coisa pendente. O trabalho está pronto, testado e conferido — falta
só o transporte.

Na sessão nova, com o patch anexado, peça:

> Aplique o `F80-09.76.patch` na branch `claude/retomar-crm-fase2-j1mk4m`,
> faça merge na `main` e publique.

Ou, no terminal:

```bash
git checkout main && git pull
git am F80-09.76.patch
git push origin main
```

**Se o `git am` reclamar do `docs/crm/index.html`** (pode acontecer se a
`main` tiver andado): aplique sem ele e regere a cópia.

```bash
git am --abort
git apply --exclude=docs/crm/index.html F80-09.76.patch
python3 crm/publicar.py
git add -A && git commit -m "F80 (09.76): o que falta para os documentos vira formulario, no caminho"
git push origin main
```

Depois de publicar, o site pede **Ctrl+Shift+R** para mostrar a versão nova.

### Se o patch se perder

Dá para refazer. O F80 é isto, em `crm/fase2/app.html`:

- a função `caixaFaltaDocs(c)` substitui, dentro de `caixaDocumentos`, o
  recado cinza `Faltam no cadastro: …` por um formulário;
- **estado civil** (um `<select>`) e **profissão** (um `<input>`) gravam ali
  mesmo, chamando o `salvarCliCampo` que já existia — coluna primeiro,
  `campos.civil` como reserva;
- **nome, CPF, nascimento e endereço** pedem tela maior: viram botão que
  chama `irParaCampoCad(campo, cliId)`, que faz `irSubCad("identificacao")` e
  abre o editor do campo. O `pintarFicha` é síncrono, então não precisa de
  `setTimeout`;
- `faltamChaves(c)` conta bairro, cidade, UF e CEP como **uma linha só**,
  porque se preenchem todos na mesma janela do endereço;
- **nenhum pictograma**: a caixa vive na aba Cadastro, que o `emoji.js` varre;
- os botões usam a classe **`.fd-bt`, nunca `.cad-mini`** — ver a armadilha
  na seção 4.

A prova `crm/fase2/testes/cadastro/f80-falta.js` (15 asserções) descreve o
comportamento esperado item a item. Se o patch sumir, ela é a especificação.

---

## 2. O que JÁ está no ar (não refaça)

Tudo isto foi publicado hoje, antes de a credencial cair:

| o quê | onde |
|---|---|
| **Portão de publicação** | `.github/workflows/deploy-pages.yml` |
| **Suíte de tela automatizada** | `.github/workflows/testes-tela.yml` + `crm/fase2/testes/cadastro/rodar.js` |
| **Conserto do gêmeo do PAT** | `crm/fase2/robo-pat/importar.js` |
| **Prova podre consertada** | `crm/fase2/testes/cadastro/julgamento.js` |
| **Sonda do banco** | `crm/fase2/dossie_banco.py --f9` |
| **A análise da versão** | `cowork/07-ANALISE-09.75.md` |

O **portão** é a mudança mais importante: até hoje o `deploy-pages` publicava
a cada push em `docs/**` **sem consultar ninguém**. Agora o deploy depende do
job `conferir` — pytest, node, as 60 provas de tela, e uma conferência de que
`docs/crm/index.html` é byte a byte igual a `crm/fase2/app.html`. Essa última
é o que faz o portão valer: a suíte exercita o `app.html`, o que vai ao ar é
o `docs`; divergindo os dois, estaríamos aprovando um arquivo e publicando
outro.

---

## 3. Como conferir que nada quebrou

```bash
python3 -m pytest tests/ -q                       # 199
node --test "crm/fase2/*/testes/*.test.js"        # 281

# a suíte de TELA (60 provas num Chromium de verdade):
cd crm/fase2/testes/cadastro
npm install                                              # uma vez
npx playwright install chromium chromium-headless-shell  # uma vez
node rodar.js            # ~2 min; aceita filtro (node rodar.js fluxo) e -j1
cd -
```

O `rodar.js` **copia o `crm/fase2/app.html` para a pasta das provas** antes
de começar — cada prova serve o `app.html` dali, um arquivo que não está no
git. Sem esse passo a prova fala de uma cópia velha, ou nem roda.

---

## 4. Armadilhas que custaram tempo hoje

**A classe emprestada.** O `consulta.js` clica o **primeiro `.cad-mini` do
painel Documentos** para provar os portais. Um botão novo naquele painel com
essa classe rouba o clique e derruba 8 provas de um teste que não é o seu —
foi o que aconteceu comigo, e é a mesma lição que criou a `.trilho-mais` na
F31. Botão novo ali usa classe própria.

**Data absoluta em fixtura apodrece.** O `julgamento.js` falhava 8 de 11
porque usava `25/08/26`, que virou passado — e o detector de agendamento,
corretamente, ignora data no passado. O vermelho parecia defeito do programa
sendo defeito do teste. Fixtura com data usa `mais(n)` / `iso()` / `br()`; o
`novidades.js` e o `julgamento.js` têm o molde.

**O gêmeo do PAT.** O `app.html` é arquivo único e não faz `require`: a
lógica da importação vive copiada dentro dele, e `robo-pat/importar.js` é o
gêmeo que a suíte do node exercita. Mexeu num, mexa no outro. O teste que
compara os dois **para na primeira divergência** — hoje isso escondeu uma
segunda por semanas. Vale melhorá-lo para relatar todas.

**Painel só fica visível com o CLIQUE na aba.** Definir a aba e repintar
deixa o painel no DOM e invisível. Em prova de tela:
`await p.click('button.mt[data-vv="0"]')`.

---

## 5. O que a sonda do banco descobriu (não precisa repetir)

Rodada em 30.08, somente leitura, sem nenhum dado de cliente.

Os campos do cadastro estavam em zero **e não era defeito**: as colunas
existem, a gravação funciona, e a reserva `campos.civil` tem 2 clientes de
1.942. O que explicava tudo:

- **de 1.942 clientes, só 52 nasceram depois de 15.08**, quando a F9 entrou.
  O denominador honesto do "0 %" é 52, não 1.942;
- dentro desses 52: **preenchido** o que está no caminho — sexo 14, relato do
  atendimento 24, espécie 19, checklist de documentos 12; **zerado** o que
  exige voltar à Identificação — estado civil, profissão, nome da mãe,
  PIS/NIT; endereço 1.

Daí o F80: os campos não estavam quebrados, estavam **fora do caminho**.

**Correção registrada:** o RG **não** é lacuna. Saiu do sistema de propósito
na F23 — do campo, dos obrigatórios e de todos os modelos —, a qualificação
sai direto do CPF, e o `cadastro3.js` prova a ausência. A coluna no banco é
resíduo.

---

## 6. O que fazer depois do F80

Em ordem de valor, com o raciocínio:

1. **Uma tela para os 312 casos fora de toda lista.** De 3.203 casos, 303
   estão fora das listas mapeadas e 9 sem lista nenhuma — era 194+6 há duas
   semanas. Estão no banco, contam nos totais, e ninguém os vê trabalhando. O
   ritmo de entrada é maior que o de classificação, então não se resolve
   sozinho. **Não é classificar 312 à mão**: é ter onde vê-los, com o botão
   que joga cada um na lista certa.

2. **A porta da triagem.** `campos.triagem` tem **1** cliente. A triagem
   encerrada é o que libera Lembretes e Anotações (regra F29). Um significa
   que ela quase nunca é fechada — vale abrir a tela e ver se ela está no
   caminho ou ao lado dele, como aconteceu com os campos civis.

3. **Faxina de código morto.** Três funções aparecem **uma única vez** no
   `app.html` (só a definição, nenhum chamador): `irSubAnot` (165 linhas),
   `salvarDCB` e `casoParecido`. São 37 candidatas no total — parte é falso
   positivo do analisador e precisa de conferência uma a uma. Há também um
   comentário órfão sobre o RG apontando para função que não existe mais.

4. **O teste gêmeo do PAT relatando todas as divergências**, não só a
   primeira (seção 4).

5. **Os 271 clientes sem CPF**, provavelmente vindos do To Do sem `#CPF` no
   título. Deixe por último.

E, quando quiser o retrato atualizado do banco: dispare o workflow
**`crm-dossie.yml`** (Actions → Run workflow). Ele é somente leitura e não
imprime nenhum dado de cliente.

---

## 7. Números da versão, para comparar depois

Medidos em 30.08 sobre a 09.75:

| | 15.08 (09.00) | 30.08 (09.75) |
|---|---|---|
| linhas do `app.html` | 13.381 | 18.702 |
| funções | ~600 | 916 |
| variáveis globais | — | 76 |
| `style=` dentro de template | — | 609 |
| commits na `main` desde 14.08 | — | 166 |

O arquivo cresceu 40 % em quinze dias. Não é crítica — é o ritmo que a
operação pediu. Mas é o número que explica por que a suíte de tela rodando
sozinha passou a valer mais que qualquer rodada nova.
