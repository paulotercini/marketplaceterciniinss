@echo off
chcp 65001 >nul
title CRM Tercini - atalho de pastas no Explorer
echo.
echo  === CRM Tercini - abrir pasta do cliente no Windows Explorer ===
echo.
echo  Este instalador registra o atalho "crmpasta:" neste computador.
echo  Depois dele, o botao [Explorer] na ficha do cliente abre a pasta
echo  local do Google Drive direto no Windows Explorer.
echo.
echo  Informe a pasta BASE onde ficam as pastas dos clientes no
echo  Google Drive para Desktop. Exemplos:
echo    G:\Meu Drive\Clientes
echo    C:\Users\Paulo\Google Drive\Clientes
echo.
set /p BASE="Pasta base: "
if "%BASE%"=="" (echo Nada informado, saindo. & pause & exit /b 1)
if not exist "%BASE%" (echo AVISO: "%BASE%" nao existe ainda - conferir depois.)

reg add "HKCU\Software\CRMTercini" /v PastaBase /d "%BASE%" /f >nul
reg add "HKCU\Software\Classes\crmpasta" /ve /d "URL:CRM Pasta do Cliente" /f >nul
reg add "HKCU\Software\Classes\crmpasta" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\crmpasta\shell\open\command" /ve /t REG_SZ /d "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%~dp0abrir-pasta.ps1\" \"%%1\"" /f >nul

echo.
echo  Pronto! Na primeira vez o navegador vai perguntar se pode abrir
echo  o "crmpasta" - marque "sempre permitir".
echo.
pause
