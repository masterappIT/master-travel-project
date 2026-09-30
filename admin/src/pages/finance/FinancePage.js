import { inject } from 'vue'

export const FinancePage = {
  name: 'FinancePage',
  setup() { return inject('adminFinanceContext') },
  template: String.raw`<section v-if="view==='finance'" class="finance-center">
  <header class="finance-hero">
    <div>
      <span class="finance-kicker">FINANCE CENTER</span>
      <h1>財務管理中心</h1>
      <p>集中管理收款、退款、匯率及司機結算，掌握各地區的資金狀態。</p>
    </div>
    <div class="finance-hero-meta"><span class="finance-live-dot"></span><span>管理端配置模式</span></div>
  </header>

  <div class="finance-notice"><strong>目前工作邊界</strong><span>目前為後台 UI 配置與檢視，尚未連接真實交易、支付 API 或匯率服務。</span></div>

  <nav class="finance-nav" role="tablist" aria-label="財務管理中心分類">
    <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :class="{active: activeTab === tab.id}" @click="activeTab = tab.id">{{tab.label}}</button>
  </nav>

  <div v-if="activeTab === 'overview'" class="finance-content">
    <section class="finance-toolbar">
      <div><span class="finance-label">財務總覽</span><h2>本月資金摘要</h2></div>
      <div class="finance-controls"><label>統計期間<select v-model="overviewPeriod"><option>今日</option><option>本週</option><option>本月</option><option>本季</option></select></label><label>報表貨幣<select v-model="reportCurrency"><option>原始貨幣</option><option>RMB</option><option>HKD</option></select></label></div>
    </section>
    <section class="finance-card finance-summary-card"><div class="finance-card-heading"><div><span class="finance-label">收入摘要</span><h2>跨地區交易概覽</h2></div><span class="finance-pill warning">尚未接入交易 API</span></div><div class="finance-metrics"><article v-for="item in incomeSummary" :key="item.label"><span>{{item.label}}</span><strong>{{item.value}}</strong><small>{{item.note}}</small></article></div><div class="finance-table-wrap"><table><thead><tr><th>地區</th><th>貨幣</th><th>乘客實收</th><th>退款</th><th>司機應付</th><th>平台淨收入</th></tr></thead><tbody><tr v-for="item in incomeBreakdown" :key="item.currency"><td>{{item.region}}</td><td><b>{{item.currency}}</b></td><td>{{item.received}}</td><td>{{item.refund}}</td><td>{{item.driver}}</td><td><b>{{item.net}}</b></td></tr></tbody></table></div></section>
    <div class="finance-columns"><section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">資金流程</span><h2>配置狀態</h2></div><span class="finance-pill warning">待配置</span></div><div class="finance-list"><article v-for="flow in flowStatuses" :key="flow.title"><div><b>{{flow.title}}</b><small>{{flow.description}}</small></div><span class="finance-pill warning">{{flow.status}}</span></article></div></section><section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">地區設定</span><h2>結算貨幣</h2></div></div><div class="finance-list"><article v-for="region in regions" :key="region.code"><div><b>{{region.name}}</b><small>{{region.methods}}</small></div><strong class="finance-currency">{{region.currency}}</strong><span class="finance-pill warning">{{region.status}}</span></article></div></section></div>
  </div>

  <section v-else-if="activeTab === 'currency'" class="finance-content"><div class="finance-toolbar"><div><span class="finance-label">貨幣與匯率</span><h2>管理報價及結算貨幣</h2></div><button class="finance-button primary" type="button" @click="openRateEditor">新增匯率</button></div><section class="finance-card"><div class="finance-form-grid"><label>目前報價貨幣<select v-model="settings.quoteCurrency"><option>RMB</option><option>HKD</option></select></label><label>基準貨幣<select v-model="settings.baseCurrency"><option>RMB</option><option>HKD</option></select></label></div><div class="finance-rate-list"><div class="finance-rate-row heading"><span>匯率方向</span><span>匯率</span><span>來源</span><span>狀態</span></div><div v-for="rate in rates" :key="rate.pair" class="finance-rate-row"><b>{{rate.pair}}</b><span>{{rate.value}}</span><span>{{rate.source}}</span><span class="finance-pill" :class="rate.status === '已設定' ? 'success' : 'warning'">{{rate.status}}</span></div></div></section><section v-if="rateEditorOpen" class="finance-editor"><div class="finance-card-heading"><div><span class="finance-label">匯率設定</span><h2>新增匯率草稿</h2></div><button class="finance-icon-button" type="button" aria-label="關閉" @click="closeRateEditor">×</button></div><div class="finance-form-grid"><label>匯率方向<select v-model="rateForm.pair"><option>RMB → HKD</option><option>HKD → RMB</option></select></label><label>匯率值<input v-model="rateForm.value" type="number" min="0" step="0.0001" placeholder="例如 0.85" /></label><label>來源<select v-model="rateForm.source"><option>人工設定</option><option>第三方 API</option></select></label></div><div class="finance-actions"><button class="finance-button" type="button" @click="closeRateEditor">取消</button><button class="finance-button primary" type="button" @click="closeRateEditor">保存草稿</button></div></section></section>
  <section v-else-if="activeTab === 'passenger'" class="finance-content"><div class="finance-toolbar"><div><span class="finance-label">乘客資金</span><h2>收款與退款管理</h2></div></div><div class="finance-module-grid"><button v-for="item in passengerItems" :key="item.title" class="finance-module" type="button" @click="item.title === '付款方式設定' ? navigate('payments') : null"><b>{{item.title}}</b><span>{{item.description}}</span><small>{{item.title === '付款方式設定' ? '前往支付設定 →' : item.status}}</small></button></div></section>
  <section v-else-if="activeTab === 'driver'" class="finance-content"><div class="finance-toolbar"><div><span class="finance-label">司機資金</span><h2>結算與出款管理</h2></div></div><div class="finance-module-grid"><article v-for="item in driverItems" :key="item.title" class="finance-module"><b>{{item.title}}</b><span>{{item.description}}</span><small>{{item.status}}</small></article></div></section>
  <section v-else class="finance-content"><div class="finance-toolbar"><div><span class="finance-label">對帳與記錄</span><h2>財務操作追蹤</h2></div></div><div class="finance-module-grid"><article v-for="item in auditItems" :key="item.title" class="finance-module"><b>{{item.title}}</b><span>{{item.description}}</span><small>{{item.status}}</small></article></div></section>
</section>`
}
