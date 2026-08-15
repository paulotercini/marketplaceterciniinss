"""Renova o access_token usando refresh_token salvo em graph_tokens.json.

QUANDO ISTO FALHA, A SINCRONIZAÇÃO INTEIRA PARA — e é o primeiro passo do
ciclo, então o CRM simplesmente deixa de receber o To Do. Por isso o erro
daqui não pode ser um traceback: a Microsoft diz em texto o que houve
(`invalid_grant`, `expired_token`…), e é isso que precisa aparecer, junto com
o que fazer a respeito.
"""
import json, sys, urllib.parse, urllib.request, urllib.error, pathlib

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")

REFAZER = (
    "O crachá da Microsoft não vale mais. Para refazer:\n"
    "  1. numa máquina sua:  python3 graph_devflow.py   (faz o login)\n"
    "  2. abra graph_tokens.json e copie o valor de refresh_token\n"
    "  3. cole em Settings > Secrets and variables > Actions > GRAPH_REFRESH_TOKEN\n"
    "O refresh_token vence por inatividade (90 dias) ou quando a senha da conta muda."
)


def main():
    if not TOKENS_PATH.exists():
        sys.exit("graph_tokens.json não existe — o segredo GRAPH_REFRESH_TOKEN está vazio?")
    cur = json.loads(TOKENS_PATH.read_text())
    if not (cur.get("refresh_token") or "").strip():
        sys.exit("graph_tokens.json sem refresh_token.\n" + REFAZER)

    body = urllib.parse.urlencode(
        {
            "client_id": CLIENT_ID,
            "grant_type": "refresh_token",
            "refresh_token": cur["refresh_token"],
            "scope": SCOPE,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            new = json.loads(r.read())
    except urllib.error.HTTPError as e:
        # o corpo do 400 traz `error` e `error_description`; sem imprimir isso,
        # o que sobra no log é "exit code 1" e nenhuma pista
        try:
            det = json.loads(e.read().decode("utf-8", "replace"))
        except Exception:
            det = {}
        codigo = det.get("error", f"HTTP {e.code}")
        desc = (det.get("error_description") or "").split("\r\n")[0]
        recado = f"Microsoft recusou a renovação ({codigo}): {desc}"
        if codigo in ("invalid_grant", "invalid_client", "unauthorized_client"):
            recado += "\n" + REFAZER
        sys.exit(recado)
    except urllib.error.URLError as e:
        sys.exit(f"não consegui falar com a Microsoft: {e.reason}")

    if not new.get("access_token"):
        sys.exit("a Microsoft respondeu sem access_token — resposta inesperada.")
    TOKENS_PATH.write_text(json.dumps(new))
    print("REFRESHED, expires_in:", new.get("expires_in"))
    # A Microsoft devolve um refresh_token NOVO a cada uso. Na sua máquina ele
    # fica gravado aqui; no GitHub, o arquivo é recriado do segredo a cada
    # rodada e este novo se perde. É esperado — o antigo continua valendo —,
    # mas é a razão de o segredo precisar ser refeito de tempos em tempos.
    if new.get("refresh_token") and new["refresh_token"] != cur["refresh_token"]:
        print("(a Microsoft devolveu um refresh_token novo)")


if __name__ == "__main__":
    main()
