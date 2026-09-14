import { inject } from 'vue'

export const PromotionsPage = {
  name: 'PromotionsPage',
  setup() {
    return inject('adminContext')
  },
  template: String.raw`<section v-if="view==='promotions'" class="promotion-admin">
  <div class="promotion-summary">
    <article class="summary-card" :class="{ active: promotionFilterTab === 'CAMPAIGN' }" @click="promotionFilterTab = (promotionFilterTab === 'CAMPAIGN' ? 'ALL' : 'CAMPAIGN')">
      <div>
        <span>折扣活動</span>
        <strong>{{promotions.filter(item => item.kind === 'CAMPAIGN').length}}</strong>
      </div>
    </article>
    <article class="summary-card" :class="{ active: promotionFilterTab === 'COUPON' }" @click="promotionFilterTab = (promotionFilterTab === 'COUPON' ? 'ALL' : 'COUPON')">
      <div>
        <span>優惠碼</span>
        <strong>{{promotions.filter(item => item.kind === 'COUPON').length}}</strong>
      </div>
    </article>
    <article class="summary-card" :class="{ active: promotionFilterTab === 'MEMBER' }" @click="promotionFilterTab = (promotionFilterTab === 'MEMBER' ? 'ALL' : 'MEMBER')">
      <div>
        <span>會員專屬</span>
        <strong>{{promotions.filter(item => item.kind === 'MEMBER').length}}</strong>
      </div>
    </article>
  </div>

  <div class="panel">
    <div class="admin-toolbar promo-toolbar">
      <div>
        <h2>優惠功能設定</h2>
        <span class="muted">簡化設定流程，輕鬆管理折扣活動、優惠碼與會員專屬優惠</span>
      </div>
      <div class="promotion-add-actions">
        <button type="button" class="add-btn campaign-btn" @click="resetPromotion('CAMPAIGN')">＋ 新增活動</button>
        <button type="button" class="add-btn coupon-btn" @click="resetPromotion('COUPON')">＋ 新增優惠碼</button>
        <button type="button" class="add-btn member-btn" @click="resetPromotion('MEMBER')">＋ 新增會員優惠</button>
      </div>
    </div>

    <div class="promo-filter-bar">
      <div class="promo-tabs">
        <button type="button" :class="{ active: promotionFilterTab === 'ALL' }" @click="promotionFilterTab = 'ALL'">全部 ({{promotions.length}})</button>
        <button type="button" :class="{ active: promotionFilterTab === 'CAMPAIGN' }" @click="promotionFilterTab = 'CAMPAIGN'">折扣活動 ({{promotions.filter(i => i.kind === 'CAMPAIGN').length}})</button>
        <button type="button" :class="{ active: promotionFilterTab === 'COUPON' }" @click="promotionFilterTab = 'COUPON'">優惠碼 ({{promotions.filter(i => i.kind === 'COUPON').length}})</button>
        <button type="button" :class="{ active: promotionFilterTab === 'MEMBER' }" @click="promotionFilterTab = 'MEMBER'">會員專屬 ({{promotions.filter(i => i.kind === 'MEMBER').length}})</button>
        <button type="button" :class="{ active: promotionFilterTab === 'ACTIVE' }" @click="promotionFilterTab = 'ACTIVE'">已啟用 ({{promotions.filter(i => i.enabled !== false).length}})</button>
      </div>
      <div class="promo-search">
        <input v-model="promotionSearchQuery" placeholder="搜尋名稱 / 優惠碼 / 城市..." />
      </div>
    </div>

    <div v-if="promotionForm" class="promo-form-container">
      <div class="promo-form-card">
        <div class="promo-form-header">
          <div class="modal-title-group">
            <h3>{{ promotionForm.id ? '編輯優惠設定' : '建立新優惠' }}</h3>
            <span class="promo-kind-badge" :class="promotionForm.kind.toLowerCase()">{{ promotionKindLabel(promotionForm.kind) }}</span>
          </div>
          <button type="button" class="close-btn" @click="promotionForm = null">X</button>
        </div>

        <form class="promo-modal-form" @submit.prevent="savePromotion">
          <div class="form-section">
            <div class="section-title">基本設定</div>
            <div class="form-grid">
              <label class="form-group col-span-2">
                <span class="label-text">優惠名稱 <span class="required">*</span></span>
                <input v-model="promotionForm.name" placeholder="例如：春季出行88折優惠" required />
              </label>

              <label class="form-group">
                <span class="label-text">優惠類型</span>
                <select v-model="promotionForm.kind">
                  <option value="CAMPAIGN">折扣活動</option>
                  <option value="COUPON">優惠碼</option>
                  <option value="MEMBER">會員專屬</option>
                </select>
              </label>

              <label class="form-group switch-group">
                <span class="label-text">啟用狀態</span>
                <div class="toggle-wrapper">
                  <input id="promo-enabled-toggle" v-model="promotionForm.enabled" type="checkbox" class="toggle-checkbox" />
                  <label for="promo-enabled-toggle" class="toggle-label"></label>
                  <span class="toggle-text">{{ promotionForm.enabled ? '已啟用' : '已停用' }}</span>
                </div>
              </label>

              <template v-if="promotionForm.kind === 'COUPON'">
                <label class="form-group col-span-2">
                  <span class="label-text">優惠碼 (Coupon Code) <span class="required">*</span></span>
                  <div class="code-input-group">
                    <input v-model.trim="promotionForm.couponCode" class="promotion-code-input" placeholder="例如：SUMMER88" required />
                    <button type="button" class="btn-gen-code" @click="generateRandomCouponCode">隨機生成</button>
                  </div>
                </label>
                <label class="form-group">
                  <span class="label-text">使用次數上限</span>
                  <input v-model="promotionForm.usageLimit" type="number" min="1" step="1" placeholder="不限次數（選填）" />
                </label>
              </template>

              <template v-if="promotionForm.kind === 'MEMBER'">
                <label class="form-group col-span-2">
                  <span class="label-text">適用會員等級 <span class="required">*</span></span>
                  <select v-model="promotionForm.membershipLevel" required>
                    <option value="" disabled>請選擇會員等級</option>
                    <option v-for="plan in membershipPlans" :key="plan.level" :value="plan.level">{{plan.name}}（{{plan.level}}）</option>
                  </select>
                </label>
              </template>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">折扣與計價規則</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">優惠方式</span>
                <select v-model="promotionForm.discountType">
                  <option value="PERCENTAGE">總金額打折（百分比）</option>
                  <option value="FIXED_AMOUNT">現金券（固定折抵金額）</option>
                  <option value="TOTAL_PRICE">折後固定總價</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">
                  {{promotionForm.discountType === 'PERCENTAGE' ? '折扣百分比（%）' : promotionForm.discountType === 'TOTAL_PRICE' ? '折後應付總價' : '現金券折抵金額'}} <span class="required">*</span>
                </span>
                <input v-model.number="promotionForm.discountValue" type="number" min="0.01" :max="promotionForm.discountType === 'PERCENTAGE' ? 100 : undefined" step="0.01" :placeholder="promotionForm.discountType === 'PERCENTAGE' ? '例如 10 代表減 10%' : '例如 50 代表折抵 50'" required />
              </label>

              <label class="form-group">
                <span class="label-text">計價幣別</span>
                <input :value="pricingCurrency === 'HKD' ? 'HKD$（系統定價貨幣）' : 'RMB¥（系統定價貨幣）'" readonly />
              </label>

              <label class="form-group">
                <span class="label-text">優惠組合（疊加模式）</span>
                <select v-model="promotionForm.stackingMode">
                  <option value="NONE">不可與其他優惠合併</option>
                  <option value="PERCENTAGE_AND_VOUCHER">百分比優惠＋現金券可合併</option>
                  <option value="ALL">可與所有優惠合併</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">優先級 (數字越小越優先)</span>
                <input v-model.number="promotionForm.priority" type="number" step="1" placeholder="預設 0" />
              </label>

              <div class="form-group col-span-full help-banner">
                <b>規則說明：</b> {{promotionDiscountHint}} {{promotionStackingHint}}
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">使用門檻與限制</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">最低消費門檻</span>
                <input v-model.number="promotionForm.minimumSpend" type="number" min="0" step="0.01" placeholder="0 代表無門檻" />
              </label>

              <label class="form-group">
                <span class="label-text">最高折抵上限</span>
                <input v-model="promotionForm.maximumDiscount" type="number" min="0.01" step="0.01" placeholder="不限上限（選填）" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">適用路線與地區</div>
            <div class="form-grid">
              <label class="form-group">
                <span class="label-text">出發地區</span>
                <select v-model="promotionForm.originRegion">
                  <option value="">不限出發地區</option>
                  <option>香港</option>
                  <option>澳門</option>
                  <option>大陸</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">出發城市</span>
                <input v-model.trim="promotionForm.originCity" placeholder="指定城市（例如：深圳市）" />
              </label>

              <label class="form-group">
                <span class="label-text">目的地區</span>
                <select v-model="promotionForm.destinationRegion">
                  <option value="">不限目的地區</option>
                  <option>香港</option>
                  <option>澳門</option>
                  <option>大陸</option>
                </select>
              </label>

              <label class="form-group">
                <span class="label-text">目的城市</span>
                <input v-model.trim="promotionForm.destinationCity" placeholder="指定城市（例如：廣州市）" />
              </label>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">適用時間與週期</div>
            <div class="form-grid">
              <div class="form-group col-span-full">
                <span class="label-text">適用星期</span>
                <div class="weekday-selector">
                  <div class="weekday-presets">
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('ALL')">全選</button>
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('WORKDAYS')">工作日 (一~五)</button>
                    <button type="button" class="preset-chip" @click="setWeekdaysPreset('WEEKENDS')">週末 (六~日)</button>
                    <button type="button" class="preset-chip secondary" @click="setWeekdaysPreset('CLEAR')">清空</button>
                  </div>
                  <div class="weekday-chips">
                    <button type="button" v-for="day in [1,2,3,4,5,6,7]" :key="day"
                      class="day-chip" :class="{ selected: isWeekdaySelected(day) }"
                      @click="toggleWeekday(day)">
                      {{ ['週一','週二','週三','週四','週五','週六','週日'][day-1] }}
                    </button>
                  </div>
                </div>
              </div>

              <label class="form-group">
                <span class="label-text">每日開始時間</span>
                <input v-model="promotionForm.timeStart" type="time" />
              </label>

              <label class="form-group">
                <span class="label-text">每日結束時間</span>
                <input v-model="promotionForm.timeEnd" type="time" />
              </label>

              <label class="form-group">
                <span class="label-text">活動開始日期時間</span>
                <input v-model="promotionForm.startsAt" type="datetime-local" />
              </label>

              <label class="form-group">
                <span class="label-text">活動結束日期時間</span>
                <input v-model="promotionForm.endsAt" type="datetime-local" />
              </label>
            </div>
          </div>

          <div class="promo-modal-actions">
            <button type="button" class="btn-cancel" @click="promotionForm = null">取消</button>
            <button type="submit" class="btn-save" :disabled="promotionSaving">{{promotionSaving ? '儲存中…' : '儲存優惠設定'}}</button>
          </div>
        </form>
      </div>
    </div>

    <div class="promo-table-wrapper">
      <table>
        <thead>
          <tr>
            <th>優惠名稱 / 類型</th>
            <th>折扣內容</th>
            <th>使用條件 & 路線</th>
            <th>適用時間與週期</th>
            <th>啟用狀態</th>
            <th style="text-align: right;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filteredPromotions.length">
            <td colspan="6" class="muted promotion-empty">
              {{ promotionSearchQuery ? '查無符合條件的優惠' : '尚未建立優惠' }}
            </td>
          </tr>
          <tr v-for="item in filteredPromotions" :key="item.id" :class="{ disabled: !item.enabled }">
            <td>
              <div class="promo-name-cell">
                <strong class="promo-title">{{item.name}}</strong>
                <div class="promo-tags">
                  <span class="kind-tag" :class="item.kind.toLowerCase()">{{promotionKindLabel(item.kind)}}</span>
                  <span v-if="item.couponCode" class="code-tag">{{item.couponCode}}</span>
                  <span v-if="item.membershipLevel" class="member-tag">{{item.membershipLevel}}</span>
                  <span v-if="item.priority" class="priority-tag">優先級: {{item.priority}}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="discount-cell">
                <strong class="discount-val">{{promotionDiscountLabel(item)}}</strong>
                <span v-if="item.maximumDiscount" class="muted-info">最高折抵 {{item.currency}}{{item.maximumDiscount}}</span>
                <span v-if="item.stackingMode !== 'NONE'" class="stacking-badge">可疊加</span>
              </div>
            </td>
            <td>
              <div class="condition-cell">
                <div><span>最低門檻:</span> <strong>{{ item.minimumSpend > 0 ? (item.currency + item.minimumSpend) : '無門檻' }}</strong></div>
                <div class="muted-info">
                  <span v-if="item.usageLimit">使用數: {{item.usageCount || 0}} / {{item.usageLimit}} 次</span>
                  <span v-else>使用數: {{item.usageCount || 0}} 次 (不限次)</span>
                </div>
                <div class="route-tag">{{ formatRouteText(item) }}</div>
              </div>
            </td>
            <td>
              <div class="validity-cell">
                <div class="weekday-summary">{{ formatWeekdaysText(item.weekdays) }}</div>
                <div v-if="formatTimeRangeText(item)" class="time-summary">{{ formatTimeRangeText(item) }}</div>
                <div class="date-range muted-info">
                  {{item.startsAt ? formatDate(item.startsAt, true) : '即日起'}} ~ {{item.endsAt ? formatDate(item.endsAt, true) : '長期'}}
                </div>
              </div>
            </td>
            <td>
              <button type="button" class="status-toggle-btn" :class="item.enabled ? 'is-active' : 'is-inactive'" :disabled="promotionTogglingId === item.id" @click="togglePromotionEnabled(item)" title="點擊快速切換狀態">
                <span class="status-dot"></span>
                {{item.enabled ? '已啟用' : '已停用'}}
              </button>
            </td>
            <td class="row-actions" style="text-align: right;">
              <button type="button" class="action-btn edit-btn" @click="editPromotion(item)">編輯</button>
              <button type="button" class="action-btn clone-btn" @click="duplicatePromotion(item)">複製</button>
              <button type="button" class="action-btn danger-btn" :disabled="promotionDeletingId === item.id" @click="removePromotion(item)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>`
}
