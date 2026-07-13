"""Coleta as tarefas do Microsoft To Do atribuidas a Paulo (P) com vencimento na
data alvo (default: hoje em horario de Brasilia) e grava em triagem_hoje.json os
dados necessarios para a triagem (corpo, checklist e metadados dos anexos).

Alem disso, monta um INDICE DE CLIENTES cruzando TODAS as listas de caso, para
detectar quando o mesmo cliente tem MAIS DE UMA tarefa (ex.: uma na lista INSS e
outra na lista Judicial). Cada tarefa selecionada carrega o campo
`outras_tarefas` com as demais tarefas ativas do mesmo cliente (em qualquer
lista), e o campo `ja_triado_hoje` indicando se ja existe conclusao (C) com a
data de hoje no corpo (sinal de que outra execucao/sessao ja tratou o cliente,
para evitar conflito/retrabalho no cowork).

Reaproveita a logica de 'atribuida a Paulo' e parse de data de triagem.py.

Uso:
    python3 triagem_do_dia.py            # hoje (America/Sao_Paulo)
    python3 triagem_do_dia.py 13/06/2026 # data especifica
"""
import json
import os
import re
import sys
import unicodedata
from datetime import datetime

from triagem import TZ_BR, parse_due, is_paulo_task, last_author
from graph_client import list_lists, list_tasks, _req

OUT = "triagem_hoje.json"

# Filtro de ATRIBUICAO REAL (opcional). O Microsoft To Do guarda a quem cada tarefa
# esta atribuida so no banco local `todosqlite.db` (tabelas assignments x members); o
# Graph NAO expoe esse campo. Extraia pelo Windows-MCP (PowerShell + sqlite3) a lista
# de `online_id` das tarefas incompletas atribuidas ao Paulo (assignee_id
# 14C625ADBD56ECFA) e salve num JSON. O `online_id` do banco local e o MESMO id que o
# Graph usa em task["id"]. Havendo esse arquivo, a fila usa a atribuicao REAL em vez do
# palpite pela convencao (P) do corpo; sem ele, cai no fallback (P). Caminho: variavel
# TRIAGEM_ASSIGNEE_FILE ou, por padrao, o arquivo abaixo na raiz do repo.
ASSIGNEE_FILE = os.environ.get("TRIAGEM_ASSIGNEE_FILE", "todo_assignee_paulo.json")


def _carregar_assignee():
    """Set de online_id (task ids do Graph) atribuidos ao Paulo, do arquivo de
    atribuicao. Retorna None quando o arquivo nao existe/esta vazio/ilegivel (a fila
    entao usa o fallback pela convencao (P)). Aceita `["id", ...]` ou
    `{"online_ids": [...]}`."""
    try:
        with open(ASSIGNEE_FILE, encoding="utf-8") as f:
            dados = json.load(f)
    except (OSError, ValueError):
        return None
    def _extrai(seq):
        out = set()
        for x in seq or []:
            v = (x.get("online_id") or x.get("id")) if isinstance(x, dict) else x
            if v and str(v).strip():
                out.add(str(v).strip())
        return out

    if isinstance(dados, dict):
        if isinstance(dados.get("tarefas"), list):
            ids = _extrai(dados["tarefas"])  # formato rico: {tarefas:[{online_id,...}]}
        else:
            ids = _extrai(dados.get("online_ids") or dados.get("ids") or [])
    else:
        ids = _extrai(dados)  # lista simples de ids ou de objetos
    return ids or None

# Listas de atendimento de cliente que entram na FILA DIARIA (decisao do escritorio).
# Comparacao robusta: ignora o emoji inicial e compara o texto (minusculo).
NOMES_CASO = {
    "escritório", "tarefas com prazo", "judicial", "inss",
    "pagamentos", "conselho de recursos", "marcos",
}

