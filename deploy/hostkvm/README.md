# HostKVM 伺服器設定

Master Travel 正式環境在 HostKVM 伺服器（`45.134.82.239`）上的設定和腳本。2026-10-19 起由本 repo 管理，不再依賴 `masterappIT/MasterApp-infra` 的 `apps/mastertravel/`。

伺服器上的共用服務（Caddy、PostgreSQL、Redis、`edge` 網絡、每日備份）仍由伺服器的 `/srv/infra/` 提供，本目錄只放 Master Travel 自己的部分。

| 檔案 | 伺服器上的位置 | 用途 |
|---|---|---|
| `compose.yaml` | `/srv/apps/mastertravel/compose.yaml` | 5 個容器、記憶體上限、`share-images` volume |
| `deploy.env` | `/srv/apps/mastertravel/deploy.env` | 只在第一次安裝時放入；之後由部署腳本按 digest 更新 |
| `deploy.sh` | `/usr/local/sbin/mastertravel-deploy` | 從 GHCR 拉映像 → 備份資料庫 → migration → 更新容器 → 健康檢查，失敗退回上一版 |
| `mp-upload.sh`、`mp-uploader/` | `/usr/local/sbin/mastertravel-mp-upload`、映像 `mastertravel-mp-uploader:1.9.17` | 小程序體驗版上傳 |
| `forced-command.sh` | `/usr/local/bin/mastertravel-forced-command` | 兩個 SSH 帳號只能執行各自的腳本 |
| `accounts.sh` | 執行一次 | 建立 `deploy-mastertravel`、`upload-mastertravel-mp` 帳號並安裝上面 3 個腳本 |
| `setup.sh` | 執行一次 | 首次安裝：資料庫、`app.env`、`compose.yaml`、Caddy 網域設定 |
| `master-travel.caddy` | `/srv/infra/sites/master-travel.caddy` | 4 個網域的反向代理 |

## 更新伺服器

修改本目錄後，要放到伺服器上才會生效（`deploy-hostkvm.yml` 不會更新這些檔案）。做法和 MasterApp-infra 一樣：先同步，再重新執行對應的安裝腳本。

1. 同步到伺服器的 `~/master-travel-project/deploy/hostkvm/`：

   ```bash
   rsync -az --delete --exclude .git ./deploy/hostkvm/ masterapp-prod:master-travel-project/deploy/hostkvm/
   ```

2. 改了 `deploy.sh`、`mp-upload.sh`、`forced-command.sh` 或 `mp-uploader/`：重新執行 `accounts.sh`。公鑰沿用伺服器上現有的（`/home/<帳號>/.ssh/authorized_keys` 去掉前面的 `restrict,command="…"`）：

   ```bash
   sudo bash ~/master-travel-project/deploy/hostkvm/accounts.sh ~/master-travel-project deploy.pub upload.pub
   ```

3. 改了 `compose.yaml`：`sudo install -m 644 ~/master-travel-project/deploy/hostkvm/compose.yaml /srv/apps/mastertravel/compose.yaml`。只有首次安裝才執行整個 `setup.sh`，因為它會用目前的 `deploy.env` 重建容器。

改了 Caddy 設定就 reload Caddy；改了 `compose.yaml` 要在下次部署或 `docker compose up -d` 時才生效。詳細流程見 [PRODUCTION-DEPLOYMENT.md](../../docs/PRODUCTION-DEPLOYMENT.md)。
