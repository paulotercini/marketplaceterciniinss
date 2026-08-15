#!/usr/bin/env python3
"""Retrato do banco de produção — ESTRUTURA E NÚMEROS, NUNCA CONTEÚDO.

Roda dentro do GitHub Actions (é lá que vivem SUPABASE_URL e a chave) e
imprime um JSON com:

  - as tabelas expostas pela API, com as colunas (tipo, nulidade, padrão, FK)
  - o total de linhas de cada tabela
  - quantas linhas têm cada coluna preenchida (não nula e, em texto, não vazia)

REGRAS QUE ESTE ARQUIVO NÃO PODE QUEBRAR
----------------------------------------
1. SOMENTE LEITURA. Só emite GET e HEAD. Não existe caminho neste arquivo que
   escreva, apague ou altere qualquer coisa — nem esquema, nem linha.
2. NENHUM DADO DE CLIENTE SAI DAQUI. As consultas de contagem usam
   `Prefer: count=exact` com `limit=0`: o banco devolve o NÚMERO no cabeçalho
   Content-Range e um corpo vazio. Nome, CPF, telefone, endereço, senha e
   texto de andamento não passam por este processo em momento nenhum.
3. A URL do projeto não é impressa (o Actions já mascara, e ainda assim).

Uso:  python crm/fase2/dossie_banco.py > dossie.json
"""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
CHAVE = os.environ.get("SUPABASE_SERVICE_KEY") or ""
if not URL or not CHAVE:
    sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")

CABECA = {"apikey": CHAVE, "Authorization": f"Bearer {CHAVE}"}
# tipos que aceitam a comparação com string vazia (o "preenchido" de um texto
# em branco é zero, não um). jsonb, número, data e uuid ficam de fora.
TEXTUAIS = ("text", "character varying", "citext")


def _pedir(caminho, metodo="GET", prefer=None, tentativas=4):
    """Só GET e HEAD. Devolve (corpo, cabeçalhos)."""
    assert metodo in ("GET", "HEAD"), "este script é somente-leitura"
    req = urllib.request.Request(URL + caminho, method=metodo,
                                 headers={**CABECA, **({"Prefer": prefer} if prefer else {})})
    for n in range(tentativas):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                bruto = r.read() if metodo == "GET" else b""
                return (json.loads(bruto) if bruto else None), dict(r.headers)
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and n < tentativas - 1:
                time.sleep(2 ** n); continue
            return {"_erro": e.code, "_msg": e.read().decode()[:200]}, {}
        except Exception:
            if n < tentativas - 1:
                time.sleep(2 ** n); continue
            raise
    return None, {}


def total_de(consulta):
    """Conta linhas sem trazer nenhuma: limit=0 + count=exact."""
    _, cab = _pedir(consulta + ("&" if "?" in consulta else "?") + "limit=0",
                    "HEAD", "count=exact")
    faixa = cab.get("Content-Range") or cab.get("content-range") or ""
    try:
        return int(faixa.split("/")[-1])
    except ValueError:
        return None


def estrutura():
    """A OpenAPI do PostgREST traz colunas, tipo, padrão, obrigatoriedade e FK."""
    doc, _ = _pedir("/rest/v1/")
    saida = {}
    for nome, d in (doc.get("definitions") or {}).items():
        obrigatorias = set(d.get("required") or [])
        colunas = {}
        for col, p in (d.get("properties") or {}).items():
            desc = p.get("description") or ""
            fk = None
            for pedaco in desc.split("\n"):
                if "<fk table=" in pedaco:
                    fk = pedaco.strip()
            colunas[col] = {
                "tipo": p.get("format") or p.get("type"),
                "nulo": col not in obrigatorias,
                "padrao": p.get("default"),
                "pk": "<pk/>" in desc,
                "fk": fk,
                "nota": desc.split("<")[0].strip() or None,
            }
        saida[nome] = colunas
    return saida


def preenchimento(tabela, col, tipo):
    """Quantas linhas têm ESTA coluna preenchida. Só o número volta."""
    q = f"/rest/v1/{tabela}?{urllib.parse.quote(col)}=not.is.null"
    if (tipo or "") in TEXTUAIS:
        q += f"&{urllib.parse.quote(col)}=neq."
    n = total_de(q)
    if n is None:                      # tipo que não aceita o filtro: só não-nulo
        n = total_de(f"/rest/v1/{tabela}?{urllib.parse.quote(col)}=not.is.null")
    return n


def main():
    esq = estrutura()
    tabelas = sorted(esq)
    saida = {"tabelas": {}, "erros": []}

    def uma(t):
        linhas = total_de(f"/rest/v1/{t}?select=count")
        if linhas is None:
            saida["erros"].append(t)
            return t, {"linhas": None, "colunas": {}}
        cols = {}
        if linhas:
            with ThreadPoolExecutor(max_workers=6) as pool:
                res = list(pool.map(
                    lambda c: (c, preenchimento(t, c, esq[t][c]["tipo"])), esq[t]))
            for c, n in res:
                cols[c] = {**esq[t][c], "preenchidas": n,
                           "pct": None if n is None or not linhas else round(100.0 * n / linhas, 1)}
        else:
            for c in esq[t]:
                cols[c] = {**esq[t][c], "preenchidas": 0, "pct": None}
        return t, {"linhas": linhas, "colunas": cols}

    with ThreadPoolExecutor(max_workers=4) as pool:
        for t, d in pool.map(uma, tabelas):
            saida["tabelas"][t] = d
            print(f"  {t}: {d['linhas']} linha(s)", file=sys.stderr)

    json.dump(saida, sys.stdout, ensure_ascii=False, indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
