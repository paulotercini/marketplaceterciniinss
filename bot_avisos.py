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
        "antecedencias": [7, 1],
        "exclui": [r"per[ií]cia social", r"avalia[cç][aã]o social"],
        "msg_template": (
            "Olá {nome}, lembrete: sua perícia médica no INSS está agendada para "
            "{data_evento} às {hora}{local}. Leve todos os exames, atestados e "
            "relatórios médicos atualizados. Chegue 30 minutos antes. "
            "Qualquer dúvida, estou à disposição. — Dr. Paulo Tercini"
        ),
        "msg_vespera": (
            "{nome}, lembrete final: sua perícia médica é AMANHÃ ({data_evento}) "
            "às {hora}{local}. Não esqueça documento com foto, exames e relatórios. "
            "Chegue 30 min antes. — Dr. Paulo"
        ),
    },
    {
        "nome": "AVALIACAO_SOCIAL",
        "padroes": [r"avalia[cç][aã]o social", r"per[ií]cia social"],
        "antecedencias": [7, 1],
        "msg_template": (
            "Olá {nome}, sua avaliação social no INSS está agendada para {data_evento} "
            "às {hora}{local}. Leve documentos pessoais, comprovante de residência e "
            "exames recentes. — Dr. Paulo Tercini"
        ),
        "msg_vespera": (
            "{nome}, lembrete: avaliação social AMANHÃ ({data_evento}) às {hora}{local}. "
            "Chegue 30 min antes. — Dr. Paulo"
        ),
    },
    {
        "nome": "AUDIENCIA_JUDICIAL",
        "padroes": [r"audi[eê]ncia", r"sala virtual"],
        "antecedencias": [7, 1],
        "msg_template": (
            "Olá {nome}, sua audiência judicial está agendada para {data_evento} "
            "às {hora}. Combinaremos os últimos detalhes nesta semana. — Dr. Paulo Tercini"
        ),
        "msg_vespera": (
            "{nome}, lembrete: audiência AMANHÃ ({data_evento}) às {hora}. — Dr. Paulo"
        ),
    },
    {
        "nome": "DCB_CESSACAO",
        "padroes": [
            r"\bdcb\b", r"data de cessa[cç][aã]o", r"cessa[cç][aã]o em [\d/]+",
            r"cessa[rç][aá] em", r"cessar em", r"prorrogado at[eé] [\d/]+",
            r"prorrogado - cessa[cç][aã]o em",
            r"b[eê]nef[ií]cio concedido (?:de|por) [\d/]+ a [\d/]+",
            r"cessa[cç][aã]o do benef[ií]cio",
        ],
        "antecedencias": [30],
        "msg_template": (
            "Olá {nome}, seu benefício previdenciário será cessado em {data_evento}. "
            "Para evitar interrupção, precisamos protocolar pedido de prorrogação. "
            "Por favor, traga relatório médico atualizado nesta semana. — Dr. Paulo Tercini"
        ),
    },
    {
        "nome": "PRORROGACAO",
        "padroes": [r"pedir prorroga", r"solicitar prorroga", r"renova[cç][aã]o em"],
        "antecedencias": [15],
        "msg_template": (
            "Olá {nome}, está chegando o prazo para pedirmos prorrogação do seu benefício. "
            "Pode trazer relatório médico atualizado nesta semana? — Dr. Paulo Tercini"
        ),
    },
    {
        "nome": "NOVO_PROTOCOLO",
        "padroes": [
            r"solicitar o benef[ií]cio em", r"solicitar novo benef[ií]cio em",
            r"poder[aá] (?:ser )?solicitad", r"abr(?:e|irá) (?:a )?janela",
            r"solicitar benef[ií]cio a partir de",
        ],
        "antecedencias": [7],
        "msg_template": (
            "Olá {nome}, em {data_evento} abre a janela para solicitarmos seu novo benefício. "
            "Está tudo certo com os documentos médicos? Posso agendar um horário para "
            "revisarmos? — Dr. Paulo Tercini"
        ),
    },
    {
        "nome": "EXIGENCIA_INSS",
        "padroes": [r"exig[eê]ncia", r"cumprir exig", r"prazo (?:para|de) exig"],
        "antecedencias": [5, 1],
        "msg_template": (
            "Olá {nome}, há uma exigência do INSS no seu processo com prazo até {data_evento}. "
            "Por favor, providencie/entregue o documento até essa data. — Dr. Paulo Tercini"
        ),
        "msg_vespera": (
            "{nome}, ÚLTIMO DIA da exigência do INSS é AMANHÃ ({data_evento}). "
            "Confirma que conseguiu providenciar? — Dr. Paulo"
        ),
    },
    {
        "nome": "PRAZO_RECURSAL",
        "padroes": [r"prazo recursal", r"prazo para recurso", r"recorrer at[eé]"],
        "antecedencias": [5],
        "msg_template": (
            "Olá {nome}, o prazo para interpor recurso administrativo termina em "
            "{data_evento}. Estamos finalizando a peça. — Dr. Paulo Tercini"
        ),
    },
    {
        "nome": "ATESTADO_VENCE",
        "padroes": [r"atestado vence", r"atestado v[aá]lido at[eé]"],
        "antecedencias": [30],
        "msg_template": (
            "Olá {nome}, seu atestado médico que serve para o INSS vence em {data_evento}. "
            "Marque consulta com seu médico para renovar nesta semana. — Dr. Paulo Tercini"
        ),
    },
]

RE_DATA = re.compile(r"(\d{2})/(\d{2})/(\d{4})")
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
    if not m: return ""
    nome = re.split(r"\s{2,}|[,.]", m.group(1).strip())[0].strip()
    return f" no INSS de {nome}" if nome else ""


def classificar(ctx_low, full_low):
    for cat in CATEGORIAS:
        if any(re.search(p, ctx_low) for p in cat.get("exclui", [])): continue
        if any(re.search(p, ctx_low) for p in cat["padroes"]):
            return cat
    return None


def detectar_eventos(task):
    """Retorna lista [(categoria, data_evento, ctx)] de eventos futuros nesta tarefa."""
    titulo = task.get("title", "") or ""
    body = (task.get("body", {}) or {}).get("content", "") or ""
    full = titulo + "\n" + body
    full_low = full.lower()
    eventos = []
    vistos = set()  # evita contar a mesma data 2x
    for m in RE_DATA.finditer(full):
        try:
            d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1))).date()
        except Exception:
            continue
        delta = (d - HOJE).days
        if delta < 0 or delta > 90: continue
        ctx = full[max(0, m.start() - 150): m.end() + 50]
        ctx_low = ctx.lower()
        cat = classificar(ctx_low, full_low)
        if not cat: continue
        key = (cat["nome"], d.isoformat())
        if key in vistos: continue
        vistos.add(key)
        eventos.append((cat, d, ctx))
    return eventos


def janela_e_msg(cat, dias_ate):
    """Retorna (template, tipo) onde tipo é 'VESP' ou 'AVISO', ou (None, None)."""
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
    return f"{hoje_str} (BOT) {tag}: {msg}", tipo


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
            eventos = detectar_eventos(t)
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
