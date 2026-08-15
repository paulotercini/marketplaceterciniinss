#!/usr/bin/env python3
"""Popula um projeto Supabase de HOMOLOGAÇÃO com a amostra fictícia.

    export SUPABASE_URL=https://xxxx.supabase.co
    export SUPABASE_SERVICE_KEY=...
    HOMOLOG=1 python3 crm/fase2/semear_homolog.py

Lê `cowork/06-amostra-ficticia.json` (20 clientes inventados, CPF gerado por
algoritmo) e insere na ordem das chaves estrangeiras.

TRÊS TRAVAS, porque escrever no banco errado é o tipo de erro que não se
desfaz:

1. **`HOMOLOG=1` obrigatório.** Sem a variável, o script imprime o que faria e
   sai sem tocar em nada.
2. **Banco tem que estar quase vazio.** Se já houver mais de 50 clientes, ele
   para: isso é cara de produção, não de homologação.
3. **O endereço aparece na tela antes de gravar**, e o script pede confirmação
   digitada quando roda num terminal.

`--limpar` apaga só o que a amostra criou (pelos ids dela), nunca um `delete`
solto na tabela.
"""
import json, os, sys, urllib.error, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AMOSTRA = os.path.join(RAIZ, "cowork/06-amostra-ficticia.json")
URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
CHAVE = os.environ.get("SUPABASE_SERVICE_KEY") or ""
LOTE = 200


def _req(metodo, caminho, corpo=None, prefer=None):
    req = urllib.request.Request(
        URL + caminho,
        data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": CHAVE, "Authorization": f"Bearer {CHAVE}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            bruto = r.read()
            return json.loads(bruto) if bruto else None, dict(r.headers)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"o banco recusou {metodo} {caminho.split('?')[0]}: "
                         f"{e.code} {e.read().decode()[:300]}")


def quantos(tabela):
    _, cab = _req("HEAD", f"/rest/v1/{tabela}?select=id&limit=0", prefer="count=exact")
    faixa = cab.get("Content-Range") or cab.get("content-range") or "/0"
    try:
        return int(faixa.split("/")[-1])
    except ValueError:
        return 0


def main():
    if not URL or not CHAVE:
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY do projeto de HOMOLOGAÇÃO.")
    dados = json.load(open(AMOSTRA, encoding="utf8"))
    ordem = dados["_ordem_de_carga"]
    limpar = "--limpar" in sys.argv

    host = URL.split("//")[-1]
    print(f"Projeto alvo: {host}")
    for t in ordem:
        print(f"  {t}: {len(dados[t])} linha(s) na amostra")

    if os.environ.get("HOMOLOG") != "1":
        print("\nEnsaio: nada foi gravado. Para valer, rode com HOMOLOG=1.")
        return

    n = quantos("clientes")
    print(f"\nO banco alvo tem {n} cliente(s).")
    if n > 50:
        sys.exit("PARADO: mais de 50 clientes é cara de produção. "
                 "Se este projeto é mesmo de homologação, esvazie-o antes.")
    if sys.stdin.isatty():
        if input(f'Escrever a amostra em {host}? digite "sim": ').strip().lower() != "sim":
            sys.exit("cancelado.")

    if limpar:
        for t in reversed(ordem):
            ids = [l["id"] for l in dados[t] if l.get("id")]
            for i in range(0, len(ids), 50):
                lote = ",".join(f'"{x}"' for x in ids[i:i + 50])
                _req("DELETE", f"/rest/v1/{t}?id=in.({lote})", prefer="return=minimal")
            print(f"  {t}: limpo")
        print("amostra removida.")
        return

    for t in ordem:
        linhas = dados[t]
        for i in range(0, len(linhas), LOTE):
            _req("POST", f"/rest/v1/{t}", linhas[i:i + LOTE],
                 prefer="resolution=merge-duplicates,return=minimal")
        print(f"  {t}: {len(linhas)} gravada(s)")
    print("\npronto — homologação populada só com gente inventada.")


if __name__ == "__main__":
    main()
