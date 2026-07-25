# -*- coding: utf-8 -*-
"""Etapa 4 da auditoria de citacoes (25/07/2026). Correcoes deterministicas com log."""
import os, re
BASE = os.path.dirname(os.path.abspath(__file__))
SK = os.path.join(BASE, "_base-conhecimento-inss", "skills")
LOG, FAIL = [], []
CACHE = {}

def load(fn):
    if fn not in CACHE:
        CACHE[fn] = open(os.path.join(SK, fn), encoding="utf-8").read()
    return CACHE[fn]

def S(fn, old, new, exp=1):
    t = load(fn)
    n = t.count(old)
    if n != exp:
        FAIL.append("S %s [%d!=%d] %s" % (fn, n, exp, old[:70]))
        return
    CACHE[fn] = t.replace(old, new)
    LOG.append("S ok %s :: %s" % (fn, old[:70]))

def R(fn, pat, rep, exp=None):
    t = load(fn)
    t2, n = re.subn(pat, rep, t)
    if n == 0 or (exp is not None and n != exp):
        FAIL.append("R %s [%d] %s" % (fn, n, pat[:70]))
        return
    CACHE[fn] = t2
    LOG.append("R ok %s x%d :: %s" % (fn, n, pat[:60]))

NOTA = "auditoria 25/07/2026"

# ---------- R2 Tema 1066/STF (pre-regras, depois regra generica) ----------
S("base-meu-inss-pat-gerid-fluxo/SKILL.md",
  "o acordo do Tema 1066 STF (RE 1.171.152)",
  "o acordo homologado no RE 1.171.152/STF (ex-Tema 1066/STF, cancelado em 22/02/2021)")
S("mandado-seguranca-previdenciario/SKILL.md",
  "O Tema 1066/STF fixa prazo máximo de 90 dias para o IN",
  "O acordo homologado no RE 1.171.152/STF (ex-Tema 1066, cancelado em 22/02/2021; %s) fixa prazos máximos por espécie, de 30 a 90 dias, para o IN" % NOTA)
S("mandado-seguranca-previdenciario/SKILL.md",
  "Tema 1066/STF fixa prazo máximo de 90 dias.",
  "O acordo homologado no RE 1.171.152/STF (ex-Tema 1066, cancelado; %s) fixa prazos máximos por espécie, de 30 a 90 dias." % NOTA)
S("base-ms-decadencia-omissao-demora/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Tema 1066 STF afirma duração razoável.",
  "Refutação. O acordo homologado no RE 1.171.152/STF (ex-Tema 1066) e o art. 5º, LXXVIII, da CF afirmam a duração razoável (%s)." % NOTA)
S("base-dano-moral-previdenciario/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Demora abusiva acima de 90 dias gera dano. Tema 1066 STF.",
  "Refutação. Demora acima dos prazos do acordo homologado no RE 1.171.152/STF (ex-Tema 1066, 30 a 90 dias por espécie) gera dano (%s)." % NOTA)
for _f in ["auditoria-citacoes/SKILL.md"]:
    pass  # arquivo excluido da regra generica por citar o caso historico de proposito
GEN_1066 = [fn for fn in [
 "base-aposentadoria-futura-pipeline/SKILL.md",
 "base-bpc-aposentadoria-pcd-procedimentos/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-cadastro-domiciliar-cadunico-in21-2026/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-contagem-reciproca-rgps-rpps/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-crps-panorama-geral/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-dano-moral-previdenciario/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-devolucao-valores-irrepetibilidade-tema979-tema1034/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-efeito-translativo-tema-1124-defesa/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-efeito-translativo-tema-1124-defesa/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-jef-previdenciario/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-meu-inss-pat-gerid-fluxo/SKILL.md",
 "base-ms-cabimento-direito-liquido-certo/SKILL.md",
 "base-ms-cabimento-direito-liquido-certo/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-ms-cabimento-direito-liquido-certo/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-ms-competencia-autoridade-coatora-inss-crps/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-ms-cumprimento-inss/SKILL.md",
 "base-ms-cumprimento-inss/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-ms-cumprimento-inss/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-ms-decadencia-omissao-demora/SKILL.md",
 "base-ms-decadencia-omissao-demora/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-ms-decadencia-omissao-demora/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-ms-liminar-art7-iii/SKILL.md",
 "base-ms-liminar-art7-iii/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-ms-liminar-art7-iii/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-pericia-medica-federal-telepericia/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-reabilitacao-profissional/references/FUNDAMENTOS-E-CENARIOS.md",
 "base-reabilitacao-profissional/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-recursos-jef/references/JURISPRUDENCIA-E-REFUTACAO.md",
 "base-revisao-peticao-aprofundada/SKILL.md",
 "base-revisao-peticao-aprofundada/references/CHECKLIST-POR-RITO.md",
 "mandado-seguranca-previdenciario/SKILL.md"]]
for fn in GEN_1066:
    t = load(fn)
    if re.search(r"Tema\s+1066\s*/?\s*STF", t):
        R(fn, r"Tema\s+1066\s*/?\s*STF", "acordo do RE 1.171.152/STF (ex-Tema 1066, cancelado em 22/02/2021)")

