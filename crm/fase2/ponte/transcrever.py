# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["faster-whisper>=1.1", "av<16", "pillow"]  # av 16+ quebra o decode do faster-whisper 1.2
# ///
"""Transcreve os áudios do WhatsApp que a ponte grava no CRM.

    uv run transcrever.py            # fica ligado, ao lado do node ponte.js
    uv run transcrever.py --teste    # só a prova das regras, sem rede

Roda NESTA máquina (Whisper via faster-whisper): o áudio do cliente, que fala
de doença e de benefício, não sai do escritório. Lê o mesmo .env da ponte.

O que faz: de tempos em tempos procura áudio sem texto em zap_mensagens, baixa
do Storage, transcreve em português e grava a transcrição em `texto` (áudio do
WhatsApp não tem legenda, o campo está livre). Daí em diante a ficha, o
conector do Claude e o "↪ andamento" leem a transcrição sem mudar nada.

Modelo: WHISPER_MODELO no .env (padrão "large-v3-turbo", 20.10.2026: acerta bem mais
que o "small" em português, ~1,6 GB, leva mais ou menos o tempo do áudio; "small" é o
leve, para computador fraco). Na primeira vez baixa o modelo.
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

AQUI = Path(__file__).resolve().parent
TENTATIVAS = 3          # áudio que falha 3 vezes ganha um marcador e sai da fila
SEM_FALA = "[áudio sem fala]"
VOCABULARIO = ("Conversa de cliente com escritório de advocacia previdenciária: INSS, perícia, "
               "auxílio-doença, aposentadoria, BPC, LOAS, CNIS, benefício, recurso, procuração, "
               "Meu INSS, doutor, doutora.")
FALHOU = "[áudio não transcrito]"


def ler_env(arquivo: Path = AQUI / ".env") -> None:
    """Mesmo critério da ponte: o que já está no ambiente vence o .env."""
    if not arquivo.exists():
        return
    for linha in arquivo.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.lstrip().startswith("#"):
            k, v = linha.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def juntar(trechos) -> str:
    """Os pedaços do Whisper viram um texto só; nada dito vira o marcador."""
    t = " ".join(s.strip() for s in trechos if s and s.strip())
    return t or SEM_FALA


def log(*a):
    print(time.strftime("%d/%m/%Y, %H:%M:%S"), "·", *a, flush=True)


class Banco:
    def __init__(self):
        self.base = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self.chave = os.environ.get("SUPABASE_SERVICE_KEY", "")
        self.balde = os.environ.get("BUCKET", "anexos")
        if not self.base or not self.chave:
            sys.exit("Falta SUPABASE_URL ou SUPABASE_SERVICE_KEY (no .env da ponte ou no ambiente).")

    def _pedir(self, caminho, metodo="GET", corpo=None, extra=None):
        h = {"apikey": self.chave, "Authorization": f"Bearer {self.chave}", **(extra or {})}
        dados = None
        if corpo is not None:
            dados = json.dumps(corpo).encode()
            h["Content-Type"] = "application/json"
        req = urllib.request.Request(self.base + caminho, data=dados, method=metodo, headers=h)
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()

    def pendentes(self, n=5):
        q = "select=id,midia_url&tipo=eq.audio&texto=is.null&midia_url=not.is.null&order=seq&limit=" + str(n)
        return json.loads(self._pedir("/rest/v1/zap_mensagens?" + q))

    def baixar(self, caminho):
        c = "/".join(urllib.parse.quote(p) for p in caminho.split("/"))
        return self._pedir(f"/storage/v1/object/authenticated/{self.balde}/{c}")

    # F191 · foto e documento do cliente que ainda não foram para o Drive
    def para_o_drive(self, desde, n=10):
        q = ("select=id,tipo,midia_url,midia_nome,midia_mime,momento,"
             "zap_conversas!inner(cliente_id,clientes!inner(nome,cpf))"
             "&direcao=eq.entrada&tipo=in.(imagem,documento)&midia_url=not.is.null&drive_em=is.null"
             f"&momento=gte.{desde}&zap_conversas.clientes.cpf=not.is.null&order=seq&limit={n}")
        return json.loads(self._pedir("/rest/v1/zap_mensagens?" + q))

    def marcar_drive(self, msg_id):
        self._pedir(f"/rest/v1/zap_mensagens?id=eq.{msg_id}", "PATCH",
                    {"drive_em": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}, {"Prefer": "return=minimal"})

    def gravar(self, msg_id, texto):
        # texto=is.null: se alguém escreveu à mão no meio, não passa por cima
        self._pedir(f"/rest/v1/zap_mensagens?id=eq.{msg_id}&texto=is.null", "PATCH",
                    {"texto": texto}, {"Prefer": "return=minimal"})


# ── F191 · foto e documento do cliente vão para a pasta dele no Drive, em PDF ──
# Mesma pasta da extensão do dossiê (achar_ou_criar: pelo #CPF, depois pelo
# nome; só cria se nada casar), na subpasta WhatsApp. Foto vira PDF; PDF vai
# como veio; outro formato (Word, planilha) vai no formato original.
# o antigo fica onde está, a não ser que DRIVE_DESDE (no .env) diga outra data;
# lido na hora, porque o .env só entra no ambiente em principal()
drive_desde = lambda: os.environ.get("DRIVE_DESDE", "2026-10-20")


def raiz_do_drive():
    try:
        with open(AQUI.parent / "dossie" / "host" / "dossie_host.json", encoding="utf-8-sig") as f:
            raiz = json.load(f)["raiz"]
        return raiz if os.path.isdir(raiz) else None
    except Exception:
        return None


def nome_no_drive(m):
    """2026-10-20 1432 WhatsApp laudo.pdf — a data vem primeiro para ordenar."""
    quando = time.strftime("%Y-%m-%d %H%M", time.localtime(
        time.mktime(time.strptime(m["momento"][:19], "%Y-%m-%dT%H:%M:%S")) - time.timezone))
    base = os.path.splitext(m.get("midia_nome") or "")[0] or ("foto" if m["tipo"] == "imagem" else "documento")
    ext = os.path.splitext(m.get("midia_nome") or "")[1].lower()
    if m["tipo"] == "imagem" or ext in ("", ".pdf"):
        ext = ".pdf"
    return f"{quando} WhatsApp {base}{ext}"


def em_pdf(dados, tipo):
    if tipo != "imagem":
        return dados
    from PIL import Image
    saida = io.BytesIO()
    Image.open(io.BytesIO(dados)).convert("RGB").save(saida, "PDF", resolution=150)
    return saida.getvalue()


def levar_ao_drive(banco, falhas):
    raiz = raiz_do_drive()
    if not raiz:
        return
    sys.path.insert(0, str(AQUI.parent / "dossie" / "host"))
    from dossie_host import achar_ou_criar, seguro
    for m in banco.para_o_drive(drive_desde()):
        if falhas.get(m["id"], 0) >= TENTATIVAS:
            continue
        try:
            cli = m["zap_conversas"]["clientes"]
            pasta, _ = achar_ou_criar(raiz, cli["cpf"], cli.get("nome") or "")
            destino = os.path.join(pasta, "WhatsApp", seguro(nome_no_drive(m)))
            os.makedirs(os.path.dirname(destino), exist_ok=True)
            base, ext = os.path.splitext(destino)
            n = 2
            while os.path.exists(destino):      # duas fotos no mesmo minuto: "(2)", "(3)"
                destino = f"{base} ({n}){ext}"; n += 1
            with open(destino, "wb") as f:
                f.write(em_pdf(banco.baixar(m["midia_url"]), m["tipo"]))
            banco.marcar_drive(m["id"])
            log("📁", destino)
        except Exception as e:
            falhas[m["id"]] = falhas.get(m["id"], 0) + 1
            log(f"✗ Drive {m['id']}: {e}")


def principal():
    # o console do Windows não é UTF-8: sem isso, o 🎤 do log derruba o programa
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ler_env()
    banco = Banco()
    from faster_whisper import WhisperModel  # só aqui: o --teste não precisa dele
    nome = os.environ.get("WHISPER_MODELO", "large-v3-turbo")
    log(f"carregando o modelo {nome}… (na primeira vez ele é baixado)")
    modelo = WhisperModel(nome, device="cpu", compute_type="int8")
    log("pronto: transcrevendo os áudios que chegarem")
    falhas: dict[str, int] = {}
    falhas_drive: dict[str, int] = {}
    while True:
        try:
            levar_ao_drive(banco, falhas_drive)
        except Exception as e:
            log("Drive:", e)
        try:
            fila = banco.pendentes()
        except Exception as e:
            log("banco:", e); time.sleep(30); continue
        for m in fila:
            try:
                audio = banco.baixar(m["midia_url"])
                # o vocabulário do escritório orienta as palavras raras (INSS, CNIS, BPC);
                # sem condicionar no trecho anterior, um erro não se repete em cascata
                trechos, _ = modelo.transcribe(io.BytesIO(audio), language="pt", vad_filter=True,
                                               initial_prompt=VOCABULARIO, condition_on_previous_text=False)
                texto = juntar(s.text for s in trechos)
                banco.gravar(m["id"], texto)
                log("🎤", texto[:70])
            except Exception as e:
                n = falhas[m["id"]] = falhas.get(m["id"], 0) + 1
                log(f"✗ áudio {m['id']}: {e} (tentativa {n})")
                if n >= TENTATIVAS:
                    try: banco.gravar(m["id"], FALHOU)
                    except Exception: pass
        time.sleep(int(os.environ.get("INTERVALO_TRANSCRICAO", "15")))


def teste():
    assert juntar([" Doutor,", " chegou a carta ", "do INSS. "]) == "Doutor, chegou a carta do INSS."
    assert juntar([]) == SEM_FALA and juntar(["  ", ""]) == SEM_FALA
    # nome no Drive: data e hora de Brasília primeiro; foto e PDF terminam em .pdf
    m = {"momento": "2026-10-20T17:32:00+00:00", "tipo": "imagem", "midia_nome": "IMG-1.jpg"}
    assert nome_no_drive(m) == "2026-10-20 1432 WhatsApp IMG-1.pdf", nome_no_drive(m)
    assert nome_no_drive({**m, "tipo": "documento", "midia_nome": "laudo.PDF"}).endswith("WhatsApp laudo.pdf")
    assert nome_no_drive({**m, "tipo": "documento", "midia_nome": "peticao.docx"}).endswith("peticao.docx")
    print("transcrever.py: regras ok")


if __name__ == "__main__":
    teste() if "--teste" in sys.argv else principal()
