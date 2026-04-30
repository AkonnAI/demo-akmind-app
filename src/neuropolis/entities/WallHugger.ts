import type { Rect } from './Drone'

// ──────────────────────────────────────────────────────────────
// LEVEL 2 ENEMY: WALL HUGGER
// Crab-shaped crawler that patrols vertically along an arch
// pillar.  If AX comes within trigger range it leaps toward him;
// after landing it re-attaches to the nearest surface.
// Cannot be locked on (erratic airborne trajectory).
// ──────────────────────────────────────────────────────────────

// ═══ TUNING ════════════════════════════════════════════════════
const HUGGER_W              = 20
const HUGGER_H              = 20
const HUGGER_HP             = 2
const HUGGER_SPEED          = 80        // vertical patrol px/s
const HUGGER_COLOR          = '#ff8c00'
const HUGGER_EYE            = '#ffffff'
const HUGGER_SHELL_DARK     = '#8a3b00'

const HUGGER_TRIGGER_DX     = 180
const HUGGER_TRIGGER_DY     = 200
const HUGGER_LEAP_VY        = -300
const HUGGER_LEAP_VX_FACTOR = 0.8
const HUGGER_LEAP_VX_MAX    = 220
const HUGGER_GRAVITY        = 700
const HUGGER_HIT_TIMER      = 0.15
const HUGGER_CEILING_Y      = 80
const HUGGER_GROUND_MARGIN  = 30
const HUGGER_DEATH_ANIM     = 0.35

type Mode = 'patrol' | 'leap' | 'stun' | 'dying'

export class WallHugger {
  // World center position
  x: number
  y: number
  hp       = HUGGER_HP
  active   = true
  exploded = false

  private readonly anchorX: number
  private readonly groundY: number
  private mode:      Mode   = 'patrol'
  private dirY:      number = 1        // 1=down, -1=up
  private vx         = 0
  private vy         = 0
  private time       = 0
  private hitTimer   = 0
  private stunTimer  = 0
  private deathTimer = 0
  private deathSpin  = 0

  constructor(anchorX: number, groundY: number, startY?: number) {
    this.anchorX = anchorX
    this.groundY = groundY
    this.x       = anchorX
    this.y       = startY !== undefined
      ? startY
      : HUGGER_CEILING_Y + 40
  }

  update(dt: number, playerCX: number, playerCY: number): void {
    this.time += dt
    if (this.hitTimer > 0) this.hitTimer = Math.max(0, this.hitTimer - dt)

    if (this.mode === 'dying') {
      this.deathTimer += dt
      this.deathSpin  += dt * 14
      this.vy += HUGGER_GRAVITY * dt
      this.x  += this.vx * dt
      this.y  += this.vy * dt
      if (this.y > this.groundY - HUGGER_H / 2) {
        this.y  = this.groundY - HUGGER_H / 2
        this.vx = 0
        this.vy = 0
      }
      return
    }

    if (!this.active) return

    if (this.mode === 'patrol') {
      // Vertical oscillation between ceiling and ground margins.
      this.y += this.dirY * HUGGER_SPEED * dt
      const top = HUGGER_CEILING_Y + HUGGER_H / 2 + 6
      const bot = this.groundY    - HUGGER_GROUND_MARGIN
      if (this.y > bot) { this.y = bot; this.dirY = -1 }
      if (this.y < top) { this.y = top; this.dirY =  1 }
      this.x = this.anchorX

      // Leap trigger — AX in window.
      const dx = playerCX - this.x
      const dy = playerCY - this.y
      if (Math.abs(dx) < HUGGER_TRIGGER_DX &&
          Math.abs(dy) < HUGGER_TRIGGER_DY) {
        const clampVX = Math.max(
          -HUGGER_LEAP_VX_MAX,
          Math.min(HUGGER_LEAP_VX_MAX, dx * HUGGER_LEAP_VX_FACTOR)
        )
        this.vx   = clampVX
        this.vy   = HUGGER_LEAP_VY
        this.mode = 'leap'
      }
    } else if (this.mode === 'leap') {
      this.vy += HUGGER_GRAVITY * dt
      this.x  += this.vx * dt
      this.y  += this.vy * dt
      // Landed — either back on its pillar (re-anchor x) or on
      // the ground.  Short stun then back to patrol.
      if (this.y > this.groundY - HUGGER_H / 2 - 2) {
        this.y         = this.groundY - HUGGER_H / 2 - 2
        this.vx        = 0
        this.vy        = 0
        this.mode      = 'stun'
        this.stunTimer = 0.5
      }
    } else if (this.mode === 'stun') {
      this.stunTimer -= dt
      if (this.stunTimer <= 0) {
        // Re-attach: snap horizontally back to the anchor pillar.
        this.x    = this.anchorX
        this.dirY = -1              // start climbing up
        this.mode = 'patrol'
      }
    }
  }

