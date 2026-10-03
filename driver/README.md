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
- 本次不變更登入、API、路由、頁面、Apple SDK 或通知流程，也不消除其他外部字體依賴。
- 發布前須驗證內地／香港首次及再次載入、iOS／Android 字體與頁面呈現，以及登入、訂單與通知功能。效能收益以真機測量為準；回退使用上一個完整容器映像。

## 收款貨幣與收入顯示

- 收款貨幣偏好使用 `HKD` 或 `CNY`；司機端讀取 `GET /driver/auth/statistics?currency=HKD|CNY`，後端回傳 `HKD` 或 `RMB`。
- 今日、本月、已結算及未結算收入逐筆依原始司機收入幣種換算，再彙總；沿用後台 `exchangeRate` 與既有貨幣換算、兩位小數精度規則，不直接相加不同幣種金額。
- 切換偏好會重新取得收入；無訂單仍顯示所選貨幣。原訂單、付款與結算紀錄不被改寫，最近訂單保留原幣種。
- 接單大廳可接單、我的行程及訂單詳情（含已接單、進行中、完成頁）讀取 API 時均附帶 `currency=HKD|CNY`，由後端換算司機收入；切換偏好會重新載入，不修改訂單或付款資料。
- 接單紀錄使用 `GET /driver/auth/trips?currency=HKD|CNY`，逐筆按原始幣種換算；切換偏好後重新載入，全部／已結算／未結算均顯示同一目標幣種，反覆切換不累積換算誤差。
- 非零收入若幣種缺失或換算匯率不可用，API 明確報錯，不猜測幣種或偽造換算金額。

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
