# Guarda de uma vez as credenciais que os geradores do portal e o graph_refresh
# procuram em SUPABASE_URL e SUPABASE_SERVICE_KEY.
#
# Rode UMA VEZ (e de novo a cada troca de chave):
#     powershell -ExecutionPolicy Bypass -File .\configurar-ambiente.ps1
#
# A chave é digitada aqui, sem aparecer na tela e sem ficar no histórico do
# PowerShell. Depois disso, qualquer janela nova já enxerga as duas variáveis.

$ErrorActionPreference = "Stop"

$atualUrl = [Environment]::GetEnvironmentVariable("SUPABASE_URL", "User")
if ($atualUrl) { Write-Host "URL guardada hoje: $atualUrl" }

$url = Read-Host "URL do Supabase (https://SEUPROJETO.supabase.co)"
if (-not $url) { $url = $atualUrl }
if (-not $url) { throw "sem URL não dá para seguir" }

$segura = Read-Host "Chave service_role (cole aqui, nao aparece na tela)" -AsSecureString
$chave  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura))
if (-not $chave) { throw "sem chave não dá para seguir" }

[Environment]::SetEnvironmentVariable("SUPABASE_URL", $url.TrimEnd("/"), "User")
[Environment]::SetEnvironmentVariable("SUPABASE_SERVICE_KEY", $chave, "User")
$env:SUPABASE_URL = $url.TrimEnd("/")
$env:SUPABASE_SERVICE_KEY = $chave

# confere no ar, sem imprimir a chave
try {
  $r = Invoke-WebRequest -Uri "$($env:SUPABASE_URL)/rest/v1/casos?select=id&limit=1" `
       -Headers @{ apikey = $chave; Authorization = "Bearer $chave" } -UseBasicParsing
  Write-Host "`nOK. O banco respondeu $($r.StatusCode). As variáveis ficaram guardadas no seu usuário."
} catch {
  Write-Host "`nGuardei as variáveis, mas o banco recusou a chave: $($_.Exception.Message)"
  Write-Host "Confira se a chave é a service_role e se a URL está certa."
}

Write-Host "Abra uma janela NOVA do PowerShell antes de rodar os geradores."
