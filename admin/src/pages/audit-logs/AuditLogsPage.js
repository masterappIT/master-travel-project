import { inject } from 'vue'

export const AuditLogsPage = {
  name: 'AuditLogsPage',
  setup() {
    return inject('adminAccessContext')
  },
  template: String.raw`<section v-if="view==='auditLogs'" class="panel"><table><thead><tr><th>時間</th><th>管理員</th><th>操作</th><th>結果</th><th>IP</th></tr></thead><tbody><tr v-for="item in auditLogs" :key="item.id"><td>{{formatDate(item.createdAt,true)}}</td><td>{{item.username}}</td><td><b>{{item.action}}</b><br/><span class="muted">{{item.resource}}</span></td><td><span class="status" :class="item.status === 'SUCCESS' ? 'completed' : 'cancelled'">{{item.status}}</span></td><td>{{item.ip || '—'}}</td></tr></tbody></table></section>`
}
