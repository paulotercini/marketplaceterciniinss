"""Le o ANDAMENTO de um processo pela API Publica do DataJud (CNJ), sem depender do
PJe nem do eproc, que nao abrem desta rede.

Serve para conferir, na triagem e antes de peticionar, se o ato que interessa ja
ocorreu (homologacao, transito em julgado, expedicao de RPV, sentenca, arquivamento).
E fonte OFICIAL do CNJ, entao o que vem daqui pode ser afirmado. O que NAO vier, nao
pode ser suposto, a base tem atraso de atualizacao e nem todo movimento e nominado.

Uso:
  python3 processo_andamento.py 5001909-66.2025.4.03.6314
  python3 processo_andamento.py 50019096620254036314 --tribunal trf3 --limite 40

O tribunal e deduzido do proprio numero CNJ (campos J e TR) quando nao informado.

LIMITE HONESTO, a ausencia de um movimento na lista NAO prova que ele nao ocorreu.
Movimento generico ("Expedida/certificada", "Ato ordinatorio") nao diz o que foi
expedido. Achado forte aqui vira indicio, e o registro no parecer deve dizer que a
confirmacao definitiva depende de abrir os autos.
"""
import json
import re
import sys
import urllib.request

# Chave publica de leitura, divulgada pelo proprio CNJ na documentacao da API Publica.
APIKEY = ("APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==")
BASE = "https://api-publica.datajud.cnj.jus.br/api_publica_{}/_search"

# Justica Federal (J=4), TR = regiao. Justica Estadual (J=8), TR = codigo do estado.
_JF = {"01": "trf1", "02": "trf2", "03": "trf3", "04": "trf4", "05": "trf5", "06": "trf6"}
_JE = {"26": "tjsp", "19": "tjrj", "13": "tjmg", "21": "tjrs", "16": "tjpr"}


def _so_digitos(num):
    return re.sub(r"\D", "", num)


def deduz_tribunal(num):
    """Deduz o alias do tribunal pelo numero CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)."""
    d = _so_digitos(num)
    if len(d) != 20:
        return None
    j, tr = d[13], d[14:16]
    if j == "4":
        return _JF.get(tr)
    if j == "8":
        return _JE.get(tr)
    if j == "5":  # Justica do Trabalho
        return f"trt{int(tr)}"
    return None


def consulta(num, tribunal=None):
    d = _so_digitos(num)
    tribunal = tribunal or deduz_tribunal(d)
    if not tribunal:
        raise RuntimeError(
            f"Nao deduzi o tribunal de {num}. Passe --tribunal (ex.: trf3, tjsp).")
    body = json.dumps({"query": {"match": {"numeroProcesso": d}}}).encode()
    req = urllib.request.Request(
        BASE.format(tribunal), data=body, method="POST",
        headers={"Authorization": APIKEY, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return tribunal, json.loads(r.read())


def _data(v):
    """Normaliza a data, a API mistura ISO (2026-06-12T...) e compacto (20250812140000)."""
    if not v:
        return ""
    s = str(v)
    if "-" in s:
        return s[:10]
    d = re.sub(r"\D", "", s)
    return f"{d[0:4]}-{d[4:6]}-{d[6:8]}" if len(d) >= 8 else s


def relatorio(num, tribunal=None, limite=None):
    tribunal, dados = consulta(num, tribunal)
    hits = dados.get("hits", {}).get("hits", [])
    if not hits:
        return (f"Processo {num} nao encontrado na base do {tribunal.upper()}. "
                "Isso NAO prova que ele nao existe, confira o numero e o tribunal.")
    s = hits[0]["_source"]
    linhas = [
        f"Tribunal (base consultada): {tribunal.upper()}",
        f"Processo: {s.get('numeroProcesso')}",
        f"Classe: {(s.get('classe') or {}).get('nome')}",
        f"Orgao julgador: {(s.get('orgaoJulgador') or {}).get('nome')}",
        f"Ajuizamento: {_data(s.get('dataAjuizamento'))}",
        f"Ultima atualizacao da base: {_data(s.get('dataHoraUltimaAtualizacao'))}",
    ]
    assuntos = [a.get("nome") for a in (s.get("assuntos") or []) if a.get("nome")]
    if assuntos:
        linhas.append("Assuntos: " + "; ".join(assuntos))
    movs = sorted((s.get("movimentos") or []),
                  key=lambda m: m.get("dataHora", ""), reverse=True)
    linhas.append(f"\nMovimentos ({len(movs)}), do mais recente para o mais antigo:")
    for m in movs[:limite] if limite else movs:
        compl = "; ".join(
            f"{c.get('nome')}={c.get('descricao')}"
            for c in (m.get("complementosTabelados") or []) if c.get("descricao"))
        linhas.append(f"  {_data(m.get('dataHora'))}  {m.get('nome')}"
                      + (f"  [{compl}]" if compl else ""))
    linhas.append(
        "\nATENCAO, movimento generico nao diz o que foi expedido, e a base tem atraso. "
        "Ausencia de movimento e INDICIO, nao prova. Confirme nos autos antes de afirmar.")
    return "\n".join(linhas)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 processo_andamento.py <numero CNJ> "
              "[--tribunal trf3] [--limite 40]")
        sys.exit(1)
    numero = sys.argv[1]
    trib = lim = None
    resto = sys.argv[2:]
    i = 0
    while i < len(resto):
        if resto[i] == "--tribunal":
            trib = resto[i + 1].lower(); i += 2
        elif resto[i] == "--limite":
            lim = int(resto[i + 1]); i += 2
        else:
            i += 1
    print(relatorio(numero, trib, lim))
