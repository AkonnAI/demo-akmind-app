import { CONFIG } from '../constants/config'
import { Drone } from '../entities/Drone'
import { OldCamera } from '../entities/OldCamera'
import { Projectile } from '../entities/Projectile'
import { NPC, type NPCData } from '../entities/NPC'
import { MarketEnforcer } from '../entities/MarketEnforcer'
import type { DataWraith } from '../entities/DataWraith'
import { WeaponCrate } from '../entities/WeaponCrate'
import {
  createL3PatternGrid1,
  createL3PatternGrid2,
  type PatternGrid,
} from '../systems/PatternGrid'
import type { Platform } from './Level1'
import type { Checkpoint, TerminalParticle } from './Level2'

export const LEVEL3_WORLD_WIDTH = 9200
const LEVEL_END_X = 9000
const ACCENT = '#e040fb'

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
  mechanic?: 'pattern' | 'evidence'
}

export interface L3SectionTrigger {
  key: string
  x: number
  fired: boolean
  dialogue: {
    speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
    text: string
    expression?: string
  }[]
}

/** Passed from `GameScene3` for ambient crowd tension near sector gates. */
export type CrowdMoodEvent = 'stood_near_gate'

export interface InvisibleWall {
  x: number
  w: number
  y: number
  h: number
  open: boolean
}

