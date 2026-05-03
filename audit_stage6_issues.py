"""Etapa 6 - Diagnostico de problemas operacionais.

Identifica issues que precisam de atencao:
- Tarefas abandonadas (sem atualizacao ha > 180 dias)
- Tarefas fantasma (sem body nem checklist)
- Prazos com placeholder (XXX, ?, em branco)
- Bodies extremamente longos (> 5 KB)
- CPFs malformatados
- Datas futuras anomalas
- Inconsistencias entre title CPF e body
- Listas que deveriam ser arquivadas

Saida em /tmp/audit_stage6.md.
"""
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())
TZ_BR = timezone(timedelta(hours=-3))
NOW = datetime.now(TZ_BR)
HOJE = NOW.date()

RE_ENTRY = re.compile(r"^(\d{2}\.\d{2}\.\d{4})\s*\(([A-Z])\)\s*:\s*(.*)$", re.MULTILINE)
RE_CPF_TITULO = re.compile(r"#(\d{11})\b")
RE_CPF_TITULO_FORMATADO = re.compile(r"#(\d{3}\.\d{3}\.\d{3}-?\d{2})")


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
    todas = []
    for l in CACHE["listas"]:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas.append(t)
    abertas = [t for t in todas if t.get("status") != "completed"]

    out = []
    out.append("# Etapa 6 - Diagnostico de problemas operacionais\n")

    # ===== 6.1 Tarefas abandonadas =====
    out.append("## 6.1 Tarefas abandonadas (ultima atualizacao do body > 180 dias)\n")
    abandonadas = []
    for t in abertas:
        body = t.get("body", "") or ""
        m = RE_ENTRY.search(body)
        if m:
            try:
                data = datetime.strptime(m.group(1), "%d.%m.%Y").date()
                dias = (HOJE - data).days
                if dias > 180:
                    abandonadas.append((dias, t, m.group(2)))
            except Exception:
                pass
    abandonadas.sort(key=lambda x: -x[0])
    out.append(f"Total, {len(abandonadas)} tarefas com body parado ha mais de 180 dias.\n")
    abandonadas_por_lista = Counter()
    abandonadas_por_autor = Counter()
    for dias, t, autor in abandonadas:
        abandonadas_por_lista[t["_lista"]] += 1
        abandonadas_por_autor[autor] += 1
    out.append("Por lista (top):\n")
    for l, n in abandonadas_por_lista.most_common(10):
        out.append(f"- {l}: {n}")
    out.append("\nUltimo autor:\n")
    for a, n in abandonadas_por_autor.most_common():
        out.append(f"- ({a}): {n}")
    out.append("\nTop 10 mais antigas (sem dados pessoais expostos):\n")
    for dias, t, autor in abandonadas[:10]:
        title = t.get("title", "") or ""
        title_safe = re.sub(r"#\d{6,}", "#XXX...", title)
        out.append(f"- {dias} dias parada [{t['_lista']}] {title_safe[:60]} - ult ({autor})")
    out.append("")

    # ===== 6.2 Tarefas fantasma =====
    out.append("## 6.2 Tarefas fantasma (sem body, sem checklist e sem prazo)\n")
    fantasmas = []
    for t in abertas:
        body = (t.get("body", "") or "").strip()
        cl = t.get("checklist", [])
        due = t.get("dueDateTime")
        if not body and not cl and not due:
            fantasmas.append(t)
    out.append(f"Total, {len(fantasmas)}\n")
    por_lista_f = Counter(t["_lista"] for t in fantasmas)
    for l, n in por_lista_f.most_common(10):
        out.append(f"- {l}: {n}")
    out.append("\nAmostra (titulos):\n")
    for t in fantasmas[:15]:
        title = t.get("title", "")
        title_safe = re.sub(r"#\d{6,}", "#XXX", title)
        out.append(f"- [{t['_lista']}] {title_safe[:80]}")
    out.append("")

    # ===== 6.3 Prazos placeholder =====
    out.append("## 6.3 Prazos placeholder no body (XXX, ??, prazo em branco)\n")
    placeholder = []
    for t in abertas:
        body = t.get("body", "") or ""
        if re.search(r"prazo\s*[:\-]?\s*(?:xxx+|\?+|_+|\.\.\.)\b", body, re.IGNORECASE):
            placeholder.append(t)
        elif re.search(r"prazo\s*[:\-]?\s*(?=\n)", body, re.IGNORECASE) and "prazo" in body.lower():
            placeholder.append(t)
    out.append(f"Total, {len(placeholder)}\n")
    for t in placeholder[:15]:
        title_safe = re.sub(r"#\d{6,}", "#XXX", t.get("title", ""))
        out.append(f"- [{t['_lista']}] {title_safe[:80]}")
    out.append("")

    # ===== 6.4 Bodies absurdamente longos =====
    out.append("## 6.4 Bodies extensos demais (> 5000 chars - dificil de consultar)\n")
    longos = []
    for t in abertas:
        body = t.get("body", "") or ""
        if len(body) > 5000:
            longos.append((len(body), t))
    longos.sort(key=lambda x: -x[0])
    out.append(f"Total, {len(longos)}\n")
    out.append("Top 10:\n")
    for tam, t in longos[:10]:
        title_safe = re.sub(r"#\d{6,}", "#XXX", t.get("title", ""))
        out.append(f"- {tam:>5} chars [{t['_lista']}] {title_safe[:60]}")
    out.append("")

    # ===== 6.5 CPFs malformatados ou faltando no titulo =====
    out.append("## 6.5 Inconsistencias no padrao Nome #CPF11 (titulo)\n")
    sem_cpf = []
    cpf_formato_errado = []
    cpf_invalido = []
    for t in abertas:
        title = t.get("title", "") or ""
        if t["_lista"] in ["Tarefas", "🛄 Mensagens", "Paulo Acessos", "Conceitos de Direito Previdenciário",
                          "REsp, RE, TNU e TRU", "Jurisprudência", "Leiloeiros", "Bancos", "Capital 2",
                          "💡 Vídeos Explicativos", "Escrita", "Pai", "Pietra", "Arkad",
                          "Lista sem título", "Lista sem título 1", "Lista sem título 1 (1)",
                          "Petição Inicial", "Audiências", "Recurso ou Contrarrazões Judiciais",
                          "Recurso Administrativo", "Impugnações", "Escritório", "🎓 Fluxo de Trabalho",
                          "🔎 Leilões", "Paulo Acessos", "Clientes Encerrados", "Clientes em Andamento",
                          "Clientes Agroambiental", "Izildo Aparecido Machado Fumes",
                          "💫 Willian Braga Marcussi"]:
            continue
        if RE_CPF_TITULO.search(title):
            cpf_match = RE_CPF_TITULO.search(title).group(1)
            if len(set(cpf_match)) <= 2:
                cpf_invalido.append((t, cpf_match))
            continue
        if RE_CPF_TITULO_FORMATADO.search(title):
            cpf_formato_errado.append(t)
            continue
        sem_cpf.append(t)
    out.append(f"- Tarefas sem #CPF11 no titulo (em listas de cliente): {len(sem_cpf)}")
    out.append(f"- Tarefas com CPF formatado em vez de compacto: {len(cpf_formato_errado)}")
    out.append(f"- CPFs com aparente padrao invalido: {len(cpf_invalido)}\n")
    out.append("Amostra sem CPF no titulo:\n")
    for t in sem_cpf[:10]:
        out.append(f"- [{t['_lista']}] {t.get('title','')[:80]}")
    if cpf_formato_errado:
        out.append("\nFormato pontuado em vez de compacto:\n")
        for t in cpf_formato_errado[:5]:
            out.append(f"- [{t['_lista']}] {t.get('title','')[:80]}")
    out.append("")

    # ===== 6.6 Reminders solitarios =====
    out.append("## 6.6 Configuracoes inconsistentes de prazo/lembrete\n")
    rem_sem_due = sum(1 for t in abertas if t.get("isReminderOn") and not t.get("dueDateTime"))
    due_sem_rem = sum(1 for t in abertas if t.get("dueDateTime") and not t.get("isReminderOn"))
    out.append(f"- Lembrete ligado mas sem prazo: {rem_sem_due}")
    out.append(f"- Prazo configurado mas sem lembrete: {due_sem_rem}\n")

    # ===== 6.7 Importance high =====
    out.append("## 6.7 Tarefas com prioridade alta (uso atual)\n")
    high = [t for t in abertas if t.get("importance") == "high"]
    out.append(f"Total {len(high)}\n")
    for t in high:
        title_safe = re.sub(r"#\d{6,}", "#XXX", t.get("title", ""))
        out.append(f"- [{t['_lista']}] {title_safe[:80]}")
    out.append("")

    # ===== 6.8 Listas que merecem ser arquivadas =====
    out.append("## 6.8 Listas candidatas a arquivamento ou consolidacao\n")
    candidatas = []
    for l in CACHE["listas"]:
        nome = l["displayName"]
        n_total = len(l["tarefas"])
        n_aberta = sum(1 for t in l["tarefas"] if t.get("status") != "completed")
        n_concluida = n_total - n_aberta
        if n_total == 0:
            candidatas.append((nome, "vazia", n_aberta, n_concluida))
        elif "sem t" in nome.lower():
            candidatas.append((nome, "sem titulo", n_aberta, n_concluida))
        elif n_aberta == 0 and n_concluida > 0:
            candidatas.append((nome, "sem abertas", n_aberta, n_concluida))
    out.append("| Lista | Motivo | Abertas | Concluidas |")
    out.append("|---|---|---:|---:|")
    for nome, motivo, ab, conc in candidatas:
        out.append(f"| {nome} | {motivo} | {ab} | {conc} |")
    out.append("")

    # ===== 6.9 Bodies muito longos sem entrada datada recente =====
    out.append("## 6.9 Tarefas com historico longo mas sem atualizacao recente\n")
    estagnadas = []
    for t in abertas:
        body = t.get("body", "") or ""
        if len(body) < 500:
            continue
        m = RE_ENTRY.search(body)
        if not m:
            continue
        try:
            data = datetime.strptime(m.group(1), "%d.%m.%Y").date()
            dias = (HOJE - data).days
            if dias > 90:
                estagnadas.append((dias, len(body), t))
        except Exception:
            pass
    estagnadas.sort(key=lambda x: -x[0])
    out.append(f"Total {len(estagnadas)} (rich body mas parada > 90 dias):\n")
    for dias, tam, t in estagnadas[:10]:
        title_safe = re.sub(r"#\d{6,}", "#XXX", t.get("title", ""))
        out.append(f"- {dias} dias parada, {tam} chars [{t['_lista']}] {title_safe[:60]}")
    out.append("")

    # ===== 6.10 Caracteristicas anomalas =====
    out.append("## 6.10 Marcadores e caracteres especiais\n")
    star = sum(1 for t in abertas if "★" in (t.get("title", "") or ""))
    bot = sum(1 for t in abertas if "🤖" in (t.get("title", "") or ""))
    bday = sum(1 for t in abertas if "🎂" in (t.get("title", "") or ""))
    out.append(f"- Com ★ (importante): {star}")
    out.append(f"- Com 🤖 (analisado por IA): {bot}")
    out.append(f"- Com 🎂 (aniversario): {bday}\n")

    # ===== 6.11 Aposentadorias Futuras especifica =====
    out.append("## 6.11 Diagnostico Aposentadorias Futuras (336 abertas)\n")
    af = [t for t in abertas if t["_lista"] == "🙏 Aposentadorias Futuras"]
    af_sem_due = sum(1 for t in af if not t.get("dueDateTime"))
    af_sem_body = sum(1 for t in af if not (t.get("body","") or "").strip())
    af_due_proximo = []
    for t in af:
        d = parse_dt(t.get("dueDateTime"))
        if d and d.date() <= HOJE + timedelta(days=180):
            af_due_proximo.append(t)
    out.append(f"- Sem prazo configurado: {af_sem_due}")
    out.append(f"- Sem body: {af_sem_body}")
    out.append(f"- Prazo nos proximos 180 dias (PRECISAM ACAO): {len(af_due_proximo)}")
    out.append("\nAmostra dos que vencem nos proximos 180 dias:\n")
    for t in af_due_proximo[:15]:
        d = parse_dt(t.get("dueDateTime"))
        title_safe = re.sub(r"#\d{6,}", "#XXX", t.get("title", ""))
        out.append(f"- {d.date().isoformat() if d else '?'} {title_safe[:60]}")
    out.append("")

    # ===== 6.12 Pagamentos especifico =====
    out.append("## 6.12 Diagnostico Pagamentos (51 abertas)\n")
    pg = [t for t in abertas if t["_lista"] == "💵 Pagamentos"]
    pg_sem_body = sum(1 for t in pg if not (t.get("body","") or "").strip())
    pg_sem_cl = sum(1 for t in pg if not t.get("checklist"))
    pg_sem_nada = sum(1 for t in pg if not (t.get("body","") or "").strip() and not t.get("checklist"))
    out.append(f"- Sem body: {pg_sem_body}")
    out.append(f"- Sem checklist (sem registro de valor/data): {pg_sem_cl}")
    out.append(f"- Sem body E sem checklist (cobranca cega): {pg_sem_nada}")
    out.append("")

    Path("/tmp/audit_stage6.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
