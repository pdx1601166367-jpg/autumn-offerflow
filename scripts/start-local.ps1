$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

if (-not (Test-Path (Join-Path $root 'server\.env.local'))) {
  Write-Host "提示：server/.env.local 不存在，已复制示例配置。"
  Copy-Item (Join-Path $root 'server\.env.example') (Join-Path $root 'server\.env.local')
}

Write-Host "OfferFlow 本地服务启动：http://127.0.0.1:8125"
Push-Location $root
& node server/server.js
