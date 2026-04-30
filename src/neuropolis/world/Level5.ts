import { CONFIG } from '../constants/config'
import { Drone } from '../entities/Drone'
import { OldCamera } from '../entities/OldCamera'
import { Projectile } from '../entities/Projectile'
import { NPC, type NPCData } from '../entities/NPC'
import { ShieldBot } from '../entities/ShieldBot'
import { MirrorBot } from '../entities/MirrorBot'
import { PhantomNode } from '../entities/PhantomNode'
import { WeaponCrate } from '../entities/WeaponCrate'
import {
  buildMirrorWallSegments,
  createMirrorPuzzle,
  getNearMirror,
  refreshMirrorPuzzleBeam,
  renderMirrorPuzzle,
  rotateMirrorPanel,
  type MirrorPuzzle,
} from '../systems/MirrorRedirect'
import type { Platform } from './Level1'
import type { Checkpoint, TerminalParticle } from './Level2'

export const LEVEL5_WORLD_WIDTH = 9600
const LEVEL_END_X = 9400
const ACCENT = '#e2e8f0'

export interface L5Gate {
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
  mechanic?: 'qte' | 'mirror'
}

export interface L5SectionTrigger {
  key: string
  x: number
  fired: boolean
  dialogue: {
    speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
    text: string
    expression?: string
  }[]
}

