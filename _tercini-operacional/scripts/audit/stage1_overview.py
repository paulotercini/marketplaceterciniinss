"""Etapa 1 da auditoria - Inventario quantitativo.

Le /tmp/audit_cache.json e gera relatorio sem expor dados pessoais.
Saida em /tmp/audit_stage1.md (markdown agregado, seguro).
"""
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())
TZ_BR = timezone(timedelta(hours=-3))
NOW = datetime.now(TZ_BR)


def parse_dt(d):
    if not d:
        return None
    try:
        s = d if isinstance(d, str) else d.get("dateTime", "")
        s = s.replace("Z", "+00:00")
        if "+" not in s and "-" not in s[10:]:
            s += "+00:00"
        return datetime.fromisoformat(s).astimezone(TZ_BR)
    except Exception:
        return None


def main():
    listas = CACHE["listas"]
    todas_tarefas = []
    for l in listas:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas_tarefas.append(t)

    out = []
    out.append("# Etapa 1 - Inventário Quantitativo\n")
    out.append(f"Cache gerado em {CACHE['geradoEm']}. Auditoria executada em {NOW.strftime('%Y-%m-%d %H:%M %Z')}.\n")

    # ===== Volume global =====
    total = len(todas_tarefas)
    abertas = sum(1 for t in todas_tarefas if t.get("status") != "completed")
    concluidas = total - abertas
    out.append("## 1.1 Volume global\n")
    out.append(f"- **Listas**: {len(listas)}")
    out.append(f"- **Tarefas (todas)**: {total}")
    out.append(f"- **Abertas**: {abertas} ({abertas/total*100:.1f} %)")
    out.append(f"- **Concluídas**: {concluidas} ({concluidas/total*100:.1f} %)")
    cs = sum(len(t.get("checklist", [])) for t in todas_tarefas)
    out.append(f"- **Itens de checklist totais**: {cs}")
    out.append(f"- **Média checklist/tarefa**: {cs/total:.2f}\n")

    # ===== Distribuicao por lista =====
    out.append("## 1.2 Distribuição por lista\n")
    out.append("| Lista | Total | Abertas | Concluídas | Taxa concl. | % do total |")
    out.append("|---|---:|---:|---:|---:|---:|")
    rows = []
    for l in listas:
        total_l = len(l["tarefas"])
        abertas_l = sum(1 for t in l["tarefas"] if t.get("status") != "completed")
        conc_l = total_l - abertas_l
        taxa = conc_l / total_l * 100 if total_l else 0
        rows.append((total_l, l["displayName"], abertas_l, conc_l, taxa, total_l / total * 100))
    for total_l, nome, abertas_l, conc_l, taxa, pct in sorted(rows, key=lambda x: -x[0]):
        out.append(f"| {nome} | {total_l} | {abertas_l} | {conc_l} | {taxa:.0f} % | {pct:.1f} % |")
    out.append("")

    # ===== Importance distribution =====
    out.append("## 1.3 Distribuição por prioridade\n")
    imp = Counter(t.get("importance", "normal") for t in todas_tarefas if t.get("status") != "completed")
    out.append("| Prioridade | Abertas | % das abertas |")
    out.append("|---|---:|---:|")
    for k, v in imp.most_common():
        out.append(f"| {k} | {v} | {v/abertas*100:.1f} % |")
    out.append("")

    # ===== Due dates =====
    out.append("## 1.4 Prazos (dueDateTime)\n")
    com_prazo = []
    for t in todas_tarefas:
        if t.get("status") == "completed":
            continue
        dt = parse_dt(t.get("dueDateTime"))
        if dt:
            com_prazo.append((dt, t))
    sem_prazo = abertas - len(com_prazo)
    out.append(f"- **Com prazo**: {len(com_prazo)} ({len(com_prazo)/abertas*100:.1f} % das abertas)")
    out.append(f"- **Sem prazo**: {sem_prazo} ({sem_prazo/abertas*100:.1f} % das abertas)")
    if com_prazo:
        com_prazo.sort(key=lambda x: x[0])
        atrasadas = [t for dt, t in com_prazo if dt.date() < NOW.date()]
        hoje = [t for dt, t in com_prazo if dt.date() == NOW.date()]
        prox7 = [t for dt, t in com_prazo if NOW.date() < dt.date() <= (NOW + timedelta(days=7)).date()]
        prox30 = [t for dt, t in com_prazo if (NOW + timedelta(days=7)).date() < dt.date() <= (NOW + timedelta(days=30)).date()]
        futuras = [t for dt, t in com_prazo if dt.date() > (NOW + timedelta(days=30)).date()]
        out.append(f"  - **Atrasadas**: {len(atrasadas)}")
        out.append(f"  - **Vencem hoje**: {len(hoje)}")
        out.append(f"  - **Próximos 7 dias**: {len(prox7)}")
        out.append(f"  - **8-30 dias**: {len(prox30)}")
        out.append(f"  - **Mais de 30 dias**: {len(futuras)}")
        out.append(f"- **Prazo mais antigo**: {com_prazo[0][0].date().isoformat()}")
        out.append(f"- **Prazo mais distante**: {com_prazo[-1][0].date().isoformat()}")
    out.append("")

    # ===== Idade das tarefas abertas =====
    out.append("## 1.5 Idade das tarefas abertas\n")
    ages = []
    sem_data = 0
    for t in todas_tarefas:
        if t.get("status") == "completed":
            continue
        cd = parse_dt(t.get("createdDateTime"))
        if cd:
            ages.append((NOW - cd).days)
        else:
            sem_data += 1
    if ages:
        ages.sort()
        out.append(f"- **Mais antiga aberta**: {max(ages)} dias")
        out.append(f"- **Mediana de idade**: {ages[len(ages)//2]} dias")
        out.append(f"- **< 30 dias**: {sum(1 for a in ages if a < 30)}")
        out.append(f"- **30-90 dias**: {sum(1 for a in ages if 30 <= a < 90)}")
        out.append(f"- **90-180 dias**: {sum(1 for a in ages if 90 <= a < 180)}")
        out.append(f"- **180-365 dias**: {sum(1 for a in ages if 180 <= a < 365)}")
        out.append(f"- **> 1 ano**: {sum(1 for a in ages if a >= 365)}")
        out.append(f"- **> 2 anos**: {sum(1 for a in ages if a >= 730)}")
    if sem_data:
        out.append(f"- **Sem data de criação registrada**: {sem_data}")
    out.append("")

    # ===== Reminders e Meu Dia =====
    out.append("## 1.6 Lembretes\n")
    com_reminder = sum(1 for t in todas_tarefas if t.get("status") != "completed" and t.get("isReminderOn"))
    out.append(f"- **Tarefas abertas com isReminderOn=True**: {com_reminder}")
    out.append(f"- **Sem lembrete configurado**: {abertas - com_reminder}")
    out.append("")

    # ===== Body / checklist coverage =====
    out.append("## 1.7 Cobertura de contexto (body e checklist)\n")
    body_vazio = 0
    body_min = 0
    body_rico = 0
    cl_vazio = 0
    for t in todas_tarefas:
        if t.get("status") == "completed":
            continue
        body = t.get("body", "") or ""
        if not body.strip():
            body_vazio += 1
        elif len(body) < 80:
            body_min += 1
        else:
            body_rico += 1
        if not t.get("checklist"):
            cl_vazio += 1
    out.append(f"- **Body vazio (abertas)**: {body_vazio} ({body_vazio/abertas*100:.1f} %)")
    out.append(f"- **Body mínimo (< 80 chars)**: {body_min}")
    out.append(f"- **Body rico (>= 80 chars)**: {body_rico}")
    out.append(f"- **Sem checklist (abertas)**: {cl_vazio} ({cl_vazio/abertas*100:.1f} %)")
    out.append("")

    # ===== Atividade temporal =====
    out.append("## 1.8 Atividade temporal\n")
    # Tarefas concluidas por mes (ultimos 12 meses)
    conc_por_mes = Counter()
    for t in todas_tarefas:
        cd = parse_dt(t.get("completedDateTime"))
        if cd:
            mes = cd.strftime("%Y-%m")
            conc_por_mes[mes] += 1
    if conc_por_mes:
        ultimos = sorted(conc_por_mes.items())[-15:]
        out.append("Tarefas concluídas por mês (últimos 15 meses):\n")
        out.append("| Mês | Concluídas |")
        out.append("|---|---:|")
        for mes, n in ultimos:
            out.append(f"| {mes} | {n} |")
    out.append("")

    # Criadas por mes (ultimos 15 meses)
    cri_por_mes = Counter()
    for t in todas_tarefas:
        cd = parse_dt(t.get("createdDateTime"))
        if cd:
            mes = cd.strftime("%Y-%m")
            cri_por_mes[mes] += 1
    if cri_por_mes:
        ultimos = sorted(cri_por_mes.items())[-15:]
        out.append("Tarefas criadas por mês (últimos 15 meses):\n")
        out.append("| Mês | Criadas |")
        out.append("|---|---:|")
        for mes, n in ultimos:
            out.append(f"| {mes} | {n} |")

    Path("/tmp/audit_stage1.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
