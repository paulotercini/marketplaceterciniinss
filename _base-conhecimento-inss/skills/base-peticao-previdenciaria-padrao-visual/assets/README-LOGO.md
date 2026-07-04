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

1. Salvar o arquivo do logo do escritório em `C:\Users\VAIO\INSS\assets\logo-tercini.png` (criar a pasta `assets` se não existir).

2. Confirmar que o arquivo é PNG ou JPG.

3. **A partir da Onda 54 (v1.44.0), qualquer dimensão é aceita.** A skill lê os pixels reais do PNG e calcula largura preservando aspect ratio (altura fixa em 75 px). Não há mais distorção. Recomenda-se ao menos 300 px de altura no arquivo fonte para preservar qualidade visual quando renderizado no docx.

4. Próxima petição gerada já trará o logo no cabeçalho.

## CARACTERÍSTICAS TÉCNICAS DO LOGO ATUAL

- Formato. PNG com canal alfa (fundo transparente).
- Design. Duas formas triangulares em cinza (claro e escuro) sobre uma curva vermelha estilizando uma balança da justiça.
- Cores. Cinza, preto e vermelho.
- Dimensões no documento. 83 x 75 px (a 96 DPI) ou cx=791210 cy=712470 EMU.

## ATENÇÃO ANTI-ALUCINAÇÃO

A skill geradora NÃO deve inventar conteúdo do logo nem desenhar via SVG. Se o arquivo não existir nos caminhos de busca, gerar a petição SEM logo e ALERTAR claramente o usuário.

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
