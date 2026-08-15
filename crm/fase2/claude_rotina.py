"""Fase 2 — rotina diária do Claude (sugestões com aprovação humana).

Roda uma vez por dia (workflow crm-claude.yml). Duas etapas:

1. DETECÇÕES (sem custo de API, determinísticas):
   - andamento recente na fase INSS mencionando exigência -> sugere marcar
     exigência com o prazo legal de 30 dias;
   - caso ativo com prazo em até 7 dias e sem andamento na última semana ->
     alerta de prazo;
   - perícia/audiência nos próximos 7 dias -> mensagem de lembrete pronta
     (modelo preenchido) para copiar/enviar.

2. ANÁLISE DO CLAUDE (uma chamada, Opus 5): recebe os casos sinalizados com o
   histórico recente e devolve, por caso, o próximo passo sugerido e, quando
   couber, um rascunho de mensagem ao cliente — mais um resumo do dia.

Tudo vira linha na tabela `sugestoes` (status=pendente). NADA é aplicado sem
um colaborador aceitar na visão 🤖 Claude do app. Ids determinísticos (UUID5)
impedem sugestões repetidas em dias seguidos.

Env: SUPABASE_URL, SUPABASE_SERVICE_KEY e (opcional) ANTHROPIC_API_KEY —
sem a chave da Anthropic, roda só a etapa 1.
"""
import datetime, json, os, pathlib, re, sys, unicodedata, uuid

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from escrever_todo import _rest

NS = uuid.UUID("7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f")
MODELO_CLAUDE = "claude-opus-5"
MAX_CASOS_ANALISE = 25
JANELA_DETECCAO_DIAS = 3

RE_EXIGENCIA = re.compile(r"exig[êe]ncia", re.I)
RE_EXIG_RESOLVIDA = re.compile(r"cumprid|atendid|encerrad|resolvid|protocolad[ao] o cumprimento", re.I)


def hoje():
    return datetime.date.today()


def uid(*partes):
    return str(uuid.uuid5(NS, "|".join(str(p) for p in partes)))


