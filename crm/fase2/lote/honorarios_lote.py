"""Saneamento dos cadastros, passada 5 (honorários) · 28.11.2026.

A linha de `pagamentos` que veio do checklist do To Do e que a regra da
sincronização (`migrar.e_parcela`) já não trata como parcela (senha, CPF,
telefone, protocolo, parceria, nome...) sai da lista de honorários por estado:
status "cancelado" com o motivo, sem apagar. A descrição fica na linha, a cópia
vai antes para `_bkp_san` e o Desfazer é devolver o status da cópia. A
sincronização não reescreve essas linhas, porque o item que não é parcela não
entra no upsert (vai a `fora_de_pagamentos`). O To Do não é tocado.

Só a linha que o CRM nunca tocou: sem conferência, sem edição, nascida do To Do.

ESCREVER=1 grava; sem ele, apenas conta. LOTE nomeia a cópia. O log é público:
só contagens e somas.
"""
import collections, datetime, os, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import migrar  # noqa: E402

URL, CHAVE = os.environ.get("SUPABASE_URL", ""), os.environ.get("SUPABASE_SERVICE_KEY", "")
ESCREVER = os.environ.get("ESCREVER") == "1"
LOTE = os.environ.get("LOTE") or "honorarios-" + datetime.date.today().strftime("%Y%m%d")
MOTIVO = "Saneamento dos cadastros (28.11.2026): o item do checklist não é honorário ({tipo}); o dado segue na descrição"


def candidatos(pgs, cpfs):
    """(linha, tipo) das linhas que a regra da sincronização não trata como parcela."""
    out = []
    for p in pgs:
        tid = str(p.get("todo_item_id") or "")
        if (p.get("status") not in ("aberto", "recebido") or not tid or tid.startswith("hon:")
                or p.get("conferencias") or p.get("editado_por")):
            continue
        cpf = cpfs.get(p.get("cliente_id"))
        if migrar.e_parcela(p.get("descricao"), cpf):
            continue
        out.append((p, migrar.classificar_item_checklist(p.get("descricao"), cpf)[0]))
    return out


def main():
    pgs = migrar._rest_todas(URL, CHAVE, "/rest/v1/pagamentos?select=id,cliente_id,descricao,valor,status,conferencias,todo_item_id,editado_por")
    clis = migrar._rest_todas(URL, CHAVE, "/rest/v1/clientes?select=id,cpf")
    cpfs = {c["id"]: c.get("cpf") for c in clis}
    sai = candidatos(pgs, cpfs)
    print(f"linhas em pagamentos: {len(pgs)}; não são honorário: {len(sai)}")
    for (st, tipo), n in sorted(collections.Counter((p["status"], t) for p, t in sai).items()):
        print(f"  {st:9} {tipo:14} {n}")
    fora = {p["id"] for p, _ in sai}
    soma = collections.defaultdict(float)
    for p in pgs:
        if p["status"] != "cancelado" and p["id"] not in fora and p.get("valor") is not None:
            soma[p["status"]] += float(p["valor"])
    print("honorários que ficam: " + "; ".join(f"{k} R$ {v:,.2f}" for k, v in sorted(soma.items())))
    if not ESCREVER:
        print("ensaio: nada gravado")
        return
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for i in range(0, len(sai), 100):
        bloco = sai[i:i + 100]
        migrar._rest(URL, CHAVE, "POST", "/rest/v1/_bkp_san?on_conflict=lote,tabela,linha_id",
                     [{"lote": LOTE, "tabela": "pagamentos", "linha_id": p["id"], "linha": p} for p, _ in bloco],
                     prefer="resolution=ignore-duplicates,return=minimal")
    feitos = 0
    for tipo in sorted({t for _, t in sai}):
        ids = [p["id"] for p, t in sai if t == tipo]
        for i in range(0, len(ids), 100):
            r = migrar._rest(URL, CHAVE, "PATCH",
                             "/rest/v1/pagamentos?status=in.(aberto,recebido)&or=(conferencias.is.null,conferencias.eq.%5B%5D)&id=in.("
                             + ",".join(ids[i:i + 100]) + ")&select=id",
                             {"status": "cancelado", "cancelado_motivo": MOTIVO.format(tipo=tipo), "cancelado_em": agora},
                             prefer="return=representation") or []
            feitos += len(r)
    print(f"gravado: {feitos} linhas fora da lista de honorários; cópia em _bkp_san, lote {LOTE}")


if __name__ == "__main__":
    main()
