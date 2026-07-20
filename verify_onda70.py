# -*- coding: utf-8 -*-
import io, os, re, glob, json

ROOT = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"

ALVOS = [
    "base-limbo-previdenciario-tema300",
    "base-precedentes-catalogo-vinculantes",
    "base-cnis-acerto-indicadores",
    "base-documentos-comprobatorios-in128",
    "base-reclamatoria-trabalhista-prova-previdenciaria",
    "base-rt-ajuizamento-vinculo-previdenciario",
    "base-cpc-onus-prova-art373",
    "base-incapacidade-b31-temporaria",
    "ponte-workflow-pensao-por-morte",
    "ponte-orquestrador-previdenciario",
]

problemas = []

# 1. description <= 1024 nas skills tocadas
print("=== 1. TAMANHO DA DESCRIPTION ===")
for s in ALVOS:
    p = os.path.join(ROOT, s, "SKILL.md")
    if not os.path.exists(p):
        problemas.append("SKILL.md ausente: " + s)
        continue
    txt = io.open(p, encoding="utf-8").read()
    m = re.search(r'^description:\s*"?(.*?)"?\s*\n---', txt, re.S | re.M)
    if not m:
        m = re.search(r"^description:\s*(.*?)\n(?:[a-z_]+:|---)", txt, re.S | re.M)
    n = len(m.group(1).strip()) if m else -1
    flag = "OK " if 0 < n <= 1024 else "!! "
    if not (0 < n <= 1024):
        problemas.append("description %d chars em %s" % (n, s))
    print("%s%-52s %d" % (flag, s, n))

# 2. travessoes em arquivos novos/alterados
print("\n=== 2. TRAVESSAO (proibido) ===")
novos = glob.glob(os.path.join(ROOT, "base-limbo-previdenciario-tema300", "**", "*.md"), recursive=True)
achou = False
for p in novos:
    for i, line in enumerate(io.open(p, encoding="utf-8"), 1):
        if "—" in line or "–" in line:
            achou = True
            problemas.append("travessao em %s L%d" % (os.path.basename(p), i))
            print("!! %s L%d" % (os.path.basename(p), i))
if not achou:
    print("OK  nenhum travessao nos arquivos novos")

# 3. remissoes cruzadas resolviveis
print("\n=== 3. REMISSOES CRUZADAS ===")
existentes = set(os.listdir(ROOT))
refs = set()
for p in novos:
    txt = io.open(p, encoding="utf-8").read()
    refs |= set(re.findall(r"`((?:base|ponte)-[a-z0-9\-]+)`", txt))
    refs |= set(re.findall(r"`(peticao-previdenciaria|pensao-por-morte|periodo-graca-qualidade-segurado|ntep-nexo-acidentario|auditoria-ppp|auditoria-laudo-pericial|tema-1124-instrucao-administrativa)`", txt))
for r in sorted(refs):
    if r in existentes:
        print("OK  " + r)
    else:
        print("??  %s  (nao esta no repo, skill do escritorio)" % r)

# 4. arquivos da skill nova
print("\n=== 4. ARQUIVOS DA SKILL NOVA ===")
for f in ["SKILL.md", "references/FUNDAMENTOS-E-CENARIOS.md",
          "references/JURISPRUDENCIA-E-REFUTACAO.md",
          "references/TABELA-RAIS-AFASTAMENTOS-D2.md"]:
    p = os.path.join(ROOT, "base-limbo-previdenciario-tema300", f.replace("/", os.sep))
    ok = os.path.exists(p)
    if not ok:
        problemas.append("faltando " + f)
    print(("OK  " if ok else "!!  ") + f + ("  %d linhas" % len(io.open(p, encoding="utf-8").readlines()) if ok else ""))

# 5. Tema 300 x 301 no catalogo
print("\n=== 5. CATALOGO TNU, TEMAS 300 E 301 ===")
cat = io.open(os.path.join(ROOT, "base-precedentes-catalogo-vinculantes", "references", "CATALOGO-TEMAS-TNU.md"), encoding="utf-8").read()
t300 = re.search(r"\*\*Tema 300:\*\*(.{0,400})", cat, re.S)
t301 = re.search(r"\*\*Tema 301:\*\*(.{0,400})", cat, re.S)
ok300 = t300 and "limbo" in t300.group(1).lower()
ok301 = t301 and "segurado especial" in t301.group(1).lower()
if not ok300: problemas.append("Tema 300 nao aponta para limbo")
if not ok301: problemas.append("Tema 301 nao aponta para segurado especial")
print(("OK  " if ok300 else "!!  ") + "Tema 300 = limbo previdenciario")
print(("OK  " if ok301 else "!!  ") + "Tema 301 = segurado especial / 120 dias")
print(("OK  " if "Nao ha tese firmada" not in cat and "Não há tese firmada]" not in (t300.group(1) if t300 else "") else "!!  ") + "Tema 300 nao esta mais como sem tese")

# 6. residuo de citacao trocada
print("\n=== 6. RESIDUO DE 'Tema 301' LIGADO A LIMBO ===")
res = []
for p in glob.glob(os.path.join(ROOT, "**", "*.md"), recursive=True):
    txt = io.open(p, encoding="utf-8").read()
    for m in re.finditer(r"Tema 301", txt):
        jan = txt[max(0, m.start()-200):m.start()+200].lower()
        if "limbo" in jan and "nao trata de limbo" not in jan and "não trata de limbo" not in jan:
            res.append(os.path.relpath(p, ROOT))
if res:
    problemas.extend(["residuo Tema 301/limbo em " + r for r in set(res)])
    for r in set(res): print("!! " + r)
else:
    print("OK  nenhum residuo")

print("\n" + "=" * 60)
if problemas:
    print("PROBLEMAS (%d):" % len(problemas))
    for x in problemas: print("  - " + x)
else:
    print("VERIFICACAO LIMPA. Nenhum problema encontrado.")
