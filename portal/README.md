# Portal de Andamentos — Tercini Advocacia

Portal estático que permite ao cliente consultar o andamento do seu processo
ou requerimento de benefício digitando **CPF + data de nascimento**.

## Como funciona

```
Microsoft To Do  ──►  gerar_portal.py  ──►  site/data/<hash>.json
                          (a cada 30min)            │
                                                    ▼
                                              cliente navega
                                              site/index.html
                                              digita CPF + DN
                                              JS deriva o hash
                                              baixa o JSON certo
                                              renderiza a página
```

Tudo é rebuildado por um GitHub Action a cada 30 minutos. Você atualiza o To
Do como sempre; o site reflete a mudança no próximo ciclo.

## Convenção para o To Do

Para uma tarefa aparecer no portal:

1. **Título** já deve estar no formato `Nome Sobrenome #CPF` (já é o padrão).
2. **Body** deve ter, em qualquer linha, o cadastro:

   ```
   DN: 07/06/1990
   ```

   (também aceita `DN = 07/06/1990` ou `dn: 07/06/1990` — case-insensitive)

3. Se a tarefa estiver em uma das listas internas (Pagamentos, Tarefas,
   Operacional, etc.) ela é **ignorada** no portal — veja a lista
   `LISTAS_EXCLUIR` em `gerar_portal.py`.

### O que o cliente vê

- **Status** atual (frase curta auto-gerada)
- **Próximo evento** em destaque (perícia, audiência, avaliação social)
- **Histórico** com marcos detectados automaticamente:
  - Ação judicial protocolada
  - Benefício requerido ao INSS
  - Decisão favorável / desfavorável
  - Prorrogação
  - Cessação programada (DCB)
  - Perícias médicas, sociais, audiências
- **Comunicados** — entradas marcadas `(PUB):` no body são mostradas na
  íntegra (use para mandar recados pro cliente). Ex.:

  ```
  07.06.2026 (PUB): Documentos recebidos. Aguardando análise do INSS.
  ```

### O que o cliente NÃO vê

Tudo que vai pro cliente é filtrado:
- Entradas internas `(P):`, `(A):`, `(M):`, `(D):`, `(I):` **não aparecem**
  na íntegra — apenas geram marcos categorizados no histórico
- Linhas `[BOT-LOG]` são removidas
- Telefones, observações privadas, valores de honorários, etc. **não** vão
  pro JSON
- Listas internas (Pagamentos, Operacional, Escrita…) são puladas

## Rodar localmente

```bash
# 1. gerar os JSONs (precisa do graph_tokens.json valido)
python3 portal/gerar_portal.py

# 2. servir o site
cd portal/site
python3 -m http.server 8000

# abrir http://localhost:8000
```

## Deploy

O workflow `.github/workflows/portal.yml` publica em **GitHub Pages**
(branch `gh-pages`). Para ativar:

1. Pelo Settings do repo → Pages → Source: branch `gh-pages` / pasta `/`
2. Garanta que o secret `GRAPH_TOKENS_JSON` já está configurado (já está,
   pois o bot_avisos também usa).

### Domínio próprio (recomendado)

Coloque um arquivo `portal/site/CNAME` com `andamento.tercini.adv.br` (ou
similar). Aponte o DNS via CNAME pro `paulotercini.github.io`. O HTTPS é
emitido automaticamente pelo Pages.

### Alternativa: Cloudflare Pages

Em vez de gh-pages, você pode conectar o repo no Cloudflare Pages, build
command `python3 portal/gerar_portal.py`, output dir `portal/site`.
Vantagem: build mais rápido, analytics nativo, proteção bot.

## Segurança

### Modelo de ameaça
Acesso é por CPF + DN, ambos dados **frequentemente vazados** no Brasil.
A proteção é:

- **PBKDF2-SHA256 com 200k iterações** no nome do arquivo. Cada tentativa
  de adivinhar leva ~200ms no navegador → bruteforce de 36.500 datas leva
  ~2h por CPF.
- **Sem listagem de diretório** (servido por GitHub Pages — não tem index).
- **`<meta robots noindex>`** evita indexação no Google.
- **Filtragem do body** — apenas marcos categorizados e `(PUB):`. Nada
  do body cru vai pro JSON.

### Riscos residuais
- Quem souber CPF + DN exatos de um cliente consegue ver os marcos. Isso
  é o design.
- Não há rate limit (impossível em estático). Para mitigar, considere
  passar o portal por trás do Cloudflare e ativar "Bot Fight Mode".

### Upgrades possíveis (se quiser fortalecer)
- Adicionar PIN de 4 dígitos (campo extra `PIN: XXXX` no body)
- Criptografar o conteúdo do JSON com chave derivada de CPF+DN
- Mover para Cloudflare Worker com rate limit por IP
