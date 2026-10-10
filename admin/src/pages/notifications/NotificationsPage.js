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
        <p class="muted">建立乘客端與司機端站內消息，並查看發送紀錄。</p>
      </div>
      <div class="notification-heading-meta">
        <span class="notification-count"><strong>{{notificationTotal}}</strong> 筆收件通知紀錄</span>
        <button v-if="canWrite" type="button" class="notification-primary-action" @click="resetNotification('order')">＋ 新增消息</button>
      </div>
    </div>

    <div class="notification-workspace" :class="{ 'is-composing': notificationForm }">
      <div class="panel notification-composer-panel">
        <div class="notification-panel-heading">
          <div><span class="panel-kicker">CREATE</span><h3>建立推送</h3><p>{{notificationForm ? '核對發送對象及內容後發送。' : '按「新增消息」開始，或選擇模板建立消息。'}}</p></div>
          <label class="notification-template-choice"><span>消息模板</span><AdminSelect :model-value="notificationForm?.templateType || notificationForm?.type || ''" aria-label="消息模板" @change="resetNotification($event.target.value)"><option value="" disabled>選擇模板</option><option v-for="template in notificationTemplates" :key="template.id" :value="template.type">{{template.name}}</option></AdminSelect></label>
        </div>
        <form v-if="notificationForm" class="record-form notification-form" @submit.prevent="saveNotification">
          <div class="notification-form-section">
            <span class="form-section-kicker">01 · 發送對象</span>
            <div class="notification-form-header"><label class="notification-field"><span>選擇受眾</span><AdminSelect v-model="notificationForm.audience" aria-label="選擇受眾"><option value="ALL_USERS">全體用戶端</option><option value="ALL_DRIVERS">全體司機端</option><option value="SELECTED">指定用戶／司機</option></AdminSelect></label><button v-if="notificationForm.audience === 'SELECTED'" type="button" class="secondary" @click="clearNotificationRecipients">清除收件人</button></div>
            <div v-if="notificationForm.audience === 'SELECTED'" class="notification-recipient-grid">
              <label class="notification-recipient-search"><span>搜尋收件人</span><input v-model="notificationRecipientSearch" placeholder="姓名、電話或 ID"/></label>
              <label class="notification-recipient-list"><span>指定用戶端 <em>已選 {{notificationForm.userIds.length}} 位</em></span><AdminSelect v-model="notificationForm.userIds" multiple size="6"><option v-for="user in filteredNotificationUsers" :key="user.id" :value="user.id">{{user.displayName || user.name || '未命名用戶'}} · {{user.phoneNumber || user.id}}</option></AdminSelect></label>
              <label class="notification-recipient-list"><span>指定司機端 <em>已選 {{notificationForm.driverIds.length}} 位</em></span><AdminSelect v-model="notificationForm.driverIds" multiple size="6"><option v-for="driver in filteredNotificationDrivers" :key="driver.id" :value="driver.id">{{driver.name || '未命名司機'}} · {{driver.phone || driver.id}}</option></AdminSelect></label>
              <p class="notification-recipient-hint">可搜尋收件人；按住 Ctrl／Command 可選擇多位。</p>
            </div>
          </div>
          <div class="notification-form-section"><span class="form-section-kicker">02 · 消息內容</span><label class="notification-field"><span>消息標題</span><input v-model="notificationForm.title" placeholder="輸入消息標題" required/></label><label class="notification-field"><span>消息內容</span><textarea v-model="notificationForm.content" placeholder="輸入要發送的消息內容" rows="5" required></textarea></label></div>
          <div class="notification-form-actions"><label class="notification-field"><span>重要消息</span><AdminCheckbox v-model="notificationForm.important" type="checkbox"/></label><div class="notification-action-buttons"><button type="button" class="secondary" @click="notificationForm=null">取消</button><button type="submit" class="notification-send-action">發送消息</button></div></div>
        </form>
      </div>
      <aside v-if="notificationForm" class="notification-preview-card"><div class="notification-preview-top"><span class="panel-kicker">LIVE PREVIEW</span><span class="preview-dot">即時預覽</span></div><div class="mobile-notification"><div class="mobile-notification-brand"><span class="brand-mark">M</span><span>跨境出行</span><time>剛剛</time></div><strong>{{notificationForm.title || '消息標題'}}</strong><p>{{notificationForm.content || '在左側輸入消息內容，這裡會同步顯示預覽。'}}</p></div><div class="preview-meta"><span>發送至</span><strong>{{notificationForm.audience === 'ALL_DRIVERS' ? '全體司機端' : notificationForm.audience === 'SELECTED' ? '指定收件人' : '全體用戶端'}}</strong></div></aside>
    </div>

    <div class="panel notification-template-panel">
      <div class="notification-history-heading"><div><span class="panel-kicker">TEMPLATE LIBRARY</span><h3>推送模板</h3><p>選擇現有模板，或新增常用消息內容。</p></div><button v-if="canWrite" type="button" class="secondary" @click="notificationTemplateForm = { name: '', type: 'custom', title: '', content: '', audience: 'ALL_USERS', important: false, enabled: true }">＋ 新增模板</button></div>
      <div class="notification-template-list"><div v-for="template in notificationTemplates" :key="template.id" class="notification-template-item"><div><strong>{{template.name}}</strong><span>{{template.type}} · {{template.builtIn ? '內建模板' : '自訂模板'}}</span></div><button type="button" class="secondary" @click="resetNotification(template.type)">套用</button></div></div>
      <form v-if="notificationTemplateForm" class="record-form notification-form notification-template-form" @submit.prevent="createTemplate(notificationTemplateForm).then(() => notificationTemplateForm = null)"><label class="notification-field"><span>模板名稱</span><input v-model="notificationTemplateForm.name" required /></label><label class="notification-field"><span>模板類型</span><input v-model="notificationTemplateForm.type" required /></label><label class="notification-field"><span>標題模板</span><input v-model="notificationTemplateForm.title" required /></label><label class="notification-field"><span>內容模板</span><textarea v-model="notificationTemplateForm.content" rows="3" required></textarea></label><div class="notification-form-actions"><div class="notification-action-buttons"><button type="button" class="secondary" @click="notificationTemplateForm = null">取消</button><button type="submit" class="notification-send-action">保存模板</button></div></div></form>
    </div>

    <div class="panel notification-history-panel">
      <div class="notification-history-heading"><div><span class="panel-kicker">DELIVERY LOG</span><h3>通知紀錄</h3><p>每位收件人各佔一筆紀錄，按時間由新至舊排列。</p></div></div>
      <div class="notification-history-table"><table><thead><tr><th scope="col">消息</th><th scope="col">內容摘要</th><th scope="col">收件端</th><th scope="col">建立時間</th></tr></thead><tbody><tr v-for="item in notifications" :key="item.id"><td data-label="消息"><strong>{{item.title}}</strong><span class="history-id">ID · {{item.id}}</span></td><td data-label="內容摘要" class="history-content">{{item.content}}</td><td data-label="收件端"><span class="audience-pill">{{item.audience === 'USER' || item.audience === 'ALL_USERS' ? '用戶端' : item.audience === 'SELECTED' ? '指定收件人' : '司機端'}}</span></td><td data-label="建立時間" class="history-time">{{formatDate(item.createdAt, true)}}</td></tr><tr v-if="!notifications.length"><td colspan="4" class="notification-empty"><strong>尚無通知紀錄</strong><span>發送消息後，紀錄會顯示在這裡。</span></td></tr></tbody></table></div>
      <div v-if="notificationTotal" class="pagination-controls" aria-label="通知紀錄分頁"><button type="button" class="secondary" :disabled="notificationPage === 1" @click="goToNotificationPage(notificationPage - 1)">上一頁</button><span>第 {{notificationPage}} / {{notificationPageCount}} 頁 · 共 {{notificationTotal}} 筆</span><button type="button" class="secondary" :disabled="notificationPage === notificationPageCount" @click="goToNotificationPage(notificationPage + 1)">下一頁</button></div>
    </div>
  </section>`
}
