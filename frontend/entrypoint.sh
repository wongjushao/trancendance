#!/bin/sh

set -e

PROJECT_ID="${INFISICAL_PROJECT_ID:-648fdbd7-c908-43c5-97a2-ae62d60e3422}"
INFISICAL_ENV="${INFISICAL_ENVIRONMENT:-dev}"

# Both build and start must run under infisical run. With
# `infisical run -- npm run build && npm run start`, only build gets secrets.
exec infisical run \
  --projectId="${PROJECT_ID}" \
  --env="${INFISICAL_ENV}" \
  -- sh -c 'npm run build && exec npm run start -- -H 0.0.0.0 -p 3000'