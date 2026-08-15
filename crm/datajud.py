"""Andamento oficial dos processos (API pública DataJud/CNJ) -> ficha do caso.

O CNJ mantém em api-publica.datajud.cnj.jus.br uma base pública com os
metadados e TODOS os movimentos oficiais de cada processo do país. Este
script pega os processos judiciais dos casos, consulta o tribunal certo
(deduzido do próprio número CNJ) e grava em casos.datajud um resumo:

    {"processo": "0000001-14.2015.4.03.9999", "tribunal": "TRF3",
     "grau": "G2", "classe": "Apelação / Remessa Necessária",
     "orgao": "GAB. 37 - DES.FED. NELSON PORFIRIO",
     "ajuizado_em": "2015-01-05",
     "ultimo": {"data": "2026-04-07", "nome": "Conclusão",
                "complemento": "para decisão",
                "claro": "Está concluso — aguardando decisão do relator."},
     "recentes": [...], "outras": [{"grau": "G1", ...}],
     "consultado_em": "2026-08-03"}

Diferente do painel do TRF3 (que só tem a fila de julgamento do 2º grau),
aqui entra QUALQUER processo judicial — 1º grau, JEF, Turma Recursal e
Justiça Estadual — com o movimento oficial mais recente. É o que permite ao
colaborador responder "onde está meu processo?" sem abrir o PJe.

Roda no workflow consultas-publicas.yml. Exige SUPABASE_URL e
SUPABASE_SERVICE_KEY; CA_BUNDLE opcional para o certificado do proxy.
"""
import datetime, json, os, re, ssl, sys, time, urllib.error, urllib.request

API = "https://api-publica.datajud.cnj.jus.br/api_publica_{alias}/_search"
# chave pública de consulta, divulgada pelo próprio CNJ na documentação da API
CHAVE = os.environ.get("DATAJUD_API_KEY",
                       "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==")

RE_CNJ = re.compile(r"(?<!\d)(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})(?!\d)")

# J=8 (Justiça Estadual): código do tribunal -> sigla da UF
UF_ESTADUAL = {
    "01": "ac", "02": "al", "03": "ap", "04": "am", "05": "ba", "06": "ce",
    "07": "df", "08": "es", "09": "go", "10": "ma", "11": "mt", "12": "ms",
    "13": "mg", "14": "pa", "15": "pb", "16": "pr", "17": "pe", "18": "pi",
    "19": "rj", "20": "rn", "21": "rs", "22": "ro", "23": "rr", "24": "sc",
    "25": "se", "26": "sp", "27": "to",
}

# Tradução dos movimentos que mais aparecem nos nossos processos (códigos
# conferidos numa amostra real de processos previdenciários do TRF3).
# Movimento sem tradução aqui aparece com o nome oficial mesmo.
CLARO = {
    26: "O processo foi distribuído ao relator.",
    36: "O processo foi redistribuído a outro relator.",
    51: "Está concluso — aguardando decisão do julgador.",
    85: "Foi juntada uma petição aos autos.",
    92: "Houve publicação oficial no processo.",
    1061: "A decisão foi disponibilizada no Diário da Justiça Eletrônico.",
    123: "O processo foi remetido a outro setor/instância.",
    132: "O processo foi recebido no setor de destino.",
    981: "O processo foi recebido no setor de destino.",
    982: "O processo foi remetido a outro setor/instância.",
    848: "TRANSITOU EM JULGADO — não cabe mais recurso.",
    22: "Baixa definitiva: o processo foi encerrado e arquivado.",
    246: "Arquivamento definitivo.",
    219: "Pedido julgado PROCEDENTE.",
    220: "Pedido julgado IMPROCEDENTE.",
    218: "Pedido julgado PARCIALMENTE PROCEDENTE.",
    237: "Recurso PROVIDO.",
    238: "Recurso PARCIALMENTE PROVIDO.",
    239: "Recurso NÃO PROVIDO.",
    12200: "Julgamento do mérito.",
    12266: "Decisão confirmada pelo tribunal.",
    12065: "Processo suspenso/sobrestado (aguardando decisão de outro caso).",
    12066: "A suspensão foi levantada — o processo voltou a andar.",
    11010: "Despacho de mero expediente (andamento burocrático).",
    11022: "Julgamento convertido em diligência.",
    12265: "Documento expedido/certificado nos autos.",
}


