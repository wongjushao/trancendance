#!/bin/sh
set -e
exec infisical run \
  --projectId=648fdbd7-c908-43c5-97a2-ae62d60e3422 \
  --env=dev \
  -- \
  /run.sh