# ---------- R1 Tema 327 -> Tema 76 (teto, RE 564.354) ----------
for fn in ["base-cpc-acao-rescisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-cpc-tutela-provisoria-previdenciaria/SKILL.md",
           "base-cpc-tutela-provisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-puil-pedilef-vedacao-materia-processual/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-revisao-teto-buraco-negro-verde/SKILL.md",
           "base-revisao-teto-buraco-negro-verde/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-revisao-teto-buraco-negro-verde/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "carta-servicos-inss/references/marcos-normativos.md"]:
    R(fn, r"Tema\s+327(\s*/?\s*)STF", r"Tema 76\1STF")
S("base-revisao-teto-buraco-negro-verde/SKILL.md",
  "Tema 76 STF, RE 564.354. Julgado em 2010.",
  "Tema 76 STF, RE 564.354 (numeração corrigida de 327 para 76 na %s). Julgado em 2010." % NOTA)

# ---------- R27 Tema 365/TNU data 12/11 -> 13/11/2025 ----------
S("contribuicoes-complementacao-ec103/SKILL.md", "**Tema 365/TNU** (j. 12/11/2025)", "**Tema 365/TNU** (j. 13/11/2025)")
S("pensao-por-morte/SKILL.md", "Tema 365/TNU** (j. 12/11/2025)", "Tema 365/TNU** (j. 13/11/2025)")
S("periodo-graca-qualidade-segurado/SKILL.md", "PUIL 0500120-68.2021.4.05.8311/PE, j. 12/11/2025", "PUIL 0500120-68.2021.4.05.8311/PE, j. 13/11/2025")

# ---------- R14 Tema 73/STJ -> Tema 185/STJ (miserabilidade) ----------
S("base-bpc-renda-per-capita-miserabilidade/SKILL.md",
  "Tema 73 STJ integra a leitura pró-segurado. Tema 312 e Tema 640 TNU complementam.",
  "O Tema 185/STJ (REsp 1.112.557) integra a leitura pró-segurado. O RE 580.963/STF e o Tema 640/STJ complementam (%s)." % NOTA)
S("base-bpc-renda-per-capita-miserabilidade/references/FUNDAMENTOS-E-CENARIOS.md",
  "Tema 73 STJ. Integração pró-segurado.", "Tema 185/STJ (REsp 1.112.557). Integração pró-segurada (%s)." % NOTA)
R("base-bpc-renda-per-capita-miserabilidade/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 73 STJ\r?\n\r?\n[^\r\n]*", "### Tema 185/STJ (REsp 1.112.557)\n\nProva ampla da miserabilidade por todas as circunstâncias (%s, corrigido o número antes citado como Tema 73/STJ)." % NOTA)
R("base-salario-maternidade-pos-reforma/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 73 STJ\r?\n\r?\nTese\. [^\r\n]*", "### [Retirado na %s] Tema 73/STJ\n\nNúmero não confirmado em fonte oficial para a matéria; citação removida, sem substituto identificado." % NOTA)

# ---------- R10/R11 Tema 640 TNU e 312 TNU (BPC) ----------
R("base-bpc-loas-requisitos/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 640 TNU", "### Tema 640/STJ (REsp 1.355.052; corte corrigida na %s)" % NOTA)
R("base-bpc-loas-requisitos/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 312 TNU", "### RE 580.963/STF (corte corrigida na %s)" % NOTA)
S("base-bpc-renda-per-capita-miserabilidade/references/FUNDAMENTOS-E-CENARIOS.md",
  "Tema 312 TNU. Cômputo de benefício excluído.", "RE 580.963/STF. Cômputo de benefício excluído (%s)." % NOTA)
R("base-bpc-renda-per-capita-miserabilidade/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 312 TNU", "### RE 580.963/STF (corte corrigida na %s)" % NOTA)
R("base-bpc-renda-per-capita-miserabilidade/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 640 TNU", "### Tema 640/STJ (REsp 1.355.052; corte corrigida na %s)" % NOTA)

# ---------- R9 Tema 640/STF (BPC e TRU) ----------
S("base-bpc-loas-requisitos/references/DECRETO-6214-2007-ATUALIZACAO-2025.md", "(Tema 640/STF)", "(Tema 640/STJ, corte corrigida na %s)" % NOTA)
R("base-bpc-renda-per-capita-miserabilidade/references/JURISPRUDENCIA-E-REFUTACAO.md", r"### Tema 640 STF", "### Tema 640/STJ (REsp 1.355.052; corte corrigida na %s)" % NOTA, 1)
S("base-rito-ordinario-trf/references/ART-343-A-RISTJ-RESUMO-ANALITICO.md", "(Tema 27 STF, Tema 640 STF, Tema 640 STJ)", "(Tema 27 STF, RE 580.963/STF e Tema 640 STJ; %s)" % NOTA)
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md",
  "confrontada com o Tema 640/STF (modulação posterior) e a Lei 13.146/2015 (EPCD) que LIMITARAM",
  "confrontada com a Lei 13.146/2015 (EPCD), que LIMITOU (%s, retirado o Tema 640/STF, não confirmado para dever alimentar)" % NOTA)
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md",
  "Distinguishing pró-segurado a partir do julgamento do Tema 640/STF em 2020 (Tema com julgamento concluído sobre dever alimentar e BPC).",
  "Distinguishing pró-segurado a partir da Lei 13.146/2015 (%s, retirada a menção ao Tema 640/STF, não confirmada; o Tema 640/STJ trata da exclusão do benefício mínimo do idoso da renda)." % NOTA)
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md", "+ Súmula 79/TNU + Tema 640/STF.", "+ Súmula 79/TNU + Tema 640/STJ.")
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md",
  "1. **Tema 640/STF** julgado em 2020. O STF firmou tese sobre LOAS e dever alimentar limitando a interpretação literal.",
  "1. **Lei 13.146/2015 (EPCD)** e jurisprudência posterior limitaram a interpretação literal (%s, retirado o Tema 640/STF, não confirmado)." % NOTA)
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md", "ANTES dos refinamentos do Tema 640/STF e da Lei 13.146/2015", "ANTES da Lei 13.146/2015")
S("base-tru-trf3-sumulas-jurisprudencia/SKILL.md", "O Tema 640/STF e a Lei 13.146/2015 limitaram", "A Lei 13.146/2015 limitou")
S("base-tru-trf3-sumulas-jurisprudencia/references/TABELA-OPERACIONAL-23-SUMULAS.md", "Combinar com. Tema 640/STF, Súmula 79/TNU, Reclamação 4374/STF.", "Combinar com. Tema 640/STJ, Súmula 79/TNU, Reclamação 4374/STF.")
S("base-tru-trf3-sumulas-jurisprudencia/references/TABELA-OPERACIONAL-23-SUMULAS.md", "Combinar com. Súmula 4, Tema 640/STF, art. 20 LOAS.", "Combinar com. Súmula 4, Tema 640/STJ, art. 20 LOAS.")
S("base-tru-trf3-sumulas-jurisprudencia/references/TABELA-OPERACIONAL-23-SUMULAS.md", "- Tema 640/STF (julgado 2020) limitou a exigência.", "- Lei 13.146/2015 limitou a exigência (%s, retirado o Tema 640/STF)." % NOTA)

# ---------- R12 Tema 692/STF (tutela e MS liminar) ----------
R("base-cpc-tutela-provisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  r"### Tema 692 STF\r?\n\r?\n[^\r\n]*",
  "### Tema 692/STJ (devolução na tutela revogada)\n\nA reforma da tutela obriga a devolução, com desconto de até 30 por cento (%s, corte corrigida; a boa-fé não afasta essa devolução)." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  "Se INSS recorrer com sucesso, segurado pode devolver. Tema 692/STF afasta em boa-fé.",
  "Se o INSS recorrer com sucesso, o segurado devolve (Tema 692/STJ, desconto de até 30 por cento); a boa-fé não afasta essa devolução (%s)." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  "Risco de revogação posterior. Tema 692/STF e Tema 1009/STJ afastam devolução em boa-fé.",
  "Risco de revogação posterior. O Tema 692/STJ impõe a devolução (teto de 30 por cento); as exceções reais são o BPC (art. 49 do Decreto 6.214/2007), o erro administrativo com boa-fé (Tema 979/STJ) e a interpretação errônea da lei (Tema 1034/STJ) (%s, retirado o Tema 1009/STJ, não confirmado)." % NOTA)
