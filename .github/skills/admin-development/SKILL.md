---
name: admin-development
description: Master Travel Project 後台與 API 的長期開發及隔離規範；保護頁面獨立、尺寸間距標準、業務契約與跨端授權，支援逐頁驗收及按影響範圍驗證。
---

# 後台長期開發與隔離規範

本規範是長期架構與逐頁驗收標準，不代表目前所有頁面已符合。核心目標是：修改單頁的樣式、狀態或行為，不得意外污染其他頁面；必要的跨頁、跨端業務聯動須透過明確契約及授權管理。現況與要求的差距應逐頁記錄、按批准範圍修正，不為遷就現況降低標準，也不因更新 Skill 自動啟動程式重構。

## 0. 強制啟動與交付流程

- 新需求涉及 `admin/` 管理後台、`backend/` 後端 API（不限於管理端 API），或與它們相關的 `shared/`／`prisma/` 跨端契約時，必須先載入並遵循本 skill，再開始分析、設計或修改程式碼。
- 單純盤點文件、詢問 Skill 內容或觸發條件，不視為開發需求。純文件校正按相關責任邊界核對內容，不因此啟動 UI／API 實作流程。
- 載入 skill 不代表取得修改授權；使用者要求「先理解」時只分析，要求分份確認時只處理當次指定文件，不自行接續其他文件或實作。
- 開始前確認指定區域與頁面；功能相關不代表取得其他區域的修改授權。跨端／跨區域修改（包括 Admin、Backend、乘客端、司機端、shared、Prisma、部署等）必須先提出原因、影響範圍、預計變更、相容性與驗證方案，等待明確同意後才能開始。使用者已明確批准的跨端範圍不需重複詢問，但不得自行擴大。
- 未批准前可讀取相關實作以分析契約，不得修改未授權區域的程式、配置、資料結構或文件。能安全獨立完成指定區域時，列明未完成的跨端配合；若缺少跨端配合就無法正確運作，停在安全邊界，不以補丁掩蓋或宣稱完整完成。
- 已確認範圍內自主完成並整體回報，不反覆要求確認；遇到範圍擴大、重大架構或共用契約改變時仍須先確認。保證業務一致性不是擴大修改範圍的授權。
- 架構與樣式方案一旦在需求開始時確認，整個需求週期固定使用同一方案；不得中途切換框架、狀態管理、CSS 策略、API 邊界或元件分層。若方案需要變更，必須先停止實作、說明原因、影響及遷移範圍，取得明確批准後才能切換。
- AI 開發元件或頁面時，必須依本 skill 產出程式碼，並在交付時附上自檢報告：修改檔案、責任邊界、CSS scope、API 契約、執行的檢查命令、結果及未驗證項目。
- 程式實作或修復完成後，必須再呼叫 `code-review` skill 進行二次掃描；依實際變更檢查適用項目，包括 CSS 污染、未隔離 selector、跨模組隱式依賴、跨區域 import、前端複製商業規則及未驗證 API 契約。純後端變更不要求 CSS 檢查。未通過適用檢查不得視為完成。
- 純文件變更只需核對敘述、來源、連結與 diff；若專案有適用文件測試則執行。不因文件提及 API 或 UI 就要求 build、UI 檢查或程式碼 review；若同時修改程式或配置，則按實際影響驗證。
- 若發現頁面與元件衝突、資料形狀不一致、樣式互相覆蓋或 API 與 UI 不相容，不得直接修改頁面以掩蓋問題；先釐清元件契約（props、events、slots、state、API response、CSS scope），在授權範圍內修正。涉及未授權的共用或跨端變更時，先提出並等待同意，不能以修正契約為由越界。
- 若本次需求涉及「登入配置」（admin/src/pages/login-settings/ 或 backend 對應的 SettingsController 登入方式／短信／微信／Apple 區塊），載入本 skill 後必須先完整確認並於回覆中複述第 7 節「登入配置功能架構」的兩層職責邊界與現況限制，再開始分析或修改；未確認前不得直接動手。

