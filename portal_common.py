"""Primitivas compartilhadas pelos geradores do portal do cliente
(build_portal_listas.py e build_portal_escritorio.py).

Aqui vive tudo que os dois geradores precisam igual: parsing de CPF/DN das
tarefas do To Do, a quebra do corpo em blocos datados e a derivação da chave
de login hash(CPF|DN) — que TEM de bater bit a bit com docs/portal/app.js
(PBKDF2-SHA256 + SHA-256, 16 bytes hex, salt/iter de data/_meta.json).
"""
import re, hashlib, pathlib, datetime

DATA_DIR = pathlib.Path("docs/portal/data")
HOJE = datetime.date.today()


def digits(s):
    return re.sub(r"\D", "", s or "")


def dn_from_aniversario(items):
    """Item explicitamente rotulado 'Aniversário'/'nascimento': aceita qualquer
    ano plausivel (inclui menores de idade — casos BPC)."""
    for it in items:
        name = it.get("displayName", "")
        if re.search(r"anivers|nascime", name, re.I):
            m = re.search(r"\b(\d{2})[/.](\d{2})[/.](\d{4})\b", name)
            if m and 1900 <= int(m.group(3)) <= HOJE.year:
                return m.group(1) + m.group(2) + m.group(3)
    return None


def dn_from_items(items):
    """Extrai uma data de nascimento plausivel (1920-2012) de um checklist."""
    for it in items:
        m = re.search(r"\b(\d{2})[/.](\d{2})[/.](\d{4})\b", it.get("displayName", ""))
        if m and 1920 <= int(m.group(3)) <= 2012:
            return m.group(1) + m.group(2) + m.group(3)
    return None


def dn_from_body(body):
    m = re.search(r"\bDN[:\s]+(\d{2})[/.](\d{2})[/.](\d{4})\b", body or "", re.I)
    if m and 1920 <= int(m.group(3)) <= 2012:
        return m.group(1) + m.group(2) + m.group(3)
    return None


def cpf_from_task(title, items):
    for m in re.findall(r"(\d[\d.\-]{9,})", title or ""):
        if len(digits(m)) == 11:
            return digits(m)
    for it in items:
        if len(digits(it.get("displayName", ""))) == 11:
            return digits(it.get("displayName", ""))
    return None


def split_blocks(body):
    """Quebra o corpo em blocos datados. Retorna [(date, texto)] do mais novo
    ao mais antigo. Aceita DD.MM.AAAA e DD/MM/AAAA no inicio da linha."""
    body = (body or "").replace("\r\n", "\n")
    pat = re.compile(r"(?m)^\s*(\d{2})[./](\d{2})[./](\d{4})\s*[\(\):;.-]")
    marks = list(pat.finditer(body))
    blocks = []
    for i, m in enumerate(marks):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        try:
            dt = datetime.date(y, mo, d)
        except ValueError:
            continue
        end = marks[i + 1].start() if i + 1 < len(marks) else len(body)
        texto = body[m.end():end]
        blocks.append((dt, texto))
    blocks.sort(key=lambda x: x[0], reverse=True)
    return blocks


def derivar_hash(cpf, dn, salt, iters):
    bits = hashlib.pbkdf2_hmac("sha256", (cpf + "|" + dn).encode(), salt.encode(), iters, dklen=32)
    return hashlib.sha256(bits).digest()[:16].hex()
