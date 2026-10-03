# -*- coding: utf-8 -*-
"""Etapa 2 da auditoria-citacoes, mecânica (Onda 168, 03/10/2026).

Lê o JSON do auditoria_citacoes.py e cruza cada Tema, Súmula e Enunciado com o catálogo curado
(base-precedentes-catalogo-vinculantes). Não consulta a internet e não julga mérito.

Saídas, no JSON e no resumo impresso.
  NAO_CATALOGADO      número que não consta do catálogo para aquela corte nem para outra (vai à Etapa 3)
  OUTRA_CORTE         número que só consta do catálogo para outra corte (suspeita de homônimo trocado)
  DESCRICAO_SUSPEITA  descrição colada à citação ("Tema N/STJ (descrição)", "Tema N STJ, que trata de ...")
                      sem nenhuma palavra em comum com a tese do catálogo (suspeita de atribuição errada)

Uso: python triagem_catalogo.py auditoria_citacoes.json [--saida triagem.json]
A triagem só aponta suspeitas. A classificação é da Etapa 3, na fonte oficial.
"""
import re, sys, json, pathlib, argparse, collections, unicodedata

AQUI = pathlib.Path(__file__).resolve().parent
CAT = AQUI.parents[1] / "base-precedentes-catalogo-vinculantes"

PARE = {"tema", "tese", "sumula", "enunciado", "segurado", "segurada", "beneficio", "beneficios", "previdenciario",
        "previdenciaria", "regime", "geral", "previdencia", "social", "direito", "sendo", "devem", "podem", "ainda",
        "apenas", "tambem", "casos", "termos", "acordo", "valor", "partir", "desde", "quando", "sobre", "entre",
        "quais", "pelos", "pelas", "deste", "desta", "nesta", "neste", "julgado", "julgada", "auditoria"}


def sem_acento(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()


def palavras(s):
    return {w for w in re.findall(r"[a-z]{5,}", sem_acento(s)) if w not in PARE}


def carregar_catalogo():
    cat = {}
    for corte in ("STF", "STJ", "TNU"):
        f = CAT / "references" / f"CATALOGO-TEMAS-{corte}.md"
        if not f.exists():
            continue
        for m in re.finditer(r"^- \*\*Tema (\d+)(?:\s*\((STF|STJ|TNU)\))?:\*\*\s*(.+)$", f.read_text(encoding="utf-8"), re.M):
            cat[("TEMA", m.group(1), m.group(2) or corte)] = m.group(3)
    f = CAT / "references" / "CATALOGO-ENUNCIADOS-CRPS.md"
    if f.exists():
        bl = re.split(r"^## ENUNCIADO (\d+)[^\n]*$", f.read_text(encoding="utf-8"), flags=re.M)
        for i in range(1, len(bl), 2):
            cat[("ENUNCIADO", bl[i], "CRPS")] = bl[i + 1][:1500]
    for f in CAT.rglob("*.md"):
        for m in re.finditer(r"\*\*S[úu]mula (\d+)\s*/?\s*(STJ|STF|TNU)[^*]*\*\*:?\s*(.+)$", f.read_text(encoding="utf-8"), re.M):
            cat.setdefault(("SUMULA", m.group(1), m.group(2)), m.group(3))
    return cat


DESC = re.compile(r"^\s*(?:\(([^)]{6,160})\)|[—–:-]\s*([^.;|]{6,160})|,?\s*que (?:trata|cuida|versa|fixou|firmou|definiu|"
                  r"reconhece|reconheceu|admite|admitiu|garante|exige)[^.;|]{4,150})")
PREF = {"TEMA": r"Tema\s+(?:Repetitivo\s+)?", "SUMULA": r"S[uú]mula\s+", "ENUNCIADO": r"Enunciado\s+"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada")
    ap.add_argument("--saida", default="triagem_catalogo.json")
    a = ap.parse_args()
    achados = json.load(open(a.entrada, encoding="utf-8"))["achados"]
    cat = carregar_catalogo()
    por_num = collections.defaultdict(set)
    for (tp, n, c) in cat:
        por_num[(tp, n)].add(c)
    nao_cat, outra, susp = collections.Counter(), [], []
    for cid, occs in achados.items():
        m = re.match(r"(TEMA|SUMULA|ENUNCIADO) (\d+)/(\w+)", cid)
        if not m:
            continue
        tp, n, corte = m.groups()
        if (tp, n, corte) not in cat:
            outras = por_num.get((tp, n), set()) - {corte}
            if outras:
                outra += [{"id": cid, "catalogo_tem_em": sorted(outras), "arquivo": o["arquivo"], "linha": o["linha"],
                           "contexto": o["contexto"][:200]} for o in occs]
            else:
                nao_cat[cid] += len(occs)
            continue
        pc = palavras(cat[(tp, n, corte)])
        rx = re.compile(PREF[tp] + n + r"\s*(?:/\s*|\s+d[oa]\s+|\s+)" + corte + r"\b", re.I)
        for o in occs:
            for mm in rx.finditer(o["contexto"]):
                md = DESC.match(o["contexto"][mm.end():])
                if md and len(palavras(md.group(0))) >= 2 and not (palavras(md.group(0)) & pc):
                    susp.append({"id": cid, "arquivo": o["arquivo"], "linha": o["linha"],
                                 "descricao": md.group(0).strip()[:150], "catalogo": cat[(tp, n, corte)][:170]})
    json.dump({"NAO_CATALOGADO": nao_cat.most_common(), "OUTRA_CORTE": outra, "DESCRICAO_SUSPEITA": susp},
              open(a.saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"catálogo {len(cat)} itens | não catalogados {len(nao_cat)} distintos | outra corte {len(outra)} ocorrências"
          f" | descrição suspeita {len(susp)} | saída {a.saida}")


if __name__ == "__main__":
    main()
