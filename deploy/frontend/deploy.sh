#!/usr/bin/env bash
set -euo pipefail

required=(PROJECT_ID REGION SERVICE_NAME IMAGE SERVICE_ACCOUNT API_ORIGIN)
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
  --set-env-vars "API_ORIGIN=$API_ORIGIN" \
  --no-traffic \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  --quiet

revision="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.latestCreatedRevisionName)')"
if [[ -z "$revision" ]]; then
  printf 'Cloud Run did not report a created revision for %s\n' "$SERVICE_NAME" >&2
  exit 1
fi

revision_image=""
revision_ready=""
for attempt in {1..60}; do
  revision_image="$(gcloud run revisions describe "$revision" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(spec.containers[0].image)' 2>/dev/null || true)"
  revision_ready="$(gcloud run revisions describe "$revision" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format=json | python3 "$(dirname "$0")/../cloud-run/revision-ready.py")"
  if [[ "$revision_image" == "$IMAGE" && "$revision_ready" == "True" ]]; then
    break
  fi
  sleep 5
done
if [[ "$revision_image" != "$IMAGE" || "$revision_ready" != "True" ]]; then
  printf 'Revision %s did not become ready with image %s\n' "$revision" "$IMAGE" >&2
  exit 1
fi

gcloud run services update-traffic "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --to-revisions "${revision}=100" \
  --quiet

traffic_revision="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.traffic[0].revisionName)')"
traffic_percent="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.traffic[0].percent)')"
traffic_image="$(gcloud run revisions describe "$traffic_revision" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(spec.containers[0].image)')"
if [[ "$traffic_revision" != "$revision" || "$traffic_percent" != "100" || "$traffic_image" != "$IMAGE" ]]; then
  printf 'Traffic verification failed for %s: revision=%s percent=%s image=%s expected_revision=%s expected_image=%s\n' \
    "$SERVICE_NAME" "$traffic_revision" "$traffic_percent" "$traffic_image" "$revision" "$IMAGE" >&2
  exit 1
fi

service_url="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"
curl --fail --silent --show-error --retry 5 --retry-delay 2 \
  "$service_url/" >/dev/null
printf '%s=%s revision=%s image=%s\n' "$SERVICE_NAME" "$service_url" "$revision" "$IMAGE"
