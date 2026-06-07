"""Backup completo do Microsoft To Do em JSON + Markdown.

Captura listas, tarefas (incluindo concluidas), checklist items,
linkedResources e todos os metadados (status, importance, datas,
categorias, body completo).

NAO baixa anexos binarios (PDFs/imagens das tarefas).

Saida:
  /tmp/backup_to_do_YYYYMMDD_HHMMSS/
  /tmp/backup_to_do_YYYYMMDD_HHMMSS.zip
"""
import sys, json, time, re, urllib.error, os, zipfile
from datetime import datetime, timezone, timedelta
sys.path.insert(0, ".")
from graph_client import _req as _req_raw

TZ_BR = timezone(timedelta(hours=-3))
AGORA = datetime.now(TZ_BR)
TS = AGORA.strftime("%Y%m%d_%H%M%S")
DIR_BACKUP = f"/tmp/backup_to_do_{TS}"
ZIP_PATH = f"/tmp/backup_to_do_{TS}.zip"


def _req(method, path, retries=5):
    delays = [2, 4, 8, 16, 32]
    for i in range(retries):
        try:
            return _req_raw(method, path)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 504) and i < retries - 1:
                time.sleep(delays[i]); continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if i < retries - 1: time.sleep(delays[i]); continue
            raise


def list_all_tasks(list_id):
    """Lista TODAS as tarefas (incluindo concluidas) com checklistItems e linkedResources."""
    out = []
    url = f"/me/todo/lists/{list_id}/tasks?$top=100&$expand=checklistItems,linkedResources"
    while url:
        page = _req("GET", url)
        out.extend(page.get("value", []))
        url = page.get("@odata.nextLink")
    return out


def sanitize_filename(name):
    """Remove caracteres invalidos para nome de arquivo."""
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)[:80].strip()


def gerar_markdown_lista(lista_nome, tasks):
    """Gera versao legivel em Markdown para uma lista."""
    linhas = [f"# {lista_nome}", "", f"_Total de tarefas: {len(tasks)}_", "", "---", ""]
    # ordena: ativas primeiro, depois concluidas, ambas por modificacao desc
    def chave(t):
        eh_completa = 1 if t.get("status") == "completed" else 0
        return (eh_completa, -(datetime.fromisoformat(
            (t.get("lastModifiedDateTime") or "2000-01-01T00:00:00Z").replace("Z", "+00:00")
        ).timestamp()))
    tasks = sorted(tasks, key=chave)

    for t in tasks:
        title = t.get("title", "(sem titulo)")
        status = t.get("status", "?")
        importance = t.get("importance", "?")
        body = (t.get("body", {}) or {}).get("content", "") or ""
        due = (t.get("dueDateTime") or {}).get("dateTime")
        created = t.get("createdDateTime", "?")
        modified = t.get("lastModifiedDateTime", "?")
        completed = (t.get("completedDateTime") or {}).get("dateTime")
        checklist = t.get("checklistItems", []) or []
        linked = t.get("linkedResources", []) or []
        categorias = t.get("categories", []) or []

        prefix = "[x]" if status == "completed" else "[ ]"
        linhas.append(f"## {prefix} {title}")
        linhas.append("")
        linhas.append(f"- **Status:** `{status}`")
        linhas.append(f"- **Importance:** `{importance}`")
        linhas.append(f"- **Created:** {created}")
        linhas.append(f"- **Modified:** {modified}")
        if due: linhas.append(f"- **Due:** {due}")
        if completed: linhas.append(f"- **Completed:** {completed}")
        if categorias: linhas.append(f"- **Categories:** {', '.join(categorias)}")
        linhas.append("")
        if body.strip():
            linhas.append("### Body")
            linhas.append("")
            linhas.append("```")
            linhas.append(body)
            linhas.append("```")
            linhas.append("")
        if checklist:
            linhas.append("### Checklist")
            linhas.append("")
            for item in checklist:
                check = "x" if item.get("isChecked") else " "
                txt = item.get("displayName", "")
                linhas.append(f"- [{check}] {txt}")
            linhas.append("")
        if linked:
            linhas.append("### Linked Resources")
            linhas.append("")
            for lr in linked:
                url = lr.get("webUrl") or lr.get("externalId") or ""
                linhas.append(f"- [{lr.get('displayName', '?')}]({url})")
            linhas.append("")
        linhas.append("---")
        linhas.append("")
    return "\n".join(linhas)


def main():
    print(f"Iniciando backup em {AGORA.strftime('%d/%m/%Y %H:%M:%S')}")
    os.makedirs(DIR_BACKUP, exist_ok=True)
    os.makedirs(f"{DIR_BACKUP}/por_lista", exist_ok=True)
    os.makedirs(f"{DIR_BACKUP}/markdown", exist_ok=True)

    # 1. Listar listas
    listas = _req("GET", "/me/todo/lists").get("value", [])
    print(f"Listas encontradas: {len(listas)}")

    # 2. Salvar metadata das listas
    with open(f"{DIR_BACKUP}/listas.json", "w", encoding="utf-8") as f:
        json.dump(listas, f, ensure_ascii=False, indent=2)

    # 3. Para cada lista, buscar tarefas + escrever JSON + Markdown
    todas_tarefas = []
    for i, l in enumerate(listas, 1):
        nome = l.get("displayName", "?")
        print(f"  [{i}/{len(listas)}] {nome}...", end=" ", flush=True)
        try:
            tasks = list_all_tasks(l["id"])
        except Exception as e:
            print(f"ERRO: {e}")
            continue
        print(f"{len(tasks)} tarefas")
        for t in tasks:
            t["_list_id"] = l["id"]
            t["_list_name"] = nome
        todas_tarefas.extend(tasks)
        safe = sanitize_filename(nome) or f"lista_{i}"
        with open(f"{DIR_BACKUP}/por_lista/{safe}.json", "w", encoding="utf-8") as f:
            json.dump(tasks, f, ensure_ascii=False, indent=2)
        with open(f"{DIR_BACKUP}/markdown/{safe}.md", "w", encoding="utf-8") as f:
            f.write(gerar_markdown_lista(nome, tasks))

    # 4. Backup global
    with open(f"{DIR_BACKUP}/tarefas.json", "w", encoding="utf-8") as f:
        json.dump(todas_tarefas, f, ensure_ascii=False, indent=2)

    # 5. Manifest
    completas = sum(1 for t in todas_tarefas if t.get("status") == "completed")
    ativas = len(todas_tarefas) - completas
    manifest = {
        "data_backup": AGORA.isoformat(),
        "total_listas": len(listas),
        "total_tarefas": len(todas_tarefas),
        "tarefas_ativas": ativas,
        "tarefas_concluidas": completas,
        "anexos_baixados": False,
        "versao_script": "1.0",
    }
    with open(f"{DIR_BACKUP}/manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # 6. Zip
    print(f"\nCompactando em {ZIP_PATH}...")
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for root, _, files in os.walk(DIR_BACKUP):
            for file in files:
                p = os.path.join(root, file)
                arc = os.path.relpath(p, DIR_BACKUP)
                z.write(p, arc)

    tamanho_mb = os.path.getsize(ZIP_PATH) / 1024 / 1024
    print(f"Tamanho final: {tamanho_mb:.2f} MB")
    print("\nManifest:")
    for k, v in manifest.items():
        print(f"  {k}: {v}")
    print(f"\nArquivo zip: {ZIP_PATH}")
    print(f"Diretorio:    {DIR_BACKUP}")


if __name__ == "__main__":
    main()
