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
    p.add_argument("--log-only", action="store_true",
                   help="Remove apenas marcadores [BOT-LOG], preservando mensagens completas")
    args = p.parse_args()

    cat_pat = args.categoria if args.categoria else r"[A-Z_]+"

    # (1) Regex para mensagem completa antiga: "(BOT) (CAT-TIPO-DDMM): ... [/BOT]"
    pat_msg = (
        rf"^\d{{2}}\.\d{{2}}\.\d{{4}}\s*\(BOT\)\s*\({cat_pat}-[A-Z]+-\d{{4}}\):"
        r".*?"
        r"(?:\[/BOT\]\s*|(?=\n\n\d{2}\.\d{2}\.\d{4}\s*\([PADIM]+\):)|\Z)"
    )
    re_msg = re.compile(pat_msg, re.DOTALL | re.MULTILINE)

    # (2) Regex para marcador minimalista: "[BOT-LOG] CAT-TIPO-DDMM em DD.MM.AAAA"
    pat_log = rf"\[BOT-LOG\]\s*{cat_pat}-[A-Z]+-\d{{4}}\s+em\s+\d{{2}}\.\d{{2}}\.\d{{4}}"
    re_log = re.compile(pat_log)

    n_limpas = 0
    for lst in list_lists():
        for t in list_all_tasks(lst["id"]):
            body = (t.get("body", {}) or {}).get("content", "") or ""
            tem_msg = (not args.log_only) and re_msg.search(body)
            tem_log = re_log.search(body)
            if not (tem_msg or tem_log): continue
            novo = body
            if tem_msg: novo = re_msg.sub("", novo)
            if tem_log: novo = re_log.sub("", novo)
            novo = re.sub(r"\n{3,}", "\n\n", novo).strip("\n")
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
