---
name: admin-development
description: Master Travel Project 後台管理、API 邊界、CSS 隔離與驗證規範；修改 admin、backend 或相關跨端契約時使用。
---

# 後台管理與前後端開發規範

## 0. 強制啟動與交付流程

- 每次開始新的「管理後台」前端、後端或跨端契約需求時，第一句必須先載入並遵循本 `admin-development` skill；未載入前不得開始分析、設計或修改程式碼。
- 架構與樣式方案一旦在需求開始時確認，整個需求週期固定使用同一方案；不得中途切換框架、狀態管理、CSS 策略、API 邊界或元件分層。若方案需要變更，必須先停止實作、說明原因、影響及遷移範圍，取得明確批准後才能切換。
- AI 開發元件或頁面時，必須依本 skill 產出程式碼，並在交付時附上自檢報告：修改檔案、責任邊界、CSS scope、API 契約、執行的檢查命令、結果及未驗證項目。
- 初次實作完成後，必須再呼叫 `code-review` skill 進行二次掃描；至少檢查 CSS 污染、未隔離 selector、跨模組隱式依賴、跨區域 import、前端複製商業規則及未驗證 API 契約。未通過不得視為完成。
- 若發現頁面與元件衝突、資料形狀不一致、樣式互相覆蓋或 API 與 UI 不相容，不得直接修改頁面以掩蓋問題；必須先修正並確認元件契約（props、events、slots、state、API response、CSS scope），再調整頁面。
- 若本次需求涉及「登入配置」（admin/src/pages/login-settings/ 或 backend 對應的 SettingsController 登入方式／短信／微信／Apple 區塊），載入本 skill 後必須先完整確認並於回覆中複述第 7 節「登入配置功能架構」的兩層職責邊界與現況限制，再開始分析或修改；未確認前不得直接動手。

## 1. 架構與責任邊界

- `admin/` 是 Vue 3 + Vite 管理介面；負責頁面、表單、互動、狀態呈現與 API 呼叫。
- `backend/` 是 NestJS + TypeScript API；負責身份驗證、權限、輸入驗證、商業邏輯、第三方整合與資料一致性。
- `prisma/` 是 PostgreSQL schema 與 migration；後台不可直接連接資料庫。
- `shared/` 只放真正跨端共用的契約或型別。
- 產品區域不得互相直接 import：`admin/` 不得引用 `src/`、`backend/`、`driver/` 或 `brand/` 的實作；跨端變更須透過明確契約。
- 前端不可決定付款、審核、退款、權限或其他商業結果；所有可信任規則必須在後端再次驗證。
- secret、第三方金鑰、session secret 只能放環境變數，不可回傳或提交至前端。

## 2. Admin 模組化

- 頁面依功能拆分至 `admin/src/pages/<feature>/`。
- `Page.js` 負責 template；`actions.js` 負責操作；`state.js` 負責狀態；`api/` 負責 API 呼叫；共用互動元件放 `admin/src/components/`。
- 正式資料必須來自 API；不可用 `localStorage` 假造正式資料。只能保存明確允許的 UI 暫存狀態。
- 主要操作必須處理 loading、success、error、empty、disabled 與破壞性操作確認。

## 3. CSS 隔離與模組化

### 全域層

- `admin/src/style.css` 只能載入基礎與真正共用樣式。
- `tokens.css` 集中管理共用顏色、字體、間距、圓角與陰影。
- `components.css`、`layout.css`、`tables.css`、`overlays.css`、`forms.css`、`states.css` 才可放共用規則。
- 全域 selector `:root`、`html`、`body`、`*` 只能出現在全域基礎層，不得出現在頁面 module。

### 頁面 module

- 每個功能頁面使用自己的 CSS 檔案與唯一 root scope，例如 `.finance-center`、`.login-settings-admin`、`.payment-settings-admin`。
- module 內所有 selector 必須由 root scope 開始：

```css
.finance-center .finance-card { /* allowed */ }
```

- 禁止無 scope 的 `.card`、`button`、`h2`、`.active`、`body` 等 selector。
- module CSS 只能 `@import './tokens.css'`；不得互相 import 其他頁面 module。共用樣式由 `style.css` 統一載入。
- 頁面 template 的根元素必須實際使用對應 scope，CSS 檔案與頁面 scope 不得不一致。
- 狀態 class 使用明確名稱，例如 `.is-active`、`.is-disabled`、`.is-collapsed`、`.has-error`，並且仍置於 module scope 之下。
- 頁面私有 token 可定義在 module root 內；不可把單頁值放進全域 `:root`。
- 不可為單一頁面需求任意修改受保護或共用 CSS；應優先在頁面 module 內增加 scoped 規則。
- 禁止用 `!important`、高 specificity 疊加或重複 root scope 來掩蓋錯誤邊界；確有必要時需先確認既有樣式來源並保留最小修正。

