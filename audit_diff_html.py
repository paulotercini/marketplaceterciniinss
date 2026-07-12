# -*- coding: utf-8 -*-
"""Gera HTML de revisao do git diff restrito aos arquivos alterados pela auditoria (Etapas 1 e 2)."""
import subprocess, html, io, os

REPO = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini"
S = "_base-conhecimento-inss/skills/"
FILES = [
    S+"base-precedentes-catalogo-vinculantes/SKILL.md",
    S+"base-precedentes-catalogo-vinculantes/references/ATUALIZACAO-STATUS-2026-06.md",
    S+"base-precedentes-catalogo-vinculantes/references/CATALOGO-ENUNCIADOS-CRPS.md",
    S+"base-precedentes-catalogo-vinculantes/references/CATALOGO-TEMAS-STF.md",
    S+"base-precedentes-catalogo-vinculantes/references/CATALOGO-TEMAS-STJ.md",
    S+"base-precedentes-catalogo-vinculantes/references/CATALOGO-TEMAS-TNU.md",
    S+"base-b94-sequela-minima-tema201/SKILL.md",
    S+"base-auxilio-acidente-b94-pos-reforma/SKILL.md",
    S+"base-b94-anexo-iii-quadros/SKILL.md",
    S+"base-b94-nexo-acidentario-ntep/SKILL.md",
    S+"base-fungibilidade-previdenciaria/SKILL.md",
    S+"base-modelo-relatorio-medico-auxilio-acidente-b94/SKILL.md",
    S+"base-tolueno-tema-382-tnu-via-cutanea/SKILL.md",
    S+"base-especial-agentes-quimicos/SKILL.md",
    S+"base-especial-epi/references/JURISPRUDENCIA-E-REFUTACAO.md",
    S+"base-carencia-por-especie-art27a/references/JURISPRUDENCIA-E-REFUTACAO.md",
    S+"base-reclamatoria-trabalhista-prova-previdenciaria/SKILL.md",
    S+"base-reclamatoria-trabalhista-prova-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
    S+"base-reclamatoria-trabalhista-prova-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
    S+"base-rt-ajuizamento-vinculo-previdenciario/SKILL.md",
    S+"base-rt-ajuizamento-vinculo-previdenciario/references/SUMULA-368-TST-E-MARCO-2009.md",
]
NOVOS = ["audit_citacoes_extract.py", "audit_citacoes.csv", "audit_citacoes.json",
         "audit_patch_alerta_b94.py", "audit_patch_alerta_b94_v2.py", "audit_sumulas_tnu.py",
         "audit_grep_etapa2.py", "audit_fix_sumula31.py", "audit_diff_html.py"]

out = subprocess.run(["git", "diff", "--no-color", "--"] + FILES,
                     cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace")
diff = out.stdout

CSS = ("body{font-family:Consolas,monospace;font-size:13px;background:#fff;color:#222;margin:20px}"
       "h1{font-family:Georgia,serif} .add{background:#e6ffec;color:#116329;display:block;white-space:pre-wrap}"
       ".del{background:#ffebe9;color:#82071e;display:block;white-space:pre-wrap}"
       ".ctx{color:#555;display:block;white-space:pre-wrap}"
       ".hunk{background:#ddf4ff;color:#0550ae;display:block;margin-top:6px;white-space:pre-wrap}"
       ".file{background:#1f2328;color:#fff;padding:8px;margin-top:28px;font-weight:bold;font-size:14px}"
       "ul{font-family:Georgia,serif} .note{font-family:Georgia,serif;max-width:900px}")

parts = ["<html><head><meta charset='utf-8'><title>Auditoria - diff Etapas 1 e 2</title><style>"+CSS+"</style></head><body>"]
parts.append("<h1>Revis&atilde;o da auditoria (Etapas 1 e 2) - git diff</h1>")
parts.append("<p class='note'>Vermelho, texto removido. Verde, texto inserido. Diff restrito aos arquivos alterados pela auditoria. Suas altera&ccedil;&otilde;es pr&eacute;-existentes (marketplace.json, plugin.json, base-analise-decisao-tres-eixos, ponte-orquestrador-previdenciario, logo e as tr&ecirc;s skills novas) N&Atilde;O est&atilde;o inclu&iacute;das e n&atilde;o foram tocadas. Nada foi commitado nem enviado ao GitHub.</p>")
parts.append("<p class='note'><b>Arquivos novos criados pela auditoria (sem diff, s&atilde;o integralmente novos):</b> " + ", ".join(NOVOS) + "</p>")

idx, body, fid = [], [], 0
for line in diff.splitlines():
    e = html.escape(line)
    if line.startswith("diff --git"):
        fid += 1
        name = line.split(" b/")[-1]
        idx.append("<li><a href='#f%d'>%s</a></li>" % (fid, html.escape(name)))
        body.append("<div class='file' id='f%d'>%s</div>" % (fid, html.escape(name)))
    elif line.startswith("+++") or line.startswith("---") or line.startswith("index "):
        continue
    elif line.startswith("@@"):
        body.append("<span class='hunk'>%s</span>" % e)
    elif line.startswith("+"):
        body.append("<span class='add'>%s</span>" % e)
    elif line.startswith("-"):
        body.append("<span class='del'>%s</span>" % e)
    else:
        body.append("<span class='ctx'>%s</span>" % e)

parts.append("<h2>&Iacute;ndice</h2><ul>" + "".join(idx) + "</ul>")
parts.extend(body)
parts.append("</body></html>")

dest = os.path.join(REPO, "AUDITORIA-DIFF-ETAPAS-1-2.html")
io.open(dest, "w", encoding="utf-8").write("\n".join(parts))
print("HTML gerado:", dest, "| arquivos no diff:", fid, "| tamanho:", os.path.getsize(dest), "bytes")
