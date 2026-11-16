"""app.html é a concatenação exata de crm/fase2/src/ (ver crm/fase2/build_app.py)."""
import subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def test_app_html_identico_a_montagem():
    r = subprocess.run([sys.executable, "crm/fase2/build_app.py", "--conferir"], cwd=RAIZ,
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stdout + r.stderr
