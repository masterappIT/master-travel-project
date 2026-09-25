import { inject } from 'vue'

export const PaymentsPage = {
  name: 'PaymentsPage',
  setup() { return inject('adminPaymentsContext') },
  template: String.raw`<section v-if="view==='payments'" class="payment-settings-admin panel">
  <div class="payment-settings-header">
    <span class="eyebrow">PAYMENT GATEWAYS & WALLET</span>
    <h2>{{t('paymentSettings')}}</h2>
    <p class="section-desc">{{t('paymentSettingsDesc')}}</p>
  </div>

  <div class="payment-grid">
    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('walletPaymentGroup')}}</h3>
        <span class="badge-internal">{{t('internalBadge')}}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('fareBalancePay')}}</strong>
          <span>{{t('fareBalancePayHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.fareBalancePayEnabled" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('cashBalancePay')}}</strong>
          <span>{{t('cashBalancePayHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.cashBalancePayEnabled" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('externalPaymentGroup')}}</h3>
        <span class="badge-external">{{t('externalBadge')}}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('wechatPay')}}</strong>
          <span>{{t('wechatPayHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.wechatPayEnabled" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('alipayPay')}}</strong>
          <span>{{t('alipayPayHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.alipayPayEnabled" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('bankCardPay')}}</strong>
          <span>{{t('bankCardPayHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.bankCardPayEnabled" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="payment-group-card">
      <div class="payment-group-header">
        <h3>{{t('envModeGroup')}}</h3>
        <span class="badge-env">{{ paymentSettings.sandboxMode ? t('sandboxBadge') : t('productionBadge') }}</span>
      </div>
      <div class="payment-item-row">
        <div class="payment-item-info">
          <strong>{{t('sandboxMode')}}</strong>
          <span>{{t('sandboxModeHint')}}</span>
        </div>
        <label class="switch">
          <AdminCheckbox type="checkbox" v-model="paymentSettings.sandboxMode" :disabled="!canWrite"/>
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>

  <div class="payment-save-bar">
    <button type="button" class="primary" :disabled="!canWrite" @click="savePaymentSettings">{{t('savePaymentSettings')}}</button>
    <span v-if="paymentSettingsSaved" class="success-hint"> {{t('paymentSavedSuccess')}}</span>
  </div>
</section>`
}
