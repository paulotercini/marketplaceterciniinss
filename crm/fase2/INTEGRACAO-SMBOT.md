# Integração SMBot → CRM Tercini

Documento para a equipe de tecnologia do SMBot.

## Resumo

**Não é preciso desenvolver uma API.** O CRM do escritório roda sobre
Supabase (PostgreSQL + PostgREST), que já expõe uma API REST autenticada. Foi
criado um endpoint único e específico para o SMBot: uma chamada HTTP POST por
mensagem recebida no WhatsApp.

Do lado do SMBot, o que se pede é o que qualquer plataforma de atendimento já
costuma ter: um **webhook de saída** — "quando chegar mensagem, chame esta
URL com este JSON".

## O endpoint

```
POST https://SEU-PROJETO.supabase.co/rest/v1/rpc/smbot_entrada
```

Cabeçalhos:

```
apikey: <chave publicável do projeto>
Authorization: Bearer <a mesma chave>
Content-Type: application/json
```

Corpo (JSON):

| campo | obrigatório | o que é |
|---|---|---|
| `p_token` | sim | segredo desta integração, entregue pelo escritório |
| `p_telefone` | sim | número do contato, em qualquer formato |
| `p_nome` | não | nome do contato, como o SMBot conhece |
| `p_texto` | não | conteúdo da mensagem |
| `p_externo_id` | recomendado | id da mensagem no SMBot |
| `p_de_cliente` | não | `true` (padrão) do cliente, `false` do atendente |
| `p_atendente` | não | quem respondeu, quando for do escritório |
| `p_beneficio` | não | assunto/benefício, se o bot perguntar |

Exemplo:

```bash
curl -X POST "https://SEU-PROJETO.supabase.co/rest/v1/rpc/smbot_entrada" \
  -H "apikey: SUA_CHAVE" -H "Authorization: Bearer SUA_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{
    "p_token": "SEGREDO-DA-INTEGRACAO",
    "p_telefone": "+55 16 98888-1111",
    "p_nome": "João Batista",
    "p_texto": "Quero saber se já posso me aposentar",
    "p_externo_id": "smbot-msg-8213",
    "p_de_cliente": true,
    "p_beneficio": "Aposentadoria por Idade"
  }'
```

Resposta:

```json
{"ok": true, "cliente_id": null,
 "lead_id": "8445c1d1-…", "conversa_id": "8ccefd69-…", "lead_novo": true}
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
3. **Sendo cliente**, a mensagem entra no histórico da ficha dele. Nenhum lead
   é criado: quem já é cliente não volta para o funil de vendas.
4. **Não sendo cliente**, cria um lead na etapa "novo", origem "whatsapp" — ou
   reaproveita o lead que aquele número já tenha em aberto, para uma conversa
   de dez mensagens não virar dez leads.
5. **Registra a mensagem.** Reenviar a mesma mensagem (mesmo `p_externo_id`)
   não duplica nada: pode repetir a chamada com segurança se a rede falhar.

## Segurança

- O token **não é** a chave do banco. É um segredo só desta integração; se
  precisar, troca-se sem mexer em mais nada.
- A função é a **única** coisa que o SMBot alcança. Com essas credenciais não
  se lê ficha, senha, processo nem documento de cliente algum — as demais
  tabelas exigem login de colaborador e são protegidas por RLS.
- A função aceita apenas gravar contato. Não há como apagar nem alterar dados
  existentes por ela.

## O caminho inverso (CRM → SMBot)

Hoje o CRM abre o WhatsApp com a mensagem já escrita (`wa.me`). Seria melhor
enviar pelo número oficial do escritório, com o histórico ficando no SMBot.
Para isso, precisamos saber do lado de vocês:

1. Existe **API de envio** de mensagem? Qual a URL, como se autentica e qual o
   formato do corpo?
2. Existe **modelo de mensagem** (template) a aprovar antes, como exige a API
   oficial do WhatsApp Business?
3. O envio aceita um **identificador nosso** de volta, para casar a resposta
   com o cliente certo?

## O que pedimos ao SMBot

- **Webhook de saída** configurável: URL, cabeçalhos e corpo em JSON, disparado
  a cada mensagem recebida (e, se possível, também a cada mensagem enviada
  pelo atendente).
- Se o webhook tiver **formato fixo**, tudo bem: mandem a documentação do
  formato que vocês entregam, e nós adaptamos do nosso lado — é mais rápido
  do que vocês desenvolverem algo sob medida.
- **Retentativa** em caso de falha temporária, se houver.
