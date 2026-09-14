#!/usr/bin/env bash
set -euo pipefail

: "${MONGO_URI:?MONGO_URI is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="$BACKUP_DIR/icams-$STAMP.archive.gz.enc"

mongodump --uri "$MONGO_URI" --archive --gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -out "$TARGET"

find "$BACKUP_DIR" -type f -name 'icams-*.archive.gz.enc' -mtime "+$RETENTION_DAYS" -delete
printf 'Created encrypted backup: %s\n' "$TARGET"
