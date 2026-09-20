#!/usr/bin/env bash
set -euo pipefail

required=(PROJECT_ID REGION SERVICE_NAME IMAGE SERVICE_ACCOUNT)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Missing required variable: %s\n' "$name" >&2
    exit 2
  fi
done

if [[ "$IMAGE" != *@sha256:* ]]; then
  printf 'IMAGE must use an immutable sha256 digest: %s\n' "$IMAGE" >&2
  exit 2
fi

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --service-account "$SERVICE_ACCOUNT" \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  --quiet

service_url="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"
curl --fail --silent --show-error --retry 5 --retry-delay 2 \
  "$service_url/healthz" >/dev/null
printf '%s=%s\n' "$SERVICE_NAME" "$service_url"
