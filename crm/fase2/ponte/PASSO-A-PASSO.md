# Ligando a ponte do WhatsApp — passo a passo

Feito para a primeira instalação, com **um número de teste**. Só depois que
tudo funcionar é que se troca para o número do escritório (passo 10).

Tempo: uns 30 minutos, quase todos esperando download.

---

## 0. O que ter em mãos antes de começar

- A máquina que fica ligada, com acesso à internet.
- O endereço e a chave do Supabase: **Settings → API**. São dois valores —
  *Project URL* e *service_role* (esta fica escondida atrás de "Reveal").
- Um **segundo celular ou segundo número** de WhatsApp, o de teste.
- Um terceiro aparelho (o seu celular pessoal serve) para mandar mensagem
  para o número de teste.

> A `service_role` entra em tudo no banco sem passar por nenhuma trava. Ela
> vai viver só nessa máquina. Não mande por WhatsApp, não cole em e-mail e não
> tire print dela.

---

## 1. Preparar o banco

No Supabase, **SQL Editor → New query**, cole o conteúdo inteiro de
`crm/fase2/schema.sql` e rode. Pode rodar em cima do que já existe: ele só
cria o que falta e não apaga nada.

Confira que apareceram as tabelas novas:

```sql
select table_name from information_schema.tables
 where table_name like 'zap_%';
```

Devem aparecer três: `zap_conversas`, `zap_mensagens`, `zap_transferencias`.

---

## 2. Instalar o Node na máquina

Precisa ser a versão 20 ou mais nova.

**Windows** — baixe o instalador LTS em <https://nodejs.org> e siga o
"avançar". Depois abra o **PowerShell** e confira:

```powershell
node --version
```

**Linux (Ubuntu/Debian)**:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version
```

**Mac**: `brew install node`

Se aparecer `v20.` ou maior, está pronto.

---

## 3. Levar os arquivos da ponte para a máquina

Se a máquina tem `git` e acesso ao repositório:

```bash
git clone <o endereço do repositório> crm-tercini
cd crm-tercini/crm/fase2/ponte
```

Se não tem, copie a pasta `crm/fase2/ponte/` inteira por pendrive ou pelo
Drive. São cinco arquivos que importam: `ponte.js`, `normalizar.js`,
`conferir.js`, `package.json` e `.env.exemplo`.

---

## 4. Preencher o `.env`

```bash
cp .env.exemplo .env          # Windows: copy .env.exemplo .env
```

Abra o `.env` (bloco de notas serve) e preencha as duas primeiras linhas:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...
```

Sem aspas, sem espaço sobrando, sem barra no fim do endereço.

---

## 5. Instalar as bibliotecas e conferir

```bash
npm install
node conferir.js
```

O conferidor testa o endereço, a chave, as tabelas, as funções e o balde de
arquivos — e diz em português o que estiver faltando. **Só siga quando ele
terminar com "Tudo certo".** É de propósito que ele venha antes do QR: chave
errada descoberta depois de ler o QR é tempo jogado fora.

---

## 6. Subir a ponte e ler o QR

```bash
node ponte.js
```

Vai aparecer um QR code no terminal. No **celular do número de teste**:
WhatsApp → **Configurações → Dispositivos conectados → Conectar dispositivo**
→ aponte a câmera para o QR.

Quando conectar, o terminal escreve `WhatsApp conectado como ...`.

Deixe essa janela aberta. Ela é a ponte funcionando.

---

## 7. O teste que prova que funciona

Do **seu celular pessoal**, mande uma mensagem qualquer para o número de
teste. Depois, no SQL Editor do Supabase:

```sql
select c.telefone, c.nome_perfil, m.direcao, m.tipo, m.texto, m.status, m.quando_wa
  from zap_mensagens m
  join zap_conversas c on c.id = m.conversa_id
 order by m.criado_em desc
 limit 20;
```

A mensagem tem de estar ali, com `direcao = entrada`. Mande também uma foto e
um áudio — as três formas precisam aparecer.

Para ver se a ponte está viva a qualquer momento:

```sql
select * from config_app where chave like 'zap_%';
```

- `zap_status` → `ligado` é o que se quer ver
- `zap_visto_em` → atualiza a cada 30 segundos; se parou, a ponte morreu

---

## 8. Responder pelo banco (enquanto a tela não existe)

Ainda não há caixa de entrada no CRM — ela vem na próxima rodada. Mas dá para
provar o caminho de volta. Troque o número pelo do seu celular pessoal:

```sql
insert into zap_mensagens (conversa_id, direcao, texto, status)
select id, 'saida', 'Teste de resposta saindo do CRM 👋', 'fila'
  from zap_conversas
 where chave = fone_chave('16999990000');
```

Em até dois segundos a mensagem chega no seu celular, e a linha vira
`status = 'enviada'`. Se der errado, ela vira `erro` com o motivo escrito no
campo `erro` — nunca some calada.

---

## 9. Deixar ligada de verdade

Enquanto a janela do terminal estiver aberta, funciona. Para sobreviver a
reinício da máquina:

**Linux (systemd)** — crie `/etc/systemd/system/ponte-zap.service`:

```ini
[Unit]
Description=Ponte WhatsApp do CRM Tercini
After=network-online.target

[Service]
WorkingDirectory=/caminho/completo/ate/ponte
ExecStart=/usr/bin/node ponte.js
Restart=always
RestartSec=10
User=SEU_USUARIO

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ponte-zap
sudo journalctl -u ponte-zap -f      # acompanhar
```

**Windows** — o caminho mais simples é o `pm2`:

```powershell
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start ponte.js --name ponte-zap
pm2 save
pm2 logs ponte-zap
```

---

## 10. Trocar do número de teste para o do escritório

Só depois que o passo 7 e o 8 funcionarem, e de preferência depois que a
caixa de entrada existir no CRM.

```bash
# pare a ponte primeiro (Ctrl+C, ou: sudo systemctl stop ponte-zap)
rm -rf sessao/            # Windows: rmdir /s sessao
node ponte.js             # aparece um QR novo — leia com o celular do escritório
```

Apagar a pasta `sessao/` é o que desliga o número antigo. **Nunca** rode duas
pontes no mesmo número ao mesmo tempo: elas brigam e derrubam as duas.

Depois de trocar, vale limpar as conversas do teste:

```sql
delete from zap_conversas where chave = fone_chave('SEU_CELULAR_DE_TESTE');
```

---

## 11. Quando der errado

| O que aparece | O que é | O que fazer |
|---|---|---|
| `Cannot find module '@whiskeysockets/baileys'` | faltou instalar | `npm install` na pasta da ponte |
| conferidor diz "chave PÚBLICA" | pegou a `anon` | Settings → API → service_role → Reveal |
| conferidor diz "tabela não existe" | schema não rodou | rode o `schema.sql` no SQL Editor |
| QR aparece de novo sozinho | sessão caiu no celular | releia o QR; se repetir, apague `sessao/` |
| `caiu 401 (sessão encerrada no celular)` | alguém desconectou o aparelho no WhatsApp | releia o QR |
| mensagem parada em `fila` | ponte desligada | veja `zap_status`; suba a ponte |
| mensagem em `erro` | leia o campo `erro` | número sem WhatsApp é o motivo mais comum |
| nada chega, mas a ponte diz "ligado" | mensagem de grupo | grupo é ignorado de propósito |

Guarde uma cópia da pasta `sessao/` depois que tudo estiver funcionando: com
ela, trocar de máquina não exige ler o QR outra vez.
