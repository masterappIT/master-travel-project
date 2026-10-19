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

內置客服文字對話使用 `SupportConversation`、`SupportMessage`、`SupportAuditLog`。乘客與司機分別透過 `POST /support/conversations/mine`、`POST /driver/support/conversations/mine` 開啟自己的對話，並以 `GET/POST /.../:id/messages` 收發文字；後端從既有 session 確認身份，跨帳戶對話讀寫回傳 404。未登入乘客可由 `POST /support/guest/conversation` 取得隨機憑證，以 Bearer token 使用 `/support/guest/conversation/:id/messages`；憑證遺失無法找回舊對話。文字長度 1–4000 字，發送須提供 8–80 字元的 `clientMessageId`，同一發送者重送相同內容會去重，重用 ID 傳不同內容回傳 409。訊息列表目前只回傳最新 100 則。

管理員 `SUPER_ADMIN`、`OPERATOR` 可使用 `/admin/support/conversations` 共用收件匣、主動聯繫及回覆；管理員 session、CSRF 與稽核沿用後台機制。`GET /admin/dashboard` 另回傳 `unreadSupportMessages`，以尚未有客服／管理員回覆的乘客、司機或訪客訊息數量作為儀表盤待處理提示；目前仍沒有逐則已讀標記。`SUPER_ADMIN` 可在 `/admin/support/agents` 建立、列出獨立客服帳戶（清單含登入失敗次數、鎖定時間、有效工作階段數及由最近一次登入工作階段推算的 `lastLoginAt`）；`PATCH /admin/support/agents/:id` 可分別或同時更新 `enabled`、`displayName`、`password`，停用或重設密碼會令該帳戶現有 session 失效，重設密碼同時解除登入鎖定；`POST /admin/support/agents/:id/unlock` 解除登入鎖定，`POST /admin/support/agents/:id/revoke-sessions` 撤銷該帳戶所有有效 session。以上操作均寫入客服稽核紀錄。客服與管理員的收件匣（`GET /admin/support/conversations`、`GET /support-agent/conversations`）把尚無訊息的對話排在最後，並附帶 `participantName`、`participantPhone`（訪客為 `null`）；工作人員讀取訊息（`GET …/conversations/:id/messages`）每次回傳最新 100 則、`hasMore` 及每則的 `senderName`（客服或管理員顯示名稱，其餘為 `null`），帶 `before=<訊息 ID>` 可讀取更早的一頁。乘客、司機與訪客端點的回傳內容不變。獨立客服以 `/support-agent/auth/login` 登入，可用 `POST /support-agent/auth/password`（`currentPassword`、`newPassword`，需 CSRF）自行修改密碼，成功後該帳戶其他 session 失效；使用 HttpOnly session cookie、CSRF cookie 與 `/support-agent/conversations` 操作同一收件匣；停用帳戶即令 session 失效。訪客、乘客、司機與客服操作者身份分別記錄。第一版暫無指派、關閉／重開、逐則已讀狀態與通知；儀表盤的 `unreadSupportMessages` 是依最近客服回覆推算的待回覆消息數。

圖片媒體基礎保留 `POST /admin/support/media`、`GET /admin/support/media/:id/:variant`、`DELETE /admin/support/media/:id`。上傳現在須提供已存在的對話 ID，且客服與圖片設定須啟用；仍只供管理員操作。它尚未形成圖片訊息，也尚未提供乘客、司機、訪客及獨立客服讀取權限。JPEG、PNG、WebP 會壓縮成 display／thumbnail WebP，原始檔不保存；正式環境啟用前仍需決定儲存位置（伺服器磁碟並納入每日備份，或私有 Cloud Storage adapter）、短效存取 URL 與清理工作；目前正式環境停用圖片上傳。

管理端設定寫入與連線測試必須由後端檢查角色；不能只依賴前端按鈕 disabled 狀態。

## CORS

正式環境使用 `APP_CORS_ORIGINS` allowlist。新增前端 origin 時，需同步更新部署環境設定並確認 cookie/session 行為，不應改成任意 origin。

## 資料庫

API 使用 Prisma 存取 PostgreSQL。正式 schema 變更只能由伺服器的部署腳本在更新容器前執行（`prisma migrate deploy`）；API 啟動不自動修改 schema。

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

正式 API 在 HostKVM 伺服器上運行，網址為 `https://mastertravelapi.masterappinc.com`（舊的 run.app 網址已在 2026-10-19 刪除）。部署、設定、migration 與 rollback 流程請參考 [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)。