# Listas varridas para o INDICE DE CLIENTES (cruzamento entre listas). Por ora,
# as mesmas listas de caso, ja cobrem o cenario central (mesmo cliente na INSS e na
# Judicial). 'Aposentadorias Futuras' fica de fora por desempenho (lista grande de
# monitoramento de longo prazo); inclua aqui se quiser cruzar tambem com ela.
NOMES_INDICE = set(NOMES_CASO)


def _norm_lista(nome):
    return re.sub(r"^[^0-9A-Za-zÀ-ÿ]+", "", nome or "").strip().lower()


def _eh_lista_caso(nome):
    return _norm_lista(nome) in NOMES_CASO


def _eh_lista_indice(nome):
    return _norm_lista(nome) in NOMES_INDICE


def _cpf_de(title):
    """Extrai o CPF (11 digitos) do titulo, normalmente apos '#'."""
    m = re.search(r"#\s*([\d.\-]{11,18})", title or "")
    if not m:
        return None
    dig = re.sub(r"\D", "", m.group(1))
    return dig if len(dig) == 11 else None


def _norm_nome(title):
    """Nome normalizado (sem acento, sem CPF, minusculo) para casar clientes sem CPF."""
    txt = re.sub(r"#.*$", "", title or "")            # remove o CPF e o que vier depois
    txt = re.sub(r"^[^0-9A-Za-zÀ-ÿ]+", "", txt)        # remove emoji inicial
    txt = unicodedata.normalize("NFKD", txt).encode("ascii", "ignore").decode()
    txt = re.sub(r"[^A-Za-z0-9 ]", " ", txt).lower()
    return re.sub(r"\s+", " ", txt).strip()


def _chave_cliente(title):
    """Chave estavel do cliente: CPF quando houver, senao o nome normalizado."""
    cpf = _cpf_de(title)
    if cpf:
        return "cpf:" + cpf
    nome = _norm_nome(title)
    return ("nome:" + nome) if nome else None


def _tem_conclusao_hoje(body, alvo):
    """True se o corpo ja traz uma conclusao (C) com a data alvo (DD.MM.AAAA)."""
    d = alvo.strftime("%d.%m.%Y")
    return bool(re.search(re.escape(d) + r"\s*\(C\)", body or ""))


def _checklist(lid, tid):
    try:
        vals = _req("GET", f"/me/todo/lists/{lid}/tasks/{tid}/checklistItems").get("value", [])
        return [{"text": i.get("displayName"), "checked": i.get("isChecked")} for i in vals]
    except Exception:
        return []


def _anexos(lid, tid):
    try:
        vals = _req("GET", f"/me/todo/lists/{lid}/tasks/{tid}/attachments").get("value", [])
        return [
            {"name": a.get("name"), "contentType": a.get("contentType"), "size": a.get("size"), "id": a.get("id")}
            for a in vals
        ]
    except Exception:
        return []


