import { computed, onMounted, onUnmounted, ref } from 'vue'

type ResponsiveCanvasOptions = {
  preserveHeightOnKeyboard?: boolean
}

export const useResponsiveCanvas = (options: ResponsiveCanvasOptions = {}) => {
  const preserveHeightOnKeyboard = options.preserveHeightOnKeyboard === true
  const viewportWidth = ref(430)
  const viewportHeight = ref(932)
  const keyboardHeight = ref(0)
  let baseViewportHeight = 932
  let hasInitialViewport = false

  const applyViewport = (nextWidth: number, nextHeight: number) => {
    viewportWidth.value = nextWidth || 430
    if (!preserveHeightOnKeyboard) {
      viewportHeight.value = nextHeight || 932
      return
    }

    if (!hasInitialViewport) {
      baseViewportHeight = nextHeight || 932
      viewportHeight.value = baseViewportHeight
      hasInitialViewport = true
      return
    }

    const heightDelta = Math.max(0, baseViewportHeight - (nextHeight || baseViewportHeight))
    if (heightDelta > 80) {
      keyboardHeight.value = heightDelta
      viewportHeight.value = baseViewportHeight
      return
    }

    keyboardHeight.value = 0
    baseViewportHeight = nextHeight || baseViewportHeight
    viewportHeight.value = baseViewportHeight
  }

  const updateViewport = () => {
    if (typeof window !== 'undefined') {
      applyViewport(window.innerWidth, window.visualViewport?.height ?? window.innerHeight)
      return
    }

    try {
      const { windowWidth, windowHeight } = uni.getSystemInfoSync()
      applyViewport(windowWidth || 430, windowHeight || 932)
    } catch {
      applyViewport(430, 932)
    }
  }

  const handleKeyboardHeightChange = (result: { height: number }) => {
    if (!preserveHeightOnKeyboard) return
    keyboardHeight.value = Math.max(0, result.height || 0)
    if (!keyboardHeight.value) updateViewport()
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
    if (preserveHeightOnKeyboard && typeof uni.onKeyboardHeightChange === 'function') {
      uni.onKeyboardHeightChange(handleKeyboardHeightChange)
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
    if (preserveHeightOnKeyboard && typeof uni.offKeyboardHeightChange === 'function') {
      uni.offKeyboardHeightChange(handleKeyboardHeightChange)
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
      '--mobile-height': `${logicalHeight}px`,
      '--keyboard-offset': `${keyboardHeight.value / scale}px`
    }
  })

  return { responsiveStyle, refreshViewport: updateViewport }
}
