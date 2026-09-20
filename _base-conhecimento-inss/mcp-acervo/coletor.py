"""Varre as pastas de origem, extrai, anonimiza e indexa a producao do escritorio.

    uv run coletor.py              indexa o que mudou
    uv run coletor.py --nomes      refaz a lista negra de nomes, a partir das pastas de cliente
    uv run coletor.py --auditar    varre a base inteira e acusa vazamento de dado pessoal
    uv run coletor.py --resultados aplica o resultados.csv sobre as pecas ja indexadas
    uv run coletor.py --forcar     reindexa tudo, ignorando o hash

Nao ha coleta de rede. A fonte e o disco, e a lista de raizes vive em fontes.txt, uma
por linha, no formato  origem|caminho|filtro_opcional , onde o filtro e uma REGEX que
precisa casar com o NOME DO ARQUIVO. A primeira raiz que reivindicar um arquivo fica
com ele, entao a mais especifica vem antes. Duas origens sao especiais, "protocolado",
que so aceita PDF e exige a assinatura do escritorio no texto, e "nomes", que nunca e
indexada e serve so para colher a lista negra da anonimizacao.

Indexa NO LUGAR, sem copiar nada, para que a reingestao pegue a edicao direto e para
nao multiplicar copia de peca de cliente pelo disco.
"""

import collections
import csv
import datetime
import hashlib
import pathlib
import re
import sys

import banco
import extrator
import parser

FONTES_PADRAO = """\
# origem|caminho|filtro opcional no caminho relativo
modelo_ouro|G:\\Meu Drive\\Acervo de Modelos\\Modelos Ouro 2.0
# Peticoes Ouro fica de fora desde 20/09/2026, e versao anterior superada pelo 2.0.
acervo|G:\\Meu Drive\\Acervo de Modelos
# As pastas Claude dos clientes sairam do escopo em 20/09/2026, por decisao do titular,
# porque guardam rascunho que em regra foi corrigido antes do protocolo.
vault|C:\\Users\\VAIO\\segundo-cerebro\\research\\modelos
exportado|C:\\Users\\VAIO\\acervo-escritorio\\fonte
# Peca PROTOCOLADA, que esta em PDF nas pastas de cliente e e a versao final. O terceiro
# campo e uma REGEX sobre o NOME DO ARQUIVO, e so entra o PDF cujo texto traz a
# assinatura do escritorio, o que descarta contestacao do INSS, sentenca e peca alheia.
protocolado|G:\\Meu Drive\\Processos|peti[cç]|inicial|recurso|contrarraz|embargo|apela|agravo|r[ée]plica|impugna|manifesta|alega[cç]|quesito|memorial|cumprimento|liminar|inominado|pedilef|mandado de seguran
# A raiz "nomes" NAO e indexada. Serve so para colher a lista negra da anonimizacao a
# partir do nome das pastas de cliente.
nomes|G:\\Meu Drive\\Processos
"""

# Duplicacao de sincronismo do Drive, 14 das 34 pastas de topo do Acervo tem gemea "(1)".
IGNORAR_PASTA = ("__pycache__", ".git", ".obsidian")
IGNORAR_ARQUIVO = ("desktop.ini", "thumbs.db")

# A peca PROTOCOLADA e reconhecida pela assinatura do escritorio no proprio texto, que
# e o que a separa da contestacao do INSS, da sentenca e da peca de outro advogado
# guardadas na mesma pasta. Medido em 20/09/2026, numa amostra de 60 PDFs com nome de
# peca, 43 eram do escritorio, 7 de terceiro e 10 sem camada de texto.
ASSINATURA = re.compile(r"331\.?110|TERCINI", re.I)
MIN_PALAVRAS_PECA = 150          # abaixo disso e digitalizacao sem camada de texto

# So a origem "protocolado" aceita PDF, e ela nao aceita mais nada.


def _pular(caminho):
    partes = caminho.parts
    if caminho.name.lower() in IGNORAR_ARQUIVO or caminho.name.startswith("~$"):
        return True
    return any(p in IGNORAR_PASTA or p.rstrip().endswith("(1)") for p in partes)


def fontes():
    """Le fontes.txt, criando o padrao na primeira rodada."""
    arq = banco.DADOS / "fontes.txt"
    if not arq.exists():
        arq.parent.mkdir(parents=True, exist_ok=True)
        arq.write_text(FONTES_PADRAO, encoding="utf-8")
        print(f"criado {arq}, confira as raizes antes de indexar", flush=True)
    saida = []
    for linha in arq.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#"):
            continue
        # maxsplit 2, porque o filtro e uma regex e costuma ter "|" de alternancia
        campos = (linha.split("|", 2) + ["", ""])[:3]
        saida.append((campos[0].strip(), pathlib.Path(campos[1].strip()), campos[2].strip()))
    return saida


MIN_OCORRENCIAS_COMUM = 3


