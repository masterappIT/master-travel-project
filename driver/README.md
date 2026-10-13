# Driver Web

Driver Web 是 Flutter Web 司機端產品，負責司機登入、接單與訂單操作介面。

## 開發與建置

```bash
cd driver
flutter pub get
flutter build web
```

正式建置會由根目錄的 GitHub Actions 使用 `flutter build web --release`，並把 `DRIVER_API_BASE_URL` 設為同站 `/api`，由 Flutter 依實際頁面來源解析成絕對 URL。詳細正式環境部署請參考 [正式環境部署文件](../docs/PRODUCTION-DEPLOYMENT.md)。

## 啟動資源交付

- Flutter bootstrap 固定使用建置產物中的 `canvaskit/`，保留原有 renderer 與引擎版本，不從 Google CDN 下載 CanvasKit。
- Flutter 3.47.4 CanvasKit 在 FontManifest 未宣告 Roboto 時仍會於啟動階段下載一份 Roboto fallback。Bootstrap 將 fallback 基底指向站內 `fonts/`，提供引擎要求的同一份 Roboto WOFF2（SHA-256 `35b02ca266b79eb4996590f15817425a1ce9ebf48f84471843233ff614656bf2`）；字體採 SIL Open Font License 1.1，授權見 `web/fonts/roboto/OFL.txt`。此舉去除該字體的跨站下載依賴，並不改變 Noto Sans TC 的字形與字重。
- 共用前端容器只針對司機端 `assets/assets/fonts/NotoSansTC-*.ttf` 產生 Brotli 與 gzip 副本；Nginx 依瀏覽器的 `Accept-Encoding` 優先提供 Brotli，否則沿用 gzip 或原始 TTF。壓縮傳輸解碼後的字體內容與快取規則不變。
- 共用前端容器也為 `canvaskit/**/*.wasm` 產生 gzip 副本（包含根目錄）；Nginx 只在 `canvaskit/` 的 WASM 路徑啟用靜態 gzip。原始 WASM 保留，不支援 gzip 時回退原檔，解壓後內容、`application/wasm` MIME、renderer、引擎版本及快取規則不變。沒有 CanvasKit 的其他前端不產生副本。
- 正式 Driver 建置把 API 基底指向同站 `/api`，使一般入口與訂單邀請的瀏覽器請求避開跨站 CORS 預檢。容器對 Driver 的 `main.dart.js` 與 `canvaskit/**/*.wasm` 增加 Brotli 副本，瀏覽器不支援時沿用 gzip 或原檔；解壓後內容、MIME 與 renderer 不變。這減少冷下載位元組，正式首次可操作時間仍需真機量測。
- HTML 不預載中文字體，避免字體在啟動最早階段與主程式及 CanvasKit 競爭；Flutter CanvasKit 仍會在首屏前載入 FontManifest 中的字體。
- Apple 登入 SDK 在使用者按下 Apple 登入時才下載，避免外部 CDN 響應延遲或傳輸競爭卡住首屏；同時載入共用同一次請求，失敗可重試，既有 Apple 授權呼叫與錯誤處理保留。
- 登入方式配置載入期間先顯示手機驗證卡片，但停用手機／驗證碼輸入、國碼選擇、獲取驗證碼及登入按鈕。配置確認手機登入啟用後開放操作；停用或載入失敗時保留原有卡片隱藏及錯誤行為。此調整減少表單後出現的跳動，不提前啟用登入，也不縮短字體初始化或 API 等待時間。
- 啟動時維持既有 session 驗證與路由判斷，並讓收款貨幣設定與 session 驗證並行；未登入時不等待設定才顯示登入頁。進入已審核頁面前，若瀏覽器沒有已儲存的收款貨幣，才等待同一份系統預設設定結果，確定幣別後發送依幣種的資料請求；已儲存貨幣者略過設定請求。設定最長等待八秒，失敗時沿用既有本地回退，且同一次應用載入不反覆等待。頁面版面與視覺元件維持原狀。
- Flutter 首幀先呈現 session 驗證中的載入狀態，驗證完成後才建立原有登入／審核／首頁路由。已審核首頁可先呈現非金額區域，貨幣設定完成後才請求統計資料；首頁沿用 session 驗證取得的司機資料，不重複呼叫 `me`。首頁以外的次級頁面編譯成延遲載入模組，首次進入時等待該模組並提供載入失敗重試。此調整只縮短部分串行等待與主程式體積，仍須以正式候選測量首次可操作時間。
- 訂單邀請入口進入 Flutter 後，邀請詳情與正式司機 session 驗證並行；訂單預覽只等待邀請詳情。車輛目錄在詳情成功後另行載入，不阻擋預覽；使用已登入正式司機身份接受時仍等待 session 驗證。這只移除進入 Flutter 後的串行等待，不縮短 Flutter 引擎、主程式及中文字型的冷下載。
- 第二輪候選以一份官方 Noto Sans TC 可變 TTF 取代首屏前五份靜態 TTF 請求，保留家族名稱、完整字集與 400／500／600／700／800 字重。官方檔案 SHA-256 為 `864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f`，授權見 `assets/fonts/OFL-NotoSansTC.txt`。本機 Chrome 與 iOS 18.4 模擬器的登入首屏，在同視窗及同 API 失敗條件下，與原五份 TTF 的畫面逐像素一致；其他頁面、目標真機與正式環境的字形及速度仍須驗證。
- 本輪啟動調整保留登入驗證、API、路由結果、Apple SDK 與通知流程。CanvasKit、字體家族及現有字重維持原狀；字體來源檔案改為可變 TTF，相關效能收益須以正式候選及目標真機量測。
- 發布前須驗證內地／香港首次及再次載入、iOS／Android 字體與頁面呈現，以及登入、訂單與通知功能。效能收益以真機測量為準；回退使用上一個完整容器映像。

