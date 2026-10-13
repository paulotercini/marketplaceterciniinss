"""F220 · a ponte estreita CRM -> To Do dos cards de aposentadoria futura.

O card que virou caso ou foi arquivado no CRM (lembretes.crm.etapa) conclui a
tarefa dele na lista 🙏 Aposentadorias Futuras do To Do, com uma linha no topo
do corpo dizendo o que houve. É a única escrita que este script faz; a escrita
geral (escrever_todo.py) continua desligada.

    python3 crm/fase2/ponte_cards.py            # conclui as tarefas pendentes
    python3 crm/fase2/ponte_cards.py --simular  # só mostra o que faria

Desliga com PONTE_CARDS=0 (variável de repositório de mesmo nome no workflow).
Exige SUPABASE_URL e SUPABASE_SERVICE_KEY, e o graph_tokens.json.
"""
import datetime
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(RAIZ))

LISTAS_APOS = ("🙏 Aposentadorias Futuras", "Aposentadorias Futuras")
LIMITE = 30            # por rodada: um engano não se espalha pela lista inteira


def cards_para_concluir(lembretes):
    """Os cards que o CRM decidiu (caso ou arquivado) e cuja tarefa ainda não foi concluída."""
    out = []
    for l in lembretes or []:
        crm = l.get("crm") or {}
        tid = (l.get("detalhes") or {}).get("todo_task_id")
        if l.get("tipo") == "aposentadoria_futura" and tid and crm.get("etapa") in ("caso", "arquivado") \
                and not crm.get("todo_concluido") and not crm.get("todo_ponte"):
            out.append(l)
    return out


def linha_do_card(l, hoje_iso):
    """A linha datada que entra no topo do corpo, no formato do escritório."""
    crm = l.get("crm") or {}
    d = hoje_iso[:10]
    data = f"{d[8:10]}.{d[5:7]}.{d[0:4]}"
    if crm.get("etapa") == "caso":
        texto = "Card concluído no CRM: virou caso."
    else:
        motivo = (crm.get("motivo") or "").strip()
        texto = "Card arquivado no CRM" + (f": {motivo}." if motivo else ".")
    return f"{data} (CRM): {texto}"


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    chave = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode() if corpo is not None else None, method=metodo,
        headers={"apikey": chave, **({"Authorization": f"Bearer {chave}"} if chave.startswith("eyJ") else {}),
                 "Content-Type": "application/json", **({"Prefer": prefer} if prefer else {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


def main(argv):
    if os.environ.get("PONTE_CARDS") == "0":
        print("ponte dos cards desligada (PONTE_CARDS=0). Nada foi enviado.")
        return 0
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    simular = "--simular" in argv
    filtro = urllib.parse.quote("(caso,arquivado)")
    lembs = _rest("GET", "/rest/v1/lembretes?tipo=eq.aposentadoria_futura"
                         f"&crm->>etapa=in.{filtro}&select=id,tipo,detalhes,crm") or []
    alvo = cards_para_concluir(lembs)[:LIMITE]
    if not alvo:
        print("ponte dos cards: nada a concluir no To Do.")
        return 0
    import graph_client
    listas = {l.get("displayName"): l["id"] for l in graph_client.list_lists()}
    lid = next((listas[n] for n in LISTAS_APOS if n in listas), None)
    if not lid:
        print("ponte dos cards: a lista 🙏 Aposentadorias Futuras não existe no To Do.")
        return 0
    hoje = datetime.date.today().isoformat()
    feitos = falhas = 0
    for l in alvo:
        tid = l["detalhes"]["todo_task_id"]
        linha = linha_do_card(l, hoje)
        if simular:
            print(f"  concluiria {tid[:12]}… com: {linha}")
            continue
        crm = dict(l.get("crm") or {})
        try:
            t = graph_client.get_task(lid, tid)
            corpo = ((t.get("body") or {}).get("content") or "").strip("\n")
            graph_client._req("PATCH", f"/me/todo/lists/{lid}/tasks/{tid}", {
                "status": "completed",
                "body": {"content": linha + ("\n\n" + corpo if corpo else ""), "contentType": "text"}})
            crm["todo_concluido"] = hoje
            feitos += 1
        except Exception as e:                      # noqa: BLE001 — a tarefa sumiu ou mudou de lista
            crm["todo_ponte"] = f"não concluída em {hoje}: {type(e).__name__}"
            falhas += 1
        _rest("PATCH", f"/rest/v1/lembretes?id=eq.{l['id']}", {"crm": crm}, prefer="return=minimal")
    print(f"ponte dos cards: {feitos} tarefa(s) concluída(s) no To Do"
          + (f", {falhas} não encontrada(s)" if falhas else "") + ("" if not simular else " (simulação)"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
