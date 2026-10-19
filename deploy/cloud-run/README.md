# Cloud Run（已停用）

> **2026-10-18（UTC）起，正式環境已搬到 HostKVM 伺服器。** 現行架構、部署、migration 與回滾見 [`docs/PRODUCTION-DEPLOYMENT.md`](../../docs/PRODUCTION-DEPLOYMENT.md)。
> 本目錄的腳本（`deploy.sh`、`rollback.sh`、`smoke-test.sh`、`revision-ready.py`）和 `.github/workflows/deploy-production.yml` 只保留作歷史參考，**不要再執行**。

## 為甚麼不能再執行

2026-10-19 已刪除這套流程用到的全部 GCP 資源（見下表），GitHub `production` 環境的 GCP 變數和 Workload Identity 也已刪除，所以 `deploy-production.yml` 和本目錄的腳本都無法再執行。正式資料在伺服器上的 PostgreSQL。

## GCP 上的資源（2026-10-19 已全部刪除）

| 資源 | 現況 |
|---|---|
| Cloud Run `master-travel-api`、`-passenger`、`-admin`、`-driver` | 已刪除。切換後只運行轉發程式，把舊 run.app 網址轉到伺服器上的新網域 |
| Cloud Run `master-travel-share-renderer`、Jobs `master-travel-migrate`、`master-travel-migrate-repair` | 已刪除 |
| Cloud SQL `master-travel-db` | 已刪除（含自動備份）。刪除前的最後匯出 `final-before-delete-20261019T013549Z.sql.gz` 和切換時的 `final-20261018T225447Z.sql.gz` 封存在 `gs://mastertravel-507211-migration/` |
| Artifact Registry `master-travel`、bucket `master-travel-share-images` | 已刪除；映像改放 GHCR，分享圖改存伺服器磁碟 |
| Secret Manager 5 個 secret | 已刪除；伺服器的 `app.env` 是唯一來源 |
| 服務帳號與 Workload Identity pool | 已刪除 |

只保留封存 bucket `gs://mastertravel-507211-migration/`：兩份資料庫匯出，以及各服務刪除前的設定（`cloudrun-before-cutover/`、`cloudrun-forwarders-before-delete/`、`cloudrun-before-final-delete/` 等）。清理記錄見 MasterApp-infra 的 `docs/step-2-master-travel.md`。

## 轉發程式（已刪除）

原本 4 個服務共用映像 `master-travel/forwarder`，以 `TARGET_HOST` 指定目標網域，讓已發出的 run.app 連結和舊版小程序繼續可用。2026-10-19 提前刪除（原定 2026-11 中下旬）：
- 舊 run.app 網址現在回應 404
- API 的 `APP_CORS_ORIGINS` 已移除 run.app 網址
- 微信公眾平台的 run.app 合法域名已刪除

## 教訓（2026-10-18 切換時）

舊流程用 `--to-revisions` 把流量固定在指定 revision。切換時新 revision 部署成功、URL 也回應 HTTP 200，但流量仍在舊 revision 上。要確認新版本已接到流量，必須看 `status.traffic`，不能只看部署結果或 HTTP 狀態。轉發服務刪除前已改為 `--to-latest`。
