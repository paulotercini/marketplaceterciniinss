"""Aplica no Supabase as migrações de crm/fase2/migracoes/ que ainda não foram aplicadas.

Roda no workflow supabase-migracoes.yml, pela API de gerenciamento do Supabase
(segredo SUPABASE_ACCESS_TOKEN), sem janela de confirmação. A tabela
public._migracoes guarda o que já foi aplicado; na primeira vez ela nasce com
a linha de base (_ja_aplicadas.txt), as migrações aplicadas à mão antes da automação.

Migração que apague tabela, coluna ou dados só passa com a linha
"-- destrutiva-confirmada: <quem e quando>", escrita depois da confirmação do Paulo.

    python3 crm/fase2/aplicar_migracoes.py --conferir   # só confere, sem banco
    python3 crm/fase2/aplicar_migracoes.py              # aplica
"""
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PASTA = Path(__file__).parent / "migracoes"
PROJETO = os.environ.get("SUPABASE_PROJETO", "bhdyatqaebpzufridwkh")
MARCA = "-- destrutiva-confirmada:"

RX_DESTRUTIVA = re.compile(
    r"\bdrop\s+(table|schema|database|view|materialized\s+view|type|extension|function)\b"
    r"|\balter\s+table\b[^;]*?\bdrop\s+(?!constraint\b|default\b|not\s+null\b|policy\b|trigger\b|identity\b)"
    r"|\btruncate\b|\bdelete\s+from\b",
    re.I | re.S,
)


def sem_comentarios(sql):
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    return re.sub(r"--[^\n]*", " ", sql)


def destrutiva(sql):
    """Trecho que apaga tabela, coluna ou dados, ou None. A marca de confirmação libera."""
    if MARCA in sql:
        return None
    m = RX_DESTRUTIVA.search(sem_comentarios(sql))
    return " ".join(m.group(0).split())[:80] if m else None


def pendentes(aplicadas):
    return [p for p in sorted(PASTA.glob("*.sql")) if p.name not in aplicadas]


def linha_de_base():
    txt = (PASTA / "_ja_aplicadas.txt").read_text(encoding="utf-8")
    return [l.strip() for l in txt.splitlines() if l.strip() and not l.startswith("#")]


def literal(s):
    return "'" + s.replace("'", "''") + "'"


def consulta(sql):
    token = os.environ["SUPABASE_ACCESS_TOKEN"].strip()
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJETO}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json",
                 "User-Agent": "marketplaceterciniinss-migracoes"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read() or b"[]")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code}: {e.read().decode(errors='replace')[:2000]}") from None


def conferir():
    erros = [f"{p.name}: {t}" for p in sorted(PASTA.glob("*.sql"))
             if p.name not in linha_de_base() and (t := destrutiva(p.read_text(encoding="utf-8")))]
    for e in erros:
        print(f"BLOQUEADA (apaga dados, falta '{MARCA}'): {e}")
    return 1 if erros else 0


def aplicar():
    if conferir():
        return 1
    consulta(
        "create table if not exists public._migracoes (nome text primary key, sha256 text,"
        " aplicada_em timestamptz not null default now(), origem text not null default 'workflow');"
        " alter table public._migracoes enable row level security;"
    )
    feitas = {r["nome"]: r["sha256"] for r in consulta("select nome, sha256 from public._migracoes")}
    if not feitas:
        base = linha_de_base()
        consulta("insert into public._migracoes (nome, origem) values "
                 + ", ".join(f"({literal(n)}, 'linha de base')" for n in base)
                 + " on conflict do nothing;")
        feitas = dict.fromkeys(base)
        print(f"linha de base gravada: {len(base)} migrações aplicadas antes da automação")
    for p in sorted(PASTA.glob("*.sql")):
        if p.name in feitas and feitas[p.name] and feitas[p.name] != hashlib.sha256(p.read_bytes()).hexdigest():
            print(f"AVISO: {p.name} mudou depois de aplicada; não é reaplicada (crie migração nova)")
    lista = pendentes(feitas)
    if not lista:
        print("nada a aplicar")
    for p in lista:
        sql = p.read_text(encoding="utf-8")
        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        # a migração e o registro vão na mesma consulta: falhou, nada fica gravado
        consulta(sql + "\n;\ninsert into public._migracoes (nome, sha256) values ("
                 + literal(p.name) + ", " + literal(sha) + ");")
        print(f"aplicada: {p.name}")
    return 0


if __name__ == "__main__":
    sys.exit(conferir() if "--conferir" in sys.argv else aplicar())
