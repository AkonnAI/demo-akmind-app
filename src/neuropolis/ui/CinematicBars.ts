import { CONFIG } from '../constants/config'

export class CinematicBars {
  private barHeight = 0
  private targetHeight = 80
  private animating = false
  private done = false

  // Animate bars sliding in
  open(): void {
    this.animating = true
    this.done = false
  }

  update(dt: number): void {
    if (!this.animating) return
    this.barHeight += (this.targetHeight - this.barHeight) * dt * 8
    if (this.barHeight >= this.targetHeight - 1) {
      this.barHeight = this.targetHeight
      this.animating = false
      this.done = true
    }
  }

  isReady(): boolean { return this.done }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.barHeight <= 0) return
    ctx.fillStyle = '#000000'
    // Top bar
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, this.barHeight)
    // Bottom bar
    ctx.fillRect(
      0,
      CONFIG.CANVAS_HEIGHT - this.barHeight,
      CONFIG.CANVAS_WIDTH,
      this.barHeight
    )
  }
}
