export const FinanceGlobalPricingPanel = {
  name: 'FinanceGlobalPricingPanel',
  props: {
    settings: { type: Object, required: true },
    rates: { type: Array, required: true },
    editorOpen: Boolean,
    rateForm: { type: Object, required: true }
  },
  emits: ['open-editor', 'close-editor', 'update:quoteCurrency', 'update:baseCurrency', 'update-rate-form-field', 'save-draft'],
  template: String.raw`<section class="finance-content">
    <div class="finance-toolbar">
      <div><span class="finance-label">全域貨幣與報價</span><h2>統一報價基礎</h2><p class="finance-toolbar-description">集中管理報價貨幣與金額規則；支付渠道及司機結算渠道請至支付設定配置。</p></div>
      <div class="finance-toolbar-actions"><span class="finance-pill success">{{settings.quoteCurrency}} 報價基礎已設定</span><button class="finance-button primary" type="button" @click="$emit('open-editor')">編輯匯率</button></div>
    </div>
    <section class="finance-card finance-global-summary"><div class="finance-card-heading"><div><span class="finance-label">報價環境狀態</span><h2>目前全域設定</h2></div><span class="finance-pill success">可供定價管理使用</span></div><div class="finance-global-grid"><article><span>統一報價貨幣</span><strong>{{settings.quoteCurrency}}</strong><small>車型與路線定價只能使用此貨幣</small></article><article><span>基準貨幣</span><strong>{{settings.baseCurrency}}</strong><small>匯率換算的基準</small></article><article><span>價格規則</span><strong>待檢查</strong><small>請確認車型與路線定價完整</small></article><article><span>支付配置</span><strong>由支付設定獨立管理</strong><small>支付渠道與連線狀態不在財務中心配置</small></article></div></section>
    <section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">貨幣與匯率</span><h2>報價換算基礎</h2></div><span class="finance-pill warning">僅供報價預覽</span></div><div class="finance-form-grid"><label>目前報價貨幣<select :value="settings.quoteCurrency" @change="$emit('update:quoteCurrency', $event.target.value)"><option>RMB</option><option>HKD</option></select></label><label>基準貨幣<select :value="settings.baseCurrency" @change="$emit('update:baseCurrency', $event.target.value)"><option>RMB</option><option>HKD</option></select></label></div><div class="finance-rate-list"><div class="finance-rate-row heading"><span>匯率方向</span><span>匯率</span><span>來源</span><span>狀態</span></div><div v-for="rate in rates" :key="rate.pair" class="finance-rate-row"><b>{{rate.pair}}</b><span>{{rate.value}}</span><span>{{rate.source}}</span><span class="finance-pill" :class="rate.status === '已設定' ? 'success' : 'warning'">{{rate.status}}</span></div></div></section>
    <section v-if="editorOpen" class="finance-editor"><div class="finance-card-heading"><div><span class="finance-label">匯率設定</span><h2>新增匯率草稿</h2></div><button class="finance-icon-button" type="button" aria-label="關閉" @click="$emit('close-editor')">×</button></div><div class="finance-form-grid"><label>匯率方向<select :value="rateForm.pair" @change="$emit('update-rate-form-field', { key: 'pair', value: $event.target.value })"><option>RMB → HKD</option><option>HKD → RMB</option></select></label><label>匯率值<input :value="rateForm.value" type="number" min="0" step="0.0001" placeholder="例如 0.85" @input="$emit('update-rate-form-field', { key: 'value', value: $event.target.value })" /></label><label>來源<select :value="rateForm.source" @change="$emit('update-rate-form-field', { key: 'source', value: $event.target.value })"><option>人工設定</option><option>第三方 API</option></select></label></div><div class="finance-actions"><button class="finance-button" type="button" @click="$emit('close-editor')">取消</button><button class="finance-button primary" type="button" @click="$emit('save-draft')">保存草稿</button></div></section>
  </section>`
}
