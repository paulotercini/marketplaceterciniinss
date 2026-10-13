#!/usr/bin/env python3
"""F219 · onda 5: uma fonte só para as listas de documentos.

O catálogo do CRM (tabela documentos_beneficio, semeada pelos INSERT de
crm/fase2/schema.sql, espelho do site interno) é a fonte. O site institucional
(site_content/<slug>.json, campo "documentos") tem uma lista curta por página.

    python3 crm/docs_catalogo.py            # compara e mostra o que mudaria
    python3 crm/docs_catalogo.py --aplicar  # grava os itens-base do catálogo no site_content

Só os itens-base (coluna itens) vão ao site, sem o detalhe depois do " — "; os
extras por atividade ficam no CRM. Sem --aplicar nada é gravado.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SCHEMA = RAIZ / "crm" / "fase2" / "schema.sql"
SITE = RAIZ / "site_content"

# página do site → linha do catálogo (planejamento e reabilitação sem par ficam de fora)
SLUG_BENEFICIO = {
    "aposentadoria-especial": "Apos. Especial",
    "aposentadoria-idade": "Apos. por Idade",
    "aposentadoria-incapacidade": "Apos. por Incapacidade Permanente",
    "aposentadoria-pcd": "Apos. Tempo — Pessoa com Deficiência",
    "aposentadoria-professor": "Apos. do Professor",
    "aposentadoria-rural": "Rural",
    "aposentadoria-tempo-contribuicao": "Apos. Tempo de Contribuição",
    "auxilio-acidente": "Aux. Acidente",
    "auxilio-doenca": "Aux. Incapacidade Temporária",
    "auxilio-reclusao": "Auxílio-Reclusão",
    "bpc-deficiente": "BPC/LOAS",
    "bpc-idoso": "BPC/LOAS — Idoso",
    "pensao-por-morte": "Pensão por Morte",
    "reabilitacao-profissional": "Reabilitação Profissional (B26)",
    "revisoes-de-beneficio": "Revisão",
    "salario-maternidade": "Salário-Maternidade",
}

_STR = r"E'((?:[^'\\]|\\.|'')*)'"


def _txt(s):
    return s.replace("\\n", "\n").replace("''", "'").replace("\\'", "'")


def catalogo(schema_txt):
    """{beneficio: {"itens": [...], "extras": [...], "observacoes": str}} dos INSERT do schema."""
    i = schema_txt.index("insert into documentos_beneficio (beneficio, itens, extras, observacoes) values")
    j = schema_txt.index("on conflict", i)
    out = {}
    for m in re.finditer(r"\(\s*" + _STR + r"\s*,\s*" + _STR + r"\s*,\s*" + _STR + r"\s*,\s*" + _STR + r"\s*\)", schema_txt[i:j]):
        ben, itens, extras, obs = (_txt(g) for g in m.groups())
        linhas = lambda t: [x.strip() for x in t.split("\n") if x.strip() and not x.strip().startswith("▸")]
        out[ben] = {"itens": linhas(itens), "extras": linhas(extras), "observacoes": obs}
    return out


def lista_do_site(cat_ben):
    return [x.split(" — ")[0].strip() for x in cat_ben["itens"]]


def diferencas(cat, site_dir=SITE):
    res = []
    for slug, ben in SLUG_BENEFICIO.items():
        f = site_dir / f"{slug}.json"
        if not f.exists() or ben not in cat:
            res.append((slug, ben, None, None))
            continue
        atual = json.loads(f.read_text(encoding="utf-8")).get("documentos") or []
        novo = lista_do_site(cat[ben])
        res.append((slug, ben, atual, novo))
    return res


def main(argv):
    cat = catalogo(SCHEMA.read_text(encoding="utf-8"))
    aplicar = "--aplicar" in argv
    mudou = 0
    for slug, ben, atual, novo in diferencas(cat):
        if atual is None:
            print(f"✘ {slug}: sem par no catálogo ({ben})")
            continue
        if atual == novo:
            print(f"= {slug}")
            continue
        mudou += 1
        print(f"≠ {slug} ← {ben}: {len(atual)} itens no site, {len(novo)} no catálogo")
        if aplicar:
            f = SITE / f"{slug}.json"
            d = json.loads(f.read_text(encoding="utf-8"))
            d["documentos"] = novo
            f.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(cat)} benefícios no catálogo; {mudou} páginas diferem" + (" — gravadas" if aplicar and mudou else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
