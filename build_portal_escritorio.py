"""Gera/atualiza no portal do cliente as fichas da lista '🙋 Escritório'.

ADITIVO: nao mexe nas fichas ja publicadas das outras listas (INSS, Judicial,
Conselho de Recursos, Tarefas com Prazo). Apenas acrescenta/atualiza os
clientes cuja tarefa esta na lista Escritorio.

Privacidade: a lista Escritorio tem anotacoes internas sensiveis (senhas
gov.br nos checklists, dados medicos, estrategia). Por isso a ficha publica
do cliente recebe SOMENTE um status limpo inferido do conteudo — nunca o
corpo da tarefa, o checklist ou trechos das anotacoes.

Login: a chave do arquivo (data/<hash>.json) eh derivada de CPF+DN exatamente
como o app.js faz (PBKDF2-SHA256 200k + SHA-256, 16 bytes). A DN do cliente
quase nunca esta no checklist do Escritorio, entao eh recuperada de um indice
global montado a partir de TODAS as listas do To Do.

Requer graph_tokens.json valido (rode graph_devflow.py / graph_refresh.py).
"""
import re, json, hashlib, pathlib, datetime
from graph_client import list_lists, list_tasks, _req

DATA_DIR = pathlib.Path("docs/portal/data")
LISTA_ESCRITORIO = "🙋 Escritório"


def digits(s):
    return re.sub(r"\D", "", s or "")


def dn_from_items(items):
    """Extrai uma data de nascimento plausivel (1920-2012) de um checklist."""
    for it in items:
        m = re.search(r"\b(\d{2})[/.](\d{2})[/.](\d{4})\b", it.get("displayName", ""))
        if m and 1920 <= int(m.group(3)) <= 2012:
            return m.group(1) + m.group(2) + m.group(3)
    return None


def cpf_from_task(title, items):
    for m in re.findall(r"(\d[\d.\-]{9,})", title):
        d = digits(m)
        if len(d) == 11:
            return d
    for it in items:
        d = digits(it.get("displayName", ""))
        if len(d) == 11:
            return d
    return None


def infer_status(body):
    b = (body or "").lower()
    aguardando = [
        "irá trazer", "ira trazer", "vai trazer", "trazer ", "trará",
        "aguardando documento", "precisa trazer", "passar para buscar",
        "comprovante de endereço", "comprovante de endereco",
        "enviar o documento", "trouxe", "irá passar", "ira passar", "buscar na",
    ]
    elaboracao = [
        "montar a inicial", "fazer a inicial", "redigir", "minutar",
        "elaborar a", "petição inicial", "peticao inicial",
        "deixa pronto as procuraç", "procuração", "procuracao", "protocolar",
    ]
    if any(x in b for x in aguardando):
        return "Aguardando documento/providência do cliente"
    if any(x in b for x in elaboracao):
        return "Em elaboração de petição pelo escritório"
    return "Em análise pelo escritório"


def derivar_hash(cpf, dn, salt, iters):
    bits = hashlib.pbkdf2_hmac("sha256", (cpf + "|" + dn).encode(), salt.encode(), iters, dklen=32)
    return hashlib.sha256(bits).digest()[:16].hex()


def main():
    meta = json.loads((DATA_DIR / "_meta.json").read_text())
    salt, iters = meta["salt"], meta["iter"]

    lists = list_lists()
    nome_por_id = {l["id"]: l["displayName"] for l in lists}
    id_escritorio = next(i for i, n in nome_por_id.items() if n == LISTA_ESCRITORIO)

    # 1) indice global CPF -> DN (varre todas as listas)
    cpf2dn = {}
    esc_tasks = []
    for l in lists:
        for t in list_tasks(l["id"]):
            if t.get("status") == "completed":
                continue
            items = _req("GET", f"/me/todo/lists/{l['id']}/tasks/{t['id']}/checklistItems").get("value", [])
            cpf = cpf_from_task(t.get("title", ""), items)
            dn = dn_from_items(items)
            if cpf and dn and cpf not in cpf2dn:
                cpf2dn[cpf] = dn
            if l["id"] == id_escritorio and cpf:
                esc_tasks.append({
                    "cpf": cpf,
                    "nome": re.sub(r"\s*#.*$", "", t.get("title", "")).strip(),
                    "body": t.get("body", {}).get("content", "") or "",
                })

    # 2) dedupe por CPF (primeira tarefa = mais recente no topo da lista)
    by_cpf = {}
    for e in esc_tasks:
        if e["cpf"] in cpf2dn:
            by_cpf.setdefault(e["cpf"], e)

    agora = datetime.datetime.now().strftime("%d/%m/%Y às %H:%M")
    gerados = 0
    for cpf, e in by_cpf.items():
        dn = cpf2dn[cpf]
        ficha = {
            "nome": e["nome"],
            "atualizado_em": agora,
            "processos": [{
                "lista": LISTA_ESCRITORIO,
                "localizacao": infer_status(e["body"]),
                "titulo_tarefa": e["nome"],
                "status": "Em atendimento pelo escritório",
                "proximo_evento": None,
                "timeline": [],
                "notas_publicas": [],
                "links_externos": [{
                    "label": "Consultar no Meu INSS",
                    "url": "https://meu.inss.gov.br/",
                    "obs": "Use seu CPF e sua senha gov.br",
                }],
            }],
        }
        h = derivar_hash(cpf, dn, salt, iters)
        (DATA_DIR / f"{h}.json").write_text(json.dumps(ficha, ensure_ascii=False, indent=2))
        gerados += 1

    # 3) atualiza _meta.json
    total = len([p for p in DATA_DIR.glob("*.json") if p.name != "_meta.json"])
    meta["total_clientes"] = total
    meta["atualizado_em"] = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    (DATA_DIR / "_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    print(f"Escritorio: {gerados} fichas gravadas. Total no portal: {total}.")


if __name__ == "__main__":
    main()
