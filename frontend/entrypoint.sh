#!/bin/sh

set -e

infisical run -- \
  npm run dev -- -H 0.0.0.0 -p 3000