"""
Integrador DOU + Microsoft To Do.

Fluxo:
  1. Chama dou_busca.buscar_data() para obter publicações do dia
  2. Classifica automaticamente (ALERTA_URGENTE / IMPORTANTE / INFORMATIVO)
  3. Cria (ou atualiza) a tarefa no Microsoft To Do via graph_client

Pré-requisito: graph_tokens.json deve existir.
  Se não existir, rode: python3 graph_devflow.py start
                         python3 graph_devflow.py poll   (após autorizar no browser)

Uso:
  python3 dou_todo_task.py                 # usa data de hoje
  python3 dou_todo_task.py "07/05/2026"    # data específica
"""

import json
import pathlib
import sys
import urllib.error
from datetime import date, datetime, timezone

import dou_busca
import graph_client
import graph_refresh

LISTA_PREFERIDA = ["Advocacia Previdenciária", "DOU", "Atualizações Normativas", "Tarefas"]
TZ_SP = "America/Sao_Paulo"

# ──────────────────────────────────────────────────────────
# Classificação automática de matérias
# ──────────────────────────────────────────────────────────

_ALERTA_KEYS = [
    "instrução normativa", "portaria conjunta", "medida provisória",
    "lei n", "decreto n", "resolução normativa", "nota técnica vinculante",
    "prazo", "bloqueio", "suspensão", "cessação", "indeferimento",
    "biometria", "consignado", "carência", "108 parcelas",
    "atestmed", "análise documental", "incapacidade",
    "bpc", "loas", "salário-maternidade", "pensão por morte",
    "tema 1", "ec 103", "lei 8.213", "decreto 3.048",
]

_IMPORTANTE_KEYS = [
    "portaria", "ato declaratório", "comunicado", "ofício circular",
    "instrução de serviço", "reabilitação", "perícia", "atestado",
    "crps", "conselho de recursos",
]

_PESSOAL_KEYS = [
    "nomeação", "exoneração", "designação", "substituição", "posse",
    "licença", "concurso público", "aprovação em concurso",
    "membro", "membro titular", "membro suplente",
    "matrícula nº", "função comissionada", "fce ", "dás nomeação",
    "resolve: designar", "resolve designar", "resolve: nomear",
    "resolve: exonerar", "resolve: dispensar",
]

_ALERTA_KEYS_TITULO = [
    "instrução normativa", "portaria conjunta", "medida provisória",
    "lei n", "decreto n", "resolução normativa", "nota técnica vinculante",
]


def _full_text(item: dict) -> str:
    """Busca o texto completo do artigo DOU para classificação mais precisa."""
    try:
        result = __import__("subprocess").run(
            ["curl", "-s", "--max-time", "20", item["url"],
             "-H", f"User-Agent: {dou_busca.UA}",
             "-H", "Accept-Language: pt-BR,pt;q=0.9"],
            capture_output=True, text=True, timeout=25,
        )
        import re
        html = result.stdout
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.S)
        full = " ".join(re.sub(r"<[^>]+>", "", p).strip() for p in paragraphs if len(p.strip()) > 20)
        return re.sub(r"\s+", " ", full)[:3000].lower()
    except Exception:
        return (item.get("title", "") + " " + item.get("content_preview", "")).lower()


def _classificar(item: dict) -> str:
    titulo = item.get("title", "").lower()
    preview = item.get("content_preview", "").lower()

    # 1. Verificar pelo título se é claramente um ato de pessoal
    for k in _PESSOAL_KEYS:
        if k in titulo:
            return "INFORMATIVO"

    # 2. Para portarias curtas, buscar o texto completo para checar ementa real
    texto_completo = _full_text(item)
    for k in _PESSOAL_KEYS:
        if k in texto_completo:
            return "INFORMATIVO"

    # 3. Verificar alerta pelo TÍTULO (não pelo boilerplate)
    for k in _ALERTA_KEYS_TITULO:
        if k in titulo:
            return "ALERTA_URGENTE"

    # 4. Verificar alerta pelo conteúdo completo (excluindo "decreto n" genérico)
    alerta_conteudo = [k for k in _ALERTA_KEYS if k not in ("decreto n", "lei n")]
    for k in alerta_conteudo:
        if k in texto_completo:
            return "ALERTA_URGENTE"

    for k in _IMPORTANTE_KEYS:
        if k in titulo or k in preview:
            return "IMPORTANTE"

    return "INFORMATIVO"


def classificar_resultados(items: list[dict]) -> dict[str, list[dict]]:
    grupos: dict[str, list[dict]] = {"ALERTA_URGENTE": [], "IMPORTANTE": [], "INFORMATIVO": []}
    for it in items:
        it["classificacao"] = _classificar(it)
        grupos[it["classificacao"]].append(it)
    return grupos


# ──────────────────────────────────────────────────────────
# Criação da tarefa no To Do
# ──────────────────────────────────────────────────────────

def _encontrar_lista(listas: list[dict]) -> dict:
    nomes = {lst["displayName"].strip(): lst for lst in listas}
    for pref in LISTA_PREFERIDA:
        if pref in nomes:
            return nomes[pref]
    return listas[0]


