import { inject } from 'vue'

export const PromotionsPage = {
  name: 'PromotionsPage',
  setup() {
    return inject('adminPromotionsContext')
  },
  template: String.raw`<section v-if="view==='promotions'" class="promotion-admin">
  <div class="promotion-page-heading">
    <div>
      <span class="eyebrow">PROMOTION MANAGEMENT</span>
      <h2>優惠設定</h2>
      <p class="muted">管理折扣活動、優惠碼與會員專屬優惠</p>
    </div>
  </div>
  <div class="promotion-section-tabs" role="tablist" aria-label="優惠設定分類">
    <button type="button" :class="{ active: promotionSection === 'PROMOTIONS' }" @click="promotionSection = 'PROMOTIONS'">優惠方案</button>
    <button type="button" :class="{ active: promotionSection === 'MILEAGE' }" @click="promotionSection = 'MILEAGE'">會員里程</button>
    <button type="button" :class="{ active: promotionSection === 'INVITATIONS' }" @click="promotionSection = 'INVITATIONS'">邀請好友</button>
  </div>
  <div v-if="promotionSection === 'PROMOTIONS'" class="promotion-summary">
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

  <div v-if="promotionSection === 'PROMOTIONS'" class="panel">
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

  <template v-if="promotionSection === 'MILEAGE'">
    <div class="mileage-admin-grid">
      <section class="panel mileage-rule-panel">
        <div class="mileage-panel-heading">
          <div><span class="eyebrow">EARNING RULE</span><h3>里程累積規則</h3></div>
          <button type="button" class="add-btn campaign-btn" :disabled="!canWrite || mileageSaving" @click="saveMileageRules">保存規則</button>
        </div>
        <div class="mileage-rule-form">
          <label class="form-group"><span class="label-text">每 1 KM 所需消費金額</span><input v-model.number="mileageRules.spendPerKm" type="number" min="0.01" max="100000" step="0.01" /></label>
          <label class="form-group"><span class="label-text">里程有效期（月）</span><input v-model.number="mileageRules.validityMonths" type="number" min="1" max="120" step="1" /></label>
        </div>
        <p class="mileage-rule-preview">會員每消費 {{mileageRules.spendPerKm}} 元累積 1 KM，入帳後 {{mileageRules.validityMonths}} 個月到期。</p>
      </section>
      <section class="panel mileage-stat-panel">
        <span>會員數</span><strong>{{mileageAccounts.length}}</strong><small>全部會員（含 0 KM）</small>
        <span>兌換品</span><strong>{{mileageRewards.filter(item => item.enabled).length}} / {{mileageRewards.length}}</strong><small>啟用 / 全部</small>
      </section>
    </div>

    <section class="panel">
      <div class="admin-toolbar promo-toolbar">
        <div><h2>里程兌換品</h2><span class="muted">管理成本、庫存及兌換後使用的優惠</span></div>
        <button type="button" class="add-btn coupon-btn" :disabled="!canWrite" @click="resetMileageReward">＋ 新增兌換品</button>
      </div>
      <div v-if="mileageRewardForm" class="mileage-reward-editor">
        <div class="mileage-panel-heading"><h3>{{mileageRewardForm.id ? '編輯兌換品' : '新增兌換品'}}</h3><button type="button" class="close-btn" @click="mileageRewardForm = null">X</button></div>
        <form class="mileage-reward-form" @submit.prevent="saveMileageReward">
          <label class="form-group"><span class="label-text">名稱</span><input v-model.trim="mileageRewardForm.name" required /></label>
          <label class="form-group"><span class="label-text">所需 KM</span><input v-model.number="mileageRewardForm.cost" type="number" min="1" step="1" required /></label>
          <label class="form-group"><span class="label-text">庫存（留空為不限）</span><input v-model="mileageRewardForm.stock" type="number" min="0" step="1" /></label>
          <label class="form-group"><span class="label-text">關聯優惠</span><select v-model="mileageRewardForm.promotionId"><option value="">不關聯</option><option v-for="promo in promotions.filter(item => item.kind === 'COUPON')" :key="promo.id" :value="promo.id">{{promo.name}}（{{promo.couponCode}}）</option></select></label>
          <label class="form-group col-span-2"><span class="label-text">說明</span><input v-model.trim="mileageRewardForm.description" required /></label>
          <label class="form-group"><span class="label-text">顯示優惠面額</span><input v-model="mileageRewardForm.couponValue" type="number" min="0.01" step="0.01" /></label>
          <label class="form-group switch-group"><span class="label-text">啟用</span><input v-model="mileageRewardForm.enabled" type="checkbox" /></label>
          <div class="mileage-form-actions"><button type="button" class="btn-cancel" @click="mileageRewardForm = null">取消</button><button type="submit" class="btn-save" :disabled="mileageSaving">保存兌換品</button></div>
        </form>
      </div>
      <div class="promo-table-wrapper"><table><thead><tr><th>兌換品</th><th>所需里程</th><th>庫存 / 已兌換</th><th>關聯優惠</th><th>狀態</th><th style="text-align:right">操作</th></tr></thead><tbody>
        <tr v-if="!mileageRewards.length"><td colspan="6" class="promotion-empty">尚未建立兌換品</td></tr>
        <tr v-for="item in mileageRewards" :key="item.id" :class="{ disabled: !item.enabled }"><td><strong>{{item.name}}</strong><div class="muted-info">{{item.description}}</div></td><td><strong>{{item.cost}} KM</strong></td><td>{{item.stock === null ? '不限' : item.stock}} / {{item._count.redemptions}}</td><td>{{item.promotion?.name || '未關聯'}}</td><td><button type="button" class="status-toggle-btn" :class="item.enabled ? 'is-active' : 'is-inactive'" :disabled="!canWrite || mileageSaving" @click="toggleMileageReward(item)"><span class="status-dot"></span>{{item.enabled ? '已啟用' : '已停用'}}</button></td><td class="row-actions" style="text-align:right"><button type="button" class="action-btn edit-btn" :disabled="!canWrite" @click="editMileageReward(item)">編輯</button><button type="button" class="action-btn danger-btn" :disabled="!canWrite" @click="removeMileageReward(item)">刪除</button></td></tr>
      </tbody></table></div>
    </section>

    <section class="panel">
      <div class="admin-toolbar promo-toolbar"><div><h2>會員里程帳戶</h2><span class="muted">查詢餘額、終身累積及人工調整記錄</span></div><div class="promo-search"><input v-model="mileageSearchQuery" placeholder="搜尋會員姓名或電話" /></div></div>
      <div class="promo-table-wrapper"><table><thead><tr><th>會員</th><th>會員等級</th><th>可用里程</th><th>累積 / 已兌換</th><th>最後更新</th><th style="text-align:right">操作</th></tr></thead><tbody>
        <tr v-if="!mileageAccounts.length"><td colspan="6" class="promotion-empty">尚無里程帳戶</td></tr>
        <tr v-for="account in mileageAccounts.filter(item => !mileageSearchQuery || (item.user.name + item.user.countryCode + item.user.phoneNumber).toLowerCase().includes(mileageSearchQuery.toLowerCase()))" :key="account.id"><td><strong>{{account.user.name}}</strong><div class="muted-info">{{account.user.countryCode}} {{account.user.phoneNumber}}</div></td><td>{{account.user.membershipLevel || '一般會員'}}</td><td><strong>{{account.balance}} KM</strong></td><td>{{account.lifetimeEarned}} / {{account.lifetimeRedeemed}}</td><td>{{formatDate(account.updatedAt, true)}}</td><td class="row-actions" style="text-align:right"><button type="button" class="action-btn edit-btn" @click="openMileageAccount(account)">查看 / 調整</button></td></tr>
      </tbody></table></div>
    </section>

    <section v-if="mileageSelectedAccount" class="panel mileage-account-detail">
      <div class="mileage-panel-heading"><div><h3>{{mileageSelectedAccount.user.name}}的里程流水</h3><span class="muted">目前餘額 {{mileageSelectedAccount.balance}} KM</span></div><button type="button" class="close-btn" @click="mileageSelectedAccount = null; mileageLedger = []">X</button></div>
      <form v-if="canWrite" class="mileage-adjust-form" @submit.prevent="adjustMileage(mileageSelectedAccount)"><label class="form-group"><span class="label-text">調整里程（扣除請輸入負數）</span><input v-model.number="mileageSelectedAccount.adjustmentAmount" type="number" step="1" required /></label><label class="form-group"><span class="label-text">調整原因</span><input v-model.trim="mileageSelectedAccount.adjustmentReason" required /></label><button type="submit" class="btn-save" :disabled="mileageSaving">確認調整</button></form>
      <div class="promo-table-wrapper"><table><thead><tr><th>時間</th><th>類型</th><th>原因</th><th>變動</th><th>結餘</th></tr></thead><tbody><tr v-if="!mileageLedger.length"><td colspan="5" class="promotion-empty">尚無流水</td></tr><tr v-for="item in mileageLedger" :key="item.id"><td>{{formatDate(item.createdAt, true)}}</td><td>{{item.type}}</td><td>{{item.reason}}</td><td :class="item.amount > 0 ? 'mileage-positive' : 'mileage-negative'">{{item.amount > 0 ? '+' : ''}}{{item.amount}} KM</td><td>{{item.balanceAfter}} KM</td></tr></tbody></table></div>
    </section>
  </template>

  <template v-if="promotionSection === 'INVITATIONS'">
    <div class="invitation-summary-grid">
      <article><span>待完成首趟</span><strong>{{invitationSummary.pending}}</strong></article>
      <article><span>已發放獎勵</span><strong>{{invitationSummary.rewarded}}</strong></article>
      <article><span>已失效</span><strong>{{invitationSummary.expired}}</strong></article>
    </div>

    <section class="panel invitation-settings-panel">
      <div class="mileage-panel-heading">
        <div><span class="eyebrow">REFERRAL PROGRAM</span><h3>邀請活動設定</h3></div>
        <button type="button" class="add-btn campaign-btn" :disabled="!canWrite || invitationSaving" @click="saveInvitationSettings">{{invitationSaving ? '保存中…' : '保存設定'}}</button>
      </div>
      <div class="invitation-status-row">
        <div><strong>邀請好友功能</strong><p>{{invitationSettings.enabled ? '新會員可使用邀請碼綁定活動' : '已停止接受新的邀請碼綁定，既有邀請仍按原規則履約'}}</p></div>
        <label class="toggle-wrapper"><input v-model="invitationSettings.enabled" type="checkbox" class="toggle-checkbox" :disabled="!canWrite" /><span class="toggle-label"></span><span class="toggle-text">{{invitationSettings.enabled ? '已開啟' : '已關閉'}}</span></label>
      </div>
      <div class="invitation-setting-grid">
        <label class="form-group"><span class="label-text">邀請人里程獎勵（KM）</span><input v-model.number="invitationSettings.inviterMileage" type="number" min="0" max="1000000" step="1" :disabled="!canWrite" /></label>
        <label class="form-group"><span class="label-text">受邀人車資餘額（{{invitationWalletCurrency}}）</span><input v-model.number="invitationSettings.inviteeFare" type="number" min="0" max="1000000" step="0.01" :disabled="!canWrite" /></label>
        <label class="form-group"><span class="label-text">首趟完成期限（日）</span><input v-model.number="invitationSettings.qualificationDays" type="number" min="1" max="365" step="1" :disabled="!canWrite" /></label>
        <label class="form-group"><span class="label-text">獎勵里程有效期（月）</span><input v-model.number="invitationSettings.mileageValidityMonths" type="number" min="1" max="120" step="1" :disabled="!canWrite" /></label>
      </div>
      <p class="invitation-setting-note">車資獎勵固定同步目前錢包結算貨幣 {{invitationWalletCurrency}}。設定保存後只套用於新建立的邀請，既有邀請保留建立時的獎勵與期限。</p>
    </section>

    <section class="panel">
      <div class="admin-toolbar promo-toolbar">
        <div><h2>邀請紀錄</h2><span class="muted">查詢邀請關係、達標狀態及實際獎勵快照</span></div>
        <div class="invitation-record-filters"><select v-model="invitationStatusFilter"><option value="ALL">全部狀態</option><option value="REGISTERED">待完成首趟</option><option value="REWARDED">已發放</option><option value="EXPIRED">已失效</option></select><input v-model.trim="invitationSearchQuery" placeholder="搜尋邀請人、受邀人或邀請碼" /></div>
      </div>
      <div class="promo-table-wrapper"><table><thead><tr><th>邀請人</th><th>受邀人</th><th>邀請碼</th><th>獎勵快照</th><th>期限</th><th>狀態</th></tr></thead><tbody>
        <tr v-if="!invitationRecords.length"><td colspan="6" class="promotion-empty">尚無邀請紀錄</td></tr>
        <tr v-for="item in invitationRecords.filter(record => (invitationStatusFilter === 'ALL' || record.status === invitationStatusFilter) && (!invitationSearchQuery || ((record.inviter.displayName || record.inviter.name || record.inviter.phoneNumber) + (record.invitee.displayName || record.invitee.name || record.invitee.phoneNumber) + record.code).toLowerCase().includes(invitationSearchQuery.toLowerCase())))" :key="item.id">
          <td><strong>{{item.inviter.displayName || item.inviter.name || '未命名會員'}}</strong><div class="muted-info">{{item.inviter.phoneNumber}}</div></td>
          <td><strong>{{item.invitee.displayName || item.invitee.name || '未命名會員'}}</strong><div class="muted-info">{{item.invitee.phoneNumber}}</div></td>
          <td><strong>{{item.code}}</strong><div class="muted-info">{{formatDate(item.createdAt, true)}}</div></td>
          <td>{{item.inviterMileageReward}} KM / {{item.rewardCurrency}} {{item.inviteeFareReward}}</td>
          <td>{{formatDate(item.expiresAt, true)}}<div class="muted-info">{{item.qualificationDays}} 日</div></td>
          <td><span class="invitation-status" :class="item.status.toLowerCase()">{{item.status === 'REWARDED' ? '已發放' : item.status === 'EXPIRED' ? '已失效' : '待完成首趟'}}</span></td>
        </tr>
      </tbody></table></div>
    </section>
  </template>
</section>`
}
