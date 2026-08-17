# Logo do Escritório - Instruções de Configuração

Esta pasta contém o logo do escritório Advocacia Previdenciária Dr. Paulo Roberto Tercini Filho (OAB/SP 331.110) utilizado como timbre do cabeçalho de todas as petições geradas pela skill `base-peticao-previdenciaria-padrao-visual`.

## NOME PADRÃO DO ARQUIVO

`logo-tercini.png` (preferencial, suporta fundo transparente)

OU

`logo-tercini.jpg` (alternativa)

OU

`logo.jpg` (legado, mantido por compatibilidade)

**A partir da Onda 54 (v1.44.0), a busca é CASE-INSENSITIVE nas extensões.** Você pode salvar como `.png` OU `.PNG` OU `.jpg` OU `.JPG` OU `.jpeg` OU `.JPEG`. A skill localiza corretamente em qualquer caso.

## LOCAIS DE BUSCA DO LOGO

A skill geradora `peticao-previdenciaria` busca o logo na ordem abaixo. O primeiro encontrado é utilizado.

### Prioridade 1 - Workspace do escritório (RECOMENDADO)

```
C:\Users\VAIO\INSS\assets\logo-tercini.png
C:\Users\VAIO\INSS\assets\logo-tercini.jpg
```

Esta é a localização RECOMENDADA pois sobrevive a atualizações do plugin.

### Prioridade 2 - Diretório de assets do escritório

```
C:\Users\VAIO\INSS\base-legislacao\..\assets\logo-tercini.png
```

### Prioridade 3 - Plugin instalado

```
%USERPROFILE%\.claude\plugins\cache\marketplace-tercini\base-conhecimento-inss\X.Y.Z\skills\base-peticao-previdenciaria-padrao-visual\assets\logo-tercini.png
```

### Prioridade 4 - Diretório de trabalho atual

```
./assets/logo-tercini.png
./assets/logo.jpg
```

### Prioridade 5 - Fallback

Se nenhum arquivo for encontrado, a petição é gerada SEM logo. Um alerta é emitido ao final do output indicando que o usuário deve inserir manualmente.

## COMO INSTALAR O LOGO PELA PRIMEIRA VEZ

1. No Windows do escritório, salvar o arquivo em `C:\Users\VAIO\INSS\assets\logo-tercini.png` (criar a pasta `assets` se não existir). No Cowork, o mesmo arquivo aparece automaticamente no sandbox como `/sessions/<sessao>/mnt/INSS/assets/logo-tercini.PNG` quando a pasta INSS está selecionada.

2. Confirmar que o arquivo é PNG ou JPG. O arquivo atual do escritório chama-se `logo-tercini.PNG` com extensão MAIÚSCULA, e a busca é case-insensitive.

3. **Qualquer dimensão é aceita.** A skill lê os pixels reais do arquivo (PNG pelos bytes 16-23, JPEG pelos SOF markers desde a Onda 69) e calcula a largura preservando aspect ratio (altura fixa em 75 px). Não há distorção. Recomenda-se ao menos 300 px de altura no arquivo fonte para preservar qualidade visual quando renderizado no docx.

4. Próxima petição gerada já trará o logo no cabeçalho.

## CARACTERÍSTICAS TÉCNICAS DO LOGO ATUAL

- Formato. PNG com canal alfa (fundo transparente).
- Design. Duas formas triangulares em cinza (claro e escuro) sobre uma curva vermelha estilizando uma balança da justiça.
- Cores. Cinza, preto e vermelho.
- Dimensões nativas do arquivo. **538 x 421 px** (proporção 1,278).
- Dimensões de inserção no documento. **96 x 75 px** (altura fixa 75, largura calculada pela proporção real). A especificação antiga de 83 x 75 px (cx=791210 cy=712470 EMU) DISTORCIA o logo e está superada desde a Onda 69.

## ATENÇÃO ANTI-ALUCINAÇÃO

A skill geradora NÃO deve inventar conteúdo do logo nem desenhar via SVG. Desde a Onda 69, se o arquivo não existir nos caminhos de busca (incluindo o sandbox `/sessions/*/mnt/INSS/assets/`), a geração é INTERROMPIDA com erro BLOQUEANTE. A petição sem timbre não deve ser entregue. Localizar o logo com `find /sessions -iname 'logo-tercini*' 2>/dev/null`, confirmar o mount da pasta INSS e regenerar.

## SUPORTE A MÚLTIPLOS FORMATOS

A implementação atualizada da skill detecta automaticamente o formato a partir da extensão do arquivo encontrado. Suporta.

- `.png` (preferencial, transparência)
- `.jpg` / `.jpeg`
- `.gif` (não recomendado)
- `.bmp` (não recomendado)

No código `docx-js`, o parâmetro `type` do `ImageRun` é definido conforme a extensão.

```javascript
const ext = path.extname(logoPath).slice(1).toLowerCase();
const imageType = ext === 'jpeg' ? 'jpg' : ext;
new ImageRun({
  data: logoBuffer,
  type: imageType,  // "png", "jpg", etc.
  transformation: { width: 83, height: 75 }
})
```

## Fundo branco obrigatório (Onda 116, 17/08/2026)

O arquivo `logo-tercini.PNG` DEVE ser PNG opaco, modo RGB, sem canal alfa, com fundo branco puro.

Motivo. O arquivo anterior era RGBA com alpha 0 no fundo, mas os pixels sob a transparência guardavam o padrão XADREZ do editor de imagem, em cinza 191,191,191 alternado com branco. Ao converter para PDF, ao subir no PJe ou ao imprimir, o xadrez reaparecia no cabeçalho.

Correção. Composição sobre branco pelo próprio canal alfa, o que zera o xadrez e preserva as bordas suavizadas, seguida de conversão para RGB.

Comando de verificação, a rodar antes de gerar peça.

```python
from PIL import Image
im = Image.open('logo-tercini.PNG')
assert im.mode == 'RGB', 'logo com canal alfa, refazer'
rgb = im.convert('RGB')
for p in [(5,5),(20,5),(5,20),(20,20)]:
    assert rgb.getpixel(p) == (255,255,255), 'fundo nao e branco puro, refazer'
print('logo OK')
```

Comando de correção, se a verificação falhar.

```python
from PIL import Image
src = Image.open('ORIGEM.png').convert('RGBA')
fundo = Image.new('RGBA', src.size, (255,255,255,255))
Image.alpha_composite(fundo, src).convert('RGB').save('logo-tercini.PNG','PNG',optimize=True)
```

Backups na mesma pasta, nenhum utilizável. `logo-tercini-TRANSPARENTE-nao-usar.png.bak` e `logo-tercini-DEFEITUOSA-xadrez-impresso.png.bak`.