# Marcos que mudam a vida do cliente (e do escritório): o dinheiro. Códigos
# conferidos numa amostra real de execuções previdenciárias do TRF3.
MARCOS = {
    848: ("transito", "Trânsito em julgado — não cabe mais recurso."),
    12457: ("requisitorio", "Requisitório expedido (precatório/RPV) — "
                            "o pagamento foi requisitado."),
    12548: ("alvara", "Alvará de levantamento expedido — "
                      "o dinheiro já pode ser sacado."),
    1049: ("pago", "Pagamento integral do débito."),
}


# Quais desses movimentos são DECISÃO (o que o cliente chama de "resultado"):
# aparecem destacados na ficha e alimentam a "última decisão". O texto de
# cada um vem de CLARO — aqui só os códigos, para não repetir a tradução.
DECISOES = {12200, 237, 238, 239, 219, 218, 220, 12185, 12252, 12266,
            11373, 11022}
MAX_MOVIMENTOS = 25          # por instância: dá o histórico sem inchar a ficha


def marcos(movs):
    """Movimentos -> marcos financeiros com a data de CADA um (o mais recente).

    {"requisitorio": {"data": "2026-05-12", "nome": "Expedição de
      precatório/rpv", "claro": "..."}, "transito": {...}}
    """
    achados = {}
    for m in sorted(movs or [], key=lambda x: x.get("dataHora") or ""):
        alvo = MARCOS.get(m.get("codigo"))
        if not alvo:
            continue
        chave, claro = alvo
        achados[chave] = {"data": _dia(m.get("dataHora")),
                          "nome": m.get("nome"), "claro": claro}
    return achados


def cnj(texto):
    """Extrai um nº CNJ de um texto -> (20 dígitos, formatado, alias do tribunal).

    O alias sai do próprio número: 4.03 -> trf3, 8.26 -> tjsp. Devolve None
    se não houver número ou se for de um ramo que não consultamos.
    """
    m = RE_CNJ.search(texto or "")
    if not m:
        return None
    n, dv, ano, j, trib, org = m.groups()
    if j == "4" and trib in ("01", "02", "03", "04", "05", "06"):
        alias = f"trf{int(trib)}"
    elif j == "8" and trib in UF_ESTADUAL:
        alias = f"tj{UF_ESTADUAL[trib]}"
    else:
        return None            # trabalhista, eleitoral, militar: fora do escopo
    return (f"{n}{dv}{ano}{j}{trib}{org}",
            f"{n}-{dv}.{ano}.{j}.{trib}.{org}", alias)


def _ctx():
    return ssl.create_default_context(cafile=os.environ.get("CA_BUNDLE") or None)


def _buscar(alias, corpo):
    # timeout CURTO de propósito. Com 120s e quatro tentativas, uma manhã em
    # que a API do DataJud pendura (aceita a conexão e não responde) custava
    # ~8 minutos POR LOTE — o job inteiro morria no teto de 30 minutos como
    # "cancelled", sem consultar nada, e o CNJ ficava dias sem atualizar
    # (04, 06 e 10.08). Quando a API está de pé ela responde em segundos;
    # quando pendura, esperar mais não ajuda — melhor falhar logo, pular o
    # tribunal e tentar de novo na rodada da tarde.
    req = urllib.request.Request(
        API.format(alias=alias), data=json.dumps(corpo).encode(),
        headers={"Authorization": f"APIKey {CHAVE}", "Content-Type": "application/json"})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25, context=_ctx()) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:          # tribunal sem índice público
                return {"hits": {"hits": []}}
            if e.code not in (429, 500, 502, 503, 504) or i == 2:
                raise
            time.sleep(2 ** (i + 1))
        except Exception:
            if i == 2:
                raise
            time.sleep(2 ** (i + 1))


def _dia(txt):
    """'2026-04-07T13:14:31.000Z' ou '20150105000000' -> '2026-04-07'."""
    if not txt:
        return None
    if "-" in txt:
        return txt[:10]
    return f"{txt[0:4]}-{txt[4:6]}-{txt[6:8]}" if len(txt) >= 8 else None


def _complemento(mov):
    return "; ".join(c.get("nome", "") for c in mov.get("complementosTabelados", [])
                     if c.get("nome"))