## 1. 架構與責任邊界

- `admin/` 是 Vue 3 + Vite 管理介面；負責頁面、表單、互動、狀態呈現與 API 呼叫。
- `backend/` 是 NestJS + TypeScript API；負責身份驗證、權限、輸入驗證、商業邏輯、第三方整合與資料一致性。
- `prisma/` 是 PostgreSQL schema 與 migration；後台不可直接連接資料庫。
- `shared/` 只放真正跨端共用的契約或型別。
- 產品區域不得互相直接 import：`admin/` 不得引用 `src/`、`backend/`、`driver/` 或 `brand/` 的實作；跨端變更須透過明確契約。
- 前端不可決定付款、審核、退款、權限或其他商業結果；所有可信任規則必須在後端再次驗證。
- Secret、第三方金鑰與 session secret 只能由受控的後端配置機制管理，例如環境變數或經批准的安全儲存；不得提交至原始碼、公開回傳或打包到前端。管理員憑證配置須遵循對應的儲存、遮罩及讀取契約；本規範不授權新增儲存方案。

## 2. Admin 模組化

- 頁面依功能拆分至 `admin/src/pages/<feature>/`。
- `Page.js` 負責 template；`actions.js` 負責操作；`state.js` 負責狀態；`api/` 負責 API 呼叫；共用互動元件放 `admin/src/components/`。
- 正式資料必須來自 API；不可用 `localStorage` 假造正式資料。只能保存明確允許的 UI 暫存狀態。
- 主要操作必須處理 loading、success、error、empty、disabled 與破壞性操作確認。

### Domain Context 與狀態邊界

- 頁面直接注入所需 domain Context，只暴露必要的 state、computed 與 actions；不得恢復單一全域 `adminContext` 或以聚合 Context 作 fallback。收窄依賴時同步核對 template、事件及 loader，避免未定義屬性。
- 領域可依 Dashboard、Users／Addresses、Drivers、Trips、Dispatch／Charter、Vehicles／Pricing、Membership、Promotions、Payments、Notifications、Administrators／Audit Logs、Operations 分區；這是責任劃分，不要求每次完整拆分全部現有頁面。
- 表單草稿、選取項、展開狀態及局部 loading 屬於頁面私有狀態，不得由其他頁面直接讀寫。領域資料與應用級 session／語言／導航可以有明確共享責任，不為隔離而複製多份相互不一致的業務資料。
- 頁面或獨立元件不得隱式依賴其他頁面的 Context、DOM、class 或生命週期；必要聯動透過明確的 props、events、API 或領域操作契約。

### 入口、載入與導航

- 入口以 App 組裝、Context 提供、根模板、元件註冊及初始化接線為職責；頁面模板、業務操作與資源載入應逐步置於相應模組，不把長期目標描述為已全部完成。
- 載入協調保留設定 hydration、目前管理員載入、依 view 載入資源、錯誤處理、session 清理、過期請求保護及導航後載入。過期結果不得更新不相符的頁面或 session。
- 導航更新 view、關閉行動導航、觸發適用載入，並保留車型、定價、額外服務及路線最低價子頁籤；不得依賴手動 DOM click 或 mount。
- 監聽器、計時器、訂閱及請求具有明確生命週期與取消／清理責任；避免重複註冊、切頁後副作用或過期結果覆蓋新資料。

### 元件註冊與 DOM

- 全域註冊只保留真正跨頁必要的共用元件，例如 LoadingState、ErrorState、ToastHost、ConfirmDialog；頁面與頁面專用元件在使用邊界局部註冊。現有全域頁面註冊是待逐頁校正項目，不是永久豁免。
- 禁止以 MutationObserver 取代 Vue 狀態流程、innerHTML 建立 Vue 頁面、querySelector 手動掛載、舊 mount helper、DOM click listener 取代 Vue event binding，或以 DOM 內容同步 Vue state。
- DOM 操作限於必要的 focus、Escape／Tab、scroll lock、自動聚焦等可及性需求；其他平台需求須先說明並確認邊界，保留清理，不自行放寬成頁面資料流 workaround。

