# Registra, ou remove, um MCP local no Claude Desktop, que é o que o chat do app e o Cowork enxergam.
# O app regrava o claude_desktop_config.json com o que tem na memória, e por isso a alteração
# só persiste se for gravada com o app FECHADO. Rode este script numa janela do PowerShell
# fora do Claude, depois feche o Claude pela bandeja (Sair). O script espera o app fechar,
# grava com backup e reabre o Claude.
#   powershell -ExecutionPolicy Bypass -File registrar-desktop.ps1
#   powershell -ExecutionPolicy Bypass -File registrar-desktop.ps1 -Nome normas -Servidor C:\Users\VAIO\marketplaceterciniinss\mcp-normas\servidor.py
#   powershell -ExecutionPolicy Bypass -File registrar-desktop.ps1 -Remover -Nome trf3,acervo,normas
#   powershell -ExecutionPolicy Bypass -File registrar-desktop.ps1 -Todos     (os tres do escritorio, pelo plugin instalado)
param(
    [string[]]$Nome = @("trf3"),
    [string]$Servidor = "$PSScriptRoot\servidor.py",
    [switch]$Todos,       # registra trf3, acervo e normas de uma vez, apontando para a copia do plugin instalado
    [switch]$Remover      # tira a entrada do config, para quem já a tem pelo plugin e não quer instância dobrada
)
$cfg = "$env:APPDATA\Claude\claude_desktop_config.json"
$raiz = "$env:USERPROFILE\.claude\plugins\marketplaces\marketplace-tercini\_base-conhecimento-inss"
if ($Todos) {
    foreach ($n in @("trf3", "acervo", "normas")) {
        & $PSCommandPath -Nome $n -Servidor "$raiz\mcp-$n\servidor.py"
    }
    return
}
if (-not $Remover) {
    if ($Nome.Count -ne 1) { throw "para registrar, passe um nome só" }
    if (-not (Test-Path $Servidor)) { throw "servidor não encontrado: $Servidor" }
}

Write-Host "Feche o Claude pela bandeja (botão direito no ícone, Sair). Aguardando..."
while (Get-Process claude -ErrorAction SilentlyContinue | Where-Object Path -like '*WindowsApps*') { Start-Sleep 2 }
Start-Sleep 3

Copy-Item $cfg "$cfg.antes-$($Nome -join '-')-$(Get-Date -Format yyyyMMdd-HHmmss).json"
$nomes = $Nome -join ','
$acao = if ($Remover) { 'remover' } else { 'gravar' }
python -c @"
import json
p = r'$cfg'
d = json.load(open(p, encoding='utf-8'))
for nome in r'$nomes'.split(','):
    if '$acao' == 'remover':
        d.get('mcpServers', {}).pop(nome, None)
    else:
        d.setdefault('mcpServers', {})[nome] = {
            'command': r'$env:USERPROFILE\.local\bin\uv.exe',
            'args': ['run', '--script', r'$Servidor'],
            'env': {'PYTHONIOENCODING': 'utf-8'}}
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('mcpServers agora:', list(json.load(open(p, encoding='utf-8')).get('mcpServers', {})))
"@

Start-Process "shell:AppsFolder\Claude_pzs8sxrjxfjjc!Claude"
Start-Sleep 20
python -c "import json;print('depois de reabrir:', list(json.load(open(r'$cfg',encoding='utf-8')).get('mcpServers',{})))"
