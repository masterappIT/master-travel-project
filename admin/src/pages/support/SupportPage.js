import { computed, h, inject, reactive, ref, watch } from 'vue'
import './support.css'

const SupportButton = {
  inheritAttrs: false,
  props: { disabled: Boolean, tone: { type: String, default: 'secondary' } },
  render() {
    return h('button', {
      ...this.$attrs,
      type: this.$attrs.type || 'button',
      class: ['support-control-button', `support-control-button--${this.tone}`, this.$attrs.class],
      disabled: this.disabled
    }, this.$slots.default?.())
  }
}

const SupportInput = {
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('input', {
      ...this.$attrs,
      class: ['support-control-input', this.$attrs.class],
      value: this.modelValue,
      disabled: this.disabled,
      onInput: event => this.$emit('update:modelValue', event.target.value)
    })
  }
}

const SupportTextarea = {
  inheritAttrs: false,
  props: { modelValue: { type: String, default: '' }, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('textarea', {
      ...this.$attrs,
      class: ['support-control-textarea', this.$attrs.class],
      value: this.modelValue,
      disabled: this.disabled,
      onInput: event => this.$emit('update:modelValue', event.target.value)
    })
  }
}

const SupportToggle = {
  inheritAttrs: false,
  props: { modelValue: Boolean, disabled: Boolean },
  emits: ['update:modelValue'],
  render() {
    return h('button', {
      ...this.$attrs,
      type: 'button',
      role: 'switch',
      'aria-checked': this.modelValue ? 'true' : 'false',
      class: ['support-toggle', { 'is-on': this.modelValue }],
      disabled: this.disabled,
      onClick: () => this.$emit('update:modelValue', !this.modelValue)
    }, [h('span', { class: 'support-toggle-track', 'aria-hidden': 'true' }, [h('span', { class: 'support-toggle-thumb' })]), h('span', { class: 'support-toggle-label' }, this.modelValue ? '已啟用' : '已停用')])
  }
}

