#!/usr/bin/env python3
"""Descobre, lendo os andamentos, quem já se aposentou.

O sistema previa a aposentadoria por idade de gente que provavelmente já a
tem. A régua certa não é uma data de corte: é saber se o cliente já recebe
benefício. A ordem para descobrir é esta —

  1. os próprios andamentos do escritório (este script);
  2. o CNIS, na pasta do cliente no Drive (ainda não automatizado — a leitura
     exige credencial de serviço do Google e OCR do PDF, e vale uma rodada
     própria);
  3. o colaborador marcando à mão na ficha.

Só clientes que já passaram da idade (62 mulher / 65 homem) são analisados —
antes disso não há o que descobrir. Cada marcação guarda o TRECHO que a
provou, para ninguém ter de acreditar no sistema sem ver de onde veio.

Uso:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_SERVICE_KEY="a service_role key"
    python3 crm/fase2/detectar_aposentado.py            # aplica
    python3 crm/fase2/detectar_aposentado.py --seco     # só mostra
"""
from __future__ import annotations

import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from datetime import date

IDADE = {"F": 62, "M": 65}

# Frases que dizem "o cliente já recebe". Vieram das REGRAS de classificação
# do build_portal_listas.py, que foram mineradas do To Do de verdade. São
# expressões, e não pedaços de texto, porque o escritório escreve de todo
# jeito: "concedida a aposentadoria", "a aposentadoria foi concedida",
# "aposentadoria dele concedida".
CONCEDIDO = [
    r"(aposentadoria|beneficio|pedido)[^.;]{0,40}\b(concedid[oa]|deferid[oa]|implantad[oa])",
    r"\b(concedid[oa]|deferid[oa]|implantad[oa])[^.;]{0,40}\b(aposentadoria|beneficio)",
    r"carta de concessao",
    r"\bja (esta|se) aposentad", r"\bse aposentou", r"\baposentou-se",
    r"\besta aposentad", r"\bja recebe\b", r"\bja esta recebendo",
    r"\brecebendo o beneficio", r"\brecebe aposentadoria",
    r"\bbeneficio ativo", r"\bdib\b",
]
# ...mas nem toda frase com "concedido" serve: estas desmentem.
NEGA = [
    "nao foi concedido", "nao concedido", "indeferi", "negad",
    "nao deferido", "nao implantado", "cessad", "cancelad", "suspens",
    "pedido de concessao", "solicitei", "requeri", "vamos pedir",
    "pedir a concessao", "aguardando", "se for concedido",
    "caso seja concedido", "quando for concedido", "para ser concedido",
]
# LOAS/BPC não é aposentadoria: quem recebe BPC pode se aposentar depois
LOAS = ["loas", "bpc", "amparo social", "beneficio assistencial"]


def dsa(t: str) -> str:
    """minúsculas, sem acento — do mesmo jeito que o app compara texto"""
    t = (t or "").lower()
    return "".join(c for c in unicodedata.normalize("NFD", t)
                   if unicodedata.category(c) != "Mn")


def idade_em(dn: str, ref: date | None = None) -> int | None:
    """dn no formato DDMMAAAA (o do To Do) -> idade completa"""
    d = re.sub(r"\D", "", dn or "")
    if len(d) != 8:
        return None
    try:
        nasc = date(int(d[4:]), int(d[2:4]), int(d[:2]))
    except ValueError:
        return None
    hoje = ref or date.today()
    anos = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
    return anos if 0 <= anos < 130 else None


def ja_passou_da_idade(cliente: dict, ref: date | None = None) -> bool:
    sexo = cliente.get("sexo")
    if sexo not in IDADE:
        return False
    i = idade_em(cliente.get("dn"), ref)
    return i is not None and i >= IDADE[sexo]


def analisar(texto: str) -> str | None:
    """Devolve o trecho que prova a concessão, ou None.

    Analisa FRASE A FRASE: "indeferido em 2023, concedido em 2024" tem as
    duas coisas, e a negação de uma frase não pode apagar a outra.
    """
    for frase in re.split(r"[.;\n]+", texto or ""):
        f = dsa(frase)
        if not f.strip():
            continue
        if any(n in f for n in NEGA):
            continue
        if any(l in f for l in LOAS):
            continue          # BPC não encerra a aposentadoria por idade
        if any(re.search(c, f) for c in CONCEDIDO):
            return frase.strip()[:300]
    return None


def _req(url: str, chave: str, metodo="GET", corpo=None) -> object:
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(url, data=dados, method=metodo, headers={
        "apikey": chave, "Authorization": f"Bearer {chave}",
        "Content-Type": "application/json", "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(r, timeout=60) as resp:
        txt = resp.read().decode()
    return json.loads(txt) if txt else None


def rodar(base: str, chave: str, seco: bool = False) -> list[dict]:
    base = base.rstrip("/")
    clientes = _req(f"{base}/rest/v1/clientes?select=id,nome,dn,sexo,aposentado", chave)
    alvos = [c for c in clientes
             if c.get("aposentado") is None and ja_passou_da_idade(c)]
    if not alvos:
        return []
    achados = []
    for cli in alvos:
        # PostgREST não aceita subconsulta: pega os casos e depois os andamentos
        casos = _req(f"{base}/rest/v1/casos?select=id&cliente_id=eq.{cli['id']}", chave)
        ids = ",".join(k["id"] for k in casos)
        if not ids:
            continue
        ands = _req(f"{base}/rest/v1/andamentos?select=texto,criado_em"
                    f"&caso_id=in.({ids})&order=criado_em.desc", chave)
        for a in ands or []:
            prova = analisar(a.get("texto", ""))
            if prova:
                achados.append({"cliente": cli, "prova": prova,
                                "em": (a.get("criado_em") or "")[:10]})
                break
    if not seco:
        for r in achados:
            _req(f"{base}/rest/v1/clientes?id=eq.{r['cliente']['id']}", chave, "PATCH",
                 {"aposentado": True, "aposentado_fonte": "andamento",
                  "aposentado_em": r["em"] or None, "aposentado_prova": r["prova"]})
    return achados


def main() -> int:
    base = os.environ.get("SUPABASE_URL")
    chave = os.environ.get("SUPABASE_SERVICE_KEY")
    if not base or not chave:
        print("faltam SUPABASE_URL e SUPABASE_SERVICE_KEY", file=sys.stderr)
        return 1
    seco = "--seco" in sys.argv
    try:
        achados = rodar(base, chave, seco)
    except urllib.error.HTTPError as e:
        print(f"erro do banco: {e.code} {e.read()[:200]!r}", file=sys.stderr)
        return 1
    print(f"{len(achados)} cliente(s) já aposentado(s) encontrados nos andamentos"
          + (" (nada foi gravado — modo seco)" if seco else ""))
    for r in achados:
        print(f"  · {r['cliente']['nome']} ({r['em']}): {r['prova'][:90]}")
    print("Quem não apareceu aqui continua para conferência manual na ficha.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
