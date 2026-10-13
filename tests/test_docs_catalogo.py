"""F219 · onda 5: o catálogo do CRM é a fonte das listas do site institucional."""
import importlib.util
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("docs_catalogo", RAIZ / "crm" / "docs_catalogo.py")
dc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dc)


def test_catalogo_le_os_22_beneficios_sem_cabecalhos():
    cat = dc.catalogo(dc.SCHEMA.read_text(encoding="utf-8"))
    assert len(cat) == 22
    assert all(not x.startswith("▸") for b in cat.values() for x in b["itens"] + b["extras"])
    assert any(x.startswith("CPF") for x in cat["Apos. por Idade"]["itens"])


def test_cada_pagina_do_site_tem_par_no_catalogo():
    cat = dc.catalogo(dc.SCHEMA.read_text(encoding="utf-8"))
    assert all(b in cat for b in dc.SLUG_BENEFICIO.values())


def test_lista_do_site_tira_o_detalhe_depois_do_travessao():
    assert dc.lista_do_site({"itens": ["RG, CNH ou CIN — Original e cópia", "CPF"]}) == ["RG, CNH ou CIN", "CPF"]


def test_sem_aplicar_nada_e_gravado(tmp_path, monkeypatch):
    antes = {f.name: f.read_text(encoding="utf-8") for f in dc.SITE.glob("*.json")}
    dc.main([])
    assert antes == {f.name: f.read_text(encoding="utf-8") for f in dc.SITE.glob("*.json")}
