# Site — Tercini Advocacia Previdenciária

Site estático (HTML/CSS) do escritório, pronto para hospedagem no **GitHub Pages**.

## Estrutura

```
docs/                  ← pasta publicada (GitHub Pages)
  index.html           ← página inicial
  sobre.html           ← o escritório
  contato.html         ← contato + mapa
  <benefício>.html     ← uma página por tipo de benefício (geradas)
  assets/css/style.css ← estilos (paleta vermelho/cinza/preto/branco)
  assets/js/main.js    ← menu mobile
  assets/img/logo.svg  ← LOGO PROVISÓRIA (substituir pelo arquivo oficial)
site_content/*.json    ← conteúdo de cada benefício (fonte das páginas)
build_site.py          ← gerador: lê site_content/ e escreve docs/
```

## Como regenerar as páginas

Depois de editar qualquer arquivo em `site_content/`:

```bash
python3 build_site.py
```

## Como publicar no GitHub Pages

1. No GitHub: **Settings → Pages**.
2. Em *Build and deployment → Source*, escolha **Deploy from a branch**.
3. Selecione a branch e a pasta **/docs**. Salve.
4. O site ficará disponível em `https://<usuario>.github.io/<repositorio>/`.
5. Domínio próprio (ex.: advprev.com): configure em *Custom domain* e ajuste o DNS.

## Trocar a logo

Substitua `docs/assets/img/logo.svg` pelo arquivo oficial (de preferência `.svg`;
se for `.png`, atualize a referência em `build_site.py`). As cores `--red` etc.
ficam no topo de `assets/css/style.css` e devem ser ajustadas ao HEX exato da marca.
