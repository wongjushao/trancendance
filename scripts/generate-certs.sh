#!/bin/sh

SERVICE=$1
CERT_DIR="/certs/$SERVICE"

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service-name>"
  exit 1
fi

mkdir -p "$CERT_DIR"

if [ ! -f "$CERT_DIR/cert.crt" ] || [ ! -f "$CERT_DIR/cert.key" ]; then
  echo "Generating SSL certificate for $SERVICE..."
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$CERT_DIR/cert.key" \
    -out "$CERT_DIR/cert.crt" \
    -subj "/CN=$SERVICE/O=Trancendance/C=US"
  echo "Certificate generated for $SERVICE at $CERT_DIR"
else
  echo "Certificate for $SERVICE already exists."
fi
