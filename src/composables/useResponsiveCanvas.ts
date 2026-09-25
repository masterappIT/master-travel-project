import { computed, onMounted, onUnmounted, ref } from 'vue'

export const useResponsiveCanvas = () => {
  const viewportWidth = ref(430)
  const viewportHeight = ref(932)

  const updateViewport = () => {
    if (typeof window !== 'undefined') {
      viewportWidth.value = window.innerWidth
      viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
      return
    }

    try {
      const { windowWidth, windowHeight } = uni.getSystemInfoSync()
      viewportWidth.value = windowWidth || 430
      viewportHeight.value = windowHeight || 932
    } catch {
      viewportWidth.value = 430
      viewportHeight.value = 932
    }
  }

  onMounted(() => {
    updateViewport()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateViewport)
      window.visualViewport?.addEventListener('resize', updateViewport)
      return
    }
    if (typeof uni.onWindowResize === 'function') {
      uni.onWindowResize(updateViewport)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', updateViewport)
      window.visualViewport?.removeEventListener('resize', updateViewport)
      return
    }
    if (typeof uni.offWindowResize === 'function') {
      uni.offWindowResize(updateViewport)
    }
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

  return { responsiveStyle, refreshViewport: updateViewport }
}
