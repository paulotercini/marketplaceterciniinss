import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "crm"))
from separar import separar, juntar  # noqa: E402

APP = Path(__file__).resolve().parent.parent / "crm" / "fase2" / "app.html"


def test_separar_preserva_o_programa():
    html = APP.read_text(encoding="utf-8")
    pagina, nome, js = separar(html)
    assert juntar(pagina, nome, js) == html
    assert len(js) > 3_000_000 and "</script>" not in js
    assert f'<script src="{nome}"></script>' in pagina and len(pagina) < 1_000_000
