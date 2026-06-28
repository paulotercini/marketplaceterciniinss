"""Insere uma conclusao datada do Claude (C) no corpo de uma tarefa do To Do,
no lugar correto e preservando TODO o historico existente.

POSICIONAMENTO (regra do escritorio):
  A conclusao (C) entra no TOPO do HISTORICO, ou seja:
    - ABAIXO do cabecalho fixo da tarefa ([TAREFA]/[SISTEMA]/[DER], etc.);
    - ACIMA da entrada de data mais recente.
  Na pratica: inserimos imediatamente ANTES da primeira linha que comeca com
  uma data 'DD.MM.AAAA'. Tudo que vem antes (texto fixo) e tudo que vem depois
  (historico anterior) e preservado intacto.

SALVAGUARDAS (regra inviolavel — nunca perder historico):
  1. Antes de qualquer escrita, faz backup do corpo original em todo_backups/.
  2. Aborta se alguma linha de texto do corpo original sumir da nova versao.

IDIOMA: o texto da conclusao deve vir em portugues do Brasil COM ACENTUACAO
correta. Este script nao altera o texto recebido (alem de adicionar o prefixo
de data) — quem chama e responsavel por escrever com acentos.

O prefixo 'DD.MM.AAAA (C): ' usa a data de hoje em horario de Brasilia.

Uso:
    python3 todo_conclusao.py "<list_id>" "<task_id>" "texto da conclusao"
"""
import os
import re
import sys
from datetime import datetime

from triagem import TZ_BR
from graph_client import get_task, _req

BACKUP_DIR = "todo_backups"

# Caracteres acentuados do portugues (para a trava de acentuacao).
ACENTOS = set("áàâãéêíóôõúüçÁÀÂÃÉÊÍÓÔÕÚÜÇ")

# Palavras que em pt-BR sao quase sempre acentuadas. Se aparecerem na forma SEM
# acento, e sinal de conclusao mal escrita (a trava de "algum acento" nao basta,
# pois uma unica palavra acentuada no texto inteiro a burlava). Lista em minusculas
# e na forma ERRADA (sem acento); o texto correto nunca casa com ela.
PALAVRAS_OBRIGATORIAS_ACENTO = frozenset({
    "medico", "medicos", "medica", "medicas", "relatorio", "relatorios",
    "ausencia", "nao", "sao", "voce", "tambem", "porem", "apos", "area",
    "padrao", "dominio", "dominios", "metalurgico", "contribuicao",
    "contribuicoes", "periodo", "periodos", "beneficio", "beneficios",
    "pericia", "analise", "pendencia", "pendencias", "proximo", "proxima",
    "proximos", "conclusao", "decisao", "historico", "salario", "necessario",
    "obrigatorio", "vinculo", "vinculos", "invalido", "cronico", "ortopedico",
    "publico", "sera", "calculo", "pre", "pos", "orgao", "obito",
})
RE_PALAVRA = re.compile(r"[0-9A-Za-zÀ-ÿ]+")

# Linha que comeca (inicio de linha) com uma data DD.MM.AAAA
RE_DATA = re.compile(r"^\d{2}\.\d{2}\.\d{4}", re.MULTILINE)


def _backup(task_id, body):
    os.makedirs(BACKUP_DIR, exist_ok=True)
    ts = datetime.now(TZ_BR).strftime("%Y%m%d-%H%M%S")
    path = os.path.join(BACKUP_DIR, f"{ts}_{task_id[:24]}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(body or "")
    return path


def montar_corpo(old, entry, ctype="text"):
    """Insere `entry` no topo do historico de `old`, abaixo do cabecalho fixo
    e acima da entrada de data mais recente. Retorna o novo corpo."""
    if ctype == "html":
        # Tarefas do escritorio sao texto; para html, rede de seguranca simples.
        entry_html = "<div>" + entry.replace("\n", "<br>") + "</div>"
        m = RE_DATA.search(old)
        if not m:
            return entry_html + "<br>" + old
        pos = m.start()
        return old[:pos] + entry_html + "<br><br>" + old[pos:]

    m = RE_DATA.search(old)
    if not m:
        # Sem datas no corpo: prepend simples (caso raro).
        return entry + "\n\n" + old if old.strip() else entry
    pos = m.start()
    head = old[:pos]          # cabecalho fixo (termina em \n quando existe)
    rest = old[pos:]          # historico (comeca na data mais recente)
    return head + entry + "\n\n" + rest


def prepend(list_id, task_id, texto):
    hoje = datetime.now(TZ_BR).strftime("%d.%m.%Y")
    texto = texto.strip()
    # To Do e texto puro: remove marcador markdown '**' que apareceria literalmente.
    texto = texto.replace("**", "")

    # Trava de acentuacao: conclusao longa em pt-BR sempre tem algum acento.
    # Se vier sem nenhum, recusa para forcar a reescrita correta.
    if len(texto) > 80 and not (set(texto) & ACENTOS):
        raise RuntimeError(
            "Conclusao sem nenhum acento. Reescreva em portugues do Brasil com "
            "acentuacao correta (ç, á, ã, é, ê, í, ó, ô, ú etc.) e rode de novo."
        )

    # Trava reforcada: palavras frequentes escritas SEM acento reprovam o texto
    # (uma unica palavra acentuada nao basta para considerar o texto correto).
    achadas = sorted({
        w for w in RE_PALAVRA.findall(texto.lower())
        if w in PALAVRAS_OBRIGATORIAS_ACENTO
    })
    if achadas:
        raise RuntimeError(
            "Conclusao com palavra(s) sem acento: " + ", ".join(achadas) + ". "
            "Reescreva em portugues do Brasil com acentuacao correta e rode de novo."
        )

    if not texto.startswith(hoje):
        texto = f"{hoje} (C): {texto}"

    t = get_task(list_id, task_id)
    body = t.get("body", {}) or {}
    old = body.get("content", "") or ""
    ctype = body.get("contentType", "text")

    # Salvaguarda 1 — backup do corpo original antes de gravar.
    bkp = _backup(task_id, old)

    novo = montar_corpo(old, texto, ctype)

    # Salvaguarda 2 — nenhuma linha de texto do corpo original pode sumir.
    for linha in old.splitlines():
        if linha.strip() and linha not in novo:
            raise RuntimeError(
                f"Abortado: a nova versao nao preserva a linha do corpo original: "
                f"{linha[:60]!r}. Backup em {bkp}"
            )

    _req(
        "PATCH",
        f"/me/todo/lists/{list_id}/tasks/{task_id}",
        {"body": {"content": novo, "contentType": ctype}},
    )
    return bkp


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print('Uso: python3 todo_conclusao.py "<list_id>" "<task_id>" "texto"')
        sys.exit(1)
    bkp = prepend(sys.argv[1], sys.argv[2], sys.argv[3])
    print(f"OK (backup do corpo original em {bkp})")
