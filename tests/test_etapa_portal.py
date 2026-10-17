"""F236 · a etapa que vai ao portal do cliente: só a da fase em que o caso está e
nunca a que o CRM marcou como desatualizada (casos.trilha.velha). Dados fictícios.
Rode com: python -m pytest tests/test_etapa_portal.py -q"""
import sys, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import portal_common as pc


def _banco(monkeypatch, casos):
    monkeypatch.setenv("SUPABASE_URL", "https://exemplo.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "chave")
    clientes = [{"id": "c1", "cpf": "11111111111"}]
    monkeypatch.setattr(pc, "_supa_pagina",
                        lambda url, chave, caminho, pagina=1000: clientes if "clientes" in caminho else casos)


def test_etapa_de_outra_fase_nao_vai_ao_portal(monkeypatch):
    """[BUG F236] 'decidido' (do INSS) ficou num caso que já está no Conselho."""
    _banco(monkeypatch, [{"cliente_id": "c1", "etapa": "decidido", "fase": "conselho",
                          "mover_para": "🖥 Conselho de Recursos", "origem_lista": None}])
    assert pc.crm_do_cliente() == {}


def test_etapa_marcada_desatualizada_nao_vai_ao_portal(monkeypatch):
    """[BUG F236] 'perícia realizada' depois da sentença: o CRM marcou e o portal não publica."""
    _banco(monkeypatch, [{"cliente_id": "c1", "etapa": "perícia realizada", "fase": "judicial",
                          "mover_para": "👪 Judicial", "origem_lista": None,
                          "trilha": {"m": {}, "velha": {"etapa": "perícia realizada", "proposta": "sentença publicada",
                                                        "data": "2026-10-09"}}}])
    assert pc.crm_do_cliente() == {}


def test_marca_de_outra_etapa_nao_segura_a_etapa_aceita(monkeypatch):
    """Aceita a sugestão, a etapa muda e a marca antiga deixa de valer."""
    _banco(monkeypatch, [{"cliente_id": "c1", "etapa": "sentença publicada", "fase": "judicial",
                          "mover_para": "👪 Judicial", "origem_lista": None,
                          "trilha": {"velha": {"etapa": "perícia realizada", "proposta": "sentença publicada"}}}])
    assert pc.crm_do_cliente() == {("11111111111", "👪 Judicial"): {"etapa": "sentença publicada"}}


def test_execucao_corre_nos_autos_e_vale_no_judicial(monkeypatch):
    _banco(monkeypatch, [{"cliente_id": "c1", "etapa": "RPV expedida", "fase": "judicial",
                          "mover_para": "👪 Judicial", "origem_lista": None}])
    assert pc.crm_do_cliente() == {("11111111111", "👪 Judicial"): {"etapa": "RPV expedida"}}


def test_prazo_fatal_mantem_a_etapa_e_a_fila_do_judicial(monkeypatch):
    """[BUG F236] a fase 'outro' (Tarefas com Prazo) apagava a etapa e a fila do caso que veio do Judicial."""
    _banco(monkeypatch, [{"cliente_id": "c1", "etapa": "em recurso", "fase": "outro",
                          "mover_para": "🗓 Tarefas com Prazo", "origem_lista": "👪 Judicial",
                          "ronda": {"prazo_de": "👪 Judicial"},
                          "trf3": {"ordem": 214, "total": 1320, "consultado_em": "2026-10-16"}}])
    esperado = {"etapa": "em recurso", "fila": "214º de 1320", "fila_em": "16/10/2026"}
    assert pc.crm_do_cliente() == {("11111111111", "🗓 Tarefas com Prazo"): esperado,
                                   ("11111111111", "👪 Judicial"): esperado}


def test_catalogo_por_fase_e_o_mesmo_de_antes():
    """Nenhuma etapa publicável sumiu ao dividir o catálogo por fase."""
    assert len(pc.ETAPAS_PUBLICAS) == 33 and "aguardando perícia" in pc.ETAPAS_PUBLICAS
    assert pc.fase_da_etapa({"fase": "outro", "origem_lista": "☕ Pessoal"}) is None
    assert pc.etapa_publicavel({"fase": "outro", "origem_lista": "☕ Pessoal", "etapa": "decidido"}) is None
