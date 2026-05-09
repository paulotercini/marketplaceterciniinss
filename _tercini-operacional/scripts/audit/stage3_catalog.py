"""Etapa 3 da auditoria - Catalogo de beneficios e tipos de acao.

Extrai termos previdenciarios, espécies de benefício, ações processuais
e sistemas mencionados nos titulos e bodies das tarefas.

Saida em /tmp/audit_stage3.md.
"""
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

CACHE = json.loads(Path("/tmp/audit_cache.json").read_text())

# Catalogo de gatilhos (regex case-insensitive)
BENEFICIOS = {
    "Aposentadoria por idade urbana": [r"aposentadoria por idade(?! rural| h[íi]brida)", r"\bAPI\b"],
    "Aposentadoria por idade rural": [r"aposentadoria por idade rural", r"idade rural", r"segurad[ao] especial"],
    "Aposentadoria por idade hibrida": [r"aposentadoria h[íi]brida", r"idade h[íi]brida"],
    "Aposentadoria por TC": [r"aposentadoria por tempo de contribui", r"\bATC\b", r"\bTC\b"],
    "Aposentadoria especial": [r"aposentadoria especial", r"atividade especial", r"\bPPP\b", r"\bLTCAT\b"],
    "Aposentadoria PCD (LC 142)": [r"aposentadoria.{0,20}(?:pcd|deficien)", r"LC ?142", r"deficien"],
    "Aposentadoria do professor": [r"aposentadoria.{0,20}professor", r"magist[ée]rio"],
    "Aposentadoria por incapacidade B91": [r"\bB91\b", r"aposentadoria por invalidez", r"aposentadoria por incapacidade"],
    "Auxilio-doenca B31": [r"\bB31\b", r"aux[íi]lio[-\s]?doen[çc]a"],
    "Auxilio-acidente B94": [r"\bB94\b", r"aux[íi]lio[-\s]?acidente"],
    "Acidente de trabalho B91/B92": [r"\bB92\b", r"acidente.{0,5}trabalho", r"acident[áa]ri[ao]"],
    "Pensao por morte": [r"pens[ãa]o por morte", r"\bPPM\b"],
    "Salario-maternidade": [r"sal[áa]rio[-\s]?maternidade", r"\bSM\b\b"],
    "Auxilio-reclusao": [r"aux[íi]lio[-\s]?reclus[ãa]o"],
    "BPC/LOAS": [r"\bBPC\b", r"\bLOAS\b", r"benef[íi]cio assistencial", r"presta[çc][ãa]o continuada"],
    "Reabilitacao": [r"reabilita[çc][ãa]o", r"PRP\b"],
}

REVISOES = {
    "Revisao da Vida Toda (RVT)": [r"revis[ãa]o.{0,30}vida toda", r"\bRVT\b"],
    "Revisao do teto": [r"revis[ãa]o.{0,20}teto", r"buraco negro", r"buraco verde"],
    "Revisao art 29": [r"art\.?\s*29", r"revis[ãa]o.{0,20}29"],
    "Revisao IRSM": [r"\bIRSM\b"],
    "Revisao tempo concomitante (T1070)": [r"tema.?1070", r"concomitan"],
    "Revisao reajuste ORTN/OTN": [r"\bORTN\b", r"\bOTN\b"],
}

