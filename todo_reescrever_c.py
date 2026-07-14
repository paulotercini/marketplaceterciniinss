"""Reescreve (SUBSTITUI) a conclusao (C) de HOJE de uma tarefa por uma versao mais
curta, NO LUGAR, preservando o cabecalho fixo e TODO o historico anterior.

Diferente do todo_conclusao.py (que faz prepend de uma nova (C)), este script
substitui APENAS o bloco da (C) da data de hoje, util para corrigir/encurtar uma
conclusao gravada hoje sem duplicar entrada nem tocar no historico.

Le o texto novo de um ARQUIVO (UTF-8), nunca de argumento de shell, para evitar
corte por aspas/pipes/cifrao na linha de comando.

SALVAGUARDAS (mesma doutrina do todo_conclusao.py):
  1. Backup do corpo original em todo_backups/ antes de gravar.
  2. Aborta se alguma linha do cabecalho ou do historico anterior sumir.
  3. Trava de acentuacao (pt-BR correto).

Uso:
    python3 todo_reescrever_c.py "<list_id>" "<task_id>" --file <arquivo_texto>
"""
import re
import sys
from datetime import datetime

from triagem import TZ_BR
from graph_client import get_task, _req
from todo_conclusao import (
    _backup, ACENTOS, PALAVRAS_OBRIGATORIAS_ACENTO, RE_PALAVRA, RE_DATA,
)


def _valida_acentos(texto):
    if len(texto) > 80 and not (set(texto) & ACENTOS):
        raise RuntimeError(
            "Conclusao sem nenhum acento. Reescreva em portugues do Brasil correto."
        )
    achadas = sorted({
        w for w in RE_PALAVRA.findall(texto.lower())
        if w in PALAVRAS_OBRIGATORIAS_ACENTO
    })
    if achadas:
        raise RuntimeError(
            "Conclusao com palavra(s) sem acento: " + ", ".join(achadas) + "."
        )


def reescrever(list_id, task_id, novo_texto):
    """Substitui o bloco da (C) de hoje por `novo_texto`. Retorna (backup, len_antigo,
    len_novo)."""
    hoje = datetime.now(TZ_BR).strftime("%d.%m.%Y")
    novo_texto = novo_texto.strip().replace("**", "")
    _valida_acentos(novo_texto)
    if not novo_texto.startswith(hoje):
        novo_texto = f"{hoje} (C): {novo_texto}"

    t = get_task(list_id, task_id)
    body = t.get("body", {}) or {}
    old = body.get("content", "") or ""
    ctype = body.get("contentType", "text")

    # Localiza o bloco da (C) de hoje: da linha 'DD.MM.AAAA (C):' ate a proxima
    # linha que comeca com uma data (a entrada anterior do historico).
    marker = re.compile(r"^" + re.escape(hoje) + r" \(C\):", re.M)
    m = marker.search(old)
    if not m:
        raise RuntimeError(f"Nao encontrei a (C) de {hoje} para reescrever.")
    ini = m.start()
    prox = RE_DATA.search(old, m.end())
    fim = prox.start() if prox else len(old)

    block = old[ini:fim]      # a (C) de hoje + eventual nota sem data + separador
    # O bloco da (C) termina no FIM DA LINHA que contem o fecho 'QUEM'. O que vier
    # depois (ex.: uma nota (P) sem prefixo de data, acrescentada por um humano apos a
    # (C)) NAO faz parte da conclusao e e PRESERVADO intacto.
    qs = list(re.finditer(r"QUEM", block))
    if qs:
        nl = block.find("\n", qs[-1].end())
        c_end = len(block) if nl == -1 else nl
    else:
        c_end = len(block)
    tail = block[c_end:]      # notas sem data apos o fecho + separador ate a proxima data
    head = old[:ini]          # cabecalho fixo (a (C) de hoje e a entrada mais recente)
    rest = old[fim:]          # historico anterior (comeca na entrada anterior datada)

    novo_body = head + novo_texto + tail + rest

    # Salvaguarda 1 — backup.
    bkp = _backup(task_id, old)

    # Salvaguarda 2 — cabecalho, notas apos o fecho e historico anterior intactos.
    for linha in (head + tail + rest).splitlines():
        if linha.strip() and linha not in novo_body:
            raise RuntimeError(
                f"Abortado: a nova versao nao preserva a linha: {linha[:60]!r}. "
                f"Backup em {bkp}"
            )

    _req(
        "PATCH",
        f"/me/todo/lists/{list_id}/tasks/{task_id}",
        {"body": {"content": novo_body, "contentType": ctype}},
    )
    return bkp, fim - ini, len(novo_texto)


if __name__ == "__main__":
    if len(sys.argv) < 5 or sys.argv[3] != "--file":
        print('Uso: python3 todo_reescrever_c.py "<list_id>" "<task_id>" --file <arquivo>')
        sys.exit(1)
    with open(sys.argv[4], encoding="utf-8") as f:
        texto = f.read()
    bkp, la, ln = reescrever(sys.argv[1], sys.argv[2], texto)
    print(f"OK (antigo {la} -> novo {ln} chars; backup {bkp})")
