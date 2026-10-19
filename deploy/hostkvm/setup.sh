#!/usr/bin/env bash
# Master Travel 首次安裝（以 root 執行，可重複執行）。
# 用法：setup.sh <master-travel-project 路徑> <secrets 檔> [資料庫 SQL 匯出檔 .sql.gz]
# - secrets 檔：從 Secret Manager 原樣抄過來的 ADMIN_PASSWORD、ADMIN_SESSION_SECRET、
#   SUPPORT_AGENT_SESSION_SECRET、AMAP_WEB_SERVICE_KEY（KEY=VALUE，一行一個）。用完即刪除。
# - 資料庫密碼是新的（新資料庫）。
# - 匯出檔只在 master_travel 資料庫還沒有任何表時才匯入；之後要重新匯入，先刪除資料庫。
set -euo pipefail
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root.\n' >&2; exit 2; }
SRC="${1:?repo path required}"
SECRETS="${2:?secrets file required}"
DUMP="${3:-}"
APP=/srv/apps/mastertravel
INFRA=/srv/infra
# 3 個前端網域（舊的 run.app 網址已在 2026-10-19 刪除）
CORS='https://mastertravelapp.masterappinc.com,https://mastertraveladmin.masterappinc.com,https://mastertraveldriver.masterappinc.com'
psql_infra() { docker compose -f "$INFRA/compose.yaml" --env-file "$INFRA/.env" exec -T postgres psql -U postgres -v ON_ERROR_STOP=1 "$@"; }
compose() { docker compose --project-directory "$APP" -f "$APP/compose.yaml" --env-file "$APP/deploy.env" "$@"; }

install -d -m 755 /srv/apps "$APP"
install -m 644 "$SRC/deploy/hostkvm/compose.yaml" "$APP/compose.yaml"
# deploy.env 只在第一次安裝時放入；之後由部署腳本更新，重新執行不會退回舊版本
[[ -f "$APP/deploy.env" ]] || install -m 644 "$SRC/deploy/hostkvm/deploy.env" "$APP/deploy.env"
# 共用 Caddy 會載入 /srv/infra/sites/*.caddy；網域設定的來源在本 repo
install -m 644 "$SRC/deploy/hostkvm/master-travel.caddy" "$INFRA/sites/master-travel.caddy"

if [[ ! -f "$APP/app.env" ]]; then
  for k in ADMIN_PASSWORD ADMIN_SESSION_SECRET SUPPORT_AGENT_SESSION_SECRET AMAP_WEB_SERVICE_KEY; do
    grep -q "^$k=." "$SECRETS" || { printf '%s missing in secrets file\n' "$k" >&2; exit 3; }
  done
  umask 077
  db_pw="$(openssl rand -hex 24)"
  if [[ "$(psql_infra -Atc "select 1 from pg_roles where rolname='master_travel'")" == 1 ]]; then
    psql_infra -qc "alter role master_travel with login password '$db_pw'"
  else
    psql_infra -qc "create role master_travel with login password '$db_pw'"
  fi
  [[ "$(psql_infra -Atc "select 1 from pg_database where datname='master_travel'")" == 1 ]] || psql_infra -qc "create database master_travel owner master_travel"
  {
    cat <<EOF
NODE_ENV=production
PORT=8080
ADMIN_USERNAME=admin
APP_CORS_ORIGINS=$CORS
DRIVER_ORDER_URL_BASE=https://mastertraveldriver.masterappinc.com/order-invite
SHARE_RENDERER_ORIGIN=http://master-travel-share-renderer:8080
DATABASE_URL=postgresql://master_travel:$db_pw@postgres:5432/master_travel?schema=public
EOF
    grep -E '^(ADMIN_PASSWORD|ADMIN_SESSION_SECRET|SUPPORT_AGENT_SESSION_SECRET|AMAP_WEB_SERVICE_KEY)=' "$SECRETS"
  } > "$APP/app.env"
  chmod 600 "$APP/app.env"
  printf 'Wrote %s/app.env (new database password, other secrets copied)\n' "$APP"
fi
[[ -f "$SECRETS" ]] && shred -u "$SECRETS"

tables="$(psql_infra -d master_travel -Atc "select count(*) from information_schema.tables where table_schema='public'")"
if [[ "$tables" == 0 && -n "$DUMP" ]]; then
  # Cloud SQL 的匯出帶有舊帳號的擁有權和授權，這裏不存在那些角色，所以去掉；物件由 master_travel 擁有
  gunzip -c "$DUMP" \
    | grep -vE '^(ALTER [A-Z ]+ OWNER TO|GRANT |REVOKE )|cloudsqlsuperuser' \
    | docker compose -f "$INFRA/compose.yaml" --env-file "$INFRA/.env" exec -T postgres psql -U master_travel -d master_travel -v ON_ERROR_STOP=1 -q
  printf 'Restored database from %s\n' "$DUMP"
fi

compose pull --quiet
compose run --rm --no-deps api npm run prisma:migrate:deploy
compose up -d --remove-orphans
docker compose -f "$INFRA/compose.yaml" --env-file "$INFRA/.env" exec -T caddy caddy reload --config /etc/caddy/Caddyfile
compose ps --format '{{.Service}} {{.Status}}'