## 3. CSS 隔離、元件獨立與視覺規格

### 頁面自主外觀

- 每頁的業務排版、卡片、表格外觀、表單排列、尺寸、間距與響應式規則由該頁管理；使用獨立 CSS 與唯一 root scope，template 必須實際使用該 scope。
- 所有頁面 selector 都在本頁 root 下；不得依賴另一頁的 class、樣式檔或廣泛共用的 `.panel`、`.card`、`.active` 等規則控制業務外觀。狀態 class 也要隔離，例如 `.finance-center .is-active`。
- 頁面及獨立元件不得互相 import 樣式。獨立元件以自己的 root 封裝樣式，頁面不得任意覆蓋其內部 DOM；外觀調整透過已定義 props、variant、slots 或局部 CSS API。
- Teleport 到頁面 root 外的 Modal／Drawer 必須有本頁專用 root 或獨立元件 root；不能因此退回無邊界 selector。
- 允許適度重複簡單 CSS，以換取獨立修改能力；不為減少幾行 CSS 建立跨頁依賴。
- 禁止以 `!important`、高 specificity 疊加或重複 root 掩蓋邊界問題。頁面私有值定義在本頁／元件 root，不放全域 `:root`。

```css
.finance-center .finance-card { padding: 16px; }
```

此例只示範 selector 隔離；數值不是已批准的統一尺寸規格。

### 尺寸與間距的統一邊界

- 統一的是規格，不是 CSS 實作：同類、同用途、同狀態的獨立元件須遵循相同尺寸、間距、密度及響應式邊界，各自管理自己的 CSS。
- 規格涵蓋控制項高度、按鈕尺寸、欄位內／欄位間／區塊間距、表格密度、彈窗尺寸與窄視窗限制。下列範圍是一般 Admin UI 的建議基準，不是固定全站數值，也不是已完成全部頁面驗證的結果；未涵蓋的類別仍標明待確認。
- 先分類再套用：一般控制項（按鈕、輸入框、選擇器）、導航元件（頁籤、導航列）、內容容器（卡片、工具列、彈窗）、內容型元件（圖片、多行文字、訂單詳情）不可混用同一尺寸限制。頁籤、工具列及特殊內容須按用途另行確認，不因超出一般控制項範圍直接判定錯誤。

以下以桌面後台 CSS px 為單位，不套用乘客固定畫布或司機端。窄視窗須另驗證內容、操作與溢出。

| 類別 | 建議範圍 | 適用邊界 |
| --- | --- | --- |
| 標準按鈕高度 | 36–44 px | 同一操作區、同級按鈕一致。 |
| 緊湊按鈕高度 | 28–36 px | 表格列操作或密集工具列，不當作觸控點擊區下限。 |
| 按鈕左右內距 | 12–20 px | 同級一致，寬度隨文字調整。 |
| 標準輸入框／選擇器高度 | 36–44 px | 同一表單對齊，多行輸入另計。 |
| 控制項左右內距 | 10–16 px | 留足文字、圖示及清除按鈕空間。 |
| 標籤與控制項間距 | 6–10 px | 同一表單節奏一致。 |
| 欄位間距 | 12–20 px | 區分標準與緊湊密度。 |
| 表單分組間距 | 20–32 px | 明顯大於欄位間距。 |
| 一般卡片／面板內距 | 16–24 px | 窄視窗可用12–16 px；專用工具列另計。 |
| 頁面區塊間距 | 16–32 px | 依資訊層級選擇，不任意混用。 |
| 表格儲存格內距 | 水平10–16／垂直8–14 px | 同一密度一致，多行內容允許增高。 |
| 單行表格列高 | 約40–56 px | 參考呈現範圍，不以固定高度截斷內容。 |
| 圖示與文字間距 | 6–10 px | 同類操作一致。 |
| 彈窗內容內距 | 20–28 px | 窄視窗可用16–20 px。 |
| 彈窗操作按鈕間距 | 8–12 px | 同一操作區一致。 |
| 彈窗寬度級別 | 小360–480／中480–640／大640–960 px | 建議級別，依內容確認；可小於級別下限以適應窄視窗，左右至少保留16 px安全距離。 |

