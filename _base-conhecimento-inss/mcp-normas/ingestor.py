"""Ingestão do corpus de legislação para o banco local. Só lê o corpus, nunca o altera.

    python ingestor.py              carga completa
    python ingestor.py --conferir   só relata o que sairia, sem gravar

Lê apenas os .md das seis pastas. As pastas _downloads são rascunho de captura e prova de
origem, ficam de fora do banco e não são tocadas.
"""
import argparse, datetime, json, re, sys

import banco, identidade, parser

# Faixas medidas em 20/09/2026. Arquivo conhecido que sair fora disso derruba a carga, porque
# campo vazio em silêncio é o pior resultado de uma mudança no corpus.
ESPERADO = {
    "Lei-8213-91-beneficios.md": (290, 183),
    "IN-128-2022-INSS-parte1-arts-1-170.md": (170, 170),
    "IN-128-2022-INSS-parte2-arts-171-340.md": (170, 170),
    "IN-128-2022-INSS-parte3-arts-341-510.md": (170, 170),
    "IN-128-2022-INSS-parte4-arts-511-674.md": (164, 164),
    "Decreto-3048-99-RPS-parte1-arts-1-100.md": (218, 131),
    "CF-1988-completa.md": (512, None),
    "Lei-13105-2015-CPC.md": (1084, None),
}


def arquivos(incluir_fora=False):
    """Só os .md das seis pastas. _downloads é rascunho de captura, fica fora e não é tocada."""
    tudo = sorted((p for p in banco.CORPUS.rglob("*.md") if "_downloads" not in p.parts),
                  key=lambda p: (p.parent.name, p.name))
    return tudo if incluir_fora else [p for p in tudo if p.name not in identidade.FORA]


def ler_tudo():
    """Agrupa arquivos por norma e atravessa o contexto hierárquico na fronteira das partes,
    porque LIVRO e CAPÍTULO ficam no fim do arquivo anterior nos Decretos e na IN 128 partidos."""
    normas, contexto, parte, desconhecidos = {}, {}, {}, []
    for caminho in arquivos():
        try:
            norma_id, tipo, numero, ano, titulo = identidade.identidade(caminho.name)
        except KeyError:
            # arquivo novo no corpus não derruba a carga e também não passa em silêncio:
            # fica de fora, aparece no relatório e o teste cobra a tabela completa
            desconhecidos.append(caminho.name)
            continue
        lido = parser.ler_arquivo(caminho.read_text(encoding="utf-8", errors="replace"),
                                  caminho.name, contexto.get(norma_id),
                                  parte.get(norma_id, "principal"))
        contexto[norma_id] = lido["contexto_final"]
        parte[norma_id] = lido["parte_final"]
        esperado = ESPERADO.get(caminho.name)
        if esperado:
            achou = (len(lido["artigos"]), len({(a["parte"], a["chave"]) for a in lido["artigos"]}))
            for i, alvo in enumerate(esperado):
                if alvo is not None and achou[i] != alvo:
                    raise parser.LayoutMudou(
                        f"{caminho.name}: esperado {esperado}, extraído {achou}. "
                        "O corpus mudou ou o parser regrediu; confira a SONDA-2026-09-20.md.")
        d = normas.setdefault(norma_id, {"id": norma_id, "tipo": tipo, "numero": numero,
                                         "ano": ano, "titulo": titulo,
                                         "arquivos": [], "artigos": [], "metas": [], "textos": []})
        d["arquivos"].append(caminho.name)
        d["artigos"].extend(lido["artigos"] or trechos(lido["preambulo"], caminho.name))
        d["metas"].append(lido["meta"])
        d["textos"].append(lido["preambulo"])
        d["textos"].extend(a["texto"] for a in lido["artigos"])
    return normas, desconhecidos


