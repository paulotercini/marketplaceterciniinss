# Recursos (CRPS) — como puxar os andamentos

Há dois caminhos. Comece pelo **Plano B**, que é o confiável.

## ⭐ Plano B (recomendado): coletar no seu navegador

O e-Recursos bloqueia acesso automatizado de fora (trava a conexão, recusa o
token) — nenhum truque engana isso; só um navegador de verdade passa. Então a
coleta roda no SEU navegador logado, e só o resultado vem para o CRM.

Três passos, na pasta `robo-crps` (com o `.env` já preenchido):

1. **`node preparar.js`** — lê no banco os recursos a consultar e escreve o
   arquivo `coletar.txt`.
2. **Colете no navegador**: abra `consultaprocessos.inss.gov.br` e faça login.
   Aperte **F12 → Console** (se pedir, digite `allow pasting` e Enter). Abra
   `coletar.txt`, copie **tudo**, cole no Console e rode. Ele consulta cada
   recurso (devagar, sem travar, porque é o navegador de verdade) e ao final
   **baixa `crps_coletado.json`**. Mova esse arquivo para a pasta `robo-crps`.
3. **`node ingerir.js crps_coletado.json`** — grava tudo no CRM, traduzido,
   comentando nas fichas só o que é novo.

Recarregue o CRM e veja a aba **🖥 Recurso (CRPS)** das fichas. Para atualizar
depois, repita os três passos (é rápido: só muda o que mudou).

### Os acórdãos ficam guardados no CRM

O coletor também baixa o **PDF de cada acórdão e decisão monocrática** (só
esses: baixar o acervo inteiro traria CNIS, laudos e petições, muitos megas e
pouco proveito). O `ingerir.js` guarda cada um no Storage do Supabase, no
mesmo balde fechado dos outros anexos, e prende ao andamento.

Cada PDF aparece no Console com o tamanho: um acórdão de verdade tem dezenas
de KB. Se aparecer um aviso em vez do tamanho, aquele documento não desceu —
o andamento entra igual, só sem a cópia, e o próximo coletar tenta de novo.
Arquivo vazio não é guardado: o `ingerir.js` confere os bytes antes de subir.

Na ficha, o andamento da decisão ganha o botão **📄 abrir acórdão** — que
funciona **sem precisar estar logado no gov.br**, por qualquer pessoa da
equipe, e continua funcionando mesmo que o processo saia do ar.

Tamanho: os acórdãos têm 70–90 KB. Nos 47 recursos isso dá algo entre 4 e
10 MB no total — cabe folgado no plano gratuito do Supabase (1 GB).

⚠ São documentos sigilosos. Ficam no balde `anexos`, que só quem tem login
enxerga — o mesmo grau dos anexos que a equipe já troca pelo WhatsApp.

### O resumo do que a decisão decidiu

Guardar o PDF é uma coisa; saber o que ele decidiu, sem abrir, é outra. O
`resumir.js` lê cada acórdão guardado e escreve duas ou três linhas na ficha,
logo abaixo do arquivo:

```
📄 abrir acórdão
  ↳ resumo automático · confira no acórdão
    • Reconheceu como especiais os períodos de 01/01/2000 a 10/03/2002
    • Não reconheceu o direito à aposentadoria por tempo de contribuição
```

```
node resumir.js             # SECO: escreve resumos_para_conferir.txt, não grava
node resumir.js --aplicar   # publica nas fichas
node resumir.js --regras    # força o motor de regras (sem IA, sem custo)
```

**Dois motores fazem o mesmo trabalho.** Você não precisa escolher: o
programa escolhe sozinho.

| | REGRAS | CLAUDE |
|---|---|---|
| Custo | zero | uns centavos por decisão |
| Onde roda | nesta máquina | na API |
| O acórdão sai daqui? | não | vai para a API |
| Cobertura | o dispositivo no padrão do CRPS | também os fora do padrão |
| Digitalizado (sem texto) | não lê | lê |

O motor de **regras** lê o dispositivo como o extrator do To Do lê os blocos
das tarefas: "ACORDAM ... em conhecer do recurso e dar-lhe provimento parcial,
para reconhecer como especial o período de X a Y, determinando a averbação"
é formulário, e formulário se lê com regra. Onde o texto foge do padrão, ele
**cala** — some com o resumo, não inventa um.

Ele é o motor quando não há `ANTHROPIC_API_KEY` no `.env`, quando você passa
`--regras`, e também **quando a API fica sem crédito no meio da rodada**: o
programa avisa e segue pelas regras em vez de parar.

