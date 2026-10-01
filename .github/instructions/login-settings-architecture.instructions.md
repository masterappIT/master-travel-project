---
description: 後台管理「登入配置」功能的分配層／配置層職責邊界、API 契約與現況限制；修改相關前後端程式碼前必須先確認
applyTo: 'admin/src/pages/login-settings/**,admin/src/styles/login-settings.css,backend/src/login-methods.contract.test.ts'
---

# 後台管理－登入配置 功能架構

開始修改本功能任何檔案前，必須先在回覆中確認並複述下列架構，再進行分析或修改。本文件與 `.github/skills/admin-development/SKILL.md` 第 7 節內容一致；skill 是強制載入的通用規範，本檔是依檔案路徑自動觸發的功能細則，兩者需同步維護。

## 0. 兩層職責邊界（最重要的前提，禁止混淆）

登入配置頁面（`admin/src/pages/login-settings/LoginSettingsPage.js`，scope `.login-settings-admin`）共 4 個分頁，分成兩層，彼此完全獨立、沒有自動聯動：

1. **分配層 — 登入方式管理分頁**：唯一職責是決定哪個登入方式（`phone`／`wechat`／`apple`）開放給乘客端、司機端登入或註冊使用，以及顯示順序、顯示名稱、Logo、小程序登入模式。**不負責**驗證或配置任何第三方憑證。
2. **配置層 — 短信登入／微信登入／Apple 登入分頁**：唯一職責是讓管理員填寫對應第三方 API 所需憑證、保存，並提供連線測試讓管理員確認是否成功連接。**不負責**、也不應該決定任何登入方式對乘客端／司機端是否可見或可用。

兩層之間沒有任何自動觸發關係：配置層測試通過不會自動開啟分配層開關；分配層開啟某 provider 也不會檢查配置層是否已設定或測試成功。這是刻意設計。修改任一層時，不得把另一層的職責誤植進來，也不得以「兩層應該聯動」為由新增隱性耦合，除非使用者明確要求並批准。

## 1. 分配層：登入方式管理

- 資料表：正式表 `LoginMethodSetting`、草稿表 `LoginMethodSettingDraft`（`prisma/schema.prisma`）。草稿表多一個 `miniProgramLoginMode` 欄位；正式表沒有此欄位，該值的正式來源實際落在 `AppSetting.wechatMiniProgramLoginMode`。
- 後端端點（`SettingsController`，`backend/src/main.ts`）：
  - `GET /settings/login-methods/preview-token`：取得短效 HMAC 預覽 token（`SUPER_ADMIN`／`OPERATOR`）。
  - `GET /settings/login-methods`：讀**草稿**（`SUPER_ADMIN`／`OPERATOR`）。
  - `POST /settings/login-methods`：寫草稿，`$transaction` 包覆；強制 payload 包含全部 provider、`passengerEnabled`／`driverEnabled` 必須是 boolean、provider 不可重複（`SUPER_ADMIN` only）。
  - `POST /settings/login-methods/publish`：將草稿整批以 `$transaction` 搬移到正式表（`SUPER_ADMIN` only）；交易失敗會整批回滾，不會部分寫入。
- 公開讀取端點：`GET /auth/login-methods?client=passenger|driver`。一般情況讀**正式表**；只有帶 `preview=1&previewToken=<有效 token>` 才讀草稿，僅供後台 LIVE PREVIEW 使用，不是終端使用者的路徑。
- **唯一的真實生效關卡**：`requireLoginMethodEnabled(provider, client)`，只讀正式表的 `passengerEnabled`／`driverEnabled`。每個登入端點（`phone/request`、`phone/verify`、`wechat/login`、`wechat/phone`、乘客端與司機端 `third-party`）都各自呼叫此函式再次驗證，前端開關或草稿狀態都不可能繞過它。
- 現況限制（修改前先確認是否要一併處理，不要預設已修好）：
  - 後台目前「保存」會同時觸發保存草稿＋立即發布，沒有 UI 路徑可以只保存草稿而不發布。
  - `publishLoginMethods()` 函式存在、也匯出到 template context，但目前沒有任何按鈕綁定它，是孤兒程式碼。

## 2. 配置層：短信／微信／Apple 登入

- 資料表：單一 `AppSetting`，**沒有草稿機制**，`POST /settings` 保存後立即生效，與分配層的草稿／發布兩段式完全不同的持久化模型。
- 保存端點：`POST /settings`，`wechatMiniProgram`／`appleLogin`／`sms253` 區塊皆要求 `SUPER_ADMIN`（一般設定欄位則 `SUPER_ADMIN`／`OPERATOR` 皆可）。
- 各分頁現況（修改前務必核對，不要假設所有子分頁都已串接）：

