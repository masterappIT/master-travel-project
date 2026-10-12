import { ref, computed, watch } from 'vue'

const cloneConfig = config => JSON.parse(JSON.stringify(config))

export const ALIPAY_CN_MERCHANT_MODES = [
  { key: 'merchant', label: '自研商戶', note: '以自己的應用直接收款' },
  { key: 'isv', label: '服務商模式', note: '以服務商應用代商戶收款，需填商戶授權令牌' }
]

export const ALIPAY_CN_PRODUCTS = [
  { key: 'wap', label: '手機網站支付（H5）', note: 'alipay.trade.wap.pay' },
  { key: 'app', label: 'App 支付', note: 'alipay.trade.app.pay' },
  { key: 'page', label: '電腦網站支付', note: 'alipay.trade.page.pay' }
]

export const AlipayCnConfigEditor = {
  name: 'AlipayCnConfigEditor',
  props: {
    config: { type: Object, required: true },
    canWrite: { type: Boolean, default: true },
    busy: { type: String, default: '' },
    error: { type: String, default: '' }
  },
  emits: ['close', 'test', 'save'],
  setup(props) {
    const draft = ref(cloneConfig(props.config))
    watch(() => props.config, value => { draft.value = cloneConfig(value) }, { deep: true })
    const live = computed(() => draft.value.environment === 'production')
    const isv = computed(() => draft.value.merchantMode === 'isv')
    const isSaved = computed(() => Boolean(draft.value.id && !draft.value.id.startsWith('config-')))
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.config))
    // Format hints only; the backend validates the fields and Alipay decides whether the credentials work.
    const httpsUrl = /^https:\/\/\S+$/i
    const looksRight = computed(() => ({
      appId: /^\d{16}$/.test((draft.value.appId || '').trim()),
      gatewayUrl: /^https:\/\/[^/]*\.(alipay\.com|alipaydev\.com)\//i.test((draft.value.gatewayUrl || '').trim()),
      privateKey: Boolean((draft.value.privateKey || '').trim() || draft.value.privateKeyConfigured),
      alipayPublicKey: Boolean((draft.value.alipayPublicKey || '').trim() || draft.value.alipayPublicKeyConfigured),
      appAuthToken: !isv.value || Boolean((draft.value.appAuthToken || '').trim() || draft.value.appAuthTokenConfigured),
      providerId: !isv.value || !(draft.value.providerId || '').trim() || /^2088\d{12}$/.test(draft.value.providerId.trim()),
      products: Boolean(draft.value.products?.length),
      notifyUrl: !(draft.value.notifyUrl || '').trim() || httpsUrl.test(draft.value.notifyUrl.trim()),
      returnUrl: !(draft.value.returnUrl || '').trim() || httpsUrl.test(draft.value.returnUrl.trim())
    }))
    const ready = computed(() => Boolean(draft.value.name?.trim()) && Object.values(looksRight.value).every(Boolean))
    const canSave = computed(() => props.canWrite && !props.busy && ready.value && (!isSaved.value || dirty.value))
    const canRetest = computed(() => props.canWrite && !props.busy && isSaved.value && !dirty.value)
    const toggleProduct = key => {
      const selected = draft.value.products || []
      draft.value.products = selected.includes(key) ? selected.filter(item => item !== key) : [...selected, key]
    }
    return { draft, modes: ALIPAY_CN_MERCHANT_MODES, products: ALIPAY_CN_PRODUCTS, live, isv, isSaved, dirty, looksRight, canSave, canRetest, toggleProduct }
  },
  template: String.raw`<Teleport to="body"><div class="payment-settings-admin payment-modal-host"><div class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="alipay-cn-editor-title" @click.self="!dirty && $emit('close')"><section class="payment-editor payment-editor-shell">
    <header class="payment-editor-header"><div class="payment-editor-title"><span class="payment-kicker">TECHNICAL CONFIGURATION</span><h2 id="alipay-cn-editor-title">{{isSaved ? '編輯內地支付寶配置' : '新增內地支付寶配置'}}</h2><p>內地支付寶 · {{live ? '正式環境' : '沙箱環境'}} · {{isv ? '服務商模式' : '自研商戶'}} · RMB 結算</p></div><button class="payment-close" type="button" aria-label="關閉內地支付寶配置編輯器" @click="$emit('close')">×</button></header>
    <div class="payment-editor-main"><div class="payment-editor-body">
      <fieldset class="payment-form" :disabled="!canWrite || Boolean(busy)">
        <div class="wide payment-readonly-currency"><div><strong>{{live ? '正式環境（Production）' : '沙箱環境（Sandbox）'}}</strong><span>環境在開啟配置時決定；每個環境各保存一份配置，沙箱與正式環境的 App ID 和金鑰不能互用。</span></div><b aria-hidden="true">固定</b></div>
        <section class="wide payment-currency-section"><div class="payment-currency-section-heading"><strong>接入模式 *</strong><span>按開放平台上應用的類型選擇。</span></div><div class="payment-currency-options" role="group" aria-label="內地支付寶接入模式"><button v-for="mode in modes" :key="mode.key" type="button" class="payment-currency-option" :class="{selected: draft.merchantMode === mode.key}" :aria-pressed="draft.merchantMode === mode.key" @click="draft.merchantMode = mode.key"><span><strong>{{mode.label}}</strong><small>{{mode.note}}</small></span><b aria-hidden="true">✓</b></button></div></section>
        <label>配置名稱 *<input v-model="draft.name" maxlength="80" placeholder="例如：內地支付寶" /></label>
        <label>說明<input v-model="draft.description" maxlength="500" placeholder="用途或備註（選填）" /></label>
        <label>{{isv ? '服務商應用 App ID *' : 'App ID *'}}<input v-model="draft.appId" inputmode="numeric" maxlength="16" autocomplete="off" placeholder="16 位數字" /><small v-if="draft.appId && !looksRight.appId" class="payment-field-warning">應為 16 位數字</small></label>
        <label>支付網關 *<input v-model="draft.gatewayUrl" autocomplete="off" spellcheck="false" placeholder="https://openapi.alipay.com/gateway.do" /><small v-if="!looksRight.gatewayUrl" class="payment-field-warning">必須是 alipay.com 或 alipaydev.com 的 HTTPS 地址</small><small v-else-if="!live">沙箱網關請以開放平台沙箱控制台顯示的地址為準</small></label>
        <template v-if="isv">
          <label>商戶授權令牌（app_auth_token）*<input v-model="draft.appAuthToken" type="password" maxlength="128" autocomplete="new-password" spellcheck="false" :placeholder="draft.appAuthTokenConfigured ? '已加密保存；留空表示保留現有令牌' : '商戶授權後取得的令牌'" /></label>
          <label>服務商 PID（選填）<input v-model="draft.providerId" inputmode="numeric" maxlength="16" autocomplete="off" placeholder="2088 開頭的 16 位數字" /><small v-if="!looksRight.providerId" class="payment-field-warning">應為 2088 開頭的 16 位數字</small></label>
        </template>
        <label class="wide">應用私鑰 *<textarea v-model="draft.privateKey" rows="4" autocomplete="off" spellcheck="false" :placeholder="draft.privateKeyConfigured ? '已加密保存；留空表示保留現有私鑰' : '貼上密鑰工具產生的應用私鑰（PEM 或純 Base64 均可）'"></textarea></label>
        <label class="wide">支付寶公鑰 *<textarea v-model="draft.alipayPublicKey" rows="3" autocomplete="off" spellcheck="false" :placeholder="draft.alipayPublicKeyConfigured ? '已加密保存；留空表示保留現有公鑰' : '貼上開放平台顯示的「支付寶公鑰」，不是應用公鑰'"></textarea></label>
        <section class="wide payment-currency-section"><div class="payment-currency-section-heading"><strong>支付產品 *</strong><span>選擇此應用已在開放平台簽約並要提供的產品。</span></div><div class="payment-currency-options" role="group" aria-label="內地支付寶支付產品"><button v-for="product in products" :key="product.key" type="button" class="payment-currency-option" :class="{selected: draft.products.includes(product.key)}" :aria-pressed="draft.products.includes(product.key)" @click="toggleProduct(product.key)"><span><strong>{{product.label}}</strong><small>{{product.note}}</small></span><b aria-hidden="true">✓</b></button></div></section>
        <label class="wide">異步通知地址（notify_url，選填）<input v-model="draft.notifyUrl" autocomplete="off" spellcheck="false" placeholder="https://api.example.com/payments/alipay-cn/notify" /><small v-if="!looksRight.notifyUrl" class="payment-field-warning">必須是 HTTPS 地址</small></label>
        <label class="wide">同步返回地址（return_url，選填）<input v-model="draft.returnUrl" autocomplete="off" spellcheck="false" placeholder="https://app.example.com/payment/return" /><small v-if="!looksRight.returnUrl" class="payment-field-warning">必須是 HTTPS 地址</small></label>
        <div class="wide payment-provider-hint"><strong>資料來源與安全</strong><span>App ID、應用私鑰與支付寶公鑰在支付寶開放平台應用詳情的「開發設置 → 接口加簽方式」取得；目前支援 RSA2 公鑰模式，不支援公鑰證書模式。私鑰、公鑰與授權令牌由後端加密保存，保存後不會回傳明文；重新輸入即可輪替。目前只保存配置並測試連線，下單、退款及通知接收待收款流程接入。</span></div>
      </fieldset>
      <div class="payment-test payment-stripe-result" aria-live="polite">
        <div><span>保存狀態</span><b :class="isSaved && !dirty ? 'success' : isSaved ? 'warning' : 'idle'">{{busy === 'saving' ? '保存中…' : !isSaved ? '尚未保存' : dirty ? '有未保存的修改' : '已保存'}}</b></div>
        <div><span>支付寶連線</span><b :class="config.connection === 'success' ? 'success' : config.connection === 'warning' || config.connection === 'error' ? 'warning' : 'idle'">{{busy === 'testing' ? '測試中…' : config.connection === 'success' ? '連線正常' : config.connection === 'warning' ? '已連線，需留意' : config.connection === 'error' ? '測試未通過' : '尚未測試'}}</b></div>
        <template v-if="config.account">
          <div><span>App ID／應用私鑰</span><b :class="config.account.credentialsAccepted ? 'success' : 'warning'">{{config.account.credentialsAccepted ? '支付寶已接受' : '未通過'}}</b></div>
          <div><span>支付寶公鑰</span><b :class="config.account.responseSignatureVerified ? 'success' : 'warning'">{{config.account.responseSignatureVerified ? '回應驗簽通過' : '未能確認'}}</b></div>
        </template>
        <p v-if="error" class="payment-editor-feedback" role="alert">{{error}}</p>
        <p v-else-if="config.lastTestMessage" :class="config.connection === 'success' ? 'payment-test-note' : 'payment-editor-feedback'">{{config.lastTestMessage}}</p>
        <p class="payment-test-note">連線測試會以已保存的憑證向支付寶查詢一個不存在的訂單號，並驗證回應簽名；不會建立任何交易，也不會自動啟用財務渠道或開始收款。</p>
      </div>
    </div></div>
    <footer class="payment-editor-footer"><button class="payment-button" type="button" @click="$emit('close')">取消</button><div><button class="payment-button" type="button" :disabled="!canRetest" @click="$emit('test')">{{busy === 'testing' && isSaved && !dirty ? '測試中…' : '重新測試連線'}}</button><button class="payment-button primary" type="button" :disabled="!canSave" @click="$emit('save', draft)">{{busy === 'saving' ? '保存中…' : isSaved && !dirty ? '已保存' : '保存並測試連線'}}</button></div></footer>
  </section></div></div></Teleport>`
}
