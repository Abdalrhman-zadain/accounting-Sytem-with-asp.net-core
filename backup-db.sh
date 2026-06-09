#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$ROOT_DIR/backups"
CONTAINER_NAME="simple-account-postgres"
DB_NAME="simple_account"
DB_USER="simple_account_user"
TIMESTAMP="$(date +%F-%H%M%S)"
OUTPUT_PATH="${1:-$BACKUP_DIR/simple-account-$TIMESTAMP.dump}"

mkdir -p "$BACKUP_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not available in PATH." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Error: PostgreSQL container '$CONTAINER_NAME' is not running." >&2
  echo "Start it with: docker compose up -d postgres" >&2
  exit 1
fi

echo "Creating backup at: $OUTPUT_PATH"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > pwd/backup/"$OUTPUT_PATH"
echo "Backup complete."

