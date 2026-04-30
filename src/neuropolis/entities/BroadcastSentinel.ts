import { CONFIG } from '../constants/config'

export interface SpawnDrone {
  x: number; y: number; vx: number; vy: number
  hp: number; life: number
}

export class BroadcastSentinel {
  x: number
  y: number
  hp = 4
  active   = true
  exploded = false
  scoreEmitted = false
  spawned  = false   // whether spawn drones have been emitted
  activated = false

  private patrolL: number
  private patrolR: number
  private speed = 60
  private dir   = 1
  private time  = 0
  private stunTimer = 0
  private shootTimer = 2.0

  spawnDrones: SpawnDrone[] = []

  // Pending shots at player
  shots: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = []

  constructor(x: number, groundY: number, patrolL: number, patrolR: number) {
    this.x       = x
    this.y       = groundY - 54
    this.patrolL = patrolL
    this.patrolR = patrolR
  }

  getRect() { return { x: this.x - 12, y: this.y - 27, w: 24, h: 54 } }

  takeHit(): void {
    this.hp--
    if (this.hp <= 0) {
      this.active = false
      if (!this.spawned) {
        this.spawned = true
        for (let i = 0; i < 2; i++) {
          this.spawnDrones.push({
            x: this.x, y: this.y,
            vx: (i === 0 ? -1 : 1) * 120, vy: -60,
            hp: 1, life: 4.0,
          })
        }
      }
    }
  }

  stun(duration: number): void {
    this.stunTimer = duration
    // EMP prevents spawn broadcast
    this.spawned = true
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time += dt

    if (this.stunTimer > 0) { this.stunTimer -= dt; return }

    this.x += this.dir * this.speed * dt
    if (this.x > this.patrolR) { this.x = this.patrolR; this.dir = -1 }
    if (this.x < this.patrolL) { this.x = this.patrolL; this.dir = 1  }

    this.shootTimer -= dt
    if (this.shootTimer <= 0) {
      this.shootTimer = 2.5
      const dx = playerX - this.x, dy = playerY - this.y
      const len = Math.hypot(dx, dy) || 1
      this.shots.push({ x: this.x, y: this.y, vx: (dx / len) * 220, vy: (dy / len) * 220, life: 2.0 })
    }

    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt
      if (s.life <= 0) this.shots.splice(i, 1)
    }

    // Update spawn drones
    for (let i = this.spawnDrones.length - 1; i >= 0; i--) {
      const sd = this.spawnDrones[i]!
      const ddx = playerX - sd.x, ddy = playerY - sd.y
      const ddist = Math.hypot(ddx, ddy) || 1
      sd.x += (ddx / ddist) * 120 * dt
      sd.y += (ddy / ddist) * 120 * dt
      sd.life -= dt
      if (sd.life <= 0 || sd.hp <= 0) this.spawnDrones.splice(i, 1)
    }
  }

  checkShotHit(px: number, py: number, pw: number, ph: number): boolean {
    for (const s of this.shots) {
      if (s.x > px && s.x < px + pw && s.y > py && s.y < py + ph) return true
    }
    for (const sd of this.spawnDrones) {
      if (sd.x > px && sd.x < px + pw && sd.y > py && sd.y < py + ph) return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.activated) return
    const sx = this.x - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return

    ctx.save()

    // Tall angular body
    ctx.fillStyle = this.stunTimer > 0 ? '#4444ff' : '#3a0a0a'
    ctx.fillRect(sx - 12, this.y - 27, 24, 54)
    ctx.fillStyle = '#ff8c00'
    ctx.fillRect(sx - 12, this.y - 27, 24, 2)
    ctx.fillRect(sx - 12, this.y + 25, 24, 2)

    // Antenna on back
    ctx.fillStyle = '#4a4a4a'
    ctx.fillRect(sx + 8, this.y - 47, 4, 20)
    ctx.fillStyle = '#ff1744'
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(sx + 10, this.y - 47, 3, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0

    // Eye visor
    ctx.fillStyle = '#ff1744'
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 6
    ctx.fillRect(sx - 8, this.y - 14, 16, 5)
    ctx.shadowBlur = 0

    // HP pips
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i < this.hp ? '#ff1744' : '#3a0808'
      ctx.fillRect(sx - 10 + i * 6, this.y - 32, 4, 4)
    }

    // Shots
    for (const s of this.shots) {
      const shx = s.x - cameraX
      ctx.fillStyle = '#ff1744'
      ctx.beginPath(); ctx.arc(shx, s.y, 5, 0, Math.PI * 2); ctx.fill()
    }

    // Spawn drones
    for (const sd of this.spawnDrones) {
      const dx = sd.x - cameraX
      ctx.fillStyle = '#ff4444'
      ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 8
      ctx.fillRect(dx - 6, sd.y - 6, 12, 12)
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
