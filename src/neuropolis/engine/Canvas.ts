import { CONFIG } from '../constants/config'

export class Canvas {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private scale: number = 1
  private offsetX: number = 0
  private offsetY: number = 0

  private readonly onResize = (): void => {
    this.resize()
  }

  private readonly onOrientationChange = (): void => {
    setTimeout(() => this.resize(), 100)
  }

  constructor(canvasId: string = 'game-canvas') {
    const el = document.getElementById(canvasId)
    if (!(el instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element #${canvasId} not found`)
    }
    this.canvas = el

    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D context')
    this.ctx = ctx

    this.canvas.width = CONFIG.CANVAS_WIDTH
    this.canvas.height = CONFIG.CANVAS_HEIGHT
    this.ctx.imageSmoothingEnabled = false

    window.addEventListener('resize', this.onResize)
    window.addEventListener('orientationchange', this.onOrientationChange)

    this.resize()
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('orientationchange', this.onOrientationChange)
  }

  resize(): void {
    // Size to the canvas parent's box when present (e.g. `#game-container`)
    // so letterboxing matches the visible play area — not raw window dims,
    // which can diverge from `100vw`/`100vh` and push the surface off-screen.
    const parent = this.canvas.parentElement
    const boxW   = parent ? parent.clientWidth  : window.innerWidth
    const boxH   = parent ? parent.clientHeight : window.innerHeight
    const safeW  = Math.max(1, boxW)
    const safeH  = Math.max(1, boxH)

    const scaleX = safeW / CONFIG.CANVAS_WIDTH
    const scaleY = safeH / CONFIG.CANVAS_HEIGHT
    this.scale = Math.min(scaleX, scaleY)

    const displayW = Math.floor(CONFIG.CANVAS_WIDTH * this.scale)
    const displayH = Math.floor(CONFIG.CANVAS_HEIGHT * this.scale)

    this.offsetX = Math.floor((safeW - displayW) / 2)
    this.offsetY = Math.floor((safeH - displayH) / 2)

    this.canvas.style.width  = `${displayW}px`
    this.canvas.style.height = `${displayH}px`
    this.canvas.style.left   = `${this.offsetX}px`
    this.canvas.style.top    = `${this.offsetY}px`
    this.canvas.style.position = 'absolute'

    // Re-disable smoothing after resize (some browsers reset it)
    this.ctx.imageSmoothingEnabled = false
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas
  }

  getScale(): number {
    return this.scale
  }

  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale,
    }
  }
}
