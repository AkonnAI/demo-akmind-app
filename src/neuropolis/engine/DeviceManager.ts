export type DeviceMode = 'desktop' | 'mobile'
export type Orientation = 'landscape' | 'portrait'

export class DeviceManager {
  static mode: DeviceMode = 'desktop'
  static orientation: Orientation = 'landscape'

  private static resizeListenersAttached = false

  static init(): void {
    this.mode = this.detectMobile() ? 'mobile' : 'desktop'
    this.updateOrientation()
    if (this.mode === 'mobile') this.lockLandscape()
    if (!this.resizeListenersAttached) {
      this.resizeListenersAttached = true
      window.addEventListener('resize', () => this.handleResize())
      window.addEventListener('orientationchange', () => this.handleResize())
    }
    this.handleResize()
  }

  private static detectMobile(): boolean {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const uaMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i
                      .test(navigator.userAgent)
    return (hasTouch && isCoarsePointer) || uaMobile
  }

  private static lockLandscape(): void {
    // screen.orientation.lock requires fullscreen on most browsers.
    // Try immediately; if it fails, attempt fullscreen on the first touch
    // and then retry the lock.
    const ori = screen.orientation as { lock?: (t: string) => Promise<void> }
    if (!ori.lock) return
    ori.lock('landscape-primary').catch(() => {
      document.addEventListener('touchstart', () => {
        document.documentElement.requestFullscreen?.()
          .then(() => ori.lock!('landscape-primary').catch(() => {}))
          .catch(() => {})
      }, { capture: true, once: true })
    })
  }

  private static updateOrientation(): void {
    this.orientation = window.innerWidth >= window.innerHeight
                       ? 'landscape' : 'portrait'
  }

  /** Handheld / phone-tablet profile — not laptop desktop browsers. */
  static isHandheld(): boolean {
    return this.mode === 'mobile'
  }

  /**
   * Virtual joystick + buttons in landscape.
   * Includes Chrome DevTools device emulation (often keeps desktop UA / fine pointer),
   * touch-capable hardware, and `?touchUi=1` for manual testing.
   */
  static shouldShowTouchOverlay(): boolean {
    if (this.orientation !== 'landscape') return false
    if (this.mode === 'mobile') return true
    if (typeof window === 'undefined') return false
    try {
      if (new URLSearchParams(window.location.search).get('touchUi') === '1') {
        return true
      }
    } catch {
      /* ignore */
    }
    if (window.matchMedia('(pointer: coarse)').matches) return true
    if (window.matchMedia('(any-pointer: coarse)').matches) return true
    // DevTools mobile inspector + many touch laptops/tablets expose touch points.
    if (navigator.maxTouchPoints > 0) return true
    return false
  }

  /** Full-screen hint until user rotates (mobile portrait). */
  static shouldShowRotatePrompt(): boolean {
    return this.mode === 'mobile' && this.orientation === 'portrait'
  }

  private static handleResize(): void {
    this.updateOrientation()
    this.scaleCanvas()
    const rotatePrompt = document.getElementById('rotate-prompt')
    if (rotatePrompt) {
      rotatePrompt.style.display = this.shouldShowRotatePrompt() ? 'flex' : 'none'
    }
    const touchLayer = document.getElementById('touch-layer')
    if (touchLayer) {
      touchLayer.style.display = (this.mode === 'mobile') ? 'block' : 'none'
    }
  }

  private static scaleCanvas(): void {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const targetAspect = 1280 / 720
    const viewportAspect = vw / vh
    let cssW: number, cssH: number
    if (viewportAspect > targetAspect) {
      cssH = vh
      cssW = vh * targetAspect
    } else {
      cssW = vw
      cssH = vw / targetAspect
    }
    canvas.style.width  = `${cssW}px`
    canvas.style.height = `${cssH}px`
  }

  static screenToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width)  * 1280
    const y = ((clientY - rect.top)  / rect.height) * 720
    return { x, y }
  }
}
