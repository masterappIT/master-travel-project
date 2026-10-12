import { ref, computed, watch } from 'vue'

const cloneConfig = config => JSON.parse(JSON.stringify(config))

export const PaymeConfigEditor = {
  name: 'PaymeConfigEditor',
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
    const isSaved = computed(() => Boolean(draft.value.id && !draft.value.id.startsWith('config-')))
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.config))
    // Format hints only; the backend validates the fields and PayMe decides whether the credentials work.
    const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
    const looksRight = computed(() => ({
      clientId: uuidPattern.test((draft.value.clientId || '').trim()),
      signingKeyId: uuidPattern.test((draft.value.signingKeyId || '').trim()),
      clientSecret: Boolean((draft.value.clientSecret || '').trim() || draft.value.clientSecretConfigured),
      signingKey: (draft.value.signingKey || '').trim() ? /^[A-Za-z0-9+/]+={0,2}$/.test(draft.value.signingKey.trim()) : Boolean(draft.value.signingKeyConfigured)
    }))
    const ready = computed(() => Boolean(draft.value.name?.trim()) && Object.values(looksRight.value).every(Boolean))
    const canSave = computed(() => props.canWrite && !props.busy && ready.value && (!isSaved.value || dirty.value))
    const canRetest = computed(() => props.canWrite && !props.busy && isSaved.value && !dirty.value)
    return { draft, live, isSaved, dirty, looksRight, canSave, canRetest }
  },
  template: String.raw`<Teleport to="body"><div class="payment-settings-admin payment-modal-host"><div class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payme-editor-title" @click.self="!dirty && $emit('close')"><section class="payment-editor payment-editor-shell">
    <header class="payment-editor-header"><div class="payment-editor-title"><span class="payment-kicker">TECHNICAL CONFIGURATION</span><h2 id="payme-editor-title">{{isSaved ? '編輯 PayMe 配置' : '新增 PayMe 配置'}}</h2><p>PayMe for Business · {{live ? '正式環境（Live）' : 'Sandbox'}} · HKD 結算</p></div><button class="payment-close" type="button" aria-label="關閉 PayMe 配置編輯器" @click="$emit('close')">×</button></header>
    <div class="payment-editor-main"><div class="payment-editor-body">
      <fieldset class="payment-form" :disabled="!canWrite || Boolean(busy)">
        <div class="wide payment-readonly-currency"><div><strong>{{live ? '正式環境（Live）' : 'Sandbox 測試環境'}}</strong><span>環境在開啟配置時決定；每個環境各保存一份配置，Sandbox 與正式環境的憑證不能互用。</span></div><b aria-hidden="true">固定</b></div>
        <label>配置名稱 *<input v-model="draft.name" maxlength="80" placeholder="例如：PayMe 香港" /></label>
        <label>說明<input v-model="draft.description" maxlength="500" placeholder="用途或備註（選填）" /></label>
        <label>Client ID *<input v-model="draft.clientId" maxlength="36" autocomplete="off" spellcheck="false" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /><small v-if="draft.clientId && !looksRight.clientId" class="payment-field-warning">應為 UUID 格式（8-4-4-4-12）</small></label>
        <label>Client Secret *<input v-model="draft.clientSecret" type="password" maxlength="512" autocomplete="new-password" spellcheck="false" :placeholder="draft.clientSecretConfigured ? '已加密保存；留空表示保留現有密鑰' : 'PayMe 提供的 Client Secret'" /></label>
        <label>Signing Key ID *<input v-model="draft.signingKeyId" maxlength="36" autocomplete="off" spellcheck="false" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /><small v-if="draft.signingKeyId && !looksRight.signingKeyId" class="payment-field-warning">應為 UUID 格式（8-4-4-4-12）</small></label>
        <label>Signing Key *<input v-model="draft.signingKey" type="password" maxlength="512" autocomplete="new-password" spellcheck="false" :placeholder="draft.signingKeyConfigured ? '已加密保存；留空表示保留現有金鑰' : 'PayMe 提供的 Base64 簽名金鑰'" /><small v-if="draft.signingKey && !looksRight.signingKey" class="payment-field-warning">應為 Base64 字元</small></label>
        <div class="wide payment-provider-hint"><strong>資料來源與安全</strong><span>四項憑證由 PayMe for Business 在開通 API 時提供；正式環境憑證需先在 Sandbox 完成整合並通過 PayMe 審核後才會發放。Client Secret 與 Signing Key 由後端加密保存，保存後不會回傳明文；重新輸入即可輪替。目前只保存配置並測試連線，建立付款請求、退款及通知接收待收款流程接入。</span></div>
      </fieldset>
      <div class="payment-test payment-stripe-result" aria-live="polite">
        <div><span>保存狀態</span><b :class="isSaved && !dirty ? 'success' : isSaved ? 'warning' : 'idle'">{{busy === 'saving' ? '保存中…' : !isSaved ? '尚未保存' : dirty ? '有未保存的修改' : '已保存'}}</b></div>
        <div><span>PayMe 連線</span><b :class="config.connection === 'success' ? 'success' : config.connection === 'warning' || config.connection === 'error' ? 'warning' : 'idle'">{{busy === 'testing' ? '測試中…' : config.connection === 'success' ? '連線正常' : config.connection === 'warning' ? '已連線，需留意' : config.connection === 'error' ? '測試未通過' : '尚未測試'}}</b></div>
        <template v-if="config.account">
          <div><span>Client ID／Client Secret</span><b :class="config.account.tokenIssued ? 'success' : 'warning'">{{config.account.tokenIssued ? '已取得存取權杖' : '未通過'}}</b></div>
          <div><span>Signing Key ID／Signing Key</span><b :class="config.account.signatureAccepted ? 'success' : 'warning'">{{config.account.signatureAccepted ? '簽名已被接受' : '未能確認'}}</b></div>
        </template>
        <p v-if="error" class="payment-editor-feedback" role="alert">{{error}}</p>
        <p v-else-if="config.lastTestMessage" :class="config.connection === 'success' ? 'payment-test-note' : 'payment-editor-feedback'">{{config.lastTestMessage}}</p>
        <p class="payment-test-note">連線測試會以已保存的憑證向 PayMe 取得存取權杖，再以簽名請求讀取交易列表；不會建立付款請求，也不會自動啟用財務渠道或開始收款。</p>
      </div>
    </div></div>
    <footer class="payment-editor-footer"><button class="payment-button" type="button" @click="$emit('close')">取消</button><div><button class="payment-button" type="button" :disabled="!canRetest" @click="$emit('test')">{{busy === 'testing' && isSaved && !dirty ? '測試中…' : '重新測試連線'}}</button><button class="payment-button primary" type="button" :disabled="!canSave" @click="$emit('save', draft)">{{busy === 'saving' ? '保存中…' : isSaved && !dirty ? '已保存' : '保存並測試連線'}}</button></div></footer>
  </section></div></div></Teleport>`
}
