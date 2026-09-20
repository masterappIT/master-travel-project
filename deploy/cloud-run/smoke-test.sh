#!/usr/bin/env bash
set -euo pipefail

: "${SERVICE_URL:?Set SERVICE_URL to the deployed API URL}"

request() {
  local path="$1"
  curl --fail --silent --show-error \
    --connect-timeout 5 \
    --max-time 15 \
    --retry 4 \
    --retry-all-errors \
    "${SERVICE_URL%/}${path}"
}

request /health/live >/dev/null
request /health/ready >/dev/null
request '/location/reverse-geocode?latitude=22.3193&longitude=114.1694' >/dev/null
printf 'Smoke tests passed for %s\n' "$SERVICE_URL"
