"""Etapa 2 da auditoria - Padroes de titulo e nomenclatura.

Verifica conformidade com 'Nome Completo #CPF11digitos', mapeia marcadores
(estrela, robo, bolo), distingue duplicatas legitimas (mesmo cliente em
listas diferentes) das erradas (mesma lista), identifica nao-clientes.

Saida em /tmp/audit_stage2.md.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())

# Padroes
RE_CPF = re.compile(r"#\s*(\d{11})\b")
RE_CPF_PONT = re.compile(r"#\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})")
RE_NUM_QUALQUER = re.compile(r"#\s*(\d+)")
MARCADORES = ["★", "🤖", "🎂", "💫", "🛄", "🔎", "🌻", "🖥", "🗓", "🙋", "🙏", "👪", "💵", "☕", "🎓", "💡"]


def mascara_cpf(cpf):
    if not cpf:
        return ""
    s = re.sub(r"\D", "", cpf)
    if len(s) == 11:
        return f"***.***.{s[6:9]}-{s[9:]}"
    return f"#{cpf[:4]}...{cpf[-2:]}"


def main():
    todas = []
    for l in CACHE["listas"]:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas.append(t)

    abertas = [t for t in todas if t.get("status") != "completed"]

    out = []
    out.append("# Etapa 2 - Padroes de titulo e nomenclatura\n")
    out.append(f"Base, {len(abertas)} tarefas abertas.\n")

    # ===== 2.1 Conformidade com #CPF11 =====
    out.append("## 2.1 Conformidade com o padrao Nome #CPF11digitos\n")
    com_cpf11 = 0
    com_cpf_pontuado = 0
    com_outro_numero = 0
    sem_numero = 0
    so_nome = 0
    titulos_sem_cpf = []
    for t in abertas:
        title = t.get("title", "")
        if RE_CPF.search(title):
            com_cpf11 += 1
        elif RE_CPF_PONT.search(title):
            com_cpf_pontuado += 1
        elif RE_NUM_QUALQUER.search(title):
            com_outro_numero += 1
        else:
            sem_numero += 1
            titulos_sem_cpf.append((t["_lista"], title))

    total_ab = len(abertas)
    out.append(f"- **Com #CPF de 11 digitos sem pontuacao** (padrao canonico): {com_cpf11} ({com_cpf11/total_ab*100:.1f} %)")
    out.append(f"- **Com #CPF pontuado (000.000.000-00)**: {com_cpf_pontuado} (desvio de padrao)")
    out.append(f"- **Com outro numero apos #** (telefone, processo, etc): {com_outro_numero}")
    out.append(f"- **Sem qualquer numero apos #**: {sem_numero}")
    out.append("")

    # ===== 2.2 Marcadores =====
    out.append("## 2.2 Marcadores no titulo\n")
    out.append("| Marcador | Significado | Total abertas |")
    out.append("|---|---|---:|")
    contagem_marcadores = Counter()
    for t in abertas:
        title = t.get("title", "")
        for m in MARCADORES:
            if m in title:
                contagem_marcadores[m] += 1
    sig = {
        "★": "Importante (Smart List)",
        "🤖": "Caso analisado por IA",
        "🎂": "Aniversario de cliente",
        "💫": "Cliente com lista dedicada (Willian Braga)",
        "🛄": "Mensagens",
        "🔎": "Leiloes",
        "🌻": "INSS",
        "🖥": "Conselho de Recursos",
        "🗓": "Tarefas com Prazo",
        "🙋": "Escritorio",
        "🙏": "Aposentadorias Futuras",
        "👪": "Judicial",
        "💵": "Pagamentos",
        "☕": "Marcos",
        "🎓": "Fluxo de Trabalho",
        "💡": "Videos Explicativos",
    }
    for m, n in contagem_marcadores.most_common():
        out.append(f"| {m} | {sig.get(m, '?')} | {n} |")
    out.append("")

    # ===== 2.3 Duplicatas =====
    out.append("## 2.3 Duplicatas (mesmo cliente em multiplas listas)\n")
    # Agrupar por CPF
    por_cpf = defaultdict(list)
    so_titulo = defaultdict(list)
    for t in todas:
        title = t.get("title", "")
        m = RE_CPF.search(title) or RE_CPF_PONT.search(title)
        if m:
            cpf = re.sub(r"\D", "", m.group(1))
            por_cpf[cpf].append(t)
        else:
            # nao tem CPF, agrupa pelo titulo limpo (sem marcadores)
            limpo = title
            for mk in MARCADORES:
                limpo = limpo.replace(mk, "")
            limpo = limpo.strip()
            if limpo:
                so_titulo[limpo].append(t)

    multi_lista = [(cpf, ts) for cpf, ts in por_cpf.items() if len({t["_lista"] for t in ts}) > 1]
    multi_mesma_lista = [(cpf, ts) for cpf, ts in por_cpf.items() for tl in [Counter(t["_lista"] for t in ts)] if any(c > 1 for c in tl.values())]

    out.append(f"- **Clientes em mais de uma lista** (legitimo, padrao consciente): {len(multi_lista)}")
    out.append(f"- **Clientes com mais de uma tarefa NA MESMA LISTA** (potencial erro): {len(multi_mesma_lista)}")
    out.append(f"- **Clientes unicos identificados por CPF**: {len(por_cpf)}\n")

    # Top 10 clientes com mais tarefas distribuidas
    top_clientes = sorted(por_cpf.items(), key=lambda x: -len(x[1]))[:10]
    out.append("### Top 10 clientes com mais tarefas (todas as listas, abertas+concluidas)\n")
    out.append("| CPF mascarado | # tarefas | Listas distintas |")
    out.append("|---|---:|---|")
    for cpf, ts in top_clientes:
        listas = sorted(set(t["_lista"] for t in ts))
        out.append(f"| {mascara_cpf(cpf)} | {len(ts)} | {', '.join(listas)} |")
    out.append("")

    # Casos suspeitos: mesma lista + mesmo cliente
    if multi_mesma_lista:
        out.append("### Casos a investigar - mesmo cliente, mesma lista, mais de uma tarefa\n")
        out.append("(Pode ser multiplo pedido legitimo ou erro de digitacao)\n")
        for cpf, ts in multi_mesma_lista[:10]:
            cl = Counter(t["_lista"] for t in ts)
            duplicadas = [(l, n) for l, n in cl.items() if n > 1]
            for lista, n in duplicadas:
                out.append(f"- {mascara_cpf(cpf)} -> {n}x em '{lista}'")
        out.append("")

    # ===== 2.4 Titulos que NAO sao clientes (não tem CPF) =====
    out.append("## 2.4 Titulos que NAO seguem padrao Cliente #CPF\n")
    out.append("Distribuicao dos titulos sem CPF:\n")
    sem_cpf_por_lista = Counter(t[0] for t in titulos_sem_cpf)
    out.append("| Lista | Titulos sem CPF (abertas) |")
    out.append("|---|---:|")
    for l, n in sem_cpf_por_lista.most_common():
        out.append(f"| {l} | {n} |")
    out.append("")

    # Amostras dos titulos sem CPF (mascarando se tiver nome proprio obvio)
    out.append("### Amostras de titulos sem CPF\n")
    amostras_por_lista = defaultdict(list)
    for lista, titulo in titulos_sem_cpf:
        if len(amostras_por_lista[lista]) < 5:
            amostras_por_lista[lista].append(titulo)
    for lista in sorted(amostras_por_lista.keys()):
        out.append(f"\n**{lista}**:")
        for t in amostras_por_lista[lista]:
            out.append(f"  - {t}")
    out.append("")

    # ===== 2.5 Casos limite =====
    out.append("## 2.5 Anomalias e casos limite\n")

    # CPFs que aparecem em titulos mas com pontuacao
    if com_cpf_pontuado:
        out.append(f"- **{com_cpf_pontuado} titulos com CPF pontuado** (000.000.000-00) - desvio do padrao canonico. Sugestao, normalizar.")

    # Titulos com #CPF mas com numeros que nao sao CPF (telefones, processos)
    suspeitas_numero = []
    for t in abertas:
        title = t.get("title", "")
        if not RE_CPF.search(title):
            m = RE_NUM_QUALQUER.search(title)
            if m and len(m.group(1)) != 11:
                suspeitas_numero.append((t["_lista"], title, m.group(1)))
    if suspeitas_numero:
        out.append(f"- **{len(suspeitas_numero)} titulos com # seguido de numero NAO-CPF** (provavel processo, telefone ou erro)")
        for lista, titulo, num in suspeitas_numero[:10]:
            out.append(f"  - [{lista}] '{titulo}' (numero {num} com {len(num)} digitos)")
    out.append("")

    # Titulos muito curtos
    muito_curtos = [t for t in abertas if len(t.get("title", "").strip()) < 10]
    out.append(f"- **{len(muito_curtos)} titulos muito curtos** (menos de 10 chars) - dificultam busca")
    if muito_curtos:
        out.append("  Amostras:")
        for t in muito_curtos[:10]:
            out.append(f"  - [{t['_lista']}] '{t.get('title','')}'")
    out.append("")

    Path("/tmp/audit_stage2.md").write_text("\n".join(out))
    print("\n".join(out[:120]))
    print(f"\n[... continua, ver /tmp/audit_stage2.md, total {len(out)} linhas]")


if __name__ == "__main__":
    main()
