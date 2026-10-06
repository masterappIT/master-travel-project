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

export const PaymentConfigCard = {
  name: 'PaymentConfigCard',
  props: { config: { type: Object, required: true }, canWrite: { type: Boolean, default: true } },
  emits: ['edit', 'duplicate', 'toggle'],
  template: String.raw`<article class="payment-card"><header><div><span class="payment-label">{{config.provider}}</span><h2>{{config.name || '未命名配置'}}</h2></div><span class="payment-status" :class="config.connection === 'success' ? 'enabled' : 'draft'">{{config.connection === 'success' ? '連線正常' : '待測試'}}</span></header><div class="payment-card-meta"><span>{{config.region}}</span><b>{{(config.paymentCurrencies || [config.currency]).join('／')}}</b><span>結算 {{config.settlementCurrency || 'HKD'}}</span><span>{{config.environment === 'production' ? 'Production' : 'Sandbox'}}</span></div><div class="payment-capabilities"><span>技術配置</span><span v-if="config.api.baseUrl">API 已填寫</span><span v-if="config.merchant.merchantId">商戶資料已填寫</span><span v-if="config.callbacks.paymentUrl">回調已設定</span></div><div class="payment-connection" :class="{success: config.connection === 'success'}"><span></span>{{config.connection === 'success' ? '連線測試成功' : '尚未測試'}}</div><footer><button type="button" :disabled="!canWrite" @click="$emit('edit', config)">編輯技術配置</button><button type="button" :disabled="!canWrite" @click="$emit('duplicate', config)">複製配置</button></footer></article>`
}
