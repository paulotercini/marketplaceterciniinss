# Coleta de STF e STJ, chamada pela tarefa agendada "coleta-superiores" e à mão. Só baixa o que falta.
#   powershell -File rodar-coleta.ps1
#   powershell -File rodar-coleta.ps1 -Fonte stj_temas,stf_temas
param([string[]]$Fonte = @())
$rodando = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object CommandLine -like '*mcp-superiores*coletor.py*').Count
if ($rodando -gt 0) { return }
$dados = if ($env:SUPERIORES_DADOS) { $env:SUPERIORES_DADOS } else { "$env:USERPROFILE\superiores-jurisprudencia" }
New-Item -ItemType Directory -Force $dados | Out-Null
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [Text.Encoding]::UTF8     # senão o PowerShell lê a saída do Python na página 850
$args_ = @("run", "--quiet", "$PSScriptRoot\coletor.py")
if ($Fonte.Count) { $args_ += @("--fonte") + $Fonte }
Add-Content -Encoding UTF8 "$dados\coleta.log" "=== coleta $(Get-Date -Format 'dd/MM/yyyy HH:mm') ==="
# *>> grava UTF-16 no PowerShell 5 e mistura com o cabeçalho em UTF-8
& uv @args_ 2>&1 | ForEach-Object { "$_" } | Out-File -Append -Encoding utf8 "$dados\coleta.log"
