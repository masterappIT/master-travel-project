import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const methodLabels = { GET: '查看', POST: '新增', PUT: '更新', PATCH: '更新', DELETE: '刪除' }
const statusLabels = { SUCCESS: '成功', FAILED: '失敗' }
const resourceLabels = [
  ['/admin/auth', '登入與帳戶'],
  ['/admin/administrators', '管理員'],
  ['/admin/audit-logs', '操作日誌'],
  ['/admin/users', '使用者'],
  ['/admin/drivers', '司機'],
  ['/admin/trips', '行程'],
  ['/admin/charter-orders', '商務包車'],
  ['/admin/vehicles', '車輛'],
  ['/admin/notifications', '通知'],
  ['/admin/promotions', '優惠'],
  ['/admin/membership', '會員方案'],
  ['/admin/addresses', '推薦地址'],
  ['/admin/settings', '系統設定']
]

function cleanResource(value = '') {
  return value.split('?')[0] || '—'
}

function resourceLabel(item) {
  const resource = cleanResource(item.resource)
  return resourceLabels.find(([prefix]) => resource.startsWith(prefix))?.[1] || '後台資源'
}

function actionLabel(item) {
  if (item.action === 'LOGIN') return '登入後台'
  return `${methodLabels[item.method] || item.method || '操作'}${resourceLabel(item)}`
}

