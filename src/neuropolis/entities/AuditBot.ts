import { CONFIG } from '../constants/config'

interface AuditShot {
  x: number; y: number; vx: number; vy: number; life: number
}

export class AuditBot {
  x: number
  y: number
  hp = 2
  active   = true
  exploded = false
  scoreEmitted = false
  /** Mario-style spawn gate — AI/render only after player approaches. */
  activated = false

  private patrolL: number
  private patrolR: number
  private speed = 45
  private dir   = 1
  private time  = 0
  private scanAngle = 0
  private shootTimer = 0
  private stunTimer  = 0
  private ledPulse   = 0

  shots: AuditShot[] = []

  constructor(x: number, groundY: number, patrolL: number, patrolR: number) {
    this.x       = x
    this.y       = groundY - 28
    this.patrolL = patrolL
    this.patrolR = patrolR
  }

  getRect() { return { x: this.x - 14, y: this.y - 14, w: 28, h: 28 } }

  takeHit(): void {
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  stun(duration: number): void {
    this.stunTimer = duration
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time      += dt
    this.ledPulse   = Math.sin(this.time * 3)
    this.scanAngle += 0.8 * dt

    if (this.stunTimer > 0) { this.stunTimer -= dt; return }

    // Patrol
    this.x += this.dir * this.speed * dt
    if (this.x > this.patrolR) { this.x = this.patrolR; this.dir = -1 }
    if (this.x < this.patrolL) { this.x = this.patrolL; this.dir = 1  }

    // Check if player in scan range
    const pcx = playerX + 11
    const dx  = pcx - this.x
    const dy  = playerY - this.y
    const dist = Math.hypot(dx, dy)

    if (dist < 300 && Math.abs(Math.atan2(dy, dx) - this.scanAngle) < 0.26) {
      this.shootTimer -= dt
      if (this.shootTimer <= 0) {
        this.shootTimer = 2.2
        const len = dist || 1
        // Fire two parallel shots
        const perpX = -dy / len, perpY = dx / len
        const spd = 200
        for (const sign of [-1, 1]) {
          this.shots.push({
            x: this.x + perpX * sign * 10,
            y: this.y + perpY * sign * 10,
            vx: (dx / len) * spd, vy: (dy / len) * spd,
            life: 2.0,
          })
        }
      }
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
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return

    ctx.save()

    // Perfect white cube
    ctx.fillStyle = this.stunTimer > 0 ? '#4444ff' : '#e8e8f0'
    ctx.fillRect(sx - 14, this.y - 14, 28, 28)

    // Red LED top
    const ledAlpha = 0.6 + this.ledPulse * 0.35
    ctx.fillStyle = '#ff1744'
    ctx.globalAlpha = ledAlpha
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(sx, this.y - 14, 3, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0; ctx.globalAlpha = 1

    // Scan beams
    if (this.stunTimer <= 0) {
      ctx.strokeStyle = '#00b4d8'; ctx.lineWidth = 1; ctx.globalAlpha = 0.4
      for (const sign of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(sx, this.y)
        ctx.lineTo(sx + Math.cos(this.scanAngle + sign * 0.26) * 300,
                   this.y + Math.sin(this.scanAngle + sign * 0.26) * 300)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Shots
    for (const s of this.shots) {
      const shx = s.x - cameraX
      ctx.fillStyle = '#00b4d8'
      ctx.shadowColor = '#00b4d8'; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(shx, s.y, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
