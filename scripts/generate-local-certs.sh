#!/usr/bin/env bash

set -euo pipefail

CERT_DIR="waf/certs"
CRT_PATH="${CERT_DIR}/localhost.crt"
KEY_PATH="${CERT_DIR}/localhost.key"
CA_KEY_PATH="${CERT_DIR}/internal-ca.key"
CA_CRT_PATH="${CERT_DIR}/internal-ca.crt"
SERVICE_KEY_PATH="${CERT_DIR}/internal-services.key"
SERVICE_CSR_PATH="${CERT_DIR}/internal-services.csr"
SERVICE_CRT_PATH="${CERT_DIR}/internal-services.crt"
SERVICE_EXT_PATH="${CERT_DIR}/internal-services.ext"

mkdir -p "${CERT_DIR}"

openssl req \
  -x509 \
  -nodes \
  -newkey rsa:2048 \
  -keyout "${KEY_PATH}" \
  -out "${CRT_PATH}" \
  -days 365 \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Generated ${CRT_PATH} and ${KEY_PATH}"

openssl genrsa -out "${CA_KEY_PATH}" 4096

openssl req \
  -x509 \
  -new \
  -nodes \
  -key "${CA_KEY_PATH}" \
  -sha256 \
  -days 3650 \
  -out "${CA_CRT_PATH}" \
  -subj "/CN=trancendance-internal-ca"

openssl req \
  -new \
  -newkey rsa:2048 \
  -nodes \
  -keyout "${SERVICE_KEY_PATH}" \
  -out "${SERVICE_CSR_PATH}" \
  -subj "/CN=auth-service"

cat > "${SERVICE_EXT_PATH}" <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = auth-service
DNS.3 = chat-service
DNS.4 = org-service
DNS.5 = notification-service
DNS.6 = prometheus
DNS.7 = grafana
DNS.8 = waf-proxy
IP.1 = 127.0.0.1
EOF

openssl x509 \
  -req \
  -in "${SERVICE_CSR_PATH}" \
  -CA "${CA_CRT_PATH}" \
  -CAkey "${CA_KEY_PATH}" \
  -CAcreateserial \
  -out "${SERVICE_CRT_PATH}" \
  -days 825 \
  -sha256 \
  -extfile "${SERVICE_EXT_PATH}"

rm -f "${SERVICE_CSR_PATH}" "${SERVICE_EXT_PATH}" "${CERT_DIR}/internal-ca.srl"

chmod 644 "${CRT_PATH}" "${KEY_PATH}" "${CA_CRT_PATH}" "${CA_KEY_PATH}" "${SERVICE_CRT_PATH}" "${SERVICE_KEY_PATH}"

echo "Generated ${CA_CRT_PATH}, ${SERVICE_CRT_PATH}, and ${SERVICE_KEY_PATH}"
