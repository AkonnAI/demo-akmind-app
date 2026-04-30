import { CONFIG } from '../constants/config'

export const CHAOS_ARENA_FLOOR_Y = 560

export interface ChaosProjectile {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
  damage: number
  kind: 'ring' | 'beam' | 'weak' | 'memory'
}

interface ChaosParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface DecoyState {
  x: number
  y: number
  ang: number
  r: number
}

function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n))
}

export class ChaosBoss {
  readonly ARENA_MIN = 640
  readonly ARENA_MAX = 2200
  readonly FLOOR_Y = CHAOS_ARENA_FLOOR_Y

  private hp = 9
  private readonly maxHp = 9
  private phase: 1 | 2 | 3 = 1
  x = 1200
  private baseY = CHAOS_ARENA_FLOOR_Y - 120
  private vx = 0
  private targetX = 1200
  private orbitAngle = 0
  private orbitSpeed = -3.2
  private fragmentAngles: number[] = []
  private attackState: 'idle' | 'telegraph' | 'attacking' | 'recovering' = 'idle'
  private attackType: 'RING' | 'BEAM' | 'CLONE' | 'MEMORY' = 'RING'
  private attackTimer = 0
  private hitFlashTimer = 0
  private decoys: DecoyState[] = []
  projectiles: ChaosProjectile[] = []
  private particles: ChaosParticle[] = []
  restorationTriggered = false
  private deathTimer = 0
  successDeath = false
  defeated = false
  private time = 0
  private expandTimer = 0
  private currentRadius = 44
  private targetRadius = 44
  private beamSweep = 0
  private beamAngle = 0
  private memoryPhaseStart = 0
  private damageEvents: Array<{ damage: number; kind: string }> = []
  private corruptLines = ['TRUST [STATIC] MACHINES', 'PATTERNS ARE [STATIC] TRUTH', 'EFFICIENCY [STATIC] FIRST']
  private floorFlashSeed: number[] = []

  constructor() {
    for (let i = 0; i < 10; i++) this.fragmentAngles.push(Math.random() * Math.PI * 2)
    for (let i = 0; i < 12; i++) this.floorFlashSeed.push(Math.random() * 10)
  }

  getHp(): number {
    return this.hp
  }

  getPhase(): 1 | 2 | 3 {
    return this.phase
  }

  getChaosRect(): { x: number; y: number; w: number; h: number } {
    const R = this.currentRadius
    return { x: this.x - R, y: this.baseY - R, w: R * 2, h: R * 2 }
  }

  getDecoyRects(): Array<{ x: number; y: number; w: number; h: number }> {
    const R = 28
    return this.decoys.map(d => ({ x: d.x - R, y: d.y - R, w: R * 2, h: R * 2 }))
  }

  getDamageEvents(): Array<{ damage: number; kind: string }> {
    const q = [...this.damageEvents]
    this.damageEvents.length = 0
    return q
  }

  takeHit(amount: number, bypassShield?: boolean): void {
    void bypassShield
    if (this.defeated) return
    if (this.restorationTriggered) return
    this.hp -= amount
    this.hitFlashTimer = 0.22
    if (this.hp <= 6 && this.phase === 1) {
      this.phase = 2
      this.expandTimer = 1.5
      this.targetRadius = 58
    }
    if (this.hp <= 3) {
      this.hp = 3
      this.phase = 3
      this.restorationTriggered = true
      this.attackState = 'idle'
      this.vx = 0
      return
    }
  }

  healOne(): void {
    if (this.defeated) return
    this.hp = Math.min(this.maxHp, this.hp + 1)
  }

  triggerDeath(success: boolean): void {
    this.beginDeath(success)
  }

  private beginDeath(success: boolean): void {
    if (this.defeated) return
    this.successDeath = success
    this.defeated = true
    this.deathTimer = success ? 5 : 4
    this.spawnBurst(40, success ? '#00e5ff' : '#64748b')
  }