## TTF 正式配置

- 全域通知提示從應用主題取得文字樣式，再套用既有提示的顏色、大小與 700 字重，避免 root Overlay 繼承框架預設 monospace 字體。一般提示維持三秒；登入頁驗證碼發送提示最多兩秒，離開登入頁時提前移除。發送成功後啟動 60 秒重發倒數，倒數期間停用獲取驗證碼，失敗不啟動倒數；此等待時間不是短信送達時間或驗證碼有效期。頁面銷毀時清理倒數與提示，重新進入登入頁不保留前次倒數。API 與短信驗證契約不變；此局部修復不能視為 iPhone Safari 跨頁面缺字的完整解法。

司機端只使用完整字集 TTF；五份靜態 TTF 保留在倉庫作為回退基線，候選產物的 FontManifest 僅引用官方可變 TTF，涵蓋原有 400／500／600／700／800 字重。先前正式實測 WOFF2 曾出現載入變慢與方格缺字，因此本候選不使用 WOFF2，也不刪字元。部署時為原始 TTF 產生 Brotli quality 11 與既有 gzip level 6 副本，保留 gzip／原檔回退；不變更快取規則、CanvasKit 同站載入或 WASM gzip。HTTP 壓縮只保證傳輸解碼後位元組一致，首次載入收益仍須以正式環境及目標真機量測。

## 簡體中文補充字型

- Noto Sans TC 不含部分簡體字（例如 GB2312 的 6,763 字中有 1,898 字不在其中）。`fontFallbackBaseUrl` 指向站內 `fonts/`，站內只提供 Roboto，因此缺字無法從遠端補字。
- `assets/fonts/NotoSansSC-Supplement.ttf` 只收錄 Noto Sans SC 有、Noto Sans TC 沒有的 11,856 個字元，保留可變字重軸；它與 `NotoSansTC-Variable.ttf` 一同作為分層字型的來源檔，不直接隨產物發布。
- 來源為 google/fonts `ofl/notosanssc/NotoSansSC[wght].ttf`（SHA-256 `a3041811a78c361b1de50f953c805e0244951c21c5bd412f7232ef0d899af0da`），授權見 `assets/fonts/OFL-NotoSansSC.txt`。產物 SHA-256 為 `a544e0db477ffd75061a6ea01ccfc963a0f96b198637d101aa379a6d14e7a554`，以 `tool/build_sc_supplement_font.py`（fontTools 4.65.0）可重現。

## 分層字型與首次載入

