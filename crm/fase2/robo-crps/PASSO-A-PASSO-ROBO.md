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

Uma vez, para ligar: acrescente `ANTHROPIC_API_KEY=` no `.env` (a mesma chave
do Claude que a rotina diária usa) e rode `npm install`.

```
node resumir.js             # SECO: escreve resumos_para_conferir.txt, não grava
node resumir.js --aplicar   # publica nas fichas
```

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