def _palavras_comuns():
    """Palavras correntes do texto juridico, calibradas nos Modelos Ouro.

    Os Modelos Ouro nao tem dado de cliente, entao tudo que aparece em MINUSCULA neles
    e vocabulario do oficio, e nao nome. Sem esta calibracao a lista negra apagava
    31,5% dos trechos e comia verbo em quesito, porque sobrenome brasileiro coincide
    com palavra corrente. Medido em 20/09/2026.
    """
    conta = collections.Counter()
    for origem, raiz, _ in fontes():
        if origem != "modelo_ouro" or not raiz.exists():
            continue
        for c in raiz.rglob("*"):
            if c.is_file() and not _pular(c) and c.suffix.lower() in (".md", ".txt", ""):
                conta.update(re.findall(r"\b[a-zà-ü]{3,}\b",
                                        c.read_text(encoding="utf-8", errors="ignore")))
    return {parser._sem_acento(p) for p, n in conta.items() if n >= MIN_OCORRENCIAS_COMUM}


def colher_nomes():
    """Lista negra da anonimizacao, tirada do nome das pastas de cliente.

    E a verdade de campo ja disponivel no disco, e nunca entra em repositorio.
    Le SO o nivel de pasta que e de cliente. Descer mais traz nome de subpasta como
    "Documentos" e "Processo Administrativo", que envenena a lista.
    """
    brutos = set()
    for origem, raiz, _ in fontes():
        # A raiz "nomes" serve SO para colher a lista negra, e nunca e indexada. Ela
        # existe porque as pastas de cliente sairam do escopo em 20/09/2026, e sem
        # esta separacao a anonimizacao perderia a fonte dos nomes junto com elas.
        if origem != "nomes" or not raiz.exists():
            continue
        for letra in raiz.iterdir():          # Processos\<LETRA>\<Cliente #CPF>
            if not letra.is_dir():
                continue
            if letra.name.upper().startswith("_ARQUIVO"):   # _Arquivo\<LETRA>\<Cliente>
                for sub in (x for x in letra.iterdir() if x.is_dir()):
                    brutos.update(x.name for x in sub.iterdir() if x.is_dir())
            else:
                brutos.update(x.name for x in letra.iterdir() if x.is_dir())
    tokens = sorted(parser.normalizar_nomes(brutos))
    comuns = sorted(_palavras_comuns())
    banco.DADOS.mkdir(parents=True, exist_ok=True)
    (banco.DADOS / "nomes-clientes.txt").write_text("\n".join(tokens), encoding="utf-8")
    (banco.DADOS / "palavras-comuns.txt").write_text("\n".join(comuns), encoding="utf-8")
    ambiguos = len(set(tokens) & set(comuns))
    print(f"{len(brutos)} pastas de cliente, {len(tokens)} tokens de nome, "
          f"{len(comuns)} palavras comuns, {ambiguos} ambiguos", flush=True)
    return set(tokens), set(comuns)


def nomes():
    """(lista negra de nomes, palavras comuns do oficio)."""
    a, b = banco.DADOS / "nomes-clientes.txt", banco.DADOS / "palavras-comuns.txt"
    if not (a.exists() and b.exists()):
        return colher_nomes()
    return (set(a.read_text(encoding="utf-8").split()),
            set(b.read_text(encoding="utf-8").split()))


def arquivos():
    """Todos os arquivos indexaveis, com a origem, sem repetir entre raizes."""
    vistos, saida = set(), []
    for origem, raiz, filtro in fontes():
        if not raiz.exists():
            print(f"  raiz ausente, pulando: {raiz}", flush=True)
            continue
        if origem == "nomes":          # raiz de anonimizacao, nunca de indexacao
            continue
        for c in raiz.rglob("*"):
            if not c.is_file() or _pular(c):
                continue
            ext = c.suffix.lower()
            if ext not in extrator.EXTENSOES:
                continue
            # A peca protocolada e PDF e so PDF. Sem esta trava, a raiz de Processos
            # devolvia tambem os .docx das pastas Claude, que sao rascunho e sairam do
            # escopo em 20/09/2026.
            if (ext == ".pdf") != (origem == "protocolado"):
                continue
            # O filtro corre sobre o NOME DO ARQUIVO, nunca sobre o caminho. Corrido no
            # caminho, uma pasta chamada "Recursos" arrastava para dentro todo PDF que
            # estivesse nela, inclusive documento recebido.
            if filtro and not re.search(filtro, c.name, re.I):
                continue
            rel = str(c.relative_to(raiz))
            chave = str(c).lower()
            if chave in vistos:
                continue
            vistos.add(chave)
            saida.append((origem, c, rel))
    return saida


