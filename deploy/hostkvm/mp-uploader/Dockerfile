# 小程序上傳工具：只有 miniprogram-ci 和它需要的 less，版本和本 repo 根目錄的 package-lock.json 一樣。
# 由 accounts.sh 在伺服器上編譯成 mastertravel-mp-uploader:1.9.17。
FROM node:20-bookworm-slim
WORKDIR /opt/uploader
# less 是 miniprogram-ci 執行時需要、但不會自動安裝的套件，版本同 package-lock.json
RUN npm install --omit=dev --no-audit --no-fund miniprogram-ci@1.9.17 less@4.1.3 && npm cache clean --force
COPY upload.mjs ./
USER node
ENTRYPOINT ["node", "/opt/uploader/upload.mjs"]
