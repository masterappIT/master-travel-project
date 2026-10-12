import { ref, onMounted, watch } from 'vue'

const money = value => Number(value || 0).toLocaleString('zh-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-HK', { hour12: false }) }
const PERIODS = [{ key: 'today', label: '今日' }, { key: 'week', label: '本週' }, { key: 'month', label: '本月' }, { key: 'quarter', label: '本季' }]

export const FinanceOverviewPanel = {
  name: 'FinanceOverviewPanel',
  props: { api: { type: Function, required: true }, displayError: { type: Function, required: true } },
  emits: ['open-tab', 'open-settlements'],
  setup(props) {
    const period = ref('month')
    const overview = ref(null)
    const loading = ref(true)
    const loadError = ref('')
    let requestId = 0
    const load = async () => {
      const current = ++requestId
      loading.value = true
      loadError.value = ''
      try {
        const response = await props.api(`/admin/finance/overview?period=${period.value}`)
        if (current === requestId) overview.value = response
      } catch (err) { if (current === requestId) loadError.value = props.displayError(err) } finally { if (current === requestId) loading.value = false }
    }
    onMounted(load)
    watch(period, load)
    return { period, periods: PERIODS, overview, loading, loadError, load, money, formatTime }
  },
  template: String.raw`<div class="finance-content">
    <section class="finance-toolbar"><div><span class="finance-label">財務總覽</span><h2>資金摘要</h2><p v-if="overview" class="finance-toolbar-description">統計自 {{formatTime(overview.from)}} 起建立的付款，以及同期已完成但尚未結算的行程。</p></div><div class="finance-controls"><label>統計期間<select v-model="period"><option v-for="item in periods" :key="item.key" :value="item.key">{{item.label}}</option></select></label></div></section>
    <div v-if="loadError" class="finance-channel-empty" role="alert">總覽載入失敗：{{loadError}} <button class="finance-button" type="button" @click="load">重試</button></div>
    <div v-else-if="loading && !overview" class="finance-channel-empty">載入中…</div>
    <template v-else-if="overview">
      <section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">收入摘要</span><h2>按貨幣統計</h2></div><span class="finance-pill" :class="loading ? 'idle' : 'success'">{{loading ? '更新中…' : '真實資料'}}</span></div>
        <div v-if="!overview.currencies.length" class="finance-channel-empty finance-table-empty">此期間沒有付款或待結算行程。</div>
        <div v-else class="finance-table-wrap"><table><thead><tr><th>付款貨幣</th><th>付款筆數</th><th>乘客實收</th><th>車費餘額扣款（RMB）</th><th>現金餘額扣款（RMB）</th><th>外部支付</th><th>已退款</th><th>司機待結算</th></tr></thead><tbody><tr v-for="row in overview.currencies" :key="row.currency"><td><b>{{row.currency}}</b></td><td>{{row.payments}}</td><td><b>{{money(row.received)}}</b></td><td>{{money(row.fareBalance)}}</td><td>{{money(row.cashBalance)}}</td><td>{{money(row.external)}}</td><td>{{money(row.refunded)}}<small v-if="row.refundedPayments">（{{row.refundedPayments}} 筆）</small></td><td>{{money(row.driverPending)}}<small v-if="row.driverPendingTrips">（{{row.driverPendingTrips}} 程）</small></td></tr></tbody></table></div>
        <p class="finance-channel-summary">實收、外部支付與已退款以付款貨幣計；兩種餘額扣款是從錢包實際扣除的金額，錢包以人民幣記帳。已退款的付款仍計入實收，並另列於「已退款」。不同貨幣不合併，也不推算平台淨收入：手續費與分成尚未有統一規則。</p>
      </section>
      <section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">資金流程</span><h2>目前狀態</h2></div></div><div class="finance-list">
        <article><div><b>乘客收款</b><small>乘客付款彈窗目前提供 {{overview.collection.walletMethods}} 種錢包、{{overview.collection.externalMethods}} 種外部付款方式；運營中的渠道 {{overview.collection.operatingChannels}} 個（{{overview.collection.sandboxMode ? '測試模式' : '正式模式'}}）。外部付款的實際扣款尚未接入。</small></div><button class="finance-button" type="button" @click="$emit('open-tab', 'passenger')">付款面板設定</button></article>
        <article><div><b>乘客退款</b><small>尚未接入：目前沒有退款操作入口，只能查看付款記錄上的退款狀態。</small></div><span class="finance-pill idle">未接入</span></article>
        <article><div><b>司機結算</b><small>結算操作在「結算管理」頁進行；此處只統計已完成但尚未結算的行程。</small></div><button class="finance-button" type="button" @click="$emit('open-settlements')">前往結算管理</button></article>
      </div></section>
    </template>
  </div>`
}

