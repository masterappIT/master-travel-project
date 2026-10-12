import { inject } from 'vue'
import { PaymentProviderCard, PaymentCurrencyTabs, PaymentScopeTabs } from './payments.components.js'
import { PaymentConfigEditor } from './payment-config-editor.component.js'
import { StripeConfigEditor } from './stripe-config-editor.component.js'
import { WechatPayHkConfigEditor } from './wechat-pay-hk-config-editor.component.js'
import { PaymeConfigEditor } from './payme-config-editor.component.js'
import { AlipayCnConfigEditor } from './alipay-cn-config-editor.component.js'

const twoEnvironments = [{ key: 'sandbox', label: 'Sandbox' }, { key: 'production', label: 'Production' }]

// Catalogue of channels with a working technical configuration; `key` matches the `provider` of saved configs.
const HKD_PROVIDERS = [
  { key: 'AlipayHK', name: 'AlipayHK', subtitle: '香港 · HKD 結算', logo: '/payment-providers/alipayhk-logo.png', description: '香港官方直連，乘客可用 HKD 或 RMB 付款。', tags: ['WAP 手機支付', 'HKD／RMB 收款', 'RSA2 簽名'], environments: twoEnvironments, formatCheckOnly: true },
  { key: 'Stripe', name: 'Stripe', subtitle: '香港帳戶 · HKD 結算', wordmark: 'stripe', description: '輸入金鑰即可連線，一個帳戶提供多種付款方式。', tags: ['信用卡', 'Apple Pay', 'Google Pay', '支付寶', '微信支付'], environments: [{ key: 'sandbox', label: '測試模式' }, { key: 'production', label: '正式模式' }] },
  { key: 'WeChat Pay HK', name: 'WeChat Pay HK', subtitle: '香港 · HKD 結算', logo: '/payment-providers/wechatpay-hk-logo.svg', logoClass: 'payment-provider-directory-logo-wechat', description: '微信支付香港直連，以商戶證書簽名。', tags: ['APIv3', '普通商戶', '機構／服務商模式'], environments: [{ key: 'production', label: '正式環境' }] },
  { key: 'PayMe', name: 'PayMe', subtitle: 'PayMe for Business · HKD 結算', logo: '/payment-providers/payme-logo.png', description: '乘客以 PayCode 掃碼或跳轉 PayMe App 付款。', tags: ['PayCode 掃碼', 'App 跳轉', 'OAuth＋簽名金鑰'], environments: twoEnvironments }
]
const RMB_PROVIDERS = [
  { key: '內地支付寶', name: '內地支付寶', subtitle: '中國內地 · RMB 結算', logo: '/payment-providers/alipay-cn-logo.svg', description: '支付寶開放平台直連，支援自研商戶與服務商模式。', tags: ['手機網站（H5）', 'App 支付', '電腦網站', 'RSA2 公鑰模式'], environments: twoEnvironments },
  { key: '內地微信支付', name: '內地微信支付', subtitle: '中國內地 · RMB 結算', logo: '/payment-providers/wechatpay-cn-logo.svg', description: '微信支付商戶平台直連，以商戶證書簽名。', tags: ['APIv3', '普通商戶', '服務商模式'], environments: [{ key: 'production', label: '正式環境' }] }
]

