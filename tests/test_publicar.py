"""Testes do publicar.py — a trava que impede publicar com chave real."""
import sys, pathlib, pytest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from crm.publicar import publicar

APP_LIMPO = '''<html><script>
const CONFIG = {
  SUPABASE_URL: "COLE_AQUI_https://xxxx.supabase.co",
  ANON_KEY: "COLE_AQUI_a_anon_key",
};
</script></html>'''

APP_COM_CHAVE = APP_LIMPO.replace('COLE_AQUI_https://xxxx.supabase.co',
                                  'https://real123.supabase.co')

def test_publica_o_app_sem_configuracao(tmp_path):
    o = tmp_path / "app.html"; o.write_text(APP_LIMPO)
    d = tmp_path / "docs" / "crm" / "index.html"
    publicar(o, d)
    assert d.read_text() == APP_LIMPO
    assert "COLE_AQUI" in d.read_text()

def test_recusa_publicar_com_endereco_real(tmp_path):
    o = tmp_path / "app.html"; o.write_text(APP_COM_CHAVE)
    d = tmp_path / "docs" / "crm" / "index.html"
    with pytest.raises(SystemExit) as e:
        publicar(o, d)
    assert "SUPABASE_URL preenchido" in str(e.value)
    assert not d.exists()          # não deixa nem o arquivo pela metade

def test_cria_a_pasta_de_destino(tmp_path):
    o = tmp_path / "app.html"; o.write_text(APP_LIMPO)
    d = tmp_path / "nova" / "pasta" / "index.html"
    publicar(o, d)
    assert d.exists()
