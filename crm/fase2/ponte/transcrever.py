# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["faster-whisper>=1.1", "av<16"]  # av 16+ quebra o decode do faster-whisper 1.2
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

Modelo: WHISPER_MODELO no .env (padrão "small", bom em português e leve; "medium"
acerta mais e leva o dobro). Na primeira vez baixa o modelo (~500 MB).
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

    def gravar(self, msg_id, texto):
        # texto=is.null: se alguém escreveu à mão no meio, não passa por cima
        self._pedir(f"/rest/v1/zap_mensagens?id=eq.{msg_id}&texto=is.null", "PATCH",
                    {"texto": texto}, {"Prefer": "return=minimal"})


def principal():
    # o console do Windows não é UTF-8: sem isso, o 🎤 do log derruba o programa
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ler_env()
    banco = Banco()
    from faster_whisper import WhisperModel  # só aqui: o --teste não precisa dele
    nome = os.environ.get("WHISPER_MODELO", "small")
    log(f"carregando o modelo {nome}… (na primeira vez ele é baixado)")
    modelo = WhisperModel(nome, device="cpu", compute_type="int8")
    log("pronto: transcrevendo os áudios que chegarem")
    falhas: dict[str, int] = {}
    while True:
        try:
            fila = banco.pendentes()
        except Exception as e:
            log("banco:", e); time.sleep(30); continue
        for m in fila:
            try:
                audio = banco.baixar(m["midia_url"])
                trechos, _ = modelo.transcribe(io.BytesIO(audio), language="pt", vad_filter=True)
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
    print("transcrever.py: regras ok")


if __name__ == "__main__":
    teste() if "--teste" in sys.argv else principal()
