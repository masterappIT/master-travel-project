import { inject } from 'vue'
import { FinanceGlobalPricingPanel } from './finance-global-pricing.component.js'
import { FinancePaymentSheetPanel } from './finance-payment-sheet.component.js'
import { FinanceOverviewPanel, FinancePaymentsTable, FinanceOperationLog } from './finance-records.component.js'

export const FinancePage = {
  name: 'FinancePage',
  components: { FinanceGlobalPricingPanel, FinancePaymentSheetPanel, FinanceOverviewPanel, FinancePaymentsTable, FinanceOperationLog },
  setup() {
    const context = inject('adminFinanceContext')
    // On narrow screens the tab bar scrolls sideways, so keep the chosen tab in view.
    const selectTab = (id, event) => {
      context.activeTab.value = id
      event?.currentTarget?.scrollIntoView({ block: 'nearest', inline: 'center' })
    }
    return { ...context, selectTab }
  },
  template: String.raw`<section v-if="view==='finance'" class="finance-center">
  <header class="finance-hero">
    <div>
      <span class="finance-kicker">FINANCE CENTER</span>
      <h1>財務管理中心</h1>
      <p>管理乘客付款方式與收款渠道的運營，查看付款記錄、匯率及司機待結算金額。</p>
    </div>
  </header>

  <div class="finance-notice"><strong>目前範圍</strong><span>付款面板、渠道運營、幣種與匯率可以操作；總覽與付款記錄為真實資料。外部渠道的實際扣款、退款與對帳尚未接入。</span></div>

  <nav class="finance-nav" role="tablist" aria-label="財務管理中心分類">
    <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :class="{active: activeTab === tab.id}" @click="selectTab(tab.id, $event)">{{tab.label}}</button>
  </nav>

  <FinanceOverviewPanel v-if="activeTab === 'overview'" :api="api" :display-error="displayError" @open-tab="activeTab = $event" @open-settlements="navigate('settlements')" />
  <div v-else-if="activeTab === 'currency'" class="finance-content"><FinanceGlobalPricingPanel :settings="settings" :currency-draft="currencyDraft" :rates="rates" :quote-preview="quotePreview" :editor-open="rateEditorOpen" :currency-editor-open="currencyEditorOpen" :rate-form="rateForm" @open-editor="openRateEditor" @open-currency-editor="openCurrencyEditor" @close-editor="closeRateEditor" @close-currency-editor="closeCurrencyEditor" @update-currency-draft="updateCurrencyDraft" @update:quote-currency="settings.quoteCurrency = $event" @update:base-currency="settings.baseCurrency = $event" @update-setting="settings[$event.key] = $event.value" @update-quote-preview="quotePreview[$event.key] = $event.value" @update-rate-form-field="rateForm[$event.key] = $event.value" @preview-quote="previewQuote(api)" @save-settings="saveFinanceRateSettings" @save-currency-settings="saveFinanceCurrencySettings" /></div>
  <section v-else-if="activeTab === 'passenger'" class="finance-content"><FinancePaymentSheetPanel :api="api" :can-manage="canManageChannels" :request-confirmation="requestConfirmation" :notify="notify" :display-error="displayError" /><FinancePaymentsTable :api="api" :display-error="displayError" /></section>
  <section v-else-if="activeTab === 'driver'" class="finance-content"><section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">司機資金</span><h2>結算與出款</h2></div><button class="finance-button primary" type="button" @click="navigate('settlements')">前往結算管理</button></div><div class="finance-list"><article><div><b>司機結算</b><small>逐筆行程的結算與取消結算在「結算管理」頁操作；待結算金額見本頁「總覽」。</small></div><span class="finance-pill success">結算管理</span></article><article><div><b>出款服務</b><small>尚未接入任何出款服務，支付設定目前沒有可配置的出款渠道；平台付款給司機仍在系統外進行。</small></div><span class="finance-pill idle">未接入</span></article></div></section></section>
  <FinanceOperationLog v-else :api="api" :display-error="displayError" :can-view="canManageChannels" />
</section>`
}
