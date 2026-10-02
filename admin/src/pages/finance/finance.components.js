export const FinanceCard = {
  name: 'FinanceCard',
  props: { eyebrow: String, title: String, status: String, statusTone: { type: String, default: 'warning' } },
  template: String.raw`<section class="finance-card"><div v-if="eyebrow || title || status" class="finance-card-heading"><div><span v-if="eyebrow" class="finance-label">{{eyebrow}}</span><h2 v-if="title">{{title}}</h2></div><span v-if="status" class="finance-pill" :class="statusTone">{{status}}</span></div><slot /></section>`
}

export const FinanceMetricCard = {
  name: 'FinanceMetricCard',
  props: { label: String, value: String, note: String },
  template: String.raw`<article class="finance-metric-card"><span>{{label}}</span><strong>{{value}}</strong><small>{{note}}</small></article>`
}
