# Instala o programa que grava o dossiê na pasta do cliente no Drive.
# Rodar uma vez por computador (sem administrador):
#   powershell -ExecutionPolicy Bypass -File instalar.ps1
#   powershell -ExecutionPolicy Bypass -File instalar.ps1 -Raiz "H:\Meu Drive\Processos"
param([string]$Raiz = 'G:\Meu Drive\Processos')

$ErrorActionPreference = 'Stop'
$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$nome = 'br.tercini.dossie'
$idExtensao = 'iahgcmofpnkokbbglmipjchondkimckg'   # fixo pela "key" do manifest.json da extensão

if (-not (Test-Path $Raiz)) { Write-Warning "A pasta $Raiz não existe agora (o Drive está aberto?). Sigo assim mesmo." }

$python = (& python -c "import sys;print(sys.executable)").Trim()
if (-not (Test-Path $python)) { throw 'Python não encontrado. Instale o Python 3 e rode de novo.' }

# JSON sem BOM: o navegador recusa o manifesto do host que começa com BOM
# (o Set-Content -Encoding UTF8 do PowerShell 5 grava com BOM)
$semBom = New-Object System.Text.UTF8Encoding($false)
function Gravar($caminho, $obj) { [IO.File]::WriteAllText($caminho, ($obj | ConvertTo-Json), $semBom) }

# o que é desta máquina fica fora do git (.gitignore)
Gravar (Join-Path $aqui 'dossie_host.json') @{ raiz = $Raiz }
"@echo off`r`n`"$python`" -u `"$aqui\dossie_host.py`"" | Set-Content -Encoding ASCII (Join-Path $aqui 'dossie_host.bat')
$manifesto = Join-Path $aqui "$nome.json"
Gravar $manifesto @{
  name            = $nome
  description     = 'Dossie do cliente - grava na pasta de processos'
  path            = (Join-Path $aqui 'dossie_host.bat')
  type            = 'stdio'
  allowed_origins = @("chrome-extension://$idExtensao/")
}

# Chrome, Comet e Edge procuram cada um na sua chave
foreach ($chave in 'HKCU:\Software\Google\Chrome\NativeMessagingHosts',
                   'HKCU:\Software\Perplexity\Comet\NativeMessagingHosts',
                   'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts') {
  New-Item -Path "$chave\$nome" -Force | Out-Null
  Set-ItemProperty -Path "$chave\$nome" -Name '(default)' -Value $manifesto
}
Write-Host "Pronto. Pasta raiz: $Raiz"
Write-Host 'Recarregue a extensão (chrome://extensions, botão ↻) e rode o dossiê.'
