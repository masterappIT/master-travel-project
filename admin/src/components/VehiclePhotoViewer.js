export const VehiclePhotoViewer = {
  name: 'VehiclePhotoViewer',
  props: {
    src: { type: String, required: true },
    alt: { type: String, default: '車輛相片' },
    loadFullPhoto: { type: Function, default: null }
  },
  data() {
    return { open: false, scale: 1, previousBodyOverflow: '', fullPhotoUrl: '', loadingFullPhoto: false }
  },
  computed: {
    scaleLabel() {
      return `${Math.round(this.scale * 100)}%`
    },
    viewerSrc() {
      return this.fullPhotoUrl || this.src
    }
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown)
    if (this.open) document.body.style.overflow = this.previousBodyOverflow
    if (this.fullPhotoUrl) URL.revokeObjectURL(this.fullPhotoUrl)
  },
  methods: {
    async openViewer() {
      this.scale = 1
      this.previousBodyOverflow = document.body.style.overflow
      this.open = true
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', this.handleKeydown)
      this.$nextTick(() => this.$refs.closeButton?.focus())
      if (!this.loadFullPhoto || this.fullPhotoUrl || this.loadingFullPhoto) return
      this.loadingFullPhoto = true
      try {
        this.fullPhotoUrl = URL.createObjectURL(await this.loadFullPhoto())
      } catch {
        this.fullPhotoUrl = ''
      } finally {
        this.loadingFullPhoto = false
      }
    },
    closeViewer() {
      window.removeEventListener('keydown', this.handleKeydown)
      this.open = false
      this.scale = 1
      document.body.style.overflow = this.previousBodyOverflow
    },
    zoomIn() {
      this.scale = Math.min(3, this.scale + 0.25)
    },
    zoomOut() {
      this.scale = Math.max(0.5, this.scale - 0.25)
    },
    resetZoom() {
      this.scale = 1
    },
    handleKeydown(event) {
      if (event.key === 'Escape') this.closeViewer()
      if (event.key === '+' || event.key === '=') this.zoomIn()
      if (event.key === '-') this.zoomOut()
    }
  },
  template: String.raw`
    <div class="vehicle-photo-viewer">
      <button type="button" class="vehicle-photo-viewer-thumbnail" aria-label="放大車輛相片" @click="openViewer">
        <img :src="src" :alt="alt" />
        <span aria-hidden="true">放大</span>
      </button>
      <Teleport to="body">
        <div v-if="open" class="vehicle-photo-viewer-overlay" role="dialog" aria-modal="true" aria-label="車輛相片預覽" @click.self="closeViewer">
          <div class="vehicle-photo-viewer-toolbar">
            <button type="button" aria-label="縮小圖片" :disabled="scale <= 0.5" @click="zoomOut">−</button>
            <button type="button" class="vehicle-photo-viewer-scale" aria-label="重設圖片大小" @click="resetZoom">{{ scaleLabel }}</button>
            <button type="button" aria-label="放大圖片" :disabled="scale >= 3" @click="zoomIn">＋</button>
            <button ref="closeButton" type="button" class="vehicle-photo-viewer-close" aria-label="關閉圖片預覽" @click="closeViewer">×</button>
          </div>
          <div class="vehicle-photo-viewer-canvas" @click.self="closeViewer">
            <img :src="viewerSrc" :alt="alt" :style="{ transform: 'scale(' + scale + ')' }" />
          </div>
        </div>
      </Teleport>
    </div>
  `
}
