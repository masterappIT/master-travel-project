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

latest_migration_execution() {
  gcloud run jobs executions list \
    --job "$MIGRATION_JOB" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --sort-by='~metadata.creationTimestamp' \
    --limit 1 \
    --format='value(metadata.name)' 2>/dev/null || true
}

report_migration_failure() {
  local execution="$1"
  printf 'Migration execution failed: job=%s execution=%s image=%s\n' \
    "$MIGRATION_JOB" "${execution:-unknown}" "$IMAGE" >&2
  if [[ -n "$execution" ]]; then
    gcloud run jobs executions describe "$execution" \
      --job "$MIGRATION_JOB" \
      --project "$PROJECT_ID" \
      --region "$REGION" \
      --format='yaml(metadata.name,status.conditions,status.failedCount,status.cancelledCount,status.completionTime)' >&2 || true
    printf 'Migration execution logs:\n' >&2
    gcloud logging read \
      "resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATION_JOB} AND labels.run.googleapis.com/execution_name=${execution}" \
      --project "$PROJECT_ID" \
      --limit 80 \
      --format='value(timestamp,textPayload,jsonPayload.message)' >&2 || true
  fi
}

migration_execution=""
set +e
gcloud run jobs execute "$MIGRATION_JOB" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --wait
migration_status=$?
set -e
if [[ "$migration_status" -ne 0 ]]; then
  migration_execution="$(latest_migration_execution)"
  report_migration_failure "$migration_execution"
  exit "$migration_status"
fi
migration_execution="$(latest_migration_execution)"
printf 'Migration completed: job=%s execution=%s image=%s\n' \
  "$MIGRATION_JOB" "${migration_execution:-unknown}" "$IMAGE"

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

REVISION="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.latestCreatedRevisionName)')"
if [[ -z "$REVISION" ]]; then
  printf 'Cloud Run did not report a created revision for %s\n' "$SERVICE_NAME" >&2
  exit 1
fi

revision_image=""
revision_ready=""
for attempt in {1..60}; do
  revision_image="$(gcloud run revisions describe "$REVISION" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(spec.containers[0].image)' 2>/dev/null || true)"
  revision_ready="$(gcloud run revisions describe "$REVISION" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format=json | python3 "$(dirname "$0")/revision-ready.py")"
  if [[ "$revision_image" == "$IMAGE" && "$revision_ready" == "True" ]]; then
    break
  fi
  sleep 5
done
if [[ "$revision_image" != "$IMAGE" || "$revision_ready" != "True" ]]; then
  printf 'Revision readiness failed: service=%s revision=%s expected_image=%s actual_image=%s ready=%s\n' \
    "$SERVICE_NAME" "$REVISION" "$IMAGE" "$revision_image" "$revision_ready" >&2
  gcloud run revisions describe "$REVISION" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='yaml(metadata.name,status.conditions,status.logUrl)' >&2 || true
  exit 1
fi
printf 'Revision ready: service=%s revision=%s image=%s\n' "$SERVICE_NAME" "$REVISION" "$IMAGE"

if [[ -z "$existing_ready_revision" ]]; then
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='value(status.url)')"
  SERVICE_URL="$SERVICE_URL" "$(dirname "$0")/smoke-test.sh"
else
  CANDIDATE_URL="$(gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='csv[no-heading](status.traffic.tag,status.traffic.url)' \
    | awk -F, '$1 == "candidate" { print $2; exit }')"
  SERVICE_URL="$CANDIDATE_URL" "$(dirname "$0")/smoke-test.sh"
fi

printf 'Promoting traffic: service=%s revision=%s image=%s percent=100\n' "$SERVICE_NAME" "$REVISION" "$IMAGE"
gcloud run services update-traffic "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --to-revisions "${REVISION}=100" \
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
if [[ "$traffic_revision" != "$REVISION" || "$traffic_percent" != "100" || "$traffic_image" != "$IMAGE" ]]; then
  printf 'Traffic verification failed: service=%s revision=%s percent=%s image=%s expected_revision=%s expected_image=%s\n' \
    "$SERVICE_NAME" "$traffic_revision" "$traffic_percent" "$traffic_image" "$REVISION" "$IMAGE" >&2
  gcloud run services describe "$SERVICE_NAME" \
    --project "$PROJECT_ID" \
    --region "$REGION" \
    --format='yaml(status.traffic,status.latestReadyRevisionName,status.latestCreatedRevisionName)' >&2 || true
  exit 1
fi
printf 'Traffic verified: service=%s revision=%s percent=%s image=%s\n' \
  "$SERVICE_NAME" "$traffic_revision" "$traffic_percent" "$traffic_image"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"
SERVICE_URL="$SERVICE_URL" "$(dirname "$0")/smoke-test.sh"
printf 'Released %s to %s image=%s\n' "$REVISION" "$SERVICE_URL" "$IMAGE"
