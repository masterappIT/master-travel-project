import { inject } from 'vue'

export const NotificationsPage = {
  name: 'NotificationsPage',
  setup() {
    return inject('adminNotificationsContext')
  },
  template: String.raw`<section v-if="view==='notifications'" class="editor-section notifications-page">
    <div class="notification-page-heading">
      <div>
        <span class="eyebrow">COMMUNICATION CENTER</span>
        <h2>消息推送</h2>
        <p class="muted">集中管理乘客端與司機端的站內通知，清楚掌握每次發送內容與受眾。</p>
      </div>
      <div class="notification-heading-meta"><span class="notification-count"><strong>{{notifications.length}}</strong> 筆歷史推送</span><button type="button" v-if="canWrite" class="notification-primary-action" @click="resetNotification('order')">＋ 新增消息</button></div>
    </div>

    <div class="notification-workspace">
      <div class="panel notification-composer-panel">
        <div class="notification-panel-heading"><div><span class="panel-kicker">CREATE</span><h3>建立推送</h3><p>選擇模板後編輯消息內容，送出前可先查看預覽。</p></div><select aria-label="消息模板" @change="resetNotification($event.target.value)"><option value="order">訂單確認</option><option value="payment">餘額增值</option><option value="promotion">餘額提現</option><option value="system">訂單退款</option></select></div>
        <form v-if="notificationForm" class="record-form notification-form" @submit.prevent="saveNotification">
          <div class="notification-form-section"><span class="form-section-kicker">01 · 發送對象</span><div class="notification-form-header"><select v-model="notificationForm.audience"><option value="ALL_USERS">全體用戶端</option><option value="ALL_DRIVERS">全體司機端</option><option value="SELECTED">指定用戶／司機</option></select><button type="button" class="secondary" @click="clearNotificationRecipients">清除收件人</button></div></div>
          <div v-if="notificationForm.audience === 'SELECTED'" class="notification-recipient-grid"><input v-model="notificationRecipientSearch" placeholder="搜尋姓名、電話或 ID"/><label>指定用戶端 <em>已選 {{notificationForm.userIds.length}} 位</em><select v-model="notificationForm.userIds" multiple size="6"><option v-for="user in filteredNotificationUsers" :key="user.id" :value="user.id">{{user.displayName || user.name || '未命名用戶'}} · {{user.phoneNumber || user.id}}</option></select></label><label>指定司機端 <em>已選 {{notificationForm.driverIds.length}} 位</em><select v-model="notificationForm.driverIds" multiple size="6"><option v-for="driver in filteredNotificationDrivers" :key="driver.id" :value="driver.id">{{driver.name || '未命名司機'}} · {{driver.phone || driver.id}}</option></select></label><p class="muted">可使用搜尋縮小清單，按住 Ctrl／Command 可選擇多位收件人。</p></div>
          <div class="notification-form-section"><span class="form-section-kicker">02 · 消息內容</span><label class="notification-field"><span>消息標題</span><input v-model="notificationForm.title" placeholder="輸入消息標題" required/></label><label class="notification-field"><span>消息內容</span><textarea v-model="notificationForm.content" placeholder="輸入要發送的消息內容" rows="5" required></textarea></label></div>
          <div class="notification-form-actions"><button type="submit" class="notification-send-action">發送消息</button><button type="button" class="secondary" @click="notificationForm=null">取消</button></div>
        </form>
      </div>
      <aside class="notification-preview-card"><div class="notification-preview-top"><span class="panel-kicker">LIVE PREVIEW</span><span class="preview-dot">即時預覽</span></div><div class="mobile-notification"><div class="mobile-notification-brand"><span class="brand-mark">M</span><span>跨境出行</span><time>剛剛</time></div><strong>{{notificationForm?.title || '消息標題'}}</strong><p>{{notificationForm?.content || '在左側輸入消息內容，這裡會同步顯示預覽。'}}</p></div><div class="preview-meta"><span>發送至</span><strong>{{notificationForm?.audience === 'ALL_DRIVERS' ? '全體司機端' : notificationForm?.audience === 'SELECTED' ? '指定收件人' : '全體用戶端'}}</strong></div></aside>
    </div>

    <div class="panel notification-history-panel"><div class="notification-history-heading"><div><span class="panel-kicker">DELIVERY LOG</span><h3>發送紀錄</h3></div><span class="history-hint">按時間由新至舊排列</span></div><div class="notification-history-table"><table><thead><tr><th>消息</th><th>內容摘要</th><th>受眾</th><th>發送時間</th></tr></thead><tbody><tr v-for="item in notifications" :key="item.id"><td><strong>{{item.title}}</strong><span class="history-id">ID · {{item.id}}</span></td><td class="history-content">{{item.content}}</td><td><span class="audience-pill">{{item.audience === 'USER' || item.audience === 'ALL_USERS' ? '用戶端' : item.audience === 'SELECTED' ? '指定收件人' : '司機端'}}</span></td><td class="history-time">{{formatDate(item.createdAt, true)}}</td></tr><tr v-if="!notifications.length"><td colspan="4" class="notification-empty"><span class="empty-icon">✦</span><strong>尚未發送消息</strong><span>建立第一則推送後，紀錄會顯示在這裡。</span></td></tr></tbody></table></div></div>
  </section>`
}
