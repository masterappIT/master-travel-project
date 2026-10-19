#!/usr/bin/env bash
# 小程序體驗版上傳（伺服器上的位置：/usr/local/sbin/mastertravel-mp-upload，root 執行）。
# 由 master-travel-project 的 workflow 經 upload-mastertravel-mp 帳號呼叫。
# 用法：mastertravel-mp-upload <版本 x.y.z> <提交 SHA>，stdin 是 dist/build/mp-weixin 的 tar.gz（最大 50MB）。
# 上傳金鑰只在伺服器上；微信的上傳 IP 白名單只需要這部伺服器的 IP。
# 上傳在隔離的容器內執行：唯讀檔案系統、沒有任何權限、只掛載這次的編譯結果和金鑰。
set -euo pipefail
APP=/srv/apps/mastertravel
KEY="$APP/secrets/wechat-upload.key"
IMAGE=mastertravel-mp-uploader:1.9.17
APPID=wxb52b590dd65cfa4f
ROBOT=1
MAX_BYTES=$((50 * 1024 * 1024))

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$APP/mp-upload.log"; }
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root.\n' >&2; exit 2; }
[[ $# -eq 2 ]] || { printf 'Usage: mastertravel-mp-upload <version> <sha> < build.tar.gz\n' >&2; exit 64; }
version="$1"; sha="$2"
[[ "$version" =~ ^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,6}$ ]] || { printf 'Invalid version.\n' >&2; exit 64; }
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { printf 'Invalid commit SHA.\n' >&2; exit 64; }
[[ -s "$KEY" ]] || { printf 'Upload key missing on server.\n' >&2; exit 3; }

exec 9>/run/mastertravel-mp-upload.lock
flock -n 9 || { printf 'Another upload is running.\n' >&2; exit 75; }

work="$(mktemp -d /var/tmp/mastertravel-mp.XXXXXX)"
trap 'rm -rf "$work"' EXIT
head -c $((MAX_BYTES + 1)) > "$work/build.tar.gz"
size="$(stat -c %s "$work/build.tar.gz")"
(( size > 0 && size <= MAX_BYTES )) || { printf 'Upload must be 1 byte to 50MB.\n' >&2; exit 65; }

mkdir "$work/project"
# 只接受一般檔案和目錄；GNU tar 會拒絕含 .. 的路徑並去掉開頭的 /
tar -xzf "$work/build.tar.gz" -C "$work/project" --no-same-owner --no-same-permissions --no-overwrite-dir
if find "$work/project" ! -type f ! -type d | grep -q .; then
  printf 'Archive may only contain files and directories.\n' >&2; exit 65
fi
# macOS 的 tar 會加入 ._* 資料檔，微信工具會把它當成頁面設定而失敗
find "$work/project" -type f -name '._*' -delete
[[ -f "$work/project/app.json" ]] || { printf 'app.json missing: not a mini-program build.\n' >&2; exit 65; }
chown -R 1000:1000 "$work/project"

log "Upload $version (${sha:0:12}) started, $size bytes"
docker run --rm --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges \
  --memory 1g --pids-limit 256 -e HOME=/tmp \
  -e WECHAT_APPID="$APPID" -e WECHAT_MP_VERSION="$version" -e WECHAT_MP_DESC="main-$sha" -e WECHAT_MP_ROBOT="$ROBOT" \
  -v "$work/project:/project" -v "$KEY:/run/secrets/wechat-upload.key:ro" \
  "$IMAGE" || { log "Upload $version failed"; exit 1; }
log "Upload $version succeeded"
