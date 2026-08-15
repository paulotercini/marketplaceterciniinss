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
import re, json, datetime
from graph_client import list_lists, list_tasks, _req
from portal_common import DATA_DIR, dn_from_items, cpf_from_task, split_blocks, derivar_hash

LISTA_ESCRITORIO = "🙋 Escritório"


# Frases que indicam, SEM ambiguidade, uma pendência ABERTA do lado do cliente.
# Propositalmente específicas (exigem "cliente"/"documento"/"falta"): evita os
# falsos positivos do match solto antigo ('trazer ', 'procuração', e 'trouxe' —
# que significa o OPOSTO, o cliente já trouxe).
_AGUARDA_CLIENTE = (
    "aguardando documento", "aguardando o cliente", "aguardando a cliente",
    "aguardando providência do cliente", "aguardando providencia do cliente",
    "cliente vai trazer", "cliente irá trazer", "cliente ira trazer",
    "cliente vai enviar", "cliente irá enviar", "cliente ira enviar",
    "cliente precisa trazer", "cliente precisa enviar", "cliente vai providenciar",
    "precisa trazer o", "falta o cliente", "falta a cliente", "falta documento",
    "falta o documento", "faltam documentos", "falta o comprovante",
    "pendente com o cliente", "pendência do cliente", "pendencia do cliente",
    "aguardando o cliente trazer", "cliente ficou de trazer", "ficou de trazer",
    "trazer o comprovante", "enviar o documento", "passar para buscar",
)
# Frases que indicam trabalho EM ANDAMENTO no escritório (petição em elaboração,
# pronta, a protocolar/distribuir) — não é culpa/pendência do cliente.
_ELABORACAO = (
    "montar a inicial", "fazer a inicial", "redigir", "minutar", "minuta",
    "elaborar a", "petição inicial", "peticao inicial", "inicial pronta",
    "inicial concluíd", "inicial concluido", "pronto para distribuir",
    "pronta para distribuir", "pronto para protocolar", "pronta para protocolar",
    "para distribuir", "distribuir a", "distribuída", "distribuida",
    "aguardando assinatura", "revisão/assinatura", "revisão e assinatura",
    "assinatura do", "deixar pronto", "deixa pronto", "em elaboração",
)


def _texto_recente(body):
    """Decide o status pela nota MAIS RECENTE (estado atual do caso), não pelo
    histórico inteiro — assim notas antigas de 'cliente vai trazer X' não
    contaminam um caso que já avançou."""
    blocks = split_blocks(body)
    if blocks:
        topo = blocks[0][0]                      # data mais recente
        return " \n ".join(t for d, t in blocks if d == topo).lower()
    return (body or "").lower()


def infer_status(body):
    b = _texto_recente(body)
    if any(x in b for x in _AGUARDA_CLIENTE):
        return "Aguardando documento/providência do cliente"
    if any(x in b for x in _ELABORACAO):
        return "Em elaboração de petição pelo escritório"
    return "Em análise pelo escritório"



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
        loc = infer_status(e["body"])
        esc_proc = {
            "lista": LISTA_ESCRITORIO,
            "localizacao": loc,
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
            "origem": "auto",
        }
        h = derivar_hash(cpf, dn, salt, iters)
        path = DATA_DIR / f"{h}.json"
        existentes, nome_existente = [], None
        if path.exists():
            try:
                d0 = json.loads(path.read_text())
                existentes = d0.get("processos", [])
                nome_existente = d0.get("nome")
            except Exception:
                existentes = []

        # MERGE não-destrutivo: preserva todos os processos de outras listas e os
        # processos Escritório CURADOS; para o Escritório auto, só atualiza a
        # localizacao (estado inferido), mantendo o resto do registro.
        processos, achou = [], False
        for p in existentes:
            if p.get("lista") == LISTA_ESCRITORIO:
                achou = True
                if p.get("origem") == "curado":
                    processos.append(p)            # curado à mão: não toca
                else:
                    p["localizacao"] = loc
                    p.setdefault("origem", "auto")
                    processos.append(p)
            else:
                processos.append(p)                # INSS/Judicial/Conselho/etc.: intactos
        if not achou:
            processos.append(esc_proc)

        ficha = {
            "nome": nome_existente or e["nome"],
            "atualizado_em": agora,
            "processos": processos,
        }
        path.write_text(json.dumps(ficha, ensure_ascii=False, indent=2))
        gerados += 1

    # 3) atualiza _meta.json
    total = len([p for p in DATA_DIR.glob("*.json") if p.name != "_meta.json"])
    meta["total_clientes"] = total
    meta["atualizado_em"] = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    (DATA_DIR / "_meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    print(f"Escritorio: {gerados} fichas gravadas. Total no portal: {total}.")


if __name__ == "__main__":
    main()
