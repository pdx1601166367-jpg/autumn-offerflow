#!/usr/bin/env bash
set -euo pipefail

SRC="$(dirname "$0")/../server/data"
DEST="${BACKUP_DIR:-/var/backups/offerflow}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"

tar -czf "$DEST/offerflow-$STAMP.tar.gz" -C "$SRC" .

# 只保留最近 7 份
ls -1t "$DEST"/offerflow-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "backup saved: $DEST/offerflow-$STAMP.tar.gz"
