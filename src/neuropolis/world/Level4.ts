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
  private playerX = 0

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
      createBalanceScale(0, 1150, GY, 120, 1, [
        { weight: 40, label: '40', spawnX: 930 },
        { weight: 80, label: '80', spawnX: 990 },
        { weight: 40, label: '40', spawnX: 1370 },
        { weight: 80, label: '80', spawnX: 1430 },
      ]),
      createBalanceScale(1, 6800, GY, 160, 3, [
        { weight: 80, label: '80', spawnX: 6520 },
        { weight: 80, label: '80', spawnX: 6580 },
        { weight: 40, label: '40', spawnX: 7040 },
        { weight: 40, label: '40', spawnX: 7100 },
        { weight: 80, label: '80', spawnX: 6640 },
        { weight: 40, label: '40', spawnX: 7000 },
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
    const target2 = this.balanceScales[1]?.target ?? 160
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
      // Scale room 1 — before Sector A gate (gate 1 at x=2000)
      {
        key: 'L4_SCALE1_TUT',
        x: 920,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Balance scale. Those dark blocks are Data Blocks — each label shows its weight.',
          },
          {
            speaker: 'NOVA',
            text: 'Press E near a block to carry it, or Z to shoot and slide it onto the pans — the small platforms on each arm.',
          },
          {
            speaker: 'NOVA',
            text: 'Match the LEFT and RIGHT pan totals to the target shown above — 120 on each side here.',
          },
          { speaker: 'AX',   text: 'Equal weight on both sides. Like balanced training data.' },
          { speaker: 'NOVA', text: 'Exactly. Unequal data in, unequal decisions out. Balance it.' },
        ],
      },
      // Approaching Sector A gate after the first scale
      {
        key: 'L4_SECTORA_TUT',
        x: 1780,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'The sector gate opens only when the scale reads equal — both pans at the target weight.',
          },
          {
            speaker: 'NOVA',
            text: 'NeuroCorps trained their models on imbalance until imbalance looked normal.',
          },
          { speaker: 'AX',  text: 'So they never balanced their scales.' },
          { speaker: 'NOVA', text: 'Never. And the algorithm learned that skew was the default.' },
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
      // Fix 10 — Scale Room 2 entry (just past gate 2 at x=5200)
      {
        key: 'L4_SCALE2_TUT',
        x: 5250,
        fired: false,
        dialogue: [
          { speaker: 'NOVA', text: 'Second scale. Heavier blocks — larger weight values.' },
          {
            speaker: 'NOVA',
            text: `Same mechanic. Balance both pans to ${target2} each.`,
          },
          {
            speaker: 'NOVA',
            text: 'Solve this and the Archive unlocks. The evidence is right behind it.',
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
      // Fix 8 System B — Archive gate approach dialogue (200px before gate 3 at x=7200)
      {
        key: 'L4_ARCHIVE_HINT',
        x: 7000,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'The Archive gate. It holds the original District 1 income dataset — before it was manipulated.',
          },
          {
            speaker: 'NOVA',
            text: 'But it requires both balance scales to be solved first. Complete Scale Room 2 to unlock the Archive.',
          },
          {
            speaker: 'AX',
            text: "They hid the evidence behind their own test. That's almost elegant.",
          },
          {
            speaker: 'NOVA',
            text: 'Almost. Solve the second scale and the Archive opens automatically.',
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

  get scale1(): BalanceScale { return this.balanceScales[0]! }
  get scale2(): BalanceScale { return this.balanceScales[1]! }
  get scaleRoom2Gate(): Gate { return this.gates.find(g => g.id === 2)! }

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
    // Gate tops act as one-way platforms
    for (const g of this.gates) {
      if (g.open) continue
      if (
        px + pw > g.x &&
        px < g.x + g.w &&
        vy >= 0 &&
        feet <= g.y + 12 &&
        feet >= g.y - 5
      ) {
        return g.y - ph
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
      // Shrink collision box 8px from top so standing on the gate top doesn't trigger pushback
      if (
        ax + aw > g.x &&
        ax < g.x + g.w + 16 &&
        ay + ah > g.y + 8 &&
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
    this.playerX = playerX + pW / 2
    this.weaponCrate.update(dt)

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

    // After physics: open sector gates linked to solved scales (same frame as trySolve)
    this.syncScaleGates()

    // Fix 10 Part A — Scale Room 2 gate opens when Scale 1 is tolerance-balanced
    const srg2 = this.scaleRoom2Gate
    if (srg2 && !srg2.open && this.scale1.isBalanced()) {
      srg2.open = true
      srg2.hacked = true
      this.refreshExitPortal()
    }

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

  private renderProximityHints(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const pcx = this.playerX

    // Fix 8 System A — Archive gate floating hint
    const archiveGate = this.gates.find(g => g.id === 3)
    if (archiveGate && !archiveGate.open &&
        Math.abs(pcx - (archiveGate.x + archiveGate.w / 2)) < 200) {
      const hx = archiveGate.x - cameraX + 20
      const hy = archiveGate.y - 40
      const alpha = 0.7 + 0.3 * Math.sin(this.time * 3)
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = 'rgba(0,0,0,0.8)'
      ctx.fillRect(hx - 80, hy - 16, 160, 32)
      ctx.lineWidth = 1
      ctx.strokeStyle = '#4a9eff'
      ctx.strokeRect(hx - 80 + 0.5, hy - 15.5, 159, 31)
      ctx.font = '9px Orbitron, sans-serif'
      ctx.fillStyle = '#00e5ff'
      ctx.textAlign = 'center'
      ctx.fillText('[E] ACCESS ARCHIVE', hx, hy + 4)
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
      ctx.restore()
    }

    // Fix 10 Part A — Scale Room 2 "SCALE 1 REQUIRED" hint (150px before gate 2)
    const g2 = this.gates.find(g => g.id === 2)
    if (g2 && !g2.open && !this.scale1.isBalanced()) {
      const gsx = g2.x - cameraX
      if (gsx > -300 && gsx < CONFIG.CANVAS_WIDTH + 300 && pcx > g2.x - 150) {
        const hx = g2.x - cameraX + 20
        const hy = g2.y - 40
        const alpha = 0.7 + 0.3 * Math.sin(this.time * 3)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = 'rgba(0,0,0,0.8)'
        ctx.fillRect(hx - 80, hy - 16, 160, 32)
        ctx.lineWidth = 1
        ctx.strokeStyle = '#ff9100'
        ctx.strokeRect(hx - 80 + 0.5, hy - 15.5, 159, 31)
        ctx.font = '9px Orbitron, sans-serif'
        ctx.fillStyle = '#ff9100'
        ctx.textAlign = 'center'
        ctx.fillText('SCALE 1 REQUIRED', hx, hy + 4)
        ctx.textAlign = 'left'
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }
  }

  private renderBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    const time = this.time

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1

    // LAYER 1 — Deep corporate sky
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0,    '#020408')
    sky.addColorStop(0.4,  '#080c18')
    sky.addColorStop(0.85, '#0c1020')
    sky.addColorStop(1,    '#101828')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    // LAYER 2 — Far background towers (slow parallax 0.05)
    const farTowers = [180,520,860,1200,1540,1880,2220,2560,2900,3240]
    const farWidths = [120,80,140,100,120,90,130,110,80,140]
    const farHeights= [320,420,280,460,350,400,310,450,330,410]
    for (let i = 0; i < farTowers.length; i++) {
      const tx = farTowers[i]! - cameraX * 0.05
      if (tx < -200 || tx > W + 200) continue
      const tw = farWidths[i]!
      const th = farHeights[i]!
      ctx.fillStyle = '#030508'
      ctx.fillRect(tx, 0, tw, th)
      // Window grid on towers
      for (let wy = 20; wy < th - 20; wy += 24) {
        for (let wx = 8; wx < tw - 8; wx += 18) {
          const on = Math.sin(time * 0.3 + i * 7 + wy * 0.1 + wx * 0.2) > 0.3
          ctx.fillStyle = on ? 'rgba(0,100,160,0.15)' : '#020406'
          ctx.fillRect(tx + wx, wy, 8, 12)
        }
      }
    }

    // LAYER 3 — Mid towers (parallax 0.2)
    const midTowers = [300,900,1500,2100,2700,3300,3900,4500,5100,5700,6300,6900,7500,8100]
    const midWidths = [100,120,90,130,100,110,90,120,100,130,90,110,100,120]
    const midHeights= [280,360,240,400,300,340,260,380,280,360,240,320,280,360]
    for (let i = 0; i < midTowers.length; i++) {
      const tx = midTowers[i]! - cameraX * 0.2
      if (tx < -150 || tx > W + 150) continue
      const tw = midWidths[i]!
      const th = midHeights[i]!
      ctx.fillStyle = '#050810'
      ctx.fillRect(tx, 0, tw, th)
      ctx.strokeStyle = 'rgba(0,140,200,0.08)'
      ctx.lineWidth = 1
      ctx.strokeRect(tx + 0.5, 0.5, tw - 1, th - 1)
      // Vertical light strip on some towers
      if (i % 3 === 0) {
        const pulse = 0.4 + Math.sin(time * 0.8 + i) * 0.2
        ctx.fillStyle = `rgba(0,180,255,${pulse * 0.12})`
        ctx.fillRect(tx + tw - 6, 0, 4, th)
      }
    }

    // LAYER 4 — Subtle grid (very faint)
    ctx.lineWidth = 0.5
    ctx.strokeStyle = 'rgba(0,150,220,0.03)'
    for (let y = 0; y < GY; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    const gOff = -(cameraX * 0.4) % 100
    for (let x = gOff - 100; x < W + 100; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GY); ctx.stroke()
    }

    // LAYER 5 — NeuroCorps logo watermarks in background
    const logoPositions = [400, 1200, 2000, 2800, 3600, 4400, 5200, 6000, 6800, 7600, 8400]
    ctx.font = 'bold 48px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    for (const lx of logoPositions) {
      const sx = lx - cameraX * 0.3
      if (sx < -100 || sx > W + 100) continue
      ctx.fillStyle = 'rgba(0,140,200,0.03)'
      ctx.fillText('N C', sx, GY * 0.4)
    }
    ctx.textAlign = 'left'

    // LAYER 6 — Scan line effect (slow moving)
    const scanY = (time * 40) % (GY + 20)
    ctx.fillStyle = 'rgba(0,180,255,0.025)'
    ctx.fillRect(0, scanY - 1, W, 3)

    // LAYER 7 — Ceiling duct (corporate facility)
    ctx.fillStyle = 'rgba(6,8,16,0.97)'
    ctx.fillRect(0, 0, W, 45)
    ctx.strokeStyle = 'rgba(0,180,255,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 45); ctx.lineTo(W, 45); ctx.stroke()
    // Duct vents
    const ventOff = -(cameraX * 0.9) % 200
    for (let vx = ventOff - 200; vx < W + 200; vx += 200) {
      ctx.fillStyle = 'rgba(0,140,200,0.12)'
      ctx.fillRect(vx, 30, 40, 15)
      ctx.strokeStyle = 'rgba(0,180,255,0.15)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(vx + 0.5, 30.5, 39, 14)
    }

    // LAYER 8 — Hazard walkway stripe
    ctx.fillStyle = '#0f1520'
    ctx.fillRect(0, GY - 16, W, 16)
    ctx.strokeStyle = 'rgba(0,180,216,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(0, GY - 16); ctx.lineTo(W, GY - 16); ctx.stroke()
    // Hazard diamonds
    const dOff = -(cameraX * 0.9) % 80
    for (let dx = dOff - 80; dx < W + 80; dx += 80) {
      ctx.fillStyle = 'rgba(255,50,80,0.35)'
      ctx.beginPath()
      ctx.moveTo(dx + 6, GY - 16)
      ctx.lineTo(dx + 12, GY - 8)
      ctx.lineTo(dx + 6, GY)
      ctx.lineTo(dx, GY - 8)
      ctx.closePath()
      ctx.fill()
    }

    // LAYER 9 — Floor pit
    ctx.fillStyle = '#04060c'
    ctx.fillRect(0, GY, W, H - GY)
    ctx.lineWidth = 0.5
    ctx.strokeStyle = 'rgba(0,140,200,0.05)'
    for (let fy = GY + 24; fy < H; fy += 24) {
      ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke()
    }

    // Vignette
    const vig = ctx.createRadialGradient(W/2, H/2, 100, W/2, H/2, 600)
    vig.addColorStop(0, 'rgba(0,0,0,0)')
    vig.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = vig
    ctx.fillRect(0, 0, W, H)

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(sx + 2, p.y + 6, p.w - 4, p.h + 4)
      ctx.fillStyle = '#1c2538'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = ACCENT
      ctx.fillRect(sx, p.y, p.w, 4)
      for (const cx of [sx + 4, sx + p.w - 4]) {
        ctx.fillStyle = '#4a5a70'
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
    ctx.font = 'bold 10px Orbitron, sans-serif'
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
      ctx.fillStyle = '#e8f0ff'
      ctx.imageSmoothingEnabled = false
      ctx.font = 'bold 11px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(sx + g.w / 2, g.y + g.h / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(g.label, 0, 0)
      ctx.restore()
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
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
    this.renderProximityHints(ctx, cameraX)
    for (const p of this.projectiles) p.render(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX)
    this.renderExit(ctx, cameraX)
  }
}
