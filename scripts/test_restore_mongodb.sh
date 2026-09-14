#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${RESTORE_TEST_URI:?RESTORE_TEST_URI is required and must target an isolated test database}"
BACKUP_FILE="${1:?Usage: BACKUP_ENCRYPTION_KEY=... RESTORE_TEST_URI=... ./scripts/test_restore_mongodb.sh backup.archive.gz.enc}"

openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass env:BACKUP_ENCRYPTION_KEY -in "$BACKUP_FILE" \
  | mongorestore --uri "$RESTORE_TEST_URI" --archive --gzip --drop --stopOnError
mongosh "$RESTORE_TEST_URI" --quiet --eval "db.getCollectionNames().length > 0 || quit(2)"
printf 'Restore test passed for: %s\n' "$BACKUP_FILE"
