import { Drone, Rect } from './Drone'

// ────────────────────────────────────────────────────────────
// CRAWLER — Level 2's signature enemy.
// Spider-like bot that lives UPSIDE-DOWN on the tunnel ceiling
// and drips acid on AX from above. See PROJECT.md §13 Level 2.
//
// Crawler extends Drone so it can share the lock-on / projectile
// collision pipeline (Projectile.lockOn accepts Drone).  Every
// Drone behaviour is overridden — no scan cone, no flying patrol
// motion. The shape of the public API is what matters for type
// compatibility, not the implementation.
// ────────────────────────────────────────────────────────────

// Named tuning constants (PROJECT.md §9 — no magic numbers inline)
export const CRAWLER_CEILING_Y     = 80
export const CRAWLER_BODY_W        = 28
export const CRAWLER_BODY_H        = 14
export const CRAWLER_HP            = 2
export const CRAWLER_DETECT_RANGE  = 300
export const CRAWLER_DETECT_SPEEDUP = 2
export const CRAWLER_DETECT_DRIP_S = 1.5
export const CRAWLER_DRIP_VY       = 400
export const CRAWLER_DRIP_GRAVITY  = 260
export const CRAWLER_DRIP_W        = 4
export const CRAWLER_DRIP_H        = 12
export const CRAWLER_DRIP_MAX_LIFE = 3
export const CRAWLER_SPLASH_LIFE   = 0.28
export const CRAWLER_FALL_GRAV     = 900
export const CRAWLER_FALL_ROTRATE  = 8
export const CRAWLER_HIT_COLOR     = '#39ff14'
export const CRAWLER_DRIP_COLOR    = '#8cff14'

interface AcidDrip {
  x:          number
  y:          number
  vy:         number
  age:        number
  phase:      'fall' | 'splash'
  splashTime: number
}

export class Crawler extends Drone {
  readonly drips: AcidDrip[] = []

  /** Public pause flag — flipped by Level2 when the crawler is
   *  inside a "puzzle safe zone" (vault timeline chamber, or
   *  outside the glitch-twin arena while the boss fight is live).
   *  While paused the crawler stops moving, stops dripping, and
   *  does not animate — but in-flight drips continue to fall so
   *  the player cannot hide behind a freeze. */
  patrolPaused = false

  private dripTimer       = 0
  private dripIntervalIdle: number
  private dripIntervalAlert: number
  private baseSpeed:      number
  private alertSpeedMul   = CRAWLER_DETECT_SPEEDUP
  private minX:           number
  private maxX:           number
  private crawlDir:       number = 1

  // Death tumble state
  private falling        = false
  private fallVY         = 0
  private fallRotation   = 0
  private landed         = false
  private deathTime      = 0

  // For flash tint lookups (Drone.hitTimer is private)
  private crawlerHit     = 0

  constructor(
    startX:    number,
    rangeLeft: number,
    rangeRight:number,
    speed:     number,
    dripIntervalIdle: number = 3.5,
  ) {
    // Super places us at ceiling height but we never use Drone's
    // scan/patrol data after this point. See file header.
    super(startX, CRAWLER_CEILING_Y, rangeLeft, rangeRight, speed)
    this.hp                 = CRAWLER_HP
    this.baseSpeed          = speed
    this.dripIntervalIdle   = dripIntervalIdle
    this.dripIntervalAlert  = CRAWLER_DETECT_DRIP_S
    this.minX               = startX - rangeLeft
    this.maxX               = startX + rangeRight
  }

  // Crawlers never scan.
  override isDetecting(_ax: number, _ay: number): boolean {
    void _ax; void _ay
    return false
  }

  override takeHit(): void {
    if (!this.active) return
    this.hp--
    this.crawlerHit = 0.15
    if (this.hp <= 0) {
      this.active  = false
      this.falling = true
      this.fallVY  = 0
    }
  }

  /** Collision rect for projectile AABB hits (larger than the
   *  drone default so lock-on homing shots register cleanly). */
  override getRect(): Rect {
    return {
      x: this.x - CRAWLER_BODY_W / 2,
      y: this.y - CRAWLER_BODY_H / 2,
      w: CRAWLER_BODY_W,
      h: CRAWLER_BODY_H + 6,
    }
  }

  /** Called from Level2 each frame.  playerX is used for the
   *  "alerted when AX is within 300 px horizontally" rule. */
  override update(dt: number): void { void dt }