- 範圍不是任意取值的許可：同類、同用途、同密度、同狀態元件選用一致規格；不同密度可不同，但同一區域不無理由混用。
- 長文字、多語言、縮放及多行內容允許撐高；觸控場景有效點擊區建議至少44×44 px，視覺圖示可小於點擊區。超出建議範圍須記錄內容、可及性或業務理由。
- 例：頁籤高度54 px不能直接套標準按鈕上限判錯；圖片高度54 px不屬於控制項高度；工具列內距28 px不直接套一般卡片上限。這些例子不是指定的全站標準。
- 逐頁校正時結合用途、同類一致性與可操作性判斷，不只看數值是否落在範圍；本節不授權批量調整既有 UI。
- 特殊用途可有明確例外，記錄原因與適用範圍；不得每頁任意偏離規格。一致性由規格與逐頁驗收保證，不靠全域 selector 自動套用。
- Tokens 是可選實作方式，不是強制共享依賴。若使用全域 tokens，修改視為全站影響；單頁優化不得修改全域 token，也不得透過繼承意外改變內嵌元件。
- 全站規格調整按批准範圍逐一更新及驗證，不以修改全域 CSS 強制覆蓋所有頁面。

### 全域層最小化與共用元件

- `admin/src/style.css` 是載入入口，統一載入不等於隔離。全域層限必要 reset、基礎設定、已批准 tokens 與應用外框；裸元素 selector 不承載業務外觀。
- `components.css`、`tables.css`、`overlays.css`、`forms.css`、`states.css` 等既有檔名不是共用規則的許可。通用表單、表格或 `.panel` 等外觀應逐步移回頁面，或封裝為有自身 root 與明確契約的元件。
- 真正共用元件只控制自身內部外觀與互動，不控制頁面布局、不讀頁面私有 Context，也不暗中修改頁面狀態。某頁需大幅不同外觀時，優先使用頁面專用元件。
- 單頁需求不得改共用預設值。共用元件／樣式／token 變更須先列引用者與影響，確認範圍後回歸；不能宣稱共用依賴沒有跨頁風險。
- 錯誤例：修改全域 `.panel` 只為調整財務卡片。正確例：修改 `.finance-center .finance-card`，保留其他頁面與共用預設行為。

### 舊樣式遷移

`admin-select.css`、`admin-date-time-picker.css`、`users.css`、`drivers.css`、`dispatch.css`、`trips.css`、`settlements.css`、`addresses.css`、`auth.css` 的既有視覺 baseline 須保護。受保護不代表永久免除隔離：批准校正時先記錄外觀與功能，再承接頁面需要的樣式、移除隱式依賴並驗證，不直接刪除共用規則造成退化。

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

`check:admin-style-boundaries` 失敗時，不得以關閉檢查、增加全域 selector 或擴大 scope 來繞過；必須修正實際隔離問題。現有工具只覆蓋部分模組，通過不代表全頁隔離或無視覺污染；逐頁驗收另核對 root 實際使用、外部業務樣式依賴、Teleport、尺寸規格及相鄰／引用頁面回歸。新增頁面應納入適用檢查，工具擴充亦須取得對應修改授權。

## 5. 開發流程

