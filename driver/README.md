# Driver Web

Driver Web 是 Flutter Web 司機端產品，負責司機登入、接單與訂單操作介面。

## 開發與建置

```bash
cd driver
flutter pub get
flutter build web
```

正式建置會由根目錄的 GitHub Actions 使用 `flutter build web --release`，並注入 `DRIVER_API_BASE_URL`。詳細正式環境部署請參考 [正式環境部署文件](../docs/PRODUCTION-DEPLOYMENT.md)。

## 啟動資源交付

- Flutter bootstrap 固定使用建置產物中的 `canvaskit/`，保留原有 renderer 與引擎版本，不從 Google CDN 下載 CanvasKit。
- 共用前端容器只針對司機端 `assets/assets/fonts/NotoSansTC-*.ttf` 產生 gzip 副本；Nginx 依瀏覽器的 `Accept-Encoding` 提供壓縮版本，不支援 gzip 時仍提供原始字體。字體內容、字重與快取規則不變。
- 共用前端容器也為 `canvaskit/**/*.wasm` 產生 gzip 副本（包含根目錄）；Nginx 只在 `canvaskit/` 的 WASM 路徑啟用靜態 gzip。原始 WASM 保留，不支援 gzip 時回退原檔，解壓後內容、`application/wasm` MIME、renderer、引擎版本及快取規則不變。沒有 CanvasKit 的其他前端不產生副本。
- 登入方式配置載入期間先顯示手機驗證卡片，但停用手機／驗證碼輸入、國碼選擇、獲取驗證碼及登入按鈕。配置確認手機登入啟用後開放操作；停用或載入失敗時保留原有卡片隱藏及錯誤行為。此調整減少表單後出現的跳動，不提前啟用登入，也不縮短字體初始化或 API 等待時間。
- 資源交付優化不變更登入驗證、API、路由、Apple SDK 或通知流程，也不消除其他外部字體依賴；上述卡片調整僅改配置等待期間的呈現與操作狀態。
- 發布前須驗證內地／香港首次及再次載入、iOS／Android 字體與頁面呈現，以及登入、訂單與通知功能。效能收益以真機測量為準；回退使用上一個完整容器映像。

## TTF 正式配置

- 全域通知提示從應用主題取得文字樣式，再套用既有提示的顏色、大小與 700 字重，避免 root Overlay 繼承框架預設 monospace 字體。一般提示維持三秒；登入頁驗證碼發送提示最多兩秒，離開登入頁時提前移除。發送成功後啟動 60 秒重發倒數，倒數期間停用獲取驗證碼，失敗不啟動倒數；此等待時間不是短信送達時間或驗證碼有效期。頁面銷毀時清理倒數與提示，重新進入登入頁不保留前次倒數。API 與短信驗證契約不變；此局部修復不能視為 iPhone Safari 跨頁面缺字的完整解法。

司機端只使用完整字集 TTF，保留字體 family 與 400／500／600／700／800 字重，不刪字元、不減字重。正式環境實測 WOFF2 曾出現載入變慢與方格缺字，因此不再採用；倉庫已移除司機端 WOFF2 資產、轉換及候選驗證工具，不應重新引入。部署時沿用既有容器的繁體 TTF gzip level 6 副本及 Nginx 靜態 gzip／原檔回退，不變更快取規則、CanvasKit 同站載入或 WASM gzip。本地清理不代表已發布。

## 收款貨幣與收入顯示

- 收款貨幣偏好使用 `HKD` 或 `CNY`；司機端讀取 `GET /driver/auth/statistics?currency=HKD|CNY`，後端回傳 `HKD` 或 `RMB`。
- 今日、本月、已結算及未結算收入逐筆依原始司機收入幣種換算，再彙總；沿用後台 `exchangeRate` 與既有貨幣換算、兩位小數精度規則，不直接相加不同幣種金額。
- 切換偏好會重新取得收入；無訂單仍顯示所選貨幣。最近訂單由後端按所選收款／結算貨幣換算司機收入，前端使用幣種符號明確標示 API 回傳的金額與幣種，例如 `HK$2360.83`／`¥2006.71`（示例匯率 0.85；`RMB`／`CNY` 均顯示 `¥`），不固定使用 `$`，也不在前端重複換算。原訂單、付款與結算紀錄不被改寫；金額或幣種缺失時前端顯示 `—`，非零金額無法換算時 API 報錯。
- 接單大廳可接單、我的行程及訂單詳情（含已接單、進行中、完成頁）讀取 API 時均附帶 `currency=HKD|CNY`，由後端換算司機收入；切換偏好會重新載入，不修改訂單或付款資料。
- 接單紀錄使用 `GET /driver/auth/trips?currency=HKD|CNY`，逐筆按原始幣種換算；切換偏好後重新載入，全部／已結算／未結算均顯示同一目標幣種，反覆切換不累積換算誤差。
- 非零收入若幣種缺失或換算匯率不可用，API 明確報錯，不猜測幣種或偽造換算金額。

## 語言字型

- 本地 `develop` 保留 `fc4f7a55` 的既有 CanvasKit 與 Noto Sans TC 完整 TTF 五種字重；繁體、簡體及英文均沿用 TC。不新增 Noto Sans SC 資源，不引入 WOFF2。
- 已撤回本次測試整合的約 50.5 MiB SC 字型、載入服務及啟動／切換語言的字型等待。語言選擇直接更新偏好，不因 SC 載入而停用選項或回退繁體；既有語言持久化與地址繁簡轉換保留。
- 這是移除新增載入負擔，不是裝置本機字體方案；CanvasKit 使用已註冊的字型資料，CSS 系統字型名稱不能直接替代。既有 TC 資源成本仍在，簡體字形及 iOS Safari 冷啟動／切換需真機驗收。本地變更不代表已推送或發布。

## 地址繁簡顯示

- 首頁、接單大廳、歷史訂單、訂單詳情、已接單、進行中、完成及邀請頁的出發地／目的地使用共用 `DriverAddressText`，依司機語言偏好即時轉為繁體或簡體；英文模式保留原始地址，不自動翻譯。
- 使用純 Dart `pinyin` 轉換，不需外部 CDN。只轉換顯示文字，保留 API 原始地址及導航、搜尋、訂單資料，既有字體、排版與展開行為不變。

## 鈴鐺通知列表

- 首頁及個人中心使用同一個通知彈窗，從 `/driver/auth/notifications` 的 `title` 與 `content` 顯示標題及內文，避免兩頁內容不一致。
- 保留原有列表樣式及點擊標記已讀後關閉的行為；標記已讀失敗時保留列表並顯示錯誤。API 與資料庫契約不變。

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
