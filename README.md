# Master Travel Project

## Workspace boundaries

This repository contains separate product surfaces. Keep changes inside the owning area unless the change is explicitly cross-cutting:

- `src/`: passenger uni-app client
- `backend/`: API
- `admin/`: admin console
- `driver/`: driver Flutter Web UI
- `brand/`: brand website
- `shared/`: shared contracts and types
- `prisma/`: database schema and migrations
- `config/`、`scripts/`、`.github/`、`.vscode/`、根 manifest 與 workspace 設定：cross-cutting platform ownership

每個主要目錄的 reviewer ownership 定義於 `.github/CODEOWNERS`。目前由 `@masterappIT` 作為明確 fallback owner；未來可直接替換為對應 GitHub teams，不需改變目錄邊界或 CI 流程。

執行 focused change 前，請先執行 `npm run check:scope -- --scope passenger`（或 `api`、`admin`、`driver`、`brand`、`cross-cutting`）。修改 manifest 或 import 時，另外執行 `npm run check:dependencies`。`shared/`、`prisma/`、部署、根設定或 CI 的變更屬於 cross-cutting，必須完成所有受影響端別的驗證。

## Verification and Definition of Done

Use the smallest affected verification command locally, or `npm run verify:affected` when the change spans areas:

| Area | Required gate |
| --- | --- |
| Passenger | `npm run verify:passenger` (H5, WeChat mini-program, App Plus builds) |
| API | `npm run verify:api` |
| Admin | `npm run verify:admin` |
| Driver | `npm run verify:driver` (analyzer and test regression baselines, Web build) |
| Brand | `npm run verify:brand` |
| Cross-cutting | `npm run verify:affected` plus every affected area |

A change is complete only when the relevant gate passes, scope impact is declared, acceptance criteria are checked, and any unverified target or rollback plan is recorded in the PR description. UI changes must also include the required visual/platform inspection evidence documented in `.github/instructions/`.

Driver currently has checked-in analyzer and widget-test debt baselines under `config/`. The Driver gate rejects any new diagnostic or failing test and reports resolved baseline entries for removal; a passing regression gate does not mean the existing debt is resolved.


## 專案結構

| 目錄 | 用途 |
| --- | --- |
| `src/` | uni-app 客戶端（H5、小程序及 App Plus） |
| `backend/` | NestJS API |
| `admin/` | Vue 管理後台 |
| `brand/` | 獨立品牌網站 |
| `prisma/` | PostgreSQL Prisma schema |
| `.github/instructions/` | Copilot 開發與跨平台驗證規範 |

## 本機開發

### 前置需求

- Node.js 及 npm
- Docker（用於 PostgreSQL）

### 安裝與設定

```bash
npm install
npm --prefix admin install
npm --prefix brand install
cp .env.example .env
```

請先替換 `.env` 中的示範帳密、session secret 及第三方服務金鑰，不要提交 `.env`。

### 啟動服務

```bash
docker compose up -d postgres
npm run dev:api
npm run dev:h5
npm --prefix admin run dev
npm --prefix brand run dev
```

| 服務 | 預設網址 |
| --- | --- |
| PostgreSQL | `localhost:5433` |
| API | `http://127.0.0.1:3010`（真機小程序使用開發電腦區域網路 IP） |
| H5 客戶端 | `http://127.0.0.1:5173` |
| 管理後台 | `http://127.0.0.1:5174` |
| 品牌網站 | `http://localhost:4173` |

H5 與管理後台使用固定連接埠；若連接埠已被其他程序占用，Vite 會直接報錯，不會自動切換到其他連接埠。開發環境的瀏覽器請求統一經由同源 `/api` 代理到 `http://127.0.0.1:3010`，原生、小程序等非 H5 目標則使用 `VITE_API_BASE_URL`。真機小程序必須將該變數設為開發電腦的區域網路 IP，並確保手機與電腦在同一 Wi-Fi。

H5 靜態檔案與 `/api/` 同源反向代理可參考 `deploy/nginx.h5.conf`。正式 API 使用 Cloud Run + Cloud SQL，migration、發布、smoke test、回滾、監控與備份還原流程定義於 `deploy/cloud-run/README.md`；應用程式啟動不會修改資料庫 schema。

## 客戶環境部署

`customer` 分支的每次 push 會觸發 `Deploy Customer API` workflow。Workflow 先執行完整 quality gates，再透過 GitHub OIDC 取得短效 Google Cloud 憑證，建立 `linux/amd64` API image、備份 Cloud SQL、執行 migration、驗證候選 revision，最後才切換 Cloud Run 流量。

