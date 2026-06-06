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

# E-mail de destino do relatorio diario
EMAIL_DESTINO = "paulotercini@hotmail.com"


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
            "MENSAGEM AUTOMÁTICA - LEMBRETE DE PERÍCIA\n\n"
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
            "MENSAGEM AUTOMÁTICA - PROCESSO DISTRIBUÍDO\n\n"
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
            "MENSAGEM AUTOMÁTICA - PROTOCOLO REALIZADO\n\n"
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
# Primeiro cabeçalho de andamento datado no body
RE_FIRST_DATE = re.compile(r"^\d{2}\.\d{2}\.\d{4}\s*\([PADIM]+\):", re.MULTILINE)
RE_HORA = re.compile(r"(?:as|às)\s*(\d{1,2})[:h](\d{2})?", re.I)
RE_LOCAL = re.compile(r"(?:no\s+)?INSS\s+(?:de\s+)?([A-Z][A-Za-zÀ-ÿ\s]+?)(?:[.,;]|$)", re.I)
# Marcador minimalista de log no body. Usado para idempotência.
RE_BOT_LOG = re.compile(r"\[BOT-LOG\]\s*[A-Z_]+-[A-Z]+-\d{4}\s+em\s+\d{2}\.\d{2}\.\d{4}")
# Telefone brasileiro em vários formatos
RE_TELEFONE = re.compile(
    r"(?<!\d)"
    r"(?:\+?55\s*)?"
    r"\(?(1[1-9]|2[1-9]|3[1-9]|4[1-9]|5[1-9]|6[1-9]|7[1-9]|8[1-9]|9[1-9])\)?"  # DDD valido
    r"[\s\-\.‐-―]?"
    r"(9)?"
    r"[\s\-\.‐-―]?"
    r"(\d{4})"
    r"[\s\-\.‐-―]?"
    r"(\d{4})"
    r"(?!\d)"
)


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


def montar_linha(nome_completo, cat, data_evento, ctx):
    """Monta tupla (tag, mensagem, tipo) ou (None, None, None) se fora da janela."""
    dias_ate = (data_evento - HOJE).days
    template, tipo = janela_e_msg(cat, dias_ate)
    if template is None: return None, None, None
    hora = extrair_hora(ctx)
    local = extrair_local(ctx)
    primeiro = nome_completo.split()[0] if nome_completo else "Cliente"
    msg = template.format(
        nome=primeiro,
        data_evento=data_evento.strftime("%d/%m/%Y"),
        hora=hora or "[hora]",
        local=local,
    )
    tag = f"{cat['nome']}-{tipo}-{data_evento.strftime('%d%m')}"
    return tag, msg, tipo


def ja_avisado(body, cat_nome, tipo, data_evento):
    """Verifica se ja existe marcador [BOT-LOG] para essa categoria+tipo+data."""
    tag = f"{cat_nome}-{tipo}-{data_evento.strftime('%d%m')}"
    return f"[BOT-LOG] {tag}" in body


def formatar_telefone(grupos):
    """grupos = (ddd, '9' ou '', primeiro4, segundo4) -> '(DD) X9999-9999'."""
    ddd, _9, p4, s4 = grupos
    nove = _9 or ""
    if nove:
        return f"({ddd}) {nove}{p4}-{s4}"
    return f"({ddd}) {p4}-{s4}"


# Palavras que indicam que numeros proximos NAO sao telefone (NB, CPF, etc)
RE_CONTEXTO_RUIM = re.compile(
    r"\b(?:nb|cpf|nit|pis|rg|cnpj|protocolo|prot|requerimento|processo|matr[ií]cula|nº|n[°.]|nb\(s\))\b",
    re.I,
)


def extrair_telefones_da_tarefa(task):
    """Extrai telefones unicos do body+title, descartando NB/CPF/protocolo etc."""
    full = (task.get("title", "") or "") + "\n" + ((task.get("body", {}) or {}).get("content", "") or "")
    achados = []
    vistos = set()
    for m in RE_TELEFONE.finditer(full):
        # Verifica os 30 chars antes do match: se contem palavra-chave ruim, descartar
        antes = full[max(0, m.start() - 30): m.start()]
        if RE_CONTEXTO_RUIM.search(antes): continue
        key = (m.group(1), m.group(2) or "", m.group(3), m.group(4))
        if key in vistos: continue
        vistos.add(key)
        achados.append(formatar_telefone(key))
    return achados[:3]  # no maximo 3


def formatar_telefone_outlook(s):
    """Recebe telefone bruto do Outlook (ex: +5516988180367 ou 16988180367) e formata."""
    digits = re.sub(r"\D", "", s or "")
    if digits.startswith("55") and len(digits) >= 12:
        digits = digits[2:]
    if len(digits) == 11:  # DDD + 9XXXX-XXXX
        return f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    if len(digits) == 10:  # DDD + XXXX-XXXX
        return f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    return s  # nao deu para formatar, retorna como veio


