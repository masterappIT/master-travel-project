import { inject } from 'vue'

export const SettlementsPage = {
  name: 'SettlementsPage',
  setup() { return inject('adminSettlementsContext') },
  template: String.raw`<section v-if="view==='settlements'" class="settlements-page">
    <div class="settlement-heading">
      <div><span class="eyebrow">DRIVER FINANCE</span><h1>結算管理</h1><p class="muted">核對已完成行程的司機應付金額及收款結算狀態</p></div>
      <button type="button" class="secondary" @click="load">更新資料</button>
    </div>
    <div class="settlement-summary-grid">
      <article><span>可結算行程</span><strong>{{eligibleSettlements.length}}</strong><small>已完成且已指派司機</small></article>
      <article class="is-warning"><span>待結算</span><strong>{{unsettledSettlements.length}}</strong><small>{{formatSettlementTotal(unsettledSettlements)}}</small></article>
      <article class="is-success"><span>已結算</span><strong>{{settledSettlements.length}}</strong><small>{{formatSettlementTotal(settledSettlements)}}</small></article>
    </div>
    <div class="panel settlement-list-panel">
      <div class="settlement-toolbar">
        <div><h2>結算紀錄</h2><span class="muted">金額與狀態同步司機端</span></div>
        <div class="settlement-filters">
          <input v-model="settlementSearchQuery" placeholder="搜尋訂單、司機或路線" aria-label="搜尋結算紀錄"/>
          <select v-model="settlementStatusFilter" aria-label="結算狀態"><option value="ALL">全部狀態</option><option value="UNSETTLED">待結算</option><option value="SETTLED">已結算</option></select>
        </div>
      </div>
      <div class="settlement-table-wrap"><table class="settlement-table"><thead><tr><th>訂單／完成時間</th><th>司機</th><th>應付金額</th><th>結算方式</th><th>狀態</th><th>操作</th></tr></thead><tbody>
        <tr v-for="trip in pagedSettlements" :key="trip.id">
          <td><strong>{{formatOrderNumber(trip.id)}}</strong><small>{{formatDate(trip.completedAt || trip.updatedAt, true)}}</small></td>
          <td><strong>{{settlementDriverFor(trip)?.name || '—'}}</strong><small>{{settlementDriverFor(trip)?.phone || '—'}}</small></td>
          <td><strong>{{trip.driverPayoutCurrency || 'HKD'}} {{Number(trip.driverPayoutAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong></td>
          <td><span v-if="trip.settlement">{{trip.settlement.method}}</span><select v-else v-model="settlementMethods[trip.id]" :disabled="!canWrite" class="settlement-method-select"><option value="" disabled>選擇收款方式</option><option value="微信支付">微信支付</option><option value="支付寶">支付寶</option><option value="FPS 轉數快">FPS 轉數快</option></select><small v-if="!trip.settlement && !settlementDriverFor(trip)?.settlementMethod" class="settlement-method-warning">司機尚未設定結算方式</small></td>
          <td><span class="settlement-status" :class="trip.settlement ? 'settled' : 'unsettled'">{{trip.settlement ? '已結算' : '待結算'}}</span><small v-if="trip.settlement">{{formatDate(trip.settlement.settledAt, true)}}</small></td>
          <td class="settlement-actions"><button type="button" class="settlement-view-action" @click="openSettlementDetail(trip)">查看詳情</button><button v-if="!trip.settlement && canWrite" type="button" class="settlement-primary-action" :disabled="!settlementMethods[trip.id]" @click="settleTrip(trip, settlementMethods[trip.id])">確認結算</button><button v-else-if="trip.settlement && canWrite" type="button" class="settlement-secondary-action" @click="unsettleTrip(trip)">撤銷結算</button><span v-else>—</span></td>
        </tr>
        <tr v-if="!filteredSettlements.length"><td colspan="6" class="settlement-empty">沒有符合條件的結算紀錄</td></tr>
      </tbody></table></div>
      <div v-if="settlementPageCount > 1" class="pagination-controls"><button type="button" :disabled="settlementPage===1" @click="goToSettlementPage(settlementPage-1)">上一頁</button><span>第 {{settlementPage}} / {{settlementPageCount}} 頁</span><button type="button" :disabled="settlementPage===settlementPageCount" @click="goToSettlementPage(settlementPage+1)">下一頁</button></div>
    </div>
    <aside v-if="selectedSettlementTrip" class="panel trip-detail-panel settlement-trip-detail-panel" role="dialog" aria-modal="true" aria-label="訂單詳細">
      <div class="admin-toolbar"><div><span class="eyebrow">ORDER DETAIL</span><h2>{{formatOrderNumber(selectedSettlementTrip.id)}}</h2><span class="muted">司機訂單與結算資料</span></div><button type="button" class="secondary trip-detail-close" aria-label="關閉訂單詳細" @click="closeSettlementDetail">關閉</button></div>
      <div class="settlement-detail-grid">
        <article><span>司機</span><strong>{{settlementDriverFor(selectedSettlementTrip)?.name || '—'}}</strong><small>{{settlementDriverFor(selectedSettlementTrip)?.phone || '—'}}</small></article>
        <article><span>乘客</span><strong>{{selectedSettlementTrip.user?.name || selectedSettlementTrip.user?.displayName || selectedSettlementTrip.user?.phoneNumber || '—'}}</strong><small>{{selectedSettlementTrip.user?.phone || '—'}}</small></article>
        <article><span>訂單狀態</span><strong>{{selectedSettlementTrip.status || '—'}}</strong><small>完成時間：{{formatDate(selectedSettlementTrip.completedAt || selectedSettlementTrip.updatedAt, true)}}</small></article>
        <article class="settlement-detail-route"><span>行程路線</span><strong>{{selectedSettlementTrip.origin || '—'}}</strong><small>→ {{selectedSettlementTrip.destination || '—'}}</small></article>
        <article><span>訂單金額</span><strong>{{selectedSettlementTrip.payment?.currency || selectedSettlementTrip.driverPayoutCurrency || 'HKD'}} {{Number(selectedSettlementTrip.payment?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong><small>付款狀態：{{selectedSettlementTrip.payment?.status || '—'}}</small></article>
        <article class="settlement-detail-payout"><span>司機應付金額</span><strong>{{selectedSettlementTrip.driverPayoutCurrency || 'HKD'}} {{Number(selectedSettlementTrip.driverPayoutAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}}</strong><small>收款方式：{{selectedSettlementTrip.settlement?.method || settlementMethods[selectedSettlementTrip.id] || settlementDriverFor(selectedSettlementTrip)?.settlementMethod || '尚未設定'}}</small></article>
      </div>
      <div class="settlement-detail-footer"><span class="settlement-status" :class="selectedSettlementTrip.settlement ? 'settled' : 'unsettled'">{{selectedSettlementTrip.settlement ? '已結算' : '待結算'}}</span><small v-if="selectedSettlementTrip.settlement">結算時間：{{formatDate(selectedSettlementTrip.settlement.settledAt, true)}}</small></div>
    </aside>
  </section>`
}
