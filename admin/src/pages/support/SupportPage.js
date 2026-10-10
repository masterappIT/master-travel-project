import { inject } from 'vue'
import { AdminSelect } from '../../components/AdminSelect.js'
import { SupportButton, SupportInput, SupportToggle } from './SupportControls.js'
import { useSupportPage } from './support.state.js'
import './support.css'

export const SupportPage = {
  name: 'SupportPage',
  components: { AdminSelect, SupportButton, SupportInput, SupportToggle },
  setup() {
    return useSupportPage(inject('adminSupportContext'))
  },
  template: String.raw`
    <section class="support-management" aria-labelledby="support-page-title">
      <div class="support-heading">
        <div>
          <span class="support-kicker">CUSTOMER SUPPORT</span>
          <h2 id="support-page-title">客服管理</h2>
          <p>集中處理乘客、司機與訪客的諮詢，並透過電話號碼或帳戶 ID 主動聯繫。</p>
        </div>
        <span class="support-connection-status" :class="{ 'is-enabled': serviceEnabled }" role="status"><span aria-hidden="true"></span> {{serviceEnabled ? '客服服務已啟用' : '客服服務已停用'}}</span>
      </div>

      <div class="support-notice" role="status">
        <strong>共用客服收件匣</strong>
        <span>文字對話已接入；圖片訊息尚未開放。</span>
      </div>
      <p v-if="actionError" class="support-error" role="alert">{{actionError}}</p>

      <div class="support-tabs" role="tablist" aria-label="客服管理分頁" @keydown="onTabKeydown">
        <SupportButton id="support-tab-inbox" role="tab" :aria-selected="section === 'inbox'" aria-controls="support-panel-inbox" :tabindex="section === 'inbox' ? 0 : -1" :tone="section === 'inbox' ? 'tab-active' : 'tab'" @click="section = 'inbox'">對話收件箱</SupportButton>
        <SupportButton id="support-tab-outbound" role="tab" :aria-selected="section === 'outbound'" aria-controls="support-panel-outbound" :tabindex="section === 'outbound' ? 0 : -1" :tone="section === 'outbound' ? 'tab-active' : 'tab'" @click="section = 'outbound'">主動聯繫</SupportButton>
        <SupportButton id="support-tab-settings" role="tab" :aria-selected="section === 'settings'" aria-controls="support-panel-settings" :tabindex="section === 'settings' ? 0 : -1" :tone="section === 'settings' ? 'tab-active' : 'tab'" @click="section = 'settings'">客服設定</SupportButton>
      </div>

      <div v-if="section === 'inbox'" id="support-panel-inbox" class="support-workspace" :class="{ 'is-detail': selectedId }" role="tabpanel" aria-labelledby="support-tab-inbox">
        <div class="support-conversation-panel" aria-label="客服對話清單">
          <div class="support-panel-heading"><div><span class="support-kicker">INBOX</span><h3>全部對話</h3></div><span class="support-count" :aria-label="filteredConversations.length + ' 筆對話'">{{filteredConversations.length}}</span></div>
          <label class="support-search"><span>搜尋對話</span><SupportInput v-model="search" type="search" placeholder="帳戶 ID 或對話 ID"/></label>
          <div class="support-filter" role="group" aria-label="對話對象">
            <SupportButton v-for="item in [{ id: 'ALL', label: '全部' }, { id: 'PASSENGER', label: '乘客' }, { id: 'DRIVER', label: '司機' }, { id: 'GUEST', label: '訪客' }]" :key="item.id" :tone="audience === item.id ? 'filter-active' : 'filter'" :aria-pressed="audience === item.id" @click="audience = item.id">{{item.label}}</SupportButton>
          </div>
          <p v-if="inboxError" class="support-error" role="alert">對話清單讀取失敗：{{inboxError}} <SupportButton tone="compact" @click="loadInbox">重試</SupportButton></p>
          <p v-if="inboxLoading && !inboxLoaded" class="support-list-state" role="status">正在載入對話…</p>
          <div v-else-if="inboxLoaded && !inboxError && !filteredConversations.length" class="support-list-empty"><div class="support-empty-icon" aria-hidden="true">✉</div><strong>{{search.trim() || audience !== 'ALL' ? '沒有符合條件的對話' : '暫無對話'}}</strong></div>
          <div v-if="inboxLoaded" class="support-conversation-list" role="group" aria-label="對話列表">
            <SupportButton v-for="item in filteredConversations" :key="item.id" tone="conversation" :aria-current="selectedId === item.id ? 'true' : undefined" @click="selectConversation(item.id)"><strong>{{participantLabel(item.participantType)}} · {{item.participantId || '訪客對話'}}</strong><small>{{item.lastMessageAt ? formatTime(item.lastMessageAt) : '尚無訊息'}}</small><span v-if="!item.participantId" class="support-conversation-id">對話 {{item.id}}</span></SupportButton>
          </div>
        </div>

        <div class="support-detail-panel">
          <div class="support-detail-header"><SupportButton class="support-mobile-back" tone="compact" @click="backToInbox">← 對話列表</SupportButton><div><span class="support-kicker">CONVERSATION</span><h3>對話內容</h3></div><span class="support-detail-placeholder">{{selectedId ? '對話 ' + selectedId : '尚未選取'}}</span></div>
          <div v-if="!selectedId" class="support-detail-empty"><div class="support-empty-icon" aria-hidden="true">◌</div><strong>選取對話以查看訊息</strong></div>
          <article v-if="selectedId" class="support-participant-card" aria-label="對話對象資訊"><div class="support-participant-card-heading"><div><span class="support-kicker">{{selectedConversation?.participantType === 'DRIVER' ? 'DRIVER PROFILE' : selectedConversation?.participantType === 'GUEST' ? 'GUEST PROFILE' : 'PASSENGER PROFILE'}}</span><h4>{{selectedConversation?.participantType === 'DRIVER' ? '司機資料' : selectedConversation?.participantType === 'GUEST' ? '訪客資料' : '乘客資料'}}</h4></div><span class="support-participant-status">{{participantProfileLoading ? '載入中…' : participantProfileError ? '資料暫不可用' : '已連結'}}</span></div><div v-if="participantProfile" class="support-participant-grid"><div><span>姓名</span><strong>{{participantProfile.displayName || participantProfile.name || '未提供'}}</strong></div><div><span>帳戶 ID</span><strong>{{participantProfile.id || selectedConversation.participantId}}</strong></div><template v-if="selectedConversation?.participantType === 'DRIVER'"><div><span>港澳號碼</span><strong>{{driverRegionalPhone(participantProfile, 'regional')}}</strong></div><div><span>內地號碼</span><strong>{{driverRegionalPhone(participantProfile, 'mainland')}}</strong></div><div><span>司機狀態</span><strong>{{participantProfile.isOnline ? '在線' : participantProfile.enabled === false ? '已停用' : '離線'}}</strong></div></template><div v-else><span>電話</span><strong>{{participantPhone(participantProfile)}}</strong></div></div><div v-else class="support-participant-grid"><div><span>對話對象</span><strong>{{selectedConversation?.participantType === 'GUEST' ? '訪客' : selectedConversation?.participantType === 'DRIVER' ? '司機' : '乘客'}}</strong></div><div><span>帳戶 ID</span><strong>{{selectedConversation?.participantId || '未提供'}}</strong></div></div></article>
          <div v-if="selectedId" ref="messageListElement" class="support-message-list" role="log" aria-label="對話訊息" aria-live="polite"><p v-if="messagesError" class="support-error" role="alert">訊息讀取失敗：{{messagesError}} <SupportButton tone="compact" @click="selectConversation(selectedId, false)">重試</SupportButton></p><p v-if="messagesLoading && !messagesLoaded" role="status">正在載入訊息…</p><p v-else-if="messagesLoaded && !messages.length">暫無訊息</p><article v-for="item in messages" :key="item.id" class="support-message" :class="{ 'is-staff': staffMessage(item.senderType) }"><div class="support-message-meta"><strong>{{senderLabel(item.senderType)}}</strong><time :datetime="item.createdAt">{{formatTime(item.createdAt)}}</time></div><p>{{item.text}}</p></article></div>
          <div class="support-composer"><div class="support-composer-heading"><label for="support-reply-draft">回覆訊息</label><span>按 Enter 發送</span></div><div class="support-composer-row"><SupportInput id="support-reply-draft" v-model="draft" type="text" maxlength="4000" placeholder="輸入文字回覆" :disabled="!canWrite || !selectedId || !serviceEnabled || busy" @keyup.enter="sendReply"/><SupportButton class="support-send-button" tone="primary" :disabled="!canWrite || !serviceEnabled || !selectedId || !draft.trim() || busy" @click="sendReply">{{busy ? '發送中…' : '發送'}}</SupportButton></div><span class="support-composer-note">圖片訊息尚未開放</span></div>
        </div>
      </div>

      <div v-else-if="section === 'outbound'" id="support-panel-outbound" class="support-outbound" role="tabpanel" aria-labelledby="support-tab-outbound">
          <div class="support-outbound-heading"><span class="support-kicker">START CONVERSATION</span><h3>主動聯繫</h3><p>先選擇乘客或司機，再用電話號碼或帳戶 ID 找到現有帳戶。選取或輸入帳戶後即可開啟對話，實際權限與帳戶查核仍由後端處理。</p></div>
        <div class="support-outbound-form">
          <div class="support-recipient-types" role="group" aria-label="聯繫對象身份">
            <SupportButton :tone="recipientType === 'PASSENGER' ? 'filter-active' : 'filter'" :aria-pressed="recipientType === 'PASSENGER'" @click="recipientType = 'PASSENGER'; resetRecipientSearch()">乘客</SupportButton>
            <SupportButton :tone="recipientType === 'DRIVER' ? 'filter-active' : 'filter'" :aria-pressed="recipientType === 'DRIVER'" @click="recipientType = 'DRIVER'; resetRecipientSearch()">司機</SupportButton>
          </div>
          <div class="support-recipient-mode" role="group" aria-label="查找方式">
            <SupportButton :tone="recipientLookupMode === 'PHONE' ? 'filter-active' : 'filter'" :aria-pressed="recipientLookupMode === 'PHONE'" @click="recipientLookupMode = 'PHONE'; resetRecipientSearch()">電話號碼</SupportButton>
            <SupportButton :tone="recipientLookupMode === 'ID' ? 'filter-active' : 'filter'" :aria-pressed="recipientLookupMode === 'ID'" @click="recipientLookupMode = 'ID'; resetRecipientSearch()">帳戶 ID</SupportButton>
          </div>
          <div v-if="recipientLookupMode === 'PHONE'" class="support-recipient-phone-field"><span>{{recipientLabel}}電話號碼</span><div class="support-recipient-phone-input"><AdminSelect custom class="support-recipient-country" v-model="recipientCountryCode" aria-label="選擇區號" :disabled="!canWrite || !serviceEnabled || recipientSearching"><option value="+852">香港 +852</option><option value="+853">澳門 +853</option><option value="+86">中國內地 +86</option></AdminSelect><SupportInput v-model.trim="recipientPhone" type="tel" inputmode="numeric" placeholder="輸入本地電話號碼" autocomplete="tel-national" :disabled="!canWrite || !serviceEnabled || recipientSearching" @keyup.enter="searchRecipients"/></div></div>
          <label v-else class="support-recipient-id"><span>{{recipientLabel}}帳戶 ID</span><SupportInput v-model.trim="recipientId" placeholder="輸入現有帳戶 ID" autocomplete="off" :disabled="!canWrite || !serviceEnabled || recipientSearching" @keyup.enter="openRecipient"/></label>
          <div v-if="recipientLookupMode === 'PHONE'" class="support-outbound-actions"><span>先選區號，再輸入本地電話號碼。</span><SupportButton tone="primary" :disabled="!canWrite || !serviceEnabled || !recipientPhone.trim() || recipientSearching" @click="searchRecipients">{{recipientSearching ? '查找中…' : '查找帳戶'}}</SupportButton></div>
          <p v-if="recipientSearchError" class="support-error" role="alert">{{recipientSearchError}}</p>
          <div v-if="recipientLookupMode === 'PHONE' && recipientSearchPerformed && !recipientSearching && !recipientSearchError && !recipientOptions.length" class="support-recipient-results support-list-empty"><strong>找不到符合電話號碼的{{recipientLabel}}帳戶</strong><span>請確認電話格式，或改用其他已登記電話。</span></div>
          <div v-else-if="recipientLookupMode === 'PHONE' && recipientOptions.length" class="support-recipient-results" role="listbox" :aria-label="recipientLabel + '查找結果'">
            <p class="support-recipient-results-heading">選取一個帳戶後開始對話</p>
            <SupportButton v-for="item in recipientOptions" :key="item.id" tone="conversation" role="option" :aria-selected="recipientId === item.id" :aria-current="recipientId === item.id ? 'true' : undefined" @click="selectRecipient(item)"><strong>{{recipientDisplayName(item)}}</strong><small>{{formatRecipientPhone(item)}}</small><span class="support-conversation-id">帳戶 ID：{{item.id}}</span></SupportButton>
          </div>
          <div class="support-outbound-actions support-outbound-actions--confirm"><span>{{recipientId ? '已選取帳戶，可開始對話。' : recipientLookupMode === 'PHONE' ? '選取帳戶後才能開始對話。' : '輸入帳戶 ID 後即可開始對話。'}}</span><SupportButton tone="primary" :disabled="!canWrite || !serviceEnabled || !recipientId.trim() || busy" @click="openRecipient">{{busy ? '開啟中…' : '開始對話'}}</SupportButton></div>
        </div>
        <div class="support-outbound-note"><strong>身份驗證</strong><p>電話號碼或帳戶 ID 只用來查找現有帳戶；API 會再次驗證乘客／司機帳戶和管理員權限，查找本身不會授予讀取對話的權限。</p></div>
      </div>

      <div v-else id="support-panel-settings" class="support-settings" role="tabpanel" aria-labelledby="support-tab-settings">
        <div class="support-settings-heading"><div><span class="support-kicker">SERVICE CONFIGURATION</span><h3>客服功能設定</h3><p>獨立客服帳戶由 SUPER_ADMIN 建立；已授權管理員也可在此處處理同一收件匣。</p></div><span class="support-settings-scope">{{isSuperAdministrator ? 'SUPER_ADMIN 可編輯' : '目前帳戶唯讀'}}</span></div>
        <div class="support-settings-grid">
          <article class="support-setting-card support-setting-card--primary"><div><strong>啟用內置客服</strong><p>開啟後，乘客端、司機端與後台客服入口才會進入可接通狀態。</p></div><SupportToggle v-model="settingsDraft.enabled" label="啟用內置客服" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>訪客客服</strong><p>允許未登入乘客以訪客識別進入客服。</p></div><SupportToggle v-model="settingsDraft.guestEnabled" label="訪客客服" :disabled="!canWrite || !isSuperAdministrator"/></article>
          <article class="support-setting-card"><div><strong>直接聯繫</strong><p>允許客服以電話號碼或帳戶 ID 查找乘客／司機帳戶後開始對話。</p></div><SupportToggle v-model="settingsDraft.directContactEnabled" label="直接聯繫" :disabled="!canWrite || !isSuperAdministrator"/></article>
        </div>
        <p class="support-pending-note">訂單／行程關聯及圖片訊息尚未接入對話，暫不提供啟用選項。目前媒體上傳 API 的實際上限為 10 MB。</p>
        <div class="support-settings-footer"><span v-if="settingsSaved" class="support-settings-saved" role="status">設定已儲存</span><SupportButton tone="primary" :disabled="!canWrite || !isSuperAdministrator || savingSettings" @click="saveSettings">{{savingSettings ? '儲存中…' : '儲存客服設定'}}</SupportButton></div>
        <div v-if="isSuperAdministrator" class="support-agent-management"><h3>獨立客服帳戶</h3><p v-if="agentsError" class="support-error" role="alert">帳戶清單讀取失敗：{{agentsError}} <SupportButton tone="compact" @click="loadAgents">重試</SupportButton></p><p v-if="agentsLoading && !agentsLoaded" role="status">正在載入客服帳戶…</p><div class="support-agent-form"><label>帳號<SupportInput v-model="agentForm.username" autocomplete="off" :disabled="!canWrite || busy"/></label><label>顯示名稱<SupportInput v-model="agentForm.displayName" :disabled="!canWrite || busy"/></label><label>初始密碼<SupportInput v-model="agentForm.password" type="password" autocomplete="new-password" :disabled="!canWrite || busy"/></label><SupportButton tone="primary" :disabled="!canWrite || busy || Boolean(agentActionId) || !agentForm.username.trim() || !agentForm.displayName.trim() || !agentForm.password" @click="createAgent">{{busy ? '建立中…' : '建立帳戶'}}</SupportButton></div><p v-if="agentsLoaded && !agentsLoading && !agentsError && !agents.length" class="support-list-state">尚無獨立客服帳戶</p><div v-for="agent in agents" :key="agent.id" class="support-agent-row"><span>{{agent.displayName}} · {{agent.username}} · {{agent.enabled ? '已啟用' : '已停用'}}</span><SupportButton :tone="agent.enabled ? 'danger' : 'secondary'" :disabled="!canWrite || Boolean(agentActionId) || busy" @click="setAgentEnabled(agent)">{{agentActionId === agent.id ? '處理中…' : agent.enabled ? '停用' : '啟用'}}</SupportButton></div></div>
      </div>
    </section>`
}
