@echo off
REM Wrapper para o Agendador de Tarefas do Windows.
REM Roda o cabecalho_diario.py a partir da raiz do repositorio.

REM Pasta deste .bat = _tercini-operacional\scripts\cabecalho
set SCRIPT_DIR=%~dp0
REM Sobe 3 niveis ate a raiz do repositorio
cd /d "%SCRIPT_DIR%..\..\.."

python "%SCRIPT_DIR%cabecalho_diario.py"
