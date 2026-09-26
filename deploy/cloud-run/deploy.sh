#!/usr/bin/env bash
set -euo pipefail

required=(
  PROJECT_ID REGION SERVICE_NAME MIGRATION_JOB IMAGE CLOUD_SQL_INSTANCE
  SERVICE_ACCOUNT MIGRATION_SERVICE_ACCOUNT DATABASE_SECRET
  ADMIN_USERNAME ADMIN_PASSWORD_SECRET ADMIN_SESSION_SECRET AMAP_WEB_SERVICE_KEY_SECRET
  APP_CORS_ORIGINS DRIVER_ORDER_URL_BASE SHARE_RENDERER_ORIGIN SHARE_IMAGE_BUCKET
  SHARE_RENDERER_SERVICE_NAME SHARE_RENDERER_IMAGE SHARE_RENDERER_SERVICE_ACCOUNT
)
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

gcloud run deploy "$SHARE_RENDERER_SERVICE_NAME" \
  --project "$PROJECT_ID" --region "$REGION" --image "$SHARE_RENDERER_IMAGE" \
  --service-account "$SHARE_RENDERER_SERVICE_ACCOUNT" --memory 1Gi --concurrency 1 \
  --min-instances 1 --max-instances 3 \
  --set-env-vars "DRIVER_ORDER_URL_BASE=${DRIVER_ORDER_URL_BASE},SHARE_IMAGE_BUCKET=${SHARE_IMAGE_BUCKET}" \
  --startup-probe "httpGet.path=/health/live,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=3,periodSeconds=5,failureThreshold=12" \
  --allow-unauthenticated --quiet

RENDERER_URL="$(gcloud run services describe "$SHARE_RENDERER_SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"
if [[ "$SHARE_RENDERER_ORIGIN" != "$RENDERER_URL" ]]; then
  printf 'Warning: SHARE_RENDERER_ORIGIN (%s) differs from deployed renderer URL (%s)\n' "$SHARE_RENDERER_ORIGIN" "$RENDERER_URL" >&2
fi

gcloud run jobs deploy "$MIGRATION_JOB" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --image "$IMAGE" \
  --service-account "$MIGRATION_SERVICE_ACCOUNT" \
  --set-cloudsql-instances "$CLOUD_SQL_INSTANCE" \
  --set-secrets "DATABASE_URL=${DATABASE_SECRET}:latest" \
  --command npm \
  --args run,prisma:migrate:deploy \
  --max-retries 0 \
  --task-timeout 15m \
  --quiet

gcloud run jobs execute "$MIGRATION_JOB" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --wait

deploy_args=(
  run deploy "$SERVICE_NAME"
  --project "$PROJECT_ID"
  --region "$REGION"
  --image "$IMAGE"
  --service-account "$SERVICE_ACCOUNT"
  --set-cloudsql-instances "$CLOUD_SQL_INSTANCE"
  --set-env-vars "^@^NODE_ENV=production@ADMIN_USERNAME=${ADMIN_USERNAME}@APP_CORS_ORIGINS=${APP_CORS_ORIGINS}@DRIVER_ORDER_URL_BASE=${DRIVER_ORDER_URL_BASE}@SHARE_RENDERER_ORIGIN=${SHARE_RENDERER_ORIGIN}"
  --set-secrets "DATABASE_URL=${DATABASE_SECRET}:latest,ADMIN_PASSWORD=${ADMIN_PASSWORD_SECRET}:latest,ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}:latest,AMAP_WEB_SERVICE_KEY=${AMAP_WEB_SERVICE_KEY_SECRET}:latest"
  --startup-probe "httpGet.path=/health/live,httpGet.port=8080,initialDelaySeconds=0,timeoutSeconds=3,periodSeconds=5,failureThreshold=12"
  --liveness-probe "httpGet.path=/health/live,httpGet.port=8080,initialDelaySeconds=10,timeoutSeconds=3,periodSeconds=10,failureThreshold=3"
  --allow-unauthenticated
  --quiet
)

existing_ready_revision="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.latestReadyRevisionName)' 2>/dev/null || true)"
if [[ -n "$existing_ready_revision" ]]; then
  deploy_args+=(--no-traffic --tag candidate)
fi

gcloud "${deploy_args[@]}"

if [[ -z "$existing_ready_revision" ]]; then
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(status.url)')"
  SERVICE_URL="$SERVICE_URL" "$(dirname "$0")/smoke-test.sh"
  REVISION="$(gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(status.latestReadyRevisionName)')"
  printf 'Released %s to %s\n' "$REVISION" "$SERVICE_URL"
  exit 0
fi

CANDIDATE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='csv[no-heading](status.traffic.tag,status.traffic.url)' \
  | awk -F, '$1 == "candidate" { print $2; exit }')"
SERVICE_URL="$CANDIDATE_URL" "$(dirname "$0")/smoke-test.sh"

REVISION="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.latestReadyRevisionName)')"
gcloud run services update-traffic "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --to-revisions "${REVISION}=100" \
  --quiet

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"
SERVICE_URL="$SERVICE_URL" "$(dirname "$0")/smoke-test.sh"
printf 'Released %s to %s\n' "$REVISION" "$SERVICE_URL"
