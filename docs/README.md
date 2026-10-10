# 開發文件索引

本目錄集中管理專案的架構、開發、API 與正式環境操作文件。根目錄 [README.md](../README.md) 是專案入口；本頁是詳細文件索引。

## 核心文件

| 文件 | 用途 |
|---|---|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | 本機開發、服務啟動、環境變數與驗證流程 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 前後端、資料庫、產品區域與部署邊界 |
| [API.md](./API.md) | API 責任邊界、認證、CORS、資料契約原則 |
| [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) | 正式環境完整部署架構與 CI/CD |
| [OPERATIONS.md](./OPERATIONS.md) | 發布、監控、回滾、備份與事故處理入口 |

## 領域文件

| 文件 | 用途 |
|---|---|
| [內置客服需求記錄](./INTERNAL-SUPPORT-REQUIREMENTS.md) | 記錄已確認要求、介面草稿、後續接入範圍與待決策事項 |
| [Driver README](../driver/README.md) | Driver Flutter 專案說明 |
| [Cloud Run Runbook](../deploy/cloud-run/README.md) | Cloud Run migration、健康檢查、回滾與 restore drill |
| [Login Settings Architecture](../.github/instructions/login-settings-architecture.instructions.md) | 後台登入配置的分配層與配置層契約 |
| [Driver Web UI Instructions](../.github/instructions/driver-web-ui.instructions.md) | Driver Web UI 開發規範 |
| [iOS Screen Scaling Instructions](../.github/instructions/ios-screen-scaling.instructions.md) | uni-app 固定畫布與 iOS 螢幕縮放規範 |
| [Address Display Instructions](../.github/instructions/address-display.instructions.md) | 地址摘要與詳細地址顯示規範 |

## 文件責任分工

- `README.md`：快速開始與高層入口，不放完整操作細節。
- `docs/`：跨模組、可供開發與維運共用的正式文件。
- `deploy/cloud-run/README.md`：只保留 Cloud Run 的實際操作 runbook；完整系統架構與服務清單以 `PRODUCTION-DEPLOYMENT.md` 為準。
- `.github/instructions/`：修改特定路徑時必須遵守的工程規範。
- 各產品目錄 README：只記錄該產品的專屬資訊。

## 變更文件時

1. 架構或服務責任變更：同步更新 `ARCHITECTURE.md` 與 `PRODUCTION-DEPLOYMENT.md`。
2. 本機指令、環境變數或驗證流程變更：同步更新 `DEVELOPMENT.md` 與根目錄 `README.md`。
3. API 認證、權限或資料契約變更：同步更新 `API.md` 與相關實作文件。
4. 發布、回滾、備份或監控變更：同步更新 `OPERATIONS.md` 與 `deploy/cloud-run/README.md`。
5. 特定模組規範變更：更新對應 `.github/instructions/` 文件。

文件不得包含正式密碼、API 金鑰、Secret value、session secret 或個人資料。
