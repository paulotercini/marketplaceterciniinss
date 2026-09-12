"""A escolha do crachá: o do banco primeiro, o do segredo como partida e resgate.

O bug real que estes casos travam: em 05.09.2026 o workflow recriava sempre o
mesmo refresh_token a partir do segredo, descartava o renovado, e a corrente
venceu (AADSTS70000). O caso 'guardado vencido cai para o segredo' é o que
garante que refazer o segredo volte a funcionar mesmo com uma linha morta no
banco.
"""
import json
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import graph_refresh as g  # noqa: E402

VENCIDO = ("invalid_grant", "Microsoft recusou a renovação (invalid_grant): expirou")


def monta(monkeypatch, tmp_path, *, no_segredo, no_banco, vivos):
    """Prepara o cenário e devolve a lista do que foi guardado no banco."""
    arq = tmp_path / "graph_tokens.json"
    arq.write_text(json.dumps({"refresh_token": no_segredo}))
    monkeypatch.setattr(g, "TOKENS_PATH", arq)
    monkeypatch.setattr(g, "token_guardado", lambda: no_banco)
    guardados = []
    monkeypatch.setattr(g, "guardar_token", lambda t: guardados.append(t))
    monkeypatch.setattr(g, "renovar", lambda tok: (
        ({"access_token": "at", "refresh_token": tok + "+novo", "expires_in": 3600}, None)
        if tok in vivos else (None, VENCIDO)))
    return guardados, arq


def test_usa_o_do_banco_e_guarda_o_novo(monkeypatch, tmp_path):
    guardados, arq = monta(monkeypatch, tmp_path,
                           no_segredo="velho", no_banco="banco", vivos={"banco"})
    g.main()
    assert guardados == ["banco+novo"]
    assert json.loads(arq.read_text())["access_token"] == "at"


def test_guardado_vencido_cai_para_o_segredo(monkeypatch, tmp_path):
    guardados, _ = monta(monkeypatch, tmp_path,
                         no_segredo="refeito", no_banco="morto", vivos={"refeito"})
    g.main()
    assert guardados == ["refeito+novo"]


def test_sem_banco_usa_o_segredo(monkeypatch, tmp_path):
    guardados, _ = monta(monkeypatch, tmp_path,
                         no_segredo="segredo", no_banco=None, vivos={"segredo"})
    g.main()
    assert guardados == ["segredo+novo"]


def test_os_dois_vencidos_manda_refazer(monkeypatch, tmp_path):
    monta(monkeypatch, tmp_path, no_segredo="a", no_banco="b", vivos=set())
    with pytest.raises(SystemExit) as e:
        g.main()
    assert "graph_devflow.py" in str(e.value)
