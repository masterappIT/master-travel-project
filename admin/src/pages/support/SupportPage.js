import { computed, h, ref } from 'vue'
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

export const SupportPage = {
  name: 'SupportPage',
  components: { SupportButton, SupportInput, SupportTextarea },
  setup() {
    const section = ref('inbox')
    const audience = ref('ALL')
    const search = ref('')
    const recipientType = ref('PASSENGER')
    const recipientId = ref('')
    const draft = ref('')
    const recipientLabel = computed(() => recipientType.value === 'DRIVER' ? '司機 ID' : '乘客 ID')
    return { section, audience, search, recipientType, recipientId, draft, recipientLabel }
  },
  template: String.raw`
    <section class="support-management" aria-labelledby="support-page-title">
      <div class="support-heading">
        <div>
          <span class="support-kicker">CUSTOMER SUPPORT</span>
          <h2 id="support-page-title">客服管理</h2>
          <p>集中處理乘客、司機與訪客的諮詢，並透過現有帳戶 ID 主動聯繫。</p>
        </div>
        <span class="support-connection-status" role="status"><span aria-hidden="true"></span> 客服服務尚未接通</span>
      </div>

      <div class="support-notice" role="status">
        <strong>目前為管理介面</strong>
        <span>內置客服 API、對話資料與權限尚待接入。此頁不會建立對話或發送訊息。</span>
      </div>

      <div class="support-tabs" role="tablist" aria-label="客服管理分頁">
        <SupportButton role="tab" :aria-selected="section === 'inbox'" :tone="section === 'inbox' ? 'tab-active' : 'tab'" @click="section = 'inbox'">對話收件箱</SupportButton>
        <SupportButton role="tab" :aria-selected="section === 'outbound'" :tone="section === 'outbound' ? 'tab-active' : 'tab'" @click="section = 'outbound'">主動聯繫</SupportButton>
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

      <div v-else class="support-outbound" role="tabpanel">
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
    </section>`
}
