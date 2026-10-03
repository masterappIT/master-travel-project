# 維運操作入口

本文件是發布、監控、回滾與資料庫復原的導航頁。Cloud Run 的具體命令與檢查細節以 [deploy/cloud-run/README.md](../deploy/cloud-run/README.md) 為準；完整系統部署架構以 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) 為準。

## 發布與恢復操作門檻

發布、回滾、Git 回復及事故後整合遵循 [可信基線保護與變更、恢復控管 skill](../.github/skills/verified-baseline-change-control/SKILL.md)：保護已驗收版本與未提交工作，確認變更範圍及授權，沿用現有推送即發布流程。事故恢復時才補充相關版本狀態；流量回滾不等於 Git 或資料庫回復，問題版須隔離並從可信基線選擇性整合。workflow 成功與健康端點可達不能代替正式業務驗收，執行中流程不得回報為已完成。

## 正式發布

### 現行流程與文件邊界

以下僅記錄目前文件所描述的既有操作順序，不逆轉「推送即發布」，也不把文件要求擴大成新的候選發布、人工切流量或額外審批流程。執行前仍以 [production workflow](../.github/workflows/deploy-production.yml) 與其呼叫腳本為準；本文件不是雲端現況證據：

1. `main` push 或手動觸發。
2. Quality gates 通過。
3. 建置並推送 immutable images。
4. 建立 Cloud SQL pre-migration backup。
5. 部署 Share Renderer。
6. 執行 migration job；失敗會中止後續發布，但不自動回滾已更新的 Renderer。
7. 部署 API candidate（首次部署沒有既有 revision，直接建立服務並檢查）。
8. 執行 health smoke test。
9. 通過後切換 100% API traffic，並再次檢查正式 API URL。
10. 部署三個前端服務。

「candidate」在此沿用既有 workflow 的服務部署名稱，不代表要求新增 Cloud Run 候選階段。此次事故教訓只限於：回滾後流量可能仍固定在舊 Revision；新版本部署成功或正式網址 HTTP 200，不能單獨證明新版已承接流量。這是查核限制，不是要求使用者手動切流量或修改不在控制範圍內的腳本／workflow。

## 發布後檢查

### 版本與流量查核邊界

發布結果依既有 workflow 回報，不另設全服務候選驗證表或新的發布階段。查核回滾後版本是否生效時，依可取得的證據核對本次產物、Revision 與實際 `status.traffic`，並區分部署結果與業務驗收；未知就標明未驗證，不宣稱已恢復，也不擅自切流量。

現有版本指向正確時，不因歷史事故再次回滾或切換。超出控制範圍的腳本、workflow 或正式環境問題只回報，不把額外操作轉交使用者；不增加前端啟動負擔。

既有發布後檢查項目：

- API `/health/live`
- API `/health/ready`
- 前端 `/healthz`
- 登入與主要 API critical path
- Cloud Run revision、traffic 與 logs
- migration job 成功
- Cloud SQL backup 成功

## 監控與告警

監控 Cloud Run 5xx、p95 latency、instance health、startup/liveness failure、API readiness、Cloud SQL 資源與連線、backup、PITR、migration job 及 GitHub Actions workflow。

以上是維運要求，不代表已配置完成；須查驗實際雲端 dashboards、告警、檢查排程、備份與 PITR 設定。

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

這是權限原則，腳本未強制帳號彼此不同；workflow 未設定 `GCP_SHARE_RENDERER_SERVICE_ACCOUNT` 時會使用 API runtime 帳號。實際隔離狀態須查驗 IAM 設定。
