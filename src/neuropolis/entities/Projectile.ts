import { CONFIG } from '../constants/config'

export interface LockTarget {
  x: number
  y: number
  active: boolean
}

export interface GravityField {
  x: number
  y: number
  radius: number
  timer: number
  active: boolean
}

export type ProjectileOpts = {
  empMode?:     boolean
  prismMode?:   boolean
  mirrorMode?:  boolean
  gravityMode?: boolean
  phaseMode?:   boolean
  /** Level 7 module core / enemy-owned shot */
  hostile?:     boolean
  /** Charged pulse — bypasses module core shields */
  chargedPulse?: boolean
  vx?:          number
  vy?:          number
  life?:        number
  color?:       string
}

export class Projectile {
  x: number
  y: number
  vx: number
  vy: number = 0
  active  = true
  age     = 0
  empMode     = false
  prismMode   = false
  mirrorMode  = false
  gravityMode = false
  phaseMode = false
  hostile = false
  chargedPulse = false
  bounceCount = 0
  color: string | null = null
  customLife: number | null = null
  deflectT = 0

  private time = 0
  private homing: LockTarget | null = null
  private locked = false

  // Gravity field spawned on impact (scene reads + clears this)
  pendingGravityField: GravityField | null = null

  constructor(x: number, y: number, dir: number, opts?: ProjectileOpts) {
    this.x = x
    this.y = y
    const base = 520
    if (opts?.vx !== undefined) {
      this.vx = opts.vx
      this.vy = opts.vy ?? 0
    } else if (opts?.phaseMode) {
      this.phaseMode = true
      this.vx = dir * 380
    } else if (opts?.empMode) {
      this.empMode = true
      this.vx = dir * base * 0.5
    } else if (opts?.gravityMode) {
      this.gravityMode = true
      this.vx = dir * base * 0.8
    } else if (opts?.prismMode) {
      this.prismMode = true
      this.vx = dir * base
    } else if (opts?.mirrorMode) {
      this.mirrorMode = true
      this.vx = dir * base
    } else {
      this.vx = dir * base
    }
    if (opts?.phaseMode && !this.phaseMode) this.phaseMode = true
    if (opts?.hostile) this.hostile = true
    if (opts?.chargedPulse) this.chargedPulse = true
    if (opts?.life    !== undefined) this.customLife = opts.life
    if (opts?.color   !== undefined) this.color = opts.color
  }

  lockOn(target: LockTarget): void {
    if (this.empMode) return
    this.homing = target
    this.locked = true
  }

  /** Call when this projectile impacts a wall/platform for mirror bounce. */
  bounceHorizontal(): void {
    this.vx *= -1
    this.bounceCount++
  }
  bounceVertical(): void {
    this.vy *= -1
    this.bounceCount++
  }

  /** Call when gravity bolt impacts — sets the pending field for the scene. */
  triggerGravityField(): void {
    this.pendingGravityField = {
      x: this.x, y: this.y,
      radius: 120, timer: 1.5, active: true,
    }
    this.active = false
  }

  update(dt: number): void {
    this.time += dt
    this.age  += dt

    if (this.deflectT > 0) this.deflectT -= dt

    if (this.locked && this.homing?.active && !this.empMode) {
      const dx = this.homing.x - this.x
      const dy = (this.homing.y + 5) - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 10) {
        const speed = 560
        this.vx += ((dx / dist) * speed - this.vx) * dt * 10
        this.vy += ((dy / dist) * speed - this.vy) * dt * 10
      }
    }

    this.x += this.vx * dt
    this.y += this.vy * dt

    const maxLife = this.customLife ?? 2.2
    if (this.time > maxLife) this.active = false

