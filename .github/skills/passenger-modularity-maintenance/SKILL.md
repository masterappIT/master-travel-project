---
name: passenger-modularity-maintenance
description: 分析、開發、修復或重構 uni-app 乘客端 src/ 的分層與流程時使用；保護 API、storage、導航、embedded page host、平台生命週期及固定畫布行為，按授權範圍低風險優化。
---

# 乘客端模組化開發與架構維護

## 1. 定位與授權

本 skill 適用於 uni-app 乘客端 `src/` 的功能開發、責任分層、修復與重構，不把 Admin、Flutter 司機端或品牌端當成同一套前端架構。

- 維持既有功能、資料契約、導航與跨端行為，以低風險 domain 分層及局部流程抽離為原則，不全面重寫。
- 載入 skill 不等於重構授權。「先理解」「核對架構」「提出建議」只分析；實作只處理明確需求，不把觀察到的所有大型檔案當成待辦。
- 純文件校正不啟動應用建置、頁面截圖或程式重構。發現無關問題先報告，不順便修復。
- 行數與重複程度只是觀察訊號，不設固定行數門檻，不以沒有評估方法的模組化百分比作驗收。

## 2. 現有分層與依賴邊界

| 層級 | 責任與約束 |
|---|---|
| `src/pages/` | 頁面組合、生命週期、頁面輸入與導航入口；不持續累積跨 domain 的私有流程。 |
- `src/components/` 的業務元件不得直接使用原生 UI 物件或平台預設控件承載產品外觀與互動，例如裸用 HTML／uni-app 表單控件、原生日期／選擇器或平台預設彈窗。必須使用專案既有或明確封裝的 UI 元件，透過 props/events 及自身樣式邊界提供狀態與可及性；缺少對應元件時先補足封裝，不以原生物件暫代。原生 API、平台生命週期及底層能力仍只能由 `src/platform/` 或既定 service 邊界管理，不得直接成為頁面 UI 依賴。原生元素若因框架需要，只能存在於封裝元件內部，頁面不可依賴其預設外觀、DOM 或行為。
| `src/composables/` | 有明確責任的狀態與流程組合；區分每次呼叫的局部實例與模組級共享狀態。 |
| `src/services/` | API 與外部服務契約；不依賴頁面私有實作。 |
| `src/stores/` | 確有跨頁共享需求的狀態；不將所有局部表單或每個頁面都搬入 store。 |
| `src/utils/` | 既有格式化、轉換、認證、導航、儲存等工具；不可假設目前所有 utils 都是純函式。 |
| `src/platform/` | 既有平台識別與適合集中管理的平台能力；不取代 uni-app 編譯條件與原生生命週期。 |

- 目錄與既有能力是現況；責任約束是新增及修改程式時的維護目標，不代表既有程式已全部完成分層整改。
- 遵守 `config/dependency-boundaries.json`：乘客端不得直接引用後端、Admin、司機或品牌端原始碼；允許的共享契約依既有 `shared/` 邊界使用。
- 頁面不依賴其他頁面的私有業務實作。既有 embedded page host 對頁面元件的組合屬需保護的宿主責任，不因看到跨頁 import 就直接刪除。
- 頁面內合理拆分可在需求範圍內執行；跨頁、跨 domain 或跨端共用抽取，先提出責任、公開介面與依賴方向並取得批准。
- 既有依賴檢查主要保障產品端別邊界，不把通過該檢查當成所有乘客 domain 分層均已驗證。

## 3. API 邊界與相容拆分

`src/services/api.ts` 是既有 API 聚合入口。若需求涉及拆分，先依實際呼叫、domain 及契約決定範圍，不強制建立固定數量的 service 檔案。

- 共用 HTTP 能力保留各平台 API base URL、token 注入、逾時、response parsing、錯誤內容及必要 request options。
- 核對不同方法的差異，不在抽取時悄悄統一原本不同的錯誤、逾時或請求行為。保留 401 的認證清理、登入導航及不應自動跳轉的例外。
- 對外函式名稱、參數、回傳型別、端點、payload、可選欄位及錯誤語意維持相容；改契約前確認呼叫端與後端影響。
- domain service 負責 API 契約與資料轉換；composable 負責頁面流程組合。避免將表單狀態、路由與 storage 決策塞進通用 HTTP client。
- 拆分時先保留舊 export 作相容層，逐步遷移授權範圍內的呼叫端；相容層不得造成循環依賴或重新成為業務聚合中心。
- 不以重構為由改動登入、權限、價格、訂單狀態或支付行為，不用假資料掩蓋契約差異。

## 4. 狀態、Storage 與 Navigation

### 狀態及流程

- 先核對既有 `useCurrency`、`useTripRouteMap`、trip store 等能力，避免新建重複幣別、地圖或訂單狀態。
- 分清局部 UI、頁面流程、跨頁共享與持久資料；保留 watch、訂閱、定時器及生命週期清理行為。
- 保留非同步請求的時序、取消與過期結果處理；發現競態缺陷時先說明影響，在授權範圍內修復，不把錯誤行為當成架構約束。
- 有多處重複、責任混雜、需要獨立測試或經常互相影響時才考慮抽離；不為縮短檔案建立大量只轉呼叫的 composable。
- 不建立單一全域 `clientContext`，不把所有狀態搬入 Pinia，不為每個頁面建立專用 store。

### Storage

