"""Regressão do cliente do Microsoft Graph — puro, sem rede.

[BUG 19.09.2026] O crachá da Microsoft dura cerca de uma hora. Um crawl
completo do To Do passa disso, e o gerador seguinte morria com
`HTTPError 401` no meio do caminho, obrigando a rodar o graph_refresh.py na
hora exata. Agora o próprio cliente renova UMA vez e repete a chamada."""
import io, sys, pathlib, urllib.error

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import graph_client


def _erro(code):
    return urllib.error.HTTPError("https://x", code, "erro", {}, io.BytesIO(b""))


class _Resposta:
    def __init__(self, corpo=b'{"value": []}'):
        self._corpo = corpo

    def read(self):
        return self._corpo

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_401_renova_o_cracha_uma_vez_e_repete_a_chamada(monkeypatch):
    chamadas, renovacoes = [], []
    monkeypatch.setattr(graph_client, "_token", lambda: "cracha")
    monkeypatch.setattr(graph_client, "_renovar_cracha",
                        lambda: (renovacoes.append(1), True)[1])

    def falso_urlopen(req, timeout=None):
        chamadas.append(req.full_url)
        if len(chamadas) == 1:
            raise _erro(401)
        return _Resposta()

    monkeypatch.setattr(graph_client.urllib.request, "urlopen", falso_urlopen)
    assert graph_client._req("GET", "/me/todo/lists") == {"value": []}
    assert len(chamadas) == 2 and len(renovacoes) == 1


def test_401_que_persiste_nao_entra_em_laco(monkeypatch):
    """Renovar e continuar dando 401 é senha trocada ou permissão retirada:
    o erro sobe, em vez de o script ficar renovando para sempre."""
    chamadas, renovacoes = [], []
    monkeypatch.setattr(graph_client, "_token", lambda: "cracha")
    monkeypatch.setattr(graph_client, "_renovar_cracha",
                        lambda: (renovacoes.append(1), True)[1])

    def falso_urlopen(req, timeout=None):
        chamadas.append(req.full_url)
        raise _erro(401)

    monkeypatch.setattr(graph_client.urllib.request, "urlopen", falso_urlopen)
    try:
        graph_client._req("GET", "/me/todo/lists")
        assert False, "devia ter levantado o 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401
    assert len(chamadas) == 2 and len(renovacoes) == 1


def test_401_sem_conseguir_renovar_sobe_o_erro(monkeypatch):
    """Refresh_token vencido (90 dias): o erro sobe para a pessoa refazer o
    login com graph_devflow.py, em vez de morrer com mensagem obscura."""
    monkeypatch.setattr(graph_client, "_token", lambda: "cracha")
    monkeypatch.setattr(graph_client, "_renovar_cracha", lambda: False)
    monkeypatch.setattr(graph_client.urllib.request, "urlopen",
                        lambda req, timeout=None: (_ for _ in ()).throw(_erro(401)))
    try:
        graph_client._req("GET", "/me/todo/lists")
        assert False, "devia ter levantado o 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401