ACOES = {
    "Requerimento administrativo": [r"requerimento administrativ", r"protocol(?:ar|ado|ei).{0,30}requer", r"DER\b", r"data de entrada"],
    "Recurso ordinário (JR/CRPS)": [r"recurso ordin[áa]rio", r"junta de recursos", r"\bCRPS\b", r"\bJR\b"],
    "Recurso especial CRPS": [r"recurso especial.{0,20}c[âa]mara", r"câmaras de julgamento"],
    "Embargos declaração": [r"embargos.{0,20}declara"],
    "Mandado de segurança": [r"mandado de seguran[çc]a", r"\bMS\b"],
    "Acao ordinaria": [r"a[çc][ãa]o ordin[áa]ria"],
    "JEF": [r"\bJEF\b", r"juizado especial federal"],
    "Cumprimento de sentenca": [r"cumprimento de senten[çc]a"],
    "RPV/Precatorio": [r"\bRPV\b", r"precat[óo]ri"],
    "Replica": [r"r[ée]plica"],
    "Contestacao": [r"contesta[çc][ãa]o"],
    "Impugnacao laudo": [r"impugna[çc][ãa]o.{0,15}laudo"],
    "Manifestacao perícia": [r"manifesta[çc].{0,20}per[íi]cia"],
    "Apelacao": [r"apela[çc][ãa]o"],
    "Agravo": [r"agravo"],
    "Pedido de uniformizacao TNU": [r"\bTNU\b", r"uniformiza"],
    "Acordo": [r"\bacordo\b", r"propost(a|o).{0,15}acordo"],
    "Pericia medica": [r"per[íi]cia m[ée]dica", r"per[íi]cia agendada"],
    "Audiencia": [r"audi[êe]ncia"],
    "Reclamacao Procon": [r"\bprocon\b"],
    "Ouvidoria/CGU": [r"ouvidoria", r"\bCGU\b", r"falabr"],
    "Reclamacao Ouvidoria INSS": [r"ouvidoria.{0,15}inss"],
    "Indenização cível": [r"indeniza[çc][ãa]o", r"dano moral"],
    "Inventário": [r"invent[áa]rio"],
    "Despejo / busca e apreensão": [r"despejo", r"busca e apreens"],
    "Execução": [r"execu[çc][ãa]o.{0,10}t[íi]tulo", r"execu[çc][ãa]o.{0,10}extrajudicial"],
}

SISTEMAS = {
    "Meu INSS": [r"meu.?inss", r"\bMEUINSS\b"],
    "PAT/GERID": [r"\bPAT\b", r"\bGERID\b"],
    "HISCRE": [r"\bHISCRE\b"],
    "PJe": [r"\bpje\b", r"\bPJE\b"],
    "Eproc": [r"\bEPROC\b", r"\beproc\b"],
    "SEI": [r"\bSEI\b\.\s*sus", r"sei\.susep"],
    "DataPrev": [r"dataprev"],
    "INFBEN": [r"\bINFBEN\b", r"infben"],
    "CNIS": [r"\bCNIS\b"],
    "Gov.br": [r"gov\.br", r"\bGOV\.BR\b"],
    "Procon": [r"\bprocon\b"],
    "TJSP": [r"\bTJSP\b", r"tj.?sp"],
    "TRF3": [r"\bTRF3\b", r"trf.?3"],
    "STJ": [r"\bSTJ\b"],
    "STF": [r"\bSTF\b"],
}

PROVAS = {
    "PPP": [r"\bPPP\b", r"perfil profissiogr[áa]fico"],
    "LTCAT": [r"\bLTCAT\b"],
    "Laudo medico": [r"laudo m[ée]dico", r"relat[óo]rio m[ée]dico"],
    "CNIS": [r"\bCNIS\b"],
    "CTPS": [r"\bCTPS\b", r"carteira de trabalho"],
    "Procuracao": [r"procura[çc][ãa]o"],
    "Comprovante de residencia": [r"comprovante de (?:resid[êe]ncia|endere[çc]o)"],
    "Declaracao de pobreza": [r"declara[çc][ãa]o de pobreza", r"hipossuficien"],
    "Justificacao administrativa": [r"justifica[çc][ãa]o administrativa"],
    "Reclamatoria trabalhista": [r"reclamat[óo]ri", r"justi[çc]a do trabalho"],
}


def conta_padroes(textos, dicionario):
    """Conta tarefas que mencionam cada padrao do dicionario."""
    resultado = Counter()
    for label, padroes in dicionario.items():
        regex = re.compile("|".join(padroes), re.IGNORECASE)
        for texto in textos:
            if regex.search(texto):
                resultado[label] += 1
                break_outer = True
    # Refazer corretamente - cada texto pode somar para um label, mas so uma vez
    resultado = Counter()
    for label, padroes in dicionario.items():
        regex = re.compile("|".join(padroes), re.IGNORECASE)
        n = sum(1 for texto in textos if regex.search(texto))
        if n:
            resultado[label] = n
    return resultado


