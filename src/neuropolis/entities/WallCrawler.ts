import { CONFIG } from '../constants/config'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Wall patrol bot — vertical crawl + acid drips (no leap). */
export class WallCrawler {
  x: number
  y: number
  active = true
  hp = 2
  scoreEmitted = false
  readonly wallX: number

  drips: Array<{ x: number; y: number; vy: number }> = []
  dripTimer = 1.5 + Math.random() * 2

  private patrolTop: number
  private patrolBottom: number
  private speed: number
  private dir = 1
  private time = 0
  private stunTimer = 0
  private hitFlash = 0

  constructor(
    _x: number,
    wallX: number,
    patrolTop: number,
    patrolBottom: number,
    speed = 70,
  ) {
    this.wallX = wallX
    this.x = wallX
    this.y = (patrolTop + patrolBottom) / 2
    this.patrolTop = patrolTop
    this.patrolBottom = patrolBottom
    this.speed = speed
  }

  stun(duration: number): void {
    this.stunTimer = duration
  }

  getRect(): Rect {
    const r = 22
    return { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 }
  }

  takeHit(): void {
    if (!this.active) return
    this.hp--
    this.hitFlash = 0.12
    if (this.hp <= 0) this.active = false
  }

  update(
    dt: number,
    playerX: number,
    _playerY: number,
    playerW: number,
    _playerH: number,
    groundY: number,
  ): void {
    this.time += dt
    this.hitFlash = Math.max(0, this.hitFlash - dt)

    if (!this.active) return

    if (this.stunTimer > 0) {
      this.stunTimer -= dt
      for (const d of this.drips) {
        d.y += d.vy * dt
      }
      this.drips = this.drips.filter(d => d.y < groundY)
      return
    }

    this.y += this.dir * this.speed * dt
    if (this.y > this.patrolBottom) {
      this.y = this.patrolBottom
      this.dir = -1
    }
    if (this.y < this.patrolTop) {
      this.y = this.patrolTop
      this.dir = 1
    }

    const pcx = playerX + playerW / 2
    this.dripTimer -= dt
    if (this.dripTimer <= 0 && Math.abs(pcx - this.x) < 40) {
      this.dripTimer = 2.5
      this.drips.push({ x: this.x, y: this.y, vy: 180 })
    }

    for (const d of this.drips) {
      d.y += d.vy * dt
    }
    this.drips = this.drips.filter(d => d.y < groundY)
  }

  checkBodyHit(ax: number, ay: number, aw: number, ah: number): boolean {
    if (!this.active) return false
    const pr = this.getRect()
    return !(
      ax + aw < pr.x ||
      ax > pr.x + pr.w ||
      ay + ah < pr.y ||
      ay > pr.y + pr.h
    )
  }

  checkAcidDripHit(ax: number, ay: number, aw: number, ah: number): boolean {
    if (!this.active) return false
    const pcx = ax + aw / 2
    for (const d of this.drips) {
      if (
        Math.abs(d.x - pcx) < 16 &&
        d.y + 6 > ay &&
        d.y < ay + ah
      ) {
        return true
      }
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active) return
    const sx = this.x - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return

    for (const d of this.drips) {
      const dx = d.x - cameraX
      if (dx < -20 || dx > CONFIG.CANVAS_WIDTH + 20) continue
      ctx.fillStyle = '#00cc44'
      ctx.fillRect(dx - 1.5, d.y, 3, 6)
    }

    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.imageSmoothingEnabled = false

    const R = 22
    const legPhase = this.time * (Math.PI * 2 * 4)
    const legBob = Math.sin(legPhase) * 3

    ctx.translate(sx, this.y)

    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * R
      const py = Math.sin(a) * R
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fillStyle = this.hitFlash > 0 ? '#2a2a3e' : '#0a0a1e'
    ctx.fill()
    ctx.strokeStyle = '#ff6600'
    ctx.lineWidth = 2
    ctx.shadowColor = '#ff6600'
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.shadowBlur = 0

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2
      const ox = Math.cos(a) * R
      const oy = Math.sin(a) * R
      const bob = Math.sin(legPhase + i * 0.7) * 3
      const mx = Math.cos(a) * (R * 0.55)
      const my = Math.sin(a) * (R * 0.55) + bob * 0.5
      const ex = Math.cos(a) * (R + 16) + legBob * Math.cos(a + Math.PI / 2) * 0.2
      const ey = Math.sin(a) * (R + 16) + legBob * Math.sin(a + Math.PI / 2) * 0.2
      ctx.strokeStyle = '#ff6600'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(mx, my)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      ctx.fillStyle = '#ff6600'
      ctx.beginPath()
      ctx.arc(ex, ey, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = '#ff6600'
    ctx.shadowColor = '#ff6600'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(8, -4, 3, 0, Math.PI * 2)
    ctx.arc(14, -4, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    for (let h = 0; h < 2; h++) {
      ctx.fillStyle = h < this.hp ? '#00ff88' : '#1a1a2e'
      ctx.fillRect(-10 + h * 12, -R - 12, 8, 4)
    }

    ctx.restore()
  }
}