  takeHit(): void {
    if (!this.active) return
    this.hp--
    this.hitTimer = HUGGER_HIT_TIMER
    if (this.hp <= 0) {
      this.active = false
      this.mode   = 'dying'
      this.deathTimer = 0
      this.vx = (Math.random() - 0.5) * 140
      this.vy = -180
    }
  }

  getRect(): Rect {
    return {
      x: this.x - HUGGER_W / 2,
      y: this.y - HUGGER_H / 2,
      w: HUGGER_W,
      h: HUGGER_H,
    }
  }

  /** Leap-body vs player collision.  Only active while leaping.
   *  One hit per leap — we end the leap in 'stun' so the crab
   *  can't keep damaging the player with the same jump. */
  checkLeapHit(
    ax: number, ay: number, aw: number, ah: number
  ): boolean {
    if (this.mode !== 'leap' || !this.active) return false
    const r = this.getRect()
    if (ax + aw < r.x || ax > r.x + r.w) return false
    if (ay + ah < r.y || ay > r.y + r.h) return false
    // Consume the leap so we don't double-hit mid-air.
    this.mode      = 'stun'
    this.stunTimer = 0.5
    this.vx        = 0
    this.vy        = 0
    return true
  }

  /** Done once the death tumble has settled on the floor. */
  isDone(): boolean {
    return this.mode === 'dying' && this.deathTimer >= HUGGER_DEATH_ANIM
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    const sy = this.y
    if (sx < -40 || sx > 1320) return
    ctx.imageSmoothingEnabled = false

    const flash = this.hitTimer > 0
    const col   = flash ? '#ffffff' : HUGGER_COLOR
    const dying = this.mode === 'dying'
    const alpha = dying
      ? Math.max(0, 1 - this.deathTimer / HUGGER_DEATH_ANIM)
      : 1

    ctx.save()
    ctx.translate(sx, sy)
    if (dying) ctx.rotate(this.deathSpin)
    // If moving up the wall, flip so eyes face up.
    else if (this.dirY < 0) { ctx.scale(1, -1) }

    ctx.globalAlpha = alpha

    // Legs (3 per side) — animated with sin wave.
    ctx.strokeStyle = col
    ctx.lineWidth   = 1.5
    for (let i = 0; i < 3; i++) {
      const offY = -6 + i * 6
      const wig  = Math.sin(this.time * 10 + i * 1.3) * 2
      // Left leg
      ctx.beginPath()
      ctx.moveTo(-HUGGER_W / 2, offY)
      ctx.lineTo(-HUGGER_W / 2 - 6, offY + wig)
      ctx.stroke()
      // Right leg
      ctx.beginPath()
      ctx.moveTo( HUGGER_W / 2, offY)
      ctx.lineTo( HUGGER_W / 2 + 6, offY + wig)
      ctx.stroke()
    }

    // Body shell
    ctx.fillStyle = col
    ctx.fillRect(-HUGGER_W / 2, -HUGGER_H / 2, HUGGER_W, HUGGER_H)
    ctx.fillStyle   = HUGGER_SHELL_DARK
    ctx.globalAlpha = alpha * 0.6
    ctx.fillRect(-HUGGER_W / 2, -HUGGER_H / 2, HUGGER_W, 4)
    ctx.globalAlpha = alpha

    // Two white dot eyes (face is "down" in untranslated space;
    // the ctx.scale(1,-1) above flips them when climbing up).
    ctx.fillStyle = HUGGER_EYE
    ctx.fillRect(-5, 2, 3, 3)
    ctx.fillRect( 2, 2, 3, 3)

    // Core heat line in the middle of the shell.
    ctx.fillStyle = '#ffcc80'
    ctx.globalAlpha = alpha * (0.5 + Math.sin(this.time * 6) * 0.3)
    ctx.fillRect(-HUGGER_W / 2 + 2, 0, HUGGER_W - 4, 1)
    ctx.globalAlpha = alpha

    ctx.restore()

    // HP pips above (only when alive and on wall).
    if (!dying && this.active) {
      for (let i = 0; i < HUGGER_HP; i++) {
        ctx.fillStyle = i < this.hp ? '#00ff88' : '#1a1a2e'
        ctx.fillRect(sx - 6 + i * 7, sy - HUGGER_H / 2 - 8, 5, 3)
      }
    }

    // Leap trail while airborne.
    if (this.mode === 'leap') {
      ctx.fillStyle   = HUGGER_COLOR
      ctx.globalAlpha = 0.4
      ctx.fillRect(sx - 2, sy + 8, 4, 10)
      ctx.globalAlpha = 1
    }
    ctx.globalAlpha = 1
  }
}
