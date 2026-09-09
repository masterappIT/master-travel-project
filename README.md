# Master Travel Project

跨境出行的 uni-app 客戶端、NestJS API、Vue 管理後台與品牌網站。

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
| API | `http://127.0.0.1:3010` |
| H5 客戶端 | `http://127.0.0.1:5173` |
| 管理後台 | `http://127.0.0.1:5174` |
| 品牌網站 | `http://localhost:4173` |

H5 與管理後台使用固定連接埠；若連接埠已被其他程序占用，Vite 會直接報錯，不會自動切換到其他連接埠。開發環境的瀏覽器請求統一經由同源 `/api` 代理到 `http://127.0.0.1:3010`，原生、小程序等非 H5 目標則繼續使用 `VITE_API_BASE_URL` 或預設 API 位址。

生產環境可參考 `deploy/nginx.h5.conf`，將 H5 靜態檔案與 `/api/` 反向代理部署在同一來源，避免瀏覽器跨域。

## 環境變數

| 變數 | 用途 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `PORT` | API 監聽埠 |
| `ADMIN_USERNAME`、`ADMIN_PASSWORD` | 管理後台登入資料 |
| `ADMIN_SESSION_SECRET` | 管理 session 簽章密鑰 |
| `ADMIN_CORS_ORIGIN` | 管理後台允許來源 |
| `APP_CORS_ORIGINS` | 客戶端與後台允許來源，以逗號分隔 |
| `TENCENT_MAP_KEY` | 騰訊位置服務金鑰 |
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
