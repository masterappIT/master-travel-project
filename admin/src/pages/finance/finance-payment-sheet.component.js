import { ref, computed, onMounted } from 'vue'

const PROVIDER_LABELS = { ALIPAY_HK: 'AlipayHK', STRIPE: 'Stripe', WECHATPAY_HK: 'WeChat Pay HK', PAYME: 'PayMe', ALIPAY_CN: '內地支付寶', WECHATPAY_CN: '內地微信支付' }
const ENVIRONMENT_LABELS = { sandbox: 'Sandbox', production: 'Production' }
const ICON_LABELS = { 'wallet-fare': '車費錢包', 'wallet-cash': '現金', wechat: '微信', alipay: '支付寶', bank: '銀行卡' }
const KIND_LABELS = { FARE_BALANCE: '車費餘額', CASH_BALANCE: '現金餘額', EXTERNAL: '外部付款' }
// Presentation only: the backend decides every state shown here.
const TECHNICAL_TEXT = {
  OK: '支付設定：已接通',
  NOT_TESTED: '支付設定：尚未通過連線測試',
  TEST_FAILED: '支付設定：連線測試未通過',
  NO_LIVE_TEST: '支付設定：此渠道尚無真實連線測試，暫不能採用'
}
const OPERATING = {
  NOT_ADOPTED: { label: '未採用', tone: 'idle' },
  ACTIVE: { label: '運營中', tone: 'success' },
  DISABLED: { label: '已停用', tone: 'idle' },
  TECH_UNAVAILABLE: { label: '技術不可用', tone: 'warning' },
  NEEDS_CONFIRMATION: { label: '待財務確認', tone: 'warning' }
}
const ERROR_TEXT = {
  'Finance channel status is invalid': '操作無效，請重新整理後再試。',
  'Finance channel is not technically connected': '此渠道目前未接通，請先在支付設定完成連線測試。',
  'Finance channel is not adopted': '此渠道尚未採用。',
  'Finance channel is not found': '找不到此渠道，請重新整理。',
  'Payment sheet scenario is invalid': '付款場景無效，請重新整理後再試。',
  'Payment sheet must have between 1 and 8 items': '付款方式需為 1 至 8 項。',
  'Payment sheet item kind is invalid': '付款方式類型無效。',
  'Payment sheet item label is invalid': '顯示名稱不可空白，且不可超過 24 字。',
  'Payment sheet item icon is invalid': '圖示無效，請重新選擇。',
  'Payment sheet item provider is invalid': '所選渠道無效，請重新選擇。',
  'Payment sheet can list each wallet only once': '車費餘額與現金餘額各只能出現一次。'
}
const SCENARIO = 'TRIP_PAYMENT'
const editable = item => ({ kind: item.kind, label: item.label, icon: item.icon, enabled: item.enabled, provider: item.provider || '' })

