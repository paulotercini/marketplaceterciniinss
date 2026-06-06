"""Bot diário de avisos por evento futuro no Microsoft To Do.

Detecta eventos com data nos próximos dias (perícia, DCB, prorrogação,
novo protocolo, avaliação social, audiência, exigência, prazos) e:

  1. Insere no body da tarefa uma linha "DD.MM.AAAA (BOT): <mensagem>"
     com o texto pronto para você enviar ao cliente
  2. Marca a tarefa como importance=high (sinalização para conferência)
  3. NÃO duplica — se já existe (BOT): para aquele evento, pula

Janelas de antecedência por categoria:
  - Perícia médica / avaliação social / audiência: 7 dias e 1 dia antes
  - DCB / cessação: 30 dias antes
  - Prorrogação: 15 dias antes
  - Novo protocolo: 7 dias antes
  - Exigência INSS: 5 dias antes
  - Prazo recursal: 5 dias antes
  - Atestado / procuração vence: 30 dias antes

Rodar: python3 bot_avisos.py [--dry-run]
"""
import sys, json, time, re, urllib.error, argparse
from datetime import datetime, timedelta, timezone
from collections import defaultdict
sys.path.insert(0, ".")
from graph_client import _req as _req_raw

TZ_BR = timezone(timedelta(hours=-3))
HOJE = datetime.now(TZ_BR).date()


def _req(method, path, body=None, retries=4):
    delays = [2, 4, 8, 16]
    for i in range(retries):
        try:
            return _req_raw(method, path, body=body) if body is not None else _req_raw(method, path)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503, 504) and i < retries - 1:
                time.sleep(delays[i]); continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if i < retries - 1: time.sleep(delays[i]); continue
            raise


def list_lists():
    return _req("GET", "/me/todo/lists")["value"]


def list_all_tasks(list_id):
    out, url = [], f"/me/todo/lists/{list_id}/tasks?$top=100"
    while url:
        page = _req("GET", url)
        out.extend(page.get("value", []))
        url = page.get("@odata.nextLink")
    return out


def primeiro_nome(titulo):
    """Extrai primeiro nome do título 'Nome Sobrenome #CPF'."""
    t = re.sub(r"#\s*\d+", "", titulo).strip(" -🤖")
    partes = t.split()
    return partes[0] if partes else "Cliente"


# Categorias com padrões (regex) e templates de mensagem
CATEGORIAS = [
    {
        "nome": "PERICIA_MEDICA",
        "padroes": [r"per[ií]cia(?!\s+social)", r"avalia[cç][aã]o m[eé]dica"],
        "modo": "ANTES",
        "antecedencias": [7],  # somente 7 dias antes; vespera eh feita manualmente
        "exclui": [r"per[ií]cia social", r"avalia[cç][aã]o social"],
        "msg_template": (
            "LEMBRETE DE PERÍCIA\n\n"
            "{nome}, sua perícia médica do INSS está marcada para {data_evento} "
            "às {hora}, {local}.\n\n"
            "Leve documento de identidade com foto, carteira de trabalho, os exames, "
            "laudos e receitas originais, e as caixas dos medicamentos que você usa.\n\n"
            "Chegue 15 minutos antes para a triagem.\n\n"
            "O comparecimento é obrigatório. Se não puder ir nesse dia, avise nosso "
            "escritório imediatamente para reagendarmos.\n\n"
            "Qualquer dúvida, estamos à disposição."
        ),
    },
    {
        "nome": "POS_PROTOCOLO_JUDICIAL",
        "padroes": [
            r"inicial distribu[ií]da", r"processo distribu[ií]do",
            r"a[cç][aã]o distribu[ií]da", r"distribu[ií] a a[cç][aã]o",
            r"distribu[ií] a inicial", r"protocol(?:ei|ada) a inicial",
            r"protocolada a a[cç][aã]o", r"a[cç][aã]o protocolada",
            r"distribu[ií]da a a[cç][aã]o",
        ],
        "modo": "DEPOIS",
        "antecedencias": [0, 1, 2, 3],
        "lista_inclui": ["judicial"],  # somente lista 👪 Judicial
        "msg_template": (
            "PROCESSO DISTRIBUÍDO\n\n"
            "{nome}, informamos que seu processo judicial foi devidamente "
            "protocolado em {data_evento}.\n\n"
            "Caso seja necessário apresentar novos documentos ou qualquer outra "
            "providência, entraremos em contato.\n\n"
            "Pedimos especial atenção ao golpe do falso advogado. O nosso contato "
            "por WhatsApp é somente por esse número de celular. Não solicitamos "
            "PIX/transferência para liberação de valores e não agendamos audiência "
            "por vídeo ou telefone.\n\n"
            "Qualquer dúvida, estamos à disposição."
        ),
    },
    {
        "nome": "POS_PROTOCOLO_INSS",
        "padroes": [
            r"protocol(?:ei|ado|ada)\s+(?:o\s+|a\s+)?benef[ií]cio",
            r"protocol(?:ei|ado|ada)\s+(?:o\s+)?requerimento(?!\s+(?:de\s+)?extin)",
            r"protocol(?:ei|ado|ada)\s+(?:o\s+)?pedido\s+(?:de\s+)?(?:aux[ií]lio|aposentad|bpc|loas|pens[aã]o|salário|benef[ií]cio)",
            r"benef[ií]cio (?:solicitado|protocolado|requerido)",
            r"requerimento protocolado",
            r"solicitei o benef[ií]cio", r"requeri o benef[ií]cio",
            r"deu entrada (?:o|no) (?:pedido|requerimento|benef[ií]cio)",
        ],
        "exclui": [r"extin[cç][aã]o", r"recurso", r"emenda", r"contestação", r"contestacao"],
        "modo": "DEPOIS",
        "antecedencias": [0, 1, 2, 3],
        "lista_exclui": ["judicial"],  # NAO na lista Judicial
        "msg_template": (
            "PROTOCOLO REALIZADO\n\n"
            "{nome}, informamos que seu pedido de benefício foi devidamente "
            "protocolado no INSS em {data_evento}.\n\n"
            "Caso seja necessário apresentar novos documentos ou qualquer outra "
            "providência, entraremos em contato.\n\n"
            "Caso receba ligação ou mensagem em nome do INSS, confirme conosco "
            "antes de fornecer informações.\n\n"
            "Qualquer dúvida, estamos à disposição."
        ),
    },
]

