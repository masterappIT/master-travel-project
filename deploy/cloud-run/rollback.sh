#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${REGION:?Set REGION}"
: "${SERVICE_NAME:?Set SERVICE_NAME}"
: "${REVISION:?Set REVISION to a previously verified revision}"

if ! gcloud run revisions describe "$REVISION" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --service "$SERVICE_NAME" >/dev/null; then
  printf 'Revision does not belong to the target service: %s\n' "$REVISION" >&2
  exit 2
fi

gcloud run services update-traffic "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --to-revisions "${REVISION}=100"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"
SERVICE_URL="$SERVICE_URL" "$(dirname "$0")/smoke-test.sh"