def rotulo_instancia(grau, classe):
    """Como o colaborador chama aquela instância na conversa do dia a dia."""
    c = (classe or "").lower()
    if "cumprimento" in c or "execução" in c or "execucao" in c:
        return "Cumprimento de sentença"
    return {"G1": "1º grau", "G2": "2º grau", "JE": "Juizado Especial",
            "TR": "Turma Recursal", "TRU": "Turma de Uniformização"}.get(grau, grau or "—")


def _movimento(m):
    cod = m.get("codigo")
    return {"data": _dia(m.get("dataHora")), "nome": m.get("nome"), "codigo": cod,
            "complemento": _complemento(m) or None,
            "claro": CLARO.get(cod),
            "decisao": cod in DECISOES}


def resumir(fonte):
    """Um registro do DataJud -> dicionário enxuto (sem os 110 movimentos)."""
    movs = sorted(fonte.get("movimentos", []), key=lambda m: m.get("dataHora") or "")
    recentes = []
    for m in movs[-6:][::-1]:
        recentes.append({"data": _dia(m.get("dataHora")), "nome": m.get("nome"),
                         "complemento": _complemento(m) or None})
    ultimo = None
    if movs:
        u = movs[-1]
        ultimo = {"data": _dia(u.get("dataHora")), "nome": u.get("nome"),
                  "codigo": u.get("codigo"), "complemento": _complemento(u) or None,
                  "claro": CLARO.get(u.get("codigo"))}
    # histórico da instância, do mais novo para o mais velho, e a última
    # decisão de mérito (o "resultado" que o cliente pergunta)
    historico = [_movimento(m) for m in movs[-MAX_MOVIMENTOS:][::-1]]
    decisao = next((_movimento(m) for m in movs[::-1] if m.get("codigo") in DECISOES),
                   None)
    return {
        "rotulo": rotulo_instancia(fonte.get("grau"),
                                   (fonte.get("classe") or {}).get("nome")),
        "historico": historico,
        "decisao": decisao,
        "total_movimentos": len(movs),
        "tribunal": fonte.get("tribunal"),
        "grau": fonte.get("grau"),
        "sistema": (fonte.get("sistema") or {}).get("nome"),
        "classe": (fonte.get("classe") or {}).get("nome"),
        "orgao": (fonte.get("orgaoJulgador") or {}).get("nome"),
        "ajuizado_em": _dia(fonte.get("dataAjuizamento")),
        "ultimo": ultimo,
        "recentes": recentes,
        "marcos": marcos(movs),
    }


def _peso(r):
    """Para escolher onde o processo 'está' hoje: o movimento mais recente."""
    return ((r.get("ultimo") or {}).get("data") or "", r.get("grau") or "")


def consultar(alias, numeros):
    """Consulta um lote de números num tribunal -> {numero20: resumo}.

    Um mesmo número existe em mais de um grau (1º e 2º). Fica valendo o
    registro com o movimento mais recente; os demais viram 'outras'.
    """
    d = _buscar(alias, {"query": {"terms": {"numeroProcesso": list(numeros)}},
                        "size": max(20, len(numeros) * 4)})
    por_numero = {}
    for h in d.get("hits", {}).get("hits", []):
        f = h.get("_source", {})
        n = f.get("numeroProcesso")
        if not n:
            continue
        por_numero.setdefault(n, []).append(resumir(f))
    saida = {}
    for n, rs in por_numero.items():
        rs.sort(key=_peso, reverse=True)
        principal, outras = dict(rs[0]), rs[1:]
        principal["outras"] = [{"grau": o.get("grau"), "orgao": o.get("orgao"),
                                "classe": o.get("classe"),
                                "ultimo_data": (o.get("ultimo") or {}).get("data"),
                                "ultimo_nome": (o.get("ultimo") or {}).get("nome")}
                               for o in outras]
        # cada instância separada, a mais movimentada primeiro: é isso que a
        # ficha usa para montar o sub-menu 1º grau / 2º grau / cumprimento
        principal["instancias"] = [
            {"rotulo": r.get("rotulo"), "grau": r.get("grau"), "orgao": r.get("orgao"),
             "classe": r.get("classe"), "ajuizado_em": r.get("ajuizado_em"),
             "sistema": r.get("sistema"), "ultimo": r.get("ultimo"),
             "decisao": r.get("decisao"), "historico": r.get("historico"),
             "total_movimentos": r.get("total_movimentos")}
            for r in rs]
        saida[n] = principal
    return saida


