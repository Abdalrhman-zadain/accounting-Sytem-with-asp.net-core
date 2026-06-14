#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/certs/qz"
DAYS="${QZ_CERT_DAYS:-3650}"
SUBJECT="${QZ_CERT_SUBJECT:-/CN=Simple Account POS/O=Simple Account/C=JO}"

mkdir -p "${CERT_DIR}"

openssl req -x509 -newkey rsa:2048 \
  -keyout "${CERT_DIR}/private-key.pem" \
  -out "${CERT_DIR}/digital-certificate.txt" \
  -days "${DAYS}" \
  -nodes \
  -subj "${SUBJECT}"

chmod 600 "${CERT_DIR}/private-key.pem"

cat <<EOF

QZ Tray certificate generated:

  Certificate: ${CERT_DIR}/digital-certificate.txt
  Private key: ${CERT_DIR}/private-key.pem

Add to backend/.env:

  QZ_CERT_PATH=${CERT_DIR}/digital-certificate.txt
  QZ_PRIVATE_KEY_PATH=${CERT_DIR}/private-key.pem

On each cashier PC (once), trust the certificate in QZ Tray:

  cd "C:\\Program Files\\QZ Tray"
  java -jar qz-tray.jar --allow "${CERT_DIR}/digital-certificate.txt"

Or use QZ Tray → Advanced → Site Manager and import the certificate.

Restart the backend after updating .env.

EOF
