# Logo do Escritório. Configuração e verificação

Logo do escritório Advocacia Previdenciária Dr. Paulo Roberto Tercini Filho (OAB/SP 331.110), usada no timbre da primeira página de toda peça convertida por `peticao-previdenciaria/scripts/md2docx.js`.

## Arquivo e local

O arquivo é `logo-tercini.PNG`, com extensão maiúscula. Fica em `C:\Users\VAIO\INSS\assets\` no Windows do escritório, local que sobrevive às atualizações do plugin. No Cowork, com a pasta INSS selecionada, aparece em `/sessions/<sessão>/mnt/INSS/assets/logo-tercini.PNG`, e o nome da sessão muda a cada vez, por isso se localiza com `find /sessions -iname 'logo-tercini*' 2>/dev/null`.

O `md2docx.js` não procura a logo. O caminho é passado pelo argumento `--logo`. Sem o argumento, ou com caminho inexistente, a peça sai sem logo e sem aviso, e a verificação do cabeçalho em `peticao-previdenciaria/references/MECANICA-DOCX.md`, seção Logo do escritório, impede a entrega.

## Características

Duas formas triangulares em cinza claro e escuro sobre uma curva vermelha que estiliza uma balança da justiça. Dimensões nativas de 538 x 421 px (proporção 1,278). O script insere a logo em 83 x 75 px, o que a estreita levemente; a proporção real pede 96 x 75 px, ajuste que depende de alteração no script, ainda não feita. A skill nunca desenha a logo nem a substitui por SVG.

## Fundo branco obrigatório (Onda 116, 17/08/2026)

O arquivo deve ser PNG opaco, modo RGB, sem canal alfa e com fundo branco puro. O arquivo anterior era RGBA e guardava, sob a transparência, o padrão xadrez do editor de imagem, em cinza 191,191,191 alternado com branco, que reaparecia no PDF, no PJe e na impressão.

Verificação, antes de gerar a peça.

```python
from PIL import Image
im = Image.open('logo-tercini.PNG')
assert im.mode == 'RGB', 'logo com canal alfa, refazer'
for p in [(5,5),(20,5),(5,20),(20,20)]:
    assert im.getpixel(p) == (255,255,255), 'fundo nao e branco puro, refazer'
print('logo OK')
```

Correção, se a verificação falhar. A composição sobre branco pelo próprio canal alfa zera o xadrez e preserva as bordas suavizadas.

```python
from PIL import Image
src = Image.open('ORIGEM.png').convert('RGBA')
fundo = Image.new('RGBA', src.size, (255,255,255,255))
Image.alpha_composite(fundo, src).convert('RGB').save('logo-tercini.PNG','PNG',optimize=True)
```

Os backups `logo-tercini-TRANSPARENTE-nao-usar.png.bak` e `logo-tercini-DEFEITUOSA-xadrez-impresso.png.bak`, na mesma pasta, não se usam.
