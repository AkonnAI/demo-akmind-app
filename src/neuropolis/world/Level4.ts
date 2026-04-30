import { CONFIG } from '../constants/config'
import { Drone } from '../entities/Drone'
import { OldCamera } from '../entities/OldCamera'
import { Projectile, type GravityField } from '../entities/Projectile'
import { NPC, type NPCData } from '../entities/NPC'
import { AuditBot } from '../entities/AuditBot'
import { ProcessorSwarm } from '../entities/ProcessorSwarm'
import { WeaponCrate } from '../entities/WeaponCrate'
import {
  createBalanceScale,
  updateBalanceScales,
  renderBalanceScales,
  type BalanceScale,
} from '../systems/WeightScale'
import type { Platform } from './Level1'
import type { Checkpoint, TerminalParticle } from './Level2'

export const LEVEL4_WORLD_WIDTH = 9400
const LEVEL_END_X = 9200
const ACCENT = '#00b4d8'

export interface Gate {
  id: number
  x: number
  y: number
  h: number
  w: number
  open: boolean
  label: string
  color: string
  terminalX: number
  hacked: boolean
  hackable: boolean
  mechanic?: 'scale' | 'qte'
}

export interface L4SectionTrigger {
  key: string
  x: number
  fired: boolean
  dialogue: {
    speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
    text: string
    expression?: string
  }[]
}