# Cache de contatos do Outlook (preenchido apenas se necessario)
_CONTATOS_INDEX = None


def carregar_contatos_index():
    """Indexa contatos do Outlook por nome (lowercased) -> lista de telefones formatados."""
    global _CONTATOS_INDEX
    if _CONTATOS_INDEX is not None: return _CONTATOS_INDEX
    _CONTATOS_INDEX = {}
    try:
        url = "/me/contacts?$top=100&$select=displayName,mobilePhone,businessPhones,homePhones"
        while url:
            page = _req("GET", url)
            for c in page.get("value", []):
                nome = (c.get("displayName") or "").strip().lower()
                if not nome: continue
                phones = []
                if c.get("mobilePhone"): phones.append(formatar_telefone_outlook(c["mobilePhone"]))
                phones += [formatar_telefone_outlook(p) for p in (c.get("businessPhones", []) or [])]
                phones += [formatar_telefone_outlook(p) for p in (c.get("homePhones", []) or [])]
                if phones:
                    _CONTATOS_INDEX.setdefault(nome, []).extend(phones)
            url = page.get("@odata.nextLink")
    except Exception as e:
        print(f"AVISO: nao consegui carregar contatos do Outlook: {e}")
    return _CONTATOS_INDEX


def extrair_nome_cliente(titulo):
    """Pega o nome completo do cliente do titulo (sem #CPF e sem emoji 🤖)."""
    t = re.sub(r"#\s*\d+", "", titulo or "").strip(" -🤖")
    return t


def buscar_telefone_contatos(nome_cliente, contatos_idx):
    """Procura telefones em contatos do Outlook pelo nome do cliente."""
    if not contatos_idx or not nome_cliente: return []
    nome_low = nome_cliente.strip().lower()
    # match exato primeiro
    if nome_low in contatos_idx:
        return contatos_idx[nome_low][:3]
    # match parcial (nome do cliente contido no nome do contato)
    achados = []
    for contato_nome, phones in contatos_idx.items():
        if nome_low in contato_nome or contato_nome in nome_low:
            achados.extend(phones)
            if len(achados) >= 3: break
    return achados[:3]


def obter_telefones(task, contatos_idx):
    """Estrategia em camadas: body+title primeiro, depois Outlook Contatos."""
    p = extrair_telefones_da_tarefa(task)
    if p: return p, "tarefa"
    nome = extrair_nome_cliente(task.get("title", ""))
    p = buscar_telefone_contatos(nome, contatos_idx)
    if p: return p, "outlook"
    return ["[telefone não localizado]"], "ausente"


def inserir_marcador_no_body(body, tags):
    """Adiciona linhas [BOT-LOG] CAT-TIPO-DDMM em DD.MM.AAAA no FIM do body.

    tags: lista de strings 'CAT_NOME-TIPO-DDMM' a registrar.
    """
    hoje_str = HOJE.strftime("%d.%m.%Y")
    novas = [f"[BOT-LOG] {tag} em {hoje_str}" for tag in tags]
    if body.strip():
        return body.rstrip() + "\n\n" + "\n".join(novas)
    return "\n".join(novas)


def patch_body(list_id, task_id, novo_body):
    return _req("PATCH", f"/me/todo/lists/{list_id}/tasks/{task_id}",
                body={"body": {"content": novo_body, "contentType": "text"}})


def enviar_email(subject, body_text):
    """Envia email via Microsoft Graph /me/sendMail (escopo Mail.Send).

    Quando o envio eh de si para si (self-to-self), o Outlook auto-arquiva
    o email na pasta 'Archive' em vez de entrega-lo na Caixa de Entrada.
    Apos enviar, tentamos LOCALIZAR o email arquivado pelo assunto e
    MOVE-LO para a Caixa de Entrada. Tambem marca importance=high.
    """
    payload = {
        "message": {
            "subject": subject,
            "importance": "high",
            "body": {"contentType": "Text", "content": body_text},
            "toRecipients": [{"emailAddress": {"address": EMAIL_DESTINO}}],
        },
        "saveToSentItems": True,
    }
    _req("POST", "/me/sendMail", body=payload)
    # Espera ~5s para o Graph processar e indexar
    time.sleep(5)
    _mover_para_inbox(subject)


