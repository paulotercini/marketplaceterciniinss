# Registra o MCP trf3 no Claude Desktop (chat e Cowork).
# O app regrava o claude_desktop_config.json com o que tem na memória, e por isso a entrada
# só persiste se for gravada com o app FECHADO. Rode este script numa janela do PowerShell
# fora do Claude, depois feche o Claude pela bandeja (Sair). O script espera o app fechar,
# grava a entrada com backup e reabre o Claude.
$cfg = "$env:APPDATA\Claude\claude_desktop_config.json"

Write-Host "Feche o Claude pela bandeja (botão direito no ícone, Sair). Aguardando..."
while (Get-Process claude -ErrorAction SilentlyContinue | Where-Object Path -like '*WindowsApps*') { Start-Sleep 2 }
Start-Sleep 3

Copy-Item $cfg "$cfg.antes-trf3-$(Get-Date -Format yyyyMMdd-HHmmss).json"
python -c @"
import json
p = r'$cfg'
d = json.load(open(p, encoding='utf-8'))
d.setdefault('mcpServers', {})['trf3'] = {
    'command': r'$env:USERPROFILE\.local\bin\uv.exe',
    'args': ['run', '--script', r'$PSScriptRoot\servidor.py'],
    'env': {'PYTHONIOENCODING': 'utf-8'}}
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('gravado:', list(json.load(open(p, encoding='utf-8'))['mcpServers']))
"@

Start-Process "shell:AppsFolder\Claude_pzs8sxrjxfjjc!Claude"
Start-Sleep 20
python -c "import json;print('depois de reabrir:', list(json.load(open(r'$cfg',encoding='utf-8')).get('mcpServers',{})))"