export class Level3 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL3_WORLD_WIDTH

  /** When true, GameScene draws ParallaxBackground; Level3 skips sky fill. */
  skipInlineBackground = true

  platforms: Platform[] = []
  gates: Gate[] = []
  checkpoints: Checkpoint[] = []
  npcs: NPC[] = []
  drones: Drone[] = []
  cameras: OldCamera[] = []
  enforcers: MarketEnforcer[] = []
  wraiths: DataWraith[] = []
  projectiles: Projectile[] = []
  weaponCrate: WeaponCrate
  patternGrids: PatternGrid[] = []
  shopTerminalXs: number[] = []
  evidenceCollected = false
  readonly evidenceX = 4300
  readonly evidencePedestalY: number

  /** Invisible sector barriers (synced with pattern / evidence progress). */
  wall1: InvisibleWall
  wall2: InvisibleWall
  wall3: InvisibleWall

  sectionTriggers: L3SectionTrigger[] = []
  levelComplete = false
  exitPortal = { open: false }

  /** 0–100 ambient “crowd” pressure (e.g. standing near a closed sector gate). */
  crowdMood = 0

  private time = 0
  private crowdXs: number[] = []
  /** Consecutive frames near gate 2 while it is closed; resets when the player leaves. */
  private stoodGateFrames = 0

  constructor(groundY: number) {
    this.groundY = groundY
    this.evidencePedestalY = groundY - 40
    this.patternGrids = [
      createL3PatternGrid1(groundY),
      createL3PatternGrid2(groundY),
    ]
    this.weaponCrate = new WeaponCrate({
      x: 3800,
      y: groundY - 24,
      weaponSlot: 2,
      weaponName: 'PRISM SHOT',
      color: ACCENT,
      collected: false,
    })
    for (let i = 0; i < 10; i++) this.crowdXs.push(140 + i * 820 + (i % 3) * 40)
    this.buildPlatforms()
    this.buildGates()
    this.buildCheckpoints()
    this.buildEnemies()
    this.buildNPCs()
    this.buildCameras()
    this.buildSectionTriggers()
    this.shopTerminalXs = [1400, 4000, 6200]
    const gyW = this.groundY
    this.wall1 = { x: 2200 + 60, w: 20, y: 0, h: gyW, open: false }
    this.wall2 = { x: 4800 + 60, w: 20, y: 0, h: gyW, open: false }
    this.wall3 = { x: 7000 + 60, w: 20, y: 0, h: gyW, open: false }
  }

  private buildPlatforms(): void {
    const GY = this.groundY
    this.platforms = [
      { x: 200, y: GY - 80, w: 160, h: 14 },
      { x: 460, y: GY - 140, w: 120, h: 14 },
      { x: 680, y: GY - 80, w: 180, h: 14 },
      { x: 940, y: GY - 150, w: 140, h: 14 },
      { x: 1180, y: GY - 90, w: 160, h: 14 },
      { x: 1440, y: GY - 160, w: 120, h: 14 },
      { x: 1680, y: GY - 90, w: 180, h: 14 },
      { x: 1940, y: GY - 140, w: 140, h: 14 },
      { x: 2300, y: GY - 80, w: 200, h: 14 },
      { x: 2640, y: GY - 160, w: 140, h: 14 },
      { x: 2940, y: GY - 80, w: 180, h: 14 },
      { x: 3300, y: GY - 180, w: 260, h: 14 },
      { x: 3700, y: GY - 120, w: 160, h: 14 },
      { x: 4060, y: GY - 80, w: 200, h: 14 },
      { x: 4360, y: GY - 160, w: 140, h: 14 },
      { x: 4680, y: GY - 90, w: 180, h: 14 },
      { x: 5100, y: GY - 100, w: 180, h: 14 },
      { x: 5380, y: GY - 180, w: 140, h: 14 },
      { x: 5660, y: GY - 100, w: 200, h: 14 },
      { x: 5980, y: GY - 160, w: 140, h: 14 },
      { x: 6260, y: GY - 100, w: 180, h: 14 },
      { x: 6540, y: GY - 160, w: 140, h: 14 },
      { x: 7300, y: GY - 100, w: 200, h: 14 },
      { x: 7660, y: GY - 160, w: 160, h: 14 },
      { x: 8020, y: GY - 100, w: 200, h: 14 },
      { x: 8400, y: GY - 160, w: 160, h: 14 },
    ]
  }

  private buildGates(): void {
    const GY = this.groundY
    this.gates = [
      {
        id: 1,
        x: 2200,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'SECTOR 1',
        color: ACCENT,
        terminalX: 2200 - 55,
        hacked: false,
        hackable: false,
        mechanic: 'pattern',
      },
      {
        id: 2,
        x: 4800,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'SECTOR 2',
        color: ACCENT,
        terminalX: 4800 - 55,
        hacked: false,
        hackable: false,
        mechanic: 'evidence',
      },
      {
        id: 3,
        x: 7000,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'SECTOR 3',
        color: ACCENT,
        terminalX: 7000 - 55,
        hacked: false,
        hackable: false,
        mechanic: 'pattern',
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
    this.checkpoints = [mk(2250), mk(5100), mk(7400)]
  }

  private buildEnemies(): void {
    const GY = this.groundY
    // Sparse patrols — Data Market stays readable; no floating wraiths.
    this.enforcers = [
      new MarketEnforcer(900, GY, 650, 1250),
      new MarketEnforcer(2100, GY, 1750, 2450),
      new MarketEnforcer(3800, GY, 3400, 4300),
      new MarketEnforcer(5200, GY, 4800, 5650),
      new MarketEnforcer(7000, GY, 6600, 7450),
      new MarketEnforcer(8600, GY, 8100, 9050),
    ]
    this.wraiths = []
    this.drones = [
      new Drone(1100, GY - 200, 800, 1400, 52),
      new Drone(3200, GY - 210, 2800, 3600, 52),
      new Drone(5400, GY - 200, 5000, 5800, 54),
      new Drone(7600, GY - 215, 7200, 8000, 53),
    ]
  }

  private buildCameras(): void {
    const GY = this.groundY
    const xs = [700, 3200, 5200, 7200, 8800]
    this.cameras = xs.map(x => new OldCamera(x, GY - 180))
  }

  private buildNPCs(): void {
    const GY = this.groundY
    const vendor: NPCData = {
      id: 'MARKET_VENDOR',
      x: 320,
      y: GY,
      name: 'VENDOR',
      color: '#1a1428',
      accentColor: '#94a3b8',
      dialogue: [
        {
          speaker: 'NPC',
          text: 'NeuroCorps enforcers have been buying data from every stall. They want to know what we know about the algorithm.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran1: NPCData = {
      id: 'KIRAN_PRE',
      x: 3700,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: ACCENT,
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'AX. I have been waiting. My stall has the evidence you need.',
        },
        {
          speaker: 'KIRAN',
          text: 'They tried to delete it. I backed it up on six dead drops.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran2: NPCData = {
      id: 'KIRAN_JOIN',
      x: 8800,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: ACCENT,
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'Now you know what the algorithm ate. Biased data from 2014.',
        },
        {
          speaker: 'KIRAN',
          text: 'District 2 is where that data came from. Let us go find it.',
        },
        {
          speaker: 'KIRAN',
          text: "District 3 is beyond Gate 3. I'll meet you there, bhai.",
        },
      ],
      talked: false,
      isKiran: true,
    }
    this.npcs = [new NPC(vendor), new NPC(kiran1), new NPC(kiran2)]
  }

  private buildSectionTriggers(): void {
    this.sectionTriggers = [
      {
        key: 'l3_sec1',
        x: 280,
        fired: false,
        dialogue: [
          {
            speaker: 'NARRATOR',
            text: 'Data Market. Every transaction NeuroCorps monitors.',
          },
        ],
      },
      {
        key: 'l3_sec2',
        x: 1600,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Pattern lock ahead. AI learned these sequences from training data. Reproduce them to pass.',
          },
        ],
      },
      {
        key: 'l3_sec3',
        x: 5400,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Evidence secured. The data trail leads to District 2.',
          },
        ],
      },
      {
        key: 'l3_sec4',
        x: 7400,
        fired: false,
        dialogue: [
          { speaker: 'AX', text: 'Almost out. Do not stop.' },
        ],
      },
    ]
  }

  peekSectionTrigger(prevX: number, px: number): L3SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (s.fired) continue
      if (prevX < s.x && px >= s.x) return s
    }
    return null
  }

  getNearShopTerminal(playerCenterX: number): boolean {
    return this.shopTerminalXs.some(tx => Math.abs(playerCenterX - tx) < 70)
  }

  openGate(id: number): void {
    const g = this.gates.find(x => x.id === id)
    if (g) {
      g.open = true
      g.hacked = true
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
    const d = 50
    if (
      Math.abs(px - this.evidenceX) < d &&
      py >= this.evidencePedestalY - 80 &&
      py <= this.evidencePedestalY + 20
    ) {
      return true
    }
    return false
  }

  markEvidenceConsumed(): void {
    this.evidenceCollected = true
    const g = this.gates.find(x => x.id === 2)
    if (g) {
      g.open = true
      g.hacked = true
    }
    this.refreshExitPortal()
  }

  onEnemyKilledAt(_wx: number): void {
    void _wx
  }

  checkPlatformCollision(
    px: number,
    py: number,
    pw: number,
    ph: number,
    vy: number,
  ): number | null {
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

  getBlockingGate(ax: number, ay: number, aw: number, ah: number): Gate | null {
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

  getBlockingWall(ax: number, ay: number, aw: number, ah: number): InvisibleWall | null {
    for (const wall of [this.wall1, this.wall2, this.wall3]) {
      if (wall.open) continue
      if (
        ax + aw > wall.x &&
        ax < wall.x + wall.w &&
        ay + ah > wall.y &&
        ay < wall.y + wall.h
      )
        return wall
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

    // Sync puzzle state so walls match the now-open gates.
    const gate1Open = this.gates.find(g => g.id === 1)?.open ?? false
    const gate2Open = this.gates.find(g => g.id === 2)?.open ?? false
    const gate3Open = this.gates.find(g => g.id === 3)?.open ?? false

    if (gate1Open) {
      if (this.patternGrids[0]) {
        this.patternGrids[0].solved = true
        this.patternGrids[0].activated = true
      }
      // Gate 1 solved means grid 2 should be unlocked for play.
      if (this.patternGrids[1]) this.patternGrids[1].activated = true
    }
    if (gate2Open) this.evidenceCollected = true
    if (gate3Open && this.patternGrids[1]) {
      this.patternGrids[1].solved = true
    }

    const g2 = this.gates[1]
    if (g2 && startX > g2.x) this.crowdMood = 100
    this.refreshExitPortal()
    for (const cp of this.checkpoints) {
      if (cp.x < startX) {
        cp.activated = true
        cp.activateTimer = 0
      }
    }
  }

  resetStoodGateFrames(): void {
    this.stoodGateFrames = 0
  }

  updateCrowdMood(ev: CrowdMoodEvent): void {
    if (ev !== 'stood_near_gate') return
    this.stoodGateFrames++
    const capFrames = 180
    if (this.stoodGateFrames <= capFrames) {
      this.crowdMood = Math.min(100, this.crowdMood + 100 / capFrames)
    }
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p)
  }

  checkEnforcerBodyHit(
    px: number,
    py: number,
    pw: number,
    ph: number,
  ): boolean {
    for (const e of this.enforcers) {
      if (!e.active) continue
      const r = e.getRect()
      if (
        px + pw > r.x &&
        px < r.x + r.w &&
        py + ph > r.y &&
        py < r.y + r.h
      )
        return true
    }
    return false
  }

  checkEnforcerOrbHit(px: number, py: number, pw: number, ph: number): boolean {
    for (const e of this.enforcers) {
      if (!e.active) continue
      if (e.checkOrbHit(px, py, pw, ph)) return true
    }
    return false
  }

  checkWraithHit(
    px: number,
    py: number,
    pw: number,
    ph: number,
  ): 'touch' | null {
    for (const w of this.wraiths) {
      if (!w.active) continue
      const r = w.getRect()
      if (
        px + pw > r.x &&
        px < r.x + r.w &&
        py + ph > r.y &&
        py < r.y + r.h
      )
        return 'touch'
    }
    for (const w of this.wraiths) {
      if (!w.active) continue
      for (const c of w.childWraiths) {
        const r = { x: c.x - 8, y: c.y - 8, w: 16, h: 16 }
        if (
          px + pw > r.x &&
          px < r.x + r.w &&
          py + ph > r.y &&
          py < r.y + r.h
        )
          return 'touch'
      }
    }
    return null
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    pW: number,
    pH: number,
  ): void {
    this.wall1.open = (this.patternGrids[0]?.solved ?? false) || (this.gates.find(g => g.id === 1)?.open ?? false)
    this.wall2.open = this.evidenceCollected
    this.wall3.open = (this.patternGrids[1]?.solved ?? false) || (this.gates.find(g => g.id === 3)?.open ?? false)

    this.time += dt
    this.weaponCrate.update(dt)

    const pcx = playerX + pW / 2
    const pcy = playerY + pH / 2

    for (const n of this.npcs) n.update(dt)
    for (const d of this.drones) {
      if (!d.active) continue
      d.update(dt)
    }
    for (const c of this.cameras) c.update(dt)
    for (const e of this.enforcers) {
      if (!e.active) continue
      e.update(dt, pcx, playerY + pH / 2)
    }
    for (const w of this.wraiths) {
      if (!w.active) continue
      w.update(dt, pcx, pcy)
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!
      p.update(dt)
      if (!p.active) this.projectiles.splice(i, 1)
    }
  }

  private renderMarketLayer(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const GY = this.groundY
    const W = CONFIG.CANVAS_WIDTH
    const stallNames = [
      'DATA 4 SALE',
      'PIRATE AI',
      'CHIP SHOP',
      'NET GHOST',
      'VOID TECH',
      'KIRAN CO',
      'RELAY HUB',
      'CIPHER MART',
    ]
    const awningCols = ['#e040fb33', '#ff910033', '#00e5ff33', '#ff444433']

    for (let wx = 0; wx < LEVEL3_WORLD_WIDTH; wx += 280) {
      const sx = wx - cameraX
      if (sx < -120 || sx > W + 120) continue
      const i = Math.floor(wx / 280) % stallNames.length
      ctx.save()
      ctx.fillStyle = '#1a1428'
      ctx.fillRect(sx, GY - 80, 60, 80)
      ctx.fillStyle = awningCols[i % awningCols.length]!
      ctx.fillRect(sx - 5, GY - 92, 70, 12)
      ctx.fillStyle = '#2a2038'
      ctx.fillRect(sx, GY - 40, 60, 8)
      ctx.fillStyle = '#e8e8f0'
      ctx.font = '5px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stallNames[i]!, sx + 30, GY - 98)
      if (i % 2 === 0) {
        ctx.fillStyle = '#0a0610'
        ctx.fillRect(sx + 26, GY - 72, 8, 28)
      }
      ctx.textAlign = 'left'
      ctx.restore()
    }

    for (let i = 0; i < 32; i++) {
      const wx = i * 300 + 150
      const sx = wx - cameraX
      if (sx < -10 || sx > W + 10) continue
      const ly = GY - 180 - (i % 5) * 12
      ctx.save()
      ctx.fillStyle = '#ffcc6644'
      ctx.shadowColor = '#ff9100'
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(sx, ly, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    for (const cx of this.crowdXs) {
      const sx = cx - cameraX
      if (sx < -20 || sx > W + 20) continue
      ctx.fillStyle = '#0a0614'
      ctx.fillRect(sx, GY - 28, 8, 28)
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const r = (n: number) => Math.floor(Math.sin(n * 12.989) * 10000) % 1000
    for (let pi = 0; pi < this.platforms.length; pi++) {
      const p = this.platforms[pi]!
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue
      ctx.save()
      ctx.fillStyle = '#1a1428'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = ACCENT
      ctx.fillRect(sx, p.y, p.w, 4)
      for (let k = 0; k < 3; k++) {
        const rx = sx + 10 + (r(pi * 10 + k * 3) % Math.max(8, p.w - 24))
        ctx.fillStyle = '#5c403344'
        ctx.fillRect(rx, p.y + 4, 6, 4)
      }
      ctx.restore()
    }
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
      ctx.fillStyle = '#ffffff'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillText(g.label, sx + 2, g.y + g.h / 2)
      ctx.restore()
    }
  }

  private renderEvidence(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (this.evidenceCollected) return
    const sx = this.evidenceX - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return
    ctx.save()
    ctx.fillStyle = '#1a1030'
    ctx.strokeStyle = ACCENT
    ctx.lineWidth = 2
    ctx.fillRect(sx - 24, this.evidencePedestalY - 32, 48, 32)
    ctx.strokeRect(sx - 24 + 0.5, this.evidencePedestalY - 32.5, 47, 31)
    ctx.fillStyle = ACCENT
    ctx.font = '6px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('EVIDENCE', sx, this.evidencePedestalY - 40)
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private renderShops(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const GY = this.groundY
    for (const tx of this.shopTerminalXs) {
      const sx = tx - cameraX
      if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) continue
      ctx.save()
      ctx.fillStyle = '#0a0614'
      ctx.fillRect(sx - 20, GY - 70, 40, 50)
      ctx.strokeStyle = '#00e5ff'
      ctx.strokeRect(sx - 20.5, GY - 70.5, 41, 51)
      ctx.fillStyle = '#00e5ff'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('UPGRADE', sx, GY - 78)
      ctx.textAlign = 'left'
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

  private renderInlineBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#0a0612'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#0c0a10'
    ctx.fillRect(0, GY, W, H - GY)
    ctx.strokeStyle = ACCENT
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    const off = (cameraX * 0.9) % 64
    for (let gx = -off; gx < W + 64; gx += 64) {
      ctx.moveTo(gx, GY)
      ctx.lineTo(gx, H)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  renderProjectiles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.projectiles) p.render(ctx, cameraX)
  }

  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    playerCenterX?: number,
  ): void {
    if (!this.skipInlineBackground) this.renderInlineBackground(ctx, cameraX)
    else {
      ctx.save()
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#0c0a10'
      ctx.fillRect(0, this.groundY, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - this.groundY)
      ctx.restore()
    }
    this.renderMarketLayer(ctx, cameraX)
    this.renderPlatforms(ctx, cameraX)
    for (const c of this.cameras) c.render(ctx, cameraX)
    for (const d of this.drones) d.render(ctx, cameraX)
    for (const e of this.enforcers) e.render(ctx, cameraX)
    for (const w of this.wraiths) w.render(ctx, cameraX)
    for (const n of this.npcs) n.render(ctx, cameraX, playerCenterX)
    this.weaponCrate.render(ctx, cameraX)
    this.renderEvidence(ctx, cameraX)
    this.renderShops(ctx, cameraX)
    this.renderGates(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX)
    this.renderExit(ctx, cameraX)
  }
}