export const FinancePaymentSheetPanel = {
  name: 'FinancePaymentSheetPanel',
  props: {
    api: { type: Function, required: true },
    canManage: { type: Boolean, default: false },
    requestConfirmation: { type: Function, required: true },
    notify: { type: Function, required: true },
    displayError: { type: Function, required: true }
  },
  setup(props) {
    const channels = ref([])
    const sandboxMode = ref(false)
    const saved = ref([])
    const draft = ref([])
    const customised = ref(false)
    const icons = ref([])
    const providers = ref([])
    const limits = ref({ items: 8, labelLength: 24 })
    const loading = ref(true)
    const loadError = ref('')
    const saving = ref(false)
    const busyId = ref('')
    const previewShortfall = ref(true)
    const errorText = err => { const text = props.displayError(err); return ERROR_TEXT[text] || ERROR_TEXT[err?.message] || text }

    const load = async () => {
      loading.value = true
      loadError.value = ''
      try {
        const [sheet, channelList] = await Promise.all([props.api(`/admin/finance/payment-sheet?scenario=${SCENARIO}`), props.api('/admin/finance/channels')])
        saved.value = sheet.data.map(editable)
        draft.value = sheet.data.map(editable)
        customised.value = sheet.customised
        icons.value = sheet.icons
        providers.value = sheet.providers
        limits.value = sheet.limits
        channels.value = channelList.data
        sandboxMode.value = channelList.sandboxMode
      } catch (err) { loadError.value = errorText(err) } finally { loading.value = false }
    }
    onMounted(load)
    // Refreshing the channel list must not throw away unsaved edits to the sheet.
    const reloadChannels = async () => {
      try {
        const channelList = await props.api('/admin/finance/channels')
        channels.value = channelList.data
        sandboxMode.value = channelList.sandboxMode
      } catch (err) { props.notify(errorText(err), 'error') }
    }

    const environmentInUse = computed(() => sandboxMode.value ? 'sandbox' : 'production')
    const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value))
    // The channel a provider would use right now, i.e. its config in the environment in use.
    const channelInUse = provider => channels.value.find(item => item.provider === provider && item.environment === environmentInUse.value)
    const providerState = provider => { const channel = channelInUse(provider); return channel ? OPERATING[channel.operatingState].label : '未配置' }
    const providerOptions = computed(() => providers.value.map(key => ({ key, label: `${PROVIDER_LABELS[key] || key}（${providerState(key)}）` })))
    // Mirrors the backend rule for what passengers are shown; the backend remains the source of truth.
    const visibleToPassengers = item => item.enabled && (item.kind !== 'EXTERNAL' || Boolean(item.provider && channelInUse(item.provider)?.offered))
    const hiddenReason = item => {
      if (!item.enabled) return '未開放'
      if (item.kind !== 'EXTERNAL') return ''
      if (!item.provider) return '未分配渠道，乘客端不顯示'
      const channel = channelInUse(item.provider)
      if (!channel) return `${ENVIRONMENT_LABELS[environmentInUse.value]} 環境未配置此渠道，乘客端不顯示`
      return channel.offered ? '' : `渠道${OPERATING[channel.operatingState].label}，乘客端不顯示`
    }
    const previewRows = computed(() => draft.value.filter(item => visibleToPassengers(item) && (item.kind !== 'EXTERNAL' || previewShortfall.value)))
    const hasKind = kind => draft.value.some(item => item.kind === kind)
    const canAdd = computed(() => draft.value.length < limits.value.items)
    const addItem = kind => {
      if (!canAdd.value) return
      const presets = { FARE_BALANCE: { label: '車費餘額', icon: 'wallet-fare' }, CASH_BALANCE: { label: '現金餘額', icon: 'wallet-cash' }, EXTERNAL: { label: '新付款方式', icon: 'bank' } }
      draft.value = [...draft.value, { kind, ...presets[kind], enabled: true, provider: '' }]
    }
    const removeItem = index => { draft.value = draft.value.filter((_, position) => position !== index) }
    const moveItem = (index, offset) => {
      const target = index + offset
      if (target < 0 || target >= draft.value.length) return
      const next = [...draft.value]
      ;[next[index], next[target]] = [next[target], next[index]]
      draft.value = next
    }
    const reset = () => { draft.value = saved.value.map(item => ({ ...item })) }
    const save = async () => {
      saving.value = true
      try {
        const response = await props.api('/admin/finance/payment-sheet', { method: 'POST', body: JSON.stringify({ scenario: SCENARIO, items: draft.value.map(item => ({ ...item, provider: item.provider || null })) }) })
        saved.value = response.data.map(editable)
        draft.value = response.data.map(editable)
        customised.value = true
        props.notify('付款面板已保存')
      } catch (err) { props.notify(errorText(err), 'error') } finally { saving.value = false }
    }

    const displayName = channel => channel.name || PROVIDER_LABELS[channel.provider] || channel.provider
    const channelTitle = channel => `「${displayName(channel)}」（環境：${ENVIRONMENT_LABELS[channel.environment] || channel.environment}）`
    const submitChannel = async (channel, status, successMessage) => {
      busyId.value = channel.id
      try {
        const response = await props.api(`/admin/finance/channels/${channel.id}`, { method: 'POST', body: JSON.stringify({ status }) })
        channels.value = channels.value.map(item => item.id === channel.id ? response.data : item)
        props.notify(successMessage)
      } catch (err) { props.notify(errorText(err), 'error') } finally { busyId.value = '' }
    }
    const activate = async channel => {
      const resuming = channel.operatingState === 'NEEDS_CONFIRMATION'
      const confirmed = await props.requestConfirmation({ title: resuming ? '確認恢復收款' : '採用渠道', message: `${channelTitle(channel)}${resuming ? '將恢復運營。' : '將進入運營。'}採用後，付款面板中分配給此渠道且已開放的付款方式才會提供給乘客。`, confirmLabel: resuming ? '確認恢復' : '採用' })
      if (confirmed) await submitChannel(channel, 'ACTIVE', resuming ? '已確認恢復' : '渠道已採用')
    }
    const disable = async channel => {
      const confirmed = await props.requestConfirmation({ title: '停用渠道', message: `停用後，分配給${channelTitle(channel)}的付款方式將不再提供給乘客。支付設定中的配置與金鑰不受影響。`, confirmLabel: '停用', danger: true })
      if (confirmed) await submitChannel(channel, 'DISABLED', '渠道已停用')
    }
    const groups = computed(() => ['HKD', 'RMB'].map(currency => ({ currency, label: currency === 'HKD' ? '港幣結算' : '人民幣結算', channels: channels.value.filter(item => item.settlementCurrency === currency) })).filter(group => group.channels.length))
    const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-HK', { hour12: false }) }
    return { channels, sandboxMode, draft, customised, icons, limits, loading, loadError, saving, busyId, previewShortfall, dirty, providerOptions, previewRows, canAdd, groups, load, reloadChannels, hasKind, addItem, removeItem, moveItem, reset, save, hiddenReason, activate, disable, displayName, formatTime, providerLabels: PROVIDER_LABELS, environmentLabels: ENVIRONMENT_LABELS, iconLabels: ICON_LABELS, kindLabels: KIND_LABELS, technicalText: TECHNICAL_TEXT, operating: OPERATING }
  },
  template: String.raw`<div class="finance-sheet-panel">
    <div v-if="loadError" class="finance-channel-empty" role="alert">載入失敗：{{loadError}} <button class="finance-button" type="button" @click="load">重試</button></div>
    <div v-else-if="loading" class="finance-channel-empty">載入中…</div>
    <template v-else>
    <section class="finance-card finance-sheet">
      <div class="finance-card-heading"><div><span class="finance-label">付款面板設定 · 行程付款</span><h2>乘客付款方式</h2></div><div class="finance-toolbar-actions"><span class="finance-pill" :class="sandboxMode ? 'warning' : 'success'">{{sandboxMode ? '測試模式：使用 Sandbox 渠道' : '正式模式：使用 Production 渠道'}}</span><span v-if="!customised" class="finance-pill idle">目前為預設面板</span></div></div>
      <div class="finance-sheet-body">
        <div class="finance-sheet-editor">
          <p class="finance-channel-summary">設定乘客付款彈窗顯示哪些付款方式、順序與名稱，並為外部付款方式分配渠道。外部付款方式需已開放、已分配渠道且該渠道運營中，乘客才看得到。</p>
          <fieldset class="finance-sheet-items" :disabled="!canManage || saving">
            <article v-for="(item, index) in draft" :key="index" class="finance-sheet-item" :class="{off: !item.enabled}">
              <div class="finance-sheet-item-order"><button type="button" :disabled="index === 0" :aria-label="'上移 ' + item.label" @click="moveItem(index, -1)">↑</button><button type="button" :disabled="index === draft.length - 1" :aria-label="'下移 ' + item.label" @click="moveItem(index, 1)">↓</button></div>
              <img class="finance-sheet-item-icon" :src="'/payment-sheet/' + item.icon + '.svg'" alt="" />
              <div class="finance-sheet-item-fields">
                <div class="finance-sheet-item-row"><label>顯示名稱<input v-model="item.label" :maxlength="limits.labelLength" /></label><label>圖示<select v-model="item.icon"><option v-for="icon in icons" :key="icon" :value="icon">{{iconLabels[icon] || icon}}</option></select></label></div>
                <div class="finance-sheet-item-row"><span class="finance-sheet-item-kind">{{kindLabels[item.kind]}}</span><label v-if="item.kind === 'EXTERNAL'" class="wide">處理渠道<select v-model="item.provider"><option value="">未分配</option><option v-for="option in providerOptions" :key="option.key" :value="option.key">{{option.label}}</option></select></label></div>
                <small v-if="hiddenReason(item)" class="finance-sheet-item-hint">{{hiddenReason(item)}}</small>
              </div>
              <div class="finance-sheet-item-actions"><button type="button" class="finance-sheet-switch" role="switch" :aria-checked="item.enabled" :aria-label="item.label + ' 是否開放'" @click="item.enabled = !item.enabled"><span></span>{{item.enabled ? '開放' : '關閉'}}</button><button type="button" class="finance-sheet-remove" :aria-label="'移除 ' + item.label" @click="removeItem(index)">移除</button></div>
            </article>
          </fieldset>
          <div v-if="canManage" class="finance-sheet-footer"><div class="finance-sheet-add"><button class="finance-button" type="button" :disabled="!canAdd || saving" @click="addItem('EXTERNAL')">＋ 外部付款方式</button><button v-if="!hasKind('FARE_BALANCE')" class="finance-button" type="button" :disabled="!canAdd || saving" @click="addItem('FARE_BALANCE')">＋ 車費餘額</button><button v-if="!hasKind('CASH_BALANCE')" class="finance-button" type="button" :disabled="!canAdd || saving" @click="addItem('CASH_BALANCE')">＋ 現金餘額</button></div><div class="finance-sheet-save"><button class="finance-button" type="button" :disabled="!dirty || saving" @click="reset">還原</button><button class="finance-button primary" type="button" :disabled="!dirty || saving || !draft.length" @click="save">{{saving ? '保存中…' : dirty ? '保存付款面板' : '已保存'}}</button></div></div>
        </div>
        <div class="finance-sheet-preview" role="complementary" aria-label="乘客付款彈窗預覽">
          <div class="finance-sheet-preview-heading"><span class="finance-label">LIVE PREVIEW</span><label><input v-model="previewShortfall" type="checkbox" /> 模擬餘額不足</label></div>
          <div class="finance-sheet-phone"><div class="finance-sheet-canvas">
            <img class="pv-back" src="/payment-sheet/back.svg" alt="" /><img class="pv-close" src="/payment-sheet/close.svg" alt="" />
            <span class="pv-title">訂單詳細</span><span class="pv-countdown">交易時間剩餘：05:00</span><div class="pv-amount"><span>¥</span><b>800</b></div><span class="pv-method-label">支付方式</span>
            <div class="pv-list"><div v-for="(row, index) in previewRows" :key="index" class="pv-row"><img :src="'/payment-sheet/' + row.icon + '.svg'" alt="" /><div class="pv-copy"><span>{{row.label}}</span><span v-if="row.kind !== 'EXTERNAL'" class="pv-balance">（¥100.00）</span></div><img class="pv-radio" :src="'/payment-sheet/' + (row.kind === 'EXTERNAL' ? 'radio-unselected' : 'radio-selected') + '.svg'" alt="" /></div><div v-if="!previewRows.length" class="pv-empty">沒有可顯示的付款方式</div></div>
            <div class="pv-confirm">{{previewShortfall ? '保存待付款訂單' : '確認支付'}}</div>
          </div></div>
          <small class="finance-sheet-preview-note">預覽依未保存的修改即時更新；外部付款方式只在乘客餘額不足時出現。{{dirty ? '有未保存的修改。' : ''}}</small>
        </div>
      </div>
    </section>
    <section class="finance-card finance-channels">
      <div class="finance-card-heading"><div><span class="finance-label">收款渠道</span><h2>渠道運營</h2></div><div class="finance-toolbar-actions"><button class="finance-button" type="button" @click="reloadChannels">重新整理</button></div></div>
      <div v-if="!channels.length" class="finance-channel-empty">支付設定尚未保存任何渠道配置。請先到「支付設定」完成渠道接入。</div>
      <template v-else>
        <p class="finance-channel-summary">只有支付設定已接通的渠道可以採用；採用與停用不會修改支付設定的配置或金鑰。</p>
        <section v-for="group in groups" :key="group.currency" class="finance-channel-group">
          <h3>{{group.label}}</h3>
          <div class="finance-channel-list">
            <article v-for="channel in group.channels" :key="channel.id" class="finance-channel">
              <header><div><b>{{displayName(channel)}}</b><small>{{providerLabels[channel.provider] || channel.provider}} · {{environmentLabels[channel.environment] || channel.environment}} · 收款 {{channel.paymentCurrencies.join('／')}}</small></div><div class="finance-channel-states"><span class="finance-pill" :class="channel.technical.usable ? 'success' : 'warning'">{{channel.technical.usable ? '已接通' : '未接通'}}</span><span class="finance-pill" :class="operating[channel.operatingState].tone">{{operating[channel.operatingState].label}}</span><span v-if="channel.offered" class="finance-pill success">目前環境使用中</span></div></header>
              <p class="finance-channel-note">{{technicalText[channel.technical.reason]}}<template v-if="channel.operatingState === 'NEEDS_CONFIRMATION'">。此渠道在上次確認後曾失效或更換過配置，重新接通後需由財務確認才會恢復收款。</template><template v-else-if="channel.operatingState === 'TECH_UNAVAILABLE'">。採用設定已保留，接通後需由財務確認恢復。</template><template v-if="channel.finance">　上次確認：{{formatTime(channel.finance.confirmedAt)}}{{channel.finance.confirmedBy ? '（' + channel.finance.confirmedBy + '）' : ''}}</template></p>
              <footer v-if="canManage">
                <button v-if="channel.operatingState === 'NOT_ADOPTED' || channel.operatingState === 'DISABLED'" class="finance-button primary" type="button" :disabled="!channel.technical.usable || busyId === channel.id" @click="activate(channel)">{{channel.operatingState === 'DISABLED' ? '重新採用' : '採用'}}</button>
                <button v-if="channel.operatingState === 'NEEDS_CONFIRMATION'" class="finance-button primary" type="button" :disabled="busyId === channel.id" @click="activate(channel)">確認恢復收款</button>
                <button v-if="['ACTIVE', 'NEEDS_CONFIRMATION', 'TECH_UNAVAILABLE'].includes(channel.operatingState)" class="finance-button" type="button" :disabled="busyId === channel.id" @click="disable(channel)">停用</button>
              </footer>
            </article>
          </div>
        </section>
      </template>
    </section>
    </template>
  </div>`
}
