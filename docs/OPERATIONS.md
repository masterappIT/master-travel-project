# 維運操作入口

本文件是發布、監控、回滾與資料庫復原的導航頁。Cloud Run 的具體命令與檢查細節以 [deploy/cloud-run/README.md](../deploy/cloud-run/README.md) 為準；完整系統部署架構以 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) 為準。

## 正式發布

正式發布由 `.github/workflows/deploy-production.yml` 執行：

1. `main` push 或手動觸發。
2. Quality gates 通過。
3. 建置並推送 immutable images。
4. 建立 Cloud SQL pre-migration backup。
5. 執行 migration job。
6. 部署 API candidate。
7. 執行 health smoke test。
8. 通過後切換 100% API traffic。
9. 部署三個前端服務。

## 發布後檢查

至少確認：

- API `/health/live`
- API `/health/ready`
- 前端 `/healthz`
- 登入與主要 API critical path
- Cloud Run revision、traffic 與 logs
- migration job 成功
- Cloud SQL backup 成功

## 監控與告警

監控 Cloud Run 5xx、p95 latency、instance health、startup/liveness failure、API readiness、Cloud SQL 資源與連線、backup、PITR、migration job 及 GitHub Actions workflow。

Log 不得包含 credentials、session tokens、Authorization headers 或未核准個資。

## 回滾

應用程式 regression：

```bash
PROJECT_ID=... REGION=... SERVICE_NAME=... REVISION=... \\
./deploy/cloud-run/rollback.sh
```

回滾後重新執行 live/ready smoke test，保存失敗 revision、image digest、migration execution 與 logs。

已執行 migration 時，不要直接執行未審查的 down migration。優先採用 backward-compatible forward fix；資料完整性受影響時，再依事故流程評估 backup/PITR restore。

## Restore drill

至少每季將最新 backup 或指定 PITR timestamp 還原至隔離 Cloud SQL instance，連接非 production revision，執行 readiness 與唯讀 critical-path checks，記錄 RTO/RPO 後銷毀隔離資源。

## 權限

部署帳號、API runtime account、migration account 與 renderer account 應分離。部署帳號可更新服務與執行 job，但不應直接讀取 Secret value。