export class Level4 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL4_WORLD_WIDTH

  platforms: Platform[] = []
  gates: Gate[] = []
  checkpoints: Checkpoint[] = []
  npcs: NPC[] = []
  drones: Drone[] = []
  cameras: OldCamera[] = []
  auditBots: AuditBot[] = []
  swarms: ProcessorSwarm[] = []
  projectiles: Projectile[] = []
  weaponCrate: WeaponCrate
  balanceScales: BalanceScale[] = []

  sectionTriggers: L4SectionTrigger[] = []
  levelComplete = false
  exitPortal = { open: false }

  /** Spawned when a gravity bolt hits; consumed by GameScene4 each frame. */
  spawnedGravityFields: GravityField[] = []

  evidenceCollected = false
  readonly evidenceX = 4200
  readonly evidencePedestalY: number

  private time = 0

  constructor(groundY: number) {
    this.groundY = groundY
    this.evidencePedestalY = groundY - 40
    const GY = groundY

    this.weaponCrate = new WeaponCrate({
      x: 3200,
      y: GY - 24,
      weaponSlot: 3,
      weaponName: 'GRAVITY',
      color: ACCENT,
      collected: false,
    })

    this.balanceScales = [
      createBalanceScale(0, 2400, GY, 120, 1, [
        { weight: 40, label: 'D1: 40', spawnX: 2080 },
        { weight: 80, label: 'D2: 80', spawnX: 2140 },
        { weight: 40, label: 'D1: 40', spawnX: 2620 },
        { weight: 80, label: 'D3: 80', spawnX: 2680 },
      ]),
      createBalanceScale(1, 6800, GY, 160, 3, [
        { weight: 80, label: 'D2: 80', spawnX: 6520 },
        { weight: 80, label: 'D3: 80', spawnX: 6580 },
        { weight: 40, label: 'D1: 40', spawnX: 7040 },
        { weight: 40, label: 'D1: 40', spawnX: 7100 },
        { weight: 80, label: 'D2: 80', spawnX: 6640 },
        { weight: 40, label: 'D1: 40', spawnX: 7000 },
      ]),
    ]

    this.buildPlatforms()
    this.buildGates()
    this.buildCheckpoints()
    this.buildEnemies()
    this.buildCameras()
    this.buildNPCs()
    this.buildSectionTriggers()
  }

  private buildPlatforms(): void {
    const GY = this.groundY
    this.platforms = [
      { x: 280, y: GY - 110, w: 180, h: 16 },
      { x: 520, y: GY - 160, w: 140, h: 16 },
      { x: 760, y: GY - 120, w: 180, h: 16 },
      { x: 1000, y: GY - 170, w: 160, h: 16 },
      { x: 1260, y: GY - 130, w: 200, h: 16 },
      { x: 1540, y: GY - 180, w: 140, h: 16 },
      { x: 1780, y: GY - 130, w: 180, h: 16 },
      { x: 2020, y: GY - 170, w: 140, h: 16 },
      { x: 2280, y: GY - 120, w: 220, h: 16 },
      { x: 2620, y: GY - 170, w: 160, h: 16 },
      { x: 2880, y: GY - 120, w: 200, h: 16 },
      { x: 3280, y: GY - 190, w: 140, h: 16 },
      { x: 3580, y: GY - 140, w: 160, h: 16 },
      { x: 3880, y: GY - 110, w: 220, h: 16 },
      { x: 4280, y: GY - 170, w: 160, h: 16 },
      { x: 4580, y: GY - 120, w: 200, h: 16 },
      { x: 4880, y: GY - 170, w: 160, h: 16 },
      { x: 5180, y: GY - 130, w: 200, h: 16 },
      { x: 5480, y: GY - 170, w: 180, h: 16 },
      { x: 5780, y: GY - 210, w: 140, h: 16 },
      { x: 6080, y: GY - 160, w: 180, h: 16 },
      { x: 6480, y: GY - 120, w: 220, h: 16 },
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
        label: 'SECTOR A',
        color: ACCENT,
        terminalX: 1945,
        hacked: false,
        hackable: false,
        mechanic: 'scale',
      },
      {
        id: 2,
        x: 5200,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'SECTOR B',
        color: ACCENT,
        terminalX: 5145,
        hacked: false,
        hackable: false,
        mechanic: 'qte',
      },
      {
        id: 3,
        x: 7200,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'ARCHIVE',
        color: ACCENT,
        terminalX: 7145,
        hacked: false,
        hackable: false,
        mechanic: 'scale',
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
    this.checkpoints = [mk(2100), mk(5300), mk(7500)]
  }

  private buildEnemies(): void {
    const GY = this.groundY
    this.auditBots = [
      new AuditBot(700, GY, 450, 1000),
      new AuditBot(1200, GY, 900, 1500),
      new AuditBot(2000, GY, 1700, 2400),
      new AuditBot(2800, GY, 2500, 3100),
      new AuditBot(3800, GY, 3500, 4100),
      new AuditBot(4500, GY, 4200, 4900),
      new AuditBot(5200, GY, 4900, 5600),
      new AuditBot(5900, GY, 5600, 6200),
      new AuditBot(6800, GY, 6500, 7100),
      new AuditBot(7500, GY, 7200, 7800),
      new AuditBot(8200, GY, 7900, 8600),
    ]
    this.swarms = [
      new ProcessorSwarm(900, GY - 180),
      new ProcessorSwarm(2100, GY - 200),
      new ProcessorSwarm(3600, GY - 180),
      new ProcessorSwarm(4800, GY - 200),
      new ProcessorSwarm(6100, GY - 180),
      new ProcessorSwarm(7600, GY - 200),
    ]
    this.drones = [
      new Drone(450, GY - 200, 100, 80, 50),
      new Drone(1100, GY - 220, 90, 100, 51),
      new Drone(1800, GY - 210, 95, 95, 52),
      new Drone(2500, GY - 200, 100, 90, 53),
      new Drone(3700, GY - 220, 95, 100, 54),
      new Drone(5000, GY - 200, 100, 85, 55),
      new Drone(6200, GY - 220, 105, 95, 56),
      new Drone(7500, GY - 200, 100, 100, 57),
      new Drone(8600, GY - 220, 95, 105, 58),
      new Drone(9000, GY - 210, 100, 92, 59),
    ]
  }

  private buildCameras(): void {
    const GY = this.groundY
    const xs = [380, 780, 1180, 1580, 2080, 2580, 3080, 3680, 4280, 4880, 5480, 6080]
    this.cameras = xs.map(x => new OldCamera(x, GY - 180))
  }

  private buildNPCs(): void {
    const GY = this.groundY
    const w1: NPCData = {
      id: 'L4_WORKER',
      x: 350,
      y: GY,
      name: 'FACILITY_WORKER',
      color: '#1a2030',
      accentColor: ACCENT,
      dialogue: [
        {
          speaker: 'NPC',
          text: 'They run every District 1 citizen through this system.',
        },
        {
          speaker: 'NPC',
          text: 'The scales are already set to fail us. That is the point.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran: NPCData = {
      id: 'L4_KIRAN',
      x: 4500,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: '#e040fb',
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'This is where they processed the 2014 census data.',
        },
        {
          speaker: 'KIRAN',
          text: 'Every number District 1 submitted was weighted at half value.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const reyes: NPCData = {
      id: 'L4_REYES',
      x: 9000,
      y: GY,
      name: 'DR_REYES',
      color: '#182028',
      accentColor: ACCENT,
      dialogue: [
        {
          speaker: 'NPC',
          text: 'I built part of this system. I did not understand what I was building.',
        },
        {
          speaker: 'NPC',
          text: 'The scales were always going to fail District 1. By design.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    this.npcs = [new NPC(w1), new NPC(kiran), new NPC(reyes)]
  }

  private buildSectionTriggers(): void {
    this.sectionTriggers = [
      {
        key: 'l4_sec280',
        x: 280,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'NeuroCorps data facility. Everything here runs the algorithm.',
          },
        ],
      },
      {
        key: 'l4_sec2100',
        x: 2100,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Weight scales. They use these to assign citizen value scores.',
          },
        ],
      },
      {
        key: 'l4_sec5300',
        x: 5300,
        fired: false,
        dialogue: [
          {
            speaker: 'AX',
            text: 'The weights are wrong. They were always wrong.',
          },
        ],
      },
      {
        key: 'l4_sec7300',
        x: 7300,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Last gate. The evidence is in the archive beyond.',
          },
        ],
      },
    ]
  }

  peekSectionTrigger(prevX: number, px: number): L4SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (s.fired) continue
      if (prevX < s.x && px >= s.x) return s
    }
    return null
  }

  getHackableGate(playerCenterX: number): Gate | null {
    for (const g of this.gates) g.hackable = false
    let found: Gate | null = null
    for (const g of this.gates) {
      if (g.open || g.mechanic !== 'qte') continue
      if (Math.abs(playerCenterX - g.terminalX) < 70) {
        found = g
        break
      }
    }
    if (found) found.hackable = true
    return found
  }

  openGate(id: number): void {
    const g = this.gates.find(x => x.id === id)
    if (g) {
      g.open = true
      g.hacked = true
    }
    this.refreshExitPortal()
  }

  syncScaleGates(): void {
    for (const sc of this.balanceScales) {
      if (!sc.solved) continue
      const g = this.gates.find(x => x.id === sc.gateId)
      if (g && !g.open) {
        g.open = true
        g.hacked = true
      }
    }
    this.refreshExitPortal()
  }

  private refreshExitPortal(): void {
    if (this.gates.every(x => x.open)) this.exitPortal.open = true
  }

  getNearNPC(cx: number): NPC | null {
    for (const n of this.npcs) if (n.isNear(cx)) return n
    return null
  }

  tryCollectEvidence(px: number, py: number): boolean {
    if (this.evidenceCollected) return false
    const d = 56
    if (
      Math.abs(px - this.evidenceX) < d &&
      py >= this.evidencePedestalY - 80 &&
      py <= this.evidencePedestalY + 20
    )
      return true
    return false
  }

  markEvidenceConsumed(): void {
    this.evidenceCollected = true
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
  ): Gate | null {
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
      if (g.x < startX) {
        g.open = true
        g.hacked = true
      }
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
      if (p.x < 6 || p.x > LEVEL4_WORLD_WIDTH - 6) hit = true
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
    pvx: number,
  ): void {
    this.time += dt
    this.weaponCrate.update(dt)
    this.syncScaleGates()

    const pcx = playerX + pW / 2
    const pcy = playerY + pH / 2

    updateBalanceScales(
      this.balanceScales,
      dt,
      playerX,
      playerY,
      pW,
      pH,
      pvx,
      this.groundY,
      this.platforms,
      LEVEL4_WORLD_WIDTH,
    )

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
    for (const a of this.auditBots) a.update(dt, pcx, pcy)
    for (const s of this.swarms) s.update(dt, pcx, pcy)

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

    ctx.fillStyle = '#e8eaf0'
    ctx.fillRect(0, 0, W, GY)

    for (let wx = 0; wx < LEVEL4_WORLD_WIDTH; wx += 720) {
      const sx = wx - cameraX * 0.04
      if (sx < -200 || sx > W + 200) continue
      const th = 200 + (wx % 300)
      ctx.fillStyle = '#c8ccd8'
      ctx.fillRect(sx, GY - th, 90, th)
      for (let wy = GY - th + 24; wy < GY - 8; wy += 24) {
        for (let ix = 8; ix < 80; ix += 24) {
          ctx.fillStyle = '#00b4d833'
          ctx.fillRect(sx + ix, wy, 4, 4)
        }
      }
    }
    const tallSx = 4200 - cameraX * 0.04
    if (tallSx > -120 && tallSx < W + 120) {
      ctx.fillStyle = '#b8bcc8'
      ctx.fillRect(tallSx, GY - 420, 110, 420)
      ctx.strokeStyle = '#00b4d8'
      ctx.lineWidth = 2
      ctx.strokeRect(tallSx + 0.5, GY - 420.5, 109, 419)
      ctx.fillStyle = '#00b4d8'
      ctx.font = 'bold 10px Orbitron, sans-serif'
      ctx.fillText('N', tallSx + 55, GY - 380)
    }

    for (let wx = 0; wx < LEVEL4_WORLD_WIDTH; wx += 520) {
      const sx = wx - cameraX * 0.12
      if (sx < -180 || sx > W + 180) continue
      ctx.fillStyle = '#d0d4e0'
      ctx.fillRect(sx, GY - 260, 140, 260)
      for (let fy = GY - 250; fy < GY - 20; fy += 32) {
        ctx.strokeStyle = '#b8bcc8'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(sx + 4, fy)
        ctx.lineTo(sx + 136, fy)
        ctx.stroke()
      }
      ctx.fillStyle = '#00b4d822'
      ctx.fillRect(sx + 20, GY - 200, 36, 120)
    }

    for (let wx = 0; wx < LEVEL4_WORLD_WIDTH; wx += 640) {
      const sx = wx - cameraX * 0.25
      if (sx < -200 || sx > W + 200) continue
      ctx.fillStyle = '#c0c4d0'
      ctx.fillRect(sx, GY - 180, 100, 100)
      for (let led = 0; led < 4; led++) {
        const on = (this.time + led + wx * 0.01) % 1.4 < 0.7
        ctx.fillStyle = on ? '#00b4d8' : '#1a2030'
        ctx.fillRect(sx + 12 + led * 18, GY - 160, 6, 6)
      }
    }

    for (let wx = 0; wx < LEVEL4_WORLD_WIDTH; wx += 80) {
      const sx = wx - cameraX * 0.5
      if (sx < -20 || sx > W + 20) continue
      ctx.strokeStyle = '#a0a4b0'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(sx, GY - 40)
      ctx.lineTo(sx + 14, GY - 10)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(sx + 14, GY - 40)
      ctx.lineTo(sx, GY - 10)
      ctx.stroke()
      if (wx % 400 === 0) {
        ctx.fillStyle = '#ff1744'
        ctx.beginPath()
        ctx.moveTo(sx + 7, GY - 52)
        ctx.lineTo(sx - 2, GY - 40)
        ctx.lineTo(sx + 16, GY - 40)
        ctx.closePath()
        ctx.fill()
      }
    }

    ctx.fillStyle = '#c8ccd8'
    ctx.fillRect(0, GY, W, H - GY)
    ctx.strokeStyle = '#a8aab8'
    ctx.lineWidth = 0.5
    const gxOff = -(cameraX * 0.06) % 64
    for (let gx = gxOff - 64; gx < W + 64; gx += 64) {
      ctx.beginPath()
      ctx.moveTo(gx, GY)
      ctx.lineTo(gx, H)
      ctx.stroke()
    }
    for (let gy = GY + 48; gy < H; gy += 48) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(W, gy)
      ctx.stroke()
    }
    ctx.fillStyle = '#00b4d811'
    ctx.fillRect(0, GY, W, 8)
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue
      ctx.save()
      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      ctx.fillRect(sx + 2, p.y + 6, p.w - 4, p.h + 4)
      ctx.fillStyle = '#d0d4e0'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = ACCENT
      ctx.fillRect(sx, p.y, p.w, 4)
      for (const cx of [sx + 4, sx + p.w - 4]) {
        ctx.fillStyle = '#a8b0c0'
        ctx.beginPath()
        ctx.arc(cx, p.y + 4, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }

  private renderEvidence(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (this.evidenceCollected) return
    const sx = this.evidenceX - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return
    ctx.save()
    ctx.fillStyle = '#0a1420'
    ctx.fillRect(sx - 24, this.evidencePedestalY - 32, 48, 32)
    ctx.strokeStyle = ACCENT
    ctx.strokeRect(sx - 24 + 0.5, this.evidencePedestalY - 32.5, 47, 31)
    ctx.font = '7px Orbitron, sans-serif'
    ctx.fillStyle = ACCENT
    ctx.textAlign = 'center'
    ctx.fillText('EVIDENCE', sx, this.evidencePedestalY - 40)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private renderGates(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const GY = this.groundY
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
      ctx.fillStyle = '#0a1420'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillText(g.label, sx + 2, g.y + g.h / 2)
      ctx.restore()

      if (g.mechanic === 'qte') {
        const tx = g.terminalX - cameraX
        if (tx < -40 || tx > CONFIG.CANVAS_WIDTH + 40) continue
        ctx.save()
        ctx.fillStyle = '#060c14'
        ctx.fillRect(tx - 9, GY - 56, 18, 36)
        ctx.strokeStyle = g.hackable ? '#00ff88' : g.color
        ctx.lineWidth = 1.5
        ctx.shadowColor = ctx.strokeStyle
        ctx.shadowBlur = 6
        ctx.strokeRect(tx - 9, GY - 56, 18, 36)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#0a0e1a'
        ctx.fillRect(tx - 7, GY - 54, 14, 18)
        const blink = Math.sin(this.time * 6) > 0
        ctx.fillStyle = g.hackable ? '#00ff88' : g.color
        ctx.globalAlpha = blink ? 0.9 : 0.3
        ctx.fillRect(tx - 4, GY - 43, 6, 2)
        ctx.globalAlpha = 1
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = g.hackable ? '#00ff88' : g.color
        ctx.fillText(g.hacked ? '✓' : '⚿', tx, GY - 24)
        if (g.hackable) {
          ctx.globalAlpha = 0.7 + Math.sin(this.time * 4) * 0.28
          ctx.font = '6px Orbitron, monospace'
          ctx.fillStyle = '#ffffff'
          ctx.fillText('[ E ]', tx, GY - 62)
          ctx.globalAlpha = 1
        }
        ctx.textAlign = 'left'
        ctx.restore()
      }
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
      ctx.strokeStyle = open ? '#00ff88' : '#334155'
      ctx.lineWidth = 3
      ctx.shadowColor = open ? '#00ff88' : 'transparent'
      ctx.shadowBlur = open ? 20 : 0
      ctx.beginPath()
      ctx.arc(ex, GY - 100, 44, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = open ? 'rgba(0,255,136,0.15)' : 'rgba(30,30,40,0.4)'
      ctx.fill()
      ctx.restore()
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.renderBackground(ctx, cameraX)
    this.renderPlatforms(ctx, cameraX)
    renderBalanceScales(ctx, this.balanceScales, cameraX, this.time)
    for (const c of this.cameras) {
      if (!(c as OldCamera & { activated?: boolean }).activated) continue
      c.render(ctx, cameraX)
    }
    for (const d of this.drones) {
      if (!(d as Drone & { activated?: boolean }).activated) continue
      d.render(ctx, cameraX)
    }
    for (const a of this.auditBots) a.render(ctx, cameraX)
    for (const s of this.swarms) s.render(ctx, cameraX)
    for (const n of this.npcs) n.render(ctx, cameraX)
    this.renderEvidence(ctx, cameraX)
    this.weaponCrate.render(ctx, cameraX)
    this.renderGates(ctx, cameraX)
    for (const p of this.projectiles) p.render(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX)
    this.renderExit(ctx, cameraX)
  }
}