def titulo(nome):
    """'GAB. 37 - DES.FED. NELSON PORFIRIO' -> 'Gab. 37 - Des.Fed. Nelson Porfirio'.

    Os nomes vêm em CAIXA ALTA do CNJ; numa mensagem ao cliente isso parece
    grito. Só mexe quando está tudo em maiúsculas.
    """
    if not nome or nome != nome.upper():
        return nome
    miudas = {"de", "da", "do", "das", "dos", "e", "com", "em"}
    saida = []
    for p in nome.split(" "):
        b = p.lower()
        saida.append(b if b in miudas and saida else
                     ".".join(x[:1].upper() + x[1:] for x in b.split(".")))
    return " ".join(saida)


def frase_cliente(t):
    """Texto pronto para o cliente com o andamento oficial."""
    u = t.get("ultimo") or {}
    if not u.get("data"):
        return ""
    dbr = lambda i: f"{i[8:10]}/{i[5:7]}/{i[0:4]}" if i else ""
    mov = u.get("nome") or "movimentação"
    comp = f" ({u['complemento']})" if u.get("complemento") else ""
    claro = f" {u['claro']}" if u.get("claro") else ""
    onde = f" O processo está em {titulo(t['orgao'])}." if t.get("orgao") else ""
    return (f"O processo nº {t['processo']} teve como último andamento oficial "
            f"“{mov}{comp}”, em {dbr(u['data'])}.{claro}{onde} "
            f"Fonte: base pública do CNJ (DataJud), consulta de "
            f"{dbr(t.get('consultado_em'))}.")


def frase_marco(t):
    """Mensagem ao cliente sobre o marco financeiro mais adiantado do processo."""
    mc = t.get("marcos") or {}
    dbr = lambda i: f"{i[8:10]}/{i[5:7]}/{i[0:4]}" if i else ""
    for chave, texto in (
            ("pago", "o pagamento do débito foi registrado nos autos"),
            ("alvara", "foi expedido o alvará de levantamento — o valor já pode "
                       "ser sacado"),
            ("requisitorio", "foi expedido o requisitório de pagamento "
                             "(precatório/RPV)"),
            ("transito", "o processo transitou em julgado, ou seja, não cabe "
                         "mais recurso")):
        m = mc.get(chave)
        if m and m.get("data"):
            return (f"No processo nº {t['processo']}, {texto}, em "
                    f"{dbr(m['data'])} (movimento oficial “{m.get('nome')}”). "
                    f"Fonte: base pública do CNJ (DataJud), consulta de "
                    f"{dbr(t.get('consultado_em'))}.")
    return ""


def _rest(metodo, caminho, corpo=None, prefer=None):
    url = os.environ["SUPABASE_URL"].rstrip("/") + caminho
    chave = os.environ["SUPABASE_SERVICE_KEY"]
    req = urllib.request.Request(
        url, data=json.dumps(corpo).encode() if corpo is not None else None,
        method=metodo,
        headers={"apikey": chave, "Authorization": f"Bearer {chave}",
                 "Content-Type": "application/json",
                 **({"Prefer": prefer} if prefer else {})})
    for i in range(4):          # rede oscila; gravação não pode se perder
        try:
            with urllib.request.urlopen(req, timeout=60, context=_ctx()) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503, 504) or i == 3:
                raise
            time.sleep(2 ** (i + 1))
        except Exception:
            if i == 3:
                raise
            time.sleep(2 ** (i + 1))