  private spawnBurst(n: number, color: string): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const sp = 80 + Math.random() * 120
      this.particles.push({
        x: this.x,
        y: this.baseY,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
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

  static neonStroke(
    ctx: CanvasRenderingContext2D,
    path: Path2D,
    hue: string,
    lw: number,
  ): void {
    ctx.save()
    ctx.shadowColor = hue
    ctx.shadowBlur = 24
    ctx.strokeStyle = ChaosBoss.hexToRgba(hue, 0.3)
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

  isMemoryRedirectActive(): boolean {
    return this.phase === 2 && this.time - this.memoryPhaseStart < 3
  }

  registerMemoryShot(px: number, py: number, vx: number, vy: number): void {
    if (this.isMemoryRedirectActive()) {
      this.projectiles.push({
        x: px,
        y: py,
        vx: -vx * 1.1,
        vy: -vy * 1.1,
        life: 1.2,
        size: 5,
        color: '#ff4444',
        damage: 1,
        kind: 'memory',
      })
    }
  }

  update(dt: number, pcx: number, pcy: number): void {
    this.time += dt
    if (this.expandTimer > 0) {
      this.expandTimer -= dt
      this.currentRadius += (this.targetRadius - this.currentRadius) * dt * 1.8
    }

    for (const p of this.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
    }
    this.particles = this.particles.filter(p => p.life > 0)

    if (this.defeated) {
      this.deathTimer -= dt
      return
    }

    if (this.restorationTriggered && this.phase === 3) {
      const cx = (this.ARENA_MIN + this.ARENA_MAX) / 2
      this.x += (cx - this.x) * dt * 0.35
      this.orbitAngle += this.orbitSpeed * dt * 0.2
      return
    }

    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt)
    this.orbitAngle += this.orbitSpeed * dt

    for (let i = 0; i < this.fragmentAngles.length; i++) {
      this.fragmentAngles[i]! += (0.35 + i * 0.05) * dt
    }

    if (this.phase === 2 && this.time - this.memoryPhaseStart > 8) {
      this.memoryPhaseStart = this.time
    }

    const patrolL = this.phase === 1 ? 700 : this.ARENA_MIN
    const patrolR = this.phase === 1 ? 1400 : this.ARENA_MAX - 80
    const mid = (patrolL + patrolR) / 2
    this.targetX = mid + Math.sin(this.time * (this.phase === 1 ? 0.55 : 0.85)) * (patrolR - patrolL) * 0.42
    this.vx += (this.targetX - this.x) * 2.4 * dt
    this.vx *= Math.pow(0.2, dt)
    this.x += this.vx * dt
    this.x = clamp(this.x, patrolL, patrolR)

    if (this.phase === 2) {
      this.baseY += Math.sin(this.time * 1.1) * 40 * dt
      this.baseY = clamp(this.baseY, this.FLOOR_Y - 220, this.FLOOR_Y - 70)
    }

    for (const d of this.decoys) {
      d.ang += dt * 0.7
      d.x = this.x + Math.cos(d.ang) * d.r
      d.y = this.baseY + Math.sin(d.ang * 1.3) * 30
    }

    for (const pr of this.projectiles) {
      pr.x += pr.vx * dt
      pr.y += pr.vy * dt
      pr.life -= dt
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0)

    this.attackTimer -= dt
    switch (this.attackState) {
      case 'idle':
        if (this.attackTimer <= 0) {
          this.pickNextAttack()
          this.attackState = 'telegraph'
          this.attackTimer = this.attackType === 'RING' ? 0.6 : 0.5
        }
        break
      case 'telegraph':
        if (this.attackTimer <= 0) {
          this.fireAttack(pcx, pcy)
          this.attackState = 'attacking'
          this.attackTimer = this.attackType === 'BEAM' ? 2.2 : 0.45
        }
        break
      case 'attacking':
        if (this.attackType === 'BEAM') {
          this.beamSweep += dt * (Math.PI / 2.2)
        }
        if (this.attackTimer <= 0) {
          this.attackState = 'recovering'
          this.attackTimer = 0.5
        }
        break
      case 'recovering':
        if (this.attackTimer <= 0) {
          this.attackState = 'idle'
          this.attackTimer = this.phase === 1 ? 0.9 : 0.55
        }
        break
    }

    if (this.phase >= 2 && this.decoys.length === 0 && Math.random() < 0.002) {
      this.decoys.push({ x: this.x + 120, y: this.baseY, ang: 0, r: 140 })
    }
  }

  private pickNextAttack(): void {
    const opts: Array<'RING' | 'BEAM' | 'CLONE' | 'MEMORY'> = ['RING', 'BEAM']
    if (this.phase >= 2) {
      opts.push('CLONE')
      if (this.phase === 2) opts.push('MEMORY')
    }
    this.attackType = opts[Math.floor(Math.random() * opts.length)]!
  }

  private fireAttack(pcx: number, pcy: number): void {
    if (this.attackType === 'RING') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const sp = 180
        this.projectiles.push({
          x: this.x,
          y: this.baseY,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 2.4,
          size: 6,
          color: '#ff1744',
          damage: 1,
          kind: 'ring',
        })
      }
    } else if (this.attackType === 'BEAM') {
      this.beamAngle = Math.atan2(pcy - this.baseY, pcx - this.x)
      this.beamSweep = 0
    } else if (this.attackType === 'CLONE' && this.decoys.length < 1) {
      this.decoys.push({ x: this.x + 100, y: this.baseY - 20, ang: 0, r: 100 })
    }
  }