export const PaymentsPage = {
  name: 'PaymentsPage',
  components: { PaymentProviderCard, PaymentConfigEditor, StripeConfigEditor, WechatPayHkConfigEditor, PaymeConfigEditor, AlipayCnConfigEditor, PaymentCurrencyTabs, PaymentScopeTabs },
  setup() {
    const context = inject('adminPaymentsContext')
    // AlipayHK is the editor's default provider, so it is opened without a provider name.
    const openProvider = (provider, environment, config) => context.openPaymentEditor(config, environment, provider.key === 'AlipayHK' ? undefined : provider.key)
    return { ...context, hkdProviders: HKD_PROVIDERS, rmbProviders: RMB_PROVIDERS, openProvider }
  },
  template: String.raw`<section v-if="view==='payments'" class="payment-settings-admin">
  <header class="payment-hero"><div class="payment-hero-content"><span class="payment-kicker">PAYMENT CONFIGURATION</span><h1>支付設定</h1><p>查看可配置的支付方式，選擇環境後完成技術接入；正式採用由財務管理中心控制。</p></div><div class="payment-hero-actions"><span class="payment-hero-state"><i></i>技術配置模式</span></div></header>
  <div class="payment-notice"><div class="payment-notice-icon">✓</div><div><strong>技術配置中心</strong><span>此頁只保存支付渠道技術資料與配置檢查結果。正式啟用、收款、退款、出款、結算及對帳由財務管理中心控制。</span></div></div>
  <PaymentScopeTabs :scope="paymentConfigFilter.scope" @update:scope="paymentConfigFilter.scope = $event" />
  <PaymentCurrencyTabs :currency="paymentConfigFilter.currency" :counts="{ HKD: currencyConfigCount('HKD'), RMB: currencyConfigCount('RMB'), all: currencyConfigCount('all') }" @update:currency="paymentConfigFilter.currency = $event" />
  <section v-if="paymentConfigFilter.scope !== 'driver-settlement' && (paymentConfigFilter.currency === 'all' || paymentConfigFilter.currency === 'HKD')" class="payment-settlement-section" aria-labelledby="payment-hkd-title"><div class="payment-section-heading"><div><span class="payment-label">結算貨幣</span><h2 id="payment-hkd-title">港幣結算</h2></div></div><div class="payment-provider-directory-grid"><PaymentProviderCard v-for="provider in hkdProviders" :key="provider.key" :provider="provider" :configs="paymentConfigs.filter(config => config.provider === provider.key)" @open="(environment, config) => openProvider(provider, environment, config)" /></div></section>
      <section v-if="paymentConfigFilter.scope !== 'driver-settlement' && (paymentConfigFilter.currency === 'all' || paymentConfigFilter.currency === 'RMB')" class="payment-settlement-section" aria-labelledby="payment-rmb-title"><div class="payment-section-heading"><div><span class="payment-label">結算貨幣</span><h2 id="payment-rmb-title">人民幣結算</h2></div></div><div class="payment-provider-directory-grid"><PaymentProviderCard v-for="provider in rmbProviders" :key="provider.key" :provider="provider" :configs="paymentConfigs.filter(config => config.provider === provider.key)" @open="(environment, config) => openProvider(provider, environment, config)" /></div></section>
      <section v-if="paymentConfigFilter.scope === 'driver-settlement'" class="payment-boundary-note"><strong>出款服務技術配置</strong><span>目前尚未接入任何出款服務，因此沒有可配置項目。此處日後只配置出款服務與技術連線；司機應付金額、結算結果、出款操作及對帳由財務管理中心負責。</span></section>
  <div v-if="paymentSettingsSaved" class="payment-saved">✓ 技術配置已保存</div>
  <StripeConfigEditor v-if="paymentEditorOpen && selectedPaymentConfig.provider === 'Stripe'" :config="selectedPaymentConfig" :can-write="canWrite" :busy="paymentEditorBusy" :error="paymentEditorError" :api-base="paymentApiBase" @close="closePaymentEditor" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
  <WechatPayHkConfigEditor v-else-if="paymentEditorOpen && ['WeChat Pay HK', '內地微信支付'].includes(selectedPaymentConfig.provider)" :config="selectedPaymentConfig" :can-write="canWrite" :busy="paymentEditorBusy" :error="paymentEditorError" @close="closePaymentEditor" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
  <PaymeConfigEditor v-else-if="paymentEditorOpen && selectedPaymentConfig.provider === 'PayMe'" :config="selectedPaymentConfig" :can-write="canWrite" :busy="paymentEditorBusy" :error="paymentEditorError" @close="closePaymentEditor" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
  <AlipayCnConfigEditor v-else-if="paymentEditorOpen && selectedPaymentConfig.provider === '內地支付寶'" :config="selectedPaymentConfig" :can-write="canWrite" :busy="paymentEditorBusy" :error="paymentEditorError" @close="closePaymentEditor" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
  <PaymentConfigEditor v-else-if="paymentEditorOpen" :config="selectedPaymentConfig" :step="paymentEditorStep" :can-write="canWrite" :test-result="paymentTestResult" :busy="paymentEditorBusy" :error="paymentEditorError" @close="closePaymentEditor" @update:step="paymentEditorStep = $event" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
</section>`
}
