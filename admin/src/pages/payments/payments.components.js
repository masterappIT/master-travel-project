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

// AlipayHK's check only validates key format, so its success label must not claim a live connection.
const providerEnvironmentState = (provider, config) => {
  if (!config) return { tone: 'idle', label: '未配置' }
  if (config.connection === 'success') return { tone: 'success', label: provider.formatCheckOnly ? '格式檢查通過' : '連線正常' }
  if (config.connection === 'error') return { tone: 'warning', label: '測試未通過' }
  if (config.connection === 'warning') return { tone: 'warning', label: '已連線，需留意' }
  return { tone: 'warning', label: provider.formatCheckOnly ? '已保存，待檢查' : '已保存，待測試' }
}

export const PaymentProviderCard = {
  name: 'PaymentProviderCard',
  props: { provider: { type: Object, required: true }, configs: { type: Array, default: () => [] } },
  emits: ['open'],
  computed: {
    environments() {
      return this.provider.environments.map(environment => {
        const config = this.configs.find(item => item.environment === environment.key)
        return { ...environment, config, state: providerEnvironmentState(this.provider, config) }
      })
    }
  },
  template: String.raw`<article class="payment-provider-directory-card"><header><div class="payment-provider-identity"><div class="payment-provider-directory-logo" :class="provider.logoClass"><img v-if="provider.logo" :src="provider.logo" alt="" /><span v-else class="payment-provider-wordmark" aria-hidden="true">{{provider.wordmark}}</span></div><div class="payment-provider-title"><h3>{{provider.name}}</h3><small>{{provider.subtitle}}</small></div></div><span class="payment-status enabled">可配置</span></header><p>{{provider.description}}</p><div class="payment-capabilities"><span v-for="tag in provider.tags" :key="tag">{{tag}}</span></div><div class="payment-provider-environments"><button v-for="environment in environments" :key="environment.key" type="button" @click="$emit('open', environment.key, environment.config)"><span class="payment-provider-environment-name"><i :class="environment.state.tone" aria-hidden="true"></i>{{environment.label}}</span><span class="payment-provider-environment-state">{{environment.state.label}}</span><b>{{environment.config ? '查看／編輯' : '配置'}}</b></button></div></article>`
}

export const PaymentConfigCard = {
  name: 'PaymentConfigCard',
  props: { config: { type: Object, required: true }, canWrite: { type: Boolean, default: true }, canDuplicate: { type: Boolean, default: false } },
  emits: ['edit', 'duplicate'],
  template: String.raw`<article class="payment-card"><header><div><span class="payment-label">{{config.provider}}</span><h2>{{config.name || '未命名配置'}}</h2></div><span class="payment-status" :class="config.connection === 'success' ? 'enabled' : 'draft'">{{config.provider !== 'AlipayHK' ? (config.connection === 'success' ? '連線正常' : config.connection === 'warning' ? '已連線，需留意' : config.connection === 'error' ? '測試未通過' : '待測試') : (config.connection === 'success' ? '格式檢查通過' : '待檢查')}}</span></header><div class="payment-card-meta"><span>{{config.region}}</span><b>{{(config.paymentCurrencies || [config.currency]).join('／')}}</b><span>結算 {{config.settlementCurrency || 'HKD'}}</span><span>{{config.provider === 'WeChat Pay HK' ? '正式環境' : config.provider === 'Stripe' ? (config.environment === 'production' ? '正式模式' : '測試模式') : (config.environment === 'production' ? 'Production' : 'Sandbox')}}</span></div><div v-if="config.provider === 'Stripe'" class="payment-capabilities"><span>技術配置</span><span v-if="config.secretKeyConfigured">金鑰已保存</span><span>{{config.paymentMethods.length}} 種付款方式</span><span v-if="config.account">{{config.account.name || config.account.id}}</span></div><div v-else-if="config.provider === 'WeChat Pay HK'" class="payment-capabilities"><span>技術配置</span><span>{{config.merchantMode === 'institution' ? '機構／服務商模式' : '普通商戶'}}</span><span v-if="config.privateKeyConfigured && config.apiV3KeyConfigured">金鑰已保存</span><span v-if="config.merchantId">商戶號 {{config.merchantId}}</span></div><div v-else-if="config.provider === 'PayMe'" class="payment-capabilities"><span>技術配置</span><span v-if="config.clientSecretConfigured && config.signingKeyConfigured">金鑰已保存</span><span v-if="config.account && config.account.signatureAccepted">簽名已驗證</span></div><div v-else-if="config.provider === '內地支付寶'" class="payment-capabilities"><span>技術配置</span><span>{{config.merchantMode === 'isv' ? '服務商模式' : '自研商戶'}}</span><span v-if="config.privateKeyConfigured && config.alipayPublicKeyConfigured">金鑰已保存</span><span>{{config.products.length}} 種支付產品</span></div><div v-else class="payment-capabilities"><span>技術配置</span><span v-if="config.api.baseUrl">API 已填寫</span><span v-if="config.merchant.merchantId">商戶資料已填寫</span><span v-if="config.callbacks.paymentUrl">回調已設定</span></div><div class="payment-connection" :class="{success: config.connection === 'success'}"><span></span>{{config.provider !== 'AlipayHK' ? (config.lastTestMessage || '尚未測試 ' + config.provider + ' 連線') : (config.connection === 'success' ? '金鑰格式檢查通過，尚未呼叫 AlipayHK' : '尚未執行金鑰格式檢查')}}</div><footer><button type="button" :disabled="!canWrite" @click="$emit('edit', config)">編輯技術配置</button><button v-if="canDuplicate" type="button" :disabled="!canWrite" @click="$emit('duplicate', config)">複製到 {{config.environment === 'production' ? 'Sandbox' : 'Production'}}</button></footer></article>`
}
