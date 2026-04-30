export class DataPhantom {
  x: number
  y: number
  hp = 2
  active = true
  activated = false
  private groundY: number
  private phaseT = 0
  private visible = true
  private revealTimer = 0
  private readonly minX: number
  private readonly maxX: number

  constructor(x: number, y: number, groundY: number, minX: number, maxX: number) {
    this.x = x
    this.y = y
    this.groundY = groundY
    this.minX = minX
    this.maxX = maxX
  }

  reveal(d: number): void {
    this.revealTimer = d
    this.visible = true
  }

  takeHit(): void {
    if (!this.active) return
    if (!this.visible && this.revealTimer <= 0) return
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, pcx: number, pcy: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (pcx > this.x - 400) this.activated = true
      else return
    }
    if (this.revealTimer > 0) this.revealTimer -= dt
    this.phaseT += dt
    const cycle = 7
    const visPhase = (this.phaseT % cycle) < 3
    this.visible = visPhase || this.revealTimer > 0

    if (!this.visible) {
      this.x = this.minX + Math.random() * (this.maxX - this.minX)
      this.y = this.groundY - 52 - Math.random() * 120
      return
    }

    const dx = pcx - this.x
    const dy = pcy - this.y
    const d = Math.hypot(dx, dy) || 1
    const sp = 160 * dt
    this.x += (dx / d) * sp
    this.y += (dy / d) * sp * 0.35
  }

  isSolidVisible(): boolean {
    return this.visible
  }

  getRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.x - 16, y: this.y - 52, w: 32, h: 52 }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active || !this.activated) return
    const sx = this.x - cameraX
    ctx.save()
    if (!this.visible) {
      ctx.globalAlpha = 0.08
      ctx.fillStyle = '#7c3dff'
      ctx.fillRect(sx - 16, this.y - 52, 32, 52)
      ctx.globalAlpha = 1
      ctx.restore()
      return
    }
    ctx.globalAlpha = 0.85
    for (let i = 0; i < 24; i++) {
      const px = sx - 14 + (i % 6) * 5 + (Math.sin(this.phaseT * 4 + i) * 2)
      const py = this.y - 48 + Math.floor(i / 6) * 10
      ctx.fillStyle = i % 2 ? '#7c3dff' : '#ffffff'
      ctx.globalAlpha = 0.15 + (i % 5) * 0.06
      ctx.fillRect(px, py, 3, 4)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }
}
