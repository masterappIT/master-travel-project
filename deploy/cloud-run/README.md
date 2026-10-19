# Cloud Run（已停用）

> **2026-10-18（UTC）起，正式環境已搬到 HostKVM 伺服器。** 現行架構、部署、migration 與回滾見 [`docs/PRODUCTION-DEPLOYMENT.md`](../../docs/PRODUCTION-DEPLOYMENT.md)。
> 本目錄的腳本（`deploy.sh`、`rollback.sh`、`smoke-test.sh`、`revision-ready.py`）和 `.github/workflows/deploy-production.yml` 只保留作歷史參考，**不要再執行**。

## 為甚麼不能再執行

`deploy.sh` 會把 API 部署回 Cloud Run，連接舊的 Cloud SQL。正式資料現在在伺服器上的 PostgreSQL，Cloud SQL 停在 2026-10-18 22:54 UTC 的狀態。如果再執行，部分用戶會寫入舊資料庫，資料會分裂成兩份。

`rollback.sh` 會把流量切回某個舊的 API revision，同樣會連回 Cloud SQL。

## Cloud Run 上現在剩下甚麼

| 資源 | 現況 |
|---|---|
| `master-travel-api`、`-passenger`、`-admin`、`-driver` | 2026-10-19 已刪除。之前只運行轉發程式，把舊 run.app 網址轉到伺服器上的新網域；刪除前的設定備份在 `gs://mastertravel-507211-migration/cloudrun-forwarders-before-delete/` |
| `master-travel-share-renderer` | 已不再被使用，等 GCP 清理時刪除 |
| `master-travel-migrate`、`master-travel-migrate-repair`（Jobs） | 已不再被使用，等 GCP 清理時刪除 |
| Cloud SQL `master-travel-db` | 停在切換時的狀態，作為後備；等 GCP 清理時先做最後備份再刪除 |
| Secret Manager 的 5 個 secret | 已不再被使用；值已抄到伺服器的 `app.env` |

切換前 4 個服務的設定備份在 `gs://mastertravel-507211-migration/cloudrun-before-cutover/`。

## 轉發程式（已刪除）

原本 4 個服務共用映像 `master-travel/forwarder`，以 `TARGET_HOST` 指定目標網域，讓已發出的 run.app 連結和舊版小程序繼續可用。2026-10-19 提前刪除（原定 2026-11 中下旬）：
- 舊 run.app 網址現在回應 404
- API 的 `APP_CORS_ORIGINS` 已移除 run.app 網址
- 微信公眾平台的 run.app 合法域名已刪除

## 教訓（2026-10-18 切換時）

舊流程用 `--to-revisions` 把流量固定在指定 revision。切換時新 revision 部署成功、URL 也回應 HTTP 200，但流量仍在舊 revision 上。要確認新版本已接到流量，必須看 `status.traffic`，不能只看部署結果或 HTTP 狀態。轉發服務刪除前已改為 `--to-latest`。
