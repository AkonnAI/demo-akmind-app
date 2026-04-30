type NovaExpression = 'idle' | 'happy' | 'warning' | 'urgent' | 'explaining'

export class NovaOrb {
  // World or screen position
  x: number = 0
  y: number = 0

  // Visual state
  private time: number = 0
  private visible: boolean = false
  /** 0 normal — 3 heavy corruption tint */
  private corruptionLevel = 0

  // Floating animation
  private targetX: number = 0
  private targetY: number = 0

  // Alias for spec compatibility (accumulated time drives flicker)
  private get flickerPhase(): number { return this.time }

  show(x: number, y: number): void {
    this.visible = true
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
  }

  hide(): void {
    this.visible = false
  }

  setCorrupted(level: 0 | 1 | 2 | 3): void {
    this.corruptionLevel = level
  }

  moveTo(x: number, y: number): void {
    this.targetX = x
    this.targetY = y
  }

  // Kept for API compatibility with CinematicScene; Phase 1 NOVA has no face.
  setExpression(_expr: NovaExpression): void { /* no-op */ }

  update(dt: number): void {
    if (!this.visible) return
    this.time += dt

    // Smooth move toward target
    this.x += (this.targetX - this.x) * dt * 4
    this.y += (this.targetY - this.y) * dt * 4
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number = 0): void {
    if (!this.visible) return

    // Phase 1 flicker
    const flicker = Math.sin(this.flickerPhase * 23) *
                    Math.sin(this.flickerPhase * 7)
    if (flicker > 0.82) return

    // x/y are world coords when used in gameplay (player follow).
    // Subtract camera so NOVA stays next to AX on screen instead
    // of drifting with the world.
    const cx = this.x - cameraX
    const cy = this.y + Math.sin(this.time * 2.1) * 4
    const R  = 14

    ctx.save()

    // Soft outer glow
    ctx.fillStyle = '#004455'
    ctx.globalAlpha = 0.06 + Math.sin(this.time * 3) * 0.03
    ctx.beginPath()
    ctx.arc(cx, cy, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    const cr = this.corruptionLevel
    const redMix = cr === 0 ? 0 : cr === 1 ? 0.08 : cr === 2 ? 0.22 : 0.42

    // Orb body — very dark cyan, corruption adds red
    ctx.fillStyle =
      redMix > 0
        ? `rgb(${Math.floor(0 + redMix * 40)},${Math.floor(26 - redMix * 10)},${Math.floor(34 - redMix * 20)})`
        : '#001a22'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()

    // Orb rim — dim, flickering
    ctx.strokeStyle =
      cr >= 2 && Math.sin(this.time * 11) > 0.4 ? '#ff4466' : '#00aacc'
    ctx.lineWidth   = 1.5
    ctx.globalAlpha = 0.25 + Math.sin(this.time * 5) * 0.15
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Inner core — faint dot only (12% power)
    ctx.fillStyle = cr >= 3 ? '#ff6666' : '#00ffff'
    ctx.globalAlpha = 0.15 + Math.sin(this.time * 4) * 0.08
    ctx.beginPath()
    ctx.arc(cx, cy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // 3 orbiting sparkle dots
    for (let i = 0; i < 3; i++) {
      const a  = this.time * 1.8 + (i * Math.PI * 2 / 3)
      const ox = cx + Math.cos(a) * (R + 6)
      const oy = cy + Math.sin(a) * (R + 6)
      ctx.fillStyle = '#00ccdd'
      ctx.globalAlpha = 0.15 + Math.abs(Math.sin(a)) * 0.25
      ctx.fillRect(ox - 1, oy - 1, 2, 2)
    }
    ctx.globalAlpha = 1

    // Glitch horizontal slice artifact
    if (Math.sin(this.flickerPhase * 11) > 0.75) {
      ctx.fillStyle = '#00ffff'
      ctx.globalAlpha = 0.12
      ctx.fillRect(cx - R, cy - 1, R * 2, 2)
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}
