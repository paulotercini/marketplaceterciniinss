# Atualização incremental da base, uma vez por dia pelo Agendador de Tarefas do Windows. Se já houver
# coletor rodando, não faz nada. Os dois acervos, só os últimos 60 meses: os meses fechados saem sem rede,
# e o que custa é refazer o mês corrente e o anterior, que o CJF ainda completa.
# Registrar uma vez, numa janela do PowerShell:
#   schtasks /create /tn "coleta-trf3" /tr "powershell -NoProfile -ExecutionPolicy Bypass -File <esta pasta>\manter-coleta.ps1" /sc daily /st 03:00 /f
param([int]$Meses = 60)
$rodando = @(Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Where-Object CommandLine -like '*coletor.py*').Count
if ($rodando -gt 0) { return }
$dados = if ($env:TRF3_DADOS) { $env:TRF3_DADOS } else { "$env:USERPROFILE\trf3-jurisprudencia" }
Add-Content -Encoding UTF8 "$dados\coleta.log" "=== agendador subiu o supervisor $(Get-Date -Format 'dd/MM/yyyy HH:mm') ==="
Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File',"$PSScriptRoot\rodar-coleta.ps1",'-Meses',$Meses -WindowStyle Hidden
