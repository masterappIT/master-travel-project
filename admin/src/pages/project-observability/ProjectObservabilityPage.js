import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'

export const ProjectObservabilityPage = {
  name: 'ProjectObservabilityPage',
  setup() {
    const context = inject('adminProjectObservabilityContext')
    const events = ref([])
    const eventPage = ref(1)
    const pageSize = 10
    const connected = ref(false)
    const error = ref('')
    const anomalies = ref([])
    const nodeStats = ref({ admin: 0, passenger: 0, driver: 0, backend: 0, service: 0, data: 0 })
    const activeSource = ref('')
    const flowMolecules = ref([])
    const presence = ref({ activity: {}, connections: {}, windowMs: 300000 })
    const persistedRegionStats = ref([])
    const presenceGroups = computed(() => [
      { key: 'driver', label: '司機端在線用戶' },
      { key: 'passenger:web', label: '乘客端 Web 在線用戶' },
      { key: 'passenger:app', label: '乘客端 App 在線用戶' },
      { key: 'passenger:mini-program', label: '乘客端小程序在線用戶' },
      { key: 'passenger:unknown', label: '乘客端未分類在線用戶' }
    ].map(item => ({ ...item, activity: presence.value.activity[item.key] || { count: 0, regions: {} }, connections: presence.value.connections[item.key] || { count: 0, regions: {} } })))
    const updatePresence = item => { if (item?.presence) presence.value = item.presence }

    const flowPaths = {
      admin: 'M500 280 C350 245 220 150 115 100',
      passenger: 'M500 280 C360 300 225 295 105 285',
      driver: 'M500 280 C360 340 230 430 120 465',
      backend: 'M500 280 C650 245 780 150 890 100',
      service: 'M500 280 C650 300 790 295 900 285',
      data: 'M500 280 C650 340 780 430 885 465'
    }
    let moleculeTimer
    const addFlowMolecule = item => {
      const source = item.source in flowPaths ? item.source : 'backend'
      const molecule = { id: `${Date.now()}-${Math.random()}`, source, status: item.status || 'started', path: flowPaths[source] }
      flowMolecules.value = [...flowMolecules.value.slice(-17), molecule]
      clearTimeout(moleculeTimer)
      moleculeTimer = setTimeout(() => { flowMolecules.value = flowMolecules.value.filter(entry => Date.now() - Number(entry.id.split('-')[0]) < 2600) }, 2800)
    }
    const detectAnomaly = item => {
      if (item.type === 'stream:heartbeat') return
      const duration = Number(item.durationMs)
      const severity = item.status === 'error' ? 'critical' : duration > 2000 ? 'critical' : duration >= 800 ? 'warning' : ''
      if (!severity) return
      const reason = item.status === 'error' ? '請求發生錯誤' : duration > 2000 ? `請求延遲 ${duration} ms` : `請求較慢 ${duration} ms`
      anomalies.value = [{ ...item, id: `${Date.now()}-${Math.random()}`, severity, reason }, ...anomalies.value].slice(0, 12)
    }
    const activeNodeClass = computed(() => activeSource.value ? `is-active-${activeSource.value}` : '')
    let stream
    let activeTimer
    let reconnectTimer
    let stopped = false
    const connect = () => {
      if (stopped) return
      clearTimeout(reconnectTimer)
      stream?.close()
      stream = new EventSource(`${context.baseUrl}/admin/project-observability/stream`, { withCredentials: true })
      stream.onopen = () => { connected.value = true; error.value = '' }
      stream.onmessage = event => {
        try {
          const item = JSON.parse(event.data)
          updatePresence(item)
          if (item.type === 'region:snapshot') {
            persistedRegionStats.value = Array.isArray(item.stats) ? item.stats : []
            return
          }
          detectAnomaly(item)
          if (item.source && item.source in nodeStats.value) {
            nodeStats.value[item.source] += 1
            activeSource.value = item.source
            addFlowMolecule(item)
            clearTimeout(activeTimer)
            activeTimer = setTimeout(() => { activeSource.value = '' }, 900)
          }
          if (item.type === 'stream:heartbeat') return
          events.value = [{ ...item, id: `${Date.now()}-${Math.random()}` }, ...events.value].slice(0, 30)
        } catch { /* Ignore malformed telemetry packets. */ }
      }
      stream.onerror = () => {
        connected.value = false
        persistedRegionStats.value = []
        error.value = '即時串流暫時中斷，正在重試'
        stream?.close()
        stream = undefined
        clearTimeout(reconnectTimer)
        reconnectTimer = setTimeout(connect, 3000)
      }
    }
    connect()
    const pagedEvents = computed(() => events.value.slice((eventPage.value - 1) * pageSize, eventPage.value * pageSize))
    const eventPageCount = computed(() => Math.max(1, Math.ceil(events.value.length / pageSize)))
    const regionSourceLabels = { admin: '管理後台', driver: '司機端', backend: 'API Gateway', service: 'Domain Service', data: 'Data Layer' }
    const passengerPlatformLabels = { web: '乘客端 Web', app: '乘客端 App', 'mini-program': '乘客端小程序' }
    const regionStats = computed(() => {
      const counts = new Map()
      persistedRegionStats.value.forEach(event => {
        if (!event.region) return
        const current = counts.get(event.region) || { region: event.region, count: 0, sources: new Set() }
        current.count += Number(event.eventCount) || 0
        if (event.source === 'passenger') current.sources.add(passengerPlatformLabels[event.platform] || '乘客端 未分類')
        else if (event.source) current.sources.add(regionSourceLabels[event.source] || event.source)
        counts.set(event.region, current)
      })
      return [...counts.values()].map(item => ({ ...item, sources: [...item.sources] })).sort((a, b) => b.count - a.count)
    })
    const regionParticles = computed(() => regionStats.value.flatMap(item => Array.from({ length: Math.min(8, Math.max(2, Math.ceil(item.count / 2))) }, (_, index) => ({ region: item.region, index }))))
    const regionServiceParticlesVisible = computed(() => regionStats.value.some(item => item.region && item.region !== '未知地區'))
    const codeRainColumns = Array.from({ length: 28 }, (_, index) => ({
      id: index,
      text: Array.from({ length: 18 + (index % 7) }, (_, character) => '01{}[]<>/\\|*+-=~'.charAt((index * 5 + character * 3) % 16)).join(''),
      left: `${(index * 3.71) % 100}%`,
      delay: `${-((index * 1.37) % 9).toFixed(2)}s`,
      duration: `${7 + (index % 6) * 1.1}s`
    }))
    watch(eventPageCount, count => { if (eventPage.value > count) eventPage.value = count })
    onBeforeUnmount(() => { stopped = true; stream?.close(); stream = undefined; clearTimeout(activeTimer); clearTimeout(reconnectTimer); clearTimeout(moleculeTimer) })
    return { ...context, events, pageSize, pagedEvents, eventPage, eventPageCount, connected, error, anomalies, nodeStats, activeNodeClass, flowMolecules, regionStats, regionParticles, regionServiceParticlesVisible, presenceGroups, codeRainColumns }
  },
  template: String.raw`<section v-if="view==='project-observability'" class="project-observability"><div class="observability-heading"><div><span class="eyebrow">LIVE SYSTEM TELEMETRY</span><h2>項目數據流</h2><p>以 Mind Map 即時呈現整個項目的請求流動</p></div><div class="stream-status"><span :class="['status-dot', { connected }]" ></span>{{connected ? 'LIVE' : 'RECONNECTING'}}</div></div><div class="mind-map-stage"><div class="mind-map-grid"></div><div class="mind-map-code-rain" aria-hidden="true"><span v-for="column in codeRainColumns" :key="column.id" class="mind-map-code-column" :style="{ '--rain-left': column.left, '--rain-delay': column.delay, '--rain-duration': column.duration }">{{column.text}}</span></div><svg class="mind-map-links" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="observability-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="flow-cyan"><stop stop-color="#35e5ff" stop-opacity="0"/><stop offset=".5" stop-color="#35e5ff"/><stop offset="1" stop-color="#35e5ff" stop-opacity="0"/></linearGradient></defs><path class="map-link" d="M500 280 C350 245 220 150 115 100"/><path class="map-link" d="M500 280 C360 300 225 295 105 285"/><path class="map-link" d="M500 280 C360 340 230 430 120 465"/><path class="map-link" d="M500 280 C650 245 780 150 890 100"/><path class="map-link" d="M500 280 C650 300 790 295 900 285"/><path class="map-link" d="M500 280 C650 340 780 430 885 465"/><path class="map-flow" d="M500 280 C360 300 225 295 105 285"/><path class="map-flow map-flow-delay" d="M500 280 C650 300 790 295 900 285"/><circle class="map-packet packet-one" r="5"><animateMotion dur="2.8s" repeatCount="indefinite" path="M500 280 C360 300 225 295 105 285"/></circle><circle class="map-packet packet-two" r="5"><animateMotion dur="3.4s" repeatCount="indefinite" path="M500 280 C650 245 780 150 890 100"/></circle><circle class="map-packet packet-three" r="5"><animateMotion dur="2.5s" repeatCount="indefinite" path="M500 280 C650 340 780 430 885 465"/></circle><circle class="map-packet packet-four" r="3"><animateMotion dur="3.1s" repeatCount="indefinite" path="M500 280 C350 245 220 150 115 100"/></circle><g v-if="regionServiceParticlesVisible" class="geo-service-particles" aria-label="地區獲取服務動畫"><circle class="geo-service-particle geo-service-particle-one" r="3"><animateMotion dur="2.8s" repeatCount="indefinite" path="M500 280 C650 300 790 295 900 285"/></circle><circle class="geo-service-particle geo-service-particle-two" r="2.5"><animateMotion dur="3.6s" begin="-1.2s" repeatCount="indefinite" path="M500 280 C650 300 790 295 900 285"/></circle><circle class="geo-service-particle geo-service-particle-three" r="2"><animateMotion dur="4.2s" begin="-2.4s" repeatCount="indefinite" path="M500 280 C650 300 790 295 900 285"/></circle></g><circle v-for="particle in regionParticles" :key="'map-' + particle.region + '-' + particle.index" class="region-map-particle" :class="'region-map-particle-' + (particle.index % 3)" r="4"><animateMotion :dur="(2.2 + (particle.index % 3) * .35) + 's'" repeatCount="indefinite" :path="particle.index % 3 === 0 ? 'M105 285 C225 295 360 300 500 280' : particle.index % 3 === 1 ? 'M885 465 C780 430 650 340 500 280' : 'M115 100 C220 150 350 245 500 280'"/></circle></svg><article class="mind-node node-core"><span class="node-icon">✦</span><b>MASTER TRAVEL</b><small>LIVE PROJECT FLOW</small><strong>{{events.length}} EVENTS</strong></article><article :class="['mind-node node-admin', activeNodeClass === 'is-active-admin' ? 'is-active' : '']"><span class="node-icon">◈</span><b>ADMIN</b><small>管理後台</small><strong>{{nodeStats.admin}} EVENTS</strong></article><article :class="['mind-node node-passenger', activeNodeClass === 'is-active-passenger' ? 'is-active' : '']"><span class="node-icon">◎</span><b>PASSENGER</b><small>乘客端</small><strong>{{nodeStats.passenger}} EVENTS</strong></article><article :class="['mind-node node-driver', activeNodeClass === 'is-active-driver' ? 'is-active' : '']"><span class="node-icon">◇</span><b>DRIVER</b><small>司機端</small><strong>{{nodeStats.driver}} EVENTS</strong></article><article :class="['mind-node node-api', activeNodeClass === 'is-active-backend' ? 'is-active' : '']"><span class="node-icon">↯</span><b>API GATEWAY</b><small>NestJS</small><strong>{{nodeStats.backend}} EVENTS</strong></article><article :class="['mind-node node-service', activeNodeClass === 'is-active-service' ? 'is-active' : '']"><span class="node-icon">✧</span><b>DOMAIN SERVICE</b><small>業務服務</small><strong>{{nodeStats.service}} EVENTS</strong></article><article :class="['mind-node node-data', activeNodeClass === 'is-active-data' ? 'is-active' : '']"><span class="node-icon">▣</span><b>DATA LAYER</b><small>Prisma / PostgreSQL</small><strong>{{nodeStats.data}} EVENTS</strong></article></div><div class="telemetry-panel"><div class="panel-title"><div><span class="eyebrow">EVENT STREAM</span><h3>即時事件</h3></div><span>{{events.length}} events</span></div><p v-if="error" class="stream-error">{{error}}</p><div v-if="!events.length" class="stream-empty">等待下一個 API 事件…</div><div v-for="event in pagedEvents" :key="event.id" class="event-row"><span :class="['event-pulse', event.status === 'error' ? 'is-error' : '']"></span><time>{{new Date(event.timestamp).toLocaleTimeString()}}</time><b>{{event.method || event.type}}</b><span class="event-path">{{event.path || event.operation || 'system'}}</span><span v-if="event.durationMs != null" class="event-duration">{{event.durationMs}} ms</span><span class="event-state">{{event.status || 'started'}}</span></div><div v-if="events.length > pageSize" class="event-pagination"><button type="button" :disabled="eventPage <= 1" @click="eventPage -= 1">上一頁</button><span>{{eventPage}} / {{eventPageCount}}</span><button type="button" :disabled="eventPage >= eventPageCount" @click="eventPage += 1">下一頁</button></div></div><div class="region-visit-panel"><div class="panel-title"><div><span class="eyebrow">REGION VISITS</span><h3>地區訪問</h3></div><span>{{regionStats.length}} regions</span></div><div class="region-visit-orbit"><span v-for="particle in regionParticles" :key="particle.region + '-' + particle.index" class="region-particle" :style="{ '--particle-delay': (particle.index * -0.35) + 's' }"></span><div class="region-visit-core">REGION<br>FLOW</div></div><div v-if="!regionStats.length" class="region-empty">等待地區訪問事件…</div><div v-else class="region-visit-list"><div v-for="item in regionStats" :key="item.region" class="region-visit-row"><div><b>{{item.region}}</b><small>{{item.sources.join(' · ') || '未知端別'}}</small></div><strong>{{item.count}}</strong></div></div></div><div class="presence-panel"><div class="panel-title"><div><span class="eyebrow">LIVE PRESENCE</span><h3>即時在線用戶</h3></div><span>活動 5 分鐘／連線中</span></div><div class="presence-grid"><article v-for="item in presenceGroups" :key="item.key" class="presence-card"><div class="presence-card-heading"><span class="presence-indicator" aria-hidden="true"></span><b>{{item.label}}</b></div><div class="presence-metrics"><div class="presence-metric"><strong>{{item.activity.count}}</strong><small>近 5 分鐘活動</small></div><div class="presence-metric"><strong>{{item.connections.count}}</strong><small>目前連線</small></div></div><div class="presence-regions"><div class="presence-region-group"><span>活動地區</span><ul><li v-for="(count, region) in item.activity.regions" :key="region"><span>{{region}}</span><b>{{count}}</b></li><li v-if="!Object.keys(item.activity.regions).length" class="presence-region-empty">尚無地區資料</li></ul></div><div class="presence-region-group"><span>連線地區</span><ul><li v-for="(count, region) in item.connections.regions" :key="region"><span>{{region}}</span><b>{{count}}</b></li><li v-if="!Object.keys(item.connections.regions).length" class="presence-region-empty">尚無地區資料</li></ul></div></div></article></div></div><div class="anomaly-panel"><div class="panel-title"><div><span class="eyebrow">ANOMALY DETECTION</span><h3>警告與異常</h3></div><span>{{anomalies.length}} alerts</span></div><div v-if="!anomalies.length" class="anomaly-empty">目前沒有偵測到警告或異常</div><div v-for="anomaly in anomalies" :key="anomaly.id" :class="['anomaly-row', 'is-' + anomaly.severity]"><span class="anomaly-mark">{{anomaly.severity === 'critical' ? '!' : '⚠'}}</span><div><b>{{anomaly.reason}}</b><small>{{anomaly.method || anomaly.type}} · {{anomaly.path || anomaly.operation || 'system'}}</small></div><time>{{new Date(anomaly.timestamp).toLocaleTimeString()}}</time></div></div></section>`
}
