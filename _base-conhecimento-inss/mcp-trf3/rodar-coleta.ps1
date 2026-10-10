# Mantém a carga rodando sem supervisão. Se o coletor cair, espera 5 minutos e retoma de onde parou,
# até 30 quedas seguidas. Terminada a varredura, roda mais uma vez para refazer os meses que mudaram
# durante a coleta. Log acumulado em coleta.log e coleta.err na pasta de dados.
#   powershell -ExecutionPolicy Bypass -File rodar-coleta.ps1
param(
    [string]$Acervo = "",      # trf3 | recursais; vazio = os dois, na ordem do coletor
    [int]$Meses = 0            # 0 = o padrão do coletor (120)
)
$dados = if ($env:TRF3_DADOS) { $env:TRF3_DADOS } else { "$env:USERPROFILE\trf3-jurisprudencia" }
$env:PYTHONIOENCODING = 'utf-8'
Set-Location $PSScriptRoot
$quedas = 0; $voltas = 0
while ($quedas -lt 30 -and $voltas -lt 2) {
    Add-Content -Encoding UTF8 "$dados\coleta.log" "=== início $(Get-Date -Format 'dd/MM/yyyy HH:mm') ==="
    # via cmd, porque o >> do PowerShell 5 grava em UTF-16 e embaralha o log
    $arg = ""
    if ($Acervo) { $arg += " --acervo $Acervo" }
    if ($Meses -gt 0) { $arg += " --meses $Meses" }
    cmd /c "python coletor.py$arg 1>> `"$dados\coleta.log`" 2>> `"$dados\coleta.err`""
    if ($LASTEXITCODE -eq 0) { $voltas++; $quedas = 0 }
    elseif ($LASTEXITCODE -eq 3) { Add-Content -Encoding UTF8 "$dados\coleta.log" "=== CJF incompleto, nova tentativa em 30 min ==="; Start-Sleep 1800 }
    else { $quedas++; Add-Content -Encoding UTF8 "$dados\coleta.log" "=== queda $quedas, retomando em 5 min ==="; Start-Sleep 300 }
}
Add-Content -Encoding UTF8 "$dados\coleta.log" "=== fim $(Get-Date -Format 'dd/MM/yyyy HH:mm'), $voltas varreduras completas, $quedas quedas seguidas ==="
