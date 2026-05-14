@echo off
cd /d "%~dp0"
start "Casino fictif - serveur" cmd /k scripts\start-preview.cmd
timeout /t 2 /nobreak >NUL
start "" "http://10.0.0.10:4173/"