def _body_task(data_br: str, grupos: dict[str, list[dict]]) -> str:
    linhas = [f"Monitoramento DOU {data_br}\n"]
    for cls in ["ALERTA_URGENTE", "IMPORTANTE", "INFORMATIVO"]:
        itens = grupos[cls]
        if not itens:
            continue
        linhas.append(f"\n{'='*40}")
        linhas.append(f"{cls.replace('_', ' ')} ({len(itens)} item(ns))")
        linhas.append('='*40)
        for it in itens:
            linhas.append(f"\nÓrgão: {it['hierarchy'].split('/')[1] if '/' in it['hierarchy'] else it['hierarchy']}")
            linhas.append(f"Tipo: {it.get('art_type','')}")
            linhas.append(f"Edição: {it.get('edition','')} | Pág.: {it.get('page','')}")
            linhas.append(f"Link: {it['url']}")
            linhas.append(f"Resumo: {it.get('content_preview','')[:200]}")
    return "\n".join(linhas)


def _due_reminder_iso(data_br: str, hora: str) -> str:
    d = datetime.strptime(data_br, "%d/%m/%Y")
    h, m = map(int, hora.split(":"))
    return d.replace(hour=h, minute=m, second=0, microsecond=0).isoformat()


def criar_tarefa(data_br: str, grupos: dict[str, list[dict]]) -> dict | None:
    """Cria a tarefa no Microsoft To Do. Retorna o objeto tarefa criado ou None em caso de falha."""
    n_alerta = len(grupos["ALERTA_URGENTE"])
    n_imp = len(grupos["IMPORTANTE"])

    # Título conforme rotina
    if n_alerta == 0 and n_imp == 0:
        title = f"DOU {data_br} - sem matérias previdenciárias relevantes"
        importance = "low"
        due = None
    else:
        label_alerta = "alerta urgente" if n_alerta == 1 else "alertas urgentes"
        label_imp = "importante" if n_imp == 1 else "importantes"
        title = f"DOU {data_br} - {n_alerta} {label_alerta} e {n_imp} {label_imp}"
        importance = "high"
        due = _due_reminder_iso(data_br, "23:59")

    body = _body_task(data_br, grupos)

    # Tentar com token atual; se expirado, renovar e tentar de novo
    for tentativa in range(2):
        try:
            listas = graph_client.list_lists()
            lista = _encontrar_lista(listas)
            tarefa = graph_client.create_task(
                lista["id"],
                title=title,
                body_content=body,
                importance=importance,
                due_date_iso=due,
                time_zone=TZ_SP,
            )
            # Adicionar lembrete (PATCH separado pois create_task não expõe o campo)
            if due:
                reminder_iso = _due_reminder_iso(data_br, "09:00")
                graph_client._req(
                    "PATCH",
                    f"/me/todo/lists/{lista['id']}/tasks/{tarefa['id']}",
                    {
                        "isReminderOn": True,
                        "reminderDateTime": {"dateTime": reminder_iso, "timeZone": TZ_SP},
                    },
                )
            print(f"[To Do] Tarefa criada: {title}")
            print(f"[To Do] Lista: {lista['displayName']} | ID: {tarefa['id']}")
            return tarefa
        except urllib.error.HTTPError as e:
            if e.code == 401 and tentativa == 0:
                print("[To Do] Token expirado. Renovando...", file=sys.stderr)
                graph_refresh.main()
                continue
            errmsg = e.read().decode(errors="replace")
            print(f"[To Do] FALHA HTTP {e.code}: {errmsg}", file=sys.stderr)
            return None
        except Exception as exc:
            print(f"[To Do] FALHA: {exc}", file=sys.stderr)
            return None


# ──────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────

def main():
    data_br = sys.argv[1] if len(sys.argv) > 1 else date.today().strftime("%d/%m/%Y")

    # Verificar pré-requisito
    if not pathlib.Path("graph_tokens.json").exists():
        print("[AVISO] graph_tokens.json não encontrado.", file=sys.stderr)
        print("  Rode: python3 graph_devflow.py start", file=sys.stderr)
        print("  Depois:  python3 graph_devflow.py poll", file=sys.stderr)
        print("Continuando apenas com a busca DOU...", file=sys.stderr)
        todo_disponivel = False
    else:
        todo_disponivel = True

    # Busca DOU
    print(f"[DOU] Buscando edição de {data_br}...", file=sys.stderr)
    itens = dou_busca.buscar_data(data_br)
    grupos = classificar_resultados(itens)

    print(f"[DOU] Resultado: {len(grupos['ALERTA_URGENTE'])} alertas urgentes, "
          f"{len(grupos['IMPORTANTE'])} importantes, "
          f"{len(grupos['INFORMATIVO'])} informativos", file=sys.stderr)

    # Imprimir itens
    for cls in ["ALERTA_URGENTE", "IMPORTANTE", "INFORMATIVO"]:
        for it in grupos[cls]:
            print(f"[{cls}] {it['title'][:80]}")
            print(f"  Link: {it['url']}")

    # Criar tarefa no To Do
    if todo_disponivel:
        tarefa = criar_tarefa(data_br, grupos)
        if tarefa is None:
            print("\n[ATENÇÃO] Tarefa não criada no To Do — crie manualmente com o conteúdo acima.")
    else:
        print("\n[To Do] Conector não disponível — autorize via graph_devflow.py e tente novamente.")

    return grupos


if __name__ == "__main__":
    main()
