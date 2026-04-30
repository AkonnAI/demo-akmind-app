import type { Rect } from './Drone'

// ──────────────────────────────────────────────────────────────
// LEVEL 2 ENEMY: SENTRY MINE
// Stationary enemy bolted to the ground.  Charges when AX comes
// within detect radius, then fires 4 projectiles in a + pattern.
// Cannot be locked on by the reticle (stationary target — homing
// it would trivialise the puzzle of timing your approach).
// ──────────────────────────────────────────────────────────────

// ═══ TUNING ════════════════════════════════════════════════════
const MINE_RADIUS           = 14
const MINE_HP               = 2
const MINE_DETECT_RANGE     = 200
const MINE_CHARGE_TIME      = 1.2
const MINE_COOLDOWN_TIME    = 2.5
const MINE_PROJECTILE_SPEED = 220
const MINE_PROJECTILE_LIFE  = 1.8
const MINE_PROJECTILE_SIZE  = 6
const MINE_SPIN_IDLE        = Math.PI / 2     // 90°/s
const MINE_SPIN_CHARGE      = Math.PI * 2.5   // faster while charging
const MINE_BODY_COLOR       = '#cc00ff'
const MINE_CHARGE_COLOR     = '#ff44ff'
const MINE_FLASH_COLOR      = '#cc00ff'
const MINE_HIT_TIMER        = 0.15
const MINE_DEATH_ANIM       = 0.2

export interface MineProjectile {
  x:    number
  y:    number
  vx:   number
  vy:   number
  life: number
}

type State = 'idle' | 'charging' | 'cooldown' | 'dying'

export class SentryMine {
  x: number
  y: number
  hp       = MINE_HP
  active   = true
  exploded = false

  readonly radius = MINE_RADIUS

  // Per-mine projectiles (each mine tracks its own burst).
  projectiles: MineProjectile[] = []

  private state:       State  = 'idle'
  private time              = 0
  private stateTimer        = 0
  private diamondAngle      = 0
  private hitTimer          = 0
  private deathTimer        = 0
  private alertPulse        = 0

  constructor(x: number, groundY: number) {
    this.x = x
    // Bolted to the ground — center sits just above it.
    this.y = groundY - MINE_RADIUS - 2
  }

