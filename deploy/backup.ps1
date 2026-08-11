$ErrorActionPreference = 'Stop'

$src = Join-Path $PSScriptRoot '..\server\data'
$dest = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $PSScriptRoot '..\backups' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$target = Join-Path $dest "offerflow-$stamp.zip"
Compress-Archive -Path (Join-Path $src '*') -DestinationPath $target -Force

Get-ChildItem $dest -Filter 'offerflow-*.zip' | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7 | Remove-Item -Force

Write-Output "backup saved: $target"
