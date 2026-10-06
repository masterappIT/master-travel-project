import { ref } from 'vue'

export const PaymentCnConfigModes = {
  name: 'PaymentCnConfigModes',
  setup() {
    const mode = ref('h5')
    return { mode }
  },
  template: String.raw`<div class="payment-cn-mode-config"><nav class="payment-cn-mode-tabs" aria-label="內地支付寶接入模式"><button v-for="item in [{key:'h5',label:'H5'},{key:'app',label:'App'},{key:'page',label:'電腦網站'},{key:'isv',label:'服務商'}]" :key="item.key" type="button" :class="{active: mode === item.key}" @click="mode = item.key">{{item.label}}</button></nav><form class="payment-cn-mode-form" @submit.prevent><template v-if="mode === 'h5'"><label>支付產品<input value="手機網站支付（H5）" disabled /></label><label>接口名稱<input value="alipay.trade.wap.pay" disabled /></label><label class="wide">Product Code<input value="QUICK_WAP_WAY" disabled /></label><label class="wide">回跳地址（Return URL）<input placeholder="尚未接入" disabled /></label></template><template v-else-if="mode === 'app'"><label>支付產品<input value="App 支付" disabled /></label><label>接口名稱<input value="alipay.trade.app.pay" disabled /></label><label class="wide">Product Code<input value="QUICK_MSECURITY_PAY" disabled /></label><label class="wide">異步通知地址（Notify URL）<input placeholder="尚未接入" disabled /></label></template><template v-else-if="mode === 'page'"><label>支付產品<input value="電腦網站支付" disabled /></label><label>接口名稱<input value="alipay.trade.page.pay" disabled /></label><label class="wide">Product Code<input value="FAST_INSTANT_TRADE_PAY" disabled /></label><label class="wide">回跳地址（Return URL）<input placeholder="尚未接入" disabled /></label></template><template v-else><label>支付產品<input value="服務商模式" disabled /></label><label>服務商身份<input placeholder="待官方產品契約確認" disabled /></label><label>授權憑證<input placeholder="待官方產品契約確認" disabled /></label><label>被服務商商戶號<input placeholder="待官方產品契約確認" disabled /></label></template><div class="wide payment-cn-mode-form-note">人民幣結算 · 純 UI 預覽 · 尚未接入保存或連線測試</div></form></div>`
}

export const PaymentScopeTabs = {
  name: 'PaymentScopeTabs',
  props: { scope: { type: String, required: true } },
  emits: ['update:scope'],
  template: String.raw`<nav class="payment-scope-tabs" aria-label="支付技術配置分類">
    <button type="button" :class="{active: scope === 'passenger'}" @click="$emit('update:scope', 'passenger')">收款渠道配置</button>
    <button type="button" :class="{active: scope === 'driver-settlement'}" @click="$emit('update:scope', 'driver-settlement')">出款服務配置</button>
    <button type="button" :class="{active: scope === 'all'}" @click="$emit('update:scope', 'all')">全部配置</button>
  </nav>`
}

export const PaymentCurrencyTabs = {
  name: 'PaymentCurrencyTabs',
  props: { currency: { type: String, required: true }, counts: { type: Object, required: true } },
  emits: ['update:currency'],
  template: String.raw`<nav class="payment-currency-groups" aria-label="結算貨幣分類">
    <button type="button" :class="{active: currency === 'HKD'}" @click="$emit('update:currency', 'HKD')"><span>港幣</span><b>HKD</b><small>{{counts.HKD || 0}} 項配置</small></button>
    <button type="button" :class="{active: currency === 'RMB'}" @click="$emit('update:currency', 'RMB')"><span>人民幣</span><b>RMB</b><small>{{counts.RMB || 0}} 項配置</small></button>
    <button type="button" :class="{active: currency === 'all'}" @click="$emit('update:currency', 'all')"><span>全部貨幣</span><b>HKD / RMB</b><small>{{counts.all || 0}} 項配置</small></button>
  </nav>`
}

export const PaymentConfigCard = {
  name: 'PaymentConfigCard',
  props: { config: { type: Object, required: true }, canWrite: { type: Boolean, default: true } },
  emits: ['edit', 'duplicate', 'toggle'],
  template: String.raw`<article class="payment-card"><header><div><span class="payment-label">{{config.provider}}</span><h2>{{config.name || '未命名配置'}}</h2></div><span class="payment-status" :class="config.connection === 'success' ? 'enabled' : 'draft'">{{config.connection === 'success' ? '連線正常' : '待測試'}}</span></header><div class="payment-card-meta"><span>{{config.region}}</span><b>{{(config.paymentCurrencies || [config.currency]).join('／')}}</b><span>結算 {{config.settlementCurrency || 'HKD'}}</span><span>{{config.environment === 'production' ? 'Production' : 'Sandbox'}}</span></div><div class="payment-capabilities"><span>技術配置</span><span v-if="config.api.baseUrl">API 已填寫</span><span v-if="config.merchant.merchantId">商戶資料已填寫</span><span v-if="config.callbacks.paymentUrl">回調已設定</span></div><div class="payment-connection" :class="{success: config.connection === 'success'}"><span></span>{{config.connection === 'success' ? '連線測試成功' : '尚未測試'}}</div><footer><button type="button" :disabled="!canWrite" @click="$emit('edit', config)">編輯技術配置</button><button type="button" :disabled="!canWrite" @click="$emit('duplicate', config)">複製配置</button></footer></article>`
}