### 受保護樣式

`admin-select.css`、`admin-date-time-picker.css`、`users.css`、`drivers.css`、`dispatch.css`、`trips.css`、`settlements.css`、`addresses.css`、`auth.css` 的既有視覺 baseline 不可未經審查修改。共用樣式變更需要明確 review。

## 4. CSS 驗證

修改 Admin CSS 後必須執行：

```bash
npm run check:admin-style-boundaries
npm run verify:admin
```

若同時修改後端、Prisma、shared、根設定或部署：

```bash
npm run check:dependencies
npm run verify:affected
```

`check:admin-style-boundaries` 失敗時，不得以關閉檢查、增加全域 selector 或擴大 scope 來繞過；必須修正實際隔離問題。

## 5. 開發流程

1. 先執行 `npm run check:scope -- --scope admin` 或 `--scope api`。
2. 先確認 API 契約、權限與資料狀態，再修改 UI。
3. 依責任邊界在正確目錄修改，不跨區域直接引用實作。
4. 完成後執行對應的 style、dependency、build 與 verification gates。
5. UI 變更需檢查桌面、窄視窗、空資料、錯誤、loading、鍵盤焦點及主要操作狀態。

## 6. 禁止事項

- 不直接修改或刪除正式資料庫資料來配合 UI。
- 不在應用程式啟動時偷偷修改 schema。
- 不提交 `.env`、密碼或 API 金鑰。
- 不把後端商業規則複製成前端版本。
- 不以「更漂亮」為理由改動既有視覺規格。
- 不使用跨頁全域 CSS 解決單頁問題。

## 7. 登入配置功能架構（強制前置理解）

本節為「後台管理－登入配置」（`admin/src/pages/login-settings/`）功能的權威架構說明。詳細行為規範另見 `.github/instructions/login-settings-architecture.instructions.md`（依檔案路徑自動載入）。本節只說明架構本身；修改前必須先確認以下職責邊界，不得假設兩層可以互相推導或自動聯動。

### 7.1 兩層職責邊界（刻意分離，不可混淆）

登入配置頁面共 4 個分頁，分成兩層完全獨立、互不知情的職責：

| 層級 | 分頁 | 唯一職責 | 絕不負責 |
| --- | --- | --- | --- |
| 分配層 | 登入方式管理 | 決定哪個登入方式（phone／wechat／apple）開放給乘客端／司機端使用或註冊、顯示順序、顯示名稱、Logo、小程序登入模式（僅微信／僅短信／二選一） | 不驗證、不配置、不決定任何第三方憑證是否存在或有效 |
| 配置層 | 短信登入／微信登入／Apple 登入 | 讓管理員填寫對應第三方 API 所需憑證、保存、並提供連線測試讓管理員確認是否成功連接 | 不決定、不影響任何登入方式對乘客端／司機端是否可見或可用 |

這兩層之間**沒有任何自動聯動**，也不應該有：
- 配置層測試連線通過，不會自動開啟分配層的開關。
- 分配層開啟某 provider，不會檢查配置層是否已設定或測試成功。
- 這是刻意設計，不是缺陷；修改任一層前必須確認不會把另一層的職責誤植進來。

### 7.2 分配層：登入方式管理

- 正式資料表 `LoginMethodSetting`、草稿表 `LoginMethodSettingDraft`（欄位：`provider`、`enabled`、`passengerEnabled`、`driverEnabled`、`displayName`、`logoUrl`、`description`、`sortOrder`；草稿多一個 `miniProgramLoginMode`）。
- 後端端點（`SettingsController`，`backend/src/main.ts`）：
  - `GET /settings/login-methods`：讀草稿（`SUPER_ADMIN`／`OPERATOR`）。
  - `POST /settings/login-methods`：寫草稿，`$transaction` 包覆，強制包含全部 provider、型別驗證（`SUPER_ADMIN` only）。
  - `POST /settings/login-methods/publish`：草稿整批搬到正式表（`SUPER_ADMIN` only）。
  - `GET /settings/login-methods/preview-token`：取得短效 HMAC token，供後台 LIVE PREVIEW 讀草稿（`preview=1&previewToken=`）。