RE_DATA = re.compile(r"(\d{2})/(\d{2})/(\d{4})")
# Cabeçalho de entrada do escritório: "DD.MM.AAAA (P/A/D/I/M):" no início da linha
RE_ENTRADA = re.compile(
    r"^(\d{2})\.(\d{2})\.(\d{4})\s*\(([PADIM]+)\):(.+?)(?=\n\d{2}\.\d{2}\.\d{4}\s*\([PADIM]+\):|\Z)",
    re.MULTILINE | re.DOTALL,
)
RE_HORA = re.compile(r"(?:as|às)\s*(\d{1,2})[:h](\d{2})?", re.I)
RE_LOCAL = re.compile(r"(?:no\s+)?INSS\s+(?:de\s+)?([A-Z][A-Za-zÀ-ÿ\s]+?)(?:[.,;]|$)", re.I)
RE_BOT_PREFIX = re.compile(r"^\d{2}\.\d{2}\.\d{4}\s*\(BOT[^)]*\):", re.M)


def extrair_hora(ctx):
    m = RE_HORA.search(ctx)
    if not m: return ""
    hh, mm = m.group(1), m.group(2) or "00"
    return f"{int(hh):02d}:{mm}"


def extrair_local(ctx):
    m = RE_LOCAL.search(ctx)
    if not m: return "[local da perícia]"
    nome = re.split(r"\s{2,}|[,.]", m.group(1).strip())[0].strip()
    if not nome: return "[local da perícia]"
    # As pericias da regiao do escritorio sao no estado de SP
    return f"no INSS de {nome}-SP"


def classificar(ctx_low, full_low, lista_nome, modo_alvo=None):
    lista_low = lista_nome.lower()
    for cat in CATEGORIAS:
        if modo_alvo and cat.get("modo", "ANTES") != modo_alvo: continue
        if any(re.search(p, ctx_low) for p in cat.get("exclui", [])): continue
        if "lista_inclui" in cat:
            if not any(s in lista_low for s in cat["lista_inclui"]): continue
        if "lista_exclui" in cat:
            if any(s in lista_low for s in cat["lista_exclui"]): continue
        if any(re.search(p, ctx_low) for p in cat["padroes"]):
            return cat
    return None


def detectar_eventos(task, lista_nome):
    """Retorna lista [(categoria, data_evento, ctx)] de eventos nesta tarefa.

    Considera eventos:
      - FUTUROS (proximos 90 dias) para categorias modo='ANTES'
      - PASSADOS (ultimos 30 dias) para categorias modo='DEPOIS'
    """
    titulo = task.get("title", "") or ""
    body = (task.get("body", {}) or {}).get("content", "") or ""
    full = titulo + "\n" + body
    full_low = full.lower()
    eventos = []
    vistos = set()

    # (1) EVENTOS FUTUROS (modo=ANTES): datas em formato DD/MM/AAAA no texto
    for m in RE_DATA.finditer(full):
        try:
            d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
        except Exception:
            continue
        delta = (d - HOJE).days
        if delta < 0 or delta > 90: continue
        ctx = full[max(0, m.start() - 150): m.end() + 50]
        ctx_low = ctx.lower()
        cat = classificar(ctx_low, full_low, lista_nome, modo_alvo="ANTES")
        if not cat: continue
        key = (cat["nome"], d.isoformat())
        if key in vistos: continue
        vistos.add(key)
        eventos.append((cat, d, ctx))

    # (2) EVENTOS PASSADOS (modo=DEPOIS): cabecalho de entrada do escritorio
    #     "DD.MM.AAAA (P/A/D/I/M): conteudo da entrada"
    #     A data eh a data da entrada; ctx eh o CONTEUDO da entrada apenas.
    for m in RE_ENTRADA.finditer(body):  # so no body, nao no titulo
        try:
            d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
        except Exception:
            continue
        delta = (d - HOJE).days
        if delta < -30 or delta > 0: continue
        conteudo_entrada = m.group(5).strip()
        ctx_low = conteudo_entrada.lower()
        cat = classificar(ctx_low, full_low, lista_nome, modo_alvo="DEPOIS")
        if not cat: continue
        key = (cat["nome"], d.isoformat())
        if key in vistos: continue
        vistos.add(key)
        eventos.append((cat, d, conteudo_entrada))
    return eventos


