# 正式環境部署架構與操作文件

## 1. 文件目的

本文件說明 Master Travel Project 正式環境的前後端部署架構、服務責任、CI/CD 流程、資料庫 migration、健康檢查、回滾與必要的環境設定。

正式部署平台為 Google Cloud Platform，主要使用 Cloud Run、Cloud SQL、Artifact Registry、Secret Manager、Cloud Storage，以及 GitHub Actions。

> 本文件只記錄架構與操作方式，不記錄任何正式密碼、API 金鑰、Secret value 或個人資料。

## 2. 系統架構

```mermaid
flowchart TB
    PassengerUser[乘客瀏覽器 / App / 微信小程序]
    AdminUser[管理員瀏覽器]
    DriverUser[司機瀏覽器]

    Passenger[Passenger H5]
    Admin[Admin Console]
    Driver[Driver Web]
    FrontendProxy[Cloud Run 前端服務<br/>Nginx]
    API[Cloud Run API<br/>NestJS]
    Renderer[Cloud Run Share Renderer]
    SQL[Cloud SQL<br/>PostgreSQL]
    Bucket[Cloud Storage<br/>分享圖片快取]
    Registry[Artifact Registry]
    Actions[GitHub Actions]

    PassengerUser --> Passenger
    AdminUser --> Admin
    DriverUser --> Driver
    Passenger --> FrontendProxy
    Admin --> FrontendProxy
    Driver --> FrontendProxy
    FrontendProxy -->|/api| API
    API --> SQL
    API --> Renderer
    Renderer --> Bucket
    Actions --> Registry
    Registry --> FrontendProxy
    Registry --> API
    Registry --> Renderer
    Actions --> SQL
```

## 3. 服務清單

| 服務 | 技術 | 正式部署 | 主要責任 |
|---|---|---|---|
| Passenger H5 | uni-app / Vite | Cloud Run + Nginx | 乘客端 Web 介面 |
| Admin Console | Vue 3 / Vite | Cloud Run + Nginx | 後台管理、表單、權限操作介面 |
| Driver Web | Flutter Web | Cloud Run + Nginx | 司機接單與訂單操作介面 |
| API | NestJS / TypeScript | Cloud Run | 驗證、權限、商業邏輯、第三方整合 |
| Database | PostgreSQL | Cloud SQL | 正式交易資料與設定資料 |
| Share Renderer | Node.js / Playwright | Cloud Run | 訂單邀請頁與分享圖片產生 |
| Image Cache | Cloud Storage | Private bucket | 分享圖片跨 instance 快取 |
| Image Registry | Artifact Registry | GCP | 保存不可變 container image |

前端產品區域保持獨立：`src/`、`admin/`、`driver/` 不直接引用彼此的實作；跨端資料格式應透過 API 或 `shared/` 契約傳遞。

## 4. 前端部署

### 4.1 Passenger H5

原始碼位於 `src/`，正式建置：

```bash
npm run build:h5
```

產物為 `dist/build/h5`，會被包裝成 `passenger` image，推送至 Artifact Registry，再部署至 Passenger Cloud Run service。

正式建置時使用：

- `VITE_API_BASE_URL`: 正式 API URL
- `VITE_API_URL`: `/api`
- `VITE_PASSENGER_PREVIEW_URL`: 乘客端預覽 URL
- `VITE_DRIVER_PREVIEW_URL`: 司機端預覽 URL

### 4.2 Admin Console

原始碼位於 `admin/`，正式建置：

```bash
npm --prefix admin run build
```

產物為 `admin/dist`，會被包裝成 `admin` image，部署至獨立 Cloud Run service。

後台只負責頁面、表單、互動、狀態呈現與 API 呼叫。權限、輸入驗證與商業結果必須由 API 再次驗證；後台不可直接連線資料庫。

### 4.3 Driver Web

原始碼位於 `driver/`，正式建置：

```bash
cd driver
flutter build web \\
  --release \\
  --dart-define="DRIVER_API_BASE_URL=${PRODUCTION_API_URL}"
```

產物為 `driver/build/web`，會被包裝成 `driver` image，部署至獨立 Cloud Run service。

### 4.4 Nginx 前端容器

