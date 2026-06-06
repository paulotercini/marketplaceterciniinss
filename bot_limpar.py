"""Remove linhas (BOT) antigas das tarefas (para reaplicar com template novo).

Uso: python3 bot_limpar.py [--dry-run] [--categoria CAT]
  --categoria: se omitido, limpa TODAS as categorias. Ex.: PERICIA_MEDICA
"""
import sys, time, urllib.error, re, argparse
sys.path.insert(0, ".")
from graph_client import _req as _req_raw


def _req(method, path, body=None, retries=4):
    delays = [2, 4, 8, 16]
    for i in range(retries):
        try:
            return _req_raw(method, path, body=body) if body is not None else _req_raw(method, path)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 504) and i < retries - 1:
                time.sleep(delays[i]); continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if i < retries - 1: time.sleep(delays[i]); continue
            raise


def list_lists():
    return _req("GET", "/me/todo/lists")["value"]


def list_all_tasks(list_id):
    out, url = [], f"/me/todo/lists/{list_id}/tasks?$top=100"
    while url:
        page = _req("GET", url)
        out.extend(page.get("value", []))
        url = page.get("@odata.nextLink")
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--categoria", default="", help="Categoria a limpar (vazio = todas)")
    args = p.parse_args()

    # Regex: linha "DD.MM.AAAA (BOT) (CAT-TIPO-DDMM):" + mensagem ate
    #   (a) marcador [/BOT] (novo formato), ou
    #   (b) proxima entrada do escritorio "DD.MM.AAAA (P/A/D/I/M):" (legacy), ou
    #   (c) fim do body
    cat_pat = args.categoria if args.categoria else r"[A-Z_]+"
    pat = (
        rf"^\d{{2}}\.\d{{2}}\.\d{{4}}\s*\(BOT\)\s*\({cat_pat}-[A-Z]+-\d{{4}}\):"
        r".*?"
        r"(?:\[/BOT\]\s*|(?=\n\n\d{2}\.\d{2}\.\d{4}\s*\([PADIM]+\):)|\Z)"
    )
    re_bot = re.compile(pat, re.DOTALL | re.MULTILINE)

    n_limpas = 0
    for lst in list_lists():
        for t in list_all_tasks(lst["id"]):
            body = (t.get("body", {}) or {}).get("content", "") or ""
            if not re_bot.search(body): continue
            novo = re_bot.sub("", body)
            # Colapsa 3+ quebras em 2 (limpa rastros da remocao)
            novo = re.sub(r"\n{3,}", "\n\n", novo).strip("\n")
            # também marca importance=normal (desfaz o "high")
            titulo = t.get("title", "")
            print(f"  Limpa: {titulo[:55]}")
            if not args.dry_run:
                _req("PATCH", f"/me/todo/lists/{lst['id']}/tasks/{t['id']}",
                     body={"body": {"content": novo, "contentType": "text"},
                           "importance": "normal"})
            n_limpas += 1

    print(f"\nTotal tarefas limpas: {n_limpas}")
    print(f"Modo: {'DRY-RUN' if args.dry_run else 'APLICADO'}")


if __name__ == "__main__":
    main()
