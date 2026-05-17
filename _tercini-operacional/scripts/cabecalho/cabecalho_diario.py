"""
Insere o cabecalho de entrada do dia — 'DD.MM.AAAA (P): ' — em todas as
tarefas atribuidas a Paulo com prazo para HOJE.

Feito para rodar via agendador todos os dias as 00:01h. Assim, ao abrir o
Microsoft To Do, cada tarefa do dia ja tem o cabecalho pronto — basta
digitar a analise depois dos dois-pontos.

CARACTERISTICAS
- Calcula a data de hoje sozinho (nao tem data fixa).
- IDEMPOTENTE: se a tarefa ja tiver a entrada de hoje, nao duplica.
- Respeita o padrao v9 (insere dentro do bloco HISTORICO).
- Respeita cabecalho estatico ('Verificar...', 'Sistema de verificacao:',
  'FIXO:', 'IMPORTANTE:') — a entrada entra ABAIXO dele.
- Atualiza o token do Microsoft Graph automaticamente antes de comecar.
- Registra tudo em cabecalho_diario.log.

USO MANUAL
    python cabecalho_diario.py
"""
import os
import sys
import re
import subprocess
from datetime import date, datetime
from pathlib import Path

PASTA = Path(__file__).resolve().parent
SCRIPTS = PASTA.parent                       # _tercini-operacional/scripts
REPO = SCRIPTS.parents[1]                    # raiz do repositorio
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(SCRIPTS / "graph"))

# o graph_tokens.json fica na raiz do repo e e lido por caminho relativo;
# garante o diretorio de trabalho correto independentemente de onde foi chamado
os.chdir(REPO)

LOG = PASTA / "cabecalho_diario.log"

RE_DATA = re.compile(r"^\d{2}\.\d{2}\.\d{4}")
RE_HISTORICO = re.compile(r"(—{10,}\s*\n\s*HIST[ÓO]RICO:?\s*\n\s*—{10,}\s*\n+)")


def log(msg):
    carimbo = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    linha = f"[{carimbo}] {msg}"
    print(linha)
    try:
        with LOG.open("a", encoding="utf-8") as f:
            f.write(linha + "\n")
    except Exception:
        pass


def atualizar_token():
    """Roda o graph_refresh.py da raiz do repo para renovar o access_token."""
    refresh = REPO / "graph_refresh.py"
    if not refresh.exists():
        log("AVISO: graph_refresh.py nao encontrado — seguindo com token atual.")
        return
    try:
        r = subprocess.run([sys.executable, str(refresh)], cwd=str(REPO),
                           capture_output=True, text=True, timeout=90)
        if r.returncode == 0:
            log("Token do Microsoft Graph atualizado.")
        else:
            log(f"AVISO: refresh retornou codigo {r.returncode}: {r.stderr.strip()[:200]}")
    except Exception as e:
        log(f"AVISO: falha ao atualizar token: {type(e).__name__}: {e}")


def inserir(body, nova):
    """Devolve (novo_body, modo). 'nova' = 'DD.MM.AAAA (P): '."""
    body = body or ""
    # idempotente — a entrada de hoje ja existe?
    if nova.strip() in body:
        return body, "ja existe"
    # padrao v9 — dentro do bloco HISTORICO
    m = RE_HISTORICO.search(body)
    if m:
        idx = m.end()
        return body[:idx] + nova + "\n\n" + body[idx:], "v9"
    # body vazio
    if not body.strip():
        return nova, "body vazio"
    # cabecalho estatico no topo
    linhas = body.split("\n")
    header, i = [], 0
    while i < len(linhas):
        ln = linhas[i]
        if ln.strip() == "" or RE_DATA.match(ln.strip()):
            break
        header.append(ln)
        i += 1
    if header:
        th = " ".join(header).lower()
        eh_header = ("sistema de verifica" in th
                     or header[0].strip().lower().startswith(
                         ("verificar", "fixo", "importante")))
        if eh_header:
            rest = "\n".join(linhas[i:]).lstrip("\n")
            novo = "\n".join(header).rstrip() + "\n\n" + nova + "\n\n" + rest
            return novo.rstrip() + "\n", "abaixo do cabecalho"
    # topo do body
    return nova + "\n\n" + body.lstrip("\n"), "topo do body"


def main():
    log("=" * 60)
    hoje = date.today()
    nova = hoje.strftime("%d.%m.%Y") + " (P): "
    log(f"Iniciando — data de hoje: {hoje.strftime('%d/%m/%Y')}")

    atualizar_token()

    from triagem import parse_due, is_paulo_task
    from client import list_lists, list_tasks, _req

    listas = list_lists()
    aplicados = 0
    pulados = 0
    erros = 0
    for l in listas:
        try:
            tarefas = list_tasks(l["id"])
        except Exception as e:
            log(f"ERRO ao listar '{l['displayName']}': {e}")
            continue
        for t in tarefas:
            if t.get("status") == "completed":
                continue
            if parse_due(t) != hoje:
                continue
            body = t.get("body", {}).get("content", "") or ""
            if not is_paulo_task(body):
                continue
            novo, modo = inserir(body, nova)
            if modo == "ja existe":
                pulados += 1
                continue
            try:
                payload = {"body": {"content": novo, "contentType": "text"}}
                _req("PATCH", f"/me/todo/lists/{l['id']}/tasks/{t['id']}", body=payload)
                aplicados += 1
            except Exception as e:
                erros += 1
                log(f"ERRO em '{t.get('title','')[:40]}': {type(e).__name__}")

    log(f"Concluido — {aplicados} cabecalhos inseridos | "
        f"{pulados} ja tinham | {erros} erros")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log(f"FALHA GERAL: {type(e).__name__}: {e}")
        sys.exit(1)