  updateCrawler(dt: number, playerX: number, groundY: number): void {
    this.crawlerHit = Math.max(0, this.crawlerHit - dt)

    if (this.falling) {
      this.updateDeathFall(dt, groundY)
    } else if (this.active && !this.patrolPaused) {
      const alerted = Math.abs(playerX - this.x) < CRAWLER_DETECT_RANGE
      const speed   = alerted
        ? this.baseSpeed * this.alertSpeedMul
        : this.baseSpeed
      this.x += this.crawlDir * speed * dt
      if (this.x < this.minX) { this.x = this.minX; this.crawlDir =  1 }
      if (this.x > this.maxX) { this.x = this.maxX; this.crawlDir = -1 }

      const interval = alerted
        ? this.dripIntervalAlert
        : this.dripIntervalIdle
      this.dripTimer += dt
      if (this.dripTimer >= interval) {
        this.dripTimer = 0
        this.drips.push({
          x: this.x, y: this.y + CRAWLER_BODY_H / 2,
          vy: CRAWLER_DRIP_VY,
          age: 0, phase: 'fall', splashTime: 0,
        })
      }
    }

    // Drip physics — keep running even after death so in-flight
    // drops still land correctly.
    for (let i = this.drips.length - 1; i >= 0; i--) {
      const d = this.drips[i]!
      d.age += dt
      if (d.phase === 'fall') {
        d.vy += CRAWLER_DRIP_GRAVITY * dt
        d.y  += d.vy * dt
        if (d.y >= groundY - 2) {
          d.y          = groundY - 2
          d.phase      = 'splash'
          d.splashTime = 0
        } else if (d.age > CRAWLER_DRIP_MAX_LIFE) {
          this.drips.splice(i, 1)
        }
      } else {
        d.splashTime += dt
        if (d.splashTime >= CRAWLER_SPLASH_LIFE) {
          this.drips.splice(i, 1)
        }
      }
    }
  }

  private updateDeathFall(dt: number, groundY: number): void {
    this.deathTime += dt
    if (!this.landed) {
      this.fallVY      += CRAWLER_FALL_GRAV * dt
      this.y           += this.fallVY * dt
      this.fallRotation += CRAWLER_FALL_ROTRATE * dt
      if (this.y + CRAWLER_BODY_H / 2 >= groundY) {
        this.y       = groundY - CRAWLER_BODY_H / 2
        this.landed  = true
        this.exploded = true
      }
    }
  }

  /** True once the crawler is fully spent and should be culled
   *  (after its landing animation finishes). */
  isDone(): boolean {
    return this.landed && this.deathTime > 0.45 && this.drips.length === 0
  }

  /** Public flag used by Level2 to detect the exact frame the
   *  tumbling crawler's body first touches the ground, so a big
   *  acid splash particle burst can be spawned once. */
  isLanded(): boolean {
    return this.landed
  }

  /** AX damage — returns true if a falling drip struck the given
   *  AABB, and consumes that drip (converts to splash). */
  checkDripHit(ax: number, ay: number, aw: number, ah: number): boolean {
    for (const d of this.drips) {
      if (d.phase !== 'fall') continue
      if (ax + aw < d.x - CRAWLER_DRIP_W / 2) continue
      if (ax     > d.x + CRAWLER_DRIP_W / 2) continue
      if (ay + ah < d.y - CRAWLER_DRIP_H / 2) continue
      if (ay     > d.y + CRAWLER_DRIP_H / 2) continue
      d.phase      = 'splash'
      d.splashTime = 0
      return true
    }
    return false
  }

  override render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    if (sx < -80 || sx > 1360) { this.renderDrips(ctx, cameraX); return }

    ctx.imageSmoothingEnabled = false

    if (this.falling) {
      this.renderFalling(ctx, sx)
    } else if (this.active) {
      this.renderAlive(ctx, sx)
    }

