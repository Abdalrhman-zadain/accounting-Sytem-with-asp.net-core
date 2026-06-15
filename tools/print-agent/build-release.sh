#!/usr/bin/env bash
# Optional CI/Linux helper only. On Windows use build-release.ps1 or build-release.cmd instead.
# Requires .NET 8 SDK and zip.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$ROOT/src/SimpleAccount.PrintAgent"
OUT="$ROOT/publish/win-x64"
ZIP_NAME="simple-account-print-agent.zip"
DEST="$ROOT/../../frontend/public/downloads/$ZIP_NAME"

echo "Publishing Print Agent (win-x64, self-contained)..."
EXTRA_PUBLISH_ARGS=()
if [ "$(uname -s)" != "Darwin" ] && [ "$(uname -s)" != "MINGW"* ] && [ "$(uname -s)" != "MSYS"* ]; then
  EXTRA_PUBLISH_ARGS=(-p:EnableWindowsTargeting=true)
fi
dotnet publish "$PROJECT/SimpleAccount.PrintAgent.csproj" \
  -c Release \
  -r win-x64 \
  --self-contained true \
  -p:PublishSingleFile=false \
  "${EXTRA_PUBLISH_ARGS[@]}" \
  -o "$OUT"

mkdir -p "$(dirname "$DEST")"
rm -f "$DEST"
(
  cd "$OUT"
  zip -r "$DEST" .
)

echo "Created $DEST"
echo "Deploy with the frontend build so cashiers can download from POS → Printers."
