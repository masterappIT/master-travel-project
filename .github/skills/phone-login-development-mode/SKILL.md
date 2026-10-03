---
name: phone-login-development-mode
description: 維護登入配置中的既有手機號碼開發模式及相關登入／換綁手機流程時使用；保護獨立 UI、API、資料、challenge 生命週期與 sms253 隔離，避免優化破壞既有架構。
---

# 手機號碼開發模式架構保護與維護規範

## 1. 功能定位與使用範圍

「登入配置 → 登入方式管理 → 開發模式登入」是既有功能，不是待新增的實作方案。本 skill 記錄其架構、契約與維護約束，供後續修復、重構及優化使用；功能已存在不代表本次已完成所有測試或正式環境驗證。

僅在需求涉及開發模式設定，或受其影響的乘客端／司機端手機登入、註冊、換綁手機流程時適用。不能套用到所有登入方式管理、短信供應商配置、微信或 Apple 登入。

載入 skill 不等於修改授權。「先理解」「提出意見」只做分析；純文件校正不修改登入程式、資料庫或部署設定。發現實作差異先報告，不在文件任務中順便修程式。

### 目前架構

- 後台獨立選項與 `PhoneLoginDevelopmentSettings` 元件，使用獨立管理 API 保存設定。
- `PhoneLoginDevelopmentSetting` 保存兩端開關與共用指定碼雜湊，不參與登入方式草稿／正式發布。
- 各端在申請 challenge 時選擇開發或正式短信分支，保存該次驗證所需雜湊；驗證使用該次 challenge，不改用當下最新設定碼。
- 驗證成功後繼續各流程既有的帳戶、角色、審核及 session／token 邏輯。
- 登入與已登入帳戶換綁手機保留各自的 challenge 用途、資料及驗證限制，不能因共用實作而混用。

### 不可破壞的隔離

- 開發模式資料、API 與 UI 不得併入既有 `LoginMethodSetting`、`LoginMethodSettingDraft`、`methods` payload 或 `sms253` 契約。
- 可重用既有視覺／操作元件及不帶模式決策的通用工具，不把開發模式判斷混入其他登入 provider 或短信供應商設定。
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

既有開發模式使用獨立 Prisma 資料表，不擴充登入方式資料契約。主要欄位：

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
- 管理設定 API 不回傳指定驗證碼或雜湊。
- 後端保存驗證碼雜湊，不改存明文以方便展示或回傳。
- `passengerEnabled` 與 `driverEnabled` 為獨立開關；兩端共用一個 `verificationCodeHash`，不是各自一組設定碼。
- `00000` 是設定首次建立時的預設碼，不是永久有效碼。更新後以設定碼的雜湊建立新 challenge；未提交新碼時保留原雜湊。

資料結構變更須維持隔離，提供 migration、資料相容性與部署順序；不得直接重建既有表或重設客戶設定。

## 4. 獨立後台 API

既有管理端點：

```text
GET  /settings/phone-login-development
POST /settings/phone-login-development
```

API 只處理開發模式設定：

- `GET` 回傳乘客端／司機端開關狀態，不回傳驗證碼或雜湊。
- `POST` 更新端別開關與指定驗證碼。
- 不修改 `LoginMethodSetting`。
- 不修改 `sms253`。

權限契約：

- `GET` 允許 `SUPER_ADMIN`、`OPERATOR` 讀取端別開關，不回傳驗證碼或雜湊。
- `POST` 僅 `SUPER_ADMIN` 可更新端別開關或指定驗證碼；後端必須重新驗證權限，不能只依賴前端 disabled 狀態。
- API 不修改 `LoginMethodSetting`、`LoginMethodSettingDraft`、現有 `methods` payload 或 `sms253`。

## 5. 後台 UI

登入方式管理頁既有同層選項「開發模式登入」維持獨立，顯示：

- 乘客端開發模式開／關。
- 司機端開發模式開／關。
- 指定驗證碼設定／更新欄位。

控制項不得出現在既有 `phone` 卡片內。保存使用獨立 API，不與現有登入方式保存／發布共用 payload 或保存流程。

## 6. 登入驗證流程

後端手機登入／註冊相關流程保留以下判斷邊界；開發模式不新增原本不存在的帳戶建立或註冊能力：