export const SupportPage = {
  name: 'SupportPage',
  components: { SupportButton, SupportInput, SupportTextarea, SupportToggle },
  setup() {
    const { api, canWrite, isSuperAdministrator, supportSettings, settingsLoader, notify, displayError } = inject('adminSupportContext')
    const section = ref('inbox')
    const audience = ref('ALL')
    const search = ref('')
    const recipientType = ref('PASSENGER')
    const recipientId = ref('')
    const draft = ref('')
    const settingsDraft = reactive({ ...supportSettings.value })
    const savingSettings = ref(false)
    const settingsSaved = ref(false)
    watch(supportSettings, value => Object.assign(settingsDraft, value), { deep: true })
    const saveSettings = async () => {
      savingSettings.value = true
      settingsSaved.value = false
      try {
        settingsDraft.maxUploadSizeMb = Math.max(1, Math.min(500, Number(settingsDraft.maxUploadSizeMb) || 50))
        const response = await api('/settings', { method: 'POST', body: JSON.stringify({ support: { ...settingsDraft } }) })
        Object.assign(supportSettings.value, response.support || settingsDraft)
        settingsLoader.invalidate()
        settingsSaved.value = true
        notify('客服設定已儲存')
      } catch (cause) {
        notify(displayError(cause), 'error')
      } finally {
        savingSettings.value = false
      }
    }
    const recipientLabel = computed(() => recipientType.value === 'DRIVER' ? '司機 ID' : '乘客 ID')
    return { section, audience, search, recipientType, recipientId, draft, recipientLabel, settingsDraft, savingSettings, settingsSaved, saveSettings, canWrite, isSuperAdministrator }
  },
  template: String.raw`
    <section class="support-management" aria-labelledby="support-page-title">
      <div class="support-heading">
        <div>
          <span class="support-kicker">CUSTOMER SUPPORT</span>
          <h2 id="support-page-title">客服管理</h2>
          <p>集中處理乘客、司機與訪客的諮詢，並透過現有帳戶 ID 主動聯繫。</p>
        </div>
        <span class="support-connection-status" :class="{ 'is-enabled': settingsDraft.enabled }" role="status"><span aria-hidden="true"></span> {{settingsDraft.enabled ? '客服服務已啟用' : '客服服務已停用'}}</span>
      </div>

      <div class="support-notice" role="status">
        <strong>目前為管理介面</strong>
        <span>內置客服 API、對話資料與權限尚待接入。此頁不會建立對話或發送訊息。</span>
      </div>

      <div class="support-tabs" role="tablist" aria-label="客服管理分頁">
        <SupportButton role="tab" :aria-selected="section === 'inbox'" :tone="section === 'inbox' ? 'tab-active' : 'tab'" @click="section = 'inbox'">對話收件箱</SupportButton>
        <SupportButton role="tab" :aria-selected="section === 'outbound'" :tone="section === 'outbound' ? 'tab-active' : 'tab'" @click="section = 'outbound'">主動聯繫</SupportButton>
        <SupportButton role="tab" :aria-selected="section === 'settings'" :tone="section === 'settings' ? 'tab-active' : 'tab'" @click="section = 'settings'">客服設定</SupportButton>
      </div>

      <div v-if="section === 'inbox'" class="support-workspace" role="tabpanel">
        <div class="support-conversation-panel" aria-label="客服對話清單">
          <div class="support-panel-heading"><div><span class="support-kicker">INBOX</span><h3>全部對話</h3></div><span class="support-count">—</span></div>
          <label class="support-search"><span>搜尋對話</span><SupportInput v-model="search" type="search" placeholder="姓名、帳戶 ID 或訊息" disabled aria-describedby="support-search-hint"/></label>
          <p id="support-search-hint" class="support-field-hint">接入客服資料後開放搜尋。</p>
          <div class="support-filter" role="group" aria-label="對話對象">
            <SupportButton v-for="item in [{ id: 'ALL', label: '全部' }, { id: 'PASSENGER', label: '乘客' }, { id: 'DRIVER', label: '司機' }, { id: 'GUEST', label: '訪客' }]" :key="item.id" :tone="audience === item.id ? 'filter-active' : 'filter'" :aria-pressed="audience === item.id" @click="audience = item.id">{{item.label}}</SupportButton>
          </div>
          <div class="support-list-empty"><div class="support-empty-icon" aria-hidden="true">✉</div><strong>尚未接入對話資料</strong><p>完成內置客服 API 後，對話會顯示在這裡。</p></div>
        </div>

        <div class="support-detail-panel">
          <div class="support-detail-header"><div><span class="support-kicker">CONVERSATION</span><h3>對話內容</h3></div><span class="support-detail-placeholder">尚未選取</span></div>
          <div class="support-detail-empty"><div class="support-empty-icon" aria-hidden="true">◌</div><strong>選取對話以查看訊息</strong><p>文字、語音訊息和通話紀錄將顯示於同一對話。</p></div>
          <div class="support-composer"><label for="support-reply-draft">回覆內容</label><SupportTextarea id="support-reply-draft" v-model="draft" rows="3" placeholder="選取對話並接入服務後可回覆" disabled/><div class="support-composer-actions"><span>語音訊息與即時通話待接入</span><div><SupportButton disabled>錄製語音</SupportButton><SupportButton disabled>語音通話</SupportButton><SupportButton tone="primary" disabled>發送回覆</SupportButton></div></div></div>
        </div>
      </div>

      <div v-else-if="section === 'outbound'" class="support-outbound" role="tabpanel">
        <div class="support-outbound-heading"><span class="support-kicker">START CONVERSATION</span><h3>透過現有 ID 聯繫</h3><p>先選擇身份，再輸入專案中現有的乘客或司機 ID。實際帳戶查核及發送將由後端處理。</p></div>
        <div class="support-outbound-form">
          <div class="support-recipient-types" role="group" aria-label="聯繫對象身份">
            <SupportButton :tone="recipientType === 'PASSENGER' ? 'filter-active' : 'filter'" :aria-pressed="recipientType === 'PASSENGER'" @click="recipientType = 'PASSENGER'; recipientId = ''">乘客</SupportButton>
            <SupportButton :tone="recipientType === 'DRIVER' ? 'filter-active' : 'filter'" :aria-pressed="recipientType === 'DRIVER'" @click="recipientType = 'DRIVER'; recipientId = ''">司機</SupportButton>
          </div>
          <label class="support-recipient-id"><span>{{recipientLabel}}</span><SupportInput v-model.trim="recipientId" :placeholder="'輸入現有' + recipientLabel" autocomplete="off" disabled/></label>
          <div class="support-outbound-actions"><span>帳戶查核與建立對話尚未接通。</span><SupportButton tone="primary" disabled>查找並開始對話</SupportButton></div>
        </div>
        <div class="support-outbound-note"><strong>身份驗證</strong><p>後續串接時，由 API 驗證現有乘客／司機帳戶和管理員權限；輸入 ID 本身不會授予讀取對話的權限。</p></div>
      </div>

      <div v-else class="support-settings" role="tabpanel" aria-label="客服設定">
        <div class="support-settings-heading"><div><span class="support-kicker">SERVICE CONFIGURATION</span><h3>客服功能設定</h3><p>客服使用現有後台管理員登入與角色權限；這裡只配置客服功能是否開放及可用能力。</p></div><span class="support-settings-scope">{{isSuperAdministrator ? 'SUPER_ADMIN 可編輯' : '目前帳戶唯讀'}}</span></div>
        <div class="support-settings-grid">
          <article class="support-setting-card support-setting-card--primary"><div><strong>啟用內置客服</strong><p>開啟後，乘客端、司機端與後台客服入口才會進入可接通狀態。</p></div><SupportToggle v-model="settingsDraft.enabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>訪客客服</strong><p>允許未登入乘客以訪客識別進入客服。</p></div><SupportToggle v-model="settingsDraft.guestEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>ID 直接聯繫</strong><p>允許客服使用現有乘客／司機 ID 開始對話。</p></div><SupportToggle v-model="settingsDraft.directContactEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>訂單／行程關聯</strong><p>允許客服對話帶入訂單或行程狀態。</p></div><SupportToggle v-model="settingsDraft.orderContextEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>圖片上傳</strong><p>客服對話可附加圖片，實際儲存與權限稍後接入。</p></div><SupportToggle v-model="settingsDraft.imageUploadEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>影片上傳</strong><p>客服對話可附加影片，實際媒體處理稍後接入。</p></div><SupportToggle v-model="settingsDraft.videoUploadEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>語音訊息</strong><p>保留語音訊息入口，實際錄製與播放稍後接入。</p></div><SupportToggle v-model="settingsDraft.voiceMessageEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>即時語音通話</strong><p>保留即時通話入口，通話服務稍後接入。</p></div><SupportToggle v-model="settingsDraft.voiceCallEnabled" :disabled="!canWrite || !isSuperAdministrator"/></article>
        </div>
        <div class="support-settings-footer"><label><span>單檔上傳上限（MB）</span><SupportInput v-model="settingsDraft.maxUploadSizeMb" type="number" min="1" max="500" :disabled="!canWrite || !isSuperAdministrator"/><small>目前只保存配置，實際上傳服務接入後才會套用。</small></label><div><span v-if="settingsSaved" class="support-settings-saved">設定已儲存</span><SupportButton tone="primary" :disabled="!canWrite || !isSuperAdministrator || savingSettings" @click="saveSettings">{{savingSettings ? '儲存中…' : '儲存客服設定'}}</SupportButton></div></div>
      </div>
    </section>`
}