  checkPlayerHit(
    px: number,
    py: number,
    pw: number,
    ph: number,
  ): void {
    if (this.defeated || this.restorationTriggered) return
    const pcx = px + pw / 2
    const pcy = py + ph / 2
    const pad = 4
    for (const pr of this.projectiles) {
      if (
        pr.x > px - pad &&
        pr.x < px + pw + pad &&
        pr.y > py - pad &&
        pr.y < py + ph + pad
      ) {
        pr.life = 0
        this.damageEvents.push({ damage: 1, kind: pr.kind })
      }
    }
    if (this.attackState === 'attacking' && this.attackType === 'BEAM') {
      const inGap = this.beamSweep > 0.75 && this.beamSweep < 1.35
      if (!inGap && this.beamSweep > 0.2) {
        const dx = Math.cos(this.beamAngle)
        const dy = Math.sin(this.beamAngle)
        const t = (pcx - this.x) * dx + (pcy - this.baseY) * dy
        if (t > 20 && t < 520) {
          const qx = this.x + dx * t
          const qy = this.baseY + dy * t
          const d = Math.hypot(pcx - qx, pcy - qy)
          if (d < 22) this.damageEvents.push({ damage: 1, kind: 'beam' })
        }
      }
    }
  }

  updateDecoyShots(dt: number, pcx: number, pcy: number): void {
    void pcx
    void pcy
    void dt
    if (this.decoys.length && Math.random() < 0.02) {
      const d = this.decoys[0]!
      this.projectiles.push({
        x: d.x,
        y: d.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 1.5,
        size: 4,
        color: '#ff6666',
        damage: 1,
        kind: 'weak',
      })
    }
  }

  renderArena(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, W, H)
    const g1 = ctx.createLinearGradient(0, 0, 520, 0)
    g1.addColorStop(0, 'rgba(0,229,255,0.07)')
    g1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g1
    ctx.fillRect(0, 0, W, H)
    const g2 = ctx.createLinearGradient(W, 0, 680, 0)
    g2.addColorStop(0, `rgba(255,68,68,${0.05 + this.phase * 0.02})`)
    g2.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g2
    ctx.fillRect(680, 0, W - 680, H)

    ctx.fillStyle = '#050510'
    ctx.fillRect(0, this.FLOOR_Y, W, H - this.FLOOR_Y)
    ctx.strokeStyle = '#0d0a2a'
    ctx.lineWidth = 0.5
    for (let gx = 0; gx < W; gx += 48) {
      ctx.beginPath()
      ctx.moveTo(gx, this.FLOOR_Y)
      ctx.lineTo(gx + (gx - W / 2) * 0.08, H)
      ctx.stroke()
    }

    const divX = 640
    ctx.strokeStyle = 'rgba(0,229,255,0.35)'
    ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.moveTo(divX, 0)
    ctx.lineTo(divX, this.FLOOR_Y)
    ctx.stroke()
    ctx.setLineDash([])

    if (this.time < 8) {
      ctx.font = 'bold 9px Orbitron, monospace'
      ctx.fillStyle = '#00e5ff'
      ctx.fillText('AX ZONE', 20, 200)
      ctx.fillStyle = '#ff4444'
      ctx.fillText('CHAOS ZONE', 700, 200)
    }

    if (this.phase >= 2) {
      for (let i = 0; i < 12; i++) {
        const tx = ((i * 97 + this.time * 40) % (W + 40)) - 20
        const ty = this.FLOOR_Y + 20 + (i % 4) * 36
        if (Math.sin(this.time * 6 + this.floorFlashSeed[i]!) > 0.72) {
          ctx.fillStyle = '#ff444418'
          ctx.fillRect(tx, ty, 24, 24)
        }
      }
    }

    const corrupt = this.corruptLines[Math.floor(this.time * 0.35) % this.corruptLines.length]!
    if (this.phase >= 2) {
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillStyle = 'rgba(255,68,68,0.35)'
      ctx.fillText(corrupt, W / 2 - 120, 80)
    }

