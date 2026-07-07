"""Log de acesso append-only da integração Microsoft To Do (Graph).

Registra, em ``graph_access_log.jsonl``, cada evento de acesso/autenticação
(renovação de token, primeiro uso por uma rotina, erros) com metadados —
NUNCA o token em si. O arquivo é versionado no Git para preservar o
histórico de acesso entre as sessões efêmeras do Claude Code na web.

Formato de cada linha (JSON):
  {"ts": "2026-07-07T08:00:00-03:00", "evento": "refresh",
   "origem": "graph_refresh.py", "resultado": "ok", "expires_in": 3600,
   "scope": "Tasks.ReadWrite", "token_hash": "abc123def456"}

Eventos:
  refresh  -> renovação do access_token via refresh_token
  acesso   -> primeiro uso do token por uma rotina no processo atual
  erro     -> falha ao renovar/acessar (com 'detalhe')
"""
import hashlib
import json
import pathlib
from datetime import datetime, timezone, timedelta

LOG_PATH = pathlib.Path("graph_access_log.jsonl")
TZ_BR = timezone(timedelta(hours=-3))

# Chaves que jamais podem ir para o log, por segurança.
_PROIBIDAS = {"access_token", "refresh_token", "token", "id_token", "secret"}


def token_hash(access_token):
    """Prefixo de sha256 do token — identifica a credencial sem expô-la."""
    if not access_token:
        return None
    return hashlib.sha256(access_token.encode("utf-8")).hexdigest()[:12]


def registrar(evento, origem, resultado="ok", **extra):
    """Acrescenta uma linha ao log de acesso. Nunca grava o token.

    Resiliente: se a escrita falhar (ex.: sistema de arquivos só-leitura),
    apenas avisa e segue — nunca derruba a rotina que chamou.
    """
    registro = {
        "ts": datetime.now(TZ_BR).isoformat(timespec="seconds"),
        "evento": evento,
        "origem": origem,
        "resultado": resultado,
    }
    # remove valores None e qualquer chave sensível antes de gravar
    for k, v in extra.items():
        if k in _PROIBIDAS or v is None:
            continue
        registro[k] = v
    try:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(registro, ensure_ascii=False) + "\n")
    except OSError as e:
        print(f"[graph_access_log] aviso: nao foi possivel gravar o log: {e}")
    return registro
