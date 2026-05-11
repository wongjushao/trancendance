#!/bin/sh
# Populate /certs for docker-compose: either copy from ./waf/certs (local dev) or fetch from Infisical API.
set -eu

FILES='internal-ca.crt internal-ca.key internal-services.crt internal-services.key localhost.crt localhost.key'

apk add --no-cache curl >/dev/null

: "${INFISICAL_PROJECT_ID:?INFISICAL_PROJECT_ID must be set}"

API_URL="${INFISICAL_API_URL:-https://us.infisical.com}"
API_URL="${API_URL%/}"

for pair in \
	INTERNAL_CA_CERT:internal-ca.crt \
	INTERNAL_CA_KEY:internal-ca.key \
	INTERNAL_SERVICES_CERT:internal-services.crt \
	INTERNAL_SERVICES_KEY:internal-services.key \
	LOCALHOST_CERT:localhost.crt \
	LOCALHOST_KEY:localhost.key; do
	NAME="${pair%%:*}"
	FILE="${pair#*:}"
	tmp="/tmp/curl.$$.$NAME"
	http=$(curl -sS -o "$tmp" -w "%{http_code}" -G \
		-H "Authorization: Bearer ${INFISICAL_TOKEN}" \
		--data-urlencode "projectId=${INFISICAL_PROJECT_ID}" \
		--data-urlencode "environment=${INFISICAL_ENVIRONMENT:-dev}" \
		--data-urlencode "secretPath=${INFISICAL_SECRET_PATH:-/}" \
		"${API_URL}/api/v4/secrets/${NAME}") || {
		echo "cert-fetcher: curl failed while fetching ${NAME}" >&2
		rm -f "$tmp"
		exit 1
	}
	if [ "$http" != "200" ]; then
		echo "cert-fetcher: Infisical rejected GET ${NAME} (HTTP ${http})." >&2
		msg=$(sed -n 's/.*"message":"\([^"]*\)".*/\1/p' "$tmp" | head -n1)
		if [ -n "$msg" ]; then
			echo "cert-fetcher: ${msg}" >&2
		fi
		echo "cert-fetcher: check secrets exist at secretPath=${INFISICAL_SECRET_PATH:-/}, environment=${INFISICAL_ENVIRONMENT:-dev}, and INFISICAL_API_URL (${API_URL}) matches your Infisical region." >&2
		rm -f "$tmp"
		exit 1
	fi
	val=$(sed -n 's/.*"secretValue":"\([^"]*\)".*/\1/p' "$tmp")
	rm -f "$tmp"
	if [ -z "$val" ]; then
		echo "cert-fetcher: could not parse secretValue for ${NAME}" >&2
		exit 1
	fi
	printf '%s' "$val" | sed 's/\\n/\n/g' >"/certs/${FILE}"
	if [ ! -s "/certs/${FILE}" ]; then
		echo "cert-fetcher: wrote empty file for ${NAME} → /certs/${FILE}" >&2
		exit 1
	fi
done

echo "cert-fetcher: fetched TLS material from Infisical."
