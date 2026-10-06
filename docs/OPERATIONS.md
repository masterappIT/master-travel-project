# 維運操作入口

本文件是發布、監控、回滾與資料庫復原的導航頁。Cloud Run 的具體命令與檢查細節以 [deploy/cloud-run/README.md](../deploy/cloud-run/README.md) 為準；完整系統部署架構以 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) 為準。

## 發布與恢復操作門檻

發布、回滾、Git 回復及事故後整合遵循 [可信基線保護與變更、恢復控管 skill](../.github/skills/verified-baseline-change-control/SKILL.md)：保護已驗收版本與未提交工作，確認變更範圍及授權，沿用現有推送即發布流程。事故恢復時才補充相關版本狀態；流量回滾不等於 Git 或資料庫回復，問題版須隔離並從可信基線選擇性整合。workflow 成功與健康端點可達不能代替正式業務驗收，執行中流程不得回報為已完成。

## 提交—推送—部署發布規範

以下是一次正式發布的完整判定鏈；任何一項未完成，都只能稱為「開發中」或「發布中」，不可稱為「已部署」或「已恢復」。

### A. 提交前：形成可追溯版本

1. 確認工作目錄、分支、HEAD 及未提交／未追蹤檔案歸屬。
2. 檢查完整 diff；不得只檢查最後一個測試或最後一個檔案。
3. 列出受影響端別、API／shared／Prisma／CI／部署範圍及排除項目。
4. 執行與範圍相符的 scope、dependency、端別驗證；單一測試通過不能代替完整驗證。
5. 只有在差異、驗證結果與提交內容一致時才建立 commit。

### B. 推送前：確認發布入口

1. 確認 commit 已包含所有要發布的修改，工作目錄乾淨。
2. 記錄完整 commit SHA，確認目前分支及目標為 `main`。
3. 確認本次推送會觸發既有 `Deploy Production` workflow；不得把本機測試、手動 image 或手動 Cloud Run 更新當成正式部署完成。
4. 推送後立即以 GitHub Actions run 的 SHA 作為唯一候選識別，不以本機 HEAD、快取的 `origin/main` 或局部測試結果替代。

### C. workflow 中：候選建置與部署

正式候選必須由同一個 workflow SHA 完成 quality gates、production builds、immutable image digests、backup、migration、revision readiness 及 smoke tests。workflow 的 stale-SHA 檢查失敗、任何 quality gate 失敗、migration 失敗或 smoke test 失敗，都代表本次發布未完成；不可跳過失敗步驟宣稱可發布。

### D. Cloud Run 流量指向：部署完成的必要證據

每個服務都必須同時核對「revision、image、traffic」三者：

| 服務 | 必須核對 |
| --- | --- |
| API | candidate revision Ready；`/health/live` 與 `/health/ready` 通過；`status.traffic` 為目標 revision 100%；revision image 為本次 SHA256 image |
| Passenger / Admin / Driver | revision Ready；`status.traffic` 為目標 revision 100%；revision image 為本次 SHA256 image；服務 URL `/` 可達 |
| Share Renderer | deployed revision Ready；revision image 為本次 SHA256 image；`status.traffic` 為目標 revision 100%；其服務 URL 與 `SHARE_RENDERER_ORIGIN` 一致；API 使用的 renderer 來源正確 |

只有 Cloud Run `status.traffic` 明確顯示目標 revision 100%，且該 revision 的 image digest 等於本次 workflow 產物，才可說「該服務已承接本次版本流量」。revision 建立成功、`latestReadyRevisionName` 正確、deploy 命令成功或正式 URL 回傳 HTTP 200，都不能單獨證明流量已切換。

### F. 現行 workflow 順序

實際執行仍以 [production workflow](../.github/workflows/deploy-production.yml) 與呼叫腳本為準，不新增手動切流量或額外發布階段：

1. `main` push 或 `workflow_dispatch`。
2. Quality gates 通過。
3. 建置前端、微信 artifact 與 immutable images。
4. 建立 Cloud SQL pre-migration backup。
5. 部署 Share Renderer，等待其 Revision Ready，核對 immutable image 並確認該 Revision 承接 100% traffic。
6. 執行 migration job；失敗即停止後續 API／前端發布。
7. 部署 API candidate、執行 health smoke tests，通過後切換 API 100% traffic 並核對 serving revision。
8. 再次確認 workflow SHA 仍為目前 `main`，部署三個前端並逐一核對 revision、traffic、image。
9. 分開回報部署證據與業務驗收；微信 artifact、體驗版上傳及正式發布不混為同一結果。

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