三個前端共用 `deploy/frontend/Dockerfile` 與 `deploy/frontend/default.conf`：

- Base image：`nginx:1.27-alpine`
- Container port：`8080`
- 靜態根目錄：`/usr/share/nginx/html`
- 健康檢查：`GET /healthz`
- 支援 SPA fallback 至 `/index.html`
- 啟用 gzip
- 使用 `API_ORIGIN` 反向代理 API

主要路由：

| 路徑 | 行為 |
|---|---|
| `/api/*` | 轉發至 API Cloud Run service，移除 `/api` prefix |
| `/order-invite` | 轉發至 API 分享頁 |
| `/order-invite/share-image` | 轉發至 API 分享圖片 endpoint |
| `/healthz` | 回傳前端容器健康狀態 |
| 其他路徑 | 讀取靜態檔案，找不到時 fallback 至 `index.html` |

## 5. API 部署

API 位於 `backend/`，使用 NestJS + TypeScript。

### 5.1 Container build

`backend/Dockerfile` 使用 multi-stage build：

1. Node.js 20 build stage 安裝 dependencies。
2. 複製 Prisma schema 與 backend source。
3. 執行 `npm --prefix backend run build`。
4. runtime stage 複製建置階段的 `node_modules`、編譯產物、Prisma generated client、schema 與 migrations；目前未執行 production-only 安裝或移除 devDependencies。
5. 以非 root 的 `node` 使用者啟動。
6. 監聽 Cloud Run 提供的 `PORT`，預設 host 為 `0.0.0.0`。

啟動命令：

```bash
node dist/main.js
```

### 5.2 API runtime 設定

一般環境變數由 Cloud Run 注入：

- `NODE_ENV=production`
- `ADMIN_USERNAME`
- `APP_CORS_ORIGINS`
- `DRIVER_ORDER_URL_BASE`
- `SHARE_RENDERER_ORIGIN`

Secret Manager 注入：

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `AMAP_WEB_SERVICE_KEY`

Secret 不可寫入 source code、前端 bundle、Docker image 或 GitHub repository。

### 5.3 CORS 與權限

`APP_CORS_ORIGINS` 使用逗號分隔的 allowlist。API 會依 allowlist 判斷請求來源，不應以任意來源取代正式設定。

API 負責：

- 管理員登入與 session
- Client / Driver authentication
- CSRF 保護
- Role-based authorization
- Request validation
- 第三方登入與服務憑證驗證
- 付款、退款、審核及其他商業規則

## 6. Cloud SQL 與 Prisma migration

正式資料庫使用 Cloud SQL PostgreSQL，API 透過 Cloud SQL connector / Unix socket 連線。`DATABASE_URL` 的完整內容存於 Secret Manager，例如使用 Cloud SQL socket：

```text
postgresql://USER:PASSWORD@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE&schema=public
```

實際帳密與 instance name 不得寫入文件或 source code。

### 6.1 Migration 原則

API 啟動時不執行 schema migration，但會呼叫 `ensurePricingDefaults()` 與 `ensureMembershipPlanDefaults()` 初始化預設資料。正式 migration 使用獨立 Cloud Run Job，在容器工作目錄 `/app/backend` 執行：

```bash
npm run prisma:migrate:deploy
```

若從專案根目錄手動執行相同 migration，命令為 `npm --prefix backend run prisma:migrate:deploy`；須先確認連線環境與發布授權，不可把手動命令當成正式 Job 流程的替代。

正式 workflow 與部署腳本的順序：

1. Workflow 建立 Cloud SQL pre-migration backup。
2. 部署腳本先更新 Share Renderer。
3. 使用與 API 相同的 immutable image 部署 migration job。
4. 執行 Prisma migration。
5. migration 成功後才部署 API service。
6. migration 失敗時中止後續發布；先前已部署的 Share Renderer 不會因此自動回滾。

Migration 必須遵循 expand/contract：先加入向後相容結構，再部署程式與搬移資料，最後於後續版本移除舊結構。正式環境不使用自動 down migration。

## 7.1 提交、推送與 Cloud Run 流量判定

