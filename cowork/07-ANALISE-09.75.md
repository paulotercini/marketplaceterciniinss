# Análise da versão 09.75

Feita em 30.08.2026, com tudo medido no repositório e no banco de produção
(leitura apenas). Onde o número piorou desde o retrato de 15.08, está dito.

---

## 1. Onde o sistema está

| | 15.08 (09.00) | 30.08 (09.75) |
|---|---|---|
| linhas do `app.html` | 13.381 | **18.702** |
| tamanho publicado | 810 KB | **1,2 MB** |
| funções | ~600 | **916** |
| variáveis globais | — | 76 |
| tabelas do Supabase tocadas | — | 35 |
| `style=` escrito dentro de template | — | 609 |
| commits na `main` desde 14.08 | — | 166 |

São **31 rodadas** (F48 a F79) em quinze dias. O arquivo cresceu **40 %**
nesse período. Isso não é crítica: é o ritmo que a operação pediu. Mas é o
número que explica quase tudo que vem nas seções 3 e 4.

O que entrou de mais pesado: ⚖️ Análise de Direito (F48/F49), a ⚡ Anotação
rápida (F50 a F53), a reforma do cartão do caso (F55 a F58, F69, F70), o
quadro 📅 Lembretes e datas (F57, F59 a F62), Acompanhamento manual/automático
(F68) e o 🩺 da sincronização (F72 a F78).

---

## 2. O que está saudável

**A sincronização voltou e está verde.** Última rodada 29/08 23:50, sem erro,
com "pagamentos: 2646 linhas enviadas". As 2.621 parcelas que ficaram
travadas por dias entraram — o 42P10 do índice parcial acabou. E o F78 nomeou
a causa raiz da queda seguinte, que era outra: a chave nova do Supabase
(`sb_secret_…`) **não é JWT**, e ia também no header `Authorization`; o
gateway tentava lê-la como JWT e recusava tudo com "Invalid API key" mesmo
com a chave certa. Hoje ela vai só no `apikey`.

**O site publicado é exatamente o arquivo de trabalho.** `crm/fase2/app.html`
e `docs/crm/index.html` são byte a byte idênticos (1.224.660 bytes). Não há
versão zumbi no ar.

**Testes: 199 do Python, 281 do node e 59 de tela passando, nenhum
vermelho.** A suíte de extração do To Do continua inteira, com os casos-ouro
dos bugs antigos.

**A suíte de navegador virou patrimônio — e agora roda sozinha.**
`crm/fase2/testes/cadastro/` tem **59 provas de tela**, e desde 30.08 um
workflow as executa a cada mexida no app. É a primeira vez que a tela — e não
só a lógica — tem rede de proteção de verdade.

**O esquema do banco está documentado em sete arquivos SQL**, com o
`schema_conferencia.sql` que só devolve ✅/❌ sem alterar nada. Foi ele que
revelou, em produção, que o índice das parcelas não tinha entrado.

---

## 3. O que está quebrado agora

### 3.1 A importação do PAT rodava sem teste (RESOLVIDO em 30.08)

O único teste vermelho da casa era este:

```
not ok 289 - a cópia dentro do app.html é idêntica à testada aqui
  crm/fase2/robo-pat/testes/importar.test.js:234
  error: 'andamentoDaMudanca divergiu de importar.js'
```

O F44 alterou a lógica **dentro do `app.html`**, que é onde a importação de
fato roda — o `app.html` é arquivo único e não faz `require`. O
`crm/fase2/robo-pat/importar.js` é o **gêmeo testado**: a mesma lógica em
módulo, existindo só para a suíte do node poder exercitá-la. Ele ficou para
trás em duas funções, `andamentoDaMudanca` e `planoDeImportacao`.

Ou seja: o comportamento em produção estava certo — **o que estava errado era
a cobertura**. O `assert` estourava na primeira função e nem chegava a
comparar a segunda, então a divergência do `planoDeImportacao` (o bloco
inteiro das movimentações do F44, ~1.000 caracteres) estava escondida atrás
da primeira. A importação que toca cem requerimentos de uma vez passou
semanas sendo verificada contra uma versão antiga de si mesma.

**Consertado em 30.08:** o F44 foi portado para o gêmeo (as duas funções,
mais o `movimentacoes` do resumo), o teste que afirmava o comportamento
antigo foi reescrito, e entraram **três casos-ouro** para o bloco das
movimentações — a que só mudou de carimbo vira novidade, a já vista não
volta na importação seguinte, e a que já tem motivo não duplica. As 11
funções gêmeas voltaram a bater. Suíte do node: **281 passando, 0 falhando**.

### 3.2 A suíte de navegador nunca tinha rodado (RESOLVIDO em 30.08)

Os 59 programas de `testes/cadastro/` são provas de tela: cada um sobe um
servidor, abre o Chromium, finge o Supabase e sai com código 1 se falhou.
Ótimo para depurar uma prova; péssimo para conferir 59 antes de publicar —
ninguém roda 59 comandos na mão. Resultado: a suíte existiu semanas
versionada **sem nunca ter rodado inteira**.

E cada prova serve o `app.html` da própria pasta, um arquivo que não está no
git. Sem o passo de copiar `crm/fase2/app.html` para lá, a prova pode estar
falando de uma cópia de duas semanas atrás — ou não rodar de todo.

**Consertado em 30.08:** o corredor `rodar.js` (copia o app, roda as 59 em
paralelo, imprime o placar de cada uma e devolve o log das que falharam) e o
workflow `testes-tela.yml`, que roda tudo a cada push que toque o `app.html`
ou a pasta, com cache do navegador e as capturas guardadas quando algo falha.