    this.renderDrips(ctx, cameraX)
  }

  private renderAlive(ctx: CanvasRenderingContext2D, sx: number): void {
    const sy    = this.y
    const flash = this.crawlerHit > 0
    const body  = flash ? '#ffffff' : CRAWLER_HIT_COLOR
    const half  = CRAWLER_BODY_W / 2

    // Legs — 8 thin, animated via sine swing.  Drawn first so the
    // body overlaps them at the joint.
    ctx.strokeStyle = flash ? '#ffffff' : '#208820'
    ctx.lineWidth   = 1
    const t      = performance.now() / 1000
    const swing  = Math.sin(t * 8) * 0.35
    const swing2 = Math.sin(t * 8 + Math.PI * 0.5) * 0.35
    for (let i = 0; i < 4; i++) {
      const offX = -half + (i * (CRAWLER_BODY_W / 3))
      // left leg
      const ly  = sy - CRAWLER_BODY_H / 2 + 2
      const tip = sy + 18 + Math.sin(t * 9 + i) * 2
      ctx.beginPath()
      ctx.moveTo(sx + offX, ly)
      ctx.lineTo(sx + offX - 6 + swing * 4, (ly + tip) / 2)
      ctx.lineTo(sx + offX - 10 + swing2 * 4, tip)
      ctx.stroke()
      // right leg (mirrored)
      ctx.beginPath()
      ctx.moveTo(sx + offX, ly)
      ctx.lineTo(sx + offX + 6 - swing * 4, (ly + tip) / 2)
      ctx.lineTo(sx + offX + 10 - swing2 * 4, tip)
      ctx.stroke()
    }

    // Body
    ctx.fillStyle = body
    ctx.fillRect(
      sx - half, sy - CRAWLER_BODY_H / 2,
      CRAWLER_BODY_W, CRAWLER_BODY_H
    )
    // Body highlight
    ctx.fillStyle   = '#c8ff88'
    ctx.globalAlpha = 0.35
    ctx.fillRect(sx - half + 2, sy - CRAWLER_BODY_H / 2 + 2, CRAWLER_BODY_W - 4, 2)
    ctx.globalAlpha = 1

    // Red eye dots on the leading face (dir > 0 → right eyes, dir < 0 → left)
    ctx.fillStyle = '#ff1744'
    const eyeOff = this.crawlDir > 0 ? half - 6 : -half + 4
    ctx.fillRect(sx + eyeOff, sy - 2, 2, 2)
    ctx.fillRect(sx + eyeOff + (this.crawlDir > 0 ? -4 : 4), sy - 2, 2, 2)

    // HP pips BELOW the body (crawler is on the ceiling so "above"
    // would be inside the stone).
    for (let i = 0; i < CRAWLER_HP; i++) {
      ctx.fillStyle = i < this.hp ? CRAWLER_HIT_COLOR : '#123a12'
      ctx.fillRect(sx - half + 4 + i * 10, sy + CRAWLER_BODY_H / 2 + 4, 7, 3)
    }

    // Thin silhouette tether up to the ceiling so it reads as
    // "hanging from the stone".
    ctx.strokeStyle = '#145514'
    ctx.lineWidth   = 0.8
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    ctx.moveTo(sx, CRAWLER_CEILING_Y - 2)
    ctx.lineTo(sx, sy - CRAWLER_BODY_H / 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  private renderFalling(ctx: CanvasRenderingContext2D, sx: number): void {
    const alpha = this.landed
      ? Math.max(0, 1 - (this.deathTime - 0) * 2.4)
      : 1
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.translate(sx, this.y)
    ctx.rotate(this.fallRotation)
    ctx.fillStyle = CRAWLER_HIT_COLOR
    ctx.fillRect(
      -CRAWLER_BODY_W / 2, -CRAWLER_BODY_H / 2,
      CRAWLER_BODY_W, CRAWLER_BODY_H
    )
    ctx.strokeStyle = '#208820'
    ctx.lineWidth   = 1
    for (let i = 0; i < 4; i++) {
      const off = -CRAWLER_BODY_W / 2 + i * 7
      ctx.beginPath()
      ctx.moveTo(off, 0)
      ctx.lineTo(off - 6, 10)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(off, 0)
      ctx.lineTo(off + 6, 10)
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  private renderDrips(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const d of this.drips) {
      const sx = d.x - cameraX
      if (sx < -30 || sx > 1310) continue
      if (d.phase === 'fall') {
        ctx.fillStyle   = CRAWLER_DRIP_COLOR
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.ellipse(sx, d.y, CRAWLER_DRIP_W / 2, CRAWLER_DRIP_H / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.25
        ctx.beginPath()
        ctx.ellipse(sx, d.y, CRAWLER_DRIP_W, CRAWLER_DRIP_H * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      } else {
        const pct = d.splashTime / CRAWLER_SPLASH_LIFE
        ctx.fillStyle   = CRAWLER_DRIP_COLOR
        ctx.globalAlpha = Math.max(0, 1 - pct)
        // 3 tiny splash squares spreading out
        for (let i = -1; i <= 1; i++) {
          const r  = pct * 10
          const px = sx + i * r
          const py = d.y - Math.abs(i) * 2
          ctx.fillRect(px - 1, py - 1, 2, 2)
        }
        ctx.globalAlpha = 1
      }
    }
  }
}

