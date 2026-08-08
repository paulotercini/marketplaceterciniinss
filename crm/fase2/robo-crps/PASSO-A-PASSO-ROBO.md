# Robô dos recursos (CRPS) — instalação na máquina-servidor

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

## Quando o crachá vencer

O robô não quebra: marca "crachá vencido" e para. O CRM mostra o aviso no
Meu Dia e em ⚙️ Configurações. É só refazer o passo 2 e o robô volta na
próxima rodada. Quanto tempo o crachá dura, a gente descobre no uso.

## De onde vêm os números dos recursos

Cada caso guarda o número em `crps_nup`. Você pode digitá-lo na ficha
(aba 🖥 Recurso → "número do recurso"), ou importar os favoritos de uma vez
(abaixo).

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