1. 保留對應 client 的手機登入啟用與渠道檢查。
2. 申請 challenge 時讀取該 client 的開發模式開關。
3. 開啟時不呼叫 `sms253`，保存當次設定碼的雜湊；關閉時沿用既有短信流程與該次短信碼雜湊。
4. 驗證時比對該次 challenge 保存的雜湊，保留用途、期限、消耗及各流程已有的錯誤次數限制。不以最新設定碼替換已發出 challenge 的雜湊。
5. 驗證成功後，繼續既有登入／註冊、角色、權限與司機審核流程。

關閉開發模式影響後續新請求的分支，不等於自動撤銷既有 challenge。不得在優化中悄悄加入撤銷行為；如需變更，先提出相容性與流程影響。

### 乘客端修改已連結手機號碼

- `/client/security/phone/request` 以發起請求當下的乘客端開發模式開關為準，不依賴本次登入方式。
- 開啟時保存後台設定的驗證碼雜湊，不讀取短信配置、不呼叫 `sms253`；關閉時發送隨機短信驗證碼。
- `/client/security/phone/verify` 驗證該次請求保存的雜湊，支援開發模式雜湊、新短信雜湊及既有未加前綴的 SHA-256 雜湊。已發出的請求不因設定切換而改用另一組碼。
- 此流程屬已登入帳戶管理，不新增登入方式開關限制；保留 session、手機格式、號碼重複、期限、錯誤次數及一次性驗證規則。
- API 回應不包含開發驗證碼或雜湊；不影響司機端與其他登入方式。

### 司機端修改已連結手機號碼

- 港澳與內地電話分別透過 `POST /driver/auth/me/phone/request`（`target: hongKongMacau | mainland`、`countryCode`、`phoneNumber`）申請驗證碼，回傳 `challengeId` 與 `expiresAt`；透過 `POST /driver/auth/me/phone/verify`（`challengeId`、`code`）驗證並更新對應電話。
- 以申請當下的司機端開發模式開關為準；開啟時使用後台設定雜湊且不讀取短信配置、不發送短信，關閉時發送短信。回應不包含驗證碼或雜湊。
- 獨立 `DriverPhoneChangeChallenge` 資料表隔離登入／註冊 challenge，保留所有者、有效期限、最多五次錯誤與一次性驗證；消耗 challenge 與電話更新在同一交易內。
- `PATCH /driver/auth/me` 禁止修改電話欄位，允許傳入未變更的值；當驗證的區域對應主要登入電話，同步更新主要電話。
- 兩組都改動時依序驗證，各組成功後立即更新；第二組取消不回滾已完成的第一組，返回個人資料時重新讀取後端。
- 驗證對話框提供 60 秒重發冷卻倒數；倒數結束可重新獲取同一目標電話的驗證碼。成功後改用新 challenge、清空輸入並重啟倒數；失敗保留原 challenge 並允許重試。此倒數只控制前端重發按鈕，不修改後端驗證碼有效期限。
- 若修改資料結構，部署須先完成相容的 Prisma migration，再啟動依賴新結構的後端與前端；純文件或無 schema 變更不要求重跑 migration。

## 7. 與 sms253 的隔離

開發模式啟用時：

- 手機登入／註冊不呼叫 `sms253`。
- 不讀取 `sms253` 配置狀態來決定是否開發模式。
- 不因 `sms253` 失敗而 fallback。
- 不修改 `sms253` 設定、供應商狀態、測試功能或歷史記錄。

開發模式關閉時，恢復既有 `sms253` 流程，正式短信驗證行為不變。

## 8. 必須保留的既有規則

開發模式不可繞過：

- 登入／註冊的 `requireLoginMethodEnabled(provider, client)` 及適用渠道檢查；已登入換綁手機維持自身 session 與帳戶檢查，不新增登入方式開關限制。
- 手機號碼與國碼驗證。
- 登入／註冊既有流程。
- 角色判斷。
- 司機審核狀態。
- 權限與 session／token 發放。
- 微信、Apple 登入流程。
- 草稿／正式登入方式發布流程。

## 9. 優化與架構變更程序

- 可在維持公開契約、資料用途、隔離邊界及驗證生命週期的前提下改善內部實作，並通過相關回歸驗證；不要求永久凍結所有函式或檔案結構。
- 不得以「統一登入流程」「減少重複」為由合併設定與發布 payload、混用 challenge、改變共用碼範圍、引入短信失敗 fallback 或繞過既有帳戶規則。
- 涉及 API、權限、資料模型、challenge 行為或跨端流程變更，先說明影響、相容性、資料遷移、驗證及回滾方案，取得批准後才實作。
- 修改前讀取相關呼叫與資料生命週期，修改後核對所有受影響端；不能只驗證後台保存成功便宣稱登入流程安全無誤。