    // Mirror mode: check if out of reasonable canvas range; scene handles proper bounce
    if (this.mirrorMode && this.bounceCount >= 3) this.active = false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.active) return
    const sx = this.x - cameraX
    if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) return

    ctx.imageSmoothingEnabled = false

    if (this.color) {
      this.renderCustomColor(ctx, sx)
    } else if (this.empMode) {
      this.renderEmp(ctx, sx)
    } else if (this.prismMode) {
      this.renderPrism(ctx, sx)
    } else if (this.mirrorMode) {
      this.renderMirror(ctx, sx)
    } else if (this.gravityMode) {
      this.renderGravity(ctx, sx)
    } else if (this.locked) {
      this.renderHoming(ctx, sx)
    } else {
      this.renderNormal(ctx, sx)
    }
  }

  private renderCustomColor(ctx: CanvasRenderingContext2D, sx: number): void {
    ctx.save()
    ctx.fillStyle = this.color!
    ctx.shadowColor = this.color!
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(sx, this.y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()
  }

  private renderPrism(ctx: CanvasRenderingContext2D, sx: number): void {
    const rot = this.age * 4
    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(rot)
    ctx.shadowColor = '#e040fb'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#e040fb'
    ctx.fillRect(-5, -5, 10, 10)
    ctx.shadowBlur = 0
    // Trail
    const dir = this.vx >= 0 ? 1 : -1
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.4 / i
      ctx.fillRect(-5 - dir * i * 8, -4, 8, 8)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private renderMirror(ctx: CanvasRenderingContext2D, sx: number): void {
    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(Math.PI / 4)
    ctx.shadowColor = '#e2e8f0'
    ctx.shadowBlur = 10
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(-4, -4, 8, 8)
    ctx.shadowBlur = 0
    ctx.globalAlpha = 0.4
    ctx.fillRect(-3, -3, 6, 6)
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private renderGravity(ctx: CanvasRenderingContext2D, sx: number): void {
    ctx.save()
    ctx.translate(sx, this.y)
    ctx.shadowColor = '#00b4d8'
    ctx.shadowBlur = 12
    ctx.fillStyle = '#00b4d8'
    ctx.beginPath()
    ctx.arc(0, 0, 6, 0, Math.PI * 2)
    ctx.fill()
    // Concentric rings
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#00b4d8'
      ctx.globalAlpha = 0.3 - i * 0.08
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, 8 + i * 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0
    ctx.restore()
  }

  private renderEmp(ctx: CanvasRenderingContext2D, sx: number): void {
    const rot = this.age * 5
    const sz  = 12
    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(rot)
    ctx.shadowColor = '#7c4dff'
    ctx.shadowBlur  = 14
    ctx.fillStyle   = '#7c4dff'
    ctx.beginPath()
    ctx.moveTo(0, -sz); ctx.lineTo(sz, 0)
    ctx.lineTo(0, sz);  ctx.lineTo(-sz, 0)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur  = 0
    ctx.strokeStyle = '#b388ff'
    ctx.lineWidth   = 1
    ctx.stroke()
    ctx.restore()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  private renderNormal(ctx: CanvasRenderingContext2D, sx: number): void {
    const dir = this.vx >= 0 ? 1 : -1
    ctx.save()
    ctx.shadowColor = '#00e5ff'
    ctx.shadowBlur  = 12

    const trail: [number, number, number][] = [
      [-8 * dir, 0.4, 8], [-16 * dir, 0.2, 6], [-24 * dir, 0.1, 4],
    ]
    for (const [ox, a, sz] of trail) {
      ctx.save()
      ctx.translate(sx + ox, this.y)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle   = '#00e5ff'
      ctx.globalAlpha = a
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz)
      ctx.restore()
    }

    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(Math.PI / 4)
    ctx.fillStyle   = '#00e5ff'
    ctx.globalAlpha = 1
    ctx.fillRect(-5, -5, 10, 10)
    ctx.restore()

    ctx.restore()
    ctx.shadowBlur  = 0
    ctx.globalAlpha = 1
  }

  private renderHoming(ctx: CanvasRenderingContext2D, sx: number): void {
    const angle = Math.atan2(this.vy, this.vx)
    const pulse = Math.sin(this.age * 20) * 2

    ctx.save()
    ctx.shadowColor = '#ff9100'
    ctx.shadowBlur  = 16

    const speed = Math.hypot(this.vx, this.vy) || 1
    const ux = this.vx / speed
    const uy = this.vy / speed
    for (let i = 1; i <= 4; i++) {
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = Math.max(0, 0.55 - i * 0.12)
      ctx.beginPath()
      ctx.arc(sx - ux * i * 7, this.y - uy * i * 7, Math.max(1.2, 4.5 - i * 0.8), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(angle)
    const hw = 9 + pulse, hh = 4.5 + pulse * 0.4
    ctx.fillStyle   = '#ff9100'
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(-hw, 0); ctx.lineTo(-hw / 2, -hh)
    ctx.lineTo(hw / 2, -hh); ctx.lineTo(hw, 0)
    ctx.lineTo(hw / 2, hh); ctx.lineTo(-hw / 2, hh)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-1.5, -1, 3, 2)
    ctx.restore()

    ctx.restore()
    ctx.shadowBlur  = 0
    ctx.globalAlpha = 1
  }

  getRect() {
    if (this.empMode)   return { x: this.x - 12, y: this.y - 12, w: 24, h: 24 }
    if (this.prismMode) return { x: this.x - 8,  y: this.y - 8,  w: 16, h: 16 }
    return { x: this.x - 8, y: this.y - 4, w: 16, h: 8 }
  }
}
