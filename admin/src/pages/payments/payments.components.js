export const PaymentScopeTabs = {
  name: 'PaymentScopeTabs',
  props: { scope: { type: String, required: true } },
  emits: ['update:scope'],
  template: String.raw`<nav class="payment-scope-tabs" aria-label="支付設定分類">
    <button type="button" :class="{active: scope === 'passenger'}" @click="$emit('update:scope', 'passenger')">乘客支付方式</button>
    <button type="button" :class="{active: scope === 'driver-settlement'}" @click="$emit('update:scope', 'driver-settlement')">司機結算支付渠道</button>
    <button type="button" :class="{active: scope === 'all'}" @click="$emit('update:scope', 'all')">全部配置</button>
  </nav>`
}

export const PaymentConfigCard = {
  name: 'PaymentConfigCard',
  props: { config: { type: Object, required: true }, canWrite: { type: Boolean, default: true } },
  emits: ['edit', 'duplicate', 'toggle'],
  template: String.raw`<article class="payment-card"><header><div><span class="payment-label">{{config.provider}}</span><h2>{{config.name || '未命名配置'}}</h2></div><span class="payment-status" :class="config.status">{{config.status === 'enabled' ? '已啟用' : config.status === 'disabled' ? '已停用' : '草稿'}}</span></header><div class="payment-card-meta"><span>{{config.region}}</span><b>{{config.currency}}</b><span>{{config.environment === 'production' ? 'Production' : 'Sandbox'}}</span></div><div class="payment-capabilities"><span v-if="config.capabilities.trip">行程付款</span><span v-if="config.capabilities.wallet">錢包充值</span><span v-if="config.capabilities.refund">退款</span><span v-if="config.capabilities.partialRefund">部分退款</span><span v-if="config.scope === 'driver-settlement'">司機結算</span></div><div class="payment-connection" :class="{success: config.connection === 'success'}"><span></span>{{config.connection === 'success' ? '連線測試成功' : '尚未測試'}}</div><footer><button type="button" :disabled="!canWrite" @click="$emit('edit', config)">編輯</button><button type="button" :disabled="!canWrite" @click="$emit('duplicate', config)">複製</button><button type="button" :disabled="!canWrite" @click="$emit('toggle', config)">{{config.status === 'enabled' ? '停用' : '啟用'}}</button></footer></article>`
}
