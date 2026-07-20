import json, io, os

ROOT = r"C:\Users\VAIO\.claude\plugins\marketplaces\marketplace-tercini"
FILES = [
    os.path.join(ROOT, ".claude-plugin", "plugin.json"),
    os.path.join(ROOT, "_base-conhecimento-inss", ".claude-plugin", "plugin.json"),
]

NEW_VERSION = "1.60.0"

ONDA70 = (
    "A versao 1.60.0 entrega a Onda 70, limbo previdenciario e correcao de erro grave de numeracao "
    "no catalogo de precedentes da TNU. Nova skill base-limbo-previdenciario-tema300, com SKILL.md e tres "
    "references (FUNDAMENTOS-E-CENARIOS com roteiro probatorio em oito graus e cinco cenarios tipicos, "
    "JURISPRUDENCIA-E-REFUTACAO com teses literais conferidas e quatro refutacoes antecipadas ao INSS, e "
    "TABELA-RAIS-AFASTAMENTOS-D2 com a tabela literal do item D.2 do Manual da RAIS, as regras de preenchimento "
    "D.1, D.3 e D.4 e sete teses probatorias). ERRO GRAVE CORRIGIDO, o CATALOGO-TEMAS-TNU atribuia a tese do limbo "
    "ao Tema 301 e registrava o Tema 300 como sem tese firmada, inversao apurada por conferencia direta nas paginas "
    "oficiais do CJF em 20/07/2026. Tema 300/TNU e o limbo (PEDILEF 0513030-88.2020.4.05.8400/RN, julgado em "
    "07/12/2022, situacao oficial Em Revisao pelo Tema 1421/STF, e a redacao antes catalogada estava incompleta, "
    "faltava a parte final sobre o inicio da contagem do periodo de graca do art. 15, II). Tema 301/TNU e segurado "
    "especial com 120 dias de atividade urbana (PEDILEF 0501240-10.2020.4.05.8303/PE, julgado em 15/09/2022), agora "
    "com tese literal integral. Tema 1421/STF incluido no catalogo (RE 1.460.766, Rel. Min. Gilmar Mendes, RG em "
    "06/09/2025, MERITO NAO JULGADO, sem suspensao nacional), com alerta de nao confusao com o Tema 1421/STJ, "
    "homonimo e de materia diversa. Precedentes do TRF3 registrados com redacao literal, RI 5018508-56.2024.4.03.6301 "
    "da 8a Turma Recursal (CONTRARIO, exige prova do impedimento ilegitimo, vinculo aberto no CNIS nao basta) e RI "
    "5001689-93.2024.4.03.6317 da 2a Turma Recursal (FAVORAVEL, pensao por morte com limbo reconhecido em reclamatoria "
    "trabalhista transitada e contribuicoes recolhidas pela empregadora). IRR 302/TST registrado como afetado e sem tese, "
    "e Enunciado 302/2026 do TRT7 como persuasivo, ambos sobre o onus da prova da comunicacao da alta. Ausencia de tese "
    "do STJ declarada expressamente. ALERTA OPERACIONAL NOVO, jamais requerer RAC de baixa de vinculo em aberto no CNIS "
    "quando houver diagnostico de limbo, porque o vinculo aberto e o ativo processual que sustenta a tese, excecao "
    "expressa a rotina de saneamento da base-cnis-acerto-indicadores. Integracao por remissao em base-precedentes-catalogo-vinculantes, "
    "base-cnis-acerto-indicadores, base-documentos-comprobatorios-in128 (checklist documental proprio do limbo), "
    "base-reclamatoria-trabalhista-prova-previdenciaria, base-rt-ajuizamento-vinculo-previdenciario (pedidos proprios da RT de limbo), "
    "base-cpc-onus-prova-art373, base-incapacidade-b31-temporaria (citacao corrigida, invocava so o Tema 1421/STF pendente "
    "e omitia o Tema 300), ponte-workflow-pensao-por-morte e ponte-orquestrador-previdenciario (gatilho transversal). "
    "Em quarentena expressa, codigos 73, 74, 76 e 80 da tabela de afastamentos da RAIS e IRR 88 do TST sobre dano moral no limbo. "
)

NEW_KEYWORDS = [
    "onda-70", "limbo-previdenciario", "tema-300-tnu", "tema-1421-stf", "re-1460766",
    "pedilef-0513030-88-2020", "qualidade-de-segurado-no-limbo", "art-15-ii-lei-8213",
    "alta-previdenciaria", "impedimento-patronal-retorno", "aso-inaptidao",
    "irr-302-tst", "enunciado-302-2026-trt7", "onus-comunicacao-da-alta",
    "rais-item-d2", "rais-sem-codigo-de-ferias", "remuneracao-zerada-confissao",
    "ctps-digital-contrato-aberto", "vedacao-rac-vinculo-aberto",
    "correcao-numeracao-tema-300-301", "tema-301-tnu-segurado-especial-120-dias",
    "trf3-5018508-56-2024", "trf3-5001689-93-2024",
]


def bump(path):
    with io.open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["version"] = NEW_VERSION

    d = data["description"]
    marker = "pro-segurado. "
    # localiza o ponto de insercao apos a frase de abertura
    idx = d.find("A vers")
    if idx == -1:
        raise SystemExit("ponto de insercao nao encontrado em " + path)
    head, tail = d[:idx], d[idx:]
    tail = tail.replace("A versao 1.59.0 entrega a Onda 69", "A versao 1.59.0 entregou a Onda 69", 1)
    tail = tail.replace("A versão 1.59.0 entrega a Onda 69", "A versão 1.59.0 entregou a Onda 69", 1)
    data["description"] = head + ONDA70 + tail

    kws = data.get("keywords", [])
    for k in NEW_KEYWORDS:
        if k not in kws:
            kws.append(k)
    data["keywords"] = kws

    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print("OK", path, "version", data["version"], "keywords", len(kws), "desc_chars", len(data["description"]))


for p in FILES:
    bump(p)
