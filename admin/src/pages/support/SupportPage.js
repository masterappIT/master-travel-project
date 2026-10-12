import { inject } from 'vue'
import { AdminSelect } from '../../components/AdminSelect.js'
import { SupportButton, SupportInput, SupportTextarea, SupportToggle } from './SupportControls.js'
import { useSupportPage } from './support.state.js'
import './support.css'

export const SupportPage = {
  name: 'SupportPage',
  components: { AdminSelect, SupportButton, SupportInput, SupportTextarea, SupportToggle },
  setup() {
    return useSupportPage(inject('adminSupportContext'))
  },
  template: String.raw`
    <section class="support-management" aria-labelledby="support-page-title">
      <header class="support-heading">
        <div class="support-heading-text">
          <span class="support-kicker">CUSTOMER SUPPORT</span>
          <h2 id="support-page-title">客服管理</h2>
          <p>集中處理乘客、司機與訪客的諮詢，並可主動聯繫現有帳戶。</p>
        </div>
        <div class="support-heading-actions">
          <span class="support-connection-status" :class="{ 'is-enabled': serviceEnabled }" role="status"><span aria-hidden="true"></span> {{serviceEnabled ? '客服服務已啟用' : '客服服務已停用'}}</span>
          <SupportButton v-if="section === 'inbox'" tone="primary" :disabled="!canWrite || !serviceEnabled" @click="openOutbound">＋ 新對話</SupportButton>
          <SupportButton @click="section = section === 'settings' ? 'inbox' : 'settings'">{{section === 'settings' ? '← 返回對話' : '設定'}}</SupportButton>
        </div>
      </header>
      <p v-if="actionError" class="support-error" role="alert">{{actionError}}</p>

      <div v-if="section === 'inbox'" class="support-workspace" :class="{ 'is-detail': selectedId }">
        <div class="support-conversation-panel" aria-label="對話列表">
          <SupportInput v-model="search" type="search" aria-label="搜尋對話" placeholder="搜尋姓名、電話或 ID"/>
          <div class="support-reply-filter" role="group" aria-label="回覆狀態">
            <SupportButton :tone="replyFilter === 'PENDING' ? 'segment-active' : 'segment'" :aria-pressed="replyFilter === 'PENDING'" @click="replyFilter = 'PENDING'">待回覆{{pendingCount ? ' ' + pendingCount : ''}}</SupportButton>
            <SupportButton :tone="replyFilter === 'ALL' ? 'segment-active' : 'segment'" :aria-pressed="replyFilter === 'ALL'" @click="replyFilter = 'ALL'">全部對話</SupportButton>
          </div>
          <div class="support-filter" role="group" aria-label="對象分類">
            <SupportButton v-for="item in audiences" :key="item.id" :tone="audience === item.id ? 'filter-active' : 'filter'" :aria-pressed="audience === item.id" @click="audience = item.id">{{item.label}}<span v-if="audienceCount(item.id)" class="support-filter-count" :aria-label="audienceCount(item.id) + ' 個待回覆'">{{audienceCount(item.id)}}</span></SupportButton>
          </div>
          <p v-if="inboxError" class="support-error" role="alert">對話列表讀取失敗：{{inboxError}} <SupportButton tone="compact" @click="loadInbox">重試</SupportButton></p>
          <p v-if="inboxLoading && !inboxLoaded" class="support-list-state" role="status">正在載入對話…</p>
          <div v-else-if="inboxLoaded && !inboxError && !filteredConversations.length" class="support-list-empty">
            <strong>{{search.trim() ? '沒有符合搜尋的對話' : replyFilter === 'PENDING' ? '目前沒有待回覆的' + (audience === 'ALL' ? '' : participantLabel(audience)) + '對話' : '暫無對話'}}</strong>
            <SupportButton v-if="replyFilter === 'PENDING' && !search.trim() && conversations.length" @click="replyFilter = 'ALL'">查看全部對話</SupportButton>
          </div>
          <div v-if="inboxLoaded && filteredConversations.length" class="support-conversation-list" role="group" aria-label="對話">
            <SupportButton v-for="item in filteredConversations" :key="item.id" tone="conversation" :aria-current="selectedId === item.id ? 'true' : undefined" @click="selectConversation(item.id)">
              <span class="support-conversation-top"><span class="support-type-badge" :class="'support-type-badge--' + item.participantType.toLowerCase()">{{participantLabel(item.participantType)}}</span><strong>{{conversationTitle(item)}}</strong><time v-if="item.lastMessageAt" :datetime="item.lastMessageAt">{{formatShortTime(item.lastMessageAt)}}</time></span>
              <span class="support-conversation-bottom"><span class="support-conversation-preview" :class="{ 'is-pending': item.needsStaffReply }">{{item.lastMessagePreview || '尚無訊息'}}</span><span v-if="item.needsStaffReply" class="support-reply-dot" aria-label="待回覆"></span></span>
              <small v-if="item.participantPhone">{{item.participantPhone}}</small>
            </SupportButton>
          </div>
          <div class="support-panel-footer"><span>僅顯示最近 100 筆對話</span><SupportButton tone="compact" :aria-pressed="alertSound" @click="toggleAlertSound">{{alertSound ? '提示音：開' : '提示音：關'}}</SupportButton></div>
        </div>

        <div class="support-detail-panel" aria-label="對話內容">
          <div v-if="!selectedId" class="support-detail-empty"><strong>選取左側對話以查看訊息</strong></div>
          <template v-else>
            <div class="support-detail-header">
              <SupportButton class="support-mobile-back" tone="compact" aria-label="返回對話列表" @click="backToInbox">←</SupportButton>
              <div class="support-detail-title"><strong><span v-if="selectedConversation" class="support-type-badge" :class="'support-type-badge--' + selectedConversation.participantType.toLowerCase()">{{participantLabel(selectedConversation.participantType)}}</span>{{chatTitle}}</strong><span v-if="chatSubtitle">{{chatSubtitle}}</span></div>
              <SupportButton tone="compact" aria-controls="support-participant-details" :aria-expanded="profileExpanded" @click="profileExpanded = !profileExpanded">{{profileExpanded ? '收起資料' : '詳細資料'}}</SupportButton>
            </div>
            <div v-if="profileExpanded" id="support-participant-details" class="support-participant-grid">
              <p v-if="participantProfileLoading" role="status">正在載入資料…</p>
              <p v-else-if="participantProfileError" class="support-error" role="alert">資料讀取失敗：{{participantProfileError}} <SupportButton tone="compact" @click="retryParticipantProfile">重試</SupportButton></p>
              <template v-if="participantProfile">
                <div><span>姓名</span><strong>{{participantProfile.displayName || participantProfile.name || '未提供'}}</strong></div>
                <template v-if="selectedConversation?.participantType === 'DRIVER'">
                  <div><span>港澳號碼</span><strong>{{driverRegionalPhone(participantProfile, 'regional')}}</strong></div>
                  <div><span>內地號碼</span><strong>{{driverRegionalPhone(participantProfile, 'mainland')}}</strong></div>
                  <div><span>司機狀態</span><strong>{{participantProfile.isOnline ? '在線' : participantProfile.enabled === false ? '已停用' : '離線'}}</strong></div>
                </template>
                <div v-else><span>電話</span><strong>{{participantPhone(participantProfile)}}</strong></div>
              </template>
              <div v-if="selectedConversation?.participantId"><span>帳戶 ID</span><strong>{{selectedConversation.participantId}}</strong></div>
              <div><span>對話 ID</span><strong>{{selectedId}}</strong></div>
            </div>
            <div ref="messageListElement" class="support-message-list" role="log" aria-label="對話訊息" aria-live="polite">
              <p v-if="messagesError" class="support-error" role="alert">訊息讀取失敗：{{messagesError}} <SupportButton tone="compact" @click="selectConversation(selectedId, false)">重試</SupportButton></p>
              <p v-if="messagesLoading && !messagesLoaded" class="support-list-state" role="status">正在載入訊息…</p>
              <p v-else-if="messagesLoaded && !messages.length" class="support-list-state">暫無訊息</p>
              <div v-if="messagesLoaded && hasMoreMessages" class="support-load-older"><SupportButton tone="compact" :disabled="loadingOlder" @click="loadOlderMessages">{{loadingOlder ? '載入中…' : '載入更早的訊息'}}</SupportButton></div>
              <article v-for="item in messages" :key="item.id" class="support-message" :class="{ 'is-staff': staffMessage(item.senderType) }">
                <p>{{item.text}}</p>
                <div class="support-message-meta"><span v-if="staffMessage(item.senderType)">{{senderLabel(item.senderType)}}{{item.senderName ? ' · ' + item.senderName : ''}}</span><time :datetime="item.createdAt">{{formatTime(item.createdAt)}}</time></div>
              </article>
            </div>
            <div class="support-composer">
              <SupportTextarea id="support-reply-draft" v-model="draft" rows="2" maxlength="4000" aria-label="回覆訊息" :placeholder="serviceEnabled ? '輸入回覆（Enter 發送，Shift+Enter 換行）' : '客服服務已停用，無法回覆'" :disabled="!canWrite || !serviceEnabled || busy" @keydown="onComposerKeydown"/>
              <SupportButton class="support-send-button" tone="primary" :disabled="!canWrite || !serviceEnabled || !draft.trim() || busy" @click="sendReply">{{busy ? '發送中…' : '發送'}}</SupportButton>
            </div>
          </template>
        </div>
      </div>

      <div v-else class="support-settings" aria-labelledby="support-settings-title">
        <div class="support-settings-heading"><div><h3 id="support-settings-title">客服功能設定</h3><p>已授權管理員可在此處理共用收件匣；獨立客服帳戶改在管理員帳戶頁建立與管理。</p></div><span class="support-settings-scope">{{isSuperAdministrator ? 'SUPER_ADMIN 可編輯' : '目前帳戶唯讀'}}</span></div>
        <div class="support-settings-grid">
          <article class="support-setting-card support-setting-card--primary"><div><strong>啟用內置客服</strong><p>開啟後，乘客端、司機端與後台客服入口才會進入可接通狀態。</p></div><SupportToggle v-model="settingsDraft.enabled" label="啟用內置客服" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>訪客客服</strong><p>允許未登入乘客以訪客識別進入客服。</p></div><SupportToggle v-model="settingsDraft.guestEnabled" label="訪客客服" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>直接聯繫</strong><p>允許客服以電話號碼或帳戶 ID 查找乘客／司機帳戶後開始對話。</p></div><SupportToggle v-model="settingsDraft.directContactEnabled" label="直接聯繫" :disabled="!canWrite || !isSuperAdministrator"/></article>
        </div>
        <p class="support-pending-note">訂單／行程關聯及圖片訊息尚未接入對話，暫不提供啟用選項。目前媒體上傳 API 的實際上限為 10 MB。</p>
        <div class="support-settings-footer"><span v-if="settingsDirty" class="support-settings-pending" role="status">尚未儲存的變更</span><span v-else-if="settingsSaved" class="support-settings-saved" role="status">設定已儲存</span><SupportButton tone="primary" :disabled="!canWrite || !isSuperAdministrator || savingSettings || !settingsDirty" @click="saveSettings">{{savingSettings ? '儲存中…' : '儲存客服設定'}}</SupportButton></div>
        <div v-if="isSuperAdministrator" class="support-agent-link"><div><strong>獨立客服帳戶</strong><p>建立帳戶、重設密碼、解鎖與強制登出已移至管理員帳戶頁。</p></div><SupportButton @click="navigate('administrators')">前往管理客服帳戶</SupportButton></div>
      </div>

      <div v-if="outboundOpen" class="support-dialog-backdrop" @click.self="closeOutbound" @keydown.esc="closeOutbound">
        <div class="support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-outbound-title">
          <div class="support-dialog-heading"><h3 id="support-outbound-title">新對話</h3><SupportButton tone="compact" aria-label="關閉" :disabled="busy" @click="closeOutbound">✕</SupportButton></div>
          <div class="support-reply-filter" role="group" aria-label="聯繫對象">
            <SupportButton :tone="recipientType === 'PASSENGER' ? 'segment-active' : 'segment'" :aria-pressed="recipientType === 'PASSENGER'" @click="recipientType = 'PASSENGER'; resetRecipientSearch()">乘客</SupportButton>
            <SupportButton :tone="recipientType === 'DRIVER' ? 'segment-active' : 'segment'" :aria-pressed="recipientType === 'DRIVER'" @click="recipientType = 'DRIVER'; resetRecipientSearch()">司機</SupportButton>
          </div>
          <div class="support-reply-filter" role="group" aria-label="查找方式">
            <SupportButton :tone="recipientLookupMode === 'PHONE' ? 'segment-active' : 'segment'" :aria-pressed="recipientLookupMode === 'PHONE'" @click="recipientLookupMode = 'PHONE'; resetRecipientSearch()">用電話查找</SupportButton>
            <SupportButton :tone="recipientLookupMode === 'ID' ? 'segment-active' : 'segment'" :aria-pressed="recipientLookupMode === 'ID'" @click="recipientLookupMode = 'ID'; resetRecipientSearch()">用帳戶 ID</SupportButton>
          </div>
          <div v-if="recipientLookupMode === 'PHONE'" class="support-dialog-row">
            <AdminSelect custom class="support-recipient-country" v-model="recipientCountryCode" aria-label="選擇區號" :disabled="recipientSearching || busy"><option value="+852">香港 +852</option><option value="+853">澳門 +853</option><option value="+86">中國內地 +86</option></AdminSelect>
            <SupportInput ref="outboundFirstField" v-model.trim="recipientPhone" type="tel" inputmode="numeric" :aria-label="recipientLabel + '電話號碼'" placeholder="電話號碼" autocomplete="off" :disabled="recipientSearching || busy" @keyup.enter="searchRecipients"/>
            <SupportButton tone="primary" :disabled="!recipientPhone.trim() || recipientSearching || busy" @click="searchRecipients">{{recipientSearching ? '查找中…' : '查找'}}</SupportButton>
          </div>
          <div v-else class="support-dialog-row">
            <SupportInput ref="outboundFirstField" v-model.trim="recipientId" :aria-label="recipientLabel + '帳戶 ID'" placeholder="帳戶 ID" autocomplete="off" :disabled="busy" @keyup.enter="openRecipient"/>
            <SupportButton tone="primary" :disabled="!recipientId.trim() || busy" @click="openRecipient">{{busy ? '開啟中…' : '開始對話'}}</SupportButton>
          </div>
          <p v-if="recipientSearchError" class="support-error" role="alert">{{recipientSearchError}}</p>
          <p v-if="recipientLookupMode === 'PHONE' && recipientSearchPerformed && !recipientSearching && !recipientSearchError && !recipientOptions.length" class="support-list-state">找不到符合的{{recipientLabel}}帳戶</p>
          <div v-if="recipientLookupMode === 'PHONE' && recipientOptions.length" class="support-conversation-list" role="group" :aria-label="recipientLabel + '查找結果'">
            <SupportButton v-for="item in recipientOptions" :key="item.id" tone="conversation" :disabled="busy" @click="selectRecipient(item)"><span class="support-conversation-top"><strong>{{recipientDisplayName(item)}}</strong></span><small>{{formatRecipientPhone(item)}} · ID {{item.id}}</small></SupportButton>
          </div>
        </div>
      </div>
    </section>`
}
