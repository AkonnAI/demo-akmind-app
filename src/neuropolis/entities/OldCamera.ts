export class OldCamera {
  x: number
  y: number
  active = true
  private time = 0
  private stunTimer = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  stun(duration: number): void {
    this.stunTimer = duration
  }

  update(dt: number): void {
    this.time += dt
    if (this.stunTimer > 0) this.stunTimer -= dt
    // time kept for future "slight bracket jitter" — read here to satisfy TS
    void this.time
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    const sy = this.y
    if (sx < -60 || sx > 1340) return

    ctx.imageSmoothingEnabled = false

    // Mount bracket on wall
    ctx.fillStyle = '#0a0816'
    ctx.fillRect(sx - 4, sy - 12, 8, 12)

    // Camera body — dark, no glow
    ctx.fillStyle = '#0c0a1a'
    ctx.fillRect(sx - 14, sy, 28, 16)

    // Lens — dark grey, no cyan glow
    ctx.fillStyle = '#0f0e18'
    ctx.beginPath()
    ctx.arc(sx + 10, sy + 8, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#1a1828'
    ctx.lineWidth = 1
    ctx.stroke()

    // Lens inner — very dark, no light
    ctx.fillStyle = '#080610'
    ctx.beginPath()
    ctx.arc(sx + 10, sy + 8, 4, 0, Math.PI * 2)
    ctx.fill()

    // Dead indicator light — off/dark red
    ctx.fillStyle = '#1a0000'
    ctx.fillRect(sx - 10, sy + 6, 4, 4)

    // "NOT AI" label — subtle
    ctx.fillStyle = '#1a1535'
    ctx.font = '5px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('OLD', sx, sy + 28)
    ctx.textAlign = 'left'

    if (this.stunTimer > 0) {
      ctx.save()
      ctx.strokeStyle = '#7c4dff'
      ctx.lineWidth = 2
      ctx.shadowColor = '#7c4dff'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(sx + 10, sy + 8, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }
  }
}
