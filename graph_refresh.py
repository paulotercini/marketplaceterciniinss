"""Renova o access_token com o refresh_token (guardado no banco, ou o do segredo).

QUANDO ISTO FALHA, A SINCRONIZAÇÃO INTEIRA PARA — e é o primeiro passo do
ciclo, então o CRM simplesmente deixa de receber o To Do. Por isso o erro
daqui não pode ser um traceback: a Microsoft diz em texto o que houve
(`invalid_grant`, `expired_token`…), e é isso que precisa aparecer, junto com
o que fazer a respeito.

POR QUE ISTO GUARDA O TOKEN NOVO. A Microsoft devolve um refresh_token NOVO
a cada renovação, e o antigo tem validade própria. Enquanto este arquivo
descartava o novo e o GitHub recriava sempre o MESMO crachá a partir do
segredo, a corrente morria sozinha ao fim da validade do crachá original —
foi o que aconteceu em 05.09.2026 (AADSTS70000, "the grant is expired"), com
a sincronização parada por dias sem ninguém pedir nada. Agora o token
renovado é gravado na tabela `graph_token` do Supabase, que só a service_role
enxerga (crm/fase2/schema_graph_token.sql). O segredo GRAPH_REFRESH_TOKEN
continua sendo a partida: vale quando a tabela está vazia e volta a valer se
o token guardado morrer.
"""
import json, os, sys, urllib.parse, urllib.request, urllib.error, pathlib
from datetime import datetime, timezone

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/consumers"
SCOPE = "Tasks.ReadWrite offline_access"
TOKENS_PATH = pathlib.Path("graph_tokens.json")
# crachá vencido ou revogado: só um login humano resolve
EXPIRADO = ("invalid_grant", "invalid_client", "unauthorized_client")

REFAZER = (
    "O crachá da Microsoft não vale mais. Para refazer:\n"
    "  1. numa máquina sua:  python3 graph_devflow.py   (faz o login)\n"
    "  2. abra graph_tokens.json e copie o valor de refresh_token\n"
    "  3. cole em Settings > Secrets and variables > Actions > GRAPH_REFRESH_TOKEN\n"
    "O refresh_token vence por inatividade (90 dias) ou quando a senha da conta muda."
)


def _banco(metodo, caminho, dados=None, prefer=None):
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    chave = os.environ.get("SUPABASE_SERVICE_KEY") or ""
    cab = {"apikey": chave, "Authorization": f"Bearer {chave}",
           "Content-Type": "application/json"}
    if prefer:
        cab["Prefer"] = prefer
    req = urllib.request.Request(
        f"{url}/rest/v1/{caminho}", method=metodo, headers=cab,
        data=json.dumps(dados).encode("utf-8") if dados is not None else None)
    with urllib.request.urlopen(req, timeout=30) as r:
        corpo = r.read()
    return json.loads(corpo) if corpo.strip() else None


def tem_banco():
    return bool(os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_KEY"))


def token_guardado():
    """O refresh_token da última renovação bem-sucedida, ou None."""
    if not tem_banco():
        return None
    try:
        linhas = _banco("GET", "graph_token?id=eq.1&select=refresh_token") or []
        return linhas[0]["refresh_token"] if linhas else None
    except Exception as e:
        # tabela ainda não criada, rede fora: cai no segredo, que é a partida
        print(f"(não consegui ler o token guardado: {e})")
        return None


def guardar_token(tok):
    if not (tem_banco() and tok):
        return
    try:
        _banco("POST", "graph_token",
               {"id": 1, "refresh_token": tok,
                "atualizado_em": datetime.now(timezone.utc).isoformat()},
               prefer="resolution=merge-duplicates")
        print("(refresh_token novo guardado no banco)")
    except Exception as e:
        # não derruba a sincronização: o ciclo de hoje já tem access_token.
        # Mas sem isto a corrente volta a morrer ao fim da validade do crachá.
        print(f"::warning::não consegui guardar o refresh_token novo: {e}")


def renovar(refresh_token):
    """Troca o refresh_token por um access_token. Devolve (resposta, erro)."""
    body = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "scope": SCOPE,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{AUTHORITY}/oauth2/v2.0/token", data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), None
    except urllib.error.HTTPError as e:
        # o corpo do 400 traz `error` e `error_description`; sem imprimir isso,
        # o que sobra no log é "exit code 1" e nenhuma pista
        try:
            det = json.loads(e.read().decode("utf-8", "replace"))
        except Exception:
            det = {}
        codigo = det.get("error", f"HTTP {e.code}")
        desc = (det.get("error_description") or "").split("\r\n")[0]
        return None, (codigo, f"Microsoft recusou a renovação ({codigo}): {desc}")
    except urllib.error.URLError as e:
        sys.exit(f"não consegui falar com a Microsoft: {e.reason}")


def main():
    if not TOKENS_PATH.exists():
        sys.exit("graph_tokens.json não existe — o segredo GRAPH_REFRESH_TOKEN está vazio?")
    do_arquivo = (json.loads(TOKENS_PATH.read_text()).get("refresh_token") or "").strip()
    do_banco = (token_guardado() or "").strip()

    # o guardado é o da última renovação e é o que continua vivo; o do segredo
    # é a partida, e volta a valer quando o guardado morre (foi Paulo quem
    # acabou de refazê-lo)
    tentativas = [t for t in (do_banco, do_arquivo) if t]
    if len(tentativas) == 2 and tentativas[0] == tentativas[1]:
        tentativas.pop()
    if not tentativas:
        sys.exit("sem refresh_token no banco e no segredo.\n" + REFAZER)

    novo = usado = None
    for i, tok in enumerate(tentativas):
        novo, erro = renovar(tok)
        if novo:
            usado = tok
            break
        codigo, recado = erro
        if codigo in EXPIRADO and i < len(tentativas) - 1:
            print(f"(o token guardado no banco não vale mais: {codigo} — tentando o do segredo)")
            continue
        sys.exit(recado + ("\n" + REFAZER if codigo in EXPIRADO else ""))

    if not novo.get("access_token"):
        sys.exit("a Microsoft respondeu sem access_token — resposta inesperada.")
    TOKENS_PATH.write_text(json.dumps(novo))
    print("REFRESHED, expires_in:", novo.get("expires_in"))
    if novo.get("refresh_token") and novo["refresh_token"] != usado:
        guardar_token(novo["refresh_token"])


if __name__ == "__main__":
    main()
