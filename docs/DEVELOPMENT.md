# 本機開發指南

## 前置需求

- Node.js 20 及 npm
- Docker Desktop
- Flutter 3.47.4（Driver 開發與正式建置）
- PostgreSQL 由 Docker Compose 提供

## 安裝依賴

```bash
npm install
npm --prefix admin install
npm --prefix brand install
cd driver && flutter pub get && cd ..
cp .env.example .env
```

請將本機 `.env` 中的示範帳密、session secret 與第三方服務設定替換為開發值；`.env` 不可提交。

## 啟動服務

```bash
docker compose up -d postgres
npm run dev:api
npm run dev:h5
npm --prefix admin run dev
npm --prefix brand run dev
```

| 服務 | 預設網址 |
|---|---|
| PostgreSQL | `localhost:5433` |
| API | `http://127.0.0.1:3010` |
| Passenger H5 | `http://127.0.0.1:5173` |
| Admin | `http://127.0.0.1:5174` |
| Brand | `http://localhost:4173` |

H5 與 Admin 的瀏覽器請求使用同源 `/api` proxy；小程序、原生 App 與 Driver Web 使用 `VITE_API_BASE_URL` 或 `DRIVER_API_BASE_URL`。

## 固定開發登入

非 production 的 Vite 開發模式可使用 `VITE_ENABLE_DEV_LOGIN=true` 與指定的 development user。固定開發登入設定只允許在非 production 使用，不得將測試帳戶或測試 secret 帶入正式 bundle。

## Scope 與邊界檢查

開始 focused change：

```bash
npm run check:scope -- --scope passenger
npm run check:scope -- --scope api
npm run check:scope -- --scope admin
npm run check:scope -- --scope driver
npm run check:scope -- --scope brand
npm run check:scope -- --scope cross-cutting
```

修改 manifest、import、shared、prisma、部署或 CI 時：

```bash
npm run check:dependencies
```

## 驗證命令

```bash
npm run verify:passenger
npm run verify:api
npm run verify:admin
npm run verify:driver
npm run verify:brand
npm run verify:affected
```

選擇與變更範圍最小但完整的驗證命令。跨模組或部署變更使用 `npm run verify:affected`，並額外驗證所有受影響產品。

## 建置命令

```bash
npm run build:h5
npm run build:mp-weixin
npx uni build -p app-plus
npm run build:api
npm --prefix admin run build
npm --prefix brand run build
cd driver && flutter build web
```

H5 建置成功不代表微信小程序與 App Plus 已通過；需要依目標逐一驗證。

## 環境變數分類

| 類別 | 代表變數 | 使用位置 |
|---|---|---|
| Database | `DATABASE_URL`, `PORT` | API / Prisma |
| Frontend | `VITE_API_BASE_URL`, `VITE_API_URL` | Passenger / Admin / Vite |
| Authentication | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` | API；secret 不可進前端 |
| CORS | `ADMIN_CORS_ORIGIN`, `APP_CORS_ORIGINS` | API |
| Integrations | `AMAP_WEB_SERVICE_KEY`, `MASTERBOX_*`, `SUPPORT_SESSION_SECRET` | API |
| Development login | `VITE_ENABLE_DEV_LOGIN`, `VITE_DEV_LOGIN_*` | 非 production Vite |

完整正式環境設定請參考 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)。