def trechos(corpo, arquivo, tamanho=1800):
    """Arquivo sem artigo nenhum vira trecho buscavel, com chave t1, t2 e assim por diante.
    Sao os Anexos II a IV do Decreto 3.048, que trazem o quadro de agentes nocivos em
    pseudo-tabela, e o Anexo VI da Portaria 1851. Sem isto, busca por ruido ou por agente
    quimico nao alcanca o Decreto 3.048, que e o caso que mais pesa na aposentadoria especial."""
    # a pseudo-tabela do anexo nao tem marcador de dispositivo, entao o reagrupar junta o
    # documento inteiro numa linha so. Por isso o corte e por tamanho, e nao so por linha.
    linhas = []
    for l in corpo.split(chr(10)):
        l = l.strip()
        if l.startswith("#"):      # o H1 do titulo nao e texto da norma
            continue
        while len(l) > tamanho:
            corte = l.rfind(" ", 0, tamanho) or tamanho
            linhas.append(l[:corte]); l = l[corte:].lstrip()
        if l:
            linhas.append(l)
    blocos, atual = [], []
    for l in linhas:
        atual.append(l)
        if sum(len(x) for x in atual) >= tamanho:
            blocos.append(atual); atual = []
    if atual:
        blocos.append(atual)
    return [{"chave": "t%d" % i, "num": i, "sufixo": "", "parte": "texto", "contexto": "",
             "alteracao_tipo": "original", "alteracao_norma": "", "alteracao_ano": None,
             "marcador": "", "revogado": 0, "versao": 1, "total_versoes": 1, "vigente": 1,
             "texto": chr(10).join(b), "arquivo": arquivo, "linha": 0}
            for i, b in enumerate(blocos, 1)]


def _consolidar_meta(d):
    metas = d["metas"]
    def primeiro(campo):
        return next((m[campo] for m in metas if m.get(campo)), "")
    return {
        "id": d["id"], "tipo": d["tipo"], "numero": d["numero"], "ano": d["ano"],
        "titulo": d["titulo"],
        "ementa": primeiro("ementa"),
        "fonte_oficial": primeiro("fonte_oficial"),
        "data_download": primeiro("data_download"),
        "hash_origem": primeiro("hash_origem"), "hash_chave": primeiro("hash_chave"),
        "impressao": parser.impressao("\n".join(d["textos"])),
        "ultima_alteracao_conhecida": primeiro("ultima_alteracao_conhecida"),
        "compilado": 1 if any(m.get("compilado") for m in metas) else 0,
        "arquivos": json.dumps(d["arquivos"], ensure_ascii=False),
        "ingerido_em": datetime.datetime.now().isoformat(timespec="seconds"),
    }


def ingerir(con, normas=None):
    normas = normas or ler_tudo()[0]
    total = 0
    for d in normas.values():
        # a versão é numerada por NORMA, não por arquivo. O Decreto 83.080 tem dois arquivos com
        # os mesmos quatro artigos, e versionar por arquivo gerava dois ids iguais, que o banco
        # engolia em silêncio. Agora o segundo arquivo vira a v2 da mesma chave.
        parser.versionar(d["artigos"])
        total += banco.gravar_norma(con, _consolidar_meta(d), d["artigos"])
    return len(normas), total


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--conferir", action="store_true", help="relata sem gravar")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"corpus: {banco.CORPUS}")
    normas, desconhecidos = ler_tudo()
    arqs = sum(len(d["arquivos"]) for d in normas.values())
    arts = sum(len(d["artigos"]) for d in normas.values())
    print(f"{arqs} arquivos .md, {len(normas)} normas, {arts} versões de artigo")
    for nome, motivo in identidade.FORA.items():
        print(f"  fora da base: {nome}\n                {motivo}")
    if desconhecidos:
        print(f"  ATENÇÃO, fora da tabela de identidade, não ingeridos: {', '.join(desconhecidos)}")
    for nid, nota in identidade.CASOS_PREVISTOS.items():
        if nid in normas:
            print(f"  previsto: {nid} — {nota}")
    if args.conferir:
        for d in sorted(normas.values(), key=lambda x: x["id"]):
            m = _consolidar_meta(d)
            vig = sum(a["vigente"] for a in d["artigos"])
            print(f"  {d['id']:34s} {len(d['arquivos'])} arq  {vig:5d} vigentes / "
                  f"{len(d['artigos']):5d} versões  compilado={m['compilado']}  {m['data_download']}")
        return
    con = banco.abrir()
    n, t = ingerir(con, normas)
    print(f"gravado em {banco.DADOS / 'normas.db'}: {n} normas, {t} versões de artigo")


if __name__ == "__main__":
    main()
