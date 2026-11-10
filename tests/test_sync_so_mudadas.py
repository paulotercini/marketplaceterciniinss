"""Auditoria de 10.11.2026: a sincronização manda ao banco só a linha que mudou desde a rodada anterior."""
import datetime, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "crm" / "fase2"))
import migrar  # noqa: E402

UTC = datetime.timezone.utc


def test_so_mudadas_deixa_de_fora_a_linha_igual():
    a, b = {"id": "1", "nome": "Ana"}, {"id": "2", "nome": "Bia"}
    _, memo = migrar.so_mudadas([a, b], "id", {})
    b2 = {"id": "2", "nome": "Beatriz"}
    mud, novo = migrar.so_mudadas([dict(a), b2, {"id": "3"}], "id", memo)
    assert [l["id"] for l in mud] == ["2", "3"]
    assert set(novo) == {"1", "2", "3"}
    # a ordem das chaves não muda a assinatura
    assert migrar.assinatura({"x": 1, "y": 2}) == migrar.assinatura({"y": 2, "x": 1})


def test_memo_vence_em_24_horas_e_sync_tudo(tmp_path, monkeypatch):
    arq = tmp_path / "m.json"
    agora = datetime.datetime(2026, 11, 10, 12, tzinfo=UTC)
    arq.write_text(json.dumps({"em": (agora - datetime.timedelta(hours=2)).isoformat(), "h": {"casos": {"1": "x"}}}))
    h, em = migrar.ler_memo(str(arq), agora)
    assert h == {"casos": {"1": "x"}} and em < agora
    h, em = migrar.ler_memo(str(arq), agora + datetime.timedelta(hours=23))
    assert h == {}, "passadas 24 horas da rodada completa, vai tudo"
    assert em == agora + datetime.timedelta(hours=23)
    monkeypatch.setenv("SYNC_TUDO", "1")
    assert migrar.ler_memo(str(arq), agora)[0] == {}
    monkeypatch.delenv("SYNC_TUDO")
    assert migrar.ler_memo(str(tmp_path / "nao-existe.json"), agora)[0] == {}
    assert migrar.ler_memo(None, agora)[0] == {}