def _mover_para_inbox(subject):
    """Localiza email arquivado pelo assunto (nao lido) e move para Inbox."""
    try:
        # Pega o id da Inbox
        folders = _req("GET", "/me/mailFolders?$top=50")
        inbox_id = None
        for f in folders.get("value", []):
            if f.get("displayName") in ("Caixa de Entrada", "Inbox"):
                inbox_id = f["id"]; break
        if not inbox_id:
            print("AVISO: Caixa de Entrada nao localizada — email pode estar em Archive")
            return
        # Busca o email pelo assunto exato
        import urllib.parse as _up
        q = _up.quote(f'"{subject}"')
        r = _req("GET", f"/me/messages?$search={q}&$top=5&$select=id,subject,parentFolderId,isRead")
        for m in r.get("value", []):
            if m.get("subject") != subject: continue
            if m.get("isRead"): continue  # pula a copia de Itens Enviados
            if m.get("parentFolderId") == inbox_id: continue  # ja esta lah
            _req("POST", f"/me/messages/{m['id']}/move", body={"destinationId": inbox_id})
            print(f"✔ Email movido para Caixa de Entrada")
            return
        print("AVISO: email enviado nao localizado para mover (pode estar em Inbox ja)")
    except Exception as e:
        print(f"AVISO: falha ao mover email para Inbox: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Mostra o que faria sem enviar email nem alterar tarefas.")
    args = parser.parse_args()

    contatos_idx = carregar_contatos_index()
    listas = list_lists()
    n_proc = 0
    avisos_email = []  # lista de dicts: {cliente, lista, telefones, fonte_tel, categoria, mensagem}
    patches = []      # lista de (list_id, task_id, novo_body) para aplicar

    for lst in listas:
        tasks = list_all_tasks(lst["id"])
        for t in tasks:
            if t.get("status") == "completed": continue
            n_proc += 1
            eventos = detectar_eventos(t, lst["displayName"])
            if not eventos: continue
            body = (t.get("body", {}) or {}).get("content", "") or ""
            nome_completo = extrair_nome_cliente(t.get("title", ""))
            novas_tags = []
            for cat, data_evento, ctx in eventos:
                tag, msg, tipo = montar_linha(nome_completo, cat, data_evento, ctx)
                if tag is None: continue
                if ja_avisado(body, cat["nome"], tipo, data_evento): continue
                telefones, fonte = obter_telefones(t, contatos_idx)
                avisos_email.append({
                    "cliente": nome_completo,
                    "lista": lst["displayName"],
                    "telefones": telefones,
                    "fonte_tel": fonte,
                    "categoria": cat["nome"],
                    "mensagem": msg,
                    "data_evento": data_evento.strftime("%d/%m/%Y"),
                })
                novas_tags.append(tag)
            if not novas_tags: continue
            novo_body = inserir_marcador_no_body(body, novas_tags)
            patches.append((lst["id"], t["id"], novo_body, t.get("title", "")))

    # Resumo
    print(f"Tarefas varridas: {n_proc}")
    print(f"Novos avisos a enviar: {len(avisos_email)}")
    if not avisos_email:
        print("Nada a fazer hoje.")
        return

    # Monta corpo do email
    email_subj = f"Bot de avisos — {len(avisos_email)} mensagens para envio ({HOJE.strftime('%d/%m/%Y')})"
    linhas = [
        f"Bom dia, Dr. Paulo.",
        "",
        f"Hoje há {len(avisos_email)} mensagem(ns) automática(s) para envio aos clientes.",
        "Confira abaixo cada cliente, telefone(s) e mensagem pronta para encaminhamento via WhatsApp:",
        "",
    ]
    for i, a in enumerate(avisos_email, 1):
        linhas.append("=" * 70)
        linhas.append(f"{i}. {a['cliente']}")
        linhas.append(f"   Lista: {a['lista']}")
        linhas.append(f"   Telefone(s): {' / '.join(a['telefones'])}  [fonte: {a['fonte_tel']}]")
        linhas.append(f"   Categoria: {a['categoria']}  |  Data do evento: {a['data_evento']}")
        linhas.append("")
        linhas.append(a["mensagem"])
        linhas.append("")
    linhas.append("=" * 70)
    linhas.append("")
    linhas.append("Marcadores [BOT-LOG] foram adicionados ao final do body de cada tarefa para evitar reenvio.")
    linhas.append("Bot rodando diariamente as 03h Brasil via GitHub Actions.")
    email_body = "\n".join(linhas)

    if args.dry_run:
        print("\n--- DRY-RUN: PREVIEW DO EMAIL ---")
        print(f"Para: {EMAIL_DESTINO}")
        print(f"Assunto: {email_subj}")
        print()
        print(email_body[:2000])
        if len(email_body) > 2000: print(f"\n... [+{len(email_body)-2000} chars]")
        print(f"\n--- DRY-RUN: {len(patches)} tarefas seriam marcadas com [BOT-LOG] ---")
        for lid, tid, nb, ttl in patches[:5]:
            print(f"  {ttl[:55]}")
        if len(patches) > 5: print(f"  ... +{len(patches)-5}")
        return

    # Envia email
    enviar_email(email_subj, email_body)
    print(f"\n✔ Email enviado para {EMAIL_DESTINO}")

    # Marca tarefas
    for lid, tid, nb, ttl in patches:
        patch_body(lid, tid, nb)
        print(f"✔ Marcador adicionado: {ttl[:55]}")


if __name__ == "__main__":
    main()