def main():
    if len(sys.argv) > 1:
        alvo = datetime.strptime(sys.argv[1], "%d/%m/%Y").date()
    else:
        alvo = datetime.now(TZ_BR).date()

    assignee = _carregar_assignee()
    modo_filtro = "atribuicao real (assignee)" if assignee else "convencao (P) no corpo"

    # 1) Busca as tarefas das listas de indice UMA vez (reusa no cruzamento e na fila).
    cache = {}  # list_id -> (displayName, [tasks])
    for l in list_lists():
        nome = l.get("displayName", "")
        if not _eh_lista_indice(nome):
            continue
        try:
            tarefas = list_tasks(l["id"])
        except Exception as e:  # lista lenta/instavel: pula em vez de travar tudo
            print(f"[aviso] lista '{nome}' pulada: {e}", file=sys.stderr)
            continue
        cache[l["id"]] = (nome, tarefas)

    # 2) Indice de clientes: chave -> [tarefas ativas em qualquer lista].
    indice = {}
    for lid, (nome, tarefas) in cache.items():
        for t in tarefas:
            if t.get("status") == "completed":
                continue
            chave = _chave_cliente(t.get("title", ""))
            if not chave:
                continue
            due = parse_due(t)
            indice.setdefault(chave, []).append({
                "lista": nome,
                "list_id": lid,
                "task_id": t["id"],
                "title": t.get("title", ""),
                "due": due.isoformat() if due else None,
            })

    # 3) Fila do dia: so as listas da fila diaria, tarefa do Paulo, vencendo na data.
    #    Filtro: usa a ATRIBUICAO REAL (assignee) quando ha o arquivo de online_ids;
    #    senao cai no palpite pela convencao (P) do corpo.
    selecionadas = []
    p_conv_no_dia = 0  # diagnostico: quantas casariam pela convencao (P) no dia
    for lid, (nome, tarefas) in cache.items():
        if not _eh_lista_caso(nome):
            continue
        for t in tarefas:
            if t.get("status") == "completed":
                continue
            if parse_due(t) != alvo:
                continue
            body = t.get("body", {}).get("content", "") or ""
            eh_paulo_conv = is_paulo_task(body)
            if eh_paulo_conv:
                p_conv_no_dia += 1
            if assignee is not None:
                if t["id"] not in assignee:
                    continue
            elif not eh_paulo_conv:
                continue
            chave = _chave_cliente(t.get("title", ""))
            outras = [x for x in indice.get(chave, []) if x["task_id"] != t["id"]] if chave else []
            selecionadas.append(
                {
                    "lista": nome,
                    "list_id": lid,
                    "task_id": t["id"],
                    "title": t.get("title", ""),
                    "importance": t.get("importance"),
                    "due": alvo.isoformat(),
                    "ultimo_autor": last_author(body),
                    "body": body,
                    "checklist": _checklist(lid, t["id"]),
                    "anexos": _anexos(lid, t["id"]),
                    "cliente_chave": chave,
                    "outras_tarefas": outras,
                    "ja_triado_hoje": _tem_conclusao_hoje(body, alvo),
                }
            )

    data = {
        "data_alvo": alvo.strftime("%d/%m/%Y"),
        "total": len(selecionadas),
        "tarefas": selecionadas,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"TRIAGEM {alvo.strftime('%d/%m/%Y')} [filtro: {modo_filtro}] - "
          f"{len(selecionadas)} tarefa(s) de Paulo vencendo hoje")
    if assignee is not None and len(selecionadas) == 0 and p_conv_no_dia > 0:
        print(f"[aviso] o filtro por atribuicao (assignee) casou 0 tarefas, mas "
              f"{p_conv_no_dia} bateriam pela convencao (P). Provavel divergencia de "
              f"formato entre o online_id do banco local e o task id do Graph. "
              f"Confira o arquivo {ASSIGNEE_FILE}.", file=sys.stderr)
    for i, s in enumerate(selecionadas, 1):
        flags = ""
        if s["outras_tarefas"]:
            flags += f"  [+{len(s['outras_tarefas'])} tarefa(s) do mesmo cliente]"
        if s["ja_triado_hoje"]:
            flags += "  [JA TRIADO HOJE]"
        print(f"{i}. [{s['lista']}] {s['title']}  (anexos: {len(s['anexos'])}){flags}")

    mult = [s for s in selecionadas if s["outras_tarefas"]]
    if mult:
        print("\n*** CLIENTES COM MULTIPLAS TAREFAS (cruzar ANTES de processar) ***")
        for s in mult:
            outras = "; ".join(
                f"{o['lista']}" + (f" (vence {o['due']})" if o['due'] else " (sem prazo)")
                for o in s["outras_tarefas"]
            )
            print(f"  - {s['title']} [{s['lista']}] tambem em: {outras}")

    ja = [s for s in selecionadas if s["ja_triado_hoje"]]
    if ja:
        print("\n*** JA TRIADOS HOJE (possivel conflito/retrabalho, conferir antes) ***")
        for s in ja:
            print(f"  - {s['title']} [{s['lista']}]")

    print(f"\nDetalhes completos em {OUT}")


if __name__ == "__main__":
    main()
