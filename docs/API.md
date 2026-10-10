# API 開發指南

## 責任邊界

`backend/` 是唯一的可信任 API 邊界。前端只負責呈現、互動、狀態與 API 呼叫；不可複製後端商業規則，也不可直接存取資料庫。

API 必須在 server side 再次執行：

- 身份驗證
- 權限檢查
- 輸入型別與內容驗證
- 商業規則判斷
- 資料庫交易與一致性處理
- 第三方服務錯誤處理

## 認證與權限

API 包含管理員、乘客與司機等不同 session/token 流程。管理員 session secret、client secret、driver token secret 等敏感設定只能由環境變數或 Secret Manager 提供。

先前未使用的第三方客服轉送路由已移除。內置客服目前只有乘客端與管理後台介面草稿，尚無可用的對話 API 或客服身份驗證契約；接入時須另行定義乘客、司機、訪客及客服人員的授權邊界。

管理端設定寫入與連線測試必須由後端檢查角色；不能只依賴前端按鈕 disabled 狀態。

## CORS

正式環境使用 `APP_CORS_ORIGINS` allowlist。新增前端 origin 時，需同步更新部署環境設定並確認 cookie/session 行為，不應改成任意 origin。

## 資料庫

API 使用 Prisma 存取 PostgreSQL。正式 schema 變更只能透過 migration Cloud Run Job 執行；API 啟動不自動修改 schema。

啟動流程仍會呼叫 `ensurePricingDefaults()` 與 `ensureMembershipPlanDefaults()` 初始化預設資料；不執行 schema migration 不代表啟動時不寫入資料。

Migration 應採 expand/contract：

1. 加入向後相容欄位或資料結構。
2. 部署可同時支援新舊結構的程式。
3. 執行資料搬移或回填。
4. 後續版本移除舊結構。

## 健康檢查

| Endpoint | 用途 |
|---|---|
| `GET /health/live` | process liveness |
| `GET /health/ready` | database readiness check（執行 `SELECT 1`，失敗回傳 503） |
| `GET /health` | readiness compatibility alias |

目前 readiness handler 未設定自身的查詢逾時上限；`SELECT 1` 是輕量查詢，不代表有明確的 handler 層時間界限。

不要使用資料庫 readiness 取代 process liveness，避免資料庫短暫故障造成 instance restart loop。

## 開發與驗證

```bash
npm run check:scope -- --scope api
npm run verify:api
```

API 或 Prisma 變更完成後，確認不包含 secret、未驗證的跨區域 import，以及與前端不一致的 response shape。

## 正式環境參考

API 的 Cloud Run、Cloud SQL、Secret Manager、migration 與 rollback 流程請參考 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) 與 [Cloud Run Runbook](../deploy/cloud-run/README.md)。