Para usar o Claude (mais cobertura), acrescente `ANTHROPIC_API_KEY=` no `.env`
e tenha crédito em console.anthropic.com → Plans & Billing. Dá para fazer os
dois: rodar tudo pelas regras primeiro e, depois, `--refazer` só o que ficou
sem resumo — aí o custo é só dos difíceis.

**Leia o arquivo antes de aplicar.** É conteúdo jurídico com o seu nome: o
modo seco existe para você conferir os resumos de uma vez, em vez de descobrir
um erro dentro da ficha de um cliente.

Como é feito, e por que assim:

- Só o **dispositivo** — a parte que decide. Fundamentação não entra.
- Verbos fechados (Reconheceu / Não reconheceu / Determinou / Converteu…) e
  datas em DD/MM/AAAA. No máximo 4 linhas.
- **Nada de dado médico**: doença, CID e laudo não viram texto na ficha. Há uma
  conferência do lado de cá que barra a linha mesmo se o texto vier com isso —
  a mesma barreira do `is_internal()` no extrator do To Do.
- **Na dúvida, cala.** Dispositivo confuso vira "sem resumo", não vira chute.
  Buraco é melhor que erro: alguém do escritório age em cima disso.

Na ficha, o resumo nasce **âmbar** ("resumo automático · confira no acórdão").
Quem confere clica em **conferido** e ele fica **verde** com a inicial de quem
conferiu. **Corrigir** abre o texto para editar: corrigido à mão vira `curado`
e o resumidor nunca mais toca nele (mesma proveniência dos processos).

### Quem julgou: Junta ou Câmara

O CRPS tem dois andares, e a diferença é prazo:

| | Junta de Recursos | Câmara de Julgamento |
|---|---|---|
| Instância | 1ª | 2ª |
| Julga | recurso ordinário | recurso especial |
| Perdeu ali | cabe **Recurso Especial em 30 dias** | acabou a via administrativa — o caminho é o Judiciário |

Na ficha, cada decisão leva a etiqueta do órgão ao lado — **azul** para a
Junta, **roxa** para a Câmara — e a mesma etiqueta aparece na linha
"Situação", tirada da decisão mais recente.

```
⛔ Recurso negado   ⚖️ 25ª Junta de Recursos 1ª inst.   📄 abrir acórdão
✅ Recurso PROVIDO  ⚖️ 4ª Câmara de Julgamento 2ª inst.  📄 abrir acórdão
```

O nome sai do próprio acórdão, da linha em que o colegiado se identifica
("ACORDAM os membros da 2ª Composição Adjunta da 10ª Junta de Recursos" — a
composição adjunta é uma turma da mesma Junta, a instância não muda). Sem PDF
guardado, vale a sigla do e-Recursos (`25ª JR/3080/2025`, `2ª CAJ/1474/2026`).
Não achou nos dois, fica sem etiqueta — não chuta.

```
node marcar_orgao.js             # SECO: mostra o que gravaria
node marcar_orgao.js --aplicar   # grava
node marcar_orgao.js --refazer   # refaz também os automáticos
```

Custo zero: lê os PDFs nesta máquina, sem IA e sem coletar nada de novo.

### O que chega nos Andamentos do Escritório

Cada movimentação nova do recurso vira um comentário na ficha, escrito pelo
**C** (o Claude da equipe). A decisão vem com duas linhas — a segunda diz o
próximo passo, que é o que some quando alguém lê "Recurso negado" e não sabe
de que instância veio:

```
🖥 CRPS · 12/11/2025 — ⛔ Recurso negado · 25ª Junta de Recursos
⚠ Da Junta cabe Recurso Especial em 30 dias da ciência. Confira o acórdão na aba 🖥 Recurso (CRPS).
```

**⭐ só onde importa.** O e-Recursos mexe no processo o tempo todo, e marcar
tudo como importante é o mesmo que não marcar nada. Acendem o ⭐ do processo
sozinhas apenas a **decisão** (acórdão, monocrática, embargos) e a **pauta**:
uma abre prazo, a outra tem data marcada. O resto chega como comentário e
espera a sua leitura.

Se alguma outra movimentação merecer destaque, cada linha da aba 🖥 Recurso
tem uma **estrela própria**. Acender ali destaca a movimentação *e* acende o
⭐ do processo — é ele que faz o caso pular para a frente nas listas. Apagar a
estrela da movimentação não apaga a do processo: quem decide que o assunto
morreu é você, no botão do composer. Os destaques sobrevivem às coletas
seguintes.

### Um caso para cada recurso

