# -*- coding: utf-8 -*-
import io

TESE1188 = "A sentença trabalhista homologatória de acordo, assim como a anotação na CTPS e demais documentos dela decorrentes, somente será considerada início de prova material válida, conforme o disposto no art. 55, § 3º, da Lei 8.213/91, quando houver nos autos elementos probatórios contemporâneos que comprovem os fatos alegados e sejam aptos a demonstrar o tempo de serviço no período que se pretende reconhecer na ação previdenciária, exceto na hipótese de caso fortuito ou força maior."
BASE = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss\skills"

def rw(path, subs):
    t = io.open(path, encoding="utf-8").read()
    for old, new in subs:
        if old not in t:
            print("NAO ACHOU:", path, "|", old[:60]); continue
        t = t.replace(old, new)
    io.open(path, "w", encoding="utf-8").write(t)
    print("OK", path)

p = BASE + r"\base-reclamatoria-trabalhista-prova-previdenciaria"
rw(p + r"\SKILL.md", [
 ("A Súmula 31/TNU admite a sentença trabalhista como prova previdenciária quando fundada em prova material.",
  "CORREÇÃO DE AUDITORIA (11/07/2026). A Súmula 31/TNU foi REVOGADA pela TNU em 22/11/2023 e não pode ser citada como vigente. O fundamento atual é o Tema 1188/STJ (transitado em julgado), com a seguinte tese literal. \"" + TESE1188 + "\""),
 ("O INSS recusa qualquer aceitação. Refute com Súmula 31/TNU.",
  "O INSS recusa qualquer aceitação. Refute com o Tema 1188/STJ (sentença fundada em elementos contemporâneos é início de prova material) e, na via administrativa, com o Enunciado 3 do CRPS. Não citar a Súmula 31/TNU, revogada em 22/11/2023."),
])
rw(p + r"\references\FUNDAMENTOS-E-CENARIOS.md", [
 ("Súmula 31/TNU. Súmula 149/STJ. Tema 297/TNU. Tema 1.188/STF.",
  "Súmula 149/STJ. Tema 297/TNU. Tema 1188/STJ (a Súmula 31/TNU foi revogada em 22/11/2023, não citar como vigente)."),
])
rw(p + r"\references\JURISPRUDENCIA-E-REFUTACAO.md", [
 ("### Súmula 31/TNU\n\nAceita sentença trabalhista. Fonte oficial em https://www.cjf.jus.br",
  "### Súmula 31/TNU (REVOGADA em 22/11/2023)\n\nNão citar como vigente. A matéria é regida pelo Tema 1188/STJ."),
 ("### Tema 1.188/STF\n\nParticipação do INSS. Fonte oficial em https://portal.stf.jus.br",
  "### Tema 1188/STJ (tese literal conferida em 11/07/2026, transitado em julgado, julgado em 13/09/2023)\n\n\"" + TESE1188 + "\""),
 ("Refutação. Súmula 31 TNU. Início de prova material vincula.",
  "Refutação. Tema 1188/STJ. Sentença fundada em elementos probatórios contemporâneos constitui início de prova material válida."),
 ("Refutação. Súmula 31 TNU resguarda. Tema 1.188/STF.",
  "Refutação. Tema 1188/STJ. A eficácia probatória independe da participação do INSS na reclamatória, desde que haja elementos contemporâneos."),
 ("Refutação. Súmula 31 TNU não distingue tempo.",
  "Refutação. O Tema 1188/STJ não impõe limite temporal ao vínculo, exige apenas elementos probatórios contemporâneos aptos a demonstrar o período."),
 ("Acompanhar Súmula 31/TNU. Revalidar Tema 297/TNU. Monitorar Tema 1.188/STF.",
  "Súmula 31/TNU revogada em 22/11/2023. Revalidar Tema 297/TNU. Tema 1188/STJ julgado e transitado em julgado."),
])

q = BASE + r"\base-rt-ajuizamento-vinculo-previdenciario"
rw(q + r"\SKILL.md", [
 ("1. Aceitar a sentença trabalhista como prova quando fundada em prova material (cf. Súmula 31/TNU).",
  "1. Aceitar a sentença trabalhista como prova quando fundada em elementos probatórios contemporâneos (Tema 1188/STJ; a Súmula 31/TNU foi revogada em 22/11/2023)."),
])
rw(q + r"\references\SUMULA-368-TST-E-MARCO-2009.md", [
 ("- Súmula 31/TNU (sentença trabalhista como prova previdenciária).",
  "- Tema 1188/STJ (sentença trabalhista homologatória e documentos decorrentes como início de prova material, exigidos elementos contemporâneos; a Súmula 31/TNU foi revogada em 22/11/2023)."),
])
