@echo off
cd /d "%~dp0.."
echo Lancement du casino fictif...
echo.
"C:\Users\yoann\AppData\Local\OpenAI\Codex\bin\node.exe" scripts\serve-dist.mjs
echo.
echo Le serveur s'est arrete. Si une erreur est affichee au-dessus, copie-la dans Codex.
pause