- 公開讀取端點：`GET /auth/login-methods?client=passenger|driver`，一般情況讀正式表；只有帶有效 `preview=1&previewToken` 才讀草稿（僅後台預覽用，非終端使用者路徑）。
- **唯一的真實生效關卡**是 `requireLoginMethodEnabled(provider, client)`：只讀正式表的 `passengerEnabled`／`driverEnabled`，每個登入端點（`phone/request`、`phone/verify`、`wechat/login`、`wechat/phone`、乘客端與司機端 `third-party`）都各自呼叫此函式再次驗證，前端開關不可能被繞過。
- 現況限制（已知、非本節要修的範圍，僅供後續工作參考）：後台目前「保存」會同時觸發保存草稿＋立即發布，沒有 UI 路徑可以只保存草稿不發布；`publishLoginMethods()` 函式存在但未綁定任何按鈕。

### 7.3 配置層：短信／微信／Apple 登入

- 資料表：`AppSetting` 單表直寫，**沒有草稿機制**，保存後立即生效（與分配層的草稿／發布兩段式完全不同）。
- 保存端點：`POST /settings`（`wechatMiniProgram`／`appleLogin`／`sms253` 區塊，皆要求 `SUPER_ADMIN`）。
- 各分頁連線測試端點與現況：

  | 分頁 | 保存欄位是否落地 | 連線測試端點 | 是否真的測試第三方 | 是否被實際登入流程消費 |
  | --- | --- | --- | --- | --- |
  | 短信登入（國內／國際） | ✅ | `GET /settings/sms253/status`、`/sms253/international/status` | ✅ 真的呼叫 253 查餘額 | ✅ `phone/request` 實際發送 |
  | Apple 登入（iOS／Web） | ✅ | `GET /settings/apple/status` | ✅ 真的解析 Private Key＋呼叫 Apple 公開金鑰端點 | ✅ `verifyAppleIdentityToken` 同時採用兩平台 audience |
  | 微信登入－小程序子分頁 | ✅ | `GET /settings/wechat/status` | ✅ 真的呼叫微信 `cgi-bin/token` | ✅ `wechat/login`、`wechat/phone` 實際使用 |
  | 微信登入－Web／Android／iOS 子分頁 | ❌ 前端 `save()` 只送出 `configurations.miniProgram`，這三組輸入值從未被送到後端；`AppSetting` 也沒有對應欄位可接收 | 共用同一顆「檢查服務連線」按鈕、同一個 `/settings/wechat/status`，**永遠只測小程序**，與這三個子分頁填的內容無關 | ❌ | ❌ 司機端 `third-party` wechat 分支寫死擲出「微信網站 OAuth 尚未配置」；乘客端 Web／App 版微信按鈕點擊只彈出「只支援小程序」提示，不會呼叫後端 |

  修改微信登入分頁前，必須先確認是否要補齊 Web／Android／iOS 的後端欄位與真實串接，或維持現況只支援小程序；不得假設這三個子分頁目前有任何作用。

- `GET /settings/wechat/status` 已補上 `requireRole(["SUPER_ADMIN"])`，與 `apple/status`、`sms253/status`、`sms253/international/status` 一致；登入配置頁所有端點（分配層與配置層）寫入與連線測試一律僅限 `SUPER_ADMIN`，沒有任何 `OPERATOR` 可寫入或可測試連線的路徑。
- 前端 `admin/src/main.js` 的 `adminLoginSettingsContext` 把 `canWrite` 綁定到 `isSuperAdministrator`（而非全站通用、僅排除 `VIEWER` 的 `canWrite`），讓 `OPERATOR` 在此頁看到的欄位／按鈕可編輯狀態與後端實際權限一致（唯讀）；新增其他「全頁僅 `SUPER_ADMIN` 可寫」的設定頁時可參考此模式，不要預設沿用全站 `canWrite`。
- 面向終端使用者的簡訊發送（`sendSms253()`，被 `phone/request` 等登入／註冊端點呼叫）失敗時只回傳固定的友善訊息，不會把 253 原始 `errorMsg` 回給終端使用者；原始供應商錯誤仍完整寫入 `Sms253Message`，可在後台 `GET /settings/sms253/messages` 查詢。後台「測試」按鈕（`POST /settings/sms253/test` 等，`SUPER_ADMIN` only）與各 `*/status` 端點保留原始錯誤文字，供管理員診斷使用，兩者不可混淆處理方式。
