import { CONFIG } from '../constants/config'

/** NeuroCorps broadcast amplifier — rotating ring debuffs movement (no direct HP damage). */
export class BroadcastDrone {
  x: number
  y: number
  active = true
  exploded = false
  hp = 2

  private hitFlash = 0
  private ringAngle = 0
  private ringActive = false
  private readonly minX: number
  private readonly maxX: number
  private dir = 1
  private readonly speed: number
  private t = 0

  private deathT = 0
  private deathRingR = 24
  private sparks: {
    x: number
    y: number
    vx: number
    vy: number
    life: number
  }[] = []

  private stunTimer = 0

  constructor(
    x: number,
    y: number,
    patrolHalfWidth: number,
    speed: number,
  ) {
    this.x = x
    this.y = y
    this.minX = x - patrolHalfWidth
    this.maxX = x + patrolHalfWidth
    this.speed = speed
  }

  /** Paused towers / arena — freeze patrol + ring. */
  combatPaused = false

  stun(duration: number): void {
    this.stunTimer = duration
  }

  update(dt: number, playerX: number, playerY: number): void {
    this.t += dt
    this.ringAngle += 1.5 * dt
    this.hitFlash = Math.max(0, this.hitFlash - dt)

    if (!this.active && !this.exploded) {
      this.deathT += dt
      this.deathRingR += dt * 220
      for (const s of this.sparks) {
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.life -= dt
      }
      this.sparks = this.sparks.filter(s => s.life > 0)
      if (this.deathT > 0.45 && this.sparks.length === 0) this.exploded = true
      return
    }

    if (!this.active) return

    if (this.stunTimer > 0) {
      this.stunTimer -= dt
      return
    }

    if (!this.combatPaused) {
      this.x += this.dir * this.speed * dt
      if (this.x > this.maxX) {
        this.x = this.maxX
        this.dir = -1
      }
      if (this.x < this.minX) {
        this.x = this.minX
        this.dir = 1
      }
    }

    const dist = Math.hypot(playerX - this.x, playerY - this.y)
    this.ringActive = dist < 180
    if (this.ringActive) {
      this.ringAngle += dt * 2
    }
  }

  isDebuffing(playerX: number, playerY: number): boolean {
    return (
      this.active &&
      this.ringActive &&
      Math.hypot(playerX - this.x, playerY - this.y) < 26
    )
  }

  takeHit(): void {
    if (!this.active) return
    this.hp--
    this.hitFlash = 0.12
    if (this.hp <= 0) {
      this.active = false
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        this.sparks.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(a) * 180,
          vy: Math.sin(a) * 180,
          life: 0.45,
        })
      }
    }
  }

  getRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.x - 20, y: this.y - 9, w: 40, h: 18 }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return

    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.imageSmoothingEnabled = false

    if (!this.active && !this.exploded) {
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 2
      ctx.globalAlpha = Math.max(0, 0.6 - this.deathT)
      ctx.beginPath()
      ctx.arc(sx, this.y, this.deathRingR, 0, Math.PI * 2)
      ctx.stroke()
      for (const s of this.sparks) {
        ctx.fillStyle = '#4a9eff'
        ctx.globalAlpha = Math.max(0, s.life * 2)
        ctx.fillRect(s.x - cameraX - 1.5, s.y - 1.5, 3, 3)
      }
      ctx.globalAlpha = 1
      ctx.setLineDash([])
      ctx.restore()
      return
    }

    if (!this.active && this.exploded) {
      ctx.restore()
      return
    }

    ctx.translate(sx, this.y)

    const HUE = this.ringActive ? '#ff8c00' : '#4a9eff'

    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.ellipse(0, 0, 22, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.fillStyle = '#0e0a1a'
    ctx.strokeStyle = HUE
    ctx.lineWidth = 2
    ctx.shadowColor = HUE
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#4a9eff'
    ctx.lineWidth = 1
    ctx.shadowColor = '#4a9eff'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      ctx.strokeStyle = HUE
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 9)
      ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 14)
      ctx.stroke()
    }

    ctx.save()
    ctx.rotate(this.ringAngle)
    ctx.setLineDash([8, 8])
    ctx.strokeStyle = HUE
    ctx.lineWidth = 1.5
    ctx.globalAlpha = this.ringActive ? 0.9 : 0.4
    ctx.shadowColor = HUE
    ctx.shadowBlur = this.ringActive ? 14 : 6
    ctx.beginPath()
    ctx.arc(0, 0, 24, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.setLineDash([])

    for (let h = 0; h < 2; h++) {
      ctx.fillStyle = h < this.hp ? '#00ff88' : '#1a1a1a'
      ctx.fillRect(-8 + h * 10, -18, 6, 3)
    }

    if (this.stunTimer > 0) {
      ctx.strokeStyle = '#7c4dff'
      ctx.lineWidth = 2
      ctx.shadowColor = '#7c4dff'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(0, 0, 34, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