def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    hoje = datetime.date.today().isoformat()

    # UM CASO PODE TER VÁRIOS PROCESSOS. O caso nasce de um protocolo ou NB e
    # ramifica: mandado de segurança, ação pelo rito comum, recurso. Todos
    # entram na consulta — inclusive os marcados "não é nosso" (processo do
    # cliente com outro advogado), que é justamente o que o escritório quer
    # acompanhar sem trabalhar. O que fica de fora é o desmarcado da vista.
    try:
        casos = _rest("GET", "/rest/v1/casos?fase=neq.encerrado"
                             "&or=(processo.not.is.null,processos.neq.[])"
                             "&select=id,processo,processos,datajud_multi") or []
    except Exception:      # banco sem a coluna `processos` (schema não rodado)
        casos = _rest("GET", "/rest/v1/casos?processo=not.is.null"
                             "&fase=neq.encerrado&select=id,processo") or []
    porTribunal = {}                    # alias -> {numero20: (formatado, [caso_ids])}
    principal = {}                      # caso_id -> numero20 do processo principal
    for k in casos:
        nums = []
        for p in (k.get("processos") or []):
            if isinstance(p, str):
                nums.append(p)
            elif isinstance(p, dict) and p.get("acompanhar") is not False:
                nums.append(p.get("numero"))
        if k.get("processo"):
            nums.insert(0, k["processo"])
        vistos = set()
        for n in nums:
            achado = cnj(n or "")
            if not achado or achado[0] in vistos:
                continue
            vistos.add(achado[0])
            n20, fmt, alias = achado
            if k.get("processo") and cnj(k["processo"]) and cnj(k["processo"])[0] == n20:
                principal[k["id"]] = n20
            d = porTribunal.setdefault(alias, {})
            d.setdefault(n20, (fmt, []))[1].append(k["id"])
    if not porTribunal:
        print("nenhum caso com processo judicial reconhecido.")
        return

    achados = encontrados = ausentes = 0
    falhas = []
    # o mapa por caso começa com o que JÁ está no banco: o teto de tempo pode
    # cortar a rodada no meio, e reescrever só com o consultado agora apagaria
    # o andamento dos processos que ficaram para a próxima
    estado = {k["id"]: dict(k.get("datajud_multi") or {}) for k in casos}
    sem_coluna = [False]
    # teto próprio, abaixo do teto do job (30 min): estourar o do job vira
    # "cancelled" sem diagnóstico; parar aqui grava o que já foi consultado
    # (o PATCH é por tribunal) e ainda avisa quem ficou para a próxima.
    inicio = time.monotonic()
    TETO_SEGUNDOS = 20 * 60
    ordenados = sorted(porTribunal.items())
    for pos, (alias, mapa) in enumerate(ordenados):
        if time.monotonic() - inicio > TETO_SEGUNDOS:
            restantes = [a for a, _ in ordenados[pos:]]
            print(f"::notice::tempo esgotado — ficaram para a próxima rodada: "
                  f"{', '.join(restantes)}")
            falhas.extend(restantes)
            break
        numeros = sorted(mapa)
        print(f"{alias}: {len(numeros)} processo(s)")
        res = {}
        try:
            for i in range(0, len(numeros), 50):
                res.update(consultar(alias, numeros[i:i + 50]))
        except Exception as e:
            # um tribunal fora do ar não pode derrubar a consulta dos outros:
            # os processos dele ficam com o que já estava gravado
            print(f"  {alias} indisponível agora ({type(e).__name__}); segue")
            falhas.append(alias)
            continue
        tocados = set()
        for n20, (fmt, ids) in mapa.items():
            t = res.get(n20)
            if t:
                t = {"processo": fmt, **t, "consultado_em": hoje}
                encontrados += 1
            else:
                t = {"processo": fmt, "ultimo": None, "consultado_em": hoje}
                ausentes += 1
            for cid in ids:
                estado.setdefault(cid, {})[n20] = t
                tocados.add(cid)
            achados += 1
        # UM PATCH POR CASO, com o mapa inteiro: o caso pode ter processos em
        # tribunais diferentes, e gravar processo a processo fazia o último
        # apagar o anterior. `datajud` continua sendo o do principal, que é o
        # que a ficha e as mensagens ao cliente já leem.
        for cid in sorted(tocados):
            corpo = {"datajud_multi": estado[cid]}
            prin = principal.get(cid)
            if prin and prin in estado[cid]:
                corpo["datajud"] = estado[cid][prin]
            try:
                _rest("PATCH", f"/rest/v1/casos?id=eq.{cid}", corpo, prefer="return=minimal")
            except Exception:
                # banco sem a coluna nova: grava só o principal, como antes
                if "datajud" in corpo:
                    _rest("PATCH", f"/rest/v1/casos?id=eq.{cid}",
                          {"datajud": corpo["datajud"]}, prefer="return=minimal")
                    sem_coluna[0] = True
    print(f"processos consultados: {achados} · com andamento: {encontrados} "
          f"· sem registro público: {ausentes}")
    if sem_coluna[0]:
        print("::warning::O banco ainda não tem `casos.datajud_multi`: só o processo "
              "principal de cada caso foi gravado. Rode crm/fase2/schema_por_em_dia.sql.")
    if falhas:
        print(f"::notice::tribunais que não responderam desta vez: "
              f"{', '.join(falhas)} — serão tentados na próxima consulta.")


if __name__ == "__main__":
    main()
