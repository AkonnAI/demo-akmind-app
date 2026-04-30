import { CONFIG } from '../constants/config'

export const ARENA_GROUND_Y = 560

const W = CONFIG.CANVAS_WIDTH
const H = CONFIG.CANVAS_HEIGHT

export interface BossProjectile {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
  fromDecoy: boolean
  spawnTime: number
  kind: 'burst' | 'ring' | 'decoy'
}

interface DecoyUnit {
  x: number
  baseY: number
  dissolveAlpha: number
  dying: boolean
  seed: number
  scale: number
}

interface BossParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface FloorCrack {
  x1: number
  y1: number
  x2: number
  y2: number
  alpha: number
  targetAlpha: number
}

type AttackKind = 'SWEEP' | 'BURST' | 'RING' | 'SLAM'
type AttackPhase =
  | 'waiting'
  | 'idle'
  | 'telegraphing'
  | 'attacking'
  | 'recovering'
  | 'staggered'
  | 'dead'

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n))
}

export class GlitchTwinBoss {
  readonly FLOOR_Y = ARENA_GROUND_Y
  readonly AXIOM_FEET_Y = 560
  readonly DECOY_FEET_Y = 555
  readonly REAL_LEFT = 80
  readonly REAL_RIGHT = 500
  readonly DECOY_LEFT = 700
  readonly DECOY_RIGHT = 1160

  private readonly chestWorldY = this.AXIOM_FEET_Y - 70
  private readonly laserWorldY = this.AXIOM_FEET_Y - 138

  private realX = 200
  private realTargetX = 200
  private realHP = 3
  private realFacingRight = true
  private realSpeed = 100

  private attackState: AttackPhase = 'waiting'
  private attackType: AttackKind = 'BURST'
  private lastAttackType: AttackKind = 'RING'
  private attackTimer = 0
  private hitFlashTimer = 0

  private laserActive = false
  private laserLength = 0
  private laserDir = 1
  private laserDamaged = false
  private readonly laserMaxLen = 520

  private slamPhase: 'none' | 'rising' | 'hanging' | 'falling' | 'impact' = 'none'
  private slamCurrentY = ARENA_GROUND_Y
  private slamTargetX = 0
  private slamShockwaveR = 0
  private slamShockwaveAlpha = 0
  private slamImpactFired = false

  private decoys: DecoyUnit[] = []

  private decoyFireTimer = 3.0

  private phase: 1 | 2 | 3 = 1
  private phaseFlashTimer = 0

  private observing = false
  private observeTimer = 6.0
  private combatStarted = false
  private fightTextTimer = 0

  projectiles: BossProjectile[] = []
  private particles: BossParticle[] = []

  private cracks: FloorCrack[] = []
  private cracksRevealed = 0
  private crackWispAcc = 0

  private lastPlayerX = 640
  private lastPlayerY = 500

  private damageEvents: Array<{ damage: number; type: string }> = []

  private hitScreenFlash = 0

  deathTimer = 0
  defeated = false

  private time = 0

  private readonly circuitLineYs: number[] = []
  private readonly circuitBranches: { y: number; x0: number; len: number }[] = []

  constructor() {
    this.slamCurrentY = this.FLOOR_Y
    this.decoys = [{
      x: 980,
      baseY: this.DECOY_FEET_Y,
      dissolveAlpha: 1,
      dying: false,
      seed: 1.3,
      scale: 1,
    }]
    for (let i = 0; i < 8; i++) {
      this.circuitLineYs.push(40 + i * 70 + (i % 3) * 12)
    }
    for (let i = 0; i < 12; i++) {
      this.circuitBranches.push({
        y: 80 + (i * 47) % 400,
        x0: 100 + (i * 97) % 1080,
        len: 20 + (i * 13) % 40,
      })
    }
    this.buildCracks()
  }

  startObserving(): void {
    this.observing = true
    this.observeTimer = 6.0
    this.attackState = 'waiting'
  }

  getRealHP(): number { return this.realHP }
  getBossHp(): number { return this.realHP }
  getBossBarFlash(): number { return this.hitFlashTimer }
  getPhase(): 1 | 2 | 3 { return this.phase }

  isDefeated(): boolean { return this.defeated }

  getDamageEvents(): Array<{ damage: number; type: string }> {
    const q = [...this.damageEvents]
    this.damageEvents = []
    return q
  }