export const FinancePaymentsTable = {
  name: 'FinancePaymentsTable',
  props: { api: { type: Function, required: true }, displayError: { type: Function, required: true } },
  setup(props) {
    const rows = ref([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = 10
    const status = ref('all')
    const search = ref('')
    const loading = ref(true)
    const loadError = ref('')
    let requestId = 0
    const load = async () => {
      const current = ++requestId
      loading.value = true
      loadError.value = ''
      try {
        const params = new URLSearchParams({ page: String(page.value), pageSize: String(pageSize) })
        if (status.value !== 'all') params.set('status', status.value)
        if (search.value.trim()) params.set('search', search.value.trim())
        const response = await props.api(`/admin/finance/payments?${params}`)
        if (current !== requestId) return
        rows.value = response.data
        total.value = response.pagination?.total ?? response.total ?? response.data.length
      } catch (err) { if (current === requestId) loadError.value = props.displayError(err) } finally { if (current === requestId) loading.value = false }
    }
    onMounted(load)
    const applyFilters = () => { page.value = 1; load() }
    const goTo = target => { page.value = target; load() }
    const pageCount = () => Math.max(1, Math.ceil(total.value / pageSize))
    return { rows, total, page, status, search, loading, loadError, load, applyFilters, goTo, pageCount, money, formatTime }
  },
  template: String.raw`<section class="finance-card finance-payments">
    <div class="finance-card-heading"><div><span class="finance-label">付款交易</span><h2>乘客付款記錄</h2></div><form class="finance-controls" @submit.prevent="applyFilters"><label>狀態<select v-model="status" @change="applyFilters"><option value="all">全部</option><option value="PAID">已付款</option><option value="REFUNDED">已退款</option></select></label><label>搜尋<input v-model="search" placeholder="行程編號、手機、姓名、外部交易編號" /></label><button class="finance-button" type="submit" :disabled="loading">{{loading ? '載入中…' : '查詢'}}</button></form></div>
    <div v-if="loadError" class="finance-channel-empty" role="alert">付款記錄載入失敗：{{loadError}} <button class="finance-button" type="button" @click="load">重試</button></div>
    <div v-else-if="loading && !rows.length" class="finance-channel-empty finance-table-empty">載入中…</div>
    <div v-else-if="!rows.length" class="finance-channel-empty finance-table-empty">沒有符合條件的付款記錄。</div>
    <template v-else>
      <div class="finance-table-wrap"><table><thead><tr><th>時間</th><th>乘客</th><th>行程編號</th><th>金額</th><th>車費餘額扣款（RMB）</th><th>現金餘額扣款（RMB）</th><th>外部支付</th><th>狀態</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{formatTime(row.createdAt)}}</td><td>{{row.passenger.name || '—'}}<small>{{row.passenger.phoneNumber}}</small></td><td><code>{{row.tripId}}</code></td><td><b>{{row.currency}} {{money(row.total)}}</b></td><td>{{money(row.fareAmount)}}</td><td>{{money(row.cashAmount)}}</td><td>{{money(row.externalAmount)}}<small v-if="row.externalPaymentMethod">{{row.externalPaymentMethod}}{{row.externalReference ? ' · ' + row.externalReference : ''}}</small></td><td><span class="finance-pill" :class="row.status === 'REFUNDED' ? 'warning' : 'success'">{{row.status === 'REFUNDED' ? '已退款' : '已付款'}}</span><small v-if="row.refundedAt">{{formatTime(row.refundedAt)}}</small></td></tr></tbody></table></div>
      <div class="finance-pagination"><span>共 {{total}} 筆 · 第 {{page}}／{{pageCount()}} 頁</span><div><button class="finance-button" type="button" :disabled="page <= 1 || loading" @click="goTo(page - 1)">上一頁</button><button class="finance-button" type="button" :disabled="page >= pageCount() || loading" @click="goTo(page + 1)">下一頁</button></div></div>
    </template>
    <p class="finance-channel-summary">此列表只供查看。退款操作尚未接入。</p>
  </section>`
}

// Readable names for the finance write endpoints; anything else falls back to the raw request.
const describeOperation = log => {
  if (/\/admin\/finance\/payment-sheet/.test(log.resource)) return '保存付款面板'
  if (/\/admin\/finance\/channels\//.test(log.resource)) return '變更渠道運營狀態'
  return log.action
}

export const FinanceOperationLog = {
  name: 'FinanceOperationLog',
  props: { api: { type: Function, required: true }, displayError: { type: Function, required: true }, canView: { type: Boolean, default: false } },
  setup(props) {
    const rows = ref([])
    const loading = ref(false)
    const loadError = ref('')
    const load = async () => {
      if (!props.canView) return
      loading.value = true
      loadError.value = ''
      try { rows.value = (await props.api('/admin/audit-logs?search=%2Fadmin%2Ffinance&page=1&pageSize=20')).data } catch (err) { loadError.value = props.displayError(err) } finally { loading.value = false }
    }
    onMounted(load)
    return { rows, loading, loadError, load, describeOperation, formatTime }
  },
  template: String.raw`<div class="finance-content">
    <section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">財務操作日誌</span><h2>最近 20 筆財務操作</h2></div><div class="finance-toolbar-actions"><button v-if="canView" class="finance-button" type="button" :disabled="loading" @click="load">{{loading ? '載入中…' : '重新整理'}}</button></div></div>
      <div v-if="!canView" class="finance-channel-empty finance-table-empty">操作日誌僅超級管理員可查看。</div>
      <div v-else-if="loadError" class="finance-channel-empty" role="alert">日誌載入失敗：{{loadError}}</div>
      <div v-else-if="loading && !rows.length" class="finance-channel-empty finance-table-empty">載入中…</div>
      <div v-else-if="!rows.length" class="finance-channel-empty finance-table-empty">尚無財務操作記錄。</div>
      <div v-else class="finance-table-wrap"><table><thead><tr><th>時間</th><th>管理員</th><th>操作</th><th>結果</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td>{{formatTime(row.createdAt)}}</td><td>{{row.username}}</td><td>{{describeOperation(row)}}</td><td><span class="finance-pill" :class="row.status === 'SUCCESS' ? 'success' : 'warning'">{{row.status === 'SUCCESS' ? '成功' : '失敗'}}</span></td></tr></tbody></table></div>
      <p class="finance-channel-summary">記錄付款面板保存與渠道採用、停用、確認恢復。完整日誌見「Operation logs」。</p>
    </section>
    <section class="finance-card"><div class="finance-card-heading"><div><span class="finance-label">對帳</span><h2>對帳管理</h2></div><span class="finance-pill idle">未接入</span></div><p class="finance-channel-summary">尚未接入：需待外部渠道實際收款後，才有第三方交易記錄可與平台付款、退款及司機出款比對。</p></section>
  </div>`
}