正式發布只接受同一個已提交 commit SHA 的完整 workflow 結果。單一測試、局部 build、未提交修改、手動 image 或單次 HTTP 200 均不可視為部署候選或部署完成。

發布前必須確認：

- 完整 diff 已檢查，工作目錄乾淨，所有要發布的修改已提交。
- commit SHA、受影響端別及 quality gates 結果可追溯。
- production build 已完成，所有正式 image 使用 immutable `service:<sha>@sha256:<digest>`。
- backup、migration、revision readiness 與 smoke tests 均成功。

發布完成必須逐服務核對 revision、image digest 與 `status.traffic`。只有目標 revision 的 traffic 明確為 100%，且其 image digest 等於本次 workflow 產物，才可判定該服務已承接本次版本。`latestReadyRevisionName`、deploy 命令成功或 URL HTTP 200 不能替代 traffic 證據。若任一服務的 traffic、revision 或 digest 未核實，整體只能回報為「部分完成／未驗證」，不可回報「正式部署完成」。


正式 workflow 為 `.github/workflows/deploy-production.yml`。

觸發方式：

- push 至 `main`
- GitHub Actions 手動執行 `workflow_dispatch`
- 每月 2 日 03:00 UTC 排程重建（沿用完整正式發布流程）

API image 建置時下載當月 DB-IP Lite City MMDB，檢查 gzip、MMDB 類型與公開 IP 查詢；下載或驗證失敗會中止建置，不會部署缺少地區資料的 image。資料庫在 image 內由後端本地讀取，不再呼叫 `ipwho.is`；每次 workflow run 的 API tag 包含 commit SHA、run ID 與 attempt，部署仍引用 digest。DB-IP Lite City 資料每月更新，依 [DB-IP 來源及授權](https://db-ip.com) 標示；地區查不到仍回傳「未知地區」。排程會重新發布整站、執行既有備份與 migration，不是僅更新 API；實際正式生效需依下述 Revision／流量證據確認。

流程如下：

1. 獨立 quality-gates job 執行驗證，通過後才啟動 deploy job。
2. Deploy job checkout 本次 commit。
3. 使用 Workload Identity Federation 登入 GCP。
4. 安裝 Node.js 20 與 Flutter 3.47.4。
5. 建置 Passenger H5、微信小程序、Admin 與 Driver Web。
6. 建置並推送 `passenger`、`admin`、`driver`、`api`、`share-renderer` images。
7. 解析每個 image 的 SHA-256 digest。
8. Before any production mutation, the workflow re-checks that `origin/main` still equals the workflow commit; a queued stale run stops without backup, migration, API promotion, or frontend deployment.
9. 建立 Cloud SQL pre-migration backup。
10. 部署 Share Renderer。
11. 執行 migration Cloud Run Job。
12. 部署 API candidate revision。
13. 執行 `/health/live` 與 `/health/ready` smoke tests。
14. 成功後切換 API 100% traffic。
15. 再次檢查正式 API URL。
16. 部署三個前端 Cloud Run services。
17. 前端部署前再次檢查 `origin/main`，避免過時 workflow 修改前端流量。
18. 保留微信小程序 build artifact 30 天。

正式部署一律使用：

```text
service:<commit-sha>@sha256:<digest>
```

不得以 `latest` 或可變動 tag 作為正式部署依據。

## 8. API candidate 與流量切換

若 API service 已存在，新 revision 先以 `--no-traffic` 和 `candidate` tag 部署，不能直接接收正式流量。

Smoke test：

```bash
GET /health/live
GET /health/ready
```

兩個 endpoint 都成功後才執行：

```bash
gcloud run services update-traffic SERVICE_NAME \\
  --to-revisions REVISION=100
```

### Health endpoint 定義

| Endpoint | 用途 |
|---|---|
| `/health/live` | process liveness，供 startup/liveness probe |
| `/health/ready` | 執行 `SELECT 1` 確認資料庫可連線，查詢失敗回傳 503；handler 未設定自身的查詢逾時上限 |
| `/health` | readiness 相容別名 |

資料庫故障不應被 liveness probe 當成 process failure，避免造成無限重啟。

## 9. Share Renderer

Share Renderer 是獨立 Cloud Run service，負責產生訂單邀請分享圖片與 crawler 需要的分享內容。

部署特性：

- memory：`1Gi`
- concurrency：`1`
- min instances：`1`
- max instances：`3`
- service account 由 `GCP_SHARE_RENDERER_SERVICE_ACCOUNT` 指定；workflow 未設定該值時會 fallback 至 `GCP_RUNTIME_SERVICE_ACCOUNT`，並非強制獨立帳號
- Cloud Storage private bucket
- 使用 `DRIVER_ORDER_URL_BASE`
- 使用 `SHARE_IMAGE_BUCKET`

API 透過 `SHARE_RENDERER_ORIGIN` 呼叫 Renderer；Renderer 不應直接暴露資料庫權限。

## 10. 微信小程序

正式 workflow 會建置：

```bash
npm run build:mp-weixin
```

產物：

```text
dist/build/mp-weixin
```

目前 production workflow 會將產物上傳為 GitHub Actions artifact，保留 30 天；不會將小程序部署為 Cloud Run service。後續需透過微信小程序上傳流程發布。

微信平台需要設定：

- request 合法域名指向正式 API host。
- GitHub Actions runner 出口 IP 符合小程序上傳白名單策略。
- 體驗版與正式版使用正確的 API 設定。

## 11. IAM 與 Secret 分工

正式環境應分離以下 service account：

| Account | 權限原則 |
|---|---|
| GitHub deploy account | 推送 image、更新 Cloud Run、執行 migration job、建立 backup |
| API runtime account | Cloud SQL Client、讀取必要 secrets |
| Migration account | Cloud SQL 與 migration credentials |
| Renderer account | Renderer 與 Cloud Storage 所需權限 |

GitHub deploy account 不應直接讀取 secret value。Runtime 與 migration job 應由 Cloud Run 透過 Secret Manager 注入 secrets。

以上是權限分離原則，不代表腳本強制驗證帳號彼此不同。尤其 Renderer 帳號目前允許 fallback 至 API runtime 帳號；實際 IAM 權限與帳號分離狀態須於雲端查驗。

## 12. 回滾

若新 API revision 發生程式 regression：

1. 找出最後一個已驗證的 revision。
2. 執行 `deploy/cloud-run/rollback.sh`。
3. 將流量切回該 revision。
4. 重新執行 `/health/live` 與 `/health/ready`。
5. 保留失敗 revision、image digest、migration job 記錄與 Cloud Logging。

Migration 已執行時不可直接假設可以 down migration。若 schema 仍向後相容，優先採用 forward fix；若有資料完整性風險，才依事故流程評估 backup / PITR restore。

## 13. 監控與告警

正式環境至少應監控以下項目。這是維運配置要求，不是已完成配置的證明；告警、多區域檢查、備份策略及 PITR 狀態須查驗實際雲端設定：

- Cloud Run 5xx ratio
- p95 latency
- instance 數量與 startup/liveness probe failure
- `/health/ready` 多區域檢查結果
- Cloud SQL CPU、memory、storage、connection saturation
- backup 與 PITR 狀態
- migration job failure
- GitHub Actions deployment failure

Application logs 不得包含密碼、session token、Authorization header 或未核准的個人資料。

## 14. 驗證命令

修改部署、根設定、CI、API、前端或 Prisma 後，應依受影響範圍執行：

```bash
npm run check:dependencies
npm run verify:affected
```

常用單區域驗證：

```bash
npm run verify:api
npm run verify:admin
npm run verify:passenger
npm run verify:driver
```

正式 release 前，GitHub Actions 仍須通過完整 quality gates；本機通過不代表正式部署已完成。

## 15. 相關檔案

- `.github/workflows/deploy-production.yml`
- `.github/workflows/quality-gates.yml`
- `backend/Dockerfile`
- `deploy/frontend/Dockerfile`
- `deploy/frontend/default.conf`
- `deploy/frontend/build-image.sh`
- `deploy/frontend/deploy.sh`
- `deploy/cloud-run/deploy.sh`
- `deploy/cloud-run/rollback.sh`
- `deploy/cloud-run/smoke-test.sh`
- `deploy/cloud-run/README.md`
- `docker-compose.yml`（僅本機 PostgreSQL）
