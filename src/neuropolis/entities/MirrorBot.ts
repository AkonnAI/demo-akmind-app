import { CONFIG } from '../constants/config'

interface PathPoint { x: number; y: number }

interface Ghost {
  x: number; y: number
  pathIdx: number
  life: number
}

export class MirrorBot {
  x: number
  y: number
  hp = 2
  active   = true
  exploded = false
  scoreEmitted = false
  activated = false

  private patrolL: number
  private patrolR: number
  private speed = 60
  private dir   = 1
  private time  = 0

  private history: PathPoint[] = []
  private historyTimer = 0
  private ghost: Ghost | null = null
  constructor(x: number, groundY: number, patrolL: number, patrolR: number) {
    this.x       = x
    this.y       = groundY - 27
    this.patrolL = patrolL
    this.patrolR = patrolR
  }

  getRect() { return { x: this.x - 11, y: this.y - 27, w: 22, h: 27 } }
  getGhostRect(): { x: number; y: number; w: number; h: number } | null {
    if (!this.ghost) return null
    return { x: this.ghost.x - 11, y: this.ghost.y - 27, w: 22, h: 27 }
  }

  takeHit(): void {
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    const gateX = playerX + 11
    if (!this.activated) {
      if (gateX > this.x - 400) this.activated = true
      else return
    }
    this.time += dt

    const pcx  = playerX + 11
    const dist = Math.hypot(pcx - this.x, playerY - this.y)

    // Patrol
    this.x += this.dir * this.speed * dt
    if (this.x > this.patrolR) { this.x = this.patrolR; this.dir = -1 }
    if (this.x < this.patrolL) { this.x = this.patrolL; this.dir = 1  }

    // Record player path when in range
    if (dist < 400) {
      this.historyTimer += dt
      if (this.historyTimer >= 0.1) {
        this.historyTimer = 0
        this.history.push({ x: pcx, y: playerY })
        if (this.history.length > 40) this.history.shift()
        // Spawn ghost when we have 4+ points and no ghost alive
        if (this.history.length >= 4 && !this.ghost) {
          const pt = this.history[0]!
          this.ghost = { x: pt.x, y: pt.y, pathIdx: 1, life: 4.0 }
        }
      }
    }

    // Update ghost
    if (this.ghost) {
      this.ghost.life -= dt
      if (this.ghost.life <= 0 || this.ghost.pathIdx >= this.history.length) {
        this.ghost = null
      } else {
        const target = this.history[this.ghost.pathIdx]!
        const gdx = target.x - this.ghost.x
        const gdy = target.y - this.ghost.y
        const gdist = Math.hypot(gdx, gdy) || 1
        const move  = Math.min(200 * dt, gdist)
        this.ghost.x += (gdx / gdist) * move
        this.ghost.y += (gdy / gdist) * move
        if (gdist < 8) this.ghost.pathIdx++
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.activated) return
    const sx = this.x - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return

    ctx.save()

    // Body (dark with white outline)
    ctx.fillStyle = '#1a1a2a'
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1
    ctx.fillRect(sx - 11, this.y - 27, 22, 27)
    ctx.strokeRect(sx - 11 + 0.5, this.y - 27 + 0.5, 21, 26)

    // Eyes
    ctx.fillStyle = '#e040fb'
    ctx.fillRect(sx - 5, this.y - 20, 4, 3)
    ctx.fillRect(sx + 1, this.y - 20, 4, 3)

    // Ghost
    if (this.ghost) {
      const gx = this.ghost.x - cameraX
      ctx.globalAlpha = 0.55
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(gx - 11, this.ghost.y - 27, 22, 27)
      // Static noise lines
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(gx - 11, this.ghost.y - 27 + i * 7, 22, 1)
      }
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}
