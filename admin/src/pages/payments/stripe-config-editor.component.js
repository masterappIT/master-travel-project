import { ref, computed, watch } from 'vue'

const cloneConfig = config => JSON.parse(JSON.stringify(config))

export const STRIPE_PAYMENT_METHODS = [
  { key: 'card', label: '信用卡／扣帳卡', note: 'Visa、Mastercard 等' },
  { key: 'apple_pay', label: 'Apple Pay', note: '需在 Stripe 後台啟用並驗證網域' },
  { key: 'google_pay', label: 'Google Pay', note: '需在 Stripe 後台啟用' },
  { key: 'alipay', label: '支付寶', note: '經 Stripe 代收' },
  { key: 'wechat_pay', label: '微信支付', note: '經 Stripe 代收' }
]

export const StripeConfigEditor = {
  name: 'StripeConfigEditor',
  props: {
    config: { type: Object, required: true },
    canWrite: { type: Boolean, default: true },
    busy: { type: String, default: '' },
    apiBase: { type: String, default: '/api' },
    error: { type: String, default: '' }
  },
  emits: ['close', 'test', 'save'],
  setup(props) {
    const draft = ref(cloneConfig(props.config))
    watch(() => props.config, value => { draft.value = cloneConfig(value) }, { deep: true })
    const mode = computed(() => draft.value.environment === 'production' ? 'live' : 'test')
    const isSaved = computed(() => Boolean(draft.value.id && !draft.value.id.startsWith('config-')))
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.config))
    // Format hints only; the backend validates the keys and Stripe decides whether they work.
    const publishableKeyLooksRight = computed(() => (draft.value.publishableKey || '').trim().startsWith(`pk_${mode.value}_`))
    const secretKeyLooksRight = computed(() => {
      const key = (draft.value.secretKey || '').trim()
      return key ? key.startsWith(`sk_${mode.value}_`) || key.startsWith(`rk_${mode.value}_`) : Boolean(draft.value.secretKeyConfigured)
    })
    const webhookSecretLooksRight = computed(() => { const key = (draft.value.webhookSecret || '').trim(); return !key || key.startsWith('whsec_') })
    const ready = computed(() => Boolean(draft.value.name?.trim() && publishableKeyLooksRight.value && secretKeyLooksRight.value && webhookSecretLooksRight.value && draft.value.paymentMethods?.length))
    // Stripe calls the API directly, so the admin's API base is turned into the absolute address Stripe must be given.
    const webhookUrl = computed(() => `${/^https?:\/\//i.test(props.apiBase) ? props.apiBase : window.location.origin + props.apiBase}`.replace(/\/+$/, '') + `/payments/stripe/webhook/${draft.value.environment}`)
    const webhookUrlReachable = computed(() => /^https:\/\//i.test(webhookUrl.value) && !/^https:\/\/(localhost|127\.|\[::1\])/i.test(webhookUrl.value))
    const copied = ref(false)
    const copyWebhookUrl = async () => {
      try { await navigator.clipboard.writeText(webhookUrl.value); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { copied.value = false }
    }
    const formatTime = value => value ? new Date(value).toLocaleString('zh-HK', { hour12: false }) : ''
    const canSave = computed(() => props.canWrite && !props.busy && ready.value && (!isSaved.value || dirty.value))
    const canRetest = computed(() => props.canWrite && !props.busy && isSaved.value && !dirty.value)
    const toggleMethod = key => {
      const selected = draft.value.paymentMethods || []
      draft.value.paymentMethods = selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]
    }
    return { draft, mode, methods: STRIPE_PAYMENT_METHODS, isSaved, dirty, publishableKeyLooksRight, secretKeyLooksRight, webhookSecretLooksRight, webhookUrl, webhookUrlReachable, copied, copyWebhookUrl, formatTime, canSave, canRetest, toggleMethod }
  },
  template: String.raw`<Teleport to="body"><div class="payment-settings-admin payment-modal-host"><div class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="stripe-editor-title" @click.self="!dirty && $emit('close')"><section class="payment-editor payment-editor-shell">
    <header class="payment-editor-header"><div class="payment-editor-title"><span class="payment-kicker">TECHNICAL CONFIGURATION</span><h2 id="stripe-editor-title">{{isSaved ? '編輯 Stripe 配置' : '新增 Stripe 配置'}}</h2><p>Stripe · {{mode === 'live' ? '正式模式' : '測試模式'}} · HKD 結算</p></div><button class="payment-close" type="button" aria-label="關閉 Stripe 配置編輯器" @click="$emit('close')">×</button></header>
    <div class="payment-editor-main"><div class="payment-editor-body">
      <fieldset class="payment-form" :disabled="!canWrite || Boolean(busy)">
        <div class="wide payment-readonly-currency"><div><strong>{{mode === 'live' ? '正式模式（Live）' : '測試模式（Test）'}}</strong><span>模式在開啟配置時決定；每個模式各保存一份配置，金鑰必須屬於相同模式。</span></div><b aria-hidden="true">固定</b></div>
        <label>配置名稱 *<input v-model="draft.name" maxlength="80" placeholder="例如：Stripe 香港" /></label>
        <label>說明<input v-model="draft.description" maxlength="500" placeholder="用途或備註（選填）" /></label>
        <label>Publishable Key *<input v-model="draft.publishableKey" autocomplete="off" spellcheck="false" :placeholder="'pk_' + mode + '_…'" /><small v-if="draft.publishableKey && !publishableKeyLooksRight" class="payment-field-warning">應以 pk_{{mode}}_ 開頭</small></label>
        <label>Secret Key *<input v-model="draft.secretKey" type="password" autocomplete="new-password" spellcheck="false" :placeholder="draft.secretKeyConfigured ? '已加密保存；留空表示保留現有金鑰' : 'sk_' + mode + '_…'" /><small v-if="draft.secretKey && !secretKeyLooksRight" class="payment-field-warning">應以 sk_{{mode}}_ 或 rk_{{mode}}_ 開頭</small></label>
        <section class="wide payment-currency-section"><div class="payment-currency-section-heading"><strong>付款方式 *</strong><span>選擇要透過 Stripe 提供的付款方式；連線測試會核對 Stripe 帳戶是否已啟用。</span></div><div class="payment-currency-options" role="group" aria-label="Stripe 付款方式"><button v-for="method in methods" :key="method.key" type="button" class="payment-currency-option" :class="{selected: draft.paymentMethods.includes(method.key)}" :aria-pressed="draft.paymentMethods.includes(method.key)" @click="toggleMethod(method.key)"><span><strong>{{method.label}}</strong><small>{{method.note}}</small></span><b aria-hidden="true">✓</b></button></div></section>
        <section class="wide payment-currency-section"><div class="payment-currency-section-heading"><strong>回調網址（Webhook）</strong><span>在 Stripe 後台「開發人員 → Webhooks」新增端點並貼上此網址；建立後 Stripe 會提供簽名密鑰（whsec_…），再貼到下方保存。</span></div><div class="payment-webhook-url"><code>{{webhookUrl}}</code><button class="payment-button" type="button" @click="copyWebhookUrl">{{copied ? '已複製' : '複製網址'}}</button></div><small v-if="!webhookUrlReachable" class="payment-field-warning">目前是本機或非 HTTPS 位址，Stripe 無法連到；請在正式後台開啟此頁取得可用的網址。</small></section>
        <label class="wide">Webhook 簽名密鑰<input v-model="draft.webhookSecret" type="password" autocomplete="new-password" spellcheck="false" :placeholder="draft.webhookSecretConfigured ? '已加密保存；留空表示保留現有密鑰' : 'whsec_…（可稍後再填）'" /><small v-if="!webhookSecretLooksRight" class="payment-field-warning">應以 whsec_ 開頭</small></label>
        <div class="wide payment-provider-hint"><strong>金鑰與安全</strong><span>金鑰在 Stripe 後台「開發人員 → API 金鑰」取得。Secret Key 與 Webhook 簽名密鑰由後端加密保存，保存後不會回傳明文；重新輸入即可輪替。結算貨幣由 Stripe 帳戶決定，連線測試會確認為 HKD。</span></div>
      </fieldset>
      <div class="payment-test payment-stripe-result" aria-live="polite">
        <div><span>保存狀態</span><b :class="isSaved && !dirty ? 'success' : isSaved ? 'warning' : 'idle'">{{busy === 'saving' ? '保存中…' : !isSaved ? '尚未保存' : dirty ? '有未保存的修改' : '已保存'}}</b></div>
        <div><span>Stripe 連線</span><b :class="config.connection === 'success' ? 'success' : config.connection === 'warning' || config.connection === 'error' ? 'warning' : 'idle'">{{busy === 'testing' ? '測試中…' : config.connection === 'success' ? '連線正常' : config.connection === 'warning' ? '已連線，需留意' : config.connection === 'error' ? '測試未通過' : '尚未測試'}}</b></div>
        <div><span>Webhook</span><b :class="config.lastWebhookAt ? 'success' : 'idle'">{{!config.webhookSecretConfigured ? '未配置簽名密鑰' : config.lastWebhookAt ? '已收到 ' + config.lastWebhookEvent + '（' + formatTime(config.lastWebhookAt) + '）' : '已配置，尚未收到事件'}}</b></div>
        <template v-if="config.account">
          <div><span>Stripe 帳戶</span><b>{{config.account.name || config.account.id}}</b></div>
          <div><span>所在地／結算貨幣</span><b>{{config.account.country || '—'}}／{{(config.account.defaultCurrency || '—').toUpperCase()}}</b></div>
          <div><span>收款／出款</span><b :class="config.account.chargesEnabled ? 'success' : 'warning'">{{config.account.chargesEnabled ? '可收款' : '未開通收款'}}／{{config.account.payoutsEnabled ? '可出款' : '未開通出款'}}</b></div>
          <div v-for="method in methods.filter(item => config.paymentMethods.includes(item.key) && config.account.methods && item.key in config.account.methods)" :key="method.key"><span>{{method.label}}</span><b :class="config.account.methods[method.key] ? 'success' : 'warning'">{{config.account.methods[method.key] ? 'Stripe 已啟用' : 'Stripe 尚未啟用'}}</b></div>
        </template>
        <p v-if="error" class="payment-editor-feedback" role="alert">{{error}}</p>
        <p v-else-if="config.lastTestMessage" :class="config.connection === 'success' ? 'payment-test-note' : 'payment-editor-feedback'">{{config.lastTestMessage}}</p>
        <p class="payment-test-note">連線測試只讀取 Stripe 帳戶資料，不會建立任何交易，也不會自動啟用財務渠道或開始收款。</p>
      </div>
    </div></div>
    <footer class="payment-editor-footer"><button class="payment-button" type="button" @click="$emit('close')">取消</button><div><button class="payment-button" type="button" :disabled="!canRetest" @click="$emit('test')">{{busy === 'testing' && isSaved && !dirty ? '測試中…' : '重新測試連線'}}</button><button class="payment-button primary" type="button" :disabled="!canSave" @click="$emit('save', draft)">{{busy === 'saving' ? '保存中…' : isSaved && !dirty ? '已保存' : '保存並測試連線'}}</button></div></footer>
  </section></div></div></Teleport>`
}