**A primeira rodada completa já encontrou uma prova podre:** `julgamento.js`
falhava 8 de 11 asserções porque a fixtura usava a data absoluta 25/08/26 —
que virou passado, e o detector de agendamento, corretamente, ignora data no
passado. O `novidades.js` já tinha aprendido essa lição e usa datas
relativas; o `julgamento.js` ficou para trás. Passado para `mais(n)`, com o
salto caindo sempre em dia útil. **Placar hoje: 59/59.**

### 3.3 303 casos invisíveis em todas as listas — e piorando

| | 15.08 | 30.08 |
|---|---|---|
| casos fora das listas mapeadas | 194 | **303** |
| casos sem lista nenhuma | 6 | **9** |
| casos com fase `outro` | 194 | **258** |
| clientes sem CPF | 243 | **271** |

De **3.203 casos**, 312 não aparecem em lista alguma da barra lateral. Eles
estão no banco, contam nos totais, e ninguém os vê trabalhando. E o número
subiu ~55 % em duas semanas — o ritmo de entrada é maior que o de
classificação, então isso não se resolve sozinho.

Os **271 clientes sem CPF** são o mesmo problema por outro lado: sem CPF não
há geração de documento, não há busca confiável e não há casamento com o
portal.

### 3.4 Coisas que entraram no ar e ninguém usou ainda

| tabela / campo | linhas | leitura |
|---|---|---|
| `analises_direito` | **0** | a aba ⚖️ (F48/F49) está de pé, vazia |
| `acompanhamento` | 3 | o F68 mal começou |
| `lembrete_avisos` | 1 | idem |
| `clientes.endereco` | 1 (0,1 %) | — |
| `rg`, `estado_civil`, `profissao`, `nome_mae`, `pis_nit` | **0 %** | os campos da F9 |
| `exigencia_prazo`, `dcb` | 0 % | — |
| `campos` (jsonb do cadastro) | 30 | — |

Isto merece uma frase franca: **os sete campos que a F9 criou para gerar os
documentos do escritório estão todos em zero.** Os documentos continuam sem
matéria-prima. Ou o preenchimento não tem porta fácil na tela, ou não entrou
na rotina de quem atende — mas do jeito que está, a F9 é uma promessa não
cobrada.

Em contraste, o que **está** sendo usado: `andamentos` 23.381 (21.497 do To
Do, 875 do CRPS, 577 do PAT, 386 do PJe, 46 escritos no CRM), `sugestoes` 319,
`coletas` 176, `pagamentos` 2.646.

---

## 4. O risco estrutural

**Um arquivo de 18.702 linhas com 916 funções e 76 globais.** Cada rodada é
mais barata de escrever e mais cara de conferir. Três sintomas já mensuráveis:

- **duas cópias da mesma lógica** (o item 3.1) — o teste pegou, mas só a
  primeira das duas divergências: o `assert` estoura e para;
- **37 funções órfãs** (definidas e nunca chamadas). Código que não roda mas
  ocupa espaço de leitura e finge estar vivo;
- **609 `style=` escritos dentro de template** e mais 103 `elemento.style.X =`
  no JavaScript. Cada um é uma decisão visual fora do CSS, invisível para
  quem procura por classe;
- funções longas demais para caber na cabeça: `blocoDecisao` (252 linhas),
  `honorAjusteDe` (170), `irSubAnot` (165).

Não estou propondo reescrever nada. O ponto é outro: **o custo de errar
subiu**, e a defesa barata é a suíte. Desde 30.08 ela está inteira e rodando
sozinha (199 + 281 + 59, tudo verde) — o que muda o cálculo das próximas
rodadas: dá para mexer no arquivo grande e descobrir o estrago em dois
minutos, em vez de descobrir pelo print do Paulo.

---

## 5. Se fosse escolher a próxima rodada

Na ordem em que eu faria, do mais barato ao mais caro:

1. ~~O gêmeo do PAT~~ — **feito em 30.08** (seção 3.1).
2. ~~A suíte de navegador no GitHub~~ — **feito em 30.08** (seção 3.2).
3. **Uma tela para os 312 casos sem lista.** Não é classificar 312 casos à
   mão: é ter onde vê-los, com o botão que joga cada um na lista certa. Hoje
   eles são invisíveis por construção.
4. **Descobrir por que os campos da F9 estão em zero.** Antes de escrever
   qualquer coisa nova de cadastro, vale abrir a tela e tentar preencher um
   cliente do começo ao fim. Se travar em algum ponto, é ali que está a
   resposta — e é conserto pequeno.
5. **Os 271 clientes sem CPF** — provavelmente vindos do To Do sem `#CPF` no
   título. Dá para listar e resolver aos poucos, mas só depois do item 4,
   porque o cadastro é a porta.

---

## 6. Como estes números foram obtidos

- estrutura do `app.html`: `python3 cowork/mapa_app.py` (gera
  `cowork/03-MAPA-APP.md` e `cowork/mapa_app.json`);
- banco: `python3 crm/fase2/dossie_banco.py`, que só faz `GET`/`HEAD` e usa
  `limit=0` com `Prefer: count=exact` — nenhum dado de cliente sai de lá;
- testes: `python3 -m pytest tests/ -q`, `node --test "crm/fase2/*/testes/*.test.js"`
  e `node crm/fase2/testes/cadastro/rodar.js`;
- sincronização: log do job da `crm-sync.yml` no GitHub Actions.

Nenhum nome, CPF, telefone ou texto de andamento foi lido para escrever este
arquivo.