## 10. 回歸測試範圍

### 後台

- 獨立選項、開關與保存流程正常；既有登入方式卡片與 LIVE PREVIEW 不增加提示或欄位。
- 保存不改變 `methods` payload、登入方式草稿／正式發布及短信設定。
- `SUPER_ADMIN` 可讀寫，`OPERATOR` 可讀但不能寫；其他未授權角色被拒絕。
- 指定碼為 5 位數字；不提交新碼保留原設定，更新碼後新 challenge 使用新雜湊；管理 API 不回傳碼或雜湊。

### 登入與換綁手機

- 開關獨立、碼共用；開發模式開啟時新 challenge 使用設定碼，初始化預設碼與更新後設定碼均有測試。
- 開發模式關閉後新請求沿用短信分支，不能靠固定開發碼繞過驗證；不以「字面值 `00000` 永遠被拒絕」作測試，因短信隨機碼可能相同。
- 設定碼／開關切換前後分別驗證新舊 challenge，保留申請時的雜湊，不把既有 challenge 改用最新碼。
- 手機登入或適用渠道關閉時登入請求被拒絕；已登入換綁手機不新增此限制。
- 開發分支不讀取短信配置或呼叫 `sms253`；關閉時維持原流程，不因短信失敗轉成開發模式。
- 保留各流程的所有者、用途、格式、號碼重複、期限、既有錯誤次數及一次性消耗約束；不得用一種 challenge 驗證另一種用途。
- 司機雙電話更新、交易一致性與重發倒數按既有契約回歸；取消第二組不回滾第一組，前端倒數不改後端期限。

### 其他流程

- 微信、Apple、角色、司機審核、權限及 token 發放不受影響；開發模式不新增原流程未提供的註冊能力。

## 11. 驗證與交付

按實際變更範圍選用既有命令，不要求每次把以下命令全部重複執行：

```bash
npm run check:scope -- --scope admin
npm run check:scope -- --scope api
npm run check:dependencies
npm run check:admin-style-boundaries
npm run verify:admin
npm run verify:api
npm run verify:passenger
npm run verify:driver
npm run verify:affected
```

- Admin／API／乘客／司機程式變更各自使用適用的最小完整驗證與相關測試；`verify:affected` 可用於受影響範圍驗證，不無故重跑已涵蓋命令。
- 乘客 UI 遵守適用的 H5、微信小程序、App Plus 與縮放指示；司機 UI 使用 Flutter 驗證。涉及切版時另遵循設計 skill，Admin／API 遵循 `admin-development`。
- schema 變更才另做 Prisma validation、migration 相容性及測試環境驗證；不得為驗證擅自對正式或客戶環境執行 migration。
- 純文件校正核對來源、契約、連結及 `git diff --check`，有適用文件測試才執行，不要求應用 build、UI 截圖或資料庫操作。
- 交付列出修改範圍、保留的架構邊界、驗證命令與結果及未驗證項目，不以靜態核對宣稱運行測試通過。

## 12. 實作來源與差異處理

維護時以以下實作來源核對，不依賴易漂移的行號：

- `prisma/schema.prisma`：`PhoneLoginDevelopmentSetting`、登入與換綁手機 challenge 模型。
- `backend/src/main.ts`：設定管理 API、模式設定讀取、手機登入與換綁手機的申請／驗證流程。
- `admin/src/pages/login-settings/PhoneLoginDevelopmentSettings.js`：獨立設定 UI 與保存契約。
- `driver/lib/driver_profile_page.dart`、`driver/lib/driver_phone_verification_dialog.dart`：司機電話更新與重發流程。

已發現的實作差異與架構約束分開處理：目前乘客／司機登入申請在非 production 回應中含 `developmentCode`，開發分支該值仍為固定 `00000`，但實際 challenge 使用可更新設定碼的雜湊。因此它可能與可通過的碼不一致。這不是必須永久保留的架構，亦不代表設定碼或雜湊可回傳；修復前須核對呼叫端與相容性並取得授權。處理後更新本節，不將已解決差異永久當成現況。

**正確：** 優化重發對話框時保留原 challenge 替換、失敗重試及倒數規則，執行相關測試；純文件校正發現回應差異時先報告，不順便改登入 API。

**錯誤：** 為減少程式碼，把開發設定併入短信配置、將登入 challenge 用於換綁手機，或在驗證時改讀最新設定碼，導致已發出請求失效。