- 正式實測首次載入時，首屏前須下載完整繁體字型與簡體補充字型（Brotli 後約 9.3 MB），佔首屏等待的大部分。現以 `tool/build_driver_font_layers.py`（fontTools 4.66.0）把上述兩個來源檔切成三層，字形與可變字重不變：
  - **UI 層**（`NotoSans{TC,SC}-UI.ttf`）：`lib/` 內所有字元及 ASCII、常用標點，列在 FontManifest，首屏前載入（Brotli 後約 255 KB）。
  - **常用層**（`NotoSans{TC,SC}-Common.ttf`）：GB2312 與 Big5 常用字，首屏後背景載入。
  - **罕用層**（`NotoSans{TC,SC}-Rare.ttf`）：其餘字元，只在需要時載入。
- 不出現缺字方框的保證：三個 API client 解碼後先以 `DriverFontLayers.ensureForPayload` 確認所需字型層已載入才返回，等待併入各頁原有的載入狀態；有自由輸入框的次級頁面（`DriverRouter.textInputRoutes`）在原有的延遲模組載入畫面中一併等待全部字型層；訂單邀請頁不阻擋預覽，輸入框在全部字型層載入前保持唯讀，貼上識別內容前先確認字型。
- 新增或修改 `lib/` 的介面文字後，須在 `driver/` 執行 `python3 tool/build_driver_font_layers.py` 重新產生字型與 `lib/core/fonts/driver_font_coverage.g.dart`；`test/font_coverage_test.dart`（Dart VM，已納入 `npm run verify:driver`）在介面文字未收錄於 UI 層、各層重疊或與來源不一致時失敗。
- 本機以部署映像（Brotli）及 Chrome 網速模擬量測未登入首屏：4G（9 Mbps／170 ms）由正式環境 14.1 秒降至 3.6 秒；慢速 4G（1.6 Mbps／150 ms）由 65.2 秒降至 16.1 秒。已登入頁面另須等待常用層（Brotli 後約 2.6 MB）。正式環境、內地／香港真機及 iOS 仍須實測。

## 收款貨幣與收入顯示

- 收款貨幣偏好使用 `HKD` 或 `CNY`；司機端讀取 `GET /driver/auth/statistics?currency=HKD|CNY`，後端回傳 `HKD` 或 `RMB`。
- 今日、本月、已結算及未結算收入逐筆依原始司機收入幣種換算，再彙總；沿用後台 `exchangeRate` 與既有貨幣換算、兩位小數精度規則，不直接相加不同幣種金額。
- 切換偏好會重新取得收入；無訂單仍顯示所選貨幣。最近訂單由後端按所選收款／結算貨幣換算司機收入，前端使用幣種符號明確標示 API 回傳的金額與幣種，例如 `HK$2360.83`／`¥2006.71`（示例匯率 0.85；`RMB`／`CNY` 均顯示 `¥`），不固定使用 `$`，也不在前端重複換算。原訂單、付款與結算紀錄不被改寫；金額或幣種缺失時前端顯示 `—`，非零金額無法換算時 API 報錯。
- 接單大廳可接單、我的行程及訂單詳情（含已接單、進行中、完成頁）讀取 API 時均附帶 `currency=HKD|CNY`，由後端換算司機收入；切換偏好會重新載入，不修改訂單或付款資料。
- 接單紀錄使用 `GET /driver/auth/trips?currency=HKD|CNY`，逐筆按原始幣種換算；切換偏好後重新載入，全部／已結算／未結算均顯示同一目標幣種，反覆切換不累積換算誤差。
- 非零收入若幣種缺失或換算匯率不可用，API 明確報錯，不猜測幣種或偽造換算金額。

## 語言字型

- 既有 `fc4f7a55` 的 CanvasKit 與五份 Noto Sans TC 靜態 TTF 保留在倉庫作為回退基線；本次 Web 候選使用同系列可變 TTF 呈現原五種字重。繁體、簡體及英文均沿用 TC，不新增 Noto Sans SC 資源，也不將 Noto Sans TC 轉成 WOFF2。Roboto fallback 則使用引擎原本要求的 WOFF2 格式，改由站內供應。
- 已撤回本次測試整合的約 50.5 MiB SC 字型、載入服務及啟動／切換語言的字型等待。語言選擇直接更新偏好，不因 SC 載入而停用選項或回退繁體；既有語言持久化與地址繁簡轉換保留。
- 這是移除新增載入負擔，不是裝置本機字體方案；CanvasKit 使用已註冊的字型資料，CSS 系統字型名稱不能直接替代。既有 TC 資源成本仍在，簡體字形及 iOS Safari 冷啟動／切換需真機驗收。本地變更不代表已推送或發布。

