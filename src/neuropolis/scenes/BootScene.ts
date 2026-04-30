import { CONFIG } from '../constants/config'
import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'

export class BootScene {
  private blinkVisible: boolean = true
  private blinkTimer: number = 0
  private elapsedTime: number = 0
  private input: InputManager
  private loop: GameLoop
  private fontLoaded: boolean = false

  constructor(input: InputManager, loop: GameLoop) {
    this.input = input
    this.loop = loop

    // Wait for Press Start 2P font to load before rendering full boot UI.
    document.fonts.ready.then(() => {
      this.fontLoaded = true
      console.log('[BootScene] Font loaded. Ready.')
    }).catch(() => {
      this.fontLoaded = true
    })
    setTimeout(() => {
      if (!this.fontLoaded) {
        this.fontLoaded = true
        console.warn('[BootScene] Font wait timed out — continuing with fallback fonts.')
      }
    }, 5000)
  }

  // Called every frame with delta time
  update(dt: number): void {
    this.elapsedTime += dt

    // Blink "INITIALIZING..." every 500ms
    this.blinkTimer += dt
    if (this.blinkTimer >= 0.5) {
      this.blinkTimer = 0
      this.blinkVisible = !this.blinkVisible
    }

    // Log key presses to console (Phase 1 — no movement yet)
    if (this.input.isJustPressed('ArrowLeft'))  console.log('[Input] LEFT')
    if (this.input.isJustPressed('ArrowRight')) console.log('[Input] RIGHT')
    if (this.input.isJustPressed('ArrowUp'))    console.log('[Input] UP / JUMP')
    if (this.input.isJustPressed('Space'))      console.log('[Input] SPACE')
    if (this.input.isJustPressed('KeyZ'))       console.log('[Input] Z / SHOOT')

    // After 3 seconds log boot complete
    if (this.elapsedTime > 3 && this.elapsedTime < 3.05) {
      console.log('[BootScene] Boot complete. Ready for Phase 2.')
    }
  }

  // Called every frame to draw
  render(ctx: CanvasRenderingContext2D): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT

    // Background
    ctx.fillStyle = CONFIG.COLOR_BG
    ctx.fillRect(0, 0, W, H)

    // Always show a boot line — `document.fonts.ready` can lag; without this
    // the screen is only a flat fill until fonts resolve (looks "blank").
    if (!this.fontLoaded) {
      ctx.font         = '16px Orbitron, monospace'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle    = CONFIG.COLOR_DIM
      ctx.fillText('LOADING FONTS…', W / 2, H / 2)
      ctx.textAlign    = 'left'
      return
    }

    // Cyan grid lines (subtle cyberpunk effect)
    ctx.strokeStyle = '#0d0d2e'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    // NEUROPOLIS title
    ctx.font = `48px 'Press Start 2P'`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = CONFIG.COLOR_CYAN
    ctx.fillText('NEUROPOLIS', W / 2, H / 2 - 60)

    // Subtitle
    ctx.font = `17px Orbitron, sans-serif`
    ctx.fillStyle = CONFIG.COLOR_DIM
    ctx.fillText('AN AKMIND LEARNING EXPERIENCE', W / 2, H / 2 - 10)

    // Blinking INITIALIZING text
    if (this.blinkVisible) {
      ctx.font = `19px Orbitron, sans-serif`
      ctx.fillStyle = CONFIG.COLOR_WHITE
      ctx.fillText('INITIALIZING...', W / 2, H / 2 + 60)
    }

    // FPS counter bottom left
    ctx.font = `15px Orbitron, sans-serif`
    ctx.textAlign = 'left'
    ctx.fillStyle = CONFIG.COLOR_FPS
    ctx.fillText(`FPS: ${this.loop.getFPS()}`, 20, H - 20)

    // Version bottom right
    ctx.textAlign = 'right'
    ctx.fillStyle = CONFIG.COLOR_FPS
    ctx.fillText('v0.1.0 — PHASE 1', W - 20, H - 20)
  }
}
