import { CONFIG } from '../constants/config'
import { Drone } from '../entities/Drone'
import { OldCamera } from '../entities/OldCamera'
import { Projectile, type GravityField } from '../entities/Projectile'
import { NPC, type NPCData } from '../entities/NPC'
import { BroadcastSentinel } from '../entities/BroadcastSentinel'
import { NEXUSProxy } from '../entities/NEXUSProxy'
import { WeaponCrate } from '../entities/WeaponCrate'
import type { Platform } from './Level1'
import type { Checkpoint, TerminalParticle } from './Level2'
import {
  renderMHzDialWorld,
  type MHzDialTerminal,
} from '../systems/FrequencyDial'

export const LEVEL6_WORLD_WIDTH = 9800
const LEVEL_END_X = 9600
const ACCENT = '#ff1744'

export type { MHzDialTerminal as DialTerminal } from '../systems/FrequencyDial'

export interface L6Gate {
  id: number
  x: number
  y: number
  h: number
  w: number
  open: boolean
  label: string
  color: string
}

export interface L6SectionTrigger {
  key: string
  x: number
  fired: boolean
  dialogue: {
    speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
    text: string
    expression?: string
  }[]
}

export class Level6 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL6_WORLD_WIDTH

  platforms: Platform[] = []
  gates: L6Gate[] = []
  checkpoints: Checkpoint[] = []
  npcs: NPC[] = []
  drones: Drone[] = []
  cameras: OldCamera[] = []
  sentinels: BroadcastSentinel[] = []
  nexus: NEXUSProxy | null = null
  projectiles: Projectile[] = []
  weaponCrate: WeaponCrate
  dials: MHzDialTerminal[] = []

  readonly injectX = 9200
  injectUsed = false

  spawnedGravityFields: GravityField[] = []

  sectionTriggers: L6SectionTrigger[] = []
  levelComplete = false
  exitPortal = { open: false }

  private time = 0
  /** Animated wind streaks (screen space) for Broadcast Core exterior. */
  private windStreaks: { x: number; y: number; len: number; a: number }[] = []

  constructor(groundY: number) {
    this.groundY = groundY
    const GY = groundY

    this.weaponCrate = new WeaponCrate({
      x: 3800,
      y: GY - 24,
      weaponSlot: 5,
      weaponName: 'PULSE',
      color: ACCENT,
      collected: false,
    })

    this.dials = [
      {
        id: 0,
        wx: 2300,
        wy: GY - 120,
        currentFreq: 48,
        targetFreq: 67.4,
        tolerance: 2,
        solved: false,
        gateId: 1,
      },
      {
        id: 1,
        wx: 6200,
        wy: GY - 120,
        currentFreq: 52,
        targetFreq: 33.8,
        tolerance: 2,
        solved: false,
        gateId: 3,
      },
    ]

    this.buildPlatforms()
    this.buildGates()
    this.buildCheckpoints()
    this.buildEnemies()
    this.buildCameras()
    this.buildNPCs()
    this.buildSectionTriggers()
    this.nexus = new NEXUSProxy(8200, GY - 160)

    for (let i = 0; i < 20; i++) {
      this.windStreaks.push({
        x: Math.random() * (CONFIG.CANVAS_WIDTH + 200),
        y: 160 + Math.random() * (GY - 220),
        len: 40 + Math.random() * 45,
        a: 0.05 + Math.random() * 0.1,
      })
    }
  }

  private buildPlatforms(): void {
    const GY = this.groundY
    this.platforms = [
      { x: 160, y: GY - 100, w: 200, h: 16 },
      { x: 480, y: GY - 160, w: 140, h: 16 },
      { x: 720, y: GY - 100, w: 180, h: 16 },
      { x: 1020, y: GY - 180, w: 120, h: 16 },
      { x: 1260, y: GY - 110, w: 180, h: 16 },
      { x: 1580, y: GY - 160, w: 140, h: 16 },
      { x: 2100, y: GY - 100, w: 200, h: 16 },
      { x: 2440, y: GY - 180, w: 140, h: 16 },
      { x: 2760, y: GY - 100, w: 220, h: 16 },
      { x: 3100, y: GY - 200, w: 100, h: 16 },
      { x: 3320, y: GY - 120, w: 180, h: 16 },
      { x: 3640, y: GY - 100, w: 200, h: 16 },
      { x: 4000, y: GY - 180, w: 140, h: 16 },
      { x: 4320, y: GY - 100, w: 220, h: 16 },
      { x: 5100, y: GY - 100, w: 200, h: 16 },
      { x: 5480, y: GY - 200, w: 120, h: 16 },
      { x: 5760, y: GY - 120, w: 180, h: 16 },
      { x: 6080, y: GY - 180, w: 140, h: 16 },
      { x: 6380, y: GY - 100, w: 220, h: 16 },
      { x: 6760, y: GY - 160, w: 140, h: 16 },
      { x: 7600, y: GY - 100, w: 220, h: 16 },
      { x: 8000, y: GY - 160, w: 180, h: 16 },
    ]
  }

  private buildGates(): void {
    const GY = this.groundY
    this.gates = [
      {
        id: 1,
        x: 2000,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'BROADCAST A',
        color: ACCENT,
      },
      {
        id: 3,
        x: 6400,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'BROADCAST B',
        color: ACCENT,
      },
    ]
  }

  private buildCheckpoints(): void {
    const gy = this.groundY
    const mk = (x: number): Checkpoint => ({
      x,
      y: gy,
      activated: false,
      activateTimer: 0,
      particles: [] as TerminalParticle[],
    })
    this.checkpoints = [mk(2100), mk(5100), mk(7600)]
  }

  private buildEnemies(): void {
    const GY = this.groundY
    this.sentinels = [
      new BroadcastSentinel(1100, GY, 800, 1400),
      new BroadcastSentinel(4200, GY, 3800, 4600),
      new BroadcastSentinel(7000, GY, 6600, 7400),
    ]
    this.drones = [
      new Drone(550, GY - 190, 90, 85, 80),
      new Drone(1400, GY - 200, 85, 90, 81),
      new Drone(2600, GY - 195, 92, 88, 82),
      new Drone(3800, GY - 205, 88, 92, 83),
      new Drone(5200, GY - 198, 90, 90, 84),
      new Drone(6400, GY - 210, 86, 94, 85),
      new Drone(7800, GY - 200, 94, 86, 86),
      new Drone(8600, GY - 208, 88, 90, 87),
      new Drone(9000, GY - 195, 90, 88, 88),
      new Drone(9400, GY - 202, 87, 93, 89),
      new Drone(1600, GY - 188, 80, 85, 90),
      new Drone(6000, GY - 212, 91, 89, 91),
    ]
  }

  private buildCameras(): void {
    const GY = this.groundY
    const xs = [400, 1200, 2400, 3600, 5000, 6200, 7400, 8800]
    this.cameras = xs.map(x => new OldCamera(x, GY - 170))
  }

  private buildNPCs(): void {
    const GY = this.groundY
    const k: NPCData = {
      id: 'L6_KIRAN',
      x: 300,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: '#e040fb',
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'Top of the tower. NEXUS 2.0 is on the other side of that door.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const r: NPCData = {
      id: 'L6_REYES',
      x: 5000,
      y: GY,
      name: 'DR_REYES',
      color: '#182028',
      accentColor: '#00b4d8',
      dialogue: [
        {
          speaker: 'NPC',
          text: 'The inject terminal is at the core. You will need all the evidence.',
        },
        {
          speaker: 'NPC',
          text: 'Everything you collected. All of it. One broadcast.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const ax: NPCData = {
      id: 'L6_AX',
      x: 8000,
      y: GY,
      name: 'AX',
      color: '#1a2030',
      accentColor: '#ff1744',
      dialogue: [
        { speaker: 'AX', text: 'AI processes data. Humans experience consequences.' },
        { speaker: 'AX', text: 'This is the consequence of their data.' },
      ],
      talked: false,
      isKiran: false,
    }
    this.npcs = [new NPC(k), new NPC(r), new NPC(ax)]
  }

  private buildSectionTriggers(): void {
    this.sectionTriggers = [
      {
        key: 'l6_s280',
        x: 280,
        fired: false,
        dialogue: [
          { speaker: 'NOVA', text: 'Broadcast Core. Wind shear on the gantries — do not fall.' },
        ],
      },
      {
        key: 'l6_s2100',
        x: 2100,
        fired: false,
        dialogue: [
          { speaker: 'NOVA', text: 'Dial one. Tune out the noise — find the clean frequency.' },
        ],
      },
      {
        key: 'l6_s5300',
        x: 5300,
        fired: false,
        dialogue: [{ speaker: 'AX', text: 'Second lock. Same trick, different number.' }],
      },
      {
        key: 'l6_s7300',
        x: 7300,
        fired: false,
        dialogue: [{ speaker: 'NOVA', text: 'Transmitter ahead. Inject terminal past the NEXUS proxy.' }],
      },
    ]
  }

  peekSectionTrigger(prevX: number, px: number): L6SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (s.fired) continue
      if (prevX < s.x && px >= s.x) return s
    }
    return null
  }

  syncDialGates(): void {
    for (const d of this.dials) {
      if (!d.solved) continue
      const g = this.gates.find(x => x.id === d.gateId)
      if (g && !g.open) g.open = true
    }
    this.refreshExit()
  }

  private refreshExit(): void {
    if (this.gates.every(x => x.open)) this.exitPortal.open = true
  }

  openGate(id: number): void {
    const g = this.gates.find(x => x.id === id)
    if (g) g.open = true
    this.refreshExit()
  }

  getNearDial(pcx: number, pcy: number): MHzDialTerminal | null {
    for (const d of this.dials) {
      if (d.solved) continue
      if (Math.hypot(pcx - d.wx, pcy - d.wy) < 60) return d
    }
    return null
  }

  getNearInject(pcx: number, py: number): boolean {
    if (this.injectUsed) return false
    return Math.abs(pcx - this.injectX) < 70 && py > this.groundY - 120
  }

  getNearNPC(cx: number): NPC | null {
    for (const n of this.npcs) if (n.isNear(cx)) return n
    return null
  }

  checkPlatformCollision(
    px: number,
    py: number,
    pw: number,
    ph: number,
    vy: number,
  ): number | null {
    if (vy < 0) return null
    const feet = py + ph
    if (vy >= 0) {
      for (const pl of this.platforms) {
        if (
          px + pw > pl.x &&
          px < pl.x + pl.w &&
          feet >= pl.y &&
          feet <= pl.y + pl.h + 10 &&
          py < pl.y + 5
        ) {
          return pl.y - ph
        }
      }
    }
    return null
  }

  getBlockingGate(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
  ): L6Gate | null {
    for (const g of this.gates) {
      if (g.open) continue
      if (
        ax + aw > g.x &&
        ax < g.x + g.w + 16 &&
        ay + ah > g.y &&
        ay < g.y + g.h
      )
        return g
    }
    return null
  }

  updateCheckpointsForPlayer(playerCenterX: number): Checkpoint | null {
    for (const cp of this.checkpoints) {
      if (cp.activated) continue
      if (playerCenterX >= cp.x) {
        cp.activated = true
        cp.activateTimer = 0.8
        return cp
      }
    }
    return null
  }

  applySectionStart(startX: number): void {
    for (const s of this.sectionTriggers) {
      if (s.x < startX) s.fired = true
    }
    for (const g of this.gates) {
      if (g.x < startX) g.open = true
    }
    if (this.gates.every(x => x.open)) this.exitPortal.open = true
    for (const cp of this.checkpoints) {
      if (cp.x < startX) {
        cp.activated = true
        cp.activateTimer = 0
      }
    }
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p)
  }

  private resolveGravityProjectiles(): void {
    const gy = this.groundY
    for (const p of this.projectiles) {
      if (!p.active || !p.gravityMode) continue
      let hit = false
      if (p.y >= gy - 8) hit = true
      if (p.x < 6 || p.x > LEVEL6_WORLD_WIDTH - 6) hit = true
      if (!hit) {
        const r = p.getRect()
        for (const pl of this.platforms) {
          if (
            r.x + r.w > pl.x &&
            r.x < pl.x + pl.w &&
            r.y + r.h > pl.y &&
            r.y < pl.y + pl.h
          ) {
            hit = true
            break
          }
        }
      }
      if (!hit) continue
      p.triggerGravityField()
      const g = p.pendingGravityField
      if (g) {
        this.spawnedGravityFields.push(g)
        p.pendingGravityField = null
      }
    }
  }

  drainSpawnedGravityFields(): GravityField[] {
    const out = this.spawnedGravityFields.slice()
    this.spawnedGravityFields.length = 0
    return out
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    pW: number,
    pH: number,
  ): void {
    this.time += dt
    this.weaponCrate.update(dt)
    this.syncDialGates()

    for (const w of this.windStreaks) {
      w.x -= 300 * dt
      if (w.x < -120) {
        w.x = CONFIG.CANVAS_WIDTH + 80 + Math.random() * 100
        w.y = 160 + Math.random() * (this.groundY - 220)
        w.len = 40 + Math.random() * 45
        w.a = 0.05 + Math.random() * 0.1
      }
    }

    const pcx = playerX + pW / 2
    const pcy = playerY + pH / 2

    for (const d of this.drones) {
      const dg = d as Drone & { activated?: boolean }
      if (!dg.activated) {
        if (pcx > d.x - 400) dg.activated = true
        else continue
      }
      d.update(dt)
    }
    for (const c of this.cameras) {
      const cg = c as OldCamera & { activated?: boolean }
      if (!cg.activated) {
        if (pcx > c.x - 400) cg.activated = true
        else continue
      }
      c.update(dt)
    }
    for (const s of this.sentinels) s.update(dt, pcx, pcy)
    this.nexus?.update(dt, pcx, pcy)

    for (const p of this.projectiles) p.update(dt)
    this.resolveGravityProjectiles()
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!
      if (!p.active) this.projectiles.splice(i, 1)
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    const skyGrad = ctx.createLinearGradient(0, 0, 0, GY)
    skyGrad.addColorStop(0, '#08000c')
    skyGrad.addColorStop(0.6, '#14040a')
    skyGrad.addColorStop(1, '#1a0608')
    ctx.fillStyle = skyGrad
    ctx.fillRect(0, 0, W, GY)

    const cityPal = ['#ff1744', '#ff9100', '#00e5ff', '#ffffff', '#e040fb'] as const
    ctx.save()
    for (let i = 0; i < 220; i++) {
      const wx = (i * 37 + (i % 9) * 19 - cameraX * 0.02) % (W + 40)
      const py = GY - 8 - (i % 5) * 6
      const c = cityPal[i % cityPal.length]!
      ctx.globalAlpha = 0.35 + (i % 7) * 0.06
      ctx.fillStyle = c
      ctx.fillRect(wx - 20, py, 1 + (i % 2), 1 + (i % 2))
    }
    ctx.globalAlpha = 1
    ctx.restore()

    const blink = Math.sin(this.time * Math.PI * 2) > 0 ? 1 : 0.35
    for (let wx = 0; wx < LEVEL6_WORLD_WIDTH; wx += 1400) {
      const sx = wx - cameraX * 0.08
      if (sx < -40 || sx > W + 40) continue
      ctx.fillStyle = '#0e0406'
      ctx.fillRect(sx, GY - 200, 8, 200)
      ctx.fillStyle = blink > 0.5 ? '#ff1744' : '#661018'
      ctx.beginPath()
      ctx.arc(sx + 4, GY - 200, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let bx = 0; bx < LEVEL6_WORLD_WIDTH; bx += 520) {
      const sx = bx - cameraX * 0.2
      if (sx < -60 || sx > W + 60) continue
      ctx.fillStyle = '#120406'
      ctx.fillRect(sx, 0, 14, GY)
      for (let yy = 40; yy < GY; yy += 80) {
        ctx.strokeStyle = '#1e0608'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(sx, yy)
        ctx.lineTo(sx + 120, yy)
        ctx.stroke()
      }
      for (let ry = 60; ry < GY - 40; ry += 80) {
        ctx.fillStyle = ry % 160 === 60 ? '#ff174422' : '#1a0608'
        ctx.fillRect(sx + 20, ry, 40, 10)
      }
    }

    ctx.save()
    ctx.strokeStyle = '#aac0ff'
    ctx.lineWidth = 0.5
    for (const w of this.windStreaks) {
      ctx.globalAlpha = w.a
      ctx.beginPath()
      ctx.moveTo(w.x, w.y)
      ctx.lineTo(w.x + w.len, w.y - 1)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.fillStyle = 'rgba(20,4,8,0.92)'
    ctx.fillRect(0, GY, W, H - GY)
    const cityGlow = ctx.createLinearGradient(0, GY, 0, H)
    cityGlow.addColorStop(0, 'rgba(255,23,68,0.07)')
    cityGlow.addColorStop(1, 'rgba(255,23,68,0)')
    ctx.fillStyle = cityGlow
    ctx.fillRect(0, GY, W, H - GY)
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -30 || sx > CONFIG.CANVAS_WIDTH + 30) continue
      ctx.save()
      ctx.fillStyle = '#1a0608'
      ctx.fillRect(sx, p.y, p.w, p.h)
      for (let u = 0; u < p.w; u += 12) {
        ctx.fillStyle = u % 24 === 0 ? ACCENT : 'rgba(255,23,68,0.15)'
        ctx.fillRect(sx + u, p.y, 12, 4)
      }
      ctx.strokeStyle = ACCENT
      ctx.strokeRect(sx + 0.5, p.y + 0.5, p.w - 1, p.h - 1)
      ctx.restore()
    }
  }

  private renderDials(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const d of this.dials) renderMHzDialWorld(ctx, d, cameraX, ACCENT)
  }

  private renderInject(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (this.injectUsed) return
    const sx = this.injectX - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return
    const GY = this.groundY
    ctx.save()
    ctx.fillStyle = '#1a0408'
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 2
    ctx.fillRect(sx - 40, GY - 100, 80, 70)
    ctx.strokeRect(sx - 40.5, GY - 100.5, 81, 71)
    ctx.font = '7px Orbitron, sans-serif'
    ctx.fillStyle = ACCENT
    ctx.textAlign = 'center'
    ctx.fillText('INJECT', sx, GY - 108)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private renderGates(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const g of this.gates) {
      if (g.open) continue
      const sx = g.x - cameraX
      if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) continue
      ctx.save()
      ctx.fillStyle = g.color + '44'
      ctx.strokeStyle = g.color
      ctx.lineWidth = 3
      ctx.fillRect(sx, g.y, g.w, g.h)
      ctx.strokeRect(sx + 0.5, g.y + 0.5, g.w - 1, g.h - 1)
      ctx.fillStyle = '#fff'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillText(g.label, sx + 2, g.y + g.h / 2)
      ctx.restore()
    }
  }

  private renderCheckpoints(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const GY = this.groundY
    for (const cp of this.checkpoints) {
      const sx = cp.x - cameraX
      if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) continue
      ctx.fillStyle = '#475569'
      ctx.fillRect(sx - 2, GY - 80, 4, 80)
      ctx.fillStyle = cp.activated ? '#00ff88' : '#1e293b'
      ctx.fillRect(sx - 11, GY - 80, 22, 14)
    }
  }

  private renderExit(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const GY = this.groundY
    const ex = LEVEL_END_X - cameraX
    if (ex > -60 && ex < CONFIG.CANVAS_WIDTH + 60) {
      ctx.save()
      const open = this.exitPortal.open
      ctx.strokeStyle = open ? '#00ff88' : '#553344'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(ex, GY - 100, 40, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.renderBackground(ctx, cameraX)
    this.renderPlatforms(ctx, cameraX)
    this.renderDials(ctx, cameraX)
    this.renderInject(ctx, cameraX)
    for (const c of this.cameras) {
      if (!(c as OldCamera & { activated?: boolean }).activated) continue
      c.render(ctx, cameraX)
    }
    for (const d of this.drones) {
      if (!(d as Drone & { activated?: boolean }).activated) continue
      d.render(ctx, cameraX)
    }
    for (const s of this.sentinels) s.render(ctx, cameraX)
    this.nexus?.render(ctx, cameraX)
    for (const n of this.npcs) n.render(ctx, cameraX)
    this.weaponCrate.render(ctx, cameraX)
    this.renderGates(ctx, cameraX)
    for (const p of this.projectiles) p.render(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX)
    this.renderExit(ctx, cameraX)
  }
}