GitHub `customer` Environment 只允許 `customer` 分支部署，並保存 workflow 所需的非敏感 Google Cloud resource identifiers。資料庫連線、管理員密碼及 session secret 只保存在 Google Secret Manager；GitHub 不保存長效 service-account key 或應用程式密碼。Workload Identity Provider 同時限制 repository 與 `refs/heads/customer`。

目前客戶 API 位於 `https://master-travel-api-c25rpt3lia-df.a.run.app`。前端尚未部署，因此 `APP_CORS_ORIGINS` 暫時使用不可用的保留網址；部署前端後必須改為實際 HTTPS origin 並重新發布 API。

一般修改依序透過 PR 合併 `feature/* → develop → customer`，不要直接修改 Cloud Run revision 或 `customer` 分支。完整 migration、健康檢查、候選 revision、回滾及備份流程見 `deploy/cloud-run/README.md`。

## 環境變數

| 變數 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `PORT` | API 監聽埠 |
| `VITE_ENABLE_DEV_LOGIN` | 僅在 Vite 開發模式啟用固定測試用戶自動登入 |
| `VITE_DEV_LOGIN_COUNTRY_CODE`、`VITE_DEV_LOGIN_PHONE` | 開發自動登入所使用的資料庫用戶手機號碼 |

> **開發者固定登入備註（受保護設定）**：本地開發模式必須保留 `VITE_ENABLE_DEV_LOGIN=true`，固定帳戶 `+852 66996688` 會自動取得 development code 並跳過驗證碼輸入。未經使用者明確指令，不得移除、停用或改回手動驗證流程。此設定僅允許在非 production 模式生效。
| `ADMIN_USERNAME`、`ADMIN_PASSWORD` | 管理後台登入資料 |
| `ADMIN_SESSION_SECRET` | 管理 session 簽章密鑰 |
| `ADMIN_CORS_ORIGIN` | 管理後台允許來源 |
| `APP_CORS_ORIGINS` | 客戶端與後台允許來源，以逗號分隔 |
| `AMAP_WEB_SERVICE_KEY` | 高德 Web 服務金鑰，用於位置搜索、逆地理編碼及路線規劃；僅存放於後端 |
| `MASTERBOX_BASE_URL`、`MASTERBOX_APP_ID`、`MASTERBOX_API_KEY` | Master Box Integration 設定 |
| `SUPPORT_SESSION_SECRET` | 客服 session 簽章密鑰 |

完整範例請參考 `.env.example`。

## 資料庫

PostgreSQL 使用：

- 使用者及資料庫名稱：`master_travel_project`
- 本機連接埠：`5433`
- Docker Compose volume：`master-travel-project-postgres`

專案改名前使用的 `taxi-postgres` volume 不應與新 volume 同時使用。需要保留舊資料時，應先用 PostgreSQL 16 的 `pg_dump`／`pg_restore` 完成邏輯遷移並驗證資料，再移除舊 volume。不要在沒有備份的情況下執行 `docker compose down --volumes` 或 `docker volume rm`。

## 建置與驗證

修改 UI 或平台相關程式後，必須依 `.github/instructions/ios-screen-scaling.instructions.md` 驗證所有主要目標：

```bash
npm run build:h5
npm run build:mp-weixin
npx uni build -p app-plus
```

其他常用建置：

```bash
npm run build:api
npm --prefix admin run build
npm --prefix brand run build
```

H5 建置成功不能取代微信小程序及 App Plus 驗證。

## Master Box 客服整合

乘客端透過 Master Travel Project API 接入 Master Box Integration Conversation API。首頁及個人中心的客服入口會開啟聊天畫面，永久 API Key 只保存在後端。

1. 在 Master Box 建立第三方 Integration，取得 App ID 與 API Key。
2. 在 `.env` 設定 `MASTERBOX_BASE_URL`、`MASTERBOX_APP_ID`、`MASTERBOX_API_KEY` 與 `SUPPORT_SESSION_SECRET`。
3. 分別啟動 Master Box、Master Travel Project API 與客戶端。

目前 Master Box 的 `@masterbox/chat-embed` 尚未提供瀏覽器訊息及 WebSocket 路由，因此客戶端每 3 秒透過後端輪詢現有 Integration API。相關路由上線後可改用即時傳輸。

## 命名規範

| 類型 | 規範 |
| --- | --- |
| 顯示名稱 | `Master Travel Project` |
| npm 套件及服務 | `master-travel-project-*` |
| PostgreSQL 識別碼 | `master_travel_project` |
| GitHub repository | `masterappIT/master-travel-project` |

改名時必須分開評估顯示名稱、資料庫、Docker volume、套件名稱、外部 Integration ID、儲存 key 及平台 App ID。具持久資料或外部平台關聯的識別碼不可只做字串替換，必須先提供遷移與回復方案。