R("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 692 STF\r?\n\r?\n[^\r\n]*",
  "### Tema 692/STJ (devolução na tutela revogada)\n\nDevolução obrigatória com teto de 30 por cento (%s, corte corrigida)." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Tema 692 STF. Boa-fé afasta devolução. Caráter alimentar.",
  "Atenção (%s). O Tema 692/STJ impõe a devolução na tutela revogada (teto de 30 por cento); a defesa real está nas exceções (BPC, Tema 979/STJ, Tema 1034/STJ) e no caráter alimentar para modular descontos." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Tema 692 STF e Tema 1009 STJ. Boa-fé afasta.",
  "Atenção (%s). Devolução devida pelo Tema 692/STJ; invocar as exceções reais (BPC, Tema 979/STJ, Tema 1034/STJ)." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md", "Acompanhar Tema 692 STF em cumprimento.", "Acompanhar o Tema 692/STJ em cumprimento.")
R("base-ms-liminar-art7-iii/references/FUNDAMENTOS-E-CENARIOS.md", r"### Tema 692 STF\r?\n\r?\n[^\r\n]*",
  "### Tema 692/STJ (devolução na tutela revogada)\n\nDevolução obrigatória com teto de 30 por cento; pesar o risco antes de pedir liminar (%s, corte corrigida)." % NOTA)
R("base-ms-liminar-art7-iii/references/JURISPRUDENCIA-E-REFUTACAO.md", r"### Tema 692 STF\r?\n\r?\n[^\r\n]*",
  "### Tema 692/STJ (devolução na tutela revogada)\n\nDevolução obrigatória com teto de 30 por cento (%s, corte corrigida)." % NOTA)
S("base-ms-liminar-art7-iii/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Caráter alimentar. Tema 692 STF.",
  "Refutação. Caráter alimentar; atenção, o Tema 692/STJ impõe devolução se a liminar cair (%s)." % NOTA)
S("base-ms-liminar-art7-iii/references/JURISPRUDENCIA-E-REFUTACAO.md", "Revalidar Tema 692 STF.", "Revalidar Tema 692/STJ.")

# ---------- R3 Sumula 63/TNU (redacao 18/09/2025) ----------
S("base-pensao-por-morte-uniao-estavel-prova/SKILL.md",
  "aplicável a óbitos anteriores à Lei 13.846/2019; para óbitos posteriores, vale o art. 16, §5º (prova material contemporânea).",
  "aplicável a fatos geradores até a MP 871/2019 (18/01/2019, redação da Súmula de 18/09/2025; %s); para fatos posteriores, vale o art. 16, §5º (prova material contemporânea)." % NOTA)
S("base-pensao-por-morte-uniao-estavel-prova/SKILL.md",
  "Para óbitos pré-Lei 13.846/2019, a Súmula 63/TNU dispensa o início de prova material; após, exige-se prova material contemporânea (art. 16, §5º).",
  "Para fatos geradores até a MP 871/2019 (18/01/2019), a Súmula 63/TNU (redação de 18/09/2025) dispensa o início de prova material; após, exige-se prova material contemporânea (art. 16, §5º) (%s)." % NOTA)
S("base-pensao-por-morte-uniao-estavel-prova/SKILL.md",
  "O INSS exige escritura pública. Refute com Súmula 63 TNU e art. 1.723 CC.",
  "O INSS exige escritura pública. Refute com o art. 1.723 do CC e, para óbito até 18/01/2019, com a Súmula 63/TNU.")
S("base-pensao-por-morte-uniao-estavel-prova/SKILL.md",
  "O INSS recusa prova testemunhal. Refute com Súmula 63 TNU.",
  "O INSS recusa prova testemunhal. Para óbito até 18/01/2019, refute com a Súmula 63/TNU; após, reúna prova material contemporânea (art. 16, §5º).")
S("base-pensao-por-morte-uniao-estavel-prova/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "### Súmula 63/TNU", "### Súmula 63/TNU (redação de 18/09/2025, fatos geradores até a MP 871/2019 — %s)" % NOTA)
S("base-pensao-por-morte-uniao-estavel-prova/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Súmula 63 TNU. CC art. 1.723.", "Refutação. CC art. 1.723; Súmula 63/TNU para fatos até 18/01/2019.")
S("base-pensao-por-morte-uniao-estavel-prova/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Súmula 63 TNU autoriza testemunhas.", "Refutação. Súmula 63/TNU autoriza testemunhas para fatos até 18/01/2019; após, art. 16, §5º, da Lei 8.213/91.")
S("base-pensao-por-morte-uniao-estavel-prova/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Revalidar Súmula 63/TNU.", "Revalidar Súmula 63/TNU (nova redação de 18/09/2025).")
S("ponte-workflow-pensao-por-morte/SKILL.md",
  "Para óbitos ANTERIORES à Lei 13.846/2019 (18/06/2019), refutar com Súmula 63/TNU",
  "Para óbitos até a MP 871/2019 (18/01/2019), refutar com a Súmula 63/TNU na redação de 18/09/2025 (%s)" % NOTA)
S("ponte-workflow-pensao-por-morte/SKILL.md",
  "Refutar com art. 1.723 CC e Súmula 63/TNU.",
  "Refutar com o art. 1.723 do CC e, para óbito até 18/01/2019, com a Súmula 63/TNU.")
S("carta-servicos-inss/references/marcos-normativos.md",
  "Súmula 63 TNU. REsp 2103603 STJ.", "Súmula 63 TNU (fatos geradores até a MP 871/2019, redação de 18/09/2025). REsp 2103603 STJ.")
# Sumula 63 fora de lugar (carencia B31 e BPC)
S("base-incapacidade-b31-temporaria/references/FUNDAMENTOS-E-CENARIOS.md",
  "com abertura interpretativa pela Súmula 63 TNU para outras moléstias de igual gravidade.",
  "com abertura interpretativa da jurisprudência para outras moléstias de igual gravidade (%s, retirada a Súmula 63/TNU, que trata de união estável)." % NOTA)
S("base-incapacidade-b31-temporaria/references/FUNDAMENTOS-E-CENARIOS.md",
  "Rol do art. 151 e abertura pela Súmula 63 TNU para outras moléstias de igual gravidade.",
  "Rol do art. 151 com abertura interpretativa da jurisprudência (%s, retirada a Súmula 63/TNU, que trata de união estável)." % NOTA)
R("base-incapacidade-b31-temporaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Súmula 63 TNU\r?\n\r?\n[^\r\n]*",
  "### Art. 151 da Lei 8.213/91 (rol com leitura ampliativa)\n\nRetirada a Súmula 63/TNU na %s; ela trata de união estável em pensão por morte, não de carência." % NOTA)
S("base-incapacidade-b31-temporaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Art. 26, II, da Lei 8.213/91 e Súmula 63 TNU.", "Refutação. Art. 26, II, e art. 151 da Lei 8.213/91 (%s)." % NOTA)
S("base-incapacidade-b31-temporaria/SKILL.md", "Súmula 63 TNU, Súmula 47 TNU", "Súmula 47 TNU")
R("base-bpc-impedimento-longo-prazo/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Súmula 63 TNU\r?\n\r?\n[^\r\n]*",
  "### Súmula 63/TNU (união estável; pertinência a conferir — %s)\n\nRedação de 18/09/2025 restrita a fatos geradores até a MP 871/2019; enunciado de pensão por morte, sem aplicação direta ao BPC." % NOTA)
R("base-bpc-loas-requisitos/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Súmula 63 TNU\r?\n\r?\n[^\r\n]*",
  "### Súmula 63/TNU (união estável; pertinência a conferir — %s)\n\nRedação de 18/09/2025 restrita a fatos geradores até a MP 871/2019; enunciado de pensão por morte, sem aplicação direta ao BPC." % NOTA)

# ---------- R4 Sumula 555/STJ (decadencia tributaria, fora da materia especial) ----------
STUB555 = "### Marco da Lei 9.032/95 (fim do enquadramento por categoria em 28/04/1995)\n\nO enquadramento por categoria vale até 28/04/1995 (Decretos 53.831/64 e 83.080/79). Retirada a Súmula 555/STJ na %s; ela trata de decadência tributária." % NOTA
for fn in ["base-especial-calor-nho06/SKILL.md",
           "base-especial-calor-nho06/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-especial-calor-nho06/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-especial-categoria-profissional-pre1995/SKILL.md",
           "base-especial-categoria-profissional-pre1995/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-especial-categoria-profissional-pre1995/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-especial-frio-camara-frigorifica/SKILL.md",
           "base-especial-frio-camara-frigorifica/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-especial-frio-camara-frigorifica/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-especial-penosidade-enfermagem-petroleiro/SKILL.md",
           "base-especial-penosidade-enfermagem-petroleiro/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-especial-penosidade-enfermagem-petroleiro/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-especial-radiacao-ionizante/SKILL.md",
           "base-especial-radiacao-ionizante/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-especial-radiacao-ionizante/references/JURISPRUDENCIA-E-REFUTACAO.md"]:
    R(fn, r"### Súmula 555 STJ\r?\n\r?\n[^\r\n]*", STUB555)
S("base-especial-categoria-profissional-pre1995/SKILL.md", "Súmula 198 TFR, Súmula 555 STJ, fim da categoria", "Súmula 198 TFR, fim da categoria")
S("base-especial-categoria-profissional-pre1995/references/JURISPRUDENCIA-E-REFUTACAO.md", "Revalidar Súmula 555 STJ.", "Revalidar o marco da Lei 9.032/95.")
S("base-legislacao-fontes-primarias/references/INDICE-FONTES-COMPLETO.md", "(Súmula 198/TFR, Súmula 555/STJ)", "(Súmula 198/TFR; %s, retirada a Súmula 555/STJ, decadência tributária)" % NOTA)
S("base-tru-trf3-sumulas-jurisprudencia/references/TABELA-OPERACIONAL-23-SUMULAS.md", "Combinar com. Súmula 555/STJ, Tema 533/STJ.", "Combinar com. Tema 533/STJ (%s, retirada a Súmula 555/STJ, decadência tributária)." % NOTA)
S("carta-servicos-inss/references/marcos-normativos.md", "(Súmula 198 TFR, Súmula 555 STJ, Decretos 53.831/64 e 83.080/79)", "(Súmula 198 TFR, Decretos 53.831/64 e 83.080/79)")

# ---------- R5 Sumula 726/STF (texto real restritivo, mitigada por Lei 11.301/2006 e ADI 3772) ----------
STUB726 = "### Súmula 726/STF (restritiva) e sua mitigação\n\nTexto real. \"Para efeito de aposentadoria especial de professores, não se computa o tempo de serviço prestado fora da sala de aula.\" Aplicação mitigada pela Lei 11.301/2006 e pela ADI 3772, que asseguram o cômputo de direção, coordenação e assessoramento pedagógico exercidos por professor de carreira (%s)." % NOTA
for fn in ["base-professor-direito-adquirido-ec20/SKILL.md",
           "base-professor-direito-adquirido-ec20/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-professor-direito-adquirido-ec20/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-professor-educacao-infantil-lei15326/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-professor-regra-transicao-idade-progressiva-ec103/SKILL.md",
           "base-professor-regra-transicao-idade-progressiva-ec103/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-professor-regra-transicao-idade-progressiva-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-professor-regra-transicao-pedagio-ec103/SKILL.md",
           "base-professor-regra-transicao-pedagio-ec103/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-professor-regra-transicao-pedagio-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-professor-regra-transicao-pontos-ec103/SKILL.md",
           "base-professor-regra-transicao-pontos-ec103/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-professor-regra-transicao-pontos-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md"]:
    R(fn, r"### Súmula 726 STF\r?\n\r?\n[^\r\n]*", STUB726)
S("base-professor-direito-adquirido-ec20/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Súmula 726 STF afasta.",
  "Refutação. A Súmula 726/STF é anterior à Lei 11.301/2006 e à ADI 3772, que asseguram o cômputo das funções de direção, coordenação e assessoramento pedagógico do professor de carreira (%s)." % NOTA)

# ---------- R6 Tema 305/TNU (auxilio emergencial, fora da materia PCD) ----------
STUB305 = "### Repercussão social e funcional na avaliação (IF-BrA)\n\nA exigência decorre da Portaria Interministerial AGU/MPS/MF/MP/PR 1/2014 (IF-BrA) e da LC 142/2013 (%s, retirado o Tema 305/TNU, que trata de auxílio emergencial)." % NOTA
for fn in ["base-pcd-deficiencia-auditiva-visual/SKILL.md",
           "base-pcd-deficiencia-auditiva-visual/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-pcd-deficiencia-auditiva-visual/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-pcd-did-retroativa/SKILL.md",
           "base-pcd-did-retroativa/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-pcd-did-retroativa/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-pcd-fibromialgia-lei15176/SKILL.md",
           "base-pcd-fibromialgia-lei15176/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-pcd-fibromialgia-lei15176/references/JURISPRUDENCIA-E-REFUTACAO.md",
           "base-pcd-if-bra-metodologia/SKILL.md",
           "base-pcd-if-bra-metodologia/references/FUNDAMENTOS-E-CENARIOS.md",
           "base-pcd-if-bra-metodologia/references/JURISPRUDENCIA-E-REFUTACAO.md"]:
    R(fn, r"### Tema 305 TNU\r?\n\r?\n[^\r\n]*", STUB305)
S("base-pcd-deficiencia-auditiva-visual/SKILL.md",
  "Terceiro, perícia que ignora repercussão social viola Tema 305 TNU.",
  "Terceiro, perícia que ignora repercussão social viola a metodologia do IF-BrA (Portaria Interministerial 1/2014; %s)." % NOTA)
S("base-pcd-deficiencia-auditiva-visual/references/JURISPRUDENCIA-E-REFUTACAO.md", "Refutação. Tema 305 TNU.", "Refutação. Portaria Interministerial 1/2014 (IF-BrA) e LC 142/2013.")
S("base-pcd-deficiencia-auditiva-visual/references/JURISPRUDENCIA-E-REFUTACAO.md", "Monitorar Tema 305 TNU.", "Item retirado na %s (Tema 305/TNU trata de auxílio emergencial)." % NOTA)
S("base-pcd-did-retroativa/references/JURISPRUDENCIA-E-REFUTACAO.md", "Acompanhar Tema 305 TNU.", "Item retirado na %s (Tema 305/TNU trata de auxílio emergencial)." % NOTA)
S("base-pcd-fibromialgia-lei15176/references/JURISPRUDENCIA-E-REFUTACAO.md", "Revalidar Tema 305 TNU.", "Item retirado na %s (Tema 305/TNU trata de auxílio emergencial)." % NOTA)
S("base-pcd-if-bra-metodologia/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Avaliação biopsicossocial é obrigatória. Tema 305 TNU.",
  "Refutação. Avaliação biopsicossocial é obrigatória (LC 142/2013, art. 4º, e Portaria Interministerial 1/2014; %s)." % NOTA)

# ---------- R7 QO 48/TNU (objeto real, precedentes do STF) ----------
S("base-tnu-admissibilidade-manual/SKILL.md",
  "QUESTÃO DE ORDEM 48/TNU. \"Não cabe pedido de uniformização que utiliza como paradigma acórdão de Tribunal Regional Federal.\"",
  "QUESTÃO DE ORDEM 48/TNU. \"Precedentes do Supremo Tribunal Federal não se prestam como paradigmas válidos, para fins de admissão do pedido nacional de uniformização de interpretação de lei federal previsto no art. 14, § 2º, da Lei nº 10.259/01.\" (%s, corrigido o objeto; a vedação ao paradigma de TRF decorre do próprio art. 14, §2º, da Lei 10.259/2001)" % NOTA)
S("base-tnu-admissibilidade-manual/SKILL.md",
  "**QO 48/TNU.** Não cabe PUIL com paradigma de TRF.",
  "**QO 48/TNU.** Precedentes do STF não servem de paradigma em PUIL; o paradigma de TRF é vedado pelo art. 14, §2º, da Lei 10.259/2001 (%s)." % NOTA)
S("base-tnu-admissibilidade-manual/SKILL.md",
  "NÃO usar como paradigma direto (QO 48/TNU).",
  "NÃO usar como paradigma direto (art. 14, §2º, da Lei 10.259/2001; a QO 48/TNU veda o paradigma do STF).")
S("base-tnu-admissibilidade-manual/references/QUESTOES-DE-ORDEM-COMPLETAS.md",
  "\"Não cabe pedido de uniformização que utiliza como paradigma acórdão de Tribunal Regional Federal.\" (formulação consolidada do Manual)",
  "\"Precedentes do Supremo Tribunal Federal não se prestam como paradigmas válidos, para fins de admissão do pedido nacional de uniformização de interpretação de lei federal previsto no art. 14, § 2º, da Lei nº 10.259/01.\" (texto publicado em 07/08/2023; %s, corrigida a formulação anterior, que atribuía a QO ao paradigma de TRF)" % NOTA)
S("base-tnu-admissibilidade-manual/references/CHECKLIST-OPERACIONAL-PUIL.md",
  "NÃO é acórdão de TRF, STF, TST, TSE ou decisão monocrática (QO 48/TNU).",
  "NÃO é acórdão de TRF, STF, TST, TSE ou decisão monocrática (art. 14, §2º, Lei 10.259/2001; QO 48/TNU quanto ao STF).")
S("base-revisao-peticao-aprofundada/SKILL.md",
  "15. **Paradigma de TRF em PUIL** (novo, derivado da Onda 30 - QO 48/TNU).",
  "15. **Paradigma de TRF ou de STF em PUIL** (art. 14, §2º, Lei 10.259/2001; QO 48/TNU veda o paradigma do STF — %s)." % NOTA)
S("base-revisao-peticao-aprofundada/SKILL.md",
  "- PUIL com paradigma de TRF (QO 48/TNU).",
  "- PUIL com paradigma de TRF (art. 14, §2º, Lei 10.259/2001) ou do STF (QO 48/TNU).")
S("base-revisao-peticao-aprofundada/references/CATALOGO-ANTI-PATTERNS.md",
  "**Regra.** QO 48/TNU. TRFs não compõem o microssistema dos juizados.",
  "**Regra.** Art. 14, §2º, da Lei 10.259/2001. TRFs não compõem o microssistema dos juizados; a QO 48/TNU veda também o paradigma do STF (%s)." % NOTA)
S("base-revisao-peticao-aprofundada/references/CHECKLIST-POR-RITO.md",
  "- [ ] Paradigma NÃO é TRF, STF, TST, TSE ou decisão monocrática (QO 48/TNU).",
  "- [ ] Paradigma NÃO é TRF, STF, TST, TSE ou decisão monocrática (art. 14, §2º, Lei 10.259/2001; QO 48/TNU quanto ao STF).")

# ---------- R8 Tema 297/TNU (auxilio emergencial, fora da materia de prova trabalhista) ----------
S("base-reclamatoria-trabalhista-prova-previdenciaria/SKILL.md",
  "à luz do Tema 1188/STJ, Tema 297/TNU e Súmula 149/STJ", "à luz do Tema 1188/STJ e da Súmula 149/STJ")
S("base-reclamatoria-trabalhista-prova-previdenciaria/SKILL.md",
  "Tema 297 TNU, Tema 1188 STF,", "Tema 1188 STJ,")
S("base-reclamatoria-trabalhista-prova-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  "Súmula 149/STJ. Tema 297/TNU. Tema 1188/STJ", "Súmula 149/STJ. Tema 1188/STJ")
R("base-reclamatoria-trabalhista-prova-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 297/TNU\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 297/TNU\n\nO Tema 297/TNU real trata de auxílio emergencial (Lei 13.982/2020), não de prova trabalhista. O fundamento correto é o Tema 1188/STJ." % NOTA)
S("base-reclamatoria-trabalhista-prova-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Revalidar Tema 297/TNU. ", "")
S("base-rt-ajuizamento-vinculo-previdenciario/references/SUMULA-368-TST-E-MARCO-2009.md",
  "- Tema 297/TNU (requisitos para uso da sentença).",
  "- [Retirado na %s. O Tema 297/TNU trata de auxílio emergencial; ver o Tema 1188/STJ.]" % NOTA)
R("base-especial-ppp-mudanca-layout-historico/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 297 TNU\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 297/TNU\n\nO Tema 297/TNU real trata de auxílio emergencial e não pertence à matéria de PPP." % NOTA)

# ---------- R13 Tema 1370/STJ (decadencia pendente, nao e de rescisoria) ----------
S("base-cpc-acao-rescisoria-previdenciaria/SKILL.md",
  "cabimento contra coisa julgada previdenciária e Tema 1370 STJ.", "cabimento contra coisa julgada previdenciária.")
S("base-cpc-acao-rescisoria-previdenciaria/SKILL.md", "Tema 1370 STJ, eficácia preclusiva", "eficácia preclusiva")
R("base-cpc-acao-rescisoria-previdenciaria/SKILL.md",
  r"### Tema 1370 STJ\r?\n\r?\n[^\r\n]*(\r?\n\r?\nFonte oficial em [^\r\n]*)?",
  "### [Corrigido na %s] Tema 1370/STJ não é de rescisória\n\nO Tema 1370/STJ (afetado em 12/08/2025, pendente, suspensão nacional) trata de prazos decadenciais autônomos na revisão administrativa. Para rescisória por violação de norma, o fundamento é o art. 966, V, do CPC." % NOTA)
S("base-cpc-acao-rescisoria-previdenciaria/SKILL.md",
  "Cenário C, Tema 1102/STF julgado após sentença desfavorável. Violação de norma. Tema 1370/STJ.",
  "Cenário C, Tema 1102/STF julgado após sentença desfavorável. Violação de norma (art. 966, V, do CPC; %s, retirado o Tema 1370/STJ, que trata de decadência de revisão e está pendente)." % NOTA)
S("base-cpc-acao-rescisoria-previdenciaria/SKILL.md",
  "Quarto, Tema 1370/STJ admite rescisória para alinhar ao precedente qualificado em certas hipóteses, mas há modulação.",
  "Quarto, afirmação retirada na %s. Não se confirma que o Tema 1370/STJ trate de rescisória; ele versa sobre decadência de revisão administrativa e está pendente." % NOTA)
R("base-cpc-acao-rescisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  r"### Tema 1370 STJ\r?\n\r?\n[^\r\n]*",
  "### [Corrigido na %s] Tema 1370/STJ\n\nTema de decadência de revisão administrativa, afetado e pendente; não é fundamento de rescisória." % NOTA)
R("base-cpc-acao-rescisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 1370 STJ\r?\n\r?\n[^\r\n]*",
  "### [Corrigido na %s] Tema 1370/STJ\n\nTema de decadência de revisão administrativa, afetado e pendente; não é fundamento de rescisória." % NOTA)
S("base-cpc-acao-rescisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Violação a precedente qualificado. Tema 1370 STJ.",
  "Refutação. Violação de norma jurídica (art. 966, V, do CPC) (%s)." % NOTA)
S("base-cpc-acao-rescisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Acompanhar Tema 1370 STJ.", "Acompanhar o Tema 1370/STJ (decadência de revisão, pendente).")

# ---------- R15 Tema 942 (STJ e cheque; conversao RGPS e art. 25 par. 2 EC 103; servidor e Tema 942/STF) ----------
S("base-aposentadoria-especial-transicao-ec103/SKILL.md", "Tema 942 STJ, ", "")
R("base-aposentadoria-especial-transicao-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 942 STJ\r?\n\r?\n[^\r\n]*",
  "### Art. 25, §2º, da EC 103/2019 (conversão até 13/11/2019)\n\nRetirado o Tema 942/STJ na %s (o tema real trata de cheque); a conversão de tempo especial de servidor está no Tema 942/STF (RE 1.014.286)." % NOTA)
S("base-aposentadoria-especial-transicao-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Art. 25, §2º, da EC 103 e Tema 942 STJ.",
  "Refutação. Art. 25, §2º, da EC 103/2019 (%s, retirado o Tema 942/STJ, que trata de cheque)." % NOTA)
S("base-rpps-na-otica-do-rgps/SKILL.md", "Tema 942 STJ, REsp 1.682.738", "Tema 942 STF (RE 1.014.286)")
R("base-rpps-na-otica-do-rgps/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 942 STJ\r?\n\r?\n[^\r\n]*",
  "### Tema 942/STF (RE 1.014.286)\n\nConversão de tempo especial de servidor. Até a EC 103/2019 aplicam-se as regras do RGPS; depois, depende de lei complementar do ente (%s, corte corrigida)." % NOTA)
S("base-revisao-peticao-aprofundada/references/PROTOCOLO-INTEGRADO-5-NIVEIS.md",
  "- **Tema 942/STJ** (aposentadoria especial e direito ao melhor benefício).",
  "- **Tema 942/STF** (RE 1.014.286, conversão de tempo especial de servidor; %s)." % NOTA)

# ---------- R16 Tema 709 STJ -> STF ----------
R("base-aposentadoria-especial-transicao-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 709 STJ\r?\n\r?\n[^\r\n]*",
  "### Tema 709/STF (RE 791.961)\n\nVedação constitucional de permanência ou retorno à atividade especial após a aposentadoria especial (%s, corte corrigida)." % NOTA)
S("base-aposentadoria-especial-transicao-ec103/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Tema 709 STJ. Prova alternativa é admitida. Acionar `retificacao-ppp` e `defesa-probatoria-especial`.",
  "Refutação. A comprovação da atividade especial admite meios alternativos de prova técnica (Súmula 198 do TFR). Acionar `retificacao-ppp` e `defesa-probatoria-especial` (%s, retirado o Tema 709/STJ, que é de execução penal)." % NOTA)
S("base-revisao-peticao-aprofundada/references/PROTOCOLO-INTEGRADO-5-NIVEIS.md",
  "- **Tema 709/STJ** (aposentadoria especial e vedação retorno atividade especial).",
  "- **Tema 709/STF** (RE 791.961, vedação de permanência ou retorno à atividade especial; %s)." % NOTA)

# ---------- R17 Temas 1117 e 1157 STF (estranhos a RVT) ----------
S("base-revisao-vida-toda-rvt/SKILL.md",
  "Tema 1117 STF. Parâmetros sobre repercussão geral correlata.",
  "[Retirado na %s] O antes citado Tema 1117/STF trata de previdência complementar privada e não tem relação com a RVT." % NOTA)
S("base-revisao-vida-toda-rvt/SKILL.md",
  "Tema 1157 STF. Discussão sobre modulação e efeitos.",
  "[Retirado na %s] O antes citado Tema 1157/STF trata de reenquadramento de servidor; a modulação da RVT está nas ADIs 2110 e 2111 (21/03/2024)." % NOTA)
R("base-revisao-vida-toda-rvt/SKILL.md", r"Tema 1117 STF, Tema 1157 STF, ", "")
R("base-revisao-vida-toda-rvt/references/FUNDAMENTOS-E-CENARIOS.md", r"### Tema 1117 STF\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 1117/STF\n\nTrata de previdência complementar privada, sem relação com a RVT." % NOTA)
R("base-revisao-vida-toda-rvt/references/FUNDAMENTOS-E-CENARIOS.md", r"### Tema 1157 STF\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 1157/STF\n\nTrata de reenquadramento de servidor; a modulação da RVT está nas ADIs 2110 e 2111." % NOTA)
R("base-revisao-vida-toda-rvt/references/JURISPRUDENCIA-E-REFUTACAO.md", r"### Tema 1117 STF\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 1117/STF\n\nTrata de previdência complementar privada, sem relação com a RVT." % NOTA)
R("base-revisao-vida-toda-rvt/references/JURISPRUDENCIA-E-REFUTACAO.md", r"### Tema 1157 STF\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 1157/STF\n\nTrata de reenquadramento de servidor; a modulação da RVT está nas ADIs 2110 e 2111." % NOTA)

# ---------- R18 Tema 313/STJ (tributario, fora de tutela) ----------
S("base-cpc-tutela-provisoria-previdenciaria/SKILL.md",
  "Primeiro, probabilidade do direito. Caráter alimentar reforça. Tema 313/STJ (efetividade).",
  "Primeiro, probabilidade do direito. O caráter alimentar e a urgência concreta reforçam (%s, retirado o Tema 313/STJ, matéria tributária)." % NOTA)
R("base-cpc-tutela-provisoria-previdenciaria/references/FUNDAMENTOS-E-CENARIOS.md",
  r"### Tema 313 STJ\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 313/STJ\n\nTema tributário (PIS/COFINS), sem relação com tutela previdenciária." % NOTA)
R("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 313 STJ\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 313/STJ\n\nTema tributário (PIS/COFINS), sem relação com tutela previdenciária." % NOTA)
S("base-cpc-tutela-provisoria-previdenciaria/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Benefício alimentar presume urgência. Tema 313 STJ.",
  "Refutação. Benefício alimentar presume urgência (art. 300 do CPC) (%s)." % NOTA)

# ---------- R19 Tema 176/STF (ICMS, fora de contagem reciproca) ----------
S("base-contagem-reciproca-rgps-rpps/SKILL.md", "Tema 176 STF, Súmula 24 AGU", "Súmula 24 AGU")
S("base-contagem-reciproca-rgps-rpps/SKILL.md",
  "Tema 176 STF. Aspectos constitucionais da contagem recíproca.",
  "Art. 201, §9º, da CF e arts. 94 a 99 da Lei 8.213/91 regem a contagem recíproca (%s, retirado o Tema 176/STF, que trata de ICMS)." % NOTA)
R("base-contagem-reciproca-rgps-rpps/references/FUNDAMENTOS-E-CENARIOS.md",
  r"### Tema 176 STF\r?\n\r?\n[^\r\n]*",
  "### Art. 201, §9º, da CF (contagem recíproca)\n\nBase constitucional direta (%s, retirado o Tema 176/STF, que trata de ICMS)." % NOTA)
R("base-contagem-reciproca-rgps-rpps/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 176 STF\r?\n\r?\n[^\r\n]*",
  "### Art. 201, §9º, da CF (contagem recíproca)\n\nBase constitucional direta (%s, retirado o Tema 176/STF, que trata de ICMS)." % NOTA)
S("base-rito-ordinario-trf/references/ART-343-A-RISTJ-RESUMO-ANALITICO.md",
  "4. REsp em Contagem Recíproca (Tema 176 STF).",
  "4. REsp em Contagem Recíproca (art. 201, §9º, da CF; %s, retirado o Tema 176/STF)." % NOTA)
R("base-servico-militar-obrigatorio/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"### Tema 176 STF\r?\n\r?\n[^\r\n]*",
  "### [Retirado na %s] Tema 176/STF\n\nTema de ICMS, estranho à matéria; a contagem recíproca decorre do art. 201, §9º, da CF." % NOTA)

# ---------- R20 Tema 627/STF (real, mas regime pre-EC 103; nao e o redutor do art. 24) ----------
S("base-acumulacao-beneficios-ec103-art24/SKILL.md",
  "Não incide o redutor do art. 24, § 2º (Tema 627/STF).",
  "Não incide a vedação de acumulação quando os cargos são constitucionalmente acumuláveis (Tema 627/STF, RE 658.999, regime anterior à EC 103; para o redutor do art. 24, ver ADI 7051, Tema 1300/STF e RE 1.510.285 AgR — %s)." % NOTA)
S("base-acumulacao-beneficios-ec103-art24/references/FUNDAMENTOS-E-CENARIOS.md",
  "Não incide o redutor do art. 24, § 2º (Tema 627/STF).",
  "Não incide a vedação de acumulação quando os cargos são constitucionalmente acumuláveis (Tema 627/STF, RE 658.999, regime anterior à EC 103; para o redutor do art. 24, ver ADI 7051, Tema 1300/STF e RE 1.510.285 AgR — %s)." % NOTA)

# ---------- R21 Tema 1207/STF (EC 47, estranho a reaposentacao) ----------
S("base-desaposentacao-reaposentacao/SKILL.md",
  "Tema 1207 STF: vedação também à reaposentação e disciplina dos efeitos e da devolução de valores (par do Tema 503).",
  "Reaposentação igualmente vedada pela lógica do Tema 503/STF e de seus embargos (%s, retirado o Tema 1207/STF, que trata do art. 3º da EC 47/2005, matéria estranha)." % NOTA, 3)

# ---------- R22 Tema 732 (STJ, nao STF; alerta Tema 1271/STF) ----------
S("base-pensao-por-morte-pos-reforma/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "### Tema 732 STF (RE 605.867)",
  "### Tema 732/STJ (REsp 1.411.258) e Tema 1271/STF pendente (%s)" % NOTA)
S("base-pensao-por-morte-pos-reforma/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Tema 732 STF. Equiparação de menor sob guarda a filho foi restabelecida pela jurisprudência constitucional. Direito reconhecido.",
  "Refutação. Tema 732/STJ, o menor sob guarda tem direito à pensão comprovada a dependência econômica. Atenção (%s), a matéria pós-EC 103 está afetada no Tema 1271/STF (RE 1.442.021), com suspensão nacional desde 21/01/2025." % NOTA)

# ---------- R23 Tema 1188/STF inexistente para a materia ----------
S("base-rt-ajuizamento-vinculo-previdenciario/references/SUMULA-368-TST-E-MARCO-2009.md",
  "- Tema 1188/STF (participação do INSS no processo trabalhista).",
  "- [Retirado na %s. Não se confirma tema do STF sobre participação do INSS no processo trabalhista.]" % NOTA)

# ---------- R24 Tema 33/STF (bancario) ----------
S("base-cpc-fato-superveniente-art493/SKILL.md",
  "Cenário B, segurado completa idade exigida pelo Tema 33 STF durante o processo.",
  "Cenário B, segurado completa a idade mínima legal durante o processo (art. 493 do CPC; %s, retirado o Tema 33/STF, que trata de juros bancários)." % NOTA)

# ---------- R25 Tema 698/STJ (reverso da Sumula 98) ----------
S("base-efeito-translativo-tema-1124-defesa/SKILL.md",
  "Súmula 98/STJ + Tema Repetitivo 698/STJ. Embargos prequestionadores.\n",
  "Súmula 98/STJ. Embargos prequestionadores não são protelatórios; atenção, o Tema 698/STJ autoriza multa quando os embargos rediscutem matéria já pacificada (%s).\n" % NOTA)
S("base-efeito-translativo-tema-1124-defesa/SKILL.md",
  "### 7.2. Tema Repetitivo 698/STJ\n\nRatifica a Súmula 98/STJ.\n\nNão há caráter protelatório nos embargos prequestionadores.",
  "### 7.2. Tema Repetitivo 698/STJ\n\nÉ o limite da Súmula 98/STJ, não a sua ratificação. Autoriza multa quando os embargos rediscutem matéria já decidida em súmula ou repetitivo (%s). Embargos prequestionadores objetivos permanecem protegidos pela Súmula 98/STJ." % NOTA)
R("base-efeito-translativo-tema-1124-defesa/references/FUNDAMENTOS-E-CENARIOS.md",
  r"## 5\. Tema Repetitivo 698/STJ\r?\n\r?\n[^\r\n]*",
  "## 5. Tema Repetitivo 698/STJ\n\nLimite da Súmula 98/STJ. Multa autorizada quando os embargos rediscutem matéria pacificada (%s)." % NOTA)
S("base-efeito-translativo-tema-1124-defesa/references/FUNDAMENTOS-E-CENARIOS.md",
  "5. Súmula 98/STJ. Tema Repetitivo 698/STJ. Embargos prequestionadores não são protelatórios.",
  "5. Súmula 98/STJ. Embargos prequestionadores não são protelatórios; o Tema 698/STJ pune apenas a rediscussão de matéria pacificada (%s)." % NOTA)
R("base-efeito-translativo-tema-1124-defesa/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"## 5\. Tema Repetitivo 698/STJ\r?\n\r?\n[^\r\n]*",
  "## 5. Tema Repetitivo 698/STJ\n\nLimite da Súmula 98/STJ. Multa autorizada quando os embargos rediscutem matéria pacificada (%s)." % NOTA)
S("base-efeito-translativo-tema-1124-defesa/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Refutação. Súmula 98/STJ + Tema Repetitivo 698/STJ. Embargos prequestionadores não são protelatórios.",
  "Refutação. Súmula 98/STJ, embargos prequestionadores não são protelatórios; o Tema 698/STJ só autoriza multa na rediscussão de matéria pacificada (%s)." % NOTA)
S("base-puil-pedilef-vedacao-materia-processual/SKILL.md",
  "Súmula 98/STJ + Tema Repetitivo 698/STJ. Embargos prequestionadores não são protelatórios.",
  "Súmula 98/STJ, embargos prequestionadores não são protelatórios; o Tema 698/STJ autoriza multa apenas quando rediscutem matéria pacificada (%s)." % NOTA)
S("base-puil-pedilef-vedacao-materia-processual/references/FUNDAMENTOS-E-CENARIOS.md",
  "Súmula 98/STJ + Tema Repetitivo 698/STJ. Embargos prequestionadores.",
  "Súmula 98/STJ, embargos prequestionadores não são protelatórios; o Tema 698/STJ pune a rediscussão de matéria pacificada (%s)." % NOTA)
S("base-puil-pedilef-vedacao-materia-processual/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "Súmula 98/STJ + Tema Repetitivo 698/STJ.",
  "Súmula 98/STJ; o Tema 698/STJ é o limite (multa na rediscussão de matéria pacificada).")

# ---------- R26 Tema 660/STF (ofensa reflexa, nao e prequestionamento ficto) ----------
S("base-efeito-translativo-tema-1124-defesa/SKILL.md", "Tema 660 STF, prequestionamento", "prequestionamento")
S("base-efeito-translativo-tema-1124-defesa/references/FUNDAMENTOS-E-CENARIOS.md",
  "Tema 660/STF (prequestionamento ficto).",
  "Art. 1.025 do CPC (prequestionamento ficto; %s, retirado o Tema 660/STF, que trata de ofensa reflexa)." % NOTA)
S("base-efeito-translativo-tema-1124-defesa/references/FUNDAMENTOS-E-CENARIOS.md", "Tema 660/STF.", "Art. 1.025 do CPC.")
R("base-efeito-translativo-tema-1124-defesa/references/JURISPRUDENCIA-E-REFUTACAO.md",
  r"## 6\. Tema 660/STF\r?\n\r?\n[^\r\n]*",
  "## 6. [Corrigido na %s] Prequestionamento ficto\n\nO fundamento é o art. 1.025 do CPC. O Tema 660/STF trata de ofensa reflexa (ausência de repercussão geral) e foi retirado." % NOTA)
S("base-efeito-translativo-tema-1124-defesa/references/JURISPRUDENCIA-E-REFUTACAO.md",
  "| Tema 660/STF prequestionamento ficto | Art. 1.025 CPC | STF | Embargos improvidos |",
  "| Prequestionamento ficto | Art. 1.025 CPC | norma expressa | Embargos improvidos |")

# ---------- gravar ----------
for fn, txt in CACHE.items():
    open(os.path.join(SK, fn), "w", encoding="utf-8", newline="").write(txt)
print("=== FALHAS (%d) ===" % len(FAIL))
for f in FAIL:
    print(f)
print("=== OK (%d aplicadas) ===" % len(LOG))
