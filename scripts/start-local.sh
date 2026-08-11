#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$ROOT/server/.env.local" ]; then
  echo "提示：server/.env.local 不存在，已复制示例配置。"
  cp "$ROOT/server/.env.example" "$ROOT/server/.env.local"
fi

echo "OfferFlow 本地服务启动：http://127.0.0.1:8125"
cd "$ROOT"
exec node server/server.js