    ctx.restore()
    void cameraX
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    const sy = this.baseY
    const R = this.currentRadius
    ctx.save()
    ctx.translate(sx, sy)
    ctx.imageSmoothingEnabled = false

    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.hitFlashTimer * 1.8})`
      ctx.beginPath()
      ctx.arc(0, 0, R + 4, 0, Math.PI * 2)
      ctx.fill()
    }

    if (this.phase >= 2) {
      ctx.save()
      ctx.rotate(this.time * 0.6)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        ctx.strokeStyle = '#ff4444'
        ctx.globalAlpha = 0.35
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, R + 24, a, a + Math.PI / 6)
        ctx.stroke()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    const body = new Path2D()
    body.arc(0, 0, R, 0, Math.PI * 2)
    ctx.fillStyle = '#1a0008'
    ctx.fill(body)
    ChaosBoss.neonStroke(ctx, body, '#ff4444', 2.5)

    if (this.phase === 3) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(-R - 8, -R - 8, R + 8, (R + 8) * 2)
      ctx.clip()
      const leftB = new Path2D()
      leftB.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,229,255,0.25)'
      ctx.fill(leftB)
      ChaosBoss.neonStroke(ctx, leftB, '#00e5ff', 1.5)
      ctx.restore()
    }

    if (Math.sin(this.time * 8) > 0.55) {
      ctx.fillStyle = 'rgba(255,68,68,0.45)'
      ctx.fillRect(-R, -4, R * 2, 8)
    }

    ctx.fillStyle = '#ff0000'
    ctx.shadowColor = '#ff0000'
    ctx.shadowBlur = 14
    ctx.fillRect(-14, -4, 28, 8)
    ctx.shadowBlur = 0

    const sparks = this.phase >= 2 ? 6 : 3
    for (let i = 0; i < sparks; i++) {
      const a = this.orbitAngle + (i / sparks) * Math.PI * 2
      const ox = Math.cos(a) * (R + 16)
      const oy = Math.sin(a) * (R + 16)
      ctx.fillStyle = '#ff4444'
      ctx.shadowColor = '#ff4444'
      ctx.shadowBlur = 8
      ctx.fillRect(ox - 2, oy - 2, 4, 4)
      ctx.shadowBlur = 0
    }

    if (this.phase >= 2) {
      for (let i = 0; i < this.fragmentAngles.length; i++) {
        const fa = this.fragmentAngles[i]!
        const fr = R + 28 + Math.sin(this.time * 2 + i) * 8
        ctx.fillStyle = i % 3 === 0 ? '#00e5ff' : '#ff4444'
        ctx.globalAlpha = 0.55
        ctx.fillRect(Math.cos(fa) * fr - 2, Math.sin(fa) * fr - 2, 4, 4)
        ctx.globalAlpha = 1
      }
    }

    for (let h = 0; h < 3; h++) {
      const filled = this.hp > (3 - h) * 3
      ctx.strokeStyle = filled ? '#ff4444' : '#2a0508'
      ctx.lineWidth = 4
      const sa = (h / 3) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.arc(0, 0, R + 16, sa, sa + (Math.PI * 2) / 3 - 0.2)
      ctx.stroke()
    }

    if (this.attackState === 'telegraph') {
      const pulseR = R + 32 + Math.sin(this.time * 20) * 6
      ctx.strokeStyle = '#ff4444'
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    if (this.attackState === 'attacking' && this.attackType === 'BEAM') {
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 8
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(this.beamAngle) * 500, Math.sin(this.beamAngle) * 500)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()

    for (const d of this.decoys) {
      const dx = d.x - cameraX
      ctx.save()
      ctx.translate(dx, d.y)
      ctx.globalAlpha = 0.45
      const dp = new Path2D()
      dp.arc(0, 0, 28, 0, Math.PI * 2)
      ctx.fillStyle = '#1a0008'
      ctx.fill(dp)
      ChaosBoss.neonStroke(ctx, dp, '#ff2222', 2)
      ctx.restore()
    }

    for (const pr of this.projectiles) {
      const px = pr.x - cameraX
      ctx.fillStyle = pr.color
      ctx.globalAlpha = 0.9
      ctx.fillRect(px - pr.size / 2, pr.y - pr.size / 2, pr.size, pr.size)
      ctx.globalAlpha = 1
    }

    for (const p of this.particles) {
      const px = p.x - cameraX
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = p.color
      ctx.fillRect(px, p.y, p.size, p.size)
      ctx.globalAlpha = 1
    }
  }
}
