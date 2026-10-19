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

修改本目錄後，要把檔案放到伺服器上才會生效（`deploy-hostkvm.yml` 不會更新這些檔案）：

```bash
rsync -az --delete --exclude .git ./deploy/hostkvm/ masterapp-prod:master-travel-hostkvm/
ssh masterapp-prod 'sudo install -m 755 ~/master-travel-hostkvm/deploy.sh /usr/local/sbin/mastertravel-deploy && sudo install -m 644 ~/master-travel-hostkvm/compose.yaml /srv/apps/mastertravel/compose.yaml'
```

改了 Caddy 設定就 reload Caddy；改了 `compose.yaml` 要在下次部署或 `docker compose up -d` 時才生效。詳細流程見 [PRODUCTION-DEPLOYMENT.md](../../docs/PRODUCTION-DEPLOYMENT.md)。
