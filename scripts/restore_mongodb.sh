#!/usr/bin/env bash
set -euo pipefail

: "${MONGO_URI:?MONGO_URI is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
BACKUP_FILE="${1:?Usage: MONGO_URI=... BACKUP_ENCRYPTION_KEY=... ./scripts/restore_mongodb.sh backup.archive.gz.enc}"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -in "$BACKUP_FILE" \
  | mongorestore --uri "$MONGO_URI" --archive --gzip --drop
printf 'Restore completed from: %s\n' "$BACKUP_FILE"
