"""Etapa 4 da auditoria - Vocabulario e padroes de comunicacao no body.

Extrai padroes recorrentes de escrita: verbos de abertura, formulas
fixas, prefixos de acao, padroes de checklist, e identifica variaveis
recorrentes (placeholders implicitos) que poderiam virar templates.

Saida em /tmp/audit_stage4.md.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())
RE_ENTRY = re.compile(r"^(\d{2}\.\d{2}\.\d{4})\s*\(([A-Z])\)\s*:\s*(.*)$", re.MULTILINE)


def main():
    todas = []
    for l in CACHE["listas"]:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas.append(t)
    abertas = [t for t in todas if t.get("status") != "completed"]

    out = []
    out.append("# Etapa 4 - Vocabulario e padroes de comunicacao\n")

    # Coletar todas as entradas datadas
    todas_entradas = []
    for t in todas:
        body = t.get("body", "") or ""
        for m in RE_ENTRY.finditer(body):
            data, autor, texto = m.groups()
            todas_entradas.append({
                "data": data, "autor": autor, "texto": texto.strip(),
                "lista": t["_lista"], "title": t.get("title", "")
            })

    out.append(f"## 4.1 Volume de entradas datadas\n")
    out.append(f"- Total de entradas {len(todas_entradas)}")
    out.append(f"- Bodies com pelo menos 1 entrada datada {sum(1 for t in todas if RE_ENTRY.search(t.get('body','') or ''))}")
    autores = Counter(e["autor"] for e in todas_entradas)
    out.append(f"\nDistribuicao de autores:")
    for a, n in autores.most_common():
        out.append(f"- ({a}) {n} entradas ({n/len(todas_entradas)*100:.1f} %)")
    out.append("")

    # ===== 4.2 Verbos de abertura (primeira palavra apos ":") =====
    out.append("## 4.2 Verbos e prefixos mais usados no inicio das entradas\n")
    primeira_palavra = Counter()
    primeiras_duas = Counter()
    for e in todas_entradas:
        texto = e["texto"]
        if not texto:
            continue
        palavras = re.findall(r"\w+", texto.lower())
        if palavras:
            primeira_palavra[palavras[0]] += 1
        if len(palavras) >= 2:
            primeiras_duas[" ".join(palavras[:2])] += 1
    out.append("### Top 30 primeiras palavras\n")
    out.append("| Palavra | Frequencia |")
    out.append("|---|---:|")
    for p, n in primeira_palavra.most_common(30):
        if n >= 5:
            out.append(f"| {p} | {n} |")
    out.append("")
    out.append("### Top 30 inicios de duas palavras\n")
    out.append("| Inicio | Frequencia |")
    out.append("|---|---:|")
    for p, n in primeiras_duas.most_common(30):
        if n >= 4:
            out.append(f"| {p} | {n} |")
    out.append("")

    # ===== 4.3 Formulas fixas =====
    out.append("## 4.3 Formulas fixas detectadas\n")
    formulas = {
        "Verificar pedido de [beneficio]": r"verificar pedido de",
        "Sistema de verificacao: [sistema]": r"sistema de verifica[çc][ãa]o",
        "Aguardar ate [data]": r"aguardar at[ée]",
        "Em [data] verificar": r"em \d{2}/\d{2}.{0,5}verificar",
        "FIXO:": r"\bFIXO[:\s]",
        "Honorarios:": r"honor[áa]rios?\s*:",
        "Protocolo:": r"protocolo\s*:",
        "Numero do protocolo": r"n[úu]mero do protocolo",
        "Chave de acesso": r"chave de acesso",
        "Tem pasta fisica": r"tem pasta f[íi]sica",
        "Solicitei": r"\bsolicitei\b",
        "Protocolei": r"\bprotocol[ae]i\b",
        "Enviei": r"\benviei\b",
        "Verifiquei": r"\bverifiquei\b",
        "Digitalizei": r"\bdigitalizei\b",
        "Avisar cliente": r"avisar cliente|cliente avisad",
        "Marcar horario": r"marcar hor[áa]rio",
        "Pegar extrato": r"pegar extrato",
        "Reiterei": r"\breiterei\b",
        "Pedido de desistencia": r"pedido de desist[êe]ncia",
        "Tutela": r"\btutela\b",
        "Em analise": r"em an[áa]lise",
    }
    out.append("| Formula | Ocorrencias em entradas |")
    out.append("|---|---:|")
    for label, padrao in sorted(formulas.items(), key=lambda x: -sum(1 for e in todas_entradas if re.search(x[1], e["texto"], re.IGNORECASE))):
        n = sum(1 for e in todas_entradas if re.search(padrao, e["texto"], re.IGNORECASE))
        if n >= 3:
            out.append(f"| {label} | {n} |")
    out.append("")

    # ===== 4.4 Padroes em primeira linha do body (cabecalho fixo) =====
    out.append("## 4.4 Padroes de cabecalho (primeiras linhas antes da primeira entrada datada)\n")
    cabecalhos = Counter()
    cab_amostra = defaultdict(list)
    for t in abertas:
        body = t.get("body", "") or ""
        if not body.strip():
            continue
        # Pegar a primeira linha que NAO eh entrada datada
        linhas = body.split("\n")
        for linha in linhas[:3]:
            linha_l = linha.strip()
            if not linha_l:
                continue
            if RE_ENTRY.match(linha_l):
                break
            # Normalizar
            chave = re.sub(r"\d", "#", linha_l)
            chave = chave[:80]
            cabecalhos[chave] += 1
            if len(cab_amostra[chave]) < 3:
                cab_amostra[chave].append((t["_lista"], t.get("title","")))
            break
    out.append("### Top 20 cabecalhos repetidos (em abertas)\n")
    out.append("| Cabecalho normalizado | # | Listas exemplo |")
    out.append("|---|---:|---|")
    for cab, n in cabecalhos.most_common(20):
        if n < 3:
            continue
        listas_ex = ", ".join(sorted(set(l for l, _ in cab_amostra[cab])))[:60]
        out.append(f"| `{cab}` | {n} | {listas_ex} |")
    out.append("")

    # ===== 4.5 FIXOs (notas permanentes) =====
    out.append("## 4.5 Notas FIXO (informacoes permanentes nos bodies)\n")
    fixos = []
    for t in abertas:
        body = t.get("body", "") or ""
        for m in re.finditer(r"FIXO\s*:?\s*(.+)", body, re.IGNORECASE):
            fixo = m.group(1).strip()[:100]
            fixos.append((t["_lista"], fixo))
    out.append(f"Total de marcadores FIXO em abertas, {len(fixos)}\n")
    out.append("Tipos de informacao FIXO mais comuns (amostra):\n")
    for lista, fixo in fixos[:25]:
        out.append(f"- [{lista}] {fixo}")
    out.append("")

    # ===== 4.6 Estrutura de checklist =====
    out.append("## 4.6 Padrao de checklist\n")
    cl_categorias = {
        "CPF (so digitos)": r"^\d{11}$",
        "CPF pontuado": r"^\d{3}\.\d{3}\.\d{3}-\d{2}$",
        "Telefone": r"^1[1-9]9?\d{8,9}$|^\(1[1-9]\)",
        "Senha curta": r"^[A-Za-z][A-Za-z0-9@!*#$&]{4,12}$",
        "URL/link": r"^https?://",
        "Numero processo": r"\d{7}-?\d{2}\.?\d{4}\.?\d{1}\.?\d{2}\.?\d{4}",
        "Numero protocolo (longo)": r"^\d{10,15}$",
        "Honorarios": r"honor[áa]rios?\s*:",
        "Parceria": r"parceria",
        "Padrao": r"^padr[ãa]o$",
    }
    cl_count = Counter()
    cl_amostra = defaultdict(list)
    cl_total_open = 0
    for t in abertas:
        for c in t.get("checklist", []):
            txt = c["text"].strip()
            cl_total_open += 1
            for label, padrao in cl_categorias.items():
                if re.search(padrao, txt):
                    cl_count[label] += 1
                    if len(cl_amostra[label]) < 3:
                        cl_amostra[label].append(txt[:50])
                    break
            else:
                cl_count["(outro)"] += 1
    out.append(f"Total de itens de checklist em abertas, {cl_total_open}\n")
    out.append("| Categoria | Frequencia |")
    out.append("|---|---:|")
    for k, v in cl_count.most_common():
        out.append(f"| {k} | {v} |")
    out.append("")

    # ===== 4.7 Datas e referencias temporais =====
    out.append("## 4.7 Datas e referencias temporais\n")
    # Padroes "DD/MM" sem ano
    datas_ddmm = sum(1 for e in todas_entradas if re.search(r"\b\d{2}/\d{2}\b(?!/)", e["texto"]))
    datas_ddmmaa = sum(1 for e in todas_entradas if re.search(r"\b\d{2}/\d{2}/\d{4}\b", e["texto"]))
    datas_em_dia = sum(1 for e in todas_entradas if re.search(r"\bem \d{2}/\d{2}\b", e["texto"], re.IGNORECASE))
    out.append(f"- Entradas com 'em DD/MM' (referencia futura): {datas_em_dia}")
    out.append(f"- Entradas com data DD/MM curta: {datas_ddmm}")
    out.append(f"- Entradas com data DD/MM/AAAA completa: {datas_ddmmaa}")
    out.append("")

    # ===== 4.8 Vocabulario tecnico mais usado =====
    out.append("## 4.8 Vocabulario tecnico recorrente (corpo das entradas)\n")
    vocab = {
        "B31": r"\bB31\b",
        "B91": r"\bB91\b",
        "B92": r"\bB92\b",
        "B94": r"\bB94\b",
        "DER": r"\bDER\b",
        "DIB": r"\bDIB\b",
        "DCB": r"\bDCB\b",
        "DPL": r"\bDPL\b",
        "DII": r"\bDII\b",
        "PBC": r"\bPBC\b",
        "RMI": r"\bRMI\b",
        "PER/DCOMP": r"PER.?DCOMP",
        "GPS": r"\bGPS\b",
        "INFBEN": r"\bINFBEN\b",
        "PMF": r"\bPMF\b",
        "Telegrama": r"\btelegrama\b",
        "OCAB": r"\bOCAB\b",
    }
    voc_count = Counter()
    for e in todas_entradas:
        for label, padrao in vocab.items():
            if re.search(padrao, e["texto"]):
                voc_count[label] += 1
    out.append("| Termo | # entradas |")
    out.append("|---|---:|")
    for k, v in voc_count.most_common():
        out.append(f"| {k} | {v} |")
    out.append("")

    Path("/tmp/audit_stage4.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
