import { ref, computed, watch } from 'vue'

const cloneConfig = config => JSON.parse(JSON.stringify(config))

// The Hong Kong and mainland channels share this editor; `provider` on the config decides the wording.
export const WECHAT_PAY_CN_PROVIDER = '內地微信支付'
const merchantModes = cn => [
  { key: 'direct', label: '普通商戶', note: cn ? '自行持有微信支付商戶號，直接收款' : '自行持有 WeChat Pay HK 商戶號，直接收款' },
  { key: 'institution', label: cn ? '服務商模式' : '機構／服務商模式', note: cn ? '以服務商憑證代子商戶收款，需填子商戶號' : '以機構商戶憑證代子商戶收款，需填子商戶號' }
]

export const WechatPayHkConfigEditor = {
  name: 'WechatPayHkConfigEditor',
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
    const institution = computed(() => draft.value.merchantMode === 'institution')
    const cn = computed(() => draft.value.provider === WECHAT_PAY_CN_PROVIDER)
    const brand = computed(() => cn.value ? '內地微信支付' : 'WeChat Pay HK')
    const modes = computed(() => merchantModes(cn.value))
    const isSaved = computed(() => Boolean(draft.value.id && !draft.value.id.startsWith('config-')))
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.config))
    // Format hints only; the backend validates the fields and WeChat Pay decides whether the credentials work.
    const merchantIdPattern = /^\d{8,32}$/
    const appIdPattern = /^wx[0-9a-z]{16}$/
    const looksRight = computed(() => ({
      merchantId: merchantIdPattern.test((draft.value.merchantId || '').trim()),
      appId: appIdPattern.test((draft.value.appId || '').trim()),
      subMerchantId: !institution.value || merchantIdPattern.test((draft.value.subMerchantId || '').trim()),
      subAppId: !institution.value || !(draft.value.subAppId || '').trim() || appIdPattern.test(draft.value.subAppId.trim()),
      certificateSerialNo: /^[0-9A-Fa-f]{8,64}$/.test((draft.value.certificateSerialNo || '').trim()),
      privateKey: (draft.value.privateKey || '').trim() ? /-----BEGIN (RSA )?PRIVATE KEY-----/.test(draft.value.privateKey) : Boolean(draft.value.privateKeyConfigured),
      apiV3Key: (draft.value.apiV3Key || '').trim() ? draft.value.apiV3Key.trim().length === 32 : Boolean(draft.value.apiV3KeyConfigured),
      notifyUrl: !(draft.value.notifyUrl || '').trim() || /^https:\/\/\S+$/i.test(draft.value.notifyUrl.trim())
    }))
    const ready = computed(() => Boolean(draft.value.name?.trim()) && Object.values(looksRight.value).every(Boolean))
    const canSave = computed(() => props.canWrite && !props.busy && ready.value && (!isSaved.value || dirty.value))
    const canRetest = computed(() => props.canWrite && !props.busy && isSaved.value && !dirty.value)
    const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-HK', { hour12: false }) }
    return { draft, modes, cn, brand, institution, isSaved, dirty, looksRight, canSave, canRetest, formatTime }
  },
  template: String.raw`<Teleport to="body"><div class="payment-settings-admin payment-modal-host"><div class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="wechat-pay-hk-editor-title" @click.self="!dirty && $emit('close')"><section class="payment-editor payment-editor-shell">
    <header class="payment-editor-header"><div class="payment-editor-title"><span class="payment-kicker">TECHNICAL CONFIGURATION</span><h2 id="wechat-pay-hk-editor-title">{{(isSaved ? '編輯' : '新增') + (cn ? brand : ' ' + brand + ' ') + '配置'}}</h2><p>{{brand}} · APIv3 · {{institution ? modes[1].label : '普通商戶'}} · {{cn ? 'RMB' : 'HKD'}} 結算</p></div><button class="payment-close" type="button" aria-label="關閉微信支付配置編輯器" @click="$emit('close')">×</button></header>
    <div class="payment-editor-main"><div class="payment-editor-body">
      <fieldset class="payment-form" :disabled="!canWrite || Boolean(busy)">
        <div class="wide payment-readonly-currency"><div><strong>正式環境（APIv3）</strong><span>微信支付 APIv3 沒有沙箱環境，只保存一份正式配置；連線測試只讀取資料，不會建立交易。</span></div><b aria-hidden="true">固定</b></div>
        <section class="wide payment-currency-section"><div class="payment-currency-section-heading"><strong>商戶模式 *</strong><span>按微信支付商戶平台的帳戶類型選擇；兩種模式使用的商戶號與欄位不同。</span></div><div class="payment-currency-options" role="group" aria-label="微信支付商戶模式"><button v-for="mode in modes" :key="mode.key" type="button" class="payment-currency-option" :class="{selected: draft.merchantMode === mode.key}" :aria-pressed="draft.merchantMode === mode.key" @click="draft.merchantMode = mode.key"><span><strong>{{mode.label}}</strong><small>{{mode.note}}</small></span><b aria-hidden="true">✓</b></button></div></section>
        <label>配置名稱 *<input v-model="draft.name" maxlength="80" :placeholder="'例如：' + brand" /></label>
        <label>說明<input v-model="draft.description" maxlength="500" placeholder="用途或備註（選填）" /></label>
        <label>{{institution ? (cn ? '服務商商戶號（sp_mchid）*' : '機構商戶號（sp_mchid）*') : '商戶號（mchid）*'}}<input v-model="draft.merchantId" inputmode="numeric" maxlength="32" autocomplete="off" placeholder="例如：1900009191" /><small v-if="draft.merchantId && !looksRight.merchantId" class="payment-field-warning">應為 8 位以上的數字</small></label>
        <label>{{institution ? (cn ? '服務商 App ID（sp_appid）*' : '機構 App ID（sp_appid）*') : 'App ID（appid）*'}}<input v-model="draft.appId" maxlength="18" autocomplete="off" spellcheck="false" placeholder="wx 開頭的 18 位字元" /><small v-if="draft.appId && !looksRight.appId" class="payment-field-warning">應以 wx 開頭，共 18 位</small></label>
        <template v-if="institution">
          <label>子商戶號（sub_mchid）*<input v-model="draft.subMerchantId" inputmode="numeric" maxlength="32" autocomplete="off" placeholder="為此商戶開立的子商戶號" /><small v-if="draft.subMerchantId && !looksRight.subMerchantId" class="payment-field-warning">應為 8 位以上的數字</small></label>
          <label>子商戶 App ID（sub_appid，選填）<input v-model="draft.subAppId" maxlength="18" autocomplete="off" spellcheck="false" placeholder="子商戶自有公眾號／小程序時填寫" /><small v-if="!looksRight.subAppId" class="payment-field-warning">應以 wx 開頭，共 18 位</small></label>
        </template>
        <label>商戶 API 證書序號 *<input v-model="draft.certificateSerialNo" maxlength="64" autocomplete="off" spellcheck="false" placeholder="40 位十六進位字元" /><small v-if="draft.certificateSerialNo && !looksRight.certificateSerialNo" class="payment-field-warning">應為十六進位字元（0-9、A-F）</small></label>
        <label>APIv3 密鑰 *<input v-model="draft.apiV3Key" type="password" maxlength="32" autocomplete="new-password" spellcheck="false" :placeholder="draft.apiV3KeyConfigured ? '已加密保存；留空表示保留現有密鑰' : '32 位字元'" /><small v-if="draft.apiV3Key && !looksRight.apiV3Key" class="payment-field-warning">APIv3 密鑰必須是 32 位字元</small></label>
        <label class="wide">商戶 API 私鑰（apiclient_key.pem）*<textarea v-model="draft.privateKey" rows="4" autocomplete="off" spellcheck="false" :placeholder="draft.privateKeyConfigured ? '已加密保存；留空表示保留現有私鑰' : '貼上完整 PEM 私鑰，包含 BEGIN／END 行'"></textarea><small v-if="draft.privateKey && !looksRight.privateKey" class="payment-field-warning">應包含 -----BEGIN PRIVATE KEY----- 行</small></label>
        <label class="wide">支付結果通知地址（notify_url，選填）<input v-model="draft.notifyUrl" autocomplete="off" spellcheck="false" placeholder="https://api.example.com/payments/wechatpay-hk/notify" /><small v-if="!looksRight.notifyUrl" class="payment-field-warning">必須是 HTTPS 地址</small></label>
        <div class="wide payment-provider-hint"><strong>資料來源與安全</strong><span>商戶號、API 證書序號、私鑰及 APIv3 密鑰在微信支付商戶平台「帳戶中心 → API 安全」取得；證書序號與私鑰必須屬於同一張商戶 API 證書。私鑰與 APIv3 密鑰由後端加密保存，保存後不會回傳明文；重新輸入即可輪替。目前只保存配置並測試連線，下單、退款及通知接收待收款流程接入。</span></div>
      </fieldset>
      <div class="payment-test payment-stripe-result" aria-live="polite">
        <div><span>保存狀態</span><b :class="isSaved && !dirty ? 'success' : isSaved ? 'warning' : 'idle'">{{busy === 'saving' ? '保存中…' : !isSaved ? '尚未保存' : dirty ? '有未保存的修改' : '已保存'}}</b></div>
        <div><span>微信支付連線</span><b :class="config.connection === 'success' ? 'success' : config.connection === 'warning' || config.connection === 'error' ? 'warning' : 'idle'">{{busy === 'testing' ? '測試中…' : config.connection === 'success' ? '連線正常' : config.connection === 'warning' ? '已連線，需留意' : config.connection === 'error' ? '測試未通過' : '尚未測試'}}</b></div>
        <template v-if="config.account">
          <div><span>已驗證商戶號</span><b>{{config.account.merchantId}}</b></div>
          <div><span>微信支付平台證書</span><b>{{config.account.platformCertificateSerialNo || '—'}}（有效至 {{formatTime(config.account.platformCertificateExpireTime)}}）</b></div>
          <div v-if="config.account.merchantMode === 'institution' && !cn"><span>子商戶</span><b :class="config.account.subMerchant ? 'success' : 'warning'">{{config.account.subMerchant ? (config.account.subMerchant.name || config.account.subMerchant.id) : '未能確認'}}</b></div>
        </template>
        <p v-if="error" class="payment-editor-feedback" role="alert">{{error}}</p>
        <p v-else-if="config.lastTestMessage" :class="config.connection === 'success' ? 'payment-test-note' : 'payment-editor-feedback'">{{config.lastTestMessage}}</p>
        <p class="payment-test-note">連線測試會以已保存的憑證向微信支付下載平台證書{{institution && !cn ? '並查詢子商戶' : ''}}，不會建立任何交易，也不會自動啟用財務渠道或開始收款。</p>
      </div>
    </div></div>
    <footer class="payment-editor-footer"><button class="payment-button" type="button" @click="$emit('close')">取消</button><div><button class="payment-button" type="button" :disabled="!canRetest" @click="$emit('test')">{{busy === 'testing' && isSaved && !dirty ? '測試中…' : '重新測試連線'}}</button><button class="payment-button primary" type="button" :disabled="!canSave" @click="$emit('save', draft)">{{busy === 'saving' ? '保存中…' : isSaved && !dirty ? '已保存' : '保存並測試連線'}}</button></div></footer>
  </section></div></div></Teleport>`
}
