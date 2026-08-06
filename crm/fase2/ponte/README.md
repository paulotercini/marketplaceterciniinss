# A ponte do WhatsApp

Serviço que fica ligado numa máquina só e liga o WhatsApp do escritório ao
CRM. Lê o QR code uma vez, como o WhatsApp Web, e daí em diante:

```
WhatsApp  ──▶  zap_mensagens (entrada)  ──▶  aparece na ficha do cliente
CRM grava com status 'fila'  ──▶  ponte envia  ──▶  status 'enviada'
```

A ponte **não abre porta nenhuma**: só fala de dentro para fora, com o
Supabase. Não precisa de domínio, de certificado nem de firewall liberado.

## O que ela sabe fazer

- Recebe texto, foto, áudio, vídeo, documento e figurinha. A mídia sobe para
  o Storage do próprio CRM (balde `anexos`).
- Casa o número com o cliente ou o prospecto que já existe, pelos 8 últimos
  dígitos — o mesmo critério do resto do sistema.
- Ignora grupo e status: conversa com cliente é individual.
- Reenvia? Não sozinha. Mensagem que falha três vezes fica marcada como
  `erro`, para alguém ver e decidir — mensagem sumida em silêncio é pior.
- Marca entregue e lida quando o WhatsApp confirma.
- Publica o próprio estado em `config_app` (`zap_status`, `zap_visto_em`,
  `zap_qr`), para o CRM mostrar se ela está viva sem ninguém abrir o servidor.

## O que ela NÃO faz, de propósito

- Não dispara mensagem em massa e não tem lista de transmissão. Envia uma por
  vez, com pausa de 1 a 2 segundos, no ritmo de quem digita.
- Não responde sozinha. O chatbot vem depois, e vai escrever na mesma fila.
- Não entra em grupo, não lê status, não sincroniza histórico antigo.

## Instalar

**Primeira vez: siga o [PASSO-A-PASSO.md](PASSO-A-PASSO.md)**, que cobre desde
instalar o Node até provar que a mensagem vai e volta, usando um número de
teste. O resumo é este:

```bash
cd crm/fase2/ponte
cp .env.exemplo .env      # e preencha SUPABASE_URL e SUPABASE_SERVICE_KEY
npm install
node conferir.js          # confere banco, chave e Storage ANTES do QR
node ponte.js             # aparece o QR code; leia no celular do escritório
```

O QR aparece no terminal **e** vai para o banco, então dá para lê-lo de dentro
do CRM depois que a tela da caixa de entrada existir — quem instala não
precisa ser quem tem o celular na mão.

### Deixar ligada de verdade

Com `systemd` (Linux), em `/etc/systemd/system/ponte-zap.service`:

```ini
[Unit]
Description=Ponte WhatsApp do CRM Tercini
After=network-online.target

[Service]
WorkingDirectory=/opt/crm/ponte
ExecStart=/usr/bin/node ponte.js
Restart=always
RestartSec=10
User=crm

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ponte-zap
sudo journalctl -u ponte-zap -f     # ver o que está acontecendo
```

## A pasta `sessao/`

É a credencial do WhatsApp. Quem tiver essa pasta entra na conversa do
escritório — trate-a como senha:

- **não vai para o git** (já está no `.gitignore`);
- faça backup dela: sem backup, uma máquina perdida significa ler o QR de novo;
- se apagar, é só ler o QR outra vez.

## Rodar só um número

Uma sessão do WhatsApp por número. Duas pontes no mesmo número brigam entre
si e derrubam as duas. Se for preciso trocar de máquina, pare a primeira antes
de subir a segunda.

## Testes

```bash
npm test          # ou: node --test "testes/*.test.js"
```

Testam a tradução do que o Baileys entrega (tipo de mensagem, legenda de foto,
mensagem que some, o que ignorar) — sem rede e sem WhatsApp. O lado do banco
é testado em `crm/fase2/testes/zap.sql`.

## Sobre a biblioteca

Usa `@whiskeysockets/baileys`, que conversa com o WhatsApp Web. A API dela
muda com frequência: se um `npm install` novo quebrar a ponte, fixe no
`package.json` a versão que estava funcionando antes de investigar.
