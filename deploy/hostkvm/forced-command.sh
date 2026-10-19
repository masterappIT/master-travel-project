#!/bin/sh
# Master Travel 兩個帳號的 SSH forced command（伺服器上的位置：/usr/local/bin/mastertravel-forced-command）。
# authorized_keys 指定要執行哪個腳本；不論 SSH 要求執行甚麼，都只會把參數交給該腳本，參數由腳本逐個驗證。
set -f
case "$1" in
  deploy) exec sudo -n /usr/local/sbin/mastertravel-deploy $SSH_ORIGINAL_COMMAND ;;
  mp-upload) exec sudo -n /usr/local/sbin/mastertravel-mp-upload $SSH_ORIGINAL_COMMAND ;;
  *) printf 'Unknown command.\n' >&2; exit 64 ;;
esac