Cada recurso administrativo tem **número de protocolo próprio**, prazo
próprio e decisão própria. Empilhar dois numa ficha só faz o CRM mentir de
três jeitos: a Situação do caso vira a de um recurso escolhido por acaso; o
comentário do robô cai numa linha do tempo compartilhada e ninguém sabe de
qual recurso é aquele "Recurso negado"; e encerrar o caso quando um recurso
acaba enterra os outros junto.

Na aba 🖥 Recurso, o caso com mais de um número mostra o aviso e o botão
**✂️ Separar em N casos**. Antes de gravar qualquer coisa ele confere que
nenhum recurso e nenhum histórico ficaria para trás — e recusa a separação se
a conta não fechar.

O que cada caso novo leva: o cliente, o benefício, a fase, a espécie, as
datas (DER/DIB/DII/DAT), a parceria e a equipe atribuída — e o histórico do
**seu** recurso. O que **não** leva: os comentários do escritório. Um
comentário pertence ao dia em que foi escrito, e adivinhar de qual recurso
ele falava seria inventar; eles ficam no caso de origem, e os dois lados
ganham uma nota dizendo o que aconteceu.

Daí em diante a situação não se repete: ao colar um segundo número num caso
que já tem recurso, o CRM abre **caso novo** em vez de empilhar.

### O recurso que o robô não enxerga

O e-Recursos só devolve os processos ligados ao **CPF do procurador**. Quando
o recurso não está vinculado — protocolo feito por outro advogado, cadastro
que o INSS não corrigiu — a consulta automática não vê nada, e a única saída é
alguém abrir o site e olhar.

Na aba 🖥 Recurso, ao lado do número, tem o botão **🔎 consulta manual**. Ele
marca o recurso como "gente confere" e pergunta **quem** e **de quanto em
quanto tempo** (7, 15 ou 30 dias).

A partir daí:

- O número **sai do coletor**. Antes ele era pedido toda rodada, dava erro e
  ainda gastava a pausa de 3 segundos entre as chamadas.
- O recurso aparece no **Meu Dia de quem confere**, no dia certo, na lista
  "🔎 Consultar no e-Recursos". É isto que substitui a tarefa do To Do.
- Cada olhada tem dois desfechos, e a diferença entre eles é o ponto:

| botão | o que faz |
|---|---|
| **✓ conferido, sem novidade** | carimba quem olhou e quando, adia para a próxima data. **Não escreve comentário.** |
| **✎ teve andamento…** | vira comentário na ficha (`🔎 CRPS (consulta manual) — …`) e acende o ⭐ do processo |

**Conferir não é andamento.** No To Do, cada olhada que não achava nada virava
mais um "não houve andamento" — ao fim de um semestre a ficha tinha vinte
linhas dizendo que nada aconteceu, e mesmo assim ninguém sabia se a consulta
*desta* semana tinha sido feita. Aqui as vinte linhas viram uma:

```
🔎 consulta manual · 44233139765202537
   ⏰ conferir agora    conferido 6× · última em 05/08/2026 (D)
```

A próxima data conta **do dia em que se conferiu**, não da data que estava
marcada — quem olhou com três dias de atraso não é cobrado de novo amanhã.

Quando o INSS vincular o processo, o botão **🤖 voltar ao automático** devolve
o número ao robô. O histórico das conferências fica: é o registro do trabalho
que foi feito à mão. E se a coleta trouxer sozinha um número que estava na
lista manual, a ingestão percebe, tira a marca e avisa.

### Corrigi uma regra — preciso coletar tudo de novo?

Não. Cada andamento guarda o texto cru do e-Recursos, então o rótulo pode ser
recalculado sem sair da máquina:

```
node recolar_rotulos.js             # SECO: mostra "era / fica" de cada um
node recolar_rotulos.js --aplicar   # grava
```

Ele mexe só no rótulo. Arquivos, PDFs guardados e resumos ficam como estão.

---

# Plano A: robô de fora (fica de reserva)

O robô consulta de fora, na máquina-servidor. **Hoje o e-Recursos bloqueia
esse acesso** (por isso o Plano B), mas o robô continua no projeto caso o
bloqueio mude, e serve de molde para o "Andamentos INSS" e o PAT no futuro.

## Robô dos recursos (CRPS) — instalação na máquina-servidor

O robô consulta os recursos no e-Recursos do INSS e escreve os andamentos nas
fichas, do jeito que o DataJud faz com o CNJ. Ele mora na **mesma máquina da
ponte do WhatsApp** (a que fica sempre ligada) e usa a `service_role` do
Supabase, que só existe ali.

O login do gov.br **não pode ser automatizado** (o captcha barra robô). Por
isso o robô usa um "crachá" que o Paulo renova pelo CRM quando cai — nunca
precisa digitar senha aqui.

## 1. Instalar (uma vez)