export const AuditLogsPage = {
  name: 'AuditLogsPage',
  setup() {
    const context = inject('adminAccessContext')
    const search = context.auditSearch
    const statusFilter = context.auditStatusFilter
    const methodFilter = context.auditMethodFilter
    const page = context.auditPage
    const pageSize = 20
    const selectedLog = ref(null)
    const detailDrawer = ref(null)
    const detailCloseButton = ref(null)
    let detailTrigger = null

    const filteredLogs = computed(() => context.auditLogs.value)
    const pageCount = context.auditPageCount
    const pagedLogs = computed(() => context.auditLogs.value)
    const successCount = computed(() => context.auditSummary.value.success ?? context.auditSummary.value.SUCCESS ?? 0)
    const failedCount = computed(() => context.auditSummary.value.failed ?? context.auditSummary.value.FAILED ?? 0)

    watch([search, statusFilter, methodFilter], () => { page.value = 1 })

    function openDetail(item, event) {
      detailTrigger = event?.currentTarget || null
      selectedLog.value = item
      document.body.style.overflow = 'hidden'
      nextTick(() => detailCloseButton.value?.focus())
    }
    function closeDetail() {
      selectedLog.value = null
      document.body.style.overflow = ''
      nextTick(() => detailTrigger?.focus())
    }
    function handleKeydown(event) {
      if (!selectedLog.value) return
      if (event.key === 'Escape') {
        closeDetail()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...detailDrawer.value?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    onMounted(() => document.addEventListener('keydown', handleKeydown))
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
    })

    return {
      ...context,
      search,
      statusFilter,
      methodFilter,
      page,
      filteredLogs,
      pagedLogs,
      pageCount,
      successCount,
      failedCount,
      selectedLog,
      detailDrawer,
      detailCloseButton,
      cleanResource,
      resourceLabel,
      actionLabel,
      statusLabel: status => statusLabels[status] || status,
      openDetail,
      closeDetail
    }
  },
  template: String.raw`
    <section v-if="view==='auditLogs'" class="audit-log-page">
      <header class="audit-log-heading">
        <div><span class="audit-log-eyebrow">SECURITY & ACCOUNTABILITY</span><h2>操作日誌</h2><p>追蹤管理員在後台的存取與操作結果。</p></div>
        <button type="button" class="audit-log-refresh" @click="refreshAuditLogs" title="重新整理操作日誌" aria-label="重新整理操作日誌">↻</button>
      </header>

      <div class="audit-log-summary" aria-label="操作日誌摘要">
        <article><span>日誌總數</span><strong>{{auditTotal}}</strong></article>
        <article><span>成功操作</span><strong>{{successCount}}</strong></article>
        <article><span>失敗操作</span><strong>{{failedCount}}</strong></article>
      </div>

      <section class="audit-log-panel">
        <div class="audit-log-toolbar">
          <label class="audit-log-search"><span>搜尋日誌</span><input v-model="search" type="search" placeholder="管理員、操作、資源或 IP" /></label>
          <label><span>操作結果</span><select v-model="statusFilter"><option value="all">全部結果</option><option value="SUCCESS">成功</option><option value="FAILED">失敗</option></select></label>
          <label><span>請求方法</span><select v-model="methodFilter"><option value="all">全部方法</option><option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="PATCH">PATCH</option><option value="DELETE">DELETE</option></select></label>
          <span class="audit-log-result-count"><strong>{{auditTotal}}</strong> 筆結果</span>
        </div>

        <div class="audit-log-table-wrap">
          <table><thead><tr><th>時間</th><th>管理員</th><th>操作</th><th>結果</th><th>來源 IP</th><th><span class="sr-only">詳細</span></th></tr></thead><tbody>
            <tr v-for="item in pagedLogs" :key="item.id">
              <td class="audit-log-time">{{formatDate(item.createdAt,true)}}</td>
              <td><strong class="audit-log-admin">{{item.username || 'anonymous'}}</strong></td>
              <td><div class="audit-log-action"><strong>{{actionLabel(item)}}</strong><span><code>{{item.method || '—'}}</code>{{cleanResource(item.resource)}}</span></div></td>
              <td><span class="audit-log-status" :class="item.status === 'SUCCESS' ? 'is-success' : 'is-failed'"><i></i>{{statusLabel(item.status)}}</span></td>
              <td><code class="audit-log-ip">{{item.ip || '—'}}</code></td>
              <td class="audit-log-detail-cell"><button type="button" class="audit-log-detail-action" @click="openDetail(item, $event)" :aria-label="'查看 ' + actionLabel(item) + ' 詳情'">查看</button></td>
            </tr>
            <tr v-if="!pagedLogs.length"><td colspan="6" class="audit-log-empty"><strong>{{auditLogs.length ? '找不到符合條件的日誌' : '目前沒有操作日誌'}}</strong><span>{{auditLogs.length ? '請調整搜尋內容或篩選條件。' : '管理員操作後，記錄會顯示在這裡。'}}</span></td></tr>
          </tbody></table>
        </div>

        <div v-if="auditTotal > 20" class="audit-log-pagination" aria-label="操作日誌分頁">
          <button type="button" :disabled="page <= 1" @click="page--">上一頁</button><span>第 {{page}} / {{pageCount}} 頁</span><button type="button" :disabled="page >= pageCount" @click="page++">下一頁</button>
        </div>
      </section>

      <div v-if="selectedLog" class="audit-log-overlay" @click.self="closeDetail">
        <aside ref="detailDrawer" class="audit-log-drawer" role="dialog" aria-modal="true" aria-labelledby="audit-log-detail-title" @keydown.esc="closeDetail">
          <header><div><span class="audit-log-eyebrow">LOG DETAIL</span><h2 id="audit-log-detail-title">操作詳情</h2><p>{{formatDate(selectedLog.createdAt,true)}}</p></div><button ref="detailCloseButton" type="button" class="audit-log-close" @click="closeDetail" aria-label="關閉操作詳情">×</button></header>
          <div class="audit-log-detail-body">
            <div class="audit-log-detail-summary">
              <div class="audit-log-detail-summary-top"><span class="audit-log-status" :class="selectedLog.status === 'SUCCESS' ? 'is-success' : 'is-failed'"><i></i>{{statusLabel(selectedLog.status)}}</span><code class="audit-log-method">{{selectedLog.method || '—'}}</code></div>
              <strong>{{actionLabel(selectedLog)}}</strong>
              <code class="audit-log-detail-resource">{{cleanResource(selectedLog.resource)}}</code>
            </div>
            <dl>
              <div><dt>管理員</dt><dd>{{selectedLog.username || 'anonymous'}}</dd></div>
              <div><dt>操作時間</dt><dd>{{formatDate(selectedLog.createdAt,true)}}</dd></div>
              <div><dt>請求方法</dt><dd><code>{{selectedLog.method || '—'}}</code></dd></div>
              <div><dt>資源路徑</dt><dd><code>{{cleanResource(selectedLog.resource)}}</code></dd></div>
              <div><dt>原始操作</dt><dd><code>{{selectedLog.action || '—'}}</code></dd></div>
              <div><dt>來源 IP</dt><dd><code>{{selectedLog.ip || '—'}}</code></dd></div>
              <div><dt>日誌編號</dt><dd><code>{{selectedLog.id}}</code></dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </section>`
}
