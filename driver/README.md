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

## TTF 正式配置與 WOFF2 隔離驗證

- 全域通知提示（包括「驗證碼已發送」）從應用主題取得文字樣式，再套用既有提示的顏色、大小與 700 字重，避免 root Overlay 繼承框架預設 monospace 字體。提示內容、位置、三秒關閉及登入／短信行為不變；此局部修復不能視為 iPhone Safari 跨頁面缺字的完整解法。

司機端 `pubspec.yaml` 已恢復五份原始 TTF，保留相同字體 family 與 400／500／600／700／800 字重，不刪字元、不減字重。部署時沿用既有容器的 TTF gzip level 6 副本及 Nginx 靜態 gzip／原檔回退，不變更快取規則、CanvasKit 同站載入或 WASM gzip。此回退因正式 iPhone Safari 出現部分中文字缺字及載入體感退步而採取；尚未證明 WOFF2 是根因，回退效果仍需真機驗證。WOFF2 檔案與工具保留供隔離對照，不由目前正式字體配置封裝；本地配置變更不代表已發布。

以下流程僅供 WOFF2 候選驗證，不是目前正式配置。它產生倉庫外的司機端副本並重新核對完整轉換，不修改工作區。候選副本包含執行時工作區的程式（包括尚未提交修改），不是正式版基準。工具需要 Python 3 與 Flutter SDK。

從倉庫根目錄執行：

```bash
WORK=$(mktemp -d "${TMPDIR:-/tmp}/driver-woff2.XXXXXX")
python3 -m venv "$WORK/venv"
"$WORK/venv/bin/pip" install -r driver/tool/woff2-requirements.txt
"$WORK/venv/bin/python" -B -m unittest discover -s driver/tool -p 'test_*.py' -v
"$WORK/venv/bin/python" -B driver/tool/prepare_woff2_candidate.py --output "$WORK/candidate"
(cd "$WORK/candidate/driver" && flutter pub get && flutter build web --release --dart-define=DRIVER_API_BASE_URL=http://127.0.0.1:3010)
"$WORK/venv/bin/python" -B driver/tool/verify_woff2_build.py --output "$WORK/candidate"
```

- 輸出目錄必須不存在且位於倉庫外；失敗只清理本次建立的候選目錄。原始 TTF 在副本內保留供核對，但 Flutter 字體配置只使用五份 WOFF2。
- `font-verification.json` 記錄雜湊、大小及檢查結果：字元對應、全部輪廓、glyph 順序、水平度量、字重、版面相關表及字體邊界。建置檢查確認五種字重及封裝字體雜湊一致。
- 此版本實測五份 WOFF2 共 14,700,076 bytes，相較工具以 gzip level 6 產生的 TTF 共 21,415,004 bytes，減少約 31.4%。這是字體大小差異，不代表首屏時間減少相同比例；正式 Nginx 網路耗時需另測。
- Python 回歸測試涵蓋倉庫內路徑拒絕、既有目錄保護、失敗清理、度量變更拒絕，以及完整轉換後原始檔案不變。上述建置採本機 API 目標，不操作正式登入。
- 通過轉換及建置不代表全面瀏覽器相容。採用前仍需 iOS／Android 真機、generic／chromium CanvasKit、頁面視覺及同條件冷啟動對比。此流程不會發布、提交或切換正式流量。

瀏覽器相容性檢查：先在原工作區完成 `flutter build web` 取得相同引擎的 CanvasKit，將資產複製到候選副本，再啟動僅綁定本機的 HTTP server：

```bash
cp -R driver/build/web/canvaskit "$WORK/candidate/driver/canvaskit"
python3 -m http.server 18768 --bind 127.0.0.1 --directory "$WORK/candidate/driver"
```

開啟 `http://127.0.0.1:18768/tool/woff2-canvaskit-test.html`；完成時應列出 generic／chromium 各五種字重，全部 `accepted`、`pngBytesEqual` 為 `true`。此檢查直接使用 CanvasKit 載入完整 TTF／WOFF2，並比較繁簡中文、英文、數字範例的 PNG 位元組；不是整頁視覺或真機驗收。目前桌面瀏覽器的十組檢查已通過，仍需在目標 iOS／Android 裝置驗證。停止 server 後再清理候選資料。

檢查完且不需保留候選資料時，在同一 shell 清理本次臨時目錄：

```bash
rm -r "$WORK"
```

## 收款貨幣與收入顯示

- 收款貨幣偏好使用 `HKD` 或 `CNY`；司機端讀取 `GET /driver/auth/statistics?currency=HKD|CNY`，後端回傳 `HKD` 或 `RMB`。
- 今日、本月、已結算及未結算收入逐筆依原始司機收入幣種換算，再彙總；沿用後台 `exchangeRate` 與既有貨幣換算、兩位小數精度規則，不直接相加不同幣種金額。
- 切換偏好會重新取得收入；無訂單仍顯示所選貨幣。原訂單、付款與結算紀錄不被改寫，最近訂單保留原幣種。
- 接單大廳可接單、我的行程及訂單詳情（含已接單、進行中、完成頁）讀取 API 時均附帶 `currency=HKD|CNY`，由後端換算司機收入；切換偏好會重新載入，不修改訂單或付款資料。
- 接單紀錄使用 `GET /driver/auth/trips?currency=HKD|CNY`，逐筆按原始幣種換算；切換偏好後重新載入，全部／已結算／未結算均顯示同一目標幣種，反覆切換不累積換算誤差。
- 非零收入若幣種缺失或換算匯率不可用，API 明確報錯，不猜測幣種或偽造換算金額。

## 新訂單提示聲

- 通知設定提供「原版提示音」、「經典雙音」（預設）、「柔和三音」及「清亮三音」四款內建合成提示聲，可選擇後按「測試提示聲」試聽。
- 原版保留原本 0.55 秒、880／1174 Hz 音高、0.28 秒切換點與音量包絡；Web Audio 峰值增益為 0.22，WAV 回退也保留原本 PCM 增益 0.22 及播放器音量 0.22。
- 其餘三款加強版單次長度為 2.4 秒，峰值增益為 0.65；Web Audio 與 WAV 回退使用相同音符及音量包絡。所有款式不循環播放，播放期間不疊加其他提示聲。實際響度仍受裝置及瀏覽器音量影響。
- 款式保存在目前瀏覽器／裝置，不跟隨帳號跨裝置同步；清除瀏覽器資料或未知款式會回退至經典雙音。既有 `soundOn` API 契約不變。
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
