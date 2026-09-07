# Master Travel Project

## Database

PostgreSQL 使用資料庫名稱 `master_travel_project`，Docker volume 仍保留為 `taxi-postgres`，以避免更名時遺失既有資料。

## Master Box 客服 Chat Box

乘客端通过 Master Travel Project 后端接入 Master Box Integration Conversation API。首页及个人中心的客服入口会打开聊天画面，永久 API Key 仅保存在后端。

1. 在 Master Box 创建第三方 Integration，取得 App ID 与 API Key。
2. 按 `.env.example` 配置 `MASTERBOX_BASE_URL`、`MASTERBOX_APP_ID`、`MASTERBOX_API_KEY` 与 `SUPPORT_SESSION_SECRET`。
3. 分别启动 Master Box、Master Travel Project API 与客户端。

目前 Master Box 的 `@masterbox/chat-embed` 尚未实现浏览器消息和 WebSocket 路由，因此客户端每 3 秒通过 Master Travel Project 后端轮询现有 Integration API。待相关路由上线后可改用实时传输。
