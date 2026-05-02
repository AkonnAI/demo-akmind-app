export interface Rect {
  x: number; y: number; w: number; h: number
}

export class Drone {
  x: number
  y: number
  hp = 3
  active = true
  exploded = false

  private startX: number
  private rangeLeft: number
  private rangeRight: number
  private speed: number
  private dir = 1
  private time = 0

  // Scan beam
  private scanAngle = 0
  private readonly SCAN_RANGE = 180
  private readonly SCAN_HALF_ANGLE = 0.35  // radians

  // Hit flash
  private hitTimer = 0
  private stunTimer = 0

  // Scan learning bonus
  scanBonus = 0
  private scanBonusTimer = 0
  private scanBonusInitial = 0
  private scanBonusDuration = 1

  constructor(
    x: number, y: number,
    patrolLeft: number, patrolRight: number,
    speed = 55
  ) {
    this.x          = x
    this.y          = y
    this.startX     = x
    this.rangeLeft  = patrolLeft
    this.rangeRight = patrolRight
    this.speed      = speed
  }

  stun(duration: number): void {
    this.stunTimer = duration
  }

  addScanBonus(amount: number, duration: number): void {
    this.scanBonus = amount
    this.scanBonusInitial = amount
    this.scanBonusDuration = duration
    this.scanBonusTimer = duration
  }

  update(dt: number): void {
    if (!this.active) return
    this.time += dt
    this.hitTimer = Math.max(0, this.hitTimer - dt)
    if (this.scanBonusTimer > 0) {
      this.scanBonusTimer -= dt
      if (this.scanBonusTimer <= 0) {
        this.scanBonus = 0
        this.scanBonusTimer = 0
      } else {
        this.scanBonus = this.scanBonusInitial * (this.scanBonusTimer / this.scanBonusDuration)
      }
    }
    if (this.stunTimer > 0) {
      this.stunTimer -= dt
      return
    }

    // Patrol movement
    this.x += this.dir * this.speed * dt
    if (this.x > this.startX + this.rangeRight) {
      this.x   = this.startX + this.rangeRight
      this.dir = -1
    }
    if (this.x < this.startX - this.rangeLeft) {
      this.x   = this.startX - this.rangeLeft
      this.dir = 1
    }

    // Scan angle oscillates
    this.scanAngle = Math.sin(this.time * 1.2) * 0.4
  }

  // Returns true if AX is inside scan cone
  isDetecting(ax: number, ay: number): boolean {
    if (!this.active) return false
    const dx = ax - this.x
    const dy = ay - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > this.SCAN_RANGE) return false

    // Check if within cone angle (pointing down)
    const angleToAX = Math.atan2(dy, dx)
    const coneCenter = Math.PI / 2  // pointing down
    const diff = Math.abs(angleToAX - coneCenter)
    return diff < this.SCAN_HALF_ANGLE + this.scanBonus + Math.abs(this.scanAngle)
  }

  takeHit(): void {
    this.hp--
    this.hitTimer = 0.12
    if (this.hp <= 0) {
      this.active = false
    }
  }

  // Collision rect for projectile hits
  getRect(): Rect {
    return { x: this.x - 20, y: this.y - 6, w: 40, h: 18 }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active) return
    const sx = this.x - cameraX
    const sy = this.y
    if (sx < -100 || sx > 1380) return

    ctx.imageSmoothingEnabled = false
    const flash = this.hitTimer > 0

    // ── SCAN BEAM ──
    const swing = Math.sin(this.time * 1.2) * 50
    ctx.strokeStyle = '#ff1744'
    ctx.lineWidth = 0.8
    for (let i = -2; i <= 2; i++) {
      ctx.globalAlpha = 0.06 + (1 - Math.abs(i) / 3) * 0.08
      ctx.beginPath()
      ctx.moveTo(sx + i * 5, sy + 12)
      ctx.lineTo(sx + swing + i * 22, sy + this.SCAN_RANGE)
      ctx.stroke()
    }
    // Cone fill
    ctx.fillStyle = '#ff1744'
    ctx.globalAlpha = 0.04
    ctx.beginPath()
    ctx.moveTo(sx - 14, sy + 12)
    ctx.lineTo(sx + 14, sy + 12)
    ctx.lineTo(sx + swing + 44, sy + this.SCAN_RANGE)
    ctx.lineTo(sx + swing - 44, sy + this.SCAN_RANGE)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    // ── DRONE BODY ──
    ctx.fillStyle = flash ? '#ffffff' : '#0a0818'
    ctx.fillRect(sx - 22, sy, 44, 12)
    ctx.fillRect(sx - 8, sy - 10, 16, 10)

    // Rotor arms
    ctx.fillStyle = flash ? '#ffffff' : '#0d0b1e'
    ctx.fillRect(sx - 32, sy + 2, 12, 6)
    ctx.fillRect(sx + 20, sy + 2, 12, 6)

    // Rotor blur rings
    ctx.strokeStyle = flash ? '#ffffff' : '#1a1535'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(sx - 30, sy + 5, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(sx + 30, sy + 5, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Red center light
    const blink = Math.sin(this.time * 8) > 0.2
    ctx.fillStyle = blink ? '#ff1744' : '#2d0008'
    ctx.fillRect(sx - 3, sy + 3, 6, 6)

    // NeuroCorps hex logo
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a  = (i / 6) * Math.PI * 2 - Math.PI / 6
      const hx = sx + Math.cos(a) * 6
      const hy = sy + 6 + Math.sin(a) * 6
      if (i === 0) ctx.moveTo(hx, hy)
      else         ctx.lineTo(hx, hy)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.globalAlpha = 1

    // HP pips above drone
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < this.hp ? '#00ff88' : '#1a1a2e'
      ctx.fillRect(sx - 10 + i * 10, sy - 16, 7, 4)
    }

    if (this.stunTimer > 0) {
      ctx.save()
      ctx.strokeStyle = '#7c4dff'
      ctx.lineWidth = 2
      ctx.shadowColor = '#7c4dff'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(sx, sy + 4, 28, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }
  }
}