1. 確認指定區域與授權頁面，先區分單頁呈現／局部互動與業務規則／API／資料契約變更，列出依賴、引用者及跨頁／跨端影響。單頁工作不順便修改共用預設、其他頁面或其他端別；需擴大範圍時依第 0 節提出方案並等待同意。
2. 先確認 API 契約、權限與資料狀態，再修改 UI；純後端需求先確認輸入、輸出、權限與商業規則，不要求修改 UI。
3. 程式變更前執行對應 scope 檢查：Admin 使用 `npm run check:scope -- --scope admin`，API 使用 `--scope api`；Prisma、shared、根設定或部署等跨區域變更使用 `--scope cross-cutting`。純文件變更不套用程式開發 gates。
4. 依責任邊界在正確目錄修改，不跨區域直接引用實作。
5. 按變更範圍執行最小但完整的驗證：Admin 使用 `npm run verify:admin`，API 使用 `npm run verify:api`；Admin CSS 另遵循第 4 節。manifest、import 或跨區域依賴變更執行 `npm run check:dependencies`；跨端／Prisma／shared／根設定／部署變更執行 `npm run verify:affected` 並確認所有受影響端別。依賴安裝與測試遵循專案既有工具，不因載入 skill 而執行無關命令。
6. 僅 UI 變更需檢查桌面、窄視窗、空資料、錯誤、loading、鍵盤焦點及主要操作狀態。純後端變更驗證適用的 API 行為與資料一致性；純文件變更依第 0 節核對。
7. 重大重構擴大適用的功能回歸，不固定要求無關端別建置。按影響檢查 Dashboard、導航、Drivers／Dispatch、角色與報價；只有涉及乘客契約時才增加訂單／行程頁回歸。平台行為變更依對應 Skill 驗證，不以 H5 取代其他受影響平台。
8. `verify:affected` 根據工作樹選區域；混有其他工作時先核對實際範圍，使用既有選項避免誤把其他變更算成本次驗證。scope、依賴檢查與 build 均不能取代功能或視覺回歸。
9. 程式變更完成驗證後，依第 0 節執行二次 review，修正本次變更造成或緊密相關的問題並重新驗證；純文件變更不要求程式 review。
10. 交付列出實際修改、檢查命令與結果、未驗證項目；不把規範要求當成已完成驗證。

### 業務行為一致與必要聯動

- 實作獨立，業務契約一致：同一業務規則由後端權威管理，各頁／各端可有不同呈現，但不能各自創造不同結果。刻意獨立的功能不得新增自動聯動，例如第 7 節登入分配層與配置層。
- 修改前列明舊行為、新行為、必要聯動與禁止副作用，辨識受影響頁面、端別、既有資料及進行中流程；超出批准範圍時依第 0 節先等待同意。
- 跨端方案確認 API 舊版相容、生效時間、既有訂單處理、快取刷新、部署順序與回退策略，不假設全部端別同時更新，也不假設舊資料自動套用新規則。
- 保護 CRUD、endpoint、HTTP method、payload、權限、派單與導航；有意變更契約時須明確批准並驗證。未登入／session 失效使用 401，已驗證但權限不足使用 403；SUPER_ADMIN、OPERATOR、VIEWER 的能力依各端點規則核對，不只依通用 canWrite。
- 報價核對距離分段、最低車資、即時訂單費、額外服務、優惠疊加、RMB／HKD、durationSeconds、originRegion、requiredWithinMinutes 的 undefined／null／空字串及最低車資 currency。距離費→最低價→額外費→優惠→顯示幣別是需求摘要，不是完整算價公式；變更前確認即時費、優惠基數、換算與四捨五入的完整契約，不能依摘要擅改後端。
- 驗證預期聯動確實發生，也驗證不應改變的行為保持不變。例：改財務卡片間距只改本頁；改後台車資規則則先提出後端與乘客／司機報價影響，未批准前不得跨端實作。

### 逐頁驗收

逐頁驗收與校正只在使用者明確啟動指定頁面的實作／校正工作時開始；更新或載入 Skill 不會自動啟動全頁盤點、驗收或修正。單純分析仍可按要求核對，但不代表取得實作授權。

每頁記錄原有視覺與功能基準、依賴及差距，再按批准範圍校正。驗收使用「符合／部分符合／不符合／未驗證」，附證據；缺少證據不判定符合。

### 修正時的非破壞性要求