Na pasta `crm/fase2/robo-crps`:

```
npm install
cp .env.exemplo .env
```

Edite o `.env` e preencha `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` (a mesma
service_role que a ponte usa — está no Supabase em Settings → API).

## 2. Colar o primeiro crachá (no CRM, uma vez por sessão)

1. No navegador, entre em `consultaprocessos.inss.gov.br` e faça login no gov.br.
2. Clique no atalho **Copiar crachá do CRPS** (arraste o botão da tela
   ⚙️ Configurações → Recurso CRPS para a barra de favoritos na primeira vez).
3. Volte ao CRM, ⚙️ Configurações → Recurso CRPS, cole no campo e **Salvar**.

## 3. Rodar

```
npm run robo
```

Ele consulta cada caso que tenha número de recurso, devagar (6s entre um e
outro), grava o histórico e — quando há novidade — escreve um comentário na
ficha assinado pelo Claude. Na primeira carga de cada processo ele só preenche
o histórico, sem encher a ficha de comentários.

## 4. Rodar sozinho todo dia

**Windows (Agendador de Tarefas):** crie uma tarefa que roda
`node robo.js` nesta pasta, uma vez por dia de manhã.

**Linux/Mac (cron):** `0 7 * * 1-5  cd /caminho/robo-crps && npm run robo`

## A sessão do gov.br dura pouco — como rodar

O crachá copiado vale só alguns minutos (o navegador renova sozinho; a cópia
não). Duas regras que resolvem isso:

1. **Renove o crachá LOGO antes de rodar** (passo 2, e já rode o passo 3).
   O robô mostra no começo quantos minutos o crachá ainda tem.
2. **Se ele cair no meio** ("crachá recusado"), não tem problema: ele salvou
   tudo o que já consultou. Renove o crachá e rode `npm run robo` de novo —
   ele **retoma de onde parou**, pulando o que já fez hoje. Repita até o robô
   dizer que não há mais nada por consultar. Na primeira vez, com o acervo
   todo, podem ser 2 ou 3 rodadas; depois é rápido.

O que aparece no meio é normal:
- **HTTP 403 / "sem acesso a este recurso"**: você não é procurador daquele —
  o robô pula e segue.
- **HTTP -1 / "sem dados"**: a consulta demorou demais e foi cortada; entra
  na próxima rodada.

Para forçar uma releitura completa (ignorando o "já fiz hoje"), rode com
`CRPS_REFORCAR=1` no `.env`.

## De onde vêm os números dos recursos

**A leitura não é automática.** O sistema só consulta os recursos cujo número
está cadastrado no caso. Um recurso novo não aparece sozinho — alguém precisa
colar o número **uma vez**. Depois disso ele entra em todas as coletas
seguintes, sem mais nenhum trabalho.

Como cadastrar (leva 20 segundos):

1. No e-Recursos, abra o processo do cliente e copie o número da barra de
   endereço — é a parte final da URL:
   `consultaprocessos.inss.gov.br/e/p/`**`44233139765202537`**
2. No CRM, abra a ficha do cliente e escolha o processo certo no menu de cima.
3. Vá na aba **🖥 Recurso (CRPS)**.
4. Cole o número no campo "+ número do recurso" e clique em adicionar.

Um caso pode ter **mais de um recurso** — embargos e recurso especial recebem
números novos. É só ir acrescentando: o campo aceita vários, cada um aparece
com o seu próprio histórico, e adicionar um não apaga os anteriores.

Para cadastrar muitos de uma vez, importe os favoritos (abaixo).

## Importar os favoritos de uma vez

O `importar_favoritos.js` lê o HTML dos favoritos exportado do navegador, casa
cada nome com o cliente do CRM e preenche o número do recurso.

1. Exporte os favoritos do navegador para um arquivo `.html` (no Comet/Chrome:
   Favoritos → Gerenciar → Exportar).
2. **Primeiro em modo seco** (não grava nada, só mostra o relatório):
   ```
   node importar_favoritos.js caminho\para\favoritos.html
   ```
   O relatório separa: os que vou vincular, os que já estavam, os "senha do
   cliente" (ficam com o André, fora do robô), e os que precisam da sua mão
   (cliente com vários casos, sem caso ativo, ou que não achei no cadastro).
3. Confira o relatório. Se estiver bom, rode **para valer**:
   ```
   node importar_favoritos.js caminho\para\favoritos.html --aplicar
   ```
4. Rode o robô: `npm run robo`.

Nada é adivinhado: quando um cliente tem mais de um caso, o número não é
gravado automaticamente — o relatório avisa para você escolher na ficha qual
caso recebe o recurso.
