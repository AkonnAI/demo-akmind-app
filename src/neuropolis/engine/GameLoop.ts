export class GameLoop {
  private rafId: number = 0
  private lastTime: number = 0
  private fps: number = 0
  private frameCount: number = 0
  private fpsTimer: number = 0

  // Callbacks set by the scene/game
  private updateFn: ((dt: number) => void) | null = null
  private renderFn: ((ctx: CanvasRenderingContext2D) => void) | null = null
  private ctx: CanvasRenderingContext2D | null = null

  // Register the update callback
  onUpdate(fn: (dt: number) => void): void {
    this.updateFn = fn
  }

  // Register the render callback
  onRender(ctx: CanvasRenderingContext2D, fn: (ctx: CanvasRenderingContext2D) => void): void {
    this.ctx = ctx
    this.renderFn = fn
  }

  // Start the loop
  start(): void {
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  // Stop the loop
  stop(): void {
    cancelAnimationFrame(this.rafId)
  }

  // Returns current FPS
  getFPS(): number {
    return this.fps
  }

  private loop(timestamp: number): void {
    // Calculate delta time in seconds, cap at 100ms to prevent spiral of death
    let dt = (timestamp - this.lastTime) / 1000
    if (dt > 0.1) dt = 0.1
    this.lastTime = timestamp

    // FPS calculation — update every second
    this.frameCount++
    this.fpsTimer += dt
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.fpsTimer = 0
    }

    // Update then render
    if (this.updateFn) this.updateFn(dt)
    if (this.renderFn && this.ctx) this.renderFn(this.ctx)

    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }
}
