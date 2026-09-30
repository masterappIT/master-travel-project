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
