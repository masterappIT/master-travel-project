import { inject } from 'vue'

export const MembershipPage = {
  name: 'MembershipPage',
  setup() {
    return inject('adminMembershipContext')
  },
  template: String.raw`<section v-if="view==='membership'" class="editor-section membership-management">
    <div class="membership-page-heading">
      <div><span class="eyebrow">MEMBERSHIP</span><h2>會員方案</h2><p class="muted">管理會員定價、乘車券及里程回贈，並處理待確認的會員訂單。</p></div>
      <button type="button" class="membership-primary-action" @click="resetMembership">＋ 新增方案</button>
    </div>
    <div class="membership-summary" aria-label="會員方案摘要">
      <article><span>方案總數</span><strong>{{membershipPlans.length}}</strong><small>個會員方案</small></article>
      <article><span>啟用中</span><strong>{{membershipPlans.filter(item => item.enabled).length}}</strong><small>目前可供訂閱</small></article>
      <article><span>待處理訂單</span><strong>{{membershipOrders.filter(item => item.status === 'PENDING').length}}</strong><small>筆等待確認</small></article>
    </div>
    <div class="panel membership-plan-panel">
      <div class="membership-section-heading"><div><h3>方案設定</h3><p>比較價格與會員權益，點選編輯即可調整方案。</p></div><span>{{membershipPlans.length}} 個方案</span></div>
      <div class="membership-table-wrap"><table class="membership-plan-table"><thead><tr><th>方案</th><th>收費</th><th>每期回贈</th><th>主要權益</th><th>狀態</th><th>操作</th></tr></thead><tbody>
        <tr v-for="item in membershipPlans" :key="item.id"><td><div class="membership-plan-identity"><span class="membership-plan-mark">{{item.name.slice(0,1)}}</span><div><strong>{{item.name}}</strong><small>{{item.level}} · {{item.id}}</small></div><span v-if="item.recommended" class="membership-recommended">推薦</span></div></td><td><div class="membership-price"><strong>{{item.currency}} {{item.monthly}}</strong><span>每月</span><small>{{item.currency}} {{item.yearly}}／年</small></div></td><td><strong>{{item.voucherCount}} 張乘車券</strong><small class="membership-cell-note">里程 {{item.mileageRate}}×</small></td><td><span class="membership-benefits">{{formatBenefits(item) || '尚未設定權益'}}</span></td><td><span class="membership-status" :class="item.enabled ? 'is-enabled' : 'is-disabled'"><i></i>{{item.enabled ? '啟用中' : '已停用'}}</span></td><td class="row-actions membership-row-actions"><button type="button" class="membership-edit-action" @click="editMembership(item)">編輯</button><button v-if="item.enabled" type="button" class="membership-disable-action" @click="removeMembership(item)">停用</button></td></tr>
        <tr v-if="!membershipPlans.length"><td colspan="6"><div class="membership-empty"><strong>尚未建立會員方案</strong><span>新增第一個方案，開始設定會員價格與權益。</span></div></td></tr>
      </tbody></table></div>
    </div>
    <div class="panel membership-order-panel">
      <div class="membership-section-heading"><div><h3>會員訂單</h3><p>核對付款後確認啟用，待處理訂單會優先顯示。</p></div><span>{{membershipOrders.length}} 筆訂單</span></div>
      <div class="membership-table-wrap"><table class="membership-order-table"><thead><tr><th>會員</th><th>訂閱方案</th><th>週期</th><th>金額</th><th>狀態</th><th>建立時間</th><th>操作</th></tr></thead><tbody>
        <tr v-for="item in membershipOrders" :key="item.id"><td><strong>{{item.user.displayName||item.user.name||'會員'}}</strong><small class="membership-cell-note">{{item.user.phoneNumber}}</small></td><td>{{item.plan.name}}</td><td>{{item.billingPeriod==='MONTHLY'?'月付':'年付'}}</td><td><strong>{{item.currency}} {{item.amount}}</strong></td><td><span class="membership-order-status" :class="item.status.toLowerCase()">{{item.status==='PENDING'?'待確認':item.status==='PAID'?'已啟用':'已取消'}}</span></td><td>{{new Date(item.createdAt).toLocaleString('zh-HK')}}</td><td class="row-actions"><button v-if="item.status==='PENDING'" type="button" class="membership-confirm-action" @click="confirmMembershipOrder(item)">確認收款</button><span v-else class="muted">已處理</span></td></tr>
        <tr v-if="!membershipOrders.length"><td colspan="7"><div class="membership-empty"><strong>暫無會員訂單</strong><span>新訂單建立後會顯示在這裡。</span></div></td></tr>
      </tbody></table></div>
    </div>
    <div v-if="membershipForm" class="modal-backdrop" @click.self="membershipForm=null"><form class="record-form membership-form" @submit.prevent="saveMembership">
      <div class="membership-form-heading"><div><span class="eyebrow">{{membershipForm.id ? 'EDIT PLAN' : 'NEW PLAN'}}</span><h3>{{membershipForm.id ? '編輯會員方案' : '新增會員方案'}}</h3><p class="muted">設定方案識別、價格與每期會員權益。</p></div><button type="button" class="membership-close-action" aria-label="關閉" @click="membershipForm=null">×</button></div>
      <div class="membership-form-body">
        <div class="membership-form-section"><h4>基本資料</h4><div class="membership-form-grid"><label>方案 ID<input v-model.trim="membershipForm.id" placeholder="例如：premium" required/></label><label>會員等級<input v-model.trim="membershipForm.level" placeholder="例如：PREMIUM" required/></label><label class="membership-field-wide">方案名稱<input v-model.trim="membershipForm.name" placeholder="例如：尊尚會員" required/></label><label class="membership-field-wide">方案說明<input v-model.trim="membershipForm.description" placeholder="簡短說明方案定位與適用會員"/></label></div></div>
        <div class="membership-form-section"><h4>價格與回贈</h4><div class="membership-form-grid membership-form-grid-four"><label>月付金額<input v-model.number="membershipForm.monthly" type="number" min="0" required/></label><label>年付金額<input v-model.number="membershipForm.yearly" type="number" min="0" required/></label><label>每期乘車券<input v-model.number="membershipForm.voucherCount" type="number" min="0" step="1" required/></label><label>里程倍率<input v-model.number="membershipForm.mileageRate" type="number" min="1" max="3" step="0.05" required/></label></div></div>
        <div class="membership-form-section"><h4>權益與顯示</h4><label class="membership-benefits-field">會員權益<textarea v-model="membershipForm.benefits" rows="4" placeholder="每行輸入一項會員權益"></textarea><small>每行一項，將依輸入順序顯示。</small></label><div class="membership-form-options"><label>顯示排序<input v-model.number="membershipForm.order" type="number" min="1"/></label><label class="membership-toggle"><input v-model="membershipForm.recommended" type="checkbox"/><span><strong>推薦方案</strong><small>在會員端加上推薦標示</small></span></label><label class="membership-toggle"><input v-model="membershipForm.enabled" type="checkbox"/><span><strong>啟用方案</strong><small>允許會員選擇此方案</small></span></label></div></div>
        <div class="membership-form-actions"><button type="button" class="secondary" @click="membershipForm=null">取消</button><button type="submit" class="primary">{{membershipForm.id && membershipPlans.some(item => item.id === membershipForm.id) ? '保存修改' : '建立方案'}}</button></div>
      </div>
    </form></div>
  </section>`
}
