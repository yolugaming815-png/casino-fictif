Set-Location (Resolve-Path "$PSScriptRoot\..")
& "C:\Users\yoann\AppData\Local\OpenAI\Codex\bin\node.exe" scripts\serve-dist.mjs *> vite-dev.log
