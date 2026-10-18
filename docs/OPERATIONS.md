# 維運操作入口

本文件是發布、監控、回滾與資料庫復原的導航頁。2026-10-18（UTC）起正式環境在 HostKVM 伺服器上運行；完整系統部署架構、伺服器上的部署與回滾命令以 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) 為準。舊的 Cloud Run 流程已停用，見 [deploy/cloud-run/README.md](../deploy/cloud-run/README.md)。

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
3. 確認本次推送會觸發 `Deploy HostKVM` workflow（`deploy-hostkvm.yml`）；不得把本機測試、手動 image 或在伺服器上手動執行的部署當成正式部署完成。部署會重新建立容器，網站會中斷幾秒到十幾秒。
4. 推送後立即以 GitHub Actions run 的 SHA 作為唯一候選識別，不以本機 HEAD、快取的 `origin/main` 或局部測試結果替代。

### C. workflow 中：候選建置與部署

正式候選必須由同一個 workflow SHA 完成 quality gates、production builds、immutable image digests、伺服器上的備份、migration、健康檢查及 smoke tests。workflow 的 stale-SHA 檢查失敗、任何 quality gate 失敗、migration 失敗、伺服器健康檢查失敗（會自動退回上一版）或 smoke test 失敗，都代表本次發布未完成；不可跳過失敗步驟宣稱可發布。

### D. 伺服器部署結果：部署完成的必要證據

伺服器上的部署腳本換上新映像並通過健康檢查，`deploy` job 才會成功。需要核對時，在伺服器上看：

| 項目 | 必須核對 |
| --- | --- |
| 部署記錄 | `/srv/apps/mastertravel/deploy.log` 有「Deploy <sha 前 12 碼> succeeded」；若是「rolled back」代表健康檢查失敗、已退回上一版 |
| 實際運行版本 | `/srv/apps/mastertravel/deploy.env` 第一行是本次 commit，5 個映像 digest 等於本次 workflow 產物 |
| 容器 | `docker compose ps` 中 5 個容器都在運行；前端顯示 healthy |
| 對外 | 4 個網域的 `/health` 或 `/` 可達；舊 run.app 網址經轉發也可達 |

workflow 成功、HTTP 200 或容器在運行，都不等於業務驗收；登入、下單、司機接單、客服、分享圖要另外實測。Cloud Run 上的轉發服務不由本 repo 部署，部署本 repo 不會改變它們。

### F. 現行 workflow 順序

實際執行以 [`deploy-hostkvm.yml`](../.github/workflows/deploy-hostkvm.yml) 與伺服器的部署腳本為準，不新增手動發布階段：

1. `main` push、`workflow_dispatch` 或每月 2 日排程。
2. Quality gates 通過。
3. `deploy` job：確認 workflow SHA 仍是目前 `main`；建置前端、微信 artifact 與 5 個 immutable images，推送至 Artifact Registry。
4. 以 `deploy-mastertravel` 帳號通知伺服器，只傳 SHA 和 digest。
5. 伺服器：拉取映像 → `pg_dump` 備份 → 用新 API 映像執行 migration（失敗即停止，不更新容器）→ 重新建立容器 → 健康檢查，失敗自動退回上一版（migration 不撤銷）。
6. 經正式網址執行 smoke tests。
7. `wechat-experience` job（排程時不執行）：建置小程序，交由伺服器以 `upload-mastertravel-mp` 帳號上傳體驗版 `0.2.<run number>`。
8. 分開回報部署證據與業務驗收；微信 artifact、體驗版上傳及正式發布不混為同一結果。

## 監控與告警

應監控 4 個網域的健康檢查、伺服器記憶體／磁碟／CPU、容器重啟、每日 GCS 備份及 GitHub Actions workflow。

截至 2026-10-19 尚未配置外部監控與告警；以上是維運要求，不代表已配置完成。

Log 不得包含 credentials、session tokens、Authorization headers 或未核准個資。

## 回滾

應用程式 regression 時，在伺服器上退回上一版映像：

```bash
cd /srv/apps/mastertravel
sudo cp deploy.env.prev deploy.env
sudo docker compose --env-file deploy.env up -d
```

或用 `sudo mastertravel-deploy <sha> <5 個 digest>` 部署某個已驗證的版本。回滾後確認 `/health` 與主要頁面，保存失敗版本的 digest、`deploy.log` 與容器 log。

已執行 migration 時，不要直接執行未審查的 down migration。優先採用 backward-compatible forward fix；資料完整性受影響時，先停止寫入，再用 `/srv/apps/mastertravel/predeploy/` 的部署前備份或每日 GCS 備份恢復，並記錄恢復點。

不要執行 `deploy/cloud-run/rollback.sh`：它會把流量切回連 Cloud SQL 的舊 API，造成資料分裂。

## Restore drill

至少每季把最新的 GCS 備份還原到伺服器上一個隔離的資料庫（MasterApp-infra 的 `backup/restore-test.sh`），執行唯讀 critical-path 檢查，記錄 RTO/RPO 後刪除隔離資料庫。

## 權限

- GitHub `production` environment 只放兩把 SSH 私鑰：部署用 `HOSTKVM_DEPLOY_SSH_KEY`、小程序上傳用 `HOSTKVM_MP_UPLOAD_SSH_KEY`。
- 伺服器上對應的 `deploy-mastertravel`、`upload-mastertravel-mp` 帳號只能執行各自的腳本，不能開 shell、不在 docker 群組。
- 正式密碼只在伺服器的 `/srv/apps/mastertravel/app.env`；小程序代碼上傳金鑰只在伺服器上。
- GCP 部署帳號 `master-travel-github-deploy` 只需要推送映像；它仍保留舊流程的 Cloud Run、Cloud SQL 權限，待移除。

## iOS App 上傳 TestFlight 前的待辦

乘客端 iOS App 目前沒有獨立的發布文件；以下是開始上傳 TestFlight 時必須先處理的事項，處理後請從本節移除。

- **清理 `src/uni_modules/ios-keyboard-accessory`**（2026-10-13 記錄）。此原生外掛原本用來移除 iOS 鍵盤上方的「上一項／下一項／完成」工具列，但它清除的是 iPad 的快捷按鈕列，對 iPhone 上這條工具列無效。該工具列現已改由 `src/pages.json` 全域樣式的 `app-plus.softinputNavBar: "none"` 關閉。
  - 清理前先在 iOS App 上確認鍵盤工具列已不再出現，並確認 App 是否需要支援 iPad；若需要支援 iPad，移除後 iPad 的快捷按鈕列會重新出現，須另行評估。
  - 清理範圍：刪除 `src/uni_modules/ios-keyboard-accessory/` 整個目錄，以及 `src/pages/login/login.vue` 與 `src/pages/login/MiniProgramLogin.vue` 中對 `disableInputAssistantToolbar` 的引入與呼叫。
  - 移除原生外掛後須重新打包 App 才會生效，並執行 `npm run verify:passenger`。
