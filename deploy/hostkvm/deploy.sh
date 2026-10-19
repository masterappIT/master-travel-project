#!/usr/bin/env bash
# Master Travel 部署（伺服器上的位置：/usr/local/sbin/mastertravel-deploy，root 執行）。
# 由 master-travel-project 的 deploy-hostkvm.yml 經 deploy-mastertravel 帳號呼叫，也可以手動執行。
# 用法：mastertravel-deploy <提交 SHA> <api> <share-renderer> <passenger> <admin> <driver>
# 後 5 個是映像 digest（sha256:<64 hex>），映像一律從 GHCR 的 ghcr.io/masterappit/master-travel-* 拉。
# GHCR 是私人倉庫。workflow 把當次的 GITHUB_TOKEN 從標準輸入傳進來，只用來拉這次的映像：
# 登入資料放在臨時目錄，拉完即刪除，token 也會在 workflow 結束後失效；伺服器上不保存任何 GHCR 登入。
# 手動執行時不用給 token，但映像必須已經在伺服器上（例如重新部署最近用過的版本）。
# 步驟：拉映像 → 備份資料庫 → migration → 更新容器 → 健康檢查，失敗就退回上一版（migration 不會撤銷）。
set -euo pipefail
umask 022
APP=/srv/apps/mastertravel
INFRA=/srv/infra
REPO=ghcr.io/masterappit
BACKUPS="$APP/predeploy"
KEEP=5
SERVICES=(api share-renderer passenger admin driver)
VARS=(API_IMAGE SHARE_RENDERER_IMAGE PASSENGER_IMAGE ADMIN_IMAGE DRIVER_IMAGE)

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$APP/deploy.log"; }
die() { log "FAILED: $1"; exit "${2:-1}"; }
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root.\n' >&2; exit 2; }
[[ $# -eq 6 ]] || { printf 'Usage: mastertravel-deploy <sha> <api> <share-renderer> <passenger> <admin> <driver>\n' >&2; exit 64; }

exec 9>/run/mastertravel-deploy.lock
flock -n 9 || { printf 'Another deploy is running.\n' >&2; exit 75; }

sha="$1"; shift
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { printf 'Invalid commit SHA.\n' >&2; exit 64; }
digests=("$@")
for d in "${digests[@]}"; do
  [[ "$d" =~ ^sha256:[0-9a-f]{64}$ ]] || { printf 'Invalid image digest.\n' >&2; exit 64; }
done
token=""
if [[ ! -t 0 ]]; then
  IFS= read -r -t 10 token || true
  [[ -z "$token" || "$token" =~ ^gh[a-z]_[A-Za-z0-9_]{20,255}$ ]] || { printf 'Invalid registry token.\n' >&2; exit 64; }
fi

compose() { docker compose --project-directory "$APP" -f "$APP/compose.yaml" --env-file "$1" "${@:2}"; }
infra() { docker compose -f "$INFRA/compose.yaml" --env-file "$INFRA/.env" "$@"; }

# API 和前端經 Caddy 容器檢查；share-renderer 只在內部網絡，經 API 容器檢查
healthy() {
  infra exec -T caddy wget -qO- http://master-travel-api:8080/health 2>/dev/null | grep -q '"status":"ok"' || return 1
  local s
  for s in passenger admin driver; do
    infra exec -T caddy wget -q --spider "http://master-travel-$s:8080/healthz" 2>/dev/null || return 1
  done
  docker exec master-travel-api node -e \
    'fetch("http://master-travel-share-renderer:8080/health/live").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' \
    2>/dev/null || return 1
}
wait_healthy() {
  local i
  for i in $(seq 1 24); do
    healthy && return 0
    sleep 5
  done
  return 1
}

new="$(mktemp "$APP/deploy.env.XXXXXX")"
trap 'rm -f "$new"' EXIT
{
  printf '# 由 deploy-hostkvm.yml 部署：提交 %s，%s\n' "$sha" "$(date -u +%FT%TZ)"
  for i in "${!SERVICES[@]}"; do
    printf '%s=%s/master-travel-%s@%s\n' "${VARS[$i]}" "$REPO" "${SERVICES[$i]}" "${digests[$i]}"
  done
} > "$new"
chmod 644 "$new"

log "Deploy ${sha:0:12} started"
pull() {
  local cfg img status=0
  if [[ -z "$token" ]]; then
    # 手動執行：不拉取，只確認映像都已在伺服器上
    for img in $(compose "$new" config --images); do
      docker image inspect "$img" >/dev/null 2>&1 || { log "Image not on this server: $img"; return 1; }
    done
    return 0
  fi
  cfg="$(mktemp -d)"
  printf '%s' "$token" | DOCKER_CONFIG="$cfg" docker login ghcr.io --username x-access-token --password-stdin >/dev/null || status=$?
  [[ "$status" -eq 0 ]] && { DOCKER_CONFIG="$cfg" compose "$new" pull --quiet || status=$?; }
  rm -rf "$cfg"
  return "$status"
}
pull || die 'image pull failed'
token=""

install -d -m 700 "$BACKUPS"
dump="$BACKUPS/$(date -u +%Y%m%dT%H%M%SZ)-${sha:0:12}.dump"
infra exec -T postgres pg_dump -U postgres -Fc master_travel > "$dump" || die 'database backup failed'
[[ -s "$dump" ]] || die 'database backup is empty'
chmod 600 "$dump"
ls -1t "$BACKUPS"/*.dump | tail -n +$((KEEP + 1)) | xargs -r rm -f
log "Database backed up to $dump"

# migration 用新的 API 映像執行；失敗時容器還沒更新，舊版繼續運行
compose "$new" run --rm --no-deps api npm run prisma:migrate:deploy || die "migration failed; nothing deployed; database backup: $dump"
log "Migrations applied"

cp -p "$APP/deploy.env" "$APP/deploy.env.prev"
mv "$new" "$APP/deploy.env"
trap - EXIT
compose "$APP/deploy.env" up -d --remove-orphans --quiet-pull

if wait_healthy; then
  compose "$APP/deploy.env" ps --format '{{.Service}} {{.Status}}'
  log "Deploy ${sha:0:12} succeeded"
  exit 0
fi

log "Health check failed; rolling back to the previous images"
compose "$APP/deploy.env" logs --tail 30 api || true
mv "$APP/deploy.env" "$APP/deploy.env.failed"
cp -p "$APP/deploy.env.prev" "$APP/deploy.env"
compose "$APP/deploy.env" up -d --remove-orphans --quiet-pull
if wait_healthy; then
  die "deploy ${sha:0:12} rolled back; migrations stay applied; database backup: $dump" 1
fi
die "deploy ${sha:0:12} rolled back but still unhealthy; database backup: $dump" 2