  update(dt: number, playerCX: number, playerCY: number): void {
    if (!this.active && this.state !== 'dying') {
      this.updateProjectiles(dt)
      return
    }

    this.time += dt
    this.stateTimer += dt
    this.hitTimer = Math.max(0, this.hitTimer - dt)

    // Inner diamond spin rate depends on alertness.
    const spin = this.state === 'charging'
      ? MINE_SPIN_CHARGE : MINE_SPIN_IDLE
    this.diamondAngle = (this.diamondAngle + spin * dt) % (Math.PI * 2)

    if (this.state === 'dying') {
      this.deathTimer += dt
      if (this.deathTimer >= MINE_DEATH_ANIM &&
          this.projectiles.length === 0) {
        // leave the object alive for GameScene2 to detect death
        // (exploded flag is set externally, as with Drone).
      }
      this.updateProjectiles(dt)
      return
    }

    const dist = Math.hypot(this.x - playerCX, this.y - playerCY)

    if (this.state === 'idle') {
      this.alertPulse = Math.max(0, this.alertPulse - dt * 1.5)
      if (dist < MINE_DETECT_RANGE) {
        this.state      = 'charging'
        this.stateTimer = 0
        this.alertPulse = 1
      }
    } else if (this.state === 'charging') {
      this.alertPulse = Math.min(1, this.alertPulse + dt * 3)
      if (this.stateTimer >= MINE_CHARGE_TIME) {
        this.fireBurst()
        this.state      = 'cooldown'
        this.stateTimer = 0
      }
    } else if (this.state === 'cooldown') {
      this.alertPulse = Math.max(0, this.alertPulse - dt * 1.5)
      if (this.stateTimer >= MINE_COOLDOWN_TIME) {
        // Decide next state based on current proximity.
        if (dist < MINE_DETECT_RANGE) {
          this.state      = 'charging'
          this.stateTimer = 0
        } else {
          this.state      = 'idle'
          this.stateTimer = 0
        }
      }
    }

    this.updateProjectiles(dt)
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.x    += p.vx * dt
      p.y    += p.vy * dt
      p.life -= dt
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0)
  }

  private fireBurst(): void {
    const dirs: [number, number][] = [
      [ 0, -1], // up
      [ 0,  1], // down
      [-1,  0], // left
      [ 1,  0], // right
    ]
    for (const [dx, dy] of dirs) {
      this.projectiles.push({
        x:    this.x,
        y:    this.y,
        vx:   dx * MINE_PROJECTILE_SPEED,
        vy:   dy * MINE_PROJECTILE_SPEED,
        life: MINE_PROJECTILE_LIFE,
      })
    }
  }

  takeHit(): void {
    if (!this.active) return
    this.hp--
    this.hitTimer = MINE_HIT_TIMER
    if (this.hp <= 0) {
      this.active = false
      this.state  = 'dying'
      this.deathTimer = 0
    }
  }

  getRect(): Rect {
    const r = this.radius
    return { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 }
  }

  /** AABB check between a projectile from this mine and the
   *  player.  Consumed projectiles have their life zeroed so the
   *  cleanup pass removes them next frame. */
  checkProjectileHit(
    ax: number, ay: number, aw: number, ah: number
  ): boolean {
    const half = MINE_PROJECTILE_SIZE / 2
    for (const p of this.projectiles) {
      if (p.life <= 0) continue
      if (ax + aw < p.x - half) continue
      if (ax      > p.x + half) continue
      if (ay + ah < p.y - half) continue
      if (ay      > p.y + half) continue
      p.life = 0
      return true
    }
    return false
  }

  /** True once the death animation is finished and every
   *  projectile has also expired — safe to cull. */
  isDone(): boolean {
    return this.state === 'dying'
        && this.deathTimer >= MINE_DEATH_ANIM
        && this.projectiles.length === 0
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    const sy = this.y
    if (sx < -60 || sx > 1340) {
      this.renderProjectiles(ctx, cameraX)
      return
    }
    ctx.imageSmoothingEnabled = false

    // Dying animation: body shrinks to 0 over MINE_DEATH_ANIM and
    // 4 spike fragments fly outward (simple sin-based drift).
    const dying = this.state === 'dying'
    const shrink = dying
      ? Math.max(0, 1 - this.deathTimer / MINE_DEATH_ANIM)
      : 1

    if (dying && shrink > 0) {
      ctx.save()
      ctx.translate(sx, sy)
      ctx.scale(shrink, shrink)
      this.drawBody(ctx)
      ctx.restore()
      // Spike fragment burst.
      const t    = this.deathTimer
      const fade = 1 - t / MINE_DEATH_ANIM
      ctx.strokeStyle = MINE_BODY_COLOR
      ctx.lineWidth   = 2
      ctx.globalAlpha = Math.max(0, fade)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        const d = 20 + t * 90
        const fx = sx + Math.cos(a) * d
        const fy = sy + Math.sin(a) * d
        ctx.beginPath()
        ctx.moveTo(fx - Math.cos(a) * 6, fy - Math.sin(a) * 6)
        ctx.lineTo(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (this.active) {
      ctx.save()
      ctx.translate(sx, sy)
      this.drawBody(ctx)
      ctx.restore()
      // HP pips above.
      for (let i = 0; i < MINE_HP; i++) {
        ctx.fillStyle = i < this.hp ? '#00ff88' : '#1a1a2e'
        ctx.fillRect(sx - 5 + i * 7, sy - MINE_RADIUS - 9, 5, 3)
      }
      // "DETECT" radius flicker while charging.
      if (this.state === 'charging') {
        const t = this.stateTimer / MINE_CHARGE_TIME
        ctx.strokeStyle = MINE_CHARGE_COLOR
        ctx.lineWidth   = 1
        ctx.globalAlpha = 0.3 + Math.sin(this.time * 16) * 0.2
        ctx.beginPath()
        ctx.arc(sx, sy, 20 + t * 24, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    this.renderProjectiles(ctx, cameraX)
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const r       = this.radius
    const charged = this.state === 'charging'
    const flash   = this.hitTimer > 0
    const color   = flash ? '#ffffff'
                  : charged ? MINE_CHARGE_COLOR
                            : MINE_BODY_COLOR

    // 8-sided polygon body.
    ctx.fillStyle   = '#1a0a1e'
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8
      const px = Math.cos(a) * r
      const py = Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else         ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // 4 spikes radiating outward (cardinal directions).
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    for (let i = 0; i < 4; i++) {
      const a  = (i / 4) * Math.PI * 2
      const sx = Math.cos(a) * r
      const sy = Math.sin(a) * r
      const ex = Math.cos(a) * (r + 10)
      const ey = Math.sin(a) * (r + 10)
      ctx.globalAlpha = charged ? 1 : 0.85
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(ex, ey)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Inner rotating diamond.
    ctx.save()
    ctx.rotate(this.diamondAngle)
    ctx.fillStyle = charged ? '#ffffff' : color
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(6,  0)
    ctx.lineTo(0,  6)
    ctx.lineTo(-6, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Core glow when charging hard.
    if (charged) {
      ctx.fillStyle   = '#ffffff'
      ctx.globalAlpha = 0.5 + Math.sin(this.time * 14) * 0.4
      ctx.beginPath()
      ctx.arc(0, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  private renderProjectiles(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    const half = MINE_PROJECTILE_SIZE / 2
    ctx.fillStyle = MINE_FLASH_COLOR
    for (const p of this.projectiles) {
      const sx = p.x - cameraX
      if (sx < -20 || sx > 1300) continue
      ctx.globalAlpha = 0.25
      ctx.fillRect(sx - half - 2, p.y - half - 2, MINE_PROJECTILE_SIZE + 4, MINE_PROJECTILE_SIZE + 4)
      ctx.globalAlpha = 0.9
      ctx.fillRect(sx - half, p.y - half, MINE_PROJECTILE_SIZE, MINE_PROJECTILE_SIZE)
    }
    ctx.globalAlpha = 1
  }
}
