import { inject } from 'vue'
import { PaymentConfigCard, PaymentScopeTabs } from './payments.components.js'
import { PaymentConfigEditor } from './payment-config-editor.component.js'

export const PaymentsPage = {
  name: 'PaymentsPage',
  components: { PaymentConfigCard, PaymentConfigEditor, PaymentScopeTabs },
  setup() { return inject('adminPaymentsContext') },
  template: String.raw`<section v-if="view==='payments'" class="payment-settings-admin">
  <header class="payment-hero"><div class="payment-hero-content"><span class="payment-kicker">PAYMENT CONFIGURATION</span><h1>支付設定</h1><p>集中管理收款與出款渠道的技術配置，讓財務中心可以安全採用已驗證的服務。</p></div><div class="payment-hero-actions"><span class="payment-hero-state"><i></i>技術配置模式</span><button class="payment-button primary" type="button" :disabled="!canWrite" @click="openPaymentEditor()">＋ 新增技術配置</button></div></header>
  <div class="payment-notice"><div class="payment-notice-icon">✓</div><div><strong>技術配置中心</strong><span>此頁只保存支付渠道技術資料與連線測試結果。正式啟用、收款、退款、出款、結算及對帳由財務管理中心控制。</span></div></div>
  <PaymentScopeTabs :scope="paymentConfigFilter.scope" @update:scope="paymentConfigFilter.scope = $event" />
  <div class="payment-workspace">
    <section class="payment-results">
      <section class="payment-toolbar" aria-label="篩選技術配置">
        <label class="payment-search">搜尋技術配置<input v-model="paymentConfigFilter.search" placeholder="配置名稱、提供商或支付方式" /></label>
        <label>配置類型<select v-model="paymentConfigFilter.scope"><option value="all">全部類型</option><option value="passenger">收款渠道</option><option value="driver-settlement">出款服務</option></select></label>
        <label>地區<select v-model="paymentConfigFilter.region"><option value="all">全部地區</option><option>中國內地</option><option>香港</option></select></label>
      </section>
      <section class="payment-currency-groups" aria-label="收款貨幣配置分類">
        <button type="button" :class="{active: paymentConfigFilter.currency === 'HKD'}" @click="paymentConfigFilter.currency = 'HKD'"><span>港幣</span><b>HKD</b><small>{{currencyConfigCount('HKD')}} 項配置</small></button>
        <button type="button" :class="{active: paymentConfigFilter.currency === 'RMB'}" @click="paymentConfigFilter.currency = 'RMB'"><span>人民幣</span><b>RMB</b><small>{{currencyConfigCount('RMB')}} 項配置</small></button>
        <button type="button" :class="{active: paymentConfigFilter.currency === 'all'}" @click="paymentConfigFilter.currency = 'all'"><span>全部貨幣</span><b>HKD／RMB</b><small>{{currencyConfigCount('all')}} 項配置</small></button>
      </section>
      <section class="payment-overview"><div><span class="payment-label">{{paymentConfigFilter.currency === 'HKD' ? '港幣 HKD 配置' : paymentConfigFilter.currency === 'RMB' ? '人民幣 RMB 配置' : '港幣／人民幣配置'}}</span><h2>支付技術配置概覽</h2></div><div class="payment-stat-list"><span class="payment-stat"><b>{{visiblePaymentConfigs().length}}</b><small>目前分類</small></span><span class="payment-stat success"><b>{{visiblePaymentConfigs().filter(item => item.connection === 'success').length}}</b><small>連線正常</small></span><span class="payment-stat warning"><b>{{visiblePaymentConfigs().filter(item => item.connection !== 'success').length}}</b><small>待測試</small></span></div></section>
      <section v-if="paymentConfigFilter.scope === 'driver-settlement'" class="payment-boundary-note"><strong>出款服務技術配置</strong><span>此處只配置出款服務與技術連線；司機應付金額、結算結果、出款操作及對帳由財務管理中心負責。</span></section>
      <section class="payment-grid"><PaymentConfigCard v-for="config in visiblePaymentConfigs()" :key="config.id" :config="config" :can-write="canWrite" @edit="openPaymentEditor" @duplicate="duplicatePaymentConfig" /><div v-if="!visiblePaymentConfigs().length" class="payment-empty"><strong>沒有符合條件的技術配置</strong><span>請調整貨幣、地區或配置類型，或新增一個技術配置。</span></div></section>
    </section>
  </div>
  <div v-if="paymentSettingsSaved" class="payment-saved">✓ 技術配置已保存</div>
  <PaymentConfigEditor v-if="paymentEditorOpen" :config="selectedPaymentConfig" :step="paymentEditorStep" :can-write="canWrite" :test-result="paymentTestResult" @close="closePaymentEditor" @update:step="paymentEditorStep = $event" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
</section>`
}
