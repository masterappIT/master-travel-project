import { NotificationTemplateButton, NotificationTemplateDialogSurface, NotificationTemplateField } from './NotificationTemplateUi.js'

export const NotificationTemplateDialog = {
  name: 'NotificationTemplateDialog',
  components: { NotificationTemplateButton, NotificationTemplateDialogSurface, NotificationTemplateField },
  props: {
    form: { type: Object, required: true },
    saving: { type: Boolean, default: false }
  },
  emits: ['close', 'save'],
  template: String.raw`
    <NotificationTemplateDialogSurface :saving="saving" @close="$emit('close')" @save="$emit('save')">
        <header class="notification-template-dialog-header">
          <div><span class="notification-template-dialog-kicker">NEW TEMPLATE</span><h3 id="notification-template-dialog-title">新增推送模板</h3><p>建立常用消息內容，儲存後可在模板清單套用。</p></div>
          <NotificationTemplateButton variant="close" aria-label="關閉新增模板" :disabled="saving" @click="$emit('close')">×</NotificationTemplateButton>
        </header>
        <div class="notification-template-dialog-fields">
          <NotificationTemplateField v-model.trim="form.name" label="模板名稱" required :disabled="saving" />
          <NotificationTemplateField v-model.trim="form.type" label="模板類型" required :disabled="saving" />
          <NotificationTemplateField v-model.trim="form.title" label="標題模板" required :disabled="saving" />
          <NotificationTemplateField v-model.trim="form.content" label="內容模板" multiline :rows="4" required :disabled="saving" />
        </div>
        <footer class="notification-template-dialog-actions">
          <NotificationTemplateButton variant="cancel" :disabled="saving" @click="$emit('close')">取消</NotificationTemplateButton>
          <NotificationTemplateButton variant="save" type="submit" :loading="saving">{{ saving ? '儲存中…' : '保存模板' }}</NotificationTemplateButton>
        </footer>
    </NotificationTemplateDialogSurface>`
}
