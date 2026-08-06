#!/usr/bin/env python3
"""Publica o CRM numa URL, em vez de mandar o arquivo para cada pessoa.

Copia crm/fase2/app.html para docs/crm/index.html. O push na main dispara o
workflow do GitHub Pages e o sistema fica em

    https://paulotercini.github.io/marketplaceterciniinss/crm/

Por que isto existe: o app distribuído como arquivo abre, no celular, dentro
do visualizador do WhatsApp/Gmail/Drive, que não executa JavaScript — a tela
de login aparece, o botão não funciona e os campos somem ao clicar. Com uma
URL, o navegador abre de verdade, dá para salvar na tela de início e toda
atualização chega sozinha.

O que vai para o ar NÃO tem segredo nenhum: o endereço do banco e a chave
são digitados uma vez em cada aparelho e ficam guardados no navegador. Sem
eles a página não acessa coisa alguma, e quem tiver eles ainda precisa de
e-mail e senha de colaborador — os dados são protegidos pelo RLS do banco.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "crm" / "fase2" / "app.html"
DESTINO = RAIZ / "docs" / "crm" / "index.html"


def publicar(origem: Path = ORIGEM, destino: Path = DESTINO) -> str:
    """Copia o app para docs/. Devolve o conteúdo publicado."""
    html = origem.read_text(encoding="utf-8")
    # trava de segurança: ninguém publica um arquivo com a configuração
    # de um Supabase real embutida
    if not re.search(r'SUPABASE_URL:\s*"COLE_AQUI', html):
        raise SystemExit(
            "ERRO: o app.html está com SUPABASE_URL preenchido. A versão pública "
            "tem de sair sem endereço e sem chave — cada aparelho digita os seus."
        )
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(html, encoding="utf-8")
    return html


if __name__ == "__main__":
    conteudo = publicar()
    print(f"publicado: {DESTINO.relative_to(RAIZ)} ({len(conteudo)//1024} KB)")
    print("faça commit e push na main — o GitHub Pages publica sozinho em")
    print("https://paulotercini.github.io/marketplaceterciniinss/crm/")
