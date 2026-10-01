---
name: phone-login-development-mode
description: 僅用於登入配置中的手機號碼開發模式登入／註冊功能；涉及此功能時必須遵守獨立 UI、API、資料與 sms253 隔離邊界。
---

# 登入配置開發模式登入實作方案

## 1. 功能定位

在「登入配置 → 登入方式管理」的選項欄新增獨立選項「開發模式登入」。此功能只控制乘客端與司機端的手機號碼開發模式登入／註冊，以及指定驗證碼 `00000`。

本方案只整理實作邊界，尚未開始程式修改。

## 使用範圍

本 skill 只適用於「登入配置 → 登入方式管理 → 開發模式登入」功能。除非需求明確涉及此功能，不能套用到一般登入方式管理、短信供應商配置、微信登入、Apple 登入或其他登入流程。

所有實作都必須維持以下隔離：

- 開發模式資料、API 與 UI 不得併入既有 `LoginMethodSetting`、`LoginMethodSettingDraft` 或 `sms253` 契約。
- 只可共用既有登入 UI 的視覺／操作元件，不可共用開發模式商業判斷。
- 既有登入方式卡片、LIVE PREVIEW、正式短信配置與其他 provider 不得出現開發模式提示或隱性依賴。

## 2. UI 隔離邊界

「開發模式登入」必須與既有登入方式管理 UI 完全隔離：

- 不放入 `phone`、`wechat`、`apple` 登入方式卡片。
- 不修改「手機號碼登入」文字、開關、狀態或卡片結構。
- 不在既有登入方式卡片顯示開發模式提示、標籤或狀態。
- 不修改 LIVE PREVIEW 的登入方式清單與數量。
- 不在乘客端／司機端登入頁顯示開發模式文字。
- 不污染既有 CSS selector、元件與版面。

現有登入方式管理仍只負責 `phone`／`wechat`／`apple` 的分配設定。

## 3. 獨立資料設定

新增獨立的開發模式設定，不擴充既有登入方式資料契約。建議資料模型：

```text
PhoneLoginDevelopmentSetting
- id
- passengerEnabled
- driverEnabled
- verificationCodeHash
- updatedAt
- updatedBy
```

要求：

- 不加入 `LoginMethodSetting`。
- 不加入 `LoginMethodSettingDraft`。
- 不加入現有 `methods` payload。
- 不加入 `sms253` 設定。
- 指定驗證碼不回傳前端。
- 後端建議保存雜湊，不保存明文 `00000`。

若使用 Prisma，採獨立資料表與獨立 migration。

## 4. 獨立後台 API

建議新增：

```text
GET  /settings/phone-login-development
POST /settings/phone-login-development
```

API 只處理開發模式設定：

- `GET` 回傳乘客端／司機端開關狀態，不回傳驗證碼或雜湊。
- `POST` 更新端別開關與指定驗證碼。
- 不修改 `LoginMethodSetting`。
- 不修改 `sms253`。

權限：

- `SUPER_ADMIN` 可修改。
- 其他角色依登入配置頁既有唯讀策略處理。
- 後端必須重新驗證權限，不能只依賴前端 disabled 狀態。

## 5. 後台 UI

在登入方式管理頁既有選項欄新增同層選項「開發模式登入」。進入後只顯示：

- 乘客端開發模式開／關。
- 司機端開發模式開／關。
- 指定驗證碼設定／更新欄位。

控制項不得出現在既有 `phone` 卡片內。保存使用獨立 API，不與現有登入方式保存／發布共用 payload 或保存流程。

## 6. 登入驗證流程

後端手機登入／註冊流程的判斷順序：

1. 確認 `phone` provider 對應 client 已啟用。
2. 讀取該 client 的獨立開發模式設定。
3. 開發模式開啟時，不呼叫 `sms253`，只接受後端指定驗證碼 `00000`。
4. 開發模式關閉時，完全使用既有 `sms253` 流程。
5. 驗證成功後，繼續既有登入／註冊、角色、權限與司機審核流程。

`00000` 必須同時符合：

- 對應端別的 `phone` 登入方式已開啟。
- 對應端別的開發模式已開啟。
- 驗證碼通過後端比對。

## 7. 與 sms253 的隔離

開發模式啟用時：

- 手機登入／註冊不呼叫 `sms253`。
- 不讀取 `sms253` 配置狀態來決定是否開發模式。
- 不因 `sms253` 失敗而 fallback。
- 不修改 `sms253` 設定、供應商狀態、測試功能或歷史記錄。

開發模式關閉時，恢復既有 `sms253` 流程，正式短信驗證行為不變。

## 8. 必須保留的既有規則

開發模式不可繞過：

- `requireLoginMethodEnabled(provider, client)`。
- 手機號碼與國碼驗證。
- 登入／註冊既有流程。
- 角色判斷。
- 司機審核狀態。
- 權限與 session／token 發放。
- 微信、Apple 登入流程。
- 草稿／正式登入方式發布流程。

## 9. 測試範圍

### 後台

- 選項欄出現「開發模式登入」。
- 既有登入方式卡片不增加提示或欄位。
- 開發模式保存不改變既有 `methods` payload。
- 非授權角色不能寫入。

### 乘客端／司機端

- 開發模式開啟且手機登入開啟：`00000` 可登入／註冊。
- 開發模式關閉：`00000` 被拒絕。
- 手機登入關閉：即使開發模式開啟也被拒絕。
- 開發模式開啟時不呼叫 `sms253`。
- 開發模式關閉時維持原有 `sms253`。

### 回歸

- 微信、Apple 不受影響。
- LIVE PREVIEW 不顯示開發模式資訊。
- 正式短信設定頁不受影響。
- 司機審核與權限流程不受影響。

## 10. 驗證命令

```bash
npm run check:scope -- --scope admin
npm run check:scope -- --scope api
npm run check:dependencies
npm run check:admin-style-boundaries
npm run verify:admin
npm run verify:api
npm run verify:affected
```

若新增 Prisma schema，另執行 migration 與 Prisma validation。
