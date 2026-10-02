import { inject } from 'vue'
import { PaymentConfigCard, PaymentScopeTabs } from './payments.components.js'
import { PaymentConfigEditor } from './payment-config-editor.component.js'

export const PaymentsPage = {
  name: 'PaymentsPage',
  components: { PaymentConfigCard, PaymentConfigEditor, PaymentScopeTabs },
  setup() { return inject('adminPaymentsContext') },
  template: String.raw`<section v-if="view==='payments'" class="payment-settings-admin">
  <header class="payment-hero"><div><span class="payment-kicker">PAYMENT SETTINGS</span><h1>支付設定</h1><p>管理乘客支付方式、司機結算渠道及第三方服務連線。</p></div><button class="payment-button primary" type="button" :disabled="!canWrite" @click="openPaymentEditor()">新增配置</button></header>
  <div class="payment-notice"><strong>管理端配置模式</strong><span>此頁只管理支付與出款渠道；目前配置只保存在管理端畫面，尚未連接第三方 API、資料庫或真實交易。</span></div>
  <PaymentScopeTabs :scope="paymentConfigFilter.scope" @update:scope="paymentConfigFilter.scope = $event" />
  <section class="payment-toolbar"><label class="payment-search">搜尋支付配置<input v-model="paymentConfigFilter.search" placeholder="配置名稱、提供商或支付方式" /></label><label>地區<select v-model="paymentConfigFilter.region"><option value="all">全部地區</option><option>中國內地</option><option>香港</option></select></label><label>貨幣<select v-model="paymentConfigFilter.currency"><option value="all">全部貨幣</option><option>RMB</option><option>HKD</option></select></label><label>狀態<select v-model="paymentConfigFilter.status"><option value="all">全部狀態</option><option value="enabled">已啟用</option><option value="disabled">已停用</option><option value="draft">草稿</option></select></label></section>
  <section class="payment-overview"><div><span class="payment-label">{{paymentConfigFilter.scope === 'driver-settlement' ? '司機結算渠道' : paymentConfigFilter.scope === 'passenger' ? '乘客支付方式' : '支付與結算配置'}}</span><h2>渠道配置概覽</h2></div><div class="payment-stat-list"><span><b>{{visiblePaymentConfigs().length}}</b> 個配置</span><span><b>{{visiblePaymentConfigs().filter(item => item.status === 'enabled').length}}</b> 個已啟用</span><span><b>{{visiblePaymentConfigs().filter(item => item.connection === 'success').length}}</b> 個連線正常</span></div></section>
  <section v-if="paymentConfigFilter.scope === 'driver-settlement'" class="payment-boundary-note"><strong>司機結算支付渠道</strong><span>此處只配置出款服務與技術連線；司機應付金額、結算結果及對帳由財務管理中心負責。</span></section>
  <section class="payment-grid"><PaymentConfigCard v-for="config in visiblePaymentConfigs()" :key="config.id" :config="config" :can-write="canWrite" @edit="openPaymentEditor" @duplicate="duplicatePaymentConfig" @toggle="togglePaymentConfig" /><div v-if="!visiblePaymentConfigs().length" class="payment-empty">沒有符合條件的支付配置</div></section>
  <div v-if="paymentSettingsSaved" class="payment-saved">✓ 配置草稿已保存</div>
  <PaymentConfigEditor v-if="paymentEditorOpen" :config="selectedPaymentConfig" :step="paymentEditorStep" :can-write="canWrite" :test-result="paymentTestResult" @close="closePaymentEditor" @update:step="paymentEditorStep = $event" @test="testPaymentConfig" @save="savePaymentConfigDraft" />
</section>`
}
