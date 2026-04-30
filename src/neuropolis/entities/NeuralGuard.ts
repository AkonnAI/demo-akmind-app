import { CONFIG } from '../constants/config'

export class NeuralGuard {
  x: number
  y: number
  hp = 4
  active = true
  activated = false
  private patrolL: number
  private patrolR: number
  private speed = 75
  private dir = 1
  private time = 0
  private stunTimer = 0
  private shootCD = 0
  private telegraph = 0
  private beamLife = 0
  private beamDir = 1
  private lastPlayerX = 0
  private lastPlayerVX = 0
  private predictTimer = 0
  private targetX = 0

  constructor(x: number, groundY: number, patrolL: number, patrolR: number) {
    this.x = x
    this.y = groundY - 48
    this.patrolL = patrolL
    this.patrolR = patrolR
    this.targetX = x
    this.lastPlayerX = x
  }

  stun(d: number): void {
    this.stunTimer = d
  }

  takeHit(): void {
    if (!this.active) return
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, playerX: number, _playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time += dt
    this.shootCD = Math.max(0, this.shootCD - dt)
    if (this.telegraph > 0) {
      const prevT = this.telegraph
      this.telegraph = Math.max(0, this.telegraph - dt)
      if (prevT > 0 && this.telegraph <= 0) {
        this.beamLife = 0.08
        this.beamDir = this.lastPlayerX >= this.x ? 1 : -1
        this.shootCD = 2.4
      }
    }
    if (this.stunTimer > 0) {
      this.stunTimer -= dt
      return
    }

    this.predictTimer -= dt
    if (this.predictTimer <= 0) {
      this.predictTimer = 0.5
      const vx = (playerX - this.lastPlayerX) / 0.5
      this.lastPlayerVX = Math.abs(vx) < 2000 ? vx : this.lastPlayerVX
      this.lastPlayerX = playerX
      this.targetX = playerX + this.lastPlayerVX * 0.8
      this.targetX = Math.max(this.patrolL, Math.min(this.patrolR, this.targetX))
    }

    const near = Math.abs(playerX - this.x) < 320
    const aim = near ? this.targetX : playerX
    if (aim < this.x - 4) this.x -= this.speed * dt
    else if (aim > this.x + 4) this.x += this.speed * dt

    if (this.x < this.patrolL) {
      this.x = this.patrolL
      this.dir = 1
    }
    if (this.x > this.patrolR) {
      this.x = this.patrolR
      this.dir = -1
    }
    void this.dir

    if (near && this.shootCD <= 0 && this.telegraph <= 0) {
      this.telegraph = 0.4
    }
    this.beamLife = Math.max(0, this.beamLife - dt)
  }

  getActiveBeam(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (this.beamLife <= 0 || !this.active) return null
    const len = 400
    return {
      x1: this.x,
      y1: this.y - 20,
      x2: this.x + this.beamDir * len,
      y2: this.y - 20,
    }
  }

  getRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.x - 14, y: this.y - 48, w: 28, h: 48 }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active || !this.activated) return
    const sx = this.x - cameraX
    const sy = this.y
    ctx.save()
    ctx.translate(sx, sy)
    ctx.fillStyle = '#0a0420'
    ctx.strokeStyle = '#7c3dff'
    ctx.lineWidth = 2
    ctx.shadowColor = '#7c3dff'
    ctx.shadowBlur = 14
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2
      const px = Math.cos(a) * 14
      const py = Math.sin(a) * 22 + 4
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0a0420'
    ctx.fillRect(-10, -8, 6, 18)
    ctx.fillRect(4, -8, 6, 18)
    const cyc = Math.floor(this.time) % 3
    const vis = ['#7c3dff', '#4a0d9e', '#ffffff'][cyc]!
    ctx.fillStyle = this.telegraph > 0 ? '#ffffff' : vis
    ctx.fillRect(-10, -36, 20, 6)
    ctx.restore()
    void CONFIG
  }
}
