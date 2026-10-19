#!/usr/bin/env bash
# 建立或更新 Master Travel 的兩個帳號（以 root 執行，可重複執行）：
# - deploy-mastertravel：只能執行 /usr/local/sbin/mastertravel-deploy
# - upload-mastertravel-mp：只能執行 /usr/local/sbin/mastertravel-mp-upload（小程序體驗版上傳）
# 用法：accounts.sh <master-travel-project 路徑> <部署公鑰檔> <上傳公鑰檔> [微信上傳金鑰檔]
# 兩個帳號都只能用金鑰登入，不能開 shell、不能轉發連線，不在 docker 群組，sudo 只允許各自的腳本。
# 微信上傳金鑰（可選）放到 /srv/apps/mastertravel/secrets/，用完即刪除原檔。
set -euo pipefail
[[ "${EUID}" -eq 0 ]] || { printf 'Run as root.\n' >&2; exit 2; }
SRC="${1:?repo path required}"
DEPLOY_PUB="${2:?deploy public key file required}"
UPLOAD_PUB="${3:?upload public key file required}"
WECHAT_KEY="${4:-}"
APP=/srv/apps/mastertravel
for f in "$DEPLOY_PUB" "$UPLOAD_PUB"; do
  grep -qE '^ssh-ed25519 [A-Za-z0-9+/=]+( |$)' "$f" || { printf '%s: expected one ed25519 public key.\n' "$f" >&2; exit 3; }
done

install -m 755 -o root -g root "$SRC/deploy/hostkvm/deploy.sh" /usr/local/sbin/mastertravel-deploy
install -m 755 -o root -g root "$SRC/deploy/hostkvm/mp-upload.sh" /usr/local/sbin/mastertravel-mp-upload
install -m 755 -o root -g root "$SRC/deploy/hostkvm/forced-command.sh" /usr/local/bin/mastertravel-forced-command

docker build -q -t mastertravel-mp-uploader:1.9.17 "$SRC/deploy/hostkvm/mp-uploader" >/dev/null

if [[ -n "$WECHAT_KEY" ]]; then
  # 上傳容器以 node（uid 1000）執行；secrets 目錄只有 root 能進入
  install -d -m 700 "$APP/secrets"
  install -m 400 -o 1000 -g 1000 "$WECHAT_KEY" "$APP/secrets/wechat-upload.key"
  shred -u "$WECHAT_KEY"
fi

setup_user() {
  local user="$1" pub="$2" cmd="$3" script="$4" home tmp
  id "$user" >/dev/null 2>&1 || useradd -m -s /bin/sh "$user"
  passwd -l "$user" >/dev/null
  # .ssh 由 root 擁有，帳號不能改自己的 authorized_keys
  home="$(getent passwd "$user" | cut -d: -f6)"
  install -d -m 755 -o root -g root "$home/.ssh"
  printf 'restrict,command="/usr/local/bin/mastertravel-forced-command %s" %s\n' "$cmd" "$(head -1 "$pub")" > "$home/.ssh/authorized_keys"
  chown root:root "$home/.ssh/authorized_keys"
  chmod 644 "$home/.ssh/authorized_keys"
  tmp="$(mktemp)"
  printf '%s ALL=(root) NOPASSWD: %s\n' "$user" "$script" > "$tmp"
  visudo -cqf "$tmp"
  install -m 440 -o root -g root "$tmp" "/etc/sudoers.d/$user"
  rm -f "$tmp"
}
setup_user deploy-mastertravel "$DEPLOY_PUB" deploy /usr/local/sbin/mastertravel-deploy
setup_user upload-mastertravel-mp "$UPLOAD_PUB" mp-upload /usr/local/sbin/mastertravel-mp-upload

conf=/etc/ssh/sshd_config.d/10-masterapp.conf
changed=0
for user in deploy-mastertravel upload-mastertravel-mp; do
  if ! grep -qE "^AllowUsers .*\b$user\b" "$conf"; then
    sed -i -E "s/^AllowUsers (.*)$/AllowUsers \1 $user/" "$conf"
    changed=1
  fi
done
if [[ "$changed" == 1 ]]; then
  sshd -t
  systemctl reload ssh
fi
printf 'deploy-mastertravel and upload-mastertravel-mp ready\n'
[[ -s "$APP/secrets/wechat-upload.key" ]] || printf 'Note: WeChat upload key not installed yet.\n'
