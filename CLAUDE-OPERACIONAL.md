# CLAUDE-OPERACIONAL.md

Guia operacional dos acessos externos (To Do, Google Drive, conectores) e do que
sobrevive — ou não — a uma **sessão nova** do Claude Code na web.

Regra de ouro: uma sessão nova é um container clonado do zero. Só sobrevive o que
está **commitado no repo** ou cadastrado na **config do ambiente** (variáveis de
ambiente). Tokens em arquivo (`graph_tokens.json`) e qualquer coisa gravada "só na
sessão" **morrem** quando a sessão encerra.

---

## 1. Microsoft To Do (Graph API)

Cada tarefa do To Do é um cliente; é a fonte dos geradores do portal.

- **Login inicial** (uma vez, interativo): `python3 graph_devflow.py` (device flow).
  Gera `graph_tokens.json` (gitignored). O access token expira em ~1h.
- **Renovar antes de qualquer gerador**: `python3 graph_refresh.py`.

### Para funcionar em toda sessão nova (automático)

O `graph_tokens.json` é efêmero. Para o To Do renovar sozinho numa sessão nova,
cadastre na **config do ambiente**:

    GRAPH_REFRESH_TOKEN = <refresh_token atual>

Pegue o valor do campo `refresh_token` de `graph_tokens.json` depois de um login/refresh
bem-sucedido. O `graph_refresh.py` usa o arquivo se existir, senão cai para essa
variável. O hook de início de sessão (ver §4) roda o refresh automaticamente.

> O refresh token do Graph só cai por inatividade longa ou troca de senha/política de
> MFA da conta Microsoft. Nesses casos, refazer `graph_devflow.py` e atualizar a variável.

---

## 2. Google Drive

Há **dois caminhos independentes** para o Drive. Não confundir.

### (a) Conector MCP — sessão interativa (com você)

Preso à sua conta **claude.ai**. Funciona em toda sessão interativa normal, sem
configurar nada. Autenticado como **paulotercini@gmail.com** (mesma conta dona das
pastas dos clientes → upload cai no lugar certo). **Não** aparece em execução
automática sem você (cron/hook).

### (b) Script por refresh token — execução automática (sem você)

Para cron/hook, onde o MCP não existe. Usa `gdrive_client.py`, que lê **variáveis de
ambiente** (não arquivo):

    GDRIVE_CLIENT_ID
    GDRIVE_CLIENT_SECRET
    GDRIVE_REFRESH_TOKEN

Comandos:

```bash
python3 gdrive_client.py whoami     # mostra a conta autenticada (JSON)
python3 gdrive_client.py selftest   # sobe um arquivo no My Drive raiz e apaga (prova ponta a ponta)
python3 gdrive_client.py upload <arquivo_local> [parent_id] [nome]
```

Uso como biblioteca: `from gdrive_client import upload, find_folder, about, selftest`.

### Para funcionar em toda sessão nova (automático) — 2 passos manuais

1. **Cadastrar as três variáveis** `GDRIVE_*` na config do ambiente.
2. **Publicar o app** no Google Cloud como **"Em produção"**. Em "Em teste" o refresh
   token expira em 7 dias e o upload por script volta a falhar até refazer o login.

Enquanto os dois não estiverem feitos, uma sessão nova **não** tem upload por script
(só o conector MCP na sessão interativa). A conta do token tem que ser a **mesma** dona
das pastas dos clientes (`paulotercini@gmail.com`), senão o upload nas subpastas falha
por permissão.

---

## 3. Conectores MCP (Drive leitura/criação, Gmail, Agenda)

Presos à conta **claude.ai**. Seguem funcionando em sessão interativa normal. **Não**
aparecem em execução automática sem você (cron).

---

## 4. Hook de início de sessão

`.claude/settings.json` registra `.claude/hooks/session-start.sh`, que a cada sessão
(best-effort, nunca derruba a sessão):

1. instala `pytest` (a suíte `tests/` é pura, só precisa do runner);
2. renova o token do To Do (`graph_refresh.py`) — usa `graph_tokens.json` ou
   `GRAPH_REFRESH_TOKEN`;
3. confere as `GDRIVE_*` e reporta a conta do Drive (sem escrever nada).

O hook **só passa a valer para sessões futuras depois de mergeado na branch padrão**
(`main`). Cada saída é impressa no início da sessão, então dá para ver na hora o que
está disponível.

---

## 5. Checklist "abrir sessão nova e estar tudo funcionando"

| Acesso                     | Automático em sessão nova? | O que falta cadastrar |
|----------------------------|----------------------------|-----------------------|
| Testes (`pytest tests/`)   | Sim (hook instala)         | — |
| Drive — conector MCP       | Sim (sessão interativa)    | — |
| To Do — Graph              | Só com `GRAPH_REFRESH_TOKEN` no ambiente | variável no ambiente |
| Drive — script (cron)      | Só com `GDRIVE_*` + app "Em produção" | 3 variáveis + publicar app |

Variáveis e publicação do app são passos **manuais** no painel do ambiente e no Google
Cloud — o Claude não faz por você. Depois de feitos, chame numa sessão nova e rode
`python3 gdrive_client.py selftest` para confirmar o Drive por script na hora.
