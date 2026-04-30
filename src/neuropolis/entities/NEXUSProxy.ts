import { CONFIG } from '../constants/config'

type AttackPattern = 'A' | 'B' | 'C' | 'idle'

interface NexusShot {
  x: number; y: number; vx: number; vy: number
  life: number; homing: boolean
  targetX?: number; targetY?: number
}

export class NEXUSProxy {
  x: number
  y: number
  hp = 6
  active   = true
  exploded = false
  scoreEmitted = false
  activated = false

  private time         = 0
  private pattern: AttackPattern = 'idle'
  private patternTimer = 0
  private vulnWindow   = false
  private vulnTimer    = 0
  private orbitAngle   = 0
  private patternIndex = 0

  shots: NexusShot[] = []

  constructor(x: number, y: number) {
    this.x = x; this.y = y
  }

  getRect() { return { x: this.x - 30, y: this.y - 30, w: 60, h: 60 } }
  isVulnerable(): boolean { return this.vulnWindow }

  takeHit(): void {
    if (!this.vulnWindow) return
    this.hp--
    if (this.hp <= 0) this.active = false
  }

  update(dt: number, playerX: number, playerY: number): void {
    if (!this.active) return
    if (!this.activated) {
      if (playerX > this.x - 400) this.activated = true
      else return
    }
    this.time      += dt
    this.orbitAngle += 1.2 * dt

    if (this.vulnWindow) {
      this.vulnTimer -= dt
      if (this.vulnTimer <= 0) {
        this.vulnWindow  = false
        this.patternTimer = 0
        this.patternIndex = (this.patternIndex + 1) % 3
      }
    }

    this.patternTimer -= dt

    if (!this.vulnWindow && this.patternTimer <= 0) {
      this.firePattern(playerX, playerY)
    }

    // Update shots
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i]!
      if (s.homing) {
        const dx = playerX - s.x, dy = playerY - s.y
        const len = Math.hypot(dx, dy) || 1
        s.vx += (dx / len) * 60 * dt
        s.vy += (dy / len) * 60 * dt
        const sp = Math.hypot(s.vx, s.vy)
        if (sp > 80) { s.vx = s.vx / sp * 80; s.vy = s.vy / sp * 80 }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt
      if (s.life <= 0) this.shots.splice(i, 1)
    }
  }

  private firePattern(playerX: number, playerY: number): void {
    const patterns: AttackPattern[] = ['A', 'B', 'C']
    this.pattern = patterns[this.patternIndex % 3]!

    if (this.pattern === 'A') {
      for (let i = 0; i < 4; i++) {
        const angle = i * (Math.PI / 2)
        this.shots.push({ x: this.x, y: this.y, vx: Math.cos(angle) * 160, vy: Math.sin(angle) * 160, life: 3.0, homing: false })
      }
    } else if (this.pattern === 'B') {
      for (let i = 0; i < 8; i++) {
        const angle = i * (Math.PI / 4)
        this.shots.push({ x: this.x, y: this.y, vx: Math.cos(angle) * 140, vy: Math.sin(angle) * 140, life: 3.0, homing: false })
      }
    } else {
      // 2 homing + 1 fast straight
      for (let i = 0; i < 2; i++) {
        this.shots.push({ x: this.x, y: this.y, vx: 0, vy: 0, life: 4.0, homing: true })
      }
      const dx = playerX - this.x, dy = playerY - this.y
      const len = Math.hypot(dx, dy) || 1
      this.shots.push({ x: this.x, y: this.y, vx: (dx / len) * 350, vy: (dy / len) * 350, life: 2.0, homing: false })
    }

    this.patternTimer = 2.0
    this.vulnWindow   = true
    this.vulnTimer    = 2.0
  }

  checkShotHit(px: number, py: number, pw: number, ph: number): boolean {
    for (const s of this.shots) {
      if (s.x > px && s.x < px + pw && s.y > py && s.y < py + ph) return true
    }
    return false
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (!this.activated) return
    const sx = this.x - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return

    ctx.save()

    // Tetrahedron outline
    const s2 = 30
    const rot = this.orbitAngle
    ctx.strokeStyle = '#ff1744'
    ctx.lineWidth = 2
    ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 14

    const pts = [
      [Math.cos(rot) * s2,          Math.sin(rot) * s2],
      [Math.cos(rot + 2.094) * s2,  Math.sin(rot + 2.094) * s2],
      [Math.cos(rot + 4.188) * s2,  Math.sin(rot + 4.188) * s2],
    ] as [number, number][]

    ctx.beginPath()
    ctx.moveTo(sx + pts[0]![0], this.y + pts[0]![1])
    ctx.lineTo(sx + pts[1]![0], this.y + pts[1]![1])
    ctx.lineTo(sx + pts[2]![0], this.y + pts[2]![1])
    ctx.closePath()
    ctx.stroke()
    ctx.shadowBlur = 0

    // Vulnerability glow
    if (this.vulnWindow) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath()
      ctx.arc(sx, this.y, s2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Orbiting particles
    for (let i = 0; i < 8; i++) {
      const a = this.orbitAngle * 1.5 + (i / 8) * Math.PI * 2
      const r = 16
      const px2 = sx + Math.cos(a) * r
      const py2 = this.y + Math.sin(a) * r
      ctx.fillStyle = '#ff1744'
      ctx.beginPath(); ctx.arc(px2, py2, 2, 0, Math.PI * 2); ctx.fill()
    }

    // HP pips above
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i < this.hp ? '#ff1744' : '#3a0808'
      ctx.fillRect(sx - 18 + i * 7, this.y - s2 - 14, 5, 5)
    }

    // Shots
    for (const shot of this.shots) {
      const shx = shot.x - cameraX
      ctx.fillStyle = shot.homing ? '#ff8800' : '#ff1744'
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8
      ctx.beginPath(); ctx.arc(shx, shot.y, shot.homing ? 7 : 5, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.restore()
  }
}
