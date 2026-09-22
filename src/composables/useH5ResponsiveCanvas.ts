import { computed, onMounted, onUnmounted, ref } from 'vue'

export const useH5ResponsiveCanvas = () => {
  const viewportWidth = ref(430)

  const updateViewport = () => {
    if (typeof window === 'undefined') return
    viewportWidth.value = window.innerWidth
  }

  onMounted(() => {
    updateViewport()
    window.addEventListener('resize', updateViewport)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateViewport)
  })

  const responsiveStyle = computed(() => {
    const scale = viewportWidth.value / 430
    const inverseScale = 1 / scale
    return {
      width: '430px',
      height: `calc(100% * ${inverseScale})`,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      top: '0',
      right: 'auto',
      bottom: 'auto',
      left: '0',
      margin: '0',
      '--mobile-scale': `${scale}`,
      '--mobile-scale-inverse': `${inverseScale}`,
      '--mobile-height': `calc(100% * ${inverseScale})`
    }
  })

  return { responsiveStyle }
}
