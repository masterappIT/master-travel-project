import { computed, inject, ref } from 'vue'
import { NotificationRecipientPicker } from './NotificationRecipientPicker.js'
import { NotificationTemplateDialog } from './NotificationTemplateDialog.js'
import './notification-template-ui.css'

export const NotificationsPage = {
  name: 'NotificationsPage',
  components: { NotificationRecipientPicker, NotificationTemplateDialog },
  setup() {
    const context = inject('adminNotificationsContext')
    const templateSaving = ref(false)
    const openTemplateDialog = () => {
      context.notificationTemplateForm.value = { name: '', type: 'custom', title: '', content: '', audience: 'ALL_USERS', important: false, enabled: true }
    }
    const closeTemplateDialog = () => { if (!templateSaving.value) context.notificationTemplateForm.value = null }
    const saveTemplate = async () => {
      if (templateSaving.value || !context.notificationTemplateForm.value) return
      templateSaving.value = true
      try {
        await context.createTemplate(context.notificationTemplateForm.value)
        context.notificationTemplateForm.value = null
      } catch {
        // createTemplate reports the API error; keep the form open for correction.
      } finally {
        templateSaving.value = false
      }
    }
    const enabledTemplates = computed(() => context.notificationTemplates.value.filter(template => template.enabled))
    const recipientUsers = computed(() => context.filteredNotificationUsers.value.map(user => ({ id: user.id, label: `${user.displayName || user.name || '未命名用戶'} · ${user.phoneNumber || user.id}` })))
    const recipientDrivers = computed(() => context.filteredNotificationDrivers.value.map(driver => ({ id: driver.id, label: `${driver.name || '未命名司機'} · ${driver.phone || driver.id}` })))
    const templateName = (template) => template.type === 'order' && template.builtIn ? '確認行程' : template.name
    const templateIcons = {
      order: '/messages/order.svg',
      payment: '/messages/top-up.svg',
      promotion: '/messages/wallet.svg',
      refund: '/messages/wallet.svg',
    }
    const templateIcon = (type) => templateIcons[type] || ''
    return { ...context, templateSaving, openTemplateDialog, closeTemplateDialog, saveTemplate, enabledTemplates, recipientUsers, recipientDrivers, templateName, templateIcon }
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
        <button v-if="canWrite" type="button" class="notification-primary-action" :disabled="!enabledTemplates.length" @click="resetNotification()">＋ 新增消息</button>
      </div>
    </div>

    <div class="notification-workspace" :class="{ 'is-composing': notificationForm }">
      <div class="panel notification-composer-panel">
        <div class="notification-panel-heading">
          <div><span class="panel-kicker">CREATE</span><h3>建立推送</h3><p>{{notificationForm ? '核對發送對象及內容後發送。' : '按「新增消息」開始，或選擇模板建立消息。'}}</p></div>
          <div class="notification-template-choice"><span>消息模板</span><AdminSelect custom :model-value="notificationForm?.templateId || ''" aria-label="消息模板" @change="resetNotification($event.target.value)"><option value="" disabled>選擇模板</option><option v-for="template in enabledTemplates" :key="template.id" :value="template.id">{{templateName(template)}}</option></AdminSelect></div>
        </div>
        <form v-if="notificationForm" class="record-form notification-form" @submit.prevent="saveNotification">
          <div class="notification-form-section">
            <span class="form-section-kicker">01 · 發送對象</span>
            <div class="notification-form-header"><div class="notification-field"><span>選擇受眾</span><AdminSelect custom v-model="notificationForm.audience" aria-label="選擇受眾"><option value="ALL_USERS">全體用戶端</option><option value="ALL_DRIVERS">全體司機端</option><option value="SELECTED">指定用戶／司機</option></AdminSelect></div><button v-if="notificationForm.audience === 'SELECTED'" type="button" class="secondary" @click="clearNotificationRecipients">清除收件人</button></div>
            <div v-if="notificationForm.audience === 'SELECTED'" class="notification-recipient-grid">
              <label class="notification-recipient-search"><span>搜尋收件人</span><input v-model="notificationRecipientSearch" placeholder="姓名、電話或 ID"/></label>
              <div class="notification-recipient-list"><span>指定用戶端 <em>已選 {{notificationForm.userIds.length}} 位</em></span><NotificationRecipientPicker v-model="notificationForm.userIds" :options="recipientUsers" aria-label="指定用戶端" /></div>
              <div class="notification-recipient-list"><span>指定司機端 <em>已選 {{notificationForm.driverIds.length}} 位</em></span><NotificationRecipientPicker v-model="notificationForm.driverIds" :options="recipientDrivers" aria-label="指定司機端" /></div>
              <p class="notification-recipient-hint">可搜尋收件人；點選清單項目可選擇多位。</p>
            </div>
          </div>
          <div class="notification-form-section"><span class="form-section-kicker">02 · 消息內容</span><label class="notification-field"><span>消息標題</span><input v-model="notificationForm.title" placeholder="輸入消息標題" required/></label><label class="notification-field"><span>消息內容</span><textarea v-model="notificationForm.content" placeholder="輸入要發送的消息內容" rows="5" required></textarea></label></div>
          <div class="notification-form-actions"><label class="notification-field"><span>重要消息</span><AdminCheckbox v-model="notificationForm.important" type="checkbox"/></label><div class="notification-action-buttons"><button type="button" class="secondary" @click="notificationForm=null">取消</button><button type="submit" class="notification-send-action">發送消息</button></div></div>
        </form>
      </div>
      <aside v-if="notificationForm" class="notification-preview-card"><div class="notification-preview-top"><span class="panel-kicker">LIVE PREVIEW</span><span class="preview-dot">即時預覽</span></div><div class="mobile-notification"><div class="mobile-notification-brand"><span class="brand-mark">M</span><span>跨境出行</span><time>剛剛</time></div><img v-if="templateIcon(notificationForm.templateType || notificationForm.type)" class="notification-preview-icon" :src="templateIcon(notificationForm.templateType || notificationForm.type)" alt=""/><strong>{{notificationForm.title || '消息標題'}}</strong><p>{{notificationForm.content || '在左側輸入消息內容，這裡會同步顯示預覽。'}}</p></div><div class="preview-meta"><span>發送至</span><strong>{{notificationForm.audience === 'ALL_DRIVERS' ? '全體司機端' : notificationForm.audience === 'SELECTED' ? '指定收件人' : '全體用戶端'}}</strong></div></aside>
    </div>

    <div class="panel notification-template-panel">
      <div class="notification-history-heading"><div><span class="panel-kicker">TEMPLATE LIBRARY</span><h3>推送模板</h3><p>選擇現有模板，或新增常用消息內容。</p></div><button v-if="canWrite" type="button" class="secondary" @click="openTemplateDialog">＋ 新增模板</button></div>
      <div class="notification-template-list"><div v-for="template in notificationTemplates" :key="template.id" class="notification-template-item"><img v-if="templateIcon(template.type)" class="notification-template-icon" :src="templateIcon(template.type)" alt=""/><div><strong>{{templateName(template)}}</strong><span>{{template.type}} · {{template.builtIn ? '內建模板' : '自訂模板'}} · {{template.enabled ? '已啟用' : '已停用'}}</span></div><div class="notification-template-actions"><button v-if="canWrite" type="button" class="secondary notification-template-toggle" :class="template.enabled ? 'is-enabled' : 'is-disabled'" :disabled="Boolean(templateActionId)" @click="setTemplateEnabled(template)">{{template.enabled ? '停用' : '啟用'}}</button><button v-if="canWrite && !template.builtIn" type="button" class="secondary notification-template-delete" :disabled="Boolean(templateActionId)" @click="removeTemplate(template)">刪除</button><button type="button" class="secondary notification-template-apply" :disabled="!template.enabled || Boolean(templateActionId) || !canWrite" @click="resetNotification(template.id)">套用</button></div></div></div>
    </div>

    <div class="panel notification-history-panel">
      <div class="notification-history-heading"><div><span class="panel-kicker">DELIVERY LOG</span><h3>通知紀錄</h3><p>每位收件人各佔一筆紀錄，按時間由新至舊排列。</p></div></div>
      <div class="notification-history-table"><table><thead><tr><th scope="col">消息</th><th scope="col">內容摘要</th><th scope="col">收件端</th><th scope="col">建立時間</th></tr></thead><tbody><tr v-for="item in notifications" :key="item.id"><td data-label="消息"><strong>{{item.title}}</strong><span class="history-id">ID · {{item.id}}</span></td><td data-label="內容摘要" class="history-content">{{item.content}}</td><td data-label="收件端"><span class="audience-pill">{{item.audience === 'USER' || item.audience === 'ALL_USERS' ? '用戶端' : item.audience === 'SELECTED' ? '指定收件人' : '司機端'}}</span></td><td data-label="建立時間" class="history-time">{{formatDate(item.createdAt, true)}}</td></tr><tr v-if="!notifications.length"><td colspan="4" class="notification-empty"><strong>尚無通知紀錄</strong><span>發送消息後，紀錄會顯示在這裡。</span></td></tr></tbody></table></div>
      <div v-if="notificationTotal" class="pagination-controls" aria-label="通知紀錄分頁"><button type="button" class="secondary" :disabled="notificationPage === 1" @click="goToNotificationPage(notificationPage - 1)">上一頁</button><span>第 {{notificationPage}} / {{notificationPageCount}} 頁 · 共 {{notificationTotal}} 筆</span><button type="button" class="secondary" :disabled="notificationPage === notificationPageCount" @click="goToNotificationPage(notificationPage + 1)">下一頁</button></div>
    </div>
    <NotificationTemplateDialog v-if="notificationTemplateForm" :form="notificationTemplateForm" :saving="templateSaving" @close="closeTemplateDialog" @save="saveTemplate" />
  </section>`
}