def _sem_acento(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()


def eh_abertura_de_exigencia(texto):
    """Andamento que ABRE exigência (não o cumprimento dela)."""
    return bool(RE_EXIGENCIA.search(texto or "")) and not RE_EXIG_RESOLVIDA.search(texto or "")


def prazo_legal(data_iso, dias=30):
    d = datetime.date.fromisoformat(data_iso[:10]) + datetime.timedelta(days=dias)
    return d.isoformat()


def preencher(texto, nome=None, data=None, hora=None, local=None, prazo=None):
    fmt = lambda iso: f"{iso[8:10]}.{iso[5:7]}.{iso[0:4]}" if iso else ""
    mapa = {
        "{nome}": nome or "", "{primeiro_nome}": (nome or "").split(" ")[0],
        "{data}": fmt(data), "{hora}": hora or "",
        "{local}": local or "(local a confirmar)", "{prazo}": fmt(prazo),
    }
    for k, v in mapa.items():
        texto = texto.replace(k, v)
    return texto


# ── etapa 1: detecções determinísticas ────────────────────────────────────

def detectar(g, p):        # g: GET rest, p: contexto carregado
    sugestoes = []
    corte = (hoje() - datetime.timedelta(days=JANELA_DETECCAO_DIAS)).isoformat()

    # exigências novas em andamentos recentes de casos INSS sem exigência marcada
    recentes = g(f"/rest/v1/andamentos?criado_em=gte.{corte}"
                 "&select=caso_id,texto,criado_em&order=criado_em.desc") or []
    vistos = set()
    for a in recentes:
        caso = p["casos"].get(a["caso_id"])
        if (not caso or caso["fase"] != "inss" or caso.get("exigencia_prazo")
                or a["caso_id"] in vistos or not eh_abertura_de_exigencia(a["texto"])):
            continue
        vistos.add(a["caso_id"])
        prazo = prazo_legal(a["criado_em"])
        cli = p["clientes"].get(caso["cliente_id"], {})
        sugestoes.append({
            "id": uid("exig", caso["id"], a["criado_em"][:10]),
            "caso_id": caso["id"], "tipo": "exigencia",
            "titulo": f"Marcar exigência — {cli.get('nome', '?')}",
            "texto": f"O andamento de {a['criado_em'][:10]} menciona exigência do INSS: "
                     f"“{a['texto'][:200]}”. Aceitar marca o caso em exigência "
                     f"com o prazo legal de 30 dias ({prazo}).",
            "dados": {"exigencia_prazo": prazo,
                      "exigencia_descricao": a["texto"][:300]},
        })

    # prazos em 7 dias sem movimentação na última semana
    em7 = (hoje() + datetime.timedelta(days=7)).isoformat()
    semana = (hoje() - datetime.timedelta(days=7)).isoformat()
    ultimos = {}
    for a in g("/rest/v1/andamentos?select=caso_id,criado_em&order=criado_em.desc&limit=4000") or []:
        ultimos.setdefault(a["caso_id"], a["criado_em"][:10])
    for caso in p["casos"].values():
        if (caso["fase"] == "encerrado" or not caso.get("prazo")
                or not (hoje().isoformat() <= caso["prazo"] <= em7)):
            continue
        if ultimos.get(caso["id"], "0") >= semana:
            continue
        cli = p["clientes"].get(caso["cliente_id"], {})
        sugestoes.append({
            "id": uid("prazo", caso["id"], caso["prazo"]),
            "caso_id": caso["id"], "tipo": "prazo",
            "titulo": f"Prazo {caso['prazo'][8:10]}.{caso['prazo'][5:7]} sem movimentação — {cli.get('nome', '?')}",
            "texto": "O prazo vence em menos de 7 dias e não há andamento na última semana. "
                     "Vale conferir se a providência já está encaminhada.",
            "dados": {},
        })

    # perícias/audiências nos próximos 7 dias -> lembrete pronto
    eventos = g(f"/rest/v1/eventos?status=eq.agendada&data_hora=gte.{hoje()}"
                f"&data_hora=lte.{em7}T23:59:59&select=*") or []
    for e in eventos:
        caso = p["casos"].get(e["caso_id"])
        cli = caso and p["clientes"].get(caso["cliente_id"])
        if not cli:
            continue
        ctx = "audiencia" if "audi" in _sem_acento(e["tipo"]).lower() else "pericia"
        modelo = p["modelos"].get(ctx) or next(iter(p["modelos"].values()), None)
        if not modelo:
            continue
        msg = preencher(modelo, nome=cli["nome"], data=e["data_hora"][:10],
                        hora=e["data_hora"][11:16], local=e.get("local"))
        sugestoes.append({
            "id": uid("pericia", e["id"]),
            "caso_id": e["caso_id"], "tipo": "pericia",
            "titulo": f"{e['tipo']} em {e['data_hora'][8:10]}.{e['data_hora'][5:7]} — avisar {cli['nome']}",
            "texto": "Aceitar copia a mensagem de lembrete pronta:\n\n" + msg,
            "dados": {"mensagem": msg},
        })

    return sugestoes


# ── etapa 2: análise do Claude (uma chamada) ──────────────────────────────

ESQUEMA = {
    "type": "object",
    "properties": {
        "resumo_do_dia": {"type": "string"},
        "casos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "caso_id": {"type": "string"},
                    "proximo_passo": {"type": "string"},
                    "mensagem_cliente": {"type": ["string", "null"]},
                },
                "required": ["caso_id", "proximo_passo", "mensagem_cliente"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["resumo_do_dia", "casos"],
    "additionalProperties": False,
}

INSTRUCOES = """Você é o Claude, colaborador (inicial C) do escritório previdenciário \
Paulo R. Tercini Filho, em Franca/SP. A equipe: Paulo (advogado titular), Amanda, \
Marcos, André e Ingrid. Você recebe casos que o sistema sinalizou (prazo próximo, \
exigência do INSS, perícia marcada) com o histórico recente de cada um.

Para cada caso, proponha o próximo passo concreto, em uma ou duas frases, como um \
colega experiente faria — direto, específico, citando o que o histórico mostra. \
Quando fizer sentido avisar o segurado, redija também uma mensagem curta de WhatsApp \
em tom cordial e simples (o cliente é leigo), assinada "Escritório Paulo R. Tercini \
Filho"; caso contrário, deixe mensagem_cliente nulo. No resumo_do_dia, liste em poucas \
linhas o que merece atenção primeiro e por quê. Responda em português."""


def analisar_com_claude(g, p, flagrados):
    import anthropic

    contexto = []
    for s in flagrados[:MAX_CASOS_ANALISE]:
        caso = p["casos"].get(s["caso_id"])
        if not caso:
            continue
        cli = p["clientes"].get(caso["cliente_id"], {})
        ands = g(f"/rest/v1/andamentos?caso_id=eq.{caso['id']}"
                 "&select=criado_em,texto&order=criado_em.desc&limit=5") or []
        contexto.append({
            "caso_id": caso["id"],
            "cliente": cli.get("nome"),
            "beneficio": caso.get("beneficio"),
            "fase": caso["fase"],
            "prazo": caso.get("prazo"),
            "sinalizado_por": s["tipo"],
            "historico_recente": [
                {"data": a["criado_em"][:10], "texto": a["texto"][:400]} for a in ands
            ],
        })
    if not contexto:
        return []

    client = anthropic.Anthropic()
    resposta = client.beta.messages.create(
        model=MODELO_CLAUDE,
        max_tokens=8000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",   # se o classificador recusar, tenta o modelo reserva
        system=INSTRUCOES,
        output_config={"format": {"type": "json_schema", "schema": ESQUEMA}},
        messages=[{
            "role": "user",
            "content": "Data de hoje: " + hoje().isoformat()
                       + "\nCasos sinalizados:\n" + json.dumps(contexto, ensure_ascii=False),
        }],
    )
    if resposta.stop_reason == "refusal":
        print("  análise recusada pelos classificadores — seguindo só com as detecções")
        return []
    dados = json.loads(next(b.text for b in resposta.content if b.type == "text"))

    out = []
    for c in dados.get("casos", []):
        if c["caso_id"] not in p["casos"]:
            continue
        cli = p["clientes"].get(p["casos"][c["caso_id"]]["cliente_id"], {})
        extra = {}
        texto = c["proximo_passo"]
        if c.get("mensagem_cliente"):
            extra["mensagem"] = c["mensagem_cliente"]
            texto += "\n\nMensagem sugerida ao cliente (aceitar copia):\n" + c["mensagem_cliente"]
        out.append({
            "id": uid("passo", c["caso_id"], hoje().isoformat()),
            "caso_id": c["caso_id"], "tipo": "proximo_passo",
            "titulo": f"Próximo passo — {cli.get('nome', '?')}",
            "texto": texto, "dados": extra,
        })
    if dados.get("resumo_do_dia"):
        out.append({
            "id": uid("resumo", hoje().isoformat()),
            "caso_id": None, "tipo": "proximo_passo",
            "titulo": f"Resumo do dia {hoje().strftime('%d.%m.%Y')}",
            "texto": dados["resumo_do_dia"], "dados": {},
        })
    return out


# ── principal ─────────────────────────────────────────────────────────────

def main():
    if not os.environ.get("SUPABASE_URL") or not os.environ.get("SUPABASE_SERVICE_KEY"):
        sys.exit("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY.")
    g = lambda caminho: _rest("GET", caminho)

    p = {
        "casos": {k["id"]: k for k in g("/rest/v1/casos?select=id,cliente_id,fase,prazo,beneficio,exigencia_prazo") or []},
        "clientes": {c["id"]: c for c in g("/rest/v1/clientes?select=id,nome,telefone") or []},
        "modelos": {m["contexto"]: m["texto"] for m in g("/rest/v1/modelos_mensagem?select=contexto,texto") or []},
    }

    sugestoes = detectar(g, p)
    print(f"detecções: {len(sugestoes)} sugestão(ões)")

    if os.environ.get("ANTHROPIC_API_KEY"):
        analises = analisar_com_claude(g, p, sugestoes)
        print(f"análise do Claude: {len(analises)} sugestão(ões)")
        sugestoes += analises
    else:
        print("ANTHROPIC_API_KEY ausente — pulando a análise do Claude (só detecções).")

    if not sugestoes:
        print("nada para sugerir hoje.")
        return
    for i in range(0, len(sugestoes), 100):
        _rest("POST", "/rest/v1/sugestoes?on_conflict=id",
              sugestoes[i:i + 100],
              prefer="resolution=ignore-duplicates,return=minimal")
    print(f"{len(sugestoes)} sugestão(ões) gravadas — visíveis na visão 🤖 Claude do app.")


if __name__ == "__main__":
    main()
