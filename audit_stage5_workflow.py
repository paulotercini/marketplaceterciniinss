"""Etapa 5 - Fluxo entre colaboradores (P, A, M, D, I).

Analisa:
- Distribuicao de autoria por lista
- Especializacao de cada colaborador (em que lista/beneficio aparecem mais)
- Handoffs (transicoes de autor consecutivas no body)
- Quem segura tarefas atualmente abertas (ultimo autor)
- Tempo entre entradas de autores diferentes
- Co-ocorrencia (quando dois autores aparecem no mesmo body)

Saida em /tmp/audit_stage5.md.
"""
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())
RE_ENTRY = re.compile(r"^(\d{2}\.\d{2}\.\d{4})\s*\(([A-Z])\)\s*:\s*(.*)$", re.MULTILINE)

AUTORES_NOMES = {
    "P": "Paulo",
    "A": "Amanda",
    "M": "Marcos",
    "D": "André",
    "I": "Ingrid",
    "L": "Legado",
    "G": "Descontinuado",
}


def parse_date(s):
    try:
        return datetime.strptime(s, "%d.%m.%Y").date()
    except Exception:
        return None


def main():
    todas = []
    for l in CACHE["listas"]:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas.append(t)
    abertas = [t for t in todas if t.get("status") != "completed"]

    out = []
    out.append("# Etapa 5 - Fluxo entre colaboradores\n")

    # ===== 5.1 Distribuicao de autoria por lista =====
    out.append("## 5.1 Distribuicao de entradas por autor por lista (top 10 listas)\n")
    autor_lista = defaultdict(lambda: Counter())
    total_lista = Counter()
    for t in todas:
        body = t.get("body", "") or ""
        for m in RE_ENTRY.finditer(body):
            autor = m.group(2)
            autor_lista[t["_lista"]][autor] += 1
            total_lista[t["_lista"]] += 1

    listas_top = [l for l, _ in total_lista.most_common(15)]
    out.append("| Lista | Total | P | A | M | D | I |")
    out.append("|---|---:|---:|---:|---:|---:|---:|")
    for nome in listas_top:
        c = autor_lista[nome]
        total = total_lista[nome]
        if total < 20:
            continue
        def pct(a):
            return f"{c[a]} ({c[a]/total*100:.0f}%)" if c[a] else "-"
        out.append(f"| {nome} | {total} | {pct('P')} | {pct('A')} | {pct('M')} | {pct('D')} | {pct('I')} |")
    out.append("")

    # ===== 5.2 Especializacao por colaborador =====
    out.append("## 5.2 Onde cada colaborador atua mais (top 5 listas por autor)\n")
    autor_listas_distrib = defaultdict(Counter)
    for t in todas:
        body = t.get("body", "") or ""
        for m in RE_ENTRY.finditer(body):
            autor = m.group(2)
            autor_listas_distrib[autor][t["_lista"]] += 1

    for autor in ["P", "A", "M", "D", "I"]:
        nome = AUTORES_NOMES[autor]
        total_a = sum(autor_listas_distrib[autor].values())
        out.append(f"\n### ({autor}) {nome} — {total_a} entradas totais")
        out.append("| Lista | Entradas | % das suas |")
        out.append("|---|---:|---:|")
        for lista, n in autor_listas_distrib[autor].most_common(7):
            if total_a == 0:
                continue
            out.append(f"| {lista} | {n} | {n/total_a*100:.1f} % |")
    out.append("")

    # ===== 5.3 Handoffs - transicoes consecutivas =====
    out.append("\n## 5.3 Handoffs - sequencias de autores consecutivos\n")
    transicoes = Counter()
    for t in todas:
        body = t.get("body", "") or ""
        autores_seq = [m.group(2) for m in RE_ENTRY.finditer(body)]
        # Body eh em ordem reversa (mais recente em cima), entao para handoff cronologico inverter
        autores_cronologico = list(reversed(autores_seq))
        for i in range(len(autores_cronologico) - 1):
            a1, a2 = autores_cronologico[i], autores_cronologico[i+1]
            if a1 != a2:
                transicoes[(a1, a2)] += 1
    out.append("Top 15 transicoes (de quem -> para quem):\n")
    out.append("| De | Para | Frequencia |")
    out.append("|---|---|---:|")
    for (a1, a2), n in transicoes.most_common(15):
        out.append(f"| ({a1}) {AUTORES_NOMES.get(a1, a1)} | ({a2}) {AUTORES_NOMES.get(a2, a2)} | {n} |")
    out.append("")

    # ===== 5.4 Quem segura tarefas abertas =====
    out.append("## 5.4 Ultimo autor das tarefas ABERTAS (quem 'esta segurando')\n")
    ultimo_autor_geral = Counter()
    ultimo_por_lista = defaultdict(Counter)
    for t in abertas:
        body = t.get("body", "") or ""
        m = RE_ENTRY.search(body)
        if m:
            autor = m.group(2)
            ultimo_autor_geral[autor] += 1
            ultimo_por_lista[t["_lista"]][autor] += 1
        else:
            ultimo_autor_geral["(sem entrada)"] += 1
            ultimo_por_lista[t["_lista"]]["(sem entrada)"] += 1
    out.append("Geral:\n")
    out.append("| Ultimo autor | Tarefas abertas | % |")
    out.append("|---|---:|---:|")
    total_ab = sum(ultimo_autor_geral.values())
    for a, n in ultimo_autor_geral.most_common():
        nome = AUTORES_NOMES.get(a, a)
        out.append(f"| ({a}) {nome} | {n} | {n/total_ab*100:.1f} % |")
    out.append("\nPor lista (top listas com mais abertas):\n")
    out.append("| Lista | Total ab. | P | A | M | D | I | s/entrada |")
    out.append("|---|---:|---:|---:|---:|---:|---:|---:|")
    for nome_lista in sorted(ultimo_por_lista.keys(), key=lambda x: -sum(ultimo_por_lista[x].values()))[:15]:
        c = ultimo_por_lista[nome_lista]
        total = sum(c.values())
        if total < 5:
            continue
        out.append(f"| {nome_lista} | {total} | {c.get('P',0)} | {c.get('A',0)} | {c.get('M',0)} | {c.get('D',0)} | {c.get('I',0)} | {c.get('(sem entrada)',0)} |")
    out.append("")

    # ===== 5.5 Tempo de "posse" - dias desde ultima entrada =====
    out.append("## 5.5 Tempo desde a ultima atualizacao por autor (em ABERTAS)\n")
    HOJE = datetime.now().date()
    tempo_por_autor = defaultdict(list)
    for t in abertas:
        body = t.get("body", "") or ""
        m = RE_ENTRY.search(body)
        if m:
            autor = m.group(2)
            data = parse_date(m.group(1))
            if data:
                dias = (HOJE - data).days
                tempo_por_autor[autor].append(dias)
    out.append("| Autor | Tarefas | Idade media | Mediana | Max |")
    out.append("|---|---:|---:|---:|---:|")
    for autor in ["P", "A", "M", "D", "I"]:
        dias_list = tempo_por_autor[autor]
        if not dias_list:
            continue
        dias_list.sort()
        media = sum(dias_list) / len(dias_list)
        mediana = dias_list[len(dias_list)//2]
        nome = AUTORES_NOMES[autor]
        out.append(f"| ({autor}) {nome} | {len(dias_list)} | {media:.0f} dias | {mediana} dias | {max(dias_list)} dias |")
    out.append("")

    # ===== 5.6 Co-ocorrencia (quem trabalha junto) =====
    out.append("## 5.6 Co-ocorrencia de autores no mesmo body (todas tarefas)\n")
    coocorrencia = Counter()
    for t in todas:
        body = t.get("body", "") or ""
        autores_no_body = set(m.group(2) for m in RE_ENTRY.finditer(body))
        autores_no_body.discard("L")
        autores_no_body.discard("G")
        if len(autores_no_body) >= 2:
            for a1 in autores_no_body:
                for a2 in autores_no_body:
                    if a1 < a2:
                        coocorrencia[(a1, a2)] += 1
    out.append("Pares mais frequentes (atuam no mesmo caso):\n")
    out.append("| Dupla | Casos compartilhados |")
    out.append("|---|---:|")
    for (a1, a2), n in coocorrencia.most_common(15):
        n1 = AUTORES_NOMES.get(a1, a1)
        n2 = AUTORES_NOMES.get(a2, a2)
        out.append(f"| ({a1}) {n1} + ({a2}) {n2} | {n} |")
    out.append("")

    # ===== 5.7 Cadencia temporal =====
    out.append("## 5.7 Atividade por mes por autor (ultimos 12 meses)\n")
    autor_mes = defaultdict(Counter)
    for t in todas:
        body = t.get("body", "") or ""
        for m in RE_ENTRY.finditer(body):
            autor = m.group(2)
            data = parse_date(m.group(1))
            if data:
                mes = data.strftime("%Y-%m")
                autor_mes[autor][mes] += 1
    meses = sorted(set(m for c in autor_mes.values() for m in c.keys()))[-12:]
    out.append("| Mês | P | A | M | D | I |")
    out.append("|---|---:|---:|---:|---:|---:|")
    for mes in meses:
        out.append(f"| {mes} | {autor_mes['P'][mes]} | {autor_mes['A'][mes]} | {autor_mes['M'][mes]} | {autor_mes['D'][mes]} | {autor_mes['I'][mes]} |")
    out.append("")

    Path("/tmp/audit_stage5.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
