"""Backup COMPLETO do Microsoft To Do (listas, tarefas, corpo e checklist).

O corpo das tarefas e o registro de atendimentos do escritorio, o unico lugar onde
vive o historico de cada cliente. Ele NAO esta no git e NAO esta no Drive, so na conta
Microsoft. Este script tira uma copia integral e datada.

Gera, em backups_todo/AAAAMMDD-HHMMSS/:
  todo_backup.json   dump fiel de tudo (para restaurar ou consultar por script)
  todo_backup.md     leitura humana, uma secao por lista, com o historico de cada tarefa
  RESUMO.txt         contagens e as listas que falharam, se alguma
e um zip irmao backups_todo/todo_AAAAMMDD-HHMMSS.zip com os tres.

Cada execucao cria uma pasta e um zip novos, com timestamp em horario de Brasilia,
entao nada sobrescreve nada.

Uso:
  python3 todo_backup.py                 # todas as listas
  python3 todo_backup.py --lista "INSS"  # so as listas cujo nome contenha o trecho
  python3 todo_backup.py --sem-zip

LIMITE CONHECIDO. O Graph responde HTTP 429 quando se varre tudo rapido demais. O
script ja espaca as chamadas e faz backoff progressivo. Rode-o em segundo plano, ele
leva alguns minutos com muitas listas. ANEXOS de tarefa nao entram (a API os expoe por
chamada separada por tarefa, o que multiplicaria as requisicoes e estouraria o limite);
eles seguem acessiveis por todo_anexo.py.
"""
import datetime
import json
import os
import pathlib
import sys
import time
import urllib.error
import zipfile
from zoneinfo import ZoneInfo

import graph_client as g

TZ_BR = ZoneInfo("America/Sao_Paulo")
RAIZ = pathlib.Path("backups_todo")
PAUSA = 1.5          # segundos entre listas, respeitando o Graph
TENTATIVAS = 6


def _tarefas_com_retry(list_id, nome):
    """Busca as tarefas de uma lista, com backoff progressivo no 429."""
    espera = 20
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            return g.list_tasks(list_id), None
        except urllib.error.HTTPError as e:
            if e.code != 429 and tentativa == TENTATIVAS:
                return None, f"HTTP {e.code}"
            print(f"   [{nome}] HTTP {e.code}, tentativa {tentativa}, "
                  f"aguardando {espera}s", flush=True)
            time.sleep(espera)
            espera = min(espera * 2, 240)
        except Exception as e:  # rede instavel, tenta de novo
            if tentativa == TENTATIVAS:
                return None, f"{type(e).__name__}: {e}"
            time.sleep(espera)
            espera = min(espera * 2, 240)
    return None, "esgotadas as tentativas"


def _md_tarefa(t):
    linhas = []
    titulo = t.get("title") or "(sem titulo)"
    status = t.get("status") or ""
    venc = (t.get("dueDateTime") or {}).get("dateTime", "")[:10]
    cab = f"### {titulo}"
    marcas = []
    if status:
        marcas.append(status)
    if venc:
        marcas.append(f"vence {venc}")
    if marcas:
        cab += f"  _({', '.join(marcas)})_"
    linhas.append(cab)
    itens = t.get("checklistItems") or []
    if itens:
        linhas.append("")
        linhas.append("Checklist:")
        for i in itens:
            marca = "x" if i.get("isChecked") else " "
            linhas.append(f"- [{marca}] {i.get('displayName')}")
    corpo = ((t.get("body") or {}).get("content") or "").strip()
    if corpo:
        linhas.append("")
        linhas.append(corpo)
    linhas.append("")
    linhas.append("---")
    return "\n".join(linhas)


def rodar(filtro=None, fazer_zip=True):
    agora = datetime.datetime.now(TZ_BR)
    carimbo = agora.strftime("%Y%m%d-%H%M%S")
    destino = RAIZ / carimbo
    destino.mkdir(parents=True, exist_ok=True)

    listas = g.list_lists()
    if filtro:
        alvo = filtro.lower()
        listas = [l for l in listas if alvo in (l.get("displayName") or "").lower()]
    print(f"listas a copiar: {len(listas)}", flush=True)

    dump = {
        "gerado_em": agora.isoformat(),
        "fuso": "America/Sao_Paulo",
        "total_listas": len(listas),
        "listas": [],
    }
    md = [f"# Backup do Microsoft To Do",
          f"", f"Gerado em {agora.strftime('%d/%m/%Y %H:%M')} (horario de Brasilia).",
          f"Listas copiadas, {len(listas)}.", ""]
    falhas, total_tarefas = [], 0

    for i, l in enumerate(listas, 1):
        nome = l.get("displayName") or "(sem nome)"
        tarefas, erro = _tarefas_com_retry(l["id"], nome)
        if erro:
            falhas.append(f"{nome}: {erro}")
            print(f"{i:3}/{len(listas)} FALHOU {nome} ({erro})", flush=True)
            continue
        total_tarefas += len(tarefas)
        dump["listas"].append({"nome": nome, "id": l["id"], "tarefas": tarefas})
        md.append(f"\n## {nome}  ({len(tarefas)} tarefas)\n")
        for t in sorted(tarefas, key=lambda x: (x.get("status") or "",
                                                x.get("title") or "")):
            md.append(_md_tarefa(t))
        print(f"{i:3}/{len(listas)} {nome}: {len(tarefas)} tarefas", flush=True)
        (destino / "todo_backup.json").write_text(
            json.dumps(dump, ensure_ascii=False, indent=1), encoding="utf-8")
        time.sleep(PAUSA)

    (destino / "todo_backup.json").write_text(
        json.dumps(dump, ensure_ascii=False, indent=1), encoding="utf-8")
    (destino / "todo_backup.md").write_text("\n".join(md), encoding="utf-8")
    resumo = [
        f"Backup do Microsoft To Do",
        f"Gerado em {agora.strftime('%d/%m/%Y %H:%M:%S')} (Brasilia)",
        f"Listas copiadas: {len(dump['listas'])} de {len(listas)}",
        f"Tarefas copiadas: {total_tarefas}",
        f"Falhas: {len(falhas)}",
    ]
    resumo += [f"  - {f}" for f in falhas]
    resumo.append("")
    resumo.append("Anexos de tarefa NAO estao neste pacote (ver todo_anexo.py).")
    (destino / "RESUMO.txt").write_text("\n".join(resumo), encoding="utf-8")

    caminho_zip = None
    if fazer_zip:
        caminho_zip = RAIZ / f"todo_{carimbo}.zip"
        with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED) as z:
            for arq in sorted(destino.iterdir()):
                z.write(arq, arcname=f"{carimbo}/{arq.name}")

    print("\n".join(resumo), flush=True)
    if caminho_zip:
        mb = caminho_zip.stat().st_size / 1e6
        print(f"\nZIP: {caminho_zip}  ({mb:.2f} MB)", flush=True)
    return destino, caminho_zip, falhas


if __name__ == "__main__":
    filtro, zipar = None, True
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--lista":
            filtro = args[i + 1]; i += 2
        elif args[i] == "--sem-zip":
            zipar = False; i += 1
        else:
            i += 1
    rodar(filtro, zipar)
