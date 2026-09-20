import { computed, onMounted, onUnmounted, ref } from 'vue'

export const useH5ResponsiveCanvas = () => {
  const viewportWidth = ref(430)
  const viewportHeight = ref(932)

  const updateViewport = () => {
    if (typeof window === 'undefined') return
    viewportWidth.value = window.innerWidth
    viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
  }

  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.visualViewport?.addEventListener('resize', updateViewport)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateViewport)
    window.visualViewport?.removeEventListener('resize', updateViewport)
  })

  const responsiveStyle = computed(() => {
    const scale = viewportWidth.value / 430
    const logicalHeight = viewportHeight.value / scale
    return {
      width: '430px',
      height: `${logicalHeight}px`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      top: '0',
      right: 'auto',
      bottom: 'auto',
      left: '0',
      margin: '0',
      '--mobile-scale': `${scale}`,
      '--mobile-height': `${logicalHeight}px`
    }
  })

  return { responsiveStyle }
}
