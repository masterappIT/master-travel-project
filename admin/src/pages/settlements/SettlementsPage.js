import { inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const tripStatusLabels = Object.freeze({
  COMPLETED: '已完成'
})

const paymentStatusLabels = Object.freeze({
  PAID: '已付款',
  REFUNDED: '已退款'
})

export const SettlementsPage = {
  name: 'SettlementsPage',
  setup() {
    const context = inject('adminSettlementsContext')
    const detailDrawer = ref(null)
    const detailCloseButton = ref(null)
    const settlementSection = ref('DRIVER')
    const selectSettlementSection = section => {
      if (context.selectedSettlementTrip.value) context.closeSettlementDetail()
      settlementSection.value = section
    }
    let detailTrigger = null
    let previousBodyOverflow = ''

    const focusableSelector = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    const openSettlementDetail = (trip, event) => {
      detailTrigger = event?.currentTarget || null
      context.openSettlementDetail(trip)
    }
    const closeSettlementDetail = () => context.closeSettlementDetail()
    const handleDetailKeydown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSettlementDetail()
        return
      }
      if (event.key !== 'Tab' || !detailDrawer.value) return

      const focusable = [...detailDrawer.value.querySelectorAll(focusableSelector)]
      if (!focusable.length) {
        event.preventDefault()
        detailDrawer.value.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const formatTripStatus = status => tripStatusLabels[status] || status || '—'
    const formatPaymentStatus = status => paymentStatusLabels[status] || status || '—'

    watch(context.selectedSettlementTrip, async selected => {
      if (selected) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        await nextTick()
        detailCloseButton.value?.focus()
        return
      }

      document.body.style.overflow = previousBodyOverflow
      await nextTick()
      detailTrigger?.focus()
      detailTrigger = null
    })
    watch(context.view, currentView => {
      if (currentView !== 'settlements' && context.selectedSettlementTrip.value) closeSettlementDetail()
    })

    onBeforeUnmount(() => {
      document.body.style.overflow = previousBodyOverflow
    })

    const togglePaymentCurrency = currency => {
      if (currency === 'RMB') return
      paymentCurrencies.value = paymentCurrencies.value.includes(currency)
        ? paymentCurrencies.value.filter(item => item !== currency)
        : [...paymentCurrencies.value, currency]
    }

    return {
      ...context,
      detailDrawer,
      detailCloseButton,
      settlementSection,
      selectSettlementSection,
      openSettlementDetail,
      closeSettlementDetail,
      handleDetailKeydown,
      formatTripStatus,
      formatPaymentStatus,
      togglePaymentCurrency
    }
  },
  template: String.raw`<section v-if="view==='settlements'" class="settlements-page">
    <div class="settlement-heading">
      <div><span class="eyebrow">SETTLEMENT MANAGEMENT</span><h1>結算管理</h1><p class="muted">分開管理司機與乘客帳務，集中規劃共用結算設定</p></div>
      <button type="button" class="secondary" @click="load">更新資料</button>
    </div>
  <div class="settlement-section-tabs" role="tablist" aria-label="結算管理分類">
    <button type="button" :class="{ active: settlementSection === 'DRIVER' }" role="tab" :aria-selected="settlementSection === 'DRIVER'" @click="selectSettlementSection('DRIVER')">司機結算</button>
    <button type="button" :class="{ active: settlementSection === 'PASSENGER' }" role="tab" :aria-selected="settlementSection === 'PASSENGER'" @click="selectSettlementSection('PASSENGER')">乘客結算</button>
    <button type="button" :class="{ active: settlementSection === 'SETTINGS' }" role="tab" :aria-selected="settlementSection === 'SETTINGS'" @click="selectSettlementSection('SETTINGS')">結算設定</button>
  </div>
  <template v-if="settlementSection === 'DRIVER'">
    <div class="settlement-summary-grid">
      <article><span>可結算行程</span><strong>{{settlementSummary.eligible ?? 0}}</strong><small>已完成且已指派司機</small></article>
      <article class="is-warning"><span>待結算</span><strong>{{settlementSummary.unsettled ?? 0}}</strong><small>{{formatSettlementTotal(settlementSummary.unsettledTotal)}}</small></article>
      <article class="is-success"><span>已結算</span><strong>{{settlementSummary.settled ?? 0}}</strong><small>{{formatSettlementTotal(settlementSummary.settledTotal)}}</small></article>
    </div>
    <div class="panel settlement-list-panel">
      <div class="settlement-toolbar">
        <div><h2>結算紀錄</h2><span class="muted">金額與狀態同步司機端</span></div>
        <div class="settlement-filters">
          <input v-model="settlementSearchQuery" placeholder="搜尋訂單、司機或路線" aria-label="搜尋結算紀錄"/>
          <AdminSelect v-model="settlementStatusFilter" aria-label="結算狀態"><option value="ALL">全部狀態</option><option value="UNSETTLED">待結算</option><option value="SETTLED">已結算</option></AdminSelect>
        </div>
      </div>
      <div class="settlement-table-wrap"><table class="settlement-table"><thead><tr><th>訂單／完成時間</th><th>司機</th><th>應付金額</th><th>結算方式</th><th>狀態</th><th>操作</th></tr></thead><tbody>
        <tr v-for="trip in pagedSettlements" :key="trip.id">
          <td><strong>{{formatOrderNumber(trip.id)}}</strong><small>{{formatDate(trip.completedAt || trip.updatedAt, true)}}</small></td>
          <td><strong>{{settlementDriverFor(trip)?.name || '—'}}</strong><small>{{settlementDriverFor(trip)?.phone || '—'}}</small></td>
          <td><strong>{{trip.driverPayoutCurrency || 'HKD'}} {{Number(trip.driverPayoutAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong></td>
          <td><span v-if="trip.settlement">{{trip.settlement.method}}</span><AdminSelect v-else v-model="settlementMethods[trip.id]" :disabled="!canWrite" class="settlement-method-select"><option value="" disabled>選擇收款方式</option><option value="微信支付">微信支付</option><option value="支付寶">支付寶</option><option value="FPS 轉數快">FPS 轉數快</option></AdminSelect><small v-if="!trip.settlement && !settlementDriverFor(trip)?.settlementMethod" class="settlement-method-warning">司機尚未設定結算方式</small></td>
          <td><span class="settlement-status" :class="trip.settlement ? 'settled' : 'unsettled'">{{trip.settlement ? '已結算' : '待結算'}}</span><small v-if="trip.settlement">{{formatDate(trip.settlement.settledAt, true)}}</small></td>
          <td class="settlement-actions"><div class="settlement-action-group"><button type="button" class="settlement-view-action" @click="openSettlementDetail(trip, $event)">查看詳情</button><button v-if="!trip.settlement && canWrite" type="button" class="settlement-primary-action" :disabled="!settlementMethods[trip.id]" @click="settleTrip(trip, settlementMethods[trip.id])">確認結算</button><button v-else-if="trip.settlement && canWrite" type="button" class="settlement-secondary-action" @click="unsettleTrip(trip)">撤銷結算</button><span v-else>—</span></div></td>
        </tr>
        <tr v-if="!filteredSettlements.length"><td colspan="6" class="settlement-empty">沒有符合條件的結算紀錄</td></tr>
      </tbody></table></div>
      <div v-if="settlementPageCount > 1" class="pagination-controls"><button type="button" :disabled="settlementPage===1" @click="goToSettlementPage(settlementPage-1)">上一頁</button><span>第 {{settlementPage}} / {{settlementPageCount}} 頁</span><button type="button" :disabled="settlementPage===settlementPageCount" @click="goToSettlementPage(settlementPage+1)">下一頁</button></div>
    </div>
  </template>
  <template v-else-if="settlementSection === 'PASSENGER'">
    <div class="panel settlement-placeholder-panel">
      <div class="settlement-placeholder-icon" aria-hidden="true">♙</div>
      <h2>乘客結算</h2>
      <p class="muted">乘客付款、退款及錢包扣款將在此分類管理。</p>
      <span class="settlement-coming-soon">功能規劃中</span>
    </div>
  </template>
  <template v-else>
    <div class="panel settlement-settings-panel">
      <div class="settlement-settings-heading"><div><h2>貨幣與付款設定</h2><p class="muted">依用途分開查看定價／報價、結算及乘客付款幣別；顯示換算與錢包帳本不在此設定。</p></div></div>
      <div class="settlement-settings-grid"><article><span>定價／報價貨幣</span><strong>{{pricingCurrency === 'HKD' ? '港幣（HKD）' : '人民幣（RMB）'}}</strong><small>同一項設定，由「車型與定價 → 距離定價」管理；變更貨幣標籤不代表既有金額已換匯。</small></article><article><span>結算貨幣</span><strong>{{settlementCurrency}}（固定）</strong><small>目前固定為人民幣；此處不提供切換，也不改動既有結算金額。</small></article><article><span>乘客付款幣別設定</span><strong>{{paymentCurrencies.join(' ／ ')}}</strong><small>RMB 固定保留，HKD 可儲存為允許幣別；尚未接入實際付款流程。</small></article></div>
      <div class="settlement-settings-notice">目前儲存的付款幣別是後台配置，尚不代表乘客可按該幣別實際支付。顯示貨幣未三端統一；錢包餘額仍按原帳本幣別處理，歷史交易保留原幣與金額。</div>
      <div class="settlement-settings-subsection"><div class="settlement-settings-heading"><div><h2>乘客付款幣別配置</h2><p class="muted">後台可保存允許幣別；實際付款與跨幣別換算尚未接通。</p></div><span class="settlement-settings-badge">僅保存設定</span></div><div class="settlement-payment-row"><span>人民幣（RMB）</span><span class="settlement-currency-fixed">固定啟用</span></div><div class="settlement-payment-row"><span id="settlement-hkd-currency">港幣（HKD）</span><button type="button" class="settlement-currency-switch" role="switch" :aria-checked="paymentCurrencies.includes('HKD')" aria-labelledby="settlement-hkd-currency" :disabled="!canWrite" @click="togglePaymentCurrency('HKD')"><span class="settlement-currency-switch-track" aria-hidden="true"><span class="settlement-currency-switch-thumb"></span></span><span class="settlement-currency-switch-label">{{paymentCurrencies.includes('HKD') ? '已啟用' : '已停用'}}</span></button></div><div class="settlement-method-actions"><button type="button" class="primary" :disabled="!canWrite" @click="savePaymentSettings">儲存付款幣別設定</button><span v-if="paymentSettingsSaved" class="success-hint">設定已儲存</span></div></div>
      <div class="settlement-settings-subsection"><div class="settlement-settings-heading"><div><h2>乘客付款方式</h2><p class="muted">付款方式按付款幣別分組；目前只保存共用開關，幣別專屬方式仍待付款流程接入。</p></div><span class="settlement-settings-badge">配置展示</span></div><div class="settlement-currency-method-grid"><article><div class="settlement-currency-card-heading"><h3>人民幣（RMB）</h3><span>付款幣別</span></div><div class="settlement-method-list"><span>車費錢包</span><span>微信支付</span><span>支付寶</span><span>銀行卡</span></div></article><article><div class="settlement-currency-card-heading"><h3>港幣（HKD）</h3><span>付款幣別</span></div><div class="settlement-method-list"><span>港幣錢包</span><span>FPS 轉數快</span><span>銀行卡</span></div></article></div><div class="settlement-payment-group"><h3>現有付款設定（不分幣別）</h3><p class="muted">以下開關保留原有功能，不代表上述幣別配置已生效。</p><div v-for="method in [{ key: 'fareBalancePayEnabled', label: '車費餘額' }, { key: 'cashBalancePayEnabled', label: '現金餘額' }, { key: 'wechatPayEnabled', label: '微信支付' }, { key: 'alipayPayEnabled', label: '支付寶' }, { key: 'bankCardPayEnabled', label: '銀行卡' }]" :key="method.key" class="settlement-payment-row"><span :id="'settlement-' + method.key">{{method.label}}</span><label class="switch"><AdminCheckbox v-model="paymentSettings[method.key]" :disabled="!canWrite" :aria-labelledby="'settlement-' + method.key"/><span class="slider" aria-hidden="true"></span></label></div></div><div class="settlement-method-actions"><button type="button" class="primary" :disabled="!canWrite" @click="savePaymentSettings">儲存付款設定</button><span v-if="paymentSettingsSaved" class="success-hint">設定已儲存</span></div></div>
      <div class="settlement-settings-subsection"><div class="settlement-settings-heading"><div><h2>司機提現方式</h2><p class="muted">依實際收款幣別分開呈現可用提現方式；目前只整合畫面，不接入新的設定資料。</p></div><span class="settlement-settings-badge">UI 規劃</span></div><div class="settlement-currency-method-grid"><article><div class="settlement-currency-card-heading"><h3>人民幣（RMB）</h3><span>收款幣別</span></div><div class="settlement-method-list"><span>微信支付</span><span>支付寶</span><span>銀行卡</span></div></article><article><div class="settlement-currency-card-heading"><h3>港幣（HKD）</h3><span>收款幣別</span></div><div class="settlement-method-list"><span>FPS 轉數快</span><span>銀行卡</span></div></article></div><small class="muted">司機個人的提現方式與帳戶資料仍沿用目前結算功能。</small></div>
    </div>
  </template>
    <div v-if="selectedSettlementTrip" class="settlement-detail-overlay" @click.self="closeSettlementDetail">
      <aside ref="detailDrawer" class="settlement-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="settlement-detail-title" tabindex="-1" @keydown="handleDetailKeydown">
        <div class="settlement-detail-header"><div class="settlement-detail-heading-copy"><span class="eyebrow">ORDER DETAIL</span><h2 id="settlement-detail-title">{{formatOrderNumber(selectedSettlementTrip.id)}}</h2><span class="muted">司機訂單與結算資料</span></div><button ref="detailCloseButton" type="button" class="secondary settlement-close-action" aria-label="關閉訂單詳細" @click="closeSettlementDetail">關閉</button></div>
        <div class="settlement-detail-body">
          <section class="settlement-detail-section" aria-labelledby="settlement-detail-people-title"><div class="settlement-detail-section-heading"><h3 id="settlement-detail-people-title">訂單資料</h3><span class="settlement-status" :class="selectedSettlementTrip.settlement ? 'settled' : 'unsettled'">{{selectedSettlementTrip.settlement ? '已結算' : '待結算'}}</span></div><div class="settlement-detail-grid settlement-detail-people-grid">
            <article><span>司機</span><strong>{{settlementDriverFor(selectedSettlementTrip)?.name || '—'}}</strong><small>{{settlementDriverFor(selectedSettlementTrip)?.phone || '—'}}</small></article>
            <article><span>乘客</span><strong>{{selectedSettlementTrip.user?.name || selectedSettlementTrip.user?.displayName || selectedSettlementTrip.user?.phoneNumber || '—'}}</strong><small>{{selectedSettlementTrip.user?.phone || '—'}}</small></article>
            <article><span>訂單狀態</span><strong>{{formatTripStatus(selectedSettlementTrip.status)}}</strong><small>完成時間：{{formatDate(selectedSettlementTrip.completedAt || selectedSettlementTrip.updatedAt, true)}}</small></article>
          </div></section>
          <section class="settlement-detail-section" aria-labelledby="settlement-detail-route-title"><div class="settlement-detail-section-heading"><h3 id="settlement-detail-route-title">行程路線</h3></div><article class="settlement-detail-route"><div><span>出發地</span><strong>{{selectedSettlementTrip.origin || '—'}}</strong></div><div><span>目的地</span><strong>{{selectedSettlementTrip.destination || '—'}}</strong></div></article></section>
          <section class="settlement-detail-section" aria-labelledby="settlement-detail-amount-title"><div class="settlement-detail-section-heading"><h3 id="settlement-detail-amount-title">金額與結算</h3></div><div class="settlement-detail-grid settlement-detail-amount-grid">
            <article><span>訂單金額</span><strong>{{selectedSettlementTrip.payment?.currency || selectedSettlementTrip.driverPayoutCurrency || 'HKD'}} {{Number(selectedSettlementTrip.payment?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong><small>付款狀態：{{formatPaymentStatus(selectedSettlementTrip.payment?.status)}}</small></article>
            <article class="settlement-detail-payout"><span>司機應付金額</span><strong>{{selectedSettlementTrip.driverPayoutCurrency || 'HKD'}} {{Number(selectedSettlementTrip.driverPayoutAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong><small>收款方式：{{selectedSettlementTrip.settlement?.method || settlementMethods[selectedSettlementTrip.id] || settlementDriverFor(selectedSettlementTrip)?.settlementMethod || '尚未設定'}}</small></article>
          </div></section>
        </div>
        <div class="settlement-detail-footer"><small v-if="selectedSettlementTrip.settlement">結算時間：{{formatDate(selectedSettlementTrip.settlement.settledAt, true)}}</small><small v-else>此訂單尚未完成結算</small></div>
      </aside>
    </div>
  </section>`
}
