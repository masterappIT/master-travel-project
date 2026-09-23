export const LazyVehiclePhotoViewer = {
  name: 'LazyVehiclePhotoViewer',
  props: {
    hasPhoto: { type: Boolean, default: false },
    loadPhoto: { type: Function, required: true },
    loadFullPhoto: { type: Function, default: null },
    alt: { type: String, default: '車輛相片' }
  },
  data() {
    return { photoUrl: '', observer: null, loading: false, attempted: false, failed: false }
  },
  mounted() {
    this.observe()
  },
  activated() {
    this.observe()
  },
  deactivated() {
    this.disconnectObserver()
  },
  beforeUnmount() {
    this.disconnectObserver()
    if (this.photoUrl) URL.revokeObjectURL(this.photoUrl)
  },
  methods: {
    observe() {
      if (!this.hasPhoto || this.photoUrl || this.loading || this.attempted || this.observer) return
      if (!('IntersectionObserver' in window)) {
        this.load()
        return
      }
      this.observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        this.disconnectObserver()
        this.load()
      }, { rootMargin: '160px 0px' })
      const target = this.$el.closest('.vehicle-photo-cell') || this.$el
      const bounds = target.getBoundingClientRect()
      if (bounds.bottom >= -160 && bounds.top <= window.innerHeight + 160) {
        this.disconnectObserver()
        this.load()
        return
      }
      this.observer.observe(target)
    },
    disconnectObserver() {
      this.observer?.disconnect()
      this.observer = null
    },
    async load() {
      if (!this.hasPhoto || this.photoUrl || this.loading || this.attempted) return
      this.loading = true
      this.attempted = true
      try {
        const blob = await this.loadPhoto()
        this.photoUrl = URL.createObjectURL(blob)
      } catch {
        this.photoUrl = ''
        this.failed = true
      } finally {
        this.loading = false
      }
    }
  },
  template: String.raw`
    <span class="lazy-vehicle-photo-viewer">
      <VehiclePhotoViewer v-if="photoUrl" :src="photoUrl" :load-full-photo="loadFullPhoto" :alt="alt" />
      <span v-else>{{ loading ? '載入中' : failed ? '載入失敗' : hasPhoto ? '' : '未上傳' }}</span>
    </span>
  `
}