- 隔離修正預設只改內部結構與依賴，不改既有 UI 外觀、布局、尺寸、響應式、互動或功能。尺寸建議範圍不是重設既有 UI 的授權；必要的視覺或業務改變須另外提出並取得同意。
- 修正必須維持本頁既有功能與 UI，且不得破壞或污染其他頁面。修改前記錄本頁基準，辨識共用樣式、元件、Context、loader 與 API 引用者，確立需要回歸的頁面與狀態；不得只驗證修改頁。
- 移除共用 CSS 或重整元件前，先承接本頁需要的樣式與行為；共享規則仍有其他引用者時不得刪除或改變其預設。例：將卡片樣式移到本頁 root，需保持本頁原外觀，並確認其他使用原規則的頁面不變。
- 修改後以相同 viewport、資料、角色與操作狀態比對前後 UI，驗證適用的 CRUD、導航、表單、彈窗、loading／error／empty 與窄視窗行為，並回歸直接受影響頁面。Build 通過不能代替此項驗證。
- 發現本次造成的退化須修正並重新驗證；若修復必須越過授權範圍，先停止並等待批准，不以修改其他頁面掩蓋問題。未驗證項目與限制必須明列，不能無證據宣稱「保證完全無影響」或將該項驗收判為符合。

| 項目 | 驗收內容 |
| --- | --- |
| 樣式隔離 | 業務 CSS 歸屬、唯一 root、selector 不外洩、不依賴外部業務規則。 |
| 尺寸間距 | 同類元件符合已確認規格，特殊用途例外有記錄；未確立標準時標待確認。 |
| 元件與 Teleport | 獨立 root、明確 props／events／slots／CSS API，彈窗與抽屜不失去隔離。 |
| Context 與資料 | 必要依賴、私有狀態不跨頁讀寫、共享資料責任明確。 |
| 載入與生命週期 | 導航、競態、session、錯誤、監聽與訂閱清理。 |
| 功能與契約 | CRUD、角色、報價、派單及適用跨端聯動維持正確。 |
| 污染回歸 | 本頁與直接受影響頁面的外觀及行為均有驗證。 |
| 交付證據 | 修改範圍、命令與結果、瀏覽器／測試證據、未驗證與未授權待辦。 |

### 專項規範與來源

- 地址摘要與詳細資料依 `.github/instructions/address-display.instructions.md`，僅在適用首頁／緊湊路線欄位使用 18 Unicode 字元上限（包含 `...`），不縮減選擇器、搜尋或詳細地址資料。
- 固定 430×932 畫布依 `.github/instructions/ios-screen-scaling.instructions.md`；不把此規格套用所有 Admin 頁面，也不把 Admin CSS 套用乘客／司機端。
- 涉及乘客架構、設計切版或手機開發模式時，搭配 passenger-modularity-maintenance、figma-ui-slicing、phone-login-development-mode；載入其他 Skill 不增加修改授權。
- 實作核對來源：`admin/src/main.js`、`admin/src/utils/admin-load-orchestrator.js`、`admin/src/layout/navigation.js`、`admin/src/utils/register-admin-components.js`、`admin/src/styles/`、`scripts/check-admin-style-boundaries.mjs`。來源反映現況，不取代本規範長期目標。
- 不將歷史提交、工作項目數、當次 build／回歸或乾淨工作樹記錄當作永久規則或目前證據。

## 6. 禁止事項

- 不直接修改或刪除正式資料庫資料來配合 UI。
- 不在應用程式啟動時偷偷修改 schema。
- 不提交 `.env`、密碼或 API 金鑰。
- 不把後端商業規則複製成前端版本。
- 不以「更漂亮」為理由改動既有視覺規格。
- 不使用跨頁全域 CSS 解決單頁問題。
- 測試資料只在明確授權的測試環境建立與清理，不刪除或修改真實帳號／正式資料。
- 不因完成開發自動 commit／push。取得提交授權後，先核對差異與範圍，遵循 repository 既有 Conventional Commits 格式，並附 `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`（使用者明確要求省略時除外）。

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