- 先查明既有認證、訂單、個人資料及錢包儲存工具與讀寫位置，按 domain 逐步整理，不另建平行來源。
- 保留 key、資料形狀、序列化、預設值、清理時機、登入／登出行為及同步讀取語意。
- 變更 key 或資料格式須有相容讀取與遷移方案，不能讓已安裝客戶端的資料、草稿或選擇狀態無故失效。

### Navigation 與頁面宿主

- 沿用 `src/utils/navigation.ts` 的公開導航能力，保留參數編碼、返回來源、快取及 embedded page host 行為，不散落複雜返回策略或 URL 字串。
- `src/pages/index/index.vue` 同時承擔首頁流程與 embedded page host 的頁面組合；抽離地址、地圖、叫車或包車流程前，先辨識兩種責任。
- 不因抽 composable 改變宿主啟用、快取頁面掛載、路由切換、頁面生命週期與登入守衛，也不以 DOM 操作取代既有狀態機制。
- `src/App.vue` 保留啟動、顯示／隱藏、平台初始化與必要全域協調。抽離 Splash、滑動返回或消息訂閱時，保留註冊、移除、啟停及平台條件，不能重複訂閱或遺留 listener。

## 5. 平台、固定畫布與樣式

- 遵循 `.github/instructions/ios-screen-scaling.instructions.md`，固定畫布使用單一等比 scale，不用獨立軸縮放，不為整理程式修改縮放核心。
- 核對 `useResponsiveCanvas` 與 `useH5ResponsiveCanvas` 的目標平台及使用方式，保留 uni-app 條件編譯、平台初始化與原生差異，不直接合併兩套能力。
- 保護安全區、鍵盤遮擋、地圖、fixed 元件、Modal／Picker、底部導航及固定頁面的滾動規則。
- 純邏輯重構不得改變顏色、尺寸、間距、素材或互動外觀。涉及設計切版時載入 `figma-ui-slicing`；地址摘要變更遵循 `.github/instructions/address-display.instructions.md`，保留詳細資料供選擇及搜尋。
- 沿用 `src/styles/tokens.css` 及目標元件的樣式邊界，不把所有 CSS 搬到全域，不為移除 inline style 或重複尺寸設定而破壞畫布布局。
- 涉及開發模式手機登入／換綁手機時另載入 `phone-login-development-mode`；涉及後端或管理端契約時另遵循 `admin-development`，不借前端重構改寫跨端契約。

## 6. 局部優化程序

1. 確認本次需求、受影響頁面、平台與公開契約，讀取相關指示及呼叫端。
2. 辨識要抽離的責任、現有能力與資料生命週期；對跨模組重構先提出方案並取得批准。
3. 小範圍抽離並保留相容入口，不一次遷移所有 API、頁面、storage 或樣式。
4. 核對新依賴方向、事件與生命週期、非同步流程及資料契約，修復本次變更引入的問題，不擴大處理無關既存問題。
5. 驗證受影響流程與平台；交付目前完成範圍及剩餘限制，不把建議順序當成已授權的後續任務。

## 7. 驗證與交付

- 使用既有 scripts 與相關測試執行最小完整驗證；可使用 `npm run check:scope -- --scope passenger`、`npm run check:dependencies` 及 `npm run verify:affected`，先核對其覆蓋範圍。scope 與依賴檢查不是乘客端功能測試，不能據此判定業務流程正確。
- `verify:affected` 依 Git 差異及 scope map 選擇端別，規範目錄等共用變更可能觸發所有端別建置。純 Skill／文件變更不執行此 runner；混有其他未提交工作時，先核對所選範圍及 `--area`、`--base`、`--staged` 的實際語意，避免將無關工作納入本次驗證，不改動或撤回他人變更。
- UI／平台變更依縮放指示驗證 H5、微信小程序、App Plus；共用 API、導航或狀態重構也須核對三端編譯及相關行為，不能只憑 H5 build 宣稱跨端完成。
- 三端建置可使用 `npm run verify:passenger`，或在針對性驗證中執行其對應命令：

```bash
npm run build:h5
npm run build:mp-weixin
npx uni build -p app-plus
```

- 依變更驗證登入與失效 session、首頁地址／地圖、報價與車型選擇、訂單流轉、返回／快取、資料持久化及長文字／空資料等實際受影響項目，不無故跑無關全套流程。
- 編譯通過不等於原生裝置或運行流程通過；無法檢查某平台、頁面或實際 API 時，說明未驗證範圍與原因。
- 純文件新增或校正只核對來源、命令、連結、frontmatter 及 diff；有適用文件測試才執行，不要求應用 build 或安裝新工具。
- 交付列出修改範圍、保留的契約、相容遷移、驗證命令與結果及未驗證事項。

## 8. 實作來源與例子

現況核對來源：`src/services/api.ts`、`src/pages/index/index.vue`、`src/App.vue`、`src/utils/auth.ts`、`src/utils/navigation.ts`、`src/composables/`、`src/stores/trip.ts`、`src/platform/index.ts`、`config/dependency-boundaries.json` 與根目錄 `package.json`。每次依實際程式重新核對，不固化檔案行數或模組化比例。

**正確：** 需求只涉及通知 API 整理時，先核對認證與錯誤處理，保留舊 export 並只遷移相關呼叫端；不順便拆所有訂單與支付 API。

**正確：** 抽離首頁地址流程前區分 embedded page host 與叫車狀態，保留快取、導航及詳細地址資料，驗證相關三端行為。

**錯誤：** 為減少首頁行數刪除宿主頁面 import、把所有狀態放進全域 context，或為統一 HTTP client 改變 401 跳轉，僅確認 H5 build 成功便宣稱完成。
