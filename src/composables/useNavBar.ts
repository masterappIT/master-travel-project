// Where the back button and page title sit, as the vertical centre in the 430 px canvas.
// The WeChat mini-program draws its capsule button at a device-dependent height that does not scale with the canvas,
// so the centre is taken from the capsule there. H5 and the App have no capsule and use the designed position.
const DESIGNED_CENTER = 79
// Keeps the 44 px back button and the title inside the shortest (110 px) header whatever a device reports.
const MIN_CENTER = 30
const MAX_CENTER = 84

let center: number | undefined

export const navBarCenter = (): number => {
  if (center !== undefined) return center
  center = DESIGNED_CENTER
  // #ifdef MP-WEIXIN
  try {
    const { windowWidth } = uni.getSystemInfoSync()
    const capsule = uni.getMenuButtonBoundingClientRect()
    if (windowWidth > 0 && capsule && capsule.height > 0) {
      const canvasCenter = (capsule.top + capsule.height / 2) / (windowWidth / 430)
      center = Math.min(MAX_CENTER, Math.max(MIN_CENTER, Math.round(canvasCenter * 10) / 10))
    }
  } catch { /* keep the designed position */ }
  // #endif
  return center
}

/** Set on every canvas root as `--nav-center`, so headers can position against it in CSS. */
export const navBarCenterStyle = () => ({ '--nav-center': `${navBarCenter()}px` })
