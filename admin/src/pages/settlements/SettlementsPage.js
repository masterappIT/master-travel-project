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

    return {
      ...context,
      detailDrawer,
      detailCloseButton,
      openSettlementDetail,
      closeSettlementDetail,
      handleDetailKeydown,
      formatTripStatus,
      formatPaymentStatus
    }
  },
  template: String.raw`<section v-if="view==='settlements'" class="settlements-page">
    <div class="settlement-heading">
      <div><span class="eyebrow">DRIVER FINANCE</span><h1>結算管理</h1><p class="muted">核對已完成行程的司機應付金額及收款結算狀態</p></div>
      <button type="button" class="secondary" @click="load">更新資料</button>
    </div>
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
