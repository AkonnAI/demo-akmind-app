import { CONFIG } from '../constants/config'

interface PhantomShot {
  x: number; y: number; vx: number; vy: number; life: number
}

export class PhantomNode {
  x: number
  y: number
  hp = 1
  active   = true
  exploded = false
  scoreEmitted = false
  activated = false

  private time     = 0
  private revealed = false
  private revealTimer = 0
  private shootTimer  = 2.0
  private pulseT      = 0

  shots: PhantomShot[] = []

  constructor(x: number, y: number) {
    this.x = x; this.y = y
  }

  getRect() { return { x: this.x - 20, y: this.y - 20, w: 40, h: 40 } }

  /** True while the node is visible and can be damaged. */
  isVulnerable(): boolean {
    return this.revealed && this.revealTimer > 0
  }

  takeHit(): void {
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  reveal(): void {
    this.revealed    = true
    this.revealTimer = 3.0
  }

  // Returns true if a shot/projectile passed near
  checkReveal(px: number, py: number): boolean {
    if (this.revealed) return false
    const dist = Math.hypot(px - this.x, py - this.y)
    if (dist < 40) { this.reveal(); return true }
    return false
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time += dt
    this.pulseT = Math.sin(this.time * 6)

    if (this.revealTimer > 0) {
      this.revealTimer -= dt
      if (this.revealTimer <= 0) this.revealed = false
    }

    // Shoot at player when invisible
    this.shootTimer -= dt
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.0
      const dx = playerX - this.x, dy = playerY - this.y
      const len = Math.hypot(dx, dy) || 1
      const spd = 180
      this.shots.push({
        x: this.x, y: this.y,
        vx: (dx / len) * spd, vy: (dy / len) * spd,
        life: 2.0,
      })
    }

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt
      if (s.life <= 0) this.shots.splice(i, 1)
    }
  }

  checkShotHit(px: number, py: number, pw: number, ph: number): boolean {
    for (const s of this.shots) {
      if (s.x > px && s.x < px + pw && s.y > py && s.y < py + ph) return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.activated) return
    const sx = this.x - cameraX
    if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) return

    ctx.save()

    if (this.revealed) {
      // Visible as glowing purple orb
      const pulse = this.revealTimer < 1.0 ? 0.5 + this.pulseT * 0.4 : 1
      ctx.globalAlpha = pulse
      ctx.fillStyle = '#9b59b6'
      ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(sx, this.y, 20, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    // Shots always visible
    for (const s of this.shots) {
      const shx = s.x - cameraX
      ctx.fillStyle = '#9b59b6'
      ctx.shadowColor = '#9b59b6'; ctx.shadowBlur = 6
      ctx.beginPath(); ctx.arc(shx, s.y, 5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