def indexar(forcar=False):
    lista_nomes, comuns = nomes()
    con = banco.abrir()
    agora = datetime.datetime.now().isoformat(timespec="seconds")
    novas = atualizadas = puladas = falhas = repetidas = 0
    sem_texto = de_terceiro = 0
    vivos, por_conteudo = [], {}
    todos = arquivos()
    print(f"{len(todos)} arquivos candidatos", flush=True)
    for origem, caminho, rel in todos:
        peca_id = hashlib.sha256(str(caminho).lower().encode("utf-8")).hexdigest()[:32]
        try:
            blocos = extrator.blocos(caminho)
        except Exception as e:                       # arquivo corrompido ou formato torto
            print(f"  FALHA {rel} :: {type(e).__name__} {e}", flush=True)
            falhas += 1
            continue
        if origem == "protocolado":
            bruto = "\n".join(blocos)
            if len(bruto.split()) < MIN_PALAVRAS_PECA:
                sem_texto += 1                       # digitalizacao, exigiria OCR
                continue
            if not ASSINATURA.search(bruto):
                de_terceiro += 1                     # contestacao, sentenca, outro advogado
                continue
        conteudo = hashlib.sha256("\n".join(blocos).encode("utf-8")).hexdigest()
        # Deduplicacao por CONTEUDO, e nao so por caminho. O Drive tem as pastas gemeas
        # com sufixo "(1)" e copias inteiras de arvore, e sem isto a mesma peca entra
        # duas vezes e a busca devolve o dobro. Fica a primeira raiz, que e a mais
        # especifica pela ordem do fontes.txt. Versao revisada tem conteudo diferente,
        # hash diferente, e continua entrando.
        if conteudo in por_conteudo:
            repetidas += 1
            continue
        por_conteudo[conteudo] = rel
        vivos.append(peca_id)
        anterior = banco.hash_gravado(con, peca_id)
        if anterior == conteudo and not forcar:
            puladas += 1
            continue
        try:
            trechos = parser.trechos(blocos, lista_nomes, comuns)
        except parser.LayoutMudou as e:
            print(f"  SEM TRECHO {rel} :: {e}", flush=True)
            falhas += 1
            continue
        for t in trechos:
            t["citacoes"] = parser.citacoes(t["texto"])
        meta = parser.metadados(rel, origem)
        banco.gravar(con, {"id": peca_id, "caminho": str(caminho), "arquivo": caminho.name,
                           "hash": conteudo, "resultado": None, "trechos": len(trechos),
                           "indexado_em": agora, **meta}, trechos)
        if anterior:
            atualizadas += 1
        else:
            novas += 1
    sumidas = banco.esquecer(con, vivos)
    print(f"novas {novas}, atualizadas {atualizadas}, sem mudanca {puladas}, "
          f"repetidas {repetidas}, falhas {falhas}, removidas {sumidas}", flush=True)
    if sem_texto or de_terceiro:
        print(f"protocoladas descartadas, {de_terceiro} de terceiro pela ausencia da "
              f"assinatura e {sem_texto} sem camada de texto", flush=True)
    return con


def aplicar_resultados(con):
    arq = banco.DADOS / "resultados.csv"
    if not arq.exists():
        arq.write_text("arquivo,resultado\n", encoding="utf-8")
        print(f"criado {arq}. Preencha com  nome do arquivo,resultado  para as pecas "
              f"cujo desfecho importa.", flush=True)
        return
    with arq.open(encoding="utf-8", newline="") as f:
        pares = [(l["arquivo"], l["resultado"]) for l in csv.DictReader(f)
                 if l.get("arquivo")]
    print(f"{banco.aplicar_resultados(con, pares)} pecas com resultado anotado", flush=True)


def auditar(con):
    lista_nomes, comuns = nomes()
    vazou = banco.auditar(con, lista_nomes, comuns)
    if not vazou:
        total = con.execute("SELECT count(*) FROM trecho").fetchone()[0]
        print(f"AUDITORIA OK. {total} trechos varridos, zero vazamento. "
              f"{len(lista_nomes & comuns)} termos ambiguos seguem no residuo, "
              f"por serem ao mesmo tempo sobrenome e palavra do oficio.", flush=True)
        return 0
    print(f"AUDITORIA FALHOU. {len(vazou)} vazamentos:", flush=True)
    for v in vazou[:40]:
        print(f"  [{v['tipo']}] {v['achado']!r} em {v['arquivo']} "
              f"(trecho {v['trecho_id']})", flush=True)
    if len(vazou) > 40:
        print(f"  ... e mais {len(vazou) - 40}", flush=True)
    return 1


if __name__ == "__main__":
    args = sys.argv[1:]
    if "--nomes" in args:
        colher_nomes()
    elif "--auditar" in args:
        sys.exit(auditar(banco.abrir(leitura=True)))
    elif "--resultados" in args:
        aplicar_resultados(banco.abrir())
    else:
        conexao = indexar(forcar="--forcar" in args)
        aplicar_resultados(conexao)
        sys.exit(auditar(conexao))