  getRealTwinRect(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.realX - 50,
      y: this.AXIOM_FEET_Y - 140,
      w: 100,
      h: 140,
    }
  }

  getDecoyRect(i: number): { x: number; y: number; w: number; h: number } | null {
    const d = this.decoys[i]
    if (!d || d.dying) return null
    return { x: d.x - 45, y: d.baseY - 160, w: 90, h: 160 }
  }

  getDecoyCount(): number { return this.decoys.length }

  takeHit(): void {
    if (this.attackState === 'dead') return
    this.realHP--
    this.hitFlashTimer = 0.25
    this.attackState = 'staggered'
    this.attackTimer = 0.35
    this.laserActive = false

    const batch = this.cracksRevealed
    for (let i = batch; i < Math.min(batch + 3, 9); i++) {
      const c = this.cracks[i]
      if (c) c.targetAlpha = 0.75
    }
    this.cracksRevealed = Math.min(this.cracksRevealed + 3, 9)
    this.spawnParticles(this.realX, this.chestWorldY, '#00e5ff', 14, 120)

    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2
      const spd = 70 + Math.random() * 160
      this.particles.push({
        x: this.realX + (Math.random() - 0.5) * 44,
        y: this.AXIOM_FEET_Y - 90,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 90,
        life: 0.7 + Math.random() * 0.4,
        maxLife: 1.1,
        color: i % 3 === 0 ? '#00FFFF' : i % 3 === 1 ? '#0088CC' : '#004466',
        size: 3 + Math.random() * 4,
      })
    }
    this.hitScreenFlash = 0.3

    if (this.realHP <= 0) {
      this.attackState = 'dead'
      this.deathTimer = 0
      this.spawnParticles(this.realX, this.chestWorldY, '#ffffff', 28, 160)
      return
    }

    if (this.realHP === 2 && this.phase === 1) {
      this.phase = 2
      this.realSpeed = 130
      this.phaseFlashTimer = 0.55
    }
    if (this.realHP === 1 && this.phase === 2) {
      this.phase = 3
      this.realSpeed = 165
      this.decoyFireTimer = 1.2
      this.phaseFlashTimer = 0.75
    }
  }

  splitDecoy(index: number): void {
    const o = this.decoys[index]
    if (!o || this.decoys.length >= 3) return
    const sc = this.decoys.length === 1 ? 0.78 : 0.6
    this.decoys.push({
      x: o.x + 70,
      baseY: this.DECOY_FEET_Y,
      dissolveAlpha: 1,
      dying: false,
      seed: o.seed + 2.7,
      scale: sc,
    })
    this.spawnParticles(o.x, o.baseY, '#ff2200', 10, 90)
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.observing) return

    this.time += dt
    this.lastPlayerX = playerX
    this.lastPlayerY = playerY
    this.realFacingRight = playerX > this.realX

    if (this.hitScreenFlash > 0) this.hitScreenFlash -= dt

    for (const c of this.cracks) {
      c.alpha += (c.targetAlpha - c.alpha) * dt * 4
    }

    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 120 * dt
      p.life -= dt
    }
    this.particles = this.particles.filter(p => p.life > 0)

    for (const p of this.projectiles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0)

    if (this.phaseFlashTimer > 0) this.phaseFlashTimer -= dt
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt

    if (this.phase === 3 && this.cracksRevealed > 0) {
      this.crackWispAcc += dt
      while (this.crackWispAcc >= 0.2) {
        this.crackWispAcc -= 0.2
        for (const c of this.cracks) {
          if (c.alpha < 0.05) continue
          this.particles.push({
            x: c.x2,
            y: c.y2,
            vx: (Math.random() - 0.5) * 20,
            vy: -30,
            life: 1.0,
            maxLife: 1.0,
            color: '#ff1a0088',
            size: 2,
          })
        }
      }
    }

    if (this.attackState === 'dead') {
      this.deathTimer += dt
      for (const d of this.decoys) {
        d.dying = true
        d.dissolveAlpha -= dt * 1.8
      }
      if (this.deathTimer > 2) this.defeated = true
      return
    }

    this.updatePatrol(dt, playerX, playerY)
    this.updateAttackState(dt, playerX, playerY)
    this.updateDecoys(dt, playerX, playerY)
    this.checkProjectileDamage(playerX, playerY)
    this.checkLaserDamage(playerX, playerY)
  }

  private updatePatrol(dt: number, playerX: number, playerY: number): void {
    void playerY
    if (
      (this.attackState === 'telegraphing' && this.attackType === 'SWEEP') ||
      (this.attackState === 'attacking' && this.attackType === 'SWEEP') ||
      (this.attackState === 'telegraphing' && this.attackType === 'SLAM') ||
      (this.attackState === 'attacking' && this.attackType === 'SLAM')
    ) {
      this.realTargetX = this.realX
    } else if (this.attackState === 'waiting' || this.attackState === 'idle') {
      this.realTargetX = clamp(playerX - 180, this.REAL_LEFT, this.REAL_RIGHT)
    } else if (this.attackState === 'telegraphing' && this.attackType === 'BURST') {
      this.realTargetX = clamp(playerX - 80, this.REAL_LEFT, this.REAL_RIGHT)
    } else if (this.attackState === 'recovering') {
      this.realTargetX = playerX > 320 ? this.REAL_LEFT + 40 : this.REAL_RIGHT - 40
    }

    const dx = this.realTargetX - this.realX
    const step = Math.sign(dx) * Math.min(Math.abs(dx), this.realSpeed * dt)
    this.realX += step
    this.realX = clamp(this.realX, this.REAL_LEFT, this.REAL_RIGHT)
  }

  private pickNextAttack(_px: number, _py: number): AttackKind {
    if (this.phase === 3) return 'RING'
    const playerNearFloor = (this.lastPlayerY + 54) > this.AXIOM_FEET_Y - 100
    if (
      playerNearFloor &&
      Math.abs(this.lastPlayerX - this.realX) < 280 &&
      this.lastAttackType !== 'SLAM'
    ) {
      return 'SLAM'
    }
    const distX = Math.abs(this.lastPlayerX - this.realX)
    const distY = Math.abs(this.lastPlayerY - this.FLOOR_Y)
    let next: AttackKind
    if (distX < 150) next = distY > 320 ? 'BURST' : 'RING'
    else if (distX > 400) next = 'SWEEP'
    else next = 'BURST'
    if (next === this.lastAttackType) {
      const opts = (['SWEEP', 'BURST', 'RING', 'SLAM'] as AttackKind[]).filter(
        a => a !== this.lastAttackType,
      )
      next = opts[(this.realHP + this.phase) % opts.length] ?? 'BURST'
    }
    return next
  }

  private updateAttackState(dt: number, playerX: number, playerY: number): void {
    if (this.attackState === 'waiting') {
      this.observeTimer -= dt
      if (this.observeTimer <= 0) {
        this.observeTimer = 0
        this.fightTextTimer = 0.85
        this.attackState = 'idle'
        this.combatStarted = true
        this.attackTimer = 0.9
      }
      return
    }

    if (this.fightTextTimer > 0) this.fightTextTimer -= dt

    if (!(this.attackState === 'attacking' && this.attackType === 'SLAM')) {
      this.attackTimer -= dt
    }

    switch (this.attackState) {
      case 'idle':
        if (this.attackTimer <= 0) {
          this.attackType = this.pickNextAttack(playerX, playerY)
          this.lastAttackType = this.attackType
          this.attackState = 'telegraphing'
          this.attackTimer = 0.85
          this.laserActive = false
        }
        break
      case 'telegraphing':
        if (this.attackTimer <= 0) {
          this.attackState = 'attacking'
          this.executeAttack(playerX, playerY)
        }
        break
      case 'attacking':
        if (this.attackType === 'SLAM') {
          this.slamUpdate(dt)
          break
        }
        if (this.attackType === 'SWEEP' && this.laserActive) {
          this.laserLength += 720 * dt
          if (this.laserLength >= this.laserMaxLen) {
            this.laserLength = this.laserMaxLen
            this.attackTimer = 0.28
          }
          if (this.attackTimer <= 0) {
            this.laserActive = false
            this.laserDamaged = false
            this.attackState = 'recovering'
            this.attackTimer = this.phase === 1 ? 1.1 : this.phase === 2 ? 0.85 : 0.55
          }
        } else {
          if (this.attackTimer <= 0) {
            this.attackState = 'recovering'
            this.attackTimer = this.phase === 1 ? 1.1 : this.phase === 2 ? 0.85 : 0.55
          }
        }
        break
      case 'recovering':
        if (this.attackTimer <= 0) {
          this.attackState = 'idle'
          this.attackTimer = this.phase === 1 ? 1.35 : this.phase === 2 ? 0.95 : 0.55
        }
        break
      case 'staggered':
        if (this.attackTimer <= 0) {
          this.attackState = 'recovering'
          this.attackTimer = 0.45
        }
        break
      default:
        break
    }
  }

  private executeAttack(playerX: number, playerY: number): void {
    const pcx = playerX
    const pcy = playerY + 27
    const st = this.time
    const sy = this.chestWorldY
    switch (this.attackType) {
      case 'SWEEP':
        this.laserActive = true
        this.laserLength = 0
        this.laserDamaged = false
        this.laserDir = pcx >= this.realX ? 1 : -1
        this.attackTimer = 2.0
        break
      case 'BURST': {
        const ang = Math.atan2(pcy - sy, pcx - this.realX)
        const spd = this.phase === 1 ? 240 : this.phase === 2 ? 290 : 340
        for (let i = -1; i <= 1; i++) {
          const a = ang + i * 0.22
          this.projectiles.push({
            x: this.realX,
            y: sy,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 3.2,
            color: '#ff9100',
            size: 10,
            fromDecoy: false,
            spawnTime: st,
            kind: 'burst',
          })
        }
        this.attackTimer = 0.12
        break
      }
      case 'RING': {
        const rsp = this.phase === 3 ? 200 : 165
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          this.projectiles.push({
            x: this.realX,
            y: sy,
            vx: Math.cos(a) * rsp,
            vy: Math.sin(a) * rsp,
            life: 3.5,
            color: '#cc00ff',
            size: 10,
            fromDecoy: false,
            spawnTime: st,
            kind: 'ring',
          })
        }
        this.attackTimer = 0.12
        break
      }
      case 'SLAM':
        this.slamPhase = 'rising'
        this.slamCurrentY = this.AXIOM_FEET_Y
        this.slamTargetX = clamp(this.lastPlayerX, this.REAL_LEFT, this.REAL_RIGHT)
        this.slamShockwaveR = 0
        this.slamShockwaveAlpha = 0
        this.slamImpactFired = false
        this.attackTimer = 0.45
        break
      default:
        break
    }
  }

  private slamUpdate(dt: number): void {
    if (this.slamPhase === 'rising') {
      const progress = 1 - this.attackTimer / 0.45
      this.slamCurrentY = this.AXIOM_FEET_Y - 130 * progress
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        this.slamCurrentY = this.AXIOM_FEET_Y - 130
        this.slamPhase = 'hanging'
        this.attackTimer = 0.35
      }
    } else if (this.slamPhase === 'hanging') {
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        this.slamPhase = 'falling'
        this.attackTimer = 0.14
      }
    } else if (this.slamPhase === 'falling') {
      this.slamCurrentY =
        this.AXIOM_FEET_Y - 130 * (this.attackTimer / 0.14)
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        this.slamCurrentY = this.AXIOM_FEET_Y
        this.slamPhase = 'impact'
        this.slamShockwaveR = 0
        this.slamShockwaveAlpha = 1
        this.attackTimer = 0.7
        this.spawnParticles(this.realX, this.AXIOM_FEET_Y, '#00E5FF', 24, 210)
        this.spawnParticles(this.realX, this.AXIOM_FEET_Y, '#FFFFFF', 12, 290)
        for (let i = 0; i < 12; i++) {
          const a = -Math.PI + (i / 11) * Math.PI
          this.particles.push({
            x: this.realX + Math.cos(a) * 20,
            y: this.AXIOM_FEET_Y,
            vx: Math.cos(a) * 170,
            vy: -(90 + Math.random() * 110),
            life: 0.65,
            maxLife: 0.65,
            color: '#00E5FF',
            size: 4,
          })
        }
      }
    } else if (this.slamPhase === 'impact') {
      this.slamShockwaveR += 520 * dt
      if (this.slamShockwaveR > 250) this.slamShockwaveR = 250
      this.slamShockwaveAlpha = this.attackTimer / 0.7
      if (!this.slamImpactFired && this.slamShockwaveR > 10) {
        this.slamImpactFired = true
        const ddx = this.lastPlayerX - this.realX
        const ddy = this.lastPlayerY + 27 - this.AXIOM_FEET_Y
        if (Math.hypot(ddx, ddy) < this.slamShockwaveR + 34) {
          this.damageEvents.push({ damage: 1, type: 'slam' })
        }
      }
      this.attackTimer -= dt
      if (this.attackTimer <= 0) {
        this.slamPhase = 'none'
        this.slamCurrentY = this.AXIOM_FEET_Y
        this.slamShockwaveR = 0
        this.slamShockwaveAlpha = 0
        this.attackState = 'recovering'
        this.attackTimer = this.phase === 1 ? 1.1 : this.phase === 2 ? 0.85 : 0.55
      }
    }
  }

  private updateDecoys(dt: number, playerX: number, playerY: number): void {
    void playerX
    void playerY
    this.decoyFireTimer -= dt
    for (const d of this.decoys) {
      if (d.dying) continue
      const noise = Math.sin(this.time * 2.8 + d.seed) * 100
      const tx = this.DECOY_LEFT + 230 + noise
      d.x += (tx - d.x) * dt * (1.4 + d.seed * 0.1)
      d.x = clamp(d.x, this.DECOY_LEFT, this.DECOY_RIGHT)
    }

    if (this.combatStarted && this.decoyFireTimer <= 0) {
      const iv = this.phase === 1 ? 3.0 : this.phase === 2 ? 2.0 : 1.4
      this.decoyFireTimer = iv + (Math.random() - 0.5) * 0.4
      for (const d of this.decoys) {
        if (d.dying) continue
        const angleToPlayer = Math.atan2(
          this.lastPlayerY + 27 - d.baseY,
          this.lastPlayerX - d.x,
        )
        const spread = (Math.random() - 0.5) * ((Math.PI * 100) / 180)
        const a = angleToPlayer + spread
        const spd = 140 + Math.random() * 70
        this.projectiles.push({
          x: d.x,
          y: d.baseY,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 2.8,
          color: '#cc1111',
          size: 14,
          fromDecoy: true,
          spawnTime: this.time,
          kind: 'decoy',
        })
      }
    }
  }

  private checkProjectileDamage(playerX: number, playerY: number): void {
    const cx = playerX
    const cy = playerY + 27
    for (const p of this.projectiles) {
      const dx = p.x - cx
      const dy = p.y - cy
      const hitR = 26 + p.size * 0.5
      if (Math.hypot(dx, dy) < hitR) {
        p.life = 0
        this.damageEvents.push({
          damage: 1,
          type: p.fromDecoy ? 'decoy' : 'boss',
        })
      }
    }
  }

  private checkLaserDamage(playerX: number, playerY: number): void {
    if (!this.laserActive) return
    const laserX1 = this.realX
    const laserX2 = this.realX + this.laserDir * this.laserLength
    const laserY = this.laserWorldY
    const minX = Math.min(laserX1, laserX2)
    const maxX = Math.max(laserX1, laserX2)
    const pcx = playerX
    const pcy = playerY + 27
    if (
      pcx > minX - 24 &&
      pcx < maxX + 24 &&
      pcy > laserY - 8 &&
      pcy < laserY + 8
    ) {
      if (!this.laserDamaged) {
        this.laserDamaged = true
        this.damageEvents.push({ damage: 1, type: 'laser' })
      }
    }
  }

  private buildCracks(): void {
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI + Math.PI
      const len = 70 + (i % 3) * 38
      this.cracks.push({
        x1: 640,
        y1: this.FLOOR_Y,
        x2: 640 + Math.cos(ang) * len,
        y2: this.FLOOR_Y + Math.sin(ang) * len * 0.42,
        alpha: 0,
        targetAlpha: 0,
      })
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    color: string,
    count: number,
    speed: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = speed * (0.4 + Math.random() * 0.6)
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 3,
      })
    }
  }

  private static hexToRgba(hex: string, a: number): string {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${a})`
  }

  private static neonStroke(
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    hue: string,
    lw: number,
  ): void {
    ctx.save()
    ctx.shadowColor = hue
    ctx.shadowBlur = 24
    ctx.strokeStyle = GlitchTwinBoss.hexToRgba(hue, 0.3)
    ctx.lineWidth = lw * 2
    ctx.stroke(path)
    ctx.shadowBlur = 12
    ctx.strokeStyle = hue
    ctx.lineWidth = lw
    ctx.stroke(path)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = Math.max(0.5, lw * 0.35)
    ctx.stroke(path)
    ctx.restore()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.imageSmoothingEnabled = false
    this.renderArena(ctx)
    this.renderCracks(ctx)
    this.renderProjectiles(ctx)
    for (let di = 0; di < this.decoys.length; di++) {
      const d = this.decoys[di]
      if (!d || d.dissolveAlpha <= 0) continue
      ctx.save()
      ctx.translate(d.x, this.DECOY_FEET_Y)
      this.renderNull(ctx, this.time, d.seed, d.dissolveAlpha, d.scale)
      ctx.restore()
    }
    if (this.attackState !== 'dead') {
      ctx.save()
      const axiomFeetY =
        this.slamPhase !== 'none' && this.slamCurrentY !== 0
          ? this.slamCurrentY
          : this.AXIOM_FEET_Y
      ctx.translate(this.realX, axiomFeetY)
      if (!this.realFacingRight) ctx.scale(-1, 1)
      this.renderAxiom(
        ctx,
        this.time,
        Math.sin(this.time * 1.4) * 2,
        this.attackState,
        this.attackType,
        this.phase,
        this.realHP,
      )
      ctx.restore()
    } else {
      this.renderDeathEffect(ctx)
    }
    if (this.slamPhase === 'impact' && this.slamShockwaveR > 0) {
      ctx.save()
      ctx.shadowColor = '#00E5FF'
      ctx.shadowBlur = 22
      ctx.strokeStyle = '#00E5FF'
      ctx.lineWidth = 5
      ctx.globalAlpha = this.slamShockwaveAlpha * 0.92
      ctx.beginPath()
      ctx.ellipse(
        this.realX,
        this.FLOOR_Y,
        this.slamShockwaveR,
        this.slamShockwaveR * 0.22,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2.5
      ctx.globalAlpha = this.slamShockwaveAlpha * 0.45
      ctx.beginPath()
      ctx.ellipse(
        this.realX,
        this.FLOOR_Y,
        this.slamShockwaveR * 0.55,
        this.slamShockwaveR * 0.55 * 0.22,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }
    this.renderParticles(ctx)
    if (this.hitScreenFlash > 0) {
      ctx.fillStyle = `rgba(0,150,255,${(this.hitScreenFlash / 0.3) * 0.14})`
      ctx.fillRect(0, 0, W, H)
    }
    this.renderLaser(ctx)
    this.renderOverlay(ctx)
    ctx.restore()
  }

  private renderArena(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.fillStyle = '#000006'
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#0a0412'
    ctx.fillRect(0, this.FLOOR_Y, W, 60)

    const g1 = ctx.createRadialGradient(this.realX, this.FLOOR_Y, 0, this.realX, this.FLOOR_Y, 200)
    g1.addColorStop(0, 'rgba(0,80,120,0.15)')
    g1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, this.FLOOR_Y - 80, W, 140)

    const dx = this.decoys[0]?.x ?? 950
    const g2 = ctx.createRadialGradient(dx, this.FLOOR_Y, 0, dx, this.FLOOR_Y, 200)
    g2.addColorStop(0, 'rgba(0,80,120,0.12)')
    g2.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g2
    ctx.fillRect(0, this.FLOOR_Y - 80, W, 140)

    if (this.slamPhase === 'hanging' || this.slamPhase === 'falling') {
      const shadowScale =
        this.slamPhase === 'hanging'
          ? 1 + Math.sin(this.time * 16) * 0.15
          : Math.max(0.1, 1 - this.attackTimer / 0.14)
      ctx.save()
      ctx.fillStyle = 'rgba(0, 229, 255, 0.2)'
      ctx.strokeStyle = '#00E5FF'
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.ellipse(
        this.slamTargetX,
        this.FLOOR_Y - 3,
        58 * shadowScale,
        10 * shadowScale,
        0,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
    }

    const eg = ctx.createLinearGradient(0, this.FLOOR_Y, W, this.FLOOR_Y)
    eg.addColorStop(0, '#00e5ff22')
    eg.addColorStop(0.5, '#00e5ff66')
    eg.addColorStop(1, '#00e5ff22')
    ctx.strokeStyle = eg
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, this.FLOOR_Y + 0.5)
    ctx.lineTo(W, this.FLOOR_Y + 0.5)
    ctx.stroke()

    const pillarXs = [160, 420, 860, 1120]
    for (const px of pillarXs) {
      ctx.fillStyle = '#08041a'
      ctx.fillRect(px - 18, 0, 36, this.FLOOR_Y)
      ctx.strokeStyle = '#12082a'
      ctx.lineWidth = 1
      ctx.strokeRect(px - 18, 0, 36, this.FLOOR_Y)
    }

    ctx.strokeStyle = '#0d0828'
    ctx.lineWidth = 0.5
    for (const y of this.circuitLineYs) {
      ctx.beginPath()
      ctx.moveTo(40, y)
      ctx.lineTo(W - 40, y)
      ctx.stroke()
    }
    for (const b of this.circuitBranches) {
      ctx.beginPath()
      ctx.moveTo(b.x0, b.y)
      ctx.lineTo(b.x0 + b.len, b.y)
      ctx.lineTo(b.x0 + b.len, b.y + 14)
      ctx.stroke()
    }

    const ventXs = [200, 500, 780, 1080]
    for (let i = 0; i < ventXs.length; i++) {
      const vx = ventXs[i] ?? 200
      const sway = Math.sin(this.time * 0.28 + i * 1.4) * 16
      const rg = ctx.createRadialGradient(vx + sway, 0, 0, vx + sway, 0, 260)
      rg.addColorStop(0, 'rgba(160, 200, 255, 0.07)')
      rg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rg
      ctx.fillRect(0, 0, W, 260)
    }

    ctx.strokeStyle = '#1a1040'
    ctx.lineWidth = 1
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(640, 0)
    ctx.lineTo(640, this.FLOOR_Y)
    ctx.stroke()
    ctx.setLineDash([])

    if (this.phase === 3) {
      const a = 0.04 + Math.sin(this.time * 0.8) * 0.03
      ctx.fillStyle = `rgba(120,0,0,${a})`
      ctx.fillRect(0, 0, W, H)
    }

    if (this.phaseFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.phaseFlashTimer / 0.6) * 0.28})`
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  }

  private renderCracks(ctx: CanvasRenderingContext2D): void {
    for (const c of this.cracks) {
      if (c.alpha < 0.02) continue
      ctx.save()
      ctx.strokeStyle = '#ff1a00'
      ctx.lineWidth = 2
      ctx.globalAlpha = c.alpha
      ctx.shadowColor = '#ff3300'
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.moveTo(c.x1, c.y1)
      ctx.lineTo(c.x2, c.y2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.imageSmoothingEnabled = false

      if (p.kind === 'burst') {
        const ang = Math.atan2(p.vy, p.vx)
        ctx.rotate(ang)
        ctx.shadowColor = '#FF9100'
        ctx.shadowBlur = 22
        ctx.fillStyle = GlitchTwinBoss.hexToRgba('#FF9100', 0.35)
        ctx.fillRect(-16, -9, 32, 18)
        ctx.shadowBlur = 10
        ctx.fillStyle = '#FF9100'
        ctx.fillRect(-13, -5, 26, 10)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#FFCC00'
        ctx.fillRect(-9, -3, 18, 6)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(-6, -1.5, 12, 3)
        for (let tr = 1; tr <= 3; tr++) {
          ctx.globalAlpha = 0.4 - tr * 0.12
          ctx.fillStyle = '#FF9100'
          ctx.fillRect(-13 - tr * 14, -4, 12, 8)
        }
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      } else if (p.kind === 'ring') {
        const pR = 13 + Math.sin(this.time * 10 + p.spawnTime) * 3
        ctx.shadowColor = '#CC00FF'
        ctx.shadowBlur = 22
        ctx.strokeStyle = '#CC00FF'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, pR, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 8
        ctx.strokeStyle = '#FF88FF'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(0, 0, pR * 0.7, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = GlitchTwinBoss.hexToRgba('#440066', 0.5)
        ctx.beginPath()
        ctx.arc(0, 0, pR * 0.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.rotate(p.life * 3.5)
        ctx.shadowColor = '#CC1111'
        ctx.shadowBlur = 14
        ctx.strokeStyle = GlitchTwinBoss.hexToRgba('#FF2E63', 0.4)
        ctx.lineWidth = 4
        for (let si = 0; si < 6; si++) {
          const sa = (si / 6) * Math.PI * 2
          const sL = si % 2 === 0 ? 14 : 8
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(sa) * sL, Math.sin(sa) * sL)
          ctx.stroke()
        }
        ctx.strokeStyle = '#FF2E63'
        ctx.lineWidth = 2.5
        for (let si = 0; si < 6; si++) {
          const sa = (si / 6) * Math.PI * 2
          const sL = si % 2 === 0 ? 14 : 8
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(sa) * sL, Math.sin(sa) * sL)
          ctx.stroke()
        }
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 0.8
        for (let si = 0; si < 6; si++) {
          const sa = (si / 6) * Math.PI * 2
          const sL = si % 2 === 0 ? 14 : 8
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(Math.cos(sa) * sL, Math.sin(sa) * sL)
          ctx.stroke()
        }
        ctx.shadowBlur = 0
        ctx.fillStyle = '#FF5500'
        ctx.shadowColor = '#FF5500'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(0, 0, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      ctx.restore()
    }
  }

  private renderLaser(ctx: CanvasRenderingContext2D): void {
    const ly = this.laserWorldY
    if (this.attackState === 'telegraphing' && this.attackType === 'SWEEP') {
      ctx.save()
      const x2 = this.realX + this.laserDir * 600
      ctx.strokeStyle = '#ff220044'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(this.realX, ly)
      ctx.lineTo(x2, ly)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
    if (!this.laserActive || this.laserLength <= 0) return
    ctx.save()
    const x1 = this.realX
    const x2 = this.realX + this.laserDir * this.laserLength
    ctx.shadowColor = '#ff4400'
    ctx.shadowBlur = 24
    ctx.strokeStyle = 'rgba(255,68,0,0.6)'
    ctx.lineWidth = 8
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(x1, ly)
    ctx.lineTo(x2, ly)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,136,0,0.8)'
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.moveTo(x1, ly)
    ctx.lineTo(x2, ly)
    ctx.stroke()
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 1.5
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.moveTo(x1, ly)
    ctx.lineTo(x2, ly)
    ctx.stroke()
    ctx.shadowBlur = 0
    const tipX = x2
    const tr = 6 + Math.sin(this.time * 20) * 4
    ctx.fillStyle = '#ff4400'
    ctx.beginPath()
    ctx.arc(tipX, ly, tr, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save()
      const a = Math.max(0.05, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  private renderAxiom(
    ctx: CanvasRenderingContext2D,
    t: number,
    b: number,
    attackState: AttackPhase,
    attackType: AttackKind,
    phase: 1 | 2 | 3,
    hp: number,
  ): void {
    const HUE = '#00E5FF'
    ctx.save()
    ctx.imageSmoothingEnabled = false

    const ringCenY = -70 + b
    const ringRots = [t * 0.2, t * -0.35, t * 0.5]
    const ringR = [70, 55, 40]
    const ringAlph = [0.5, 0.4, 0.35]

    for (let ri = 0; ri < 3; ri++) {
      ctx.save()
      ctx.translate(0, ringCenY)
      ctx.rotate(ringRots[ri]!)
      const hex = new Path2D()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6
        const rx = Math.cos(a) * ringR[ri]!
        const ry = Math.sin(a) * ringR[ri]!
        if (i === 0) hex.moveTo(rx, ry)
        else hex.lineTo(rx, ry)
      }
      hex.closePath()
      const alpha =
        attackState === 'telegraphing'
          ? Math.min(1, ringAlph[ri]! * 1.8)
          : ringAlph[ri]!
      ctx.globalAlpha = alpha
      ctx.shadowColor = HUE
      ctx.shadowBlur = attackState === 'telegraphing' ? 28 : 14
      ctx.strokeStyle = HUE
      ctx.lineWidth = 1.5
      ctx.stroke(hex)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    const torso = new Path2D()
    const tPoints: [number, number][] = [
      [0, -42 + b],
      [20, -56 + b],
      [20, -84 + b],
      [0, -98 + b],
      [-20, -84 + b],
      [-20, -56 + b],
    ]
    torso.moveTo(...tPoints[0]!)
    for (let i = 1; i < 6; i++) torso.lineTo(...tPoints[i]!)
    torso.closePath()

    ctx.fillStyle = '#0A0E1A'
    ctx.fill(torso)
    GlitchTwinBoss.neonStroke(ctx, torso, HUE, 2)

    const logo = new Path2D()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6
      const lx = Math.cos(a) * 10
      const ly = -70 + b + Math.sin(a) * 10
      if (i === 0) logo.moveTo(lx, ly)
      else logo.lineTo(lx, ly)
    }
    logo.closePath()
    ctx.save()
    ctx.strokeStyle = HUE
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1
    ctx.stroke(logo)
    ctx.globalAlpha = 1
    ctx.restore()

    const cR = 7 + Math.sin(t * 4.5) * 2
    const cPulse = 0.6 + Math.sin(t * 4.5) * 0.35
    const cGrad = ctx.createRadialGradient(0, -70 + b, 0, 0, -70 + b, cR * 2)
    cGrad.addColorStop(0, '#FFFFFF')
    cGrad.addColorStop(0.3, '#7C4DFF')
    cGrad.addColorStop(1, 'rgba(124,77,255,0)')
    ctx.save()
    ctx.globalAlpha = cPulse
    ctx.fillStyle = cGrad
    ctx.beginPath()
    ctx.arc(0, -70 + b, cR * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(0, -70 + b, cR * 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()

    const sOff = attackState === 'telegraphing' ? 4 : 0
    for (const sx of [-30 - sOff, 30 + sOff]) {
      const ps = new Path2D()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6
        const px = sx + Math.cos(a) * 9
        const py = -90 + b + Math.sin(a) * 9
        if (i === 0) ps.moveTo(px, py)
        else ps.lineTo(px, py)
      }
      ps.closePath()
      ctx.fillStyle = '#0A0E1A'
      ctx.fill(ps)
      GlitchTwinBoss.neonStroke(ctx, ps, HUE, 1.5)
    }

    let lWrist: [number, number] = [-52, -48 + b]
    let rWrist: [number, number] = [52, -48 + b]

    if (attackState === 'telegraphing' || attackState === 'attacking') {
      if (attackType === 'SWEEP') {
        rWrist = [68, -90 + b]
        lWrist = [-52, -60 + b]
      } else if (attackType === 'BURST') {
        lWrist = [-58, -106 + b]
        rWrist = [58, -106 + b]
      } else if (attackType === 'RING') {
        lWrist = [-90, -70 + b]
        rWrist = [90, -70 + b]
      } else if (attackType === 'SLAM') {
        lWrist = [-30, -130 + b]
        rWrist = [30, -130 + b]
      }
    } else if (attackState === 'recovering') {
      lWrist = [-44, -34 + b]
      rWrist = [44, -34 + b]
    }

    const drawArm = (
      shoulderX: number,
      shoulderY: number,
      wristX: number,
      wristY: number,
      side: -1 | 1,
    ): void => {
      const mx = (shoulderX + wristX) / 2
      const my = (shoulderY + wristY) / 2
      const dx = wristX - shoulderX
      const dy = wristY - shoulderY
      const len = Math.hypot(dx, dy)
      const px = ((-dy / len) * 12 * side)
      const py = ((dx / len) * 12 * side)
      const ex = mx + px
      const ey = my + py

      const arm = new Path2D()
      arm.moveTo(shoulderX, shoulderY)
      arm.lineTo(ex, ey)
      arm.lineTo(wristX, wristY)
      GlitchTwinBoss.neonStroke(ctx, arm, HUE, 2)

      ctx.save()
      ctx.fillStyle = HUE
      ctx.shadowColor = HUE
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(ex, ey, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(wristX, wristY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()

      const clawDir = Math.atan2(wristY - ey, wristX - ex)
      const clawOpen =
        attackState === 'telegraphing' || attackState === 'attacking' ? 1.0 : 0.25
      const clawLen = 20
      for (let ci = -1; ci <= 1; ci++) {
        const ca = clawDir + ci * (0.35 * clawOpen)
        const claw = new Path2D()
        claw.moveTo(wristX, wristY)
        claw.lineTo(
          wristX + Math.cos(ca) * clawLen,
          wristY + Math.sin(ca) * clawLen,
        )
        GlitchTwinBoss.neonStroke(ctx, claw, HUE, 1.5)
      }

      if (attackState === 'telegraphing' || attackState === 'attacking') {
        const tipX = wristX + Math.cos(clawDir) * clawLen
        const tipY = wristY + Math.sin(clawDir) * clawLen
        let emitHue = '#FF9100'
        if (attackType === 'SWEEP' && side === 1) emitHue = '#FF2200'
        if (attackType === 'RING') emitHue = '#CC00FF'
        if (attackType === 'SLAM') emitHue = '#00FFFF'
        ctx.save()
        ctx.shadowColor = emitHue
        ctx.shadowBlur = 18
        ctx.fillStyle = emitHue
        ctx.globalAlpha = 0.85 + Math.sin(t * 16) * 0.12
        ctx.beginPath()
        ctx.arc(tipX, tipY, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }

    drawArm(-30 - sOff, -90 + b, lWrist[0], lWrist[1], -1)
    drawArm(30 + sOff, -90 + b, rWrist[0], rWrist[1], 1)

    const headBob = Math.sin(t * 2.2) * 3
    const headY = -42 + b - headBob - 18

    ctx.save()
    const head = new Path2D()
    head.moveTo(-18, headY)
    head.lineTo(18, headY)
    head.lineTo(12, headY - 22)
    head.lineTo(-12, headY - 22)
    head.closePath()
    ctx.fillStyle = '#0A0E1A'
    ctx.fill(head)
    GlitchTwinBoss.neonStroke(ctx, head, HUE, 2)

    ctx.save()
    ctx.strokeStyle = '#0D2A40'
    ctx.lineWidth = 0.8
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(-18, headY)
    ctx.lineTo(-16, headY - 4)
    ctx.lineTo(-12, headY - 18)
    ctx.lineTo(-12, headY - 22)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(18, headY)
    ctx.lineTo(16, headY - 4)
    ctx.lineTo(12, headY - 18)
    ctx.lineTo(12, headY - 22)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()

    const visorY = headY - 11
    let visorHue = HUE
    let visorBlur = 14
    if (attackState === 'telegraphing') {
      if (attackType === 'SWEEP') {
        visorHue = '#FF2200'
        visorBlur = 28
      }
      if (attackType === 'BURST') {
        visorHue = '#FF9100'
        visorBlur = 22
      }
      if (attackType === 'RING') {
        visorHue = '#CC00FF'
        visorBlur = 20
      }
      if (attackType === 'SLAM') {
        visorHue = '#00FFFF'
        visorBlur = 26
      }
      if (Math.sin(t * 22) < 0) visorBlur = 0
    } else if (attackState === 'recovering') {
      visorHue = '#003344'
      visorBlur = 4
    } else if (phase === 3) {
      visorHue = '#FF4400'
      visorBlur = 18 + Math.sin(t * 9) * 6
    }

    ctx.save()
    ctx.shadowColor = visorHue
    ctx.shadowBlur = visorBlur
    ctx.fillStyle = visorHue
    ctx.globalAlpha = 0.92
    ctx.beginPath()
    ctx.ellipse(0, visorY, 10, 4, 0, Math.PI, 0)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, visorY, 10, 3, 0, 0, Math.PI)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.shadowBlur = 0

    let pupilX = clamp((this.lastPlayerX - this.realX) / 8, -5, 5)
    if (!this.realFacingRight) pupilX = -pupilX
    ctx.fillStyle = '#FFFFFF'
    ctx.shadowColor = '#FFFFFF'
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.ellipse(pupilX, visorY, 3, 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = HUE
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, headY - 22)
    ctx.lineTo(0, headY - 28)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-4, headY - 26)
    ctx.lineTo(4, headY - 26)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.restore()

    const arcStarts = [
      -Math.PI / 2 + (Math.PI * 20) / 180,
      -Math.PI / 2 - (Math.PI * 120) / 180,
      Math.PI / 2 + (Math.PI * 10) / 180,
    ]
    const arcSweep = (Math.PI * 100) / 180
    for (let h = 0; h < 3; h++) {
      ctx.save()
      const ap = new Path2D()
      ap.arc(0, -70 + b, 74, arcStarts[h]!, arcStarts[h]! + arcSweep)
      if (h < hp) {
        GlitchTwinBoss.neonStroke(ctx, ap, '#00FF88', 2)
      } else {
        ctx.strokeStyle = '#0A1A10'
        ctx.shadowColor = 'transparent'
        ctx.shadowBlur = 0
        ctx.lineWidth = 4
        ctx.globalAlpha = 0.9
        ctx.stroke(ap)
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }

    if (attackState === 'telegraphing') {
      let wHue = '#FF9100'
      if (attackType === 'SWEEP') wHue = '#FF2200'
      if (attackType === 'RING') wHue = '#CC00FF'
      if (attackType === 'SLAM') wHue = '#00FFFF'
      const wR = 80 + Math.sin(t * 20) * 6
      const wA = 0.5 + Math.sin(t * 20) * 0.38
      const cy = -70 + b
      ctx.save()
      ctx.strokeStyle = wHue
      ctx.shadowColor = wHue
      ctx.shadowBlur = 16
      ctx.lineWidth = 2
      ctx.globalAlpha = wA
      ctx.beginPath()
      ctx.arc(0, cy, wR, 0, Math.PI * 2)
      ctx.stroke()
      for (let ci = 0; ci < 4; ci++) {
        const ca = (ci / 4) * Math.PI * 2
        const ox = Math.cos(ca) * (wR + 12)
        const oy = Math.sin(ca) * (wR + 12) + cy
        const inX = Math.cos(ca + Math.PI) * 10
        const inY = Math.sin(ca + Math.PI) * 10
        ctx.beginPath()
        ctx.moveTo(
          ox + Math.cos(ca + Math.PI * 0.75) * 8,
          oy + Math.sin(ca + Math.PI * 0.75) * 8,
        )
        ctx.lineTo(ox + inX, oy + inY)
        ctx.lineTo(
          ox + Math.cos(ca - Math.PI * 0.75) * 8,
          oy + Math.sin(ca - Math.PI * 0.75) * 8,
        )
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    if (attackState === 'recovering') {
      const vp = 0.3 + Math.sin(t * 9) * 0.22
      ctx.save()
      ctx.strokeStyle = '#FFFFFF'
      ctx.shadowColor = '#FFFFFF'
      ctx.shadowBlur = 14
      ctx.lineWidth = 2
      ctx.globalAlpha = vp
      ctx.beginPath()
      ctx.arc(0, -70 + b, 80, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    if (this.hitFlashTimer > 0) {
      const fa = (this.hitFlashTimer / 0.25) * 0.4
      ctx.save()
      ctx.fillStyle = '#FFFFFF'
      ctx.globalAlpha = fa
      ctx.beginPath()
      ctx.ellipse(0, -70 + b, 36, 52, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.restore()
    }

    if (phase === 3) {
      const od = 0.18 + Math.sin(t * 11) * 0.12
      ctx.save()
      ctx.strokeStyle = '#FF4400'
      ctx.shadowColor = '#FF4400'
      ctx.shadowBlur = 20
      ctx.lineWidth = 1.5
      ctx.globalAlpha = od
      ctx.beginPath()
      ctx.arc(0, -70 + b, 86, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, -70 + b, 96, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    ctx.restore()
  }

  private renderNull(
    ctx: CanvasRenderingContext2D,
    t: number,
    seed: number,
    dissolveAlpha: number,
    scale: number,
  ): void {
    if (dissolveAlpha <= 0) return
    ctx.save()
    ctx.scale(scale, scale)
    ctx.globalAlpha = Math.max(0, dissolveAlpha)
    ctx.imageSmoothingEnabled = false

    const HUE = '#FF2E63'
    const HUE2 = '#FF2DAA'

    const c = (s: number): number =>
      Math.sin(t * (22 + s * 4.7) + seed * 2.9) * (2.5 + (1 - scale) * 5)

    const LINK = 18
    type Pt = { x: number; y: number }
    const segs: Pt[] = []

    const hx =
      Math.sin(t * 0.7 + seed) * 55 +
      Math.sin(t * 1.3 + seed) * 18 +
      c(1)
    const hy = -90 + Math.sin(t * 0.9 + seed) * 12 + c(2)
    segs.push({ x: hx, y: hy })

    for (let i = 1; i < 14; i++) {
      const prev = segs[i - 1]!
      const targetX = prev.x + c(i * 3) * 0.3
      const targetY = prev.y + LINK * (0.85 + Math.sin(t * 2 + i) * 0.12)
      const dist = Math.hypot(targetX - prev.x, targetY - prev.y) || 1
      segs.push({
        x:
          prev.x +
          ((targetX - prev.x) / dist) * LINK +
          c(i * 2),
        y:
          prev.y +
          ((targetY - prev.y) / dist) * LINK +
          c(i * 2 + 1),
      })
    }

    if (segs.length >= 2) {
      const spine = new Path2D()
      spine.moveTo(segs[0]!.x, segs[0]!.y)
      for (let i = 1; i < segs.length - 1; i++) {
        const cpx = (segs[i]!.x + segs[i + 1]!.x) / 2
        const cpy = (segs[i]!.y + segs[i + 1]!.y) / 2
        spine.quadraticCurveTo(segs[i]!.x, segs[i]!.y, cpx, cpy)
      }
      spine.lineTo(segs[segs.length - 1]!.x, segs[segs.length - 1]!.y)
      ctx.save()
      ctx.shadowColor = HUE
      ctx.shadowBlur = 12
      ctx.strokeStyle = HUE
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.5
      ctx.stroke(spine)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]!
      const r = 20 - (14 / 13) * i
      const isHot = i % 3 === 0

      ctx.save()
      ctx.fillStyle = '#140008'
      ctx.beginPath()
      ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2)
      ctx.fill()

      const segPath = new Path2D()
      segPath.arc(seg.x, seg.y, r, 0, Math.PI * 2)
      GlitchTwinBoss.neonStroke(ctx, segPath, i < 2 ? HUE2 : HUE, 1.5)

      if (i % 4 === 1 && i > 0) {
        for (let sp = 0; sp < 3; sp++) {
          const sAngle = (sp / 3) * Math.PI * 2 + t * 0.8 + seed + i
          const sLen = 10 + Math.sin(t * 5 + sp + i) * 4
          const spike = new Path2D()
          spike.moveTo(seg.x + Math.cos(sAngle) * r, seg.y + Math.sin(sAngle) * r)
          spike.lineTo(
            seg.x + Math.cos(sAngle) * (r + sLen),
            seg.y + Math.sin(sAngle) * (r + sLen),
          )
          GlitchTwinBoss.neonStroke(ctx, spike, '#F7FF4A', 1)
        }
      }

      if (isHot) {
        ctx.fillStyle = '#FF2E63'
        ctx.shadowColor = '#FF2E63'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(seg.x, seg.y, r * 0.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      ctx.restore()
    }

    const hs = segs[0]!
    ctx.save()
    ctx.translate(hs.x, hs.y)

    const face = new Path2D()
    face.ellipse(0, 0, 24, 22, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#140008'
    ctx.fill(face)
    GlitchTwinBoss.neonStroke(ctx, face, HUE2, 2)

    const eyeFlick1 = Math.sin(t * 24 + seed) > 0
    const eyeFlick2 = Math.sin(t * 19 + seed + 1.3) > 0
    if (eyeFlick1) {
      ctx.fillStyle = '#FF0000'
      ctx.shadowColor = '#FF0000'
      ctx.shadowBlur = 10
      ctx.fillRect(-11 + c(20), -6 + c(21), 5, 12)
      ctx.shadowBlur = 0
    }
    if (eyeFlick2) {
      ctx.fillStyle = '#FF2DAA'
      ctx.shadowColor = '#FF2DAA'
      ctx.shadowBlur = 10
      ctx.fillRect(6 + c(22), -7 + c(23), 5, 12)
      ctx.shadowBlur = 0
    }

    const mOpen = 4 + Math.sin(t * 2.1 + seed) * 3
    const mouth = new Path2D()
    mouth.moveTo(-14 + c(24), 8 + c(25))
    mouth.bezierCurveTo(
      -6 + c(26),
      8 + mOpen + c(27),
      6 + c(28),
      8 + mOpen + c(29),
      14 + c(30),
      8 + c(31),
    )
    GlitchTwinBoss.neonStroke(ctx, mouth, '#F7FF4A', 1.5)
    ctx.restore()

    const glitchCycle = Math.floor(t * 60) % 300
    if (glitchCycle < 6) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#FF0000'
      ctx.beginPath()
      ctx.arc(hs.x + 2, hs.y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0000FF'
      ctx.beginPath()
      ctx.arc(hs.x - 2, hs.y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.restore()
    }

    for (let ni = 0; ni < 6; ni++) {
      const nx = hs.x + Math.sin(t * 17 + ni * 2.3 + seed) * 18
      const ny = hs.y + Math.cos(t * 13 + ni * 1.9 + seed) * 14
      const nc = (['#FF2200', '#FFFFFF', '#FF2DAA'] as const)[ni % 3]!
      ctx.fillStyle = nc
      ctx.globalAlpha = 0.35 + Math.sin(t * 24 + ni + seed) * 0.3
      ctx.fillRect(nx - 0.5, ny - 0.5, 1, 1)
    }
    ctx.globalAlpha = 1

    ctx.restore()
  }


  private renderDeathEffect(ctx: CanvasRenderingContext2D): void {
    const p = this.deathTimer / 2
    for (let i = 0; i < 6; i++) {
      const rt = p - i * 0.1
      if (rt <= 0) continue
      ctx.save()
      ctx.strokeStyle = i % 2 === 0 ? '#00e5ff' : '#ffffff'
      ctx.globalAlpha = Math.max(0, 1 - rt)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(this.realX, this.FLOOR_Y - 90, rt * 200, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.textAlign = 'center'
    if (this.attackState === 'waiting') {
      const s = Math.ceil(this.observeTimer)
      ctx.font = 'bold 22px Orbitron, sans-serif'
      ctx.fillStyle = s <= 2 ? '#ff4444' : '#ff9100'
      ctx.fillText(`OBSERVE  ${s}s`, 640, 400)
    }
    if (this.fightTextTimer > 0) {
      ctx.font = 'bold 30px Orbitron, sans-serif'
      ctx.fillStyle = '#ff4444'
      ctx.globalAlpha = this.fightTextTimer / 0.85
      ctx.fillText('FIGHT!', 640, 360)
      ctx.globalAlpha = 1
    }
    if (this.attackState === 'recovering') {
      ctx.font = 'bold 14px Orbitron, sans-serif'
      ctx.fillStyle = '#00ff88'
      ctx.fillText('OPENING', 640, 260)
    }
    ctx.textAlign = 'left'
    ctx.restore()
  }
}
