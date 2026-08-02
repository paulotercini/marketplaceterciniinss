# CRM Tercini — handler do protocolo crmpasta:
# Recebe "crmpasta:Nome%20do%20Cliente", resolve para a pasta base configurada
# no instalador e abre no Windows Explorer (criando a pasta se nao existir).
param([string]$Url)

try {
    $nome = [uri]::UnescapeDataString(($Url -replace '^crmpasta:', '')).TrimEnd('/').Trim()
    if (-not $nome) { exit }
    # nome de pasta seguro (Windows nao aceita  \ / : * ? " < > | )
    $nome = ($nome -replace '[\\/:*?"<>|]', ' ').Trim()
    $base = (Get-ItemProperty -Path 'HKCU:\Software\CRMTercini' -ErrorAction Stop).PastaBase
    $pasta = Join-Path $base $nome
    if (-not (Test-Path $pasta)) {
        New-Item -ItemType Directory -Path $pasta | Out-Null
    }
    Start-Process explorer.exe -ArgumentList "`"$pasta`""
} catch {
    [System.Windows.Forms.MessageBox] | Out-Null
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show(
        "Nao consegui abrir a pasta. Rode o instalar-atalho.bat de novo.`n$($_.Exception.Message)",
        "CRM Tercini")
}