def main():
    todas = []
    for l in CACHE["listas"]:
        for t in l["tarefas"]:
            t["_lista"] = l["displayName"]
            todas.append(t)

    abertas = [t for t in todas if t.get("status") != "completed"]

    def texto_de(t):
        body = t.get("body", "") or ""
        title = t.get("title", "") or ""
        cl = " ".join(c["text"] for c in t.get("checklist", []))
        return f"{title}\n{body}\n{cl}"

    textos_abertas = [texto_de(t) for t in abertas]
    textos_todas = [texto_de(t) for t in todas]

    out = []
    out.append("# Etapa 3 - Catalogo de beneficios e tipos de acao\n")
    out.append(f"Base, {len(abertas)} tarefas abertas / {len(todas)} totais (incluindo concluidas).\n")

    # ===== 3.1 Especies de beneficios =====
    out.append("## 3.1 Especies de beneficios mencionadas\n")
    cnt_ab = conta_padroes(textos_abertas, BENEFICIOS)
    cnt_total = conta_padroes(textos_todas, BENEFICIOS)
    out.append("| Especie | Em abertas | Em todas |")
    out.append("|---|---:|---:|")
    for label in BENEFICIOS:
        ab = cnt_ab.get(label, 0)
        tot = cnt_total.get(label, 0)
        if tot:
            out.append(f"| {label} | {ab} | {tot} |")
    out.append("")

    # ===== 3.2 Revisoes =====
    out.append("## 3.2 Revisoes\n")
    cnt_ab_r = conta_padroes(textos_abertas, REVISOES)
    cnt_total_r = conta_padroes(textos_todas, REVISOES)
    out.append("| Revisao | Em abertas | Em todas |")
    out.append("|---|---:|---:|")
    for label in REVISOES:
        ab = cnt_ab_r.get(label, 0)
        tot = cnt_total_r.get(label, 0)
        if tot:
            out.append(f"| {label} | {ab} | {tot} |")
    out.append("")

    # ===== 3.3 Acoes/procedimentos =====
    out.append("## 3.3 Tipos de acao e procedimento\n")
    cnt_ab_a = conta_padroes(textos_abertas, ACOES)
    cnt_total_a = conta_padroes(textos_todas, ACOES)
    out.append("| Acao | Em abertas | Em todas |")
    out.append("|---|---:|---:|")
    for label in ACOES:
        ab = cnt_ab_a.get(label, 0)
        tot = cnt_total_a.get(label, 0)
        if tot:
            out.append(f"| {label} | {ab} | {tot} |")
    out.append("")

    # ===== 3.4 Sistemas =====
    out.append("## 3.4 Sistemas e plataformas usados\n")
    cnt_ab_s = conta_padroes(textos_abertas, SISTEMAS)
    cnt_total_s = conta_padroes(textos_todas, SISTEMAS)
    out.append("| Sistema | Em abertas | Em todas |")
    out.append("|---|---:|---:|")
    for label in SISTEMAS:
        ab = cnt_ab_s.get(label, 0)
        tot = cnt_total_s.get(label, 0)
        if tot:
            out.append(f"| {label} | {ab} | {tot} |")
    out.append("")

    # ===== 3.5 Provas e documentos =====
    out.append("## 3.5 Provas e documentos\n")
    cnt_ab_p = conta_padroes(textos_abertas, PROVAS)
    cnt_total_p = conta_padroes(textos_todas, PROVAS)
    out.append("| Documento/prova | Em abertas | Em todas |")
    out.append("|---|---:|---:|")
    for label in PROVAS:
        ab = cnt_ab_p.get(label, 0)
        tot = cnt_total_p.get(label, 0)
        if tot:
            out.append(f"| {label} | {ab} | {tot} |")
    out.append("")

    # ===== 3.6 Mix por lista =====
    out.append("## 3.6 Concentracao por lista (top beneficios em cada uma)\n")
    listas_alvo = ["🌻 INSS", "🖥 Conselho de Recursos", "👪 Judicial", "🗓 Tarefas com Prazo", "🙏 Aposentadorias Futuras"]
    for nome_lista in listas_alvo:
        tarefas_l = [t for t in abertas if t["_lista"] == nome_lista]
        if not tarefas_l:
            continue
        textos_l = [texto_de(t) for t in tarefas_l]
        cnt = conta_padroes(textos_l, BENEFICIOS)
        cnt_a = conta_padroes(textos_l, ACOES)
        out.append(f"\n### {nome_lista} ({len(tarefas_l)} abertas)")
        if cnt:
            top_b = cnt.most_common(7)
            out.append("Beneficios:")
            for k, v in top_b:
                out.append(f"  - {k}: {v}")
        if cnt_a:
            top_a = cnt_a.most_common(7)
            out.append("Acoes:")
            for k, v in top_a:
                out.append(f"  - {k}: {v}")
    out.append("")

    Path("/tmp/audit_stage3.md").write_text("\n".join(out))
    print("\n".join(out))


if __name__ == "__main__":
    main()