export class Level5 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL5_WORLD_WIDTH

  platforms: Platform[] = []
  gates: L5Gate[] = []
  checkpoints: Checkpoint[] = []
  npcs: NPC[] = []
  drones: Drone[] = []
  cameras: OldCamera[] = []
  shields: ShieldBot[] = []
  mirrors: MirrorBot[] = []
  phantoms: PhantomNode[] = []
  projectiles: Projectile[] = []
  weaponCrate: WeaponCrate
  puzzles: MirrorPuzzle[] = []

  sectionTriggers: L5SectionTrigger[] = []
  levelComplete = false
  exitPortal = { open: false }

  evidenceCollected = false
  readonly evidenceX = 5500
  readonly evidencePedestalY: number

  private time = 0

  constructor(groundY: number) {
    this.groundY = groundY
    const GY = groundY
    this.evidencePedestalY = GY - 40

    this.weaponCrate = new WeaponCrate({
      x: 3400,
      y: GY - 24,
      weaponSlot: 4,
      weaponName: 'MIRROR',
      color: ACCENT,
      collected: false,
    })

    this.puzzles = [
      createMirrorPuzzle(
        'm1',
        2320,
        GY - 198,
        2920,
        GY - 212,
        [
          { x: 2460, y: GY - 158, angleSteps: 1 },
          { x: 2580, y: GY - 172, angleSteps: 0 },
          { x: 2700, y: GY - 152, angleSteps: 3 },
        ],
        -0.1,
      ),
      createMirrorPuzzle(
        'm2',
        6280,
        GY - 200,
        6980,
        GY - 188,
        [
          { x: 6420, y: GY - 168, angleSteps: 2 },
          { x: 6540, y: GY - 182, angleSteps: 1 },
          { x: 6660, y: GY - 160, angleSteps: 0 },
          { x: 6780, y: GY - 176, angleSteps: 4 },
        ],
        0.06,
      ),
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
      { x: 260, y: GY - 110, w: 200, h: 14 },
      { x: 520, y: GY - 170, w: 140, h: 14 },
      { x: 780, y: GY - 120, w: 200, h: 14 },
      { x: 1040, y: GY - 180, w: 160, h: 14 },
      { x: 1320, y: GY - 130, w: 220, h: 14 },
      { x: 1620, y: GY - 190, w: 140, h: 14 },
      { x: 1920, y: GY - 125, w: 200, h: 14 },
      { x: 2220, y: GY - 185, w: 160, h: 14 },
      { x: 2520, y: GY - 140, w: 240, h: 14 },
      { x: 2880, y: GY - 200, w: 160, h: 14 },
      { x: 3180, y: GY - 150, w: 200, h: 14 },
      { x: 3520, y: GY - 175, w: 180, h: 14 },
      { x: 3820, y: GY - 125, w: 220, h: 14 },
      { x: 4180, y: GY - 195, w: 160, h: 14 },
      { x: 4520, y: GY - 135, w: 200, h: 14 },
      { x: 4880, y: GY - 185, w: 160, h: 14 },
      { x: 5220, y: GY - 145, w: 220, h: 14 },
      { x: 5580, y: GY - 200, w: 160, h: 14 },
      { x: 5920, y: GY - 155, w: 200, h: 14 },
      { x: 6280, y: GY - 190, w: 180, h: 14 },
      { x: 6680, y: GY - 130, w: 240, h: 14 },
      { x: 7080, y: GY - 180, w: 180, h: 14 },
      { x: 7480, y: GY - 140, w: 220, h: 14 },
      { x: 7880, y: GY - 195, w: 200, h: 14 },
    ]
  }

  private buildGates(): void {
    const GY = this.groundY
    this.gates = [
      {
        id: 1,
        x: 1800,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'LAB A',
        color: ACCENT,
        terminalX: 1745,
        hacked: false,
        hackable: false,
        mechanic: 'qte',
      },
      {
        id: 2,
        x: 4000,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'MIRROR I',
        color: ACCENT,
        terminalX: 3945,
        hacked: false,
        hackable: false,
        mechanic: 'mirror',
      },
      {
        id: 3,
        x: 7400,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'MIRROR II',
        color: ACCENT,
        terminalX: 7345,
        hacked: false,
        hackable: false,
        mechanic: 'mirror',
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
    this.checkpoints = [mk(1900), mk(4100), mk(7500)]
  }

  private buildEnemies(): void {
    const GY = this.groundY
    const gyBot = GY - 48
    this.shields = [
      new ShieldBot(900, gyBot, 700, 1100),
      new ShieldBot(3200, gyBot, 3000, 3400),
      new ShieldBot(4800, gyBot, 4500, 5100),
      new ShieldBot(6200, gyBot, 5900, 6500),
      new ShieldBot(8200, gyBot, 7800, 8600),
      new ShieldBot(9000, gyBot, 8700, 9300),
    ]
    this.mirrors = [
      new MirrorBot(1400, GY, 1100, 1700),
      new MirrorBot(3600, GY, 3300, 4000),
      new MirrorBot(5400, GY, 5100, 5700),
      new MirrorBot(7200, GY, 6900, 7500),
    ]
    const px = [1100, 1800, 2500, 4100, 5000, 5800, 6600, 8500]
    this.phantoms = px.map(x => new PhantomNode(x, GY - 120))
    this.drones = [
      new Drone(600, GY - 200, 80, 90, 70),
      new Drone(2000, GY - 210, 90, 85, 71),
      new Drone(3500, GY - 200, 85, 95, 72),
      new Drone(5200, GY - 220, 95, 90, 73),
      new Drone(7000, GY - 205, 88, 92, 74),
      new Drone(7800, GY - 215, 92, 88, 75),
      new Drone(8600, GY - 200, 90, 90, 76),
      new Drone(9200, GY - 210, 85, 95, 77),
    ]
  }

  private buildCameras(): void {
    const GY = this.groundY
    const xs = [420, 980, 1680, 2380, 3080, 3980, 4680, 5380]
    this.cameras = xs.map(x => new OldCamera(x, GY - 175))
  }

  private buildNPCs(): void {
    const GY = this.groundY
    const r1: NPCData = {
      id: 'L5_RES',
      x: 300,
      y: GY,
      name: 'RESEARCHER',
      color: '#1a1e28',
      accentColor: ACCENT,
      dialogue: [
        {
          speaker: 'NPC',
          text: 'The prediction models here — they only predict what already happened.',
        },
        {
          speaker: 'NPC',
          text: 'They cannot predict change. They were not trained to see it.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran: NPCData = {
      id: 'L5_KIRAN',
      x: 5200,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: '#e040fb',
      dialogue: [
        { speaker: 'KIRAN', text: 'AX. The Phantom Nodes. They are in the blind spots.' },
        { speaker: 'KIRAN', text: 'Shoot into the corners. Force them to show themselves.' },
      ],
      talked: false,
      isKiran: false,
    }
    const reyes: NPCData = {
      id: 'L5_REYES',
      x: 9200,
      y: GY,
      name: 'DR_REYES',
      color: '#182028',
      accentColor: '#00b4d8',
      dialogue: [
        {
          speaker: 'NPC',
          text: 'The mirror metaphor is not an accident. They built it deliberately.',
        },
        {
          speaker: 'NPC',
          text: 'An AI that only reflects the past keeps power structures permanent.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    this.npcs = [new NPC(r1), new NPC(kiran), new NPC(reyes)]
  }

  private buildSectionTriggers(): void {
    this.sectionTriggers = [
      {
        key: 'l5_s180',
        x: 180,
        fired: false,
        dialogue: [{ speaker: 'NOVA', text: 'Mirror Lab. Reflection is the training objective.' }],
      },
      {
        key: 'l5_s1800',
        x: 1800,
        fired: false,
        dialogue: [{ speaker: 'NOVA', text: 'Security lock. Same terminal rhythm as the market.' }],
      },
      {
        key: 'l5_s4500',
        x: 4500,
        fired: false,
        dialogue: [{ speaker: 'AX', text: 'Lasers and glass. Of course they would build it this way.' }],
      },
      {
        key: 'l5_s6200',
        x: 6200,
        fired: false,
        dialogue: [{ speaker: 'NOVA', text: 'Second mirror room. Redirect again — different geometry.' }],
      },
    ]
  }

  peekSectionTrigger(prevX: number, px: number): L5SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (s.fired) continue
      if (prevX < s.x && px >= s.x) return s
    }
    return null
  }

  getHackableGate(playerCenterX: number): L5Gate | null {
    for (const g of this.gates) g.hackable = false
    let found: L5Gate | null = null
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
    this.refreshExit()
  }

  syncMirrorGates(): void {
    if (this.puzzles[0]?.solved) {
      const g = this.gates.find(x => x.id === 2)
      if (g && !g.open) {
        g.open = true
        g.hacked = true
      }
    }
    if (this.puzzles[1]?.solved) {
      const g = this.gates.find(x => x.id === 3)
      if (g && !g.open) {
        g.open = true
        g.hacked = true
      }
    }
    this.refreshExit()
  }

  private refreshExit(): void {
    if (this.gates.every(x => x.open)) this.exitPortal.open = true
  }

  tryFlipNearMirror(pcx: number, pcy: number): boolean {
    let flipped = false
    for (const pz of this.puzzles) {
      if (pz.solved) continue
      const idx = getNearMirror(pz, pcx, pcy)
      if (idx >= 0) {
        rotateMirrorPanel(pz, idx)
        flipped = true
      }
    }
    if (flipped) {
      this.refreshMirrorBeams(pcx, pcy)
      this.syncMirrorGates()
    }
    return flipped
  }

  private refreshMirrorBeams(pcx: number, pcy: number): void {
    const mirrorWalls = buildMirrorWallSegments(
      this.groundY,
      0,
      LEVEL5_WORLD_WIDTH,
      this.platforms,
      100,
    )
    for (const pz of this.puzzles) {
      refreshMirrorPuzzleBeam(pz, mirrorWalls)
      getNearMirror(pz, pcx, pcy)
    }
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
  ): L5Gate | null {
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

  update(
    dt: number,
    playerX: number,
    playerY: number,
    pW: number,
    pH: number,
  ): void {
    this.time += dt
    this.weaponCrate.update(dt)

    const pcx = playerX + pW / 2
    const pcy = playerY + pH / 2

    this.refreshMirrorBeams(pcx, pcy)
    this.syncMirrorGates()

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
    for (const s of this.shields)
      s.update(dt, playerX, playerY, pW, pH)
    for (const m of this.mirrors) m.update(dt, playerX, playerY)
    for (const ph of this.phantoms) ph.update(dt, pcx, pcy)

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!
      p.update(dt)
      if (!p.active) this.projectiles.splice(i, 1)
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    const cx = W / 2
    const cy = H / 2
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#050508'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = '#1a1e28'
    ctx.lineWidth = 0.5
    const vanish = [
      [0, 0],
      [W, 0],
      [0, H],
      [W, H],
      [0, cy],
      [W, cy],
      [cx, 0],
      [cx, H],
    ] as const
    for (const [vx, vy] of vanish) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(vx, vy)
      ctx.stroke()
    }

    for (let wx = 0; wx < LEVEL5_WORLD_WIDTH; wx += 620) {
      const sx = wx - cameraX * 0.12
      if (sx < -100 || sx > W + 100) continue
      ctx.strokeStyle = '#e2e8f033'
      ctx.shadowColor = '#e2e8f0'
      ctx.shadowBlur = 8
      ctx.strokeRect(sx, GY - 260, 80, 240)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fillRect(sx + 2, GY - 258, 76, 236)
      ctx.fillStyle = 'rgba(30,40,60,0.25)'
      ctx.fillRect(sx + 10, GY - 220, 60, 80)
    }

    for (let wx = 0; wx < LEVEL5_WORLD_WIDTH; wx += 340) {
      const sx = wx - cameraX * 0.25
      if (sx < -200 || sx > W + 200) continue
      ctx.fillStyle = '#0e1018'
      ctx.fillRect(sx, GY - 90, 160, 22)
      ctx.strokeStyle = '#1a1e28'
      ctx.strokeRect(sx + 0.5, GY - 90.5, 159, 21)
      ctx.fillStyle = '#1a1e28'
      ctx.fillRect(sx + 40, GY - 130, 24, 18)
    }

    for (let wx = 0; wx < LEVEL5_WORLD_WIDTH; wx += 260) {
      const sx = wx - cameraX * 0.5
      if (sx < -60 || sx > W + 60) continue
      const ang = 0.26 + (wx % 5) * 0.12
      ctx.save()
      ctx.translate(sx, GY - 16)
      ctx.rotate(ang)
      ctx.fillStyle = 'rgba(220,228,240,0.15)'
      ctx.strokeStyle = '#e2e8f033'
      ctx.fillRect(-12, -8, 28, 16)
      ctx.strokeRect(-12.5, -8.5, 29, 17)
      ctx.restore()
    }

    ctx.fillStyle = '#0a0a12'
    ctx.fillRect(0, GY, W, H - GY)
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.translate(0, GY * 2)
    ctx.scale(1, -1)
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > W + 20) continue
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(sx, p.y, p.w, 2)
    }
    ctx.restore()
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(0, GY, W, 2)
  }

  private renderGlassPlatforms(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue
      ctx.save()
      ctx.fillStyle = 'rgba(20,24,40,0.82)'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = ACCENT
      ctx.fillRect(sx, p.y, p.w, 3)
      if (p.w > 160) {
        ctx.strokeStyle = 'rgba(226,232,240,0.25)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(sx + p.w * 0.35, p.y + 4)
        ctx.lineTo(sx + p.w * 0.55, p.y + p.h - 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  private renderEvidence(ctx: CanvasRenderingContext2D, cameraX: number): void {
    if (this.evidenceCollected) return
    const sx = this.evidenceX - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return
    ctx.save()
    ctx.fillStyle = '#0a0c14'
    ctx.fillRect(sx - 24, this.evidencePedestalY - 32, 48, 32)
    ctx.strokeStyle = ACCENT
    ctx.strokeRect(sx - 24.5, this.evidencePedestalY - 32.5, 49, 33)
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
      ctx.fillStyle = g.color + '33'
      ctx.strokeStyle = g.color
      ctx.lineWidth = 2
      ctx.fillRect(sx, g.y, g.w, g.h)
      ctx.strokeRect(sx + 0.5, g.y + 0.5, g.w - 1, g.h - 1)
      ctx.fillStyle = '#e8eef8'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillText(g.label, sx + 2, g.y + g.h / 2)
      ctx.restore()

      if (g.mechanic === 'qte') {
        const tx = g.terminalX - cameraX
        if (tx < -40 || tx > CONFIG.CANVAS_WIDTH + 40) continue
        ctx.save()
        ctx.fillStyle = '#060810'
        ctx.fillRect(tx - 9, GY - 56, 18, 36)
        ctx.strokeStyle = g.hackable ? '#00ff88' : g.color
        ctx.strokeRect(tx - 9, GY - 56, 18, 36)
        ctx.font = '8px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = g.hackable ? '#00ff88' : g.color
        ctx.fillText(g.hacked ? '✓' : '⚿', tx, GY - 24)
        if (g.hackable) {
          ctx.font = '6px Orbitron, sans-serif'
          ctx.fillStyle = '#fff'
          ctx.globalAlpha = 0.75
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
      ctx.beginPath()
      ctx.arc(ex, GY - 100, 44, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = open ? 'rgba(0,255,136,0.12)' : 'rgba(30,30,40,0.35)'
      ctx.fill()
      ctx.restore()
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.renderBackground(ctx, cameraX)
    this.renderGlassPlatforms(ctx, cameraX)
    for (const pz of this.puzzles) renderMirrorPuzzle(ctx, pz, cameraX, this.time)
    for (const c of this.cameras) {
      if (!(c as OldCamera & { activated?: boolean }).activated) continue
      c.render(ctx, cameraX)
    }
    for (const d of this.drones) {
      if (!(d as Drone & { activated?: boolean }).activated) continue
      d.render(ctx, cameraX)
    }
    for (const s of this.shields) s.render(ctx, cameraX)
    for (const m of this.mirrors) m.render(ctx, cameraX)
    for (const ph of this.phantoms) ph.render(ctx, cameraX)
    for (const n of this.npcs) n.render(ctx, cameraX)
    this.renderEvidence(ctx, cameraX)
    this.weaponCrate.render(ctx, cameraX)
    this.renderGates(ctx, cameraX)
    for (const p of this.projectiles) p.render(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX)
    this.renderExit(ctx, cameraX)
  }
}