| 分頁／子分頁 | 保存欄位是否真的送達並落地 | 連線測試端點 | 測試是否真的驗證該子分頁的第三方連線 | 是否被實際登入流程消費 |
| --- | --- | --- | --- | --- |
| 短信登入－國內 | ✅ | `GET /settings/sms253/status` | ✅ 真的呼叫 253 查餘額 | ✅ `phone/request` 實際發送簡訊 |
| 短信登入－國際 | ✅ | `GET /settings/sms253/international/status` | ✅ | ✅ |
| Apple 登入－iOS | ✅ | `GET /settings/apple/status` | ✅ 解析 Private Key＋呼叫 Apple 公開金鑰端點 | ✅ `verifyAppleIdentityToken` 採用 `appleIosBundleId` 作為合法 audience |
| Apple 登入－Web／Android | ✅ | `GET /settings/apple/status`（與 iOS 共用同一顆按鈕，但後端會一併檢查兩平台） | ✅ | ✅ `verifyAppleIdentityToken` 採用 `appleWebClientId`；司機端 `GET /driver/auth/third-party/apple-config` 讀取此組設定 |
| 微信登入－小程序 | ✅ | `GET /settings/wechat/status` | ✅ 真的呼叫微信 `cgi-bin/token` | ✅ `wechat/login`、`wechat/phone` 實際使用 |
| 微信登入－Web | ❌ 前端 `save()`（`LoginSettingsPage.js`）只解構送出 `configurations.miniProgram`，Web 子分頁輸入值從未被包進送給後端的 payload；`AppSetting` 也沒有對應欄位可接收 | 與其他微信子分頁共用同一顆「檢查服務連線」按鈕、同一個 `/settings/wechat/status`，**永遠只測小程序設定**，與本子分頁填寫內容無關 | ❌ | ❌ 司機端 `third-party` 的 `wechat` 分支寫死擲出「WeChat website OAuth is not configured」；乘客端 Web／App 版微信按鈕點擊只彈出「微信登入目前只支援小程序」提示，從未呼叫後端 |
| 微信登入－Android | ❌ 同上 | 同上 | ❌ | ❌ 無任何原生 SDK 串接程式碼 |
| 微信登入－iOS | ❌ 同上 | 同上 | ❌ | ❌ 同上 |

- `GET /settings/wechat/status` 已補上 `requireRole(["SUPER_ADMIN"])`，與 `apple/status`、`sms253/status`、`sms253/international/status` 一致。配置層所有端點（保存、連線測試、狀態檢查）皆僅限 `SUPER_ADMIN`，沒有 `OPERATOR` 可寫入或可測試連線的路徑。
- 前端 `admin/src/main.js` 的 `adminLoginSettingsContext` 把 `canWrite` 綁定到 `isSuperAdministrator`，使 `OPERATOR` 在整個登入配置頁（分配層＋配置層 4 個分頁）皆為唯讀，與後端權限一致；不要沿用全站通用的 `canWrite`（僅排除 `VIEWER`）。
- 面向終端使用者的簡訊發送（`sendSms253()`，供 `phone/request` 等登入／註冊端點呼叫）失敗時只回傳固定友善訊息，不透出 253 原始 `errorMsg`；原始供應商錯誤仍完整寫入 `Sms253Message`，可在 `GET /settings/sms253/messages` 查詢。後台「測試」按鈕與 `*/status` 端點（皆 `SUPER_ADMIN` only）維持回傳原始錯誤文字供診斷，兩種情境的錯誤處理方式不同，修改時不可混用。
- 微信登入分頁的 Web／Android／iOS 三個子分頁目前是完全斷線的 UI：填寫與保存都不會到達後端，也沒有任何登入流程會消費它們。修改此分頁前必須先與使用者確認方向：(a) 補齊後端欄位與真實第三方串接使其成為真正可用的配置層，或 (b) 移除這三個子分頁以避免管理員誤填誤判。不得預設其中一種方向直接動手。

## 3. 修改前自檢清單

1. 這次修改屬於分配層還是配置層？不得讓一次修改同時跨兩層職責，除非使用者明確要求建立聯動並說明原因。
2. 若涉及登入方式管理：是否會影響 `requireLoginMethodEnabled` 的唯一生效關卡、草稿／正式表的區隔、或現有的保存即發布行為？
3. 若涉及短信／微信／Apple：保存欄位是否有對應後端欄位可接收？連線測試端點是否真的測試到使用者所說的那個子分頁／平台？
4. 若涉及微信登入 Web／Android／iOS：先確認使用者是否要補齊串接或移除 UI，不得自行假設。
5. 修改後依 `.github/skills/admin-development/SKILL.md` 第 0 節要求，交付時附自檢報告（修改檔案、責任邊界、CSS scope、API 契約、執行的檢查命令與結果、未驗證項目），並呼叫 `code-review` skill 做二次掃描。
