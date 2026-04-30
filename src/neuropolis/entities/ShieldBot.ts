import { CONFIG } from '../constants/config'
import type { Projectile } from './Projectile'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface HomingOrb {
  x: number
  y: number
  vx: number
  vy: number
  active: boolean
}

/** Ground patrol with directional shield — EMP or rear shots get through. */
export class ShieldBot {
  x: number
  y: number
  active = true
  hp = 3
  scoreEmitted = false
  activated = false
  facingRight = true
  readonly width = 32
  readonly height = 48

  private patrolLeft: number
  private patrolRight: number
  private speed: number
  private dir = 1
  private time = 0
  private stunTimer = 0
  private hitFlash = 0
  private shieldBroken = false
  private shieldBreakTimer = 0
  private shootTimer = 0
  private orbs: HomingOrb[] = []
  private sparks: Spark[] = []

  constructor(
    x: number,
    y: number,
    patrolLeft: number,
    patrolRight: number,
    speed = 55,
  ) {
    this.x = x
    this.y = y
    this.patrolLeft = patrolLeft
    this.patrolRight = patrolRight
    this.speed = speed
  }

  stun(duration: number): void {
    this.stunTimer = duration
  }

  getRect(): Rect {
    return { x: this.x, y: this.y, w: this.width, h: this.height }
  }

  getOrbs(): readonly HomingOrb[] {
    return this.orbs
  }

  private burstParticles(n: number, color: string, spread = 200): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5
      this.sparks.push({
        x: this.x + this.width / 2,
        y: this.y + this.height * 0.35,
        vx: Math.cos(a) * spread * (0.6 + Math.random() * 0.4),
        vy: Math.sin(a) * spread * (0.6 + Math.random() * 0.4),
        life: 0.35 + Math.random() * 0.2,
        color,
      })
    }
  }

  tryDeflect(proj: Projectile): boolean {
    if (proj.empMode) {
      if (!this.shieldBroken) {
        this.shieldBroken = true
        this.shieldBreakTimer = 3
        this.burstParticles(10, '#7c4dff', 260)
      }
      return false
    }
    if (this.shieldBroken || this.shieldBreakTimer > 0) return false
    const fromFront =
      (this.facingRight && proj.vx < 0) ||
      (!this.facingRight && proj.vx > 0)
    if (fromFront) {
      proj.vx *= -1.7
      proj.deflectT = 0.4
      this.burstParticles(5, '#00e5ff', 180)
      return true
    }
    return false
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
    playerY: number,
    playerW: number,
    playerH: number,
  ): void {
    if (!this.active) {
      for (const o of this.orbs) o.active = false
      return
    }
    const pcx = playerX + playerW / 2
    if (!this.activated) {
      if (pcx > this.x - 400) this.activated = true
      else return
    }
    this.time += dt
    this.hitFlash = Math.max(0, this.hitFlash - dt)
    if (this.shieldBreakTimer > 0) {
      this.shieldBreakTimer -= dt
      if (this.shieldBreakTimer <= 0) this.shieldBroken = false
    }

    for (const s of this.sparks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
    }
    this.sparks = this.sparks.filter(s => s.life > 0)

    if (this.stunTimer > 0) {
      this.stunTimer -= dt
      return
    }

    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2
    const tcx = playerX + playerW / 2
    const tcy = playerY + playerH / 2
    const dist = Math.hypot(tcx - cx, tcy - cy)

    if (dist < 300) {
      this.facingRight = tcx >= cx
      this.shootTimer += dt
      if (this.shootTimer >= 2) {
        this.shootTimer = 0
        const ox = this.facingRight ? this.x + this.width + 4 : this.x - 4
        const oy = this.y + this.height * 0.35
        this.orbs.push({
          x: ox,
          y: oy,
          vx: this.facingRight ? 120 : -120,
          vy: 0,
          active: true,
        })
      }
    } else {
      this.x += this.dir * this.speed * dt
      if (this.x + this.width > this.patrolRight) {
        this.x = this.patrolRight - this.width
        this.dir = -1
      }
      if (this.x < this.patrolLeft) {
        this.x = this.patrolLeft
        this.dir = 1
      }
      this.facingRight = this.dir > 0
    }

    const turn = 2 * dt
    for (const o of this.orbs) {
      if (!o.active) continue
      const dx = tcx - o.x
      const dy = tcy - o.y
      const d = Math.hypot(dx, dy) || 1
      const tx = (dx / d) * 100
      const ty = (dy / d) * 100
      o.vx += (tx - o.vx) * turn
      o.vy += (ty - o.vy) * turn
      const sp = Math.hypot(o.vx, o.vy)
      if (sp > 100) {
        o.vx = (o.vx / sp) * 100
        o.vy = (o.vy / sp) * 100
      }
      o.x += o.vx * dt
      o.y += o.vy * dt
    }
  }

  checkOrbHit(ax: number, ay: number, aw: number, ah: number): boolean {
    const pad = 6
    for (const o of this.orbs) {
      if (!o.active) continue
      if (
        o.x >= ax - pad &&
        o.x <= ax + aw + pad &&
        o.y >= ay - pad &&
        o.y <= ay + ah + pad
      ) {
        o.active = false
        return true
      }
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.activated) return
    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.imageSmoothingEnabled = false

    const sx = this.x - cameraX

    for (const s of this.sparks) {
      ctx.fillStyle = s.color
      ctx.globalAlpha = Math.max(0, s.life * 3)
      ctx.fillRect(s.x - cameraX - 2, s.y - 2, 4, 4)
    }
    ctx.globalAlpha = 1

    for (const o of this.orbs) {
      if (!o.active) continue
      ctx.fillStyle = '#00aaff'
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(o.x - cameraX, o.y, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    if (!this.active) {
      ctx.restore()
      return
    }

    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) {
      ctx.restore()
      return
    }

    const pulse = 0.85 + Math.sin(this.time * 5) * 0.15
    const shieldOK = !this.shieldBroken && this.shieldBreakTimer <= 0
    const shieldDown = this.shieldBroken || this.shieldBreakTimer > 0
    const bodyPulse = shieldDown
      ? 0.55 + Math.sin(this.time * 12) * 0.45
      : 1

    if (shieldOK) {
      ctx.save()
      ctx.translate(sx + (this.facingRight ? this.width : 0), this.y + this.height * 0.35)
      const sc = this.facingRight ? 1 : -1
      ctx.scale(sc, 1)
      ctx.fillStyle = '#00e5ff'
      ctx.globalAlpha = 0.55 * pulse
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(0, 0, 28, -Math.PI / 2, Math.PI / 2)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    ctx.fillStyle = shieldDown
      ? `rgba(${Math.floor(80 + 100 * bodyPulse)},${Math.floor(20 + 30 * (1 - bodyPulse))},${Math.floor(20 + 20 * (1 - bodyPulse))},1)`
      : this.hitFlash > 0
        ? '#2a3444'
        : '#0e1420'
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 2
    ctx.fillRect(sx, this.y, this.width, this.height)
    ctx.strokeRect(sx + 0.5, this.y + 0.5, this.width - 1, this.height - 1)

    ctx.fillStyle = '#00e5ff'
    ctx.fillRect(sx + 6, this.y + 14, this.width - 12, 4)

    if (this.stunTimer > 0) {
      ctx.strokeStyle = '#7c4dff'
      ctx.lineWidth = 2
      ctx.shadowColor = '#7c4dff'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(sx + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