def janela_e_msg(cat, dias_ate):
    """Retorna (template, tipo) onde tipo é 'VESP' ou 'AVISO', ou (None, None)."""
    modo = cat.get("modo", "ANTES")
    if modo == "DEPOIS":
        if dias_ate > 0: return None, None
        dias_passados = -dias_ate
        max_ant = max(cat["antecedencias"])
        if 0 <= dias_passados <= max_ant:
            return cat["msg_template"], "AVISO"
        return None, None
    # modo ANTES
    antecedencias = cat["antecedencias"]
    if dias_ate <= 1 and 1 in antecedencias and "msg_vespera" in cat:
        return cat["msg_vespera"], "VESP"
    max_ant = max(antecedencias)
    if 0 <= dias_ate <= max_ant:
        return cat["msg_template"], "AVISO"
    return None, None


def montar_linha(nome, cat, data_evento, ctx):
    """Monta a linha (BOT): pronta para anexar no body. Retorna (linha, tipo) ou (None, None)."""
    dias_ate = (data_evento - HOJE).days
    template, tipo = janela_e_msg(cat, dias_ate)
    if template is None: return None, None
    hora = extrair_hora(ctx)
    local = extrair_local(ctx)
    msg = template.format(
        nome=nome.split()[0] if nome else "Cliente",
        data_evento=data_evento.strftime("%d/%m/%Y"),
        hora=hora or "[hora]",
        local=local,
    )
    hoje_str = HOJE.strftime("%d.%m.%Y")
    tag = f"({cat['nome']}-{tipo}-{data_evento.strftime('%d%m')})"
    # Marcador [/BOT] no fim para que bot_limpar possa cortar com segurança
    return f"{hoje_str} (BOT) {tag}:\n{msg}\n[/BOT]", tipo


def ja_avisado(body, cat_nome, tipo, data_evento):
    """Verifica se já existe uma linha (BOT) para essa categoria+tipo+data."""
    tag = f"({cat_nome}-{tipo}-{data_evento.strftime('%d%m')})"
    return tag in body


def patch_task(list_id, task_id, novo_body):
    return _req("PATCH", f"/me/todo/lists/{list_id}/tasks/{task_id}",
                body={"body": {"content": novo_body, "contentType": "text"},
                      "importance": "high"})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem alterar.")
    args = parser.parse_args()

    listas = list_lists()
    n_proc = n_avisos = 0
    relatorio = []

    for lst in listas:
        tasks = list_all_tasks(lst["id"])
        for t in tasks:
            if t.get("status") == "completed": continue
            n_proc += 1
            eventos = detectar_eventos(t, lst["displayName"])
            if not eventos: continue
            body = (t.get("body", {}) or {}).get("content", "") or ""
            titulo = t.get("title", "") or ""
            nome = primeiro_nome(titulo)
            novas_linhas = []
            for cat, data_evento, ctx in eventos:
                linha, tipo = montar_linha(nome, cat, data_evento, ctx)
                if linha is None: continue
                if ja_avisado(body, cat["nome"], tipo, data_evento): continue
                novas_linhas.append((cat["nome"], data_evento, linha))
            if not novas_linhas: continue
            # Prepend ao body
            adicao = "\n".join(l[2] for l in novas_linhas)
            novo_body = adicao + "\n\n" + body
            n_avisos += len(novas_linhas)
            relatorio.append({
                "tarefa": titulo[:60],
                "lista": lst["displayName"],
                "novos_avisos": [{"cat": l[0], "data": l[1].isoformat()} for l in novas_linhas],
            })
            if args.dry_run:
                print(f"[DRY] {titulo[:55]}")
                for _, _, l in novas_linhas:
                    print(f"  → {l[:140]}")
            else:
                patch_task(lst["id"], t["id"], novo_body)
                print(f"✔ {titulo[:55]} — {len(novas_linhas)} aviso(s)")

    print(f"\n--- RESUMO ---")
    print(f"Tarefas varridas: {n_proc}")
    print(f"Avisos gerados:   {n_avisos}")
    print(f"Modo: {'DRY-RUN (não escreveu)' if args.dry_run else 'APLICADO'}")
    print(f"Data: {HOJE.strftime('%d/%m/%Y')}")


if __name__ == "__main__":
    main()