## 地址繁簡顯示

- 首頁、接單大廳、歷史訂單、訂單詳情、已接單、進行中、完成及邀請頁的出發地／目的地使用共用 `DriverAddressText`，依司機語言偏好即時轉為繁體或簡體；英文模式保留原始地址，不自動翻譯。
- 使用純 Dart `pinyin` 轉換，不需外部 CDN。只轉換顯示文字，保留 API 原始地址及導航、搜尋、訂單資料，既有字體、排版與展開行為不變。

## 鈴鐺通知列表

- 首頁及個人中心使用同一個通知彈窗，從 `/driver/auth/notifications` 的 `title` 與 `content` 顯示標題及內文，避免兩頁內容不一致。
- 保留原有列表樣式及點擊標記已讀後關閉的行為；標記已讀失敗時保留列表並顯示錯誤。API 與資料庫契約不變。
- 鈴鐺由共用的 `DriverNotificationBell` 呈現，右上角顯示未讀數（超過 99 顯示 `99+`，沒有未讀時不顯示）；列表中的未讀通知標題加粗並附「新」標示。未讀數來自同一份通知列表（最多 100 筆），在收到即時事件、開啟列表及標記已讀後更新。此外觀沒有設計稿，只使用既有 token，文字限於預載字型層已涵蓋的字元。

## 新訂單提示聲

- 通知設定提供「原版提示音」、「經典雙音」、「柔和三音」、「清亮三音」及「清脆雙音」（預設）五款內建合成提示聲，可選擇後按「測試提示聲」試聽。
- 清脆雙音為原創短促提示聲，使用 1397／1760 Hz 兩個音符，單次長度為 0.64 秒，峰值增益為 0.65；不使用第三方品牌音效。Web Audio 與 WAV 回退沿用相同音符及音量包絡，既有款式保留，未選擇款式時預設使用清脆雙音。
- 原版保留原本 0.55 秒、880／1174 Hz 音高、0.28 秒切換點與音量包絡；Web Audio 峰值增益為 0.22，WAV 回退也保留原本 PCM 增益 0.22 及播放器音量 0.22。
- 其餘三款加強版單次長度為 2.4 秒，峰值增益為 0.65；Web Audio 與 WAV 回退使用相同音符及音量包絡。所有款式不循環播放，播放期間不疊加其他提示聲。實際響度仍受裝置及瀏覽器音量影響。
- 款式保存在目前瀏覽器／裝置，不跟隨帳號跨裝置同步；清除瀏覽器資料或未知款式會回退至清脆雙音；已保存的有效款式選擇仍予保留。既有 `soundOn` API 契約不變。
- 保留瀏覽器點擊啟用要求、首次載入不播放及新訂單 ID 去重；只有偵測到新增可接／待接訂單時提示，不持續響到接單。試聽或啟用播放完成前停用款式選擇及試聽按鈕。

## 驗證

啟動腳本回歸測試：

```bash
node --test driver/test/web_bootstrap.test.mjs
```

CanvasKit HTTP 壓縮整合測試（需 Docker、Node.js 與 curl，先完成 `flutter build web` 產生本地 WASM）：

```bash
node --test deploy/frontend/test-wasm-gzip.mjs
```

司機字型 HTTP 壓縮與原檔回退整合測試（需 Docker、Node.js 與 curl）：

```bash
node --test deploy/frontend/test-driver-font-brotli.mjs
```

測試會建立臨時容器，驗證全部 WASM 的 gzip／原檔回退、解壓後位元組一致、MIME、快取與路徑隔離，完成後清理容器、映像及臨時檔。不使用正式流量；發布仍透過原 GitHub Actions 流程。

```bash
npm run check:scope -- --scope driver
npm run verify:driver
```

Driver Web UI 的切版、平台與元件邊界請遵守 [Driver Web UI instructions](../.github/instructions/driver-web-ui.instructions.md)。

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
