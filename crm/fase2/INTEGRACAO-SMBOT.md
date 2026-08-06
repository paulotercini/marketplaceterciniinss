# Integração SMBot ↔ CRM Tercini

Documento para a equipe de tecnologia do SMBot.
Atualizado em 06.08.2026, depois das respostas do Alisson.

## O que ficou combinado a partir das suas respostas

Você disse três coisas, e cada uma muda um pedaço do desenho:

1. **Há webhook, mas ele não leva o conteúdo da mensagem.** Tudo bem: então a
   integração não é histórico de conversa, é **aviso de que alguém procurou o
   escritório**. O texto continua no painel de vocês, e é lá que a gente lê.
2. **Dá para mandar os dados do contato.** É o suficiente. Com telefone e nome
   o CRM já sabe se é cliente antigo ou gente nova, e abre a ficha certa.
3. **Não há webhook de mensagem enviada, mas há API de envio.** Sobre isso,
   veja a última seção — acho que aí houve um mal-entendido, e provavelmente
   não é preciso desenvolver nada.

**Não é preciso desenvolver uma API para o sentido SMBot → CRM.** O CRM roda
sobre Supabase (PostgreSQL + PostgREST), que já expõe uma API REST autenticada.
Existe um endpoint único e específico para o SMBot, e ele foi feito para
aceitar o corpo do webhook **no formato de vocês**, sem vocês adaptarem nada.

## O endpoint

```
POST https://SEU-PROJETO.supabase.co/rest/v1/rpc/smbot_contato
```

Cabeçalhos:

```
apikey: <chave publicável do projeto>
Authorization: Bearer <a mesma chave>
Content-Type: application/json
x-smbot-token: <segredo desta integração, entregue pelo escritório>
```

Corpo: **o que o webhook de vocês já manda**. O endpoint procura, no JSON
inteiro (inclusive dentro de objetos e listas aninhados):

| o que procuramos | chaves que reconhecemos |
|---|---|
| telefone (**único obrigatório**) | `telefone`, `phone`, `celular`, `whatsapp`, `msisdn`, `waid`, `fone`, `numero`, `number`, `from`, `remetente`, `contato`, `contact` |
| nome | `nome`, `name`, `pushname`, `contactName`, `fullName`, `displayName`, `contato`, `cliente` |
| conteúdo, se um dia existir | `mensagem`, `message`, `texto`, `text`, `body`, `conteudo`, `content`, `msg` |
| id da mensagem | `messageId`, `idMensagem`, `protocolo`, `ticket`, `msgId` |

Maiúsculas, acentos, `_` e `-` são ignorados na comparação: `Nome_Contato` e
`nomecontato` são a mesma chave. Se o token não puder ir no cabeçalho, mande-o
no corpo como `token`.

Estes três corpos funcionam igual:

```json
{"telefone": "+55 16 98888-1111", "nome": "João Batista"}
{"contact": {"phone": "5516988881111", "name": "João Batista"}}
{"evento": "mensagem_recebida", "dados": [{"celular": "16988881111"}]}
```

Exemplo completo:

```bash
curl -X POST "https://SEU-PROJETO.supabase.co/rest/v1/rpc/smbot_contato" \
  -H "apikey: SUA_CHAVE" -H "Authorization: Bearer SUA_CHAVE" \
  -H "x-smbot-token: SEGREDO-DA-INTEGRACAO" \
  -H "Content-Type: application/json" \
  -d '{"contact": {"phone": "+55 16 98888-1111", "name": "João Batista"}}'
```

Resposta:

```json
{"ok": true, "cliente_id": null, "lead_id": "8445c1d1-…",
 "lead_novo": true, "registrado": true, "com_texto": false}
```

Quando algo impede o registro:

```json
{"ok": false, "erro": "token inválido"}
```

O HTTP responde 200 nos dois casos — o que vale é o campo `ok`.

## O que o CRM faz com cada chamada

1. **Confere o token.** Sem ele, nada entra.
2. **Procura o telefone entre os clientes** do escritório, comparando os 8
   últimos dígitos — assim `+55 (16) 99999-0000`, `5516999990000` e
   `16999990000` são reconhecidos como a mesma pessoa.
3. **Sendo cliente**, o contato aparece na ficha dele: "falou pelo WhatsApp em
   06.08.2026 às 09:12". Nenhum lead é criado — quem já é cliente não volta
   para o funil de vendas.
4. **Não sendo cliente**, cria um lead na etapa "novo", origem "whatsapp" — ou
   reaproveita o lead que aquele número já tenha em aberto, para uma conversa
   de dez mensagens não virar dez leads.
5. **Não repete.** Sem o conteúdo, cada número registra no máximo uma passagem
   a cada 10 minutos; com conteúdo, o mesmo `messageId` nunca entra duas vezes.
   Pode reenviar a chamada com segurança se a rede falhar.

Como o conteúdo não vem, o CRM mostra o aviso e o atendente abre o SMBot para
ler. Se algum dia o webhook passar a carregar o texto, ele começa a ser
gravado sozinho — não é preciso mexer em nada dos dois lados.

## Segurança

- O token **não é** a chave do banco. É um segredo só desta integração; se
  precisar, troca-se sem mexer em mais nada.
- Essa função é a **única** coisa que o SMBot alcança. Com essas credenciais
  não se lê ficha, senha, processo nem documento de cliente algum — as demais
  tabelas exigem login de colaborador e são protegidas por RLS.
- A função só grava contato. Não há como apagar nem alterar dado existente
  por ela.

## O caminho inverso (CRM → SMBot)

Aqui acho que houve um mal-entendido, e vale conferir: você escreveu que
*"temos uma api para enviar mensagem, porém ainda assim precisaríamos criar
uma API pra receber essa mensagem do seu CRM e propagar na SMBot"*.

Se a API de envio de vocês já existe, **é o nosso CRM que chama a API de
vocês**. Não há nada a receber do nosso lado nem a desenvolver do seu: o CRM
faz o POST no endpoint de envio de vocês, com as credenciais que vocês
fornecerem. É o mesmo desenho do sentido de ida, só que ao contrário.

Para ligar isso, precisamos de três respostas:

1. **URL e autenticação** da API de envio, e o formato do corpo (um exemplo de
   `curl` que funcione basta).
2. A mensagem enviada por essa API **fica registrada na conversa do contato
   dentro do SMBot**? É o ponto que mais importa: se ficar, o atendente vê no
   painel de vocês o que o escritório mandou pelo CRM, e o histórico continua
   inteiro num lugar só.
3. Existe **modelo de mensagem** (template) a aprovar antes, como exige a API
   oficial do WhatsApp Business?

Enquanto isso não estiver ligado, o CRM abre o `wa.me` com a mensagem já
escrita, e o envio sai do aparelho de quem clicou.

## Resumo do que pedimos ao SMBot

- **Webhook de saída** apontando para a URL acima, com o cabeçalho
  `x-smbot-token`, disparado a cada mensagem recebida. O corpo pode ser o de
  vocês, do jeito que já é.
- **A documentação desse corpo** (ou um exemplo real), só para conferirmos que
  o telefone cai numa das chaves que reconhecemos.
- **Retentativa** em caso de falha temporária, se houver.
- As **três respostas** da seção acima, para o caminho de volta.
