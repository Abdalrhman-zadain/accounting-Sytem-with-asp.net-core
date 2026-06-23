#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$BACKEND_DIR/.env}"
CONTAINER_NAME="${DB_BACKUP_CONTAINER_NAME:-sabina-postgres}"
TIMESTAMP="$(date +%F-%H%M%S)"
DEFAULT_OUTPUT="backups/simple-account-$TIMESTAMP.dump"
REQUESTED_OUTPUT="${1:-$DEFAULT_OUTPUT}"

if [[ "$REQUESTED_OUTPUT" = /* ]]; then
  OUTPUT_PATH="$REQUESTED_OUTPUT"
else
  OUTPUT_PATH="$REPO_ROOT/$REQUESTED_OUTPUT"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: backend env file not found at $ENV_FILE" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not available in PATH." >&2
  exit 1
fi

DATABASE_URL="$(
  grep -E '^DATABASE_URL=' "$ENV_FILE" \
    | tail -n 1 \
    | cut -d '=' -f 2- \
    | sed 's/^"//; s/"$//'
)"

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: DATABASE_URL is missing in $ENV_FILE" >&2
  exit 1
fi

DB_URL_NO_SCHEME="${DATABASE_URL#postgresql://}"
DB_URL_NO_SCHEME="${DB_URL_NO_SCHEME#postgres://}"
DB_CREDENTIALS="${DB_URL_NO_SCHEME%%@*}"
DB_HOST_AND_PATH="${DB_URL_NO_SCHEME#*@}"
DB_HOST_PORT="${DB_HOST_AND_PATH%%/*}"
DB_NAME_WITH_QUERY="${DB_HOST_AND_PATH#*/}"

DB_USER="${DB_CREDENTIALS%%:*}"
DB_PASSWORD="${DB_CREDENTIALS#*:}"
DB_HOST="${DB_HOST_PORT%%:*}"
DB_PORT="${DB_HOST_PORT##*:}"
DB_NAME="${DB_NAME_WITH_QUERY%%\?*}"

if [[ -z "$DB_USER" || -z "$DB_PASSWORD" || -z "$DB_HOST" || -z "$DB_PORT" || -z "$DB_NAME" ]]; then
  echo "Error: failed to parse DATABASE_URL from $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"

if ! DOCKER_CONTAINERS="$(docker ps --format '{{.Names}}' 2>/dev/null)"; then
  echo "Error: unable to access Docker. Check that Docker is running and your user can access /var/run/docker.sock." >&2
  exit 1
fi

if ! grep -qx "$CONTAINER_NAME" <<<"$DOCKER_CONTAINERS"; then
  echo "Error: PostgreSQL container '$CONTAINER_NAME' is not running." >&2
  echo "Start it with: docker compose up -d postgres" >&2
  exit 1
fi

echo "Creating PostgreSQL custom-format backup..."
echo "Container: $CONTAINER_NAME"
echo "Database:  $DB_NAME"
echo "Output:    $OUTPUT_PATH"

docker exec \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$CONTAINER_NAME" \
  pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -Fc > "$OUTPUT_PATH"

echo "Backup complete."
