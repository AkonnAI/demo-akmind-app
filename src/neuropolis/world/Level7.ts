import { CONFIG } from '../constants/config'
import { Drone } from '../entities/Drone'
import { OldCamera } from '../entities/OldCamera'
import { Projectile } from '../entities/Projectile'
import { NPC, type NPCData } from '../entities/NPC'
import { WeaponCrate } from '../entities/WeaponCrate'
import { NeuralGuard } from '../entities/NeuralGuard'
import { DataPhantom } from '../entities/DataPhantom'
import type { Platform } from './Level1'
import type { Checkpoint, TerminalParticle } from './Level2'

export const LEVEL7_WORLD_WIDTH = 9600
const LEVEL_END_X = 9400
const ACCENT = '#7c3dff'
const SHIELD_HALF = (60 * Math.PI) / 180 / 2

export interface NexusModuleCore {
  id: 1 | 2 | 3
  x: number
  y: number
  hp: number
  maxHp: number
  phase: 'idle' | 'active' | 'charging' | 'firing' | 'recovery' | 'destroyed'
  phaseTimer: number
  shieldAngle: number
  shieldDisabledT: number
  gravityPullT: number
  destroyedTimer: number
  beamSweep: number
  beamBaseAngle: number
  orbAcc: number
}

export interface L7Gate {
  id: number
  x: number
  y: number
  h: number
  w: number
  open: boolean
  label: string
  color: string
  mechanic: 'qte' | 'cores'
  coreIds?: (1 | 2 | 3)[]
}

export interface L7SectionTrigger {
  key: string
  x: number
  fired: boolean
  dialogue: {
    speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
    text: string
    expression?: string
  }[]
}

export class Level7 {
  readonly groundY: number
  readonly levelEnd = LEVEL_END_X
  readonly worldWidth = LEVEL7_WORLD_WIDTH

  platforms: Platform[] = []
  gates: L7Gate[] = []
  checkpoints: Checkpoint[] = []
  npcs: NPC[] = []
  drones: Drone[] = []
  cameras: OldCamera[] = []
  guards: NeuralGuard[] = []
  phantoms: DataPhantom[] = []
  projectiles: Projectile[] = []
  weaponCrate: WeaponCrate
  moduleCores: NexusModuleCore[] = []

  evidenceCollected = false
  readonly evidenceX = 6600
  readonly evidencePedestalY: number

  sectionTriggers: L7SectionTrigger[] = []
  levelComplete = false
  exitPortal = { open: false }

  private time = 0
  /** Vertical scroll offsets for data-stream columns (parallax layer 3). */
  private dataStreamY: number[] = []

  constructor(groundY: number) {
    this.groundY = groundY
    const GY = groundY
    this.evidencePedestalY = GY - 40

    this.weaponCrate = new WeaponCrate({
      x: 2800,
      y: GY - 24,
      weaponSlot: 6,
      weaponName: 'PHASE',
      color: 'rgba(200,180,255,0.9)',
      collected: false,
    })

    this.moduleCores = [
      {
        id: 1,
        x: 3200,
        y: GY - 160,
        hp: 8,
        maxHp: 8,
        phase: 'idle',
        phaseTimer: 1.2,
        shieldAngle: 0,
        shieldDisabledT: 0,
        gravityPullT: 0,
        destroyedTimer: 0,
        beamSweep: 0,
        beamBaseAngle: 0,
        orbAcc: 0,
      },
      {
        id: 2,
        x: 4200,
        y: GY - 200,
        hp: 8,
        maxHp: 8,
        phase: 'idle',
        phaseTimer: 1.0,
        shieldAngle: 0.5,
        shieldDisabledT: 0,
        gravityPullT: 0,
        destroyedTimer: 0,
        beamSweep: 0,
        beamBaseAngle: 0,
        orbAcc: 0,
      },
      {
        id: 3,
        x: 5900,
        y: GY - 180,
        hp: 8,
        maxHp: 8,
        phase: 'idle',
        phaseTimer: 1.1,
        shieldAngle: 1,
        shieldDisabledT: 0,
        gravityPullT: 0,
        destroyedTimer: 0,
        beamSweep: 0,
        beamBaseAngle: 0,
        orbAcc: 0,
      },
    ]

    this.buildPlatforms()
    this.buildGates()
    this.buildCheckpoints()
    this.buildEnemies()
    this.buildCameras()
    this.buildNPCs()
    this.buildSectionTriggers()

    this.dataStreamY = Array.from({ length: 6 }, () => Math.random() * this.groundY)
  }

  private buildPlatforms(): void {
    const GY = this.groundY
    const P: Platform[] = [
      { x: 220, y: GY - 100, w: 180, h: 14 },
      { x: 480, y: GY - 160, w: 140, h: 14 },
      { x: 720, y: GY - 100, w: 180, h: 14 },
      { x: 1000, y: GY - 170, w: 140, h: 14 },
      { x: 1260, y: GY - 110, w: 200, h: 14 },
      { x: 1540, y: GY - 160, w: 140, h: 14 },
      { x: 1800, y: GY - 110, w: 180, h: 14 },
      { x: 2300, y: GY - 100, w: 200, h: 14 },
      { x: 2600, y: GY - 200, w: 120, h: 14 },
      { x: 2860, y: GY - 110, w: 180, h: 14 },
      { x: 3160, y: GY - 200, w: 140, h: 14 },
      { x: 3420, y: GY - 110, w: 200, h: 14 },
      { x: 3740, y: GY - 190, w: 120, h: 14 },
      { x: 4020, y: GY - 110, w: 200, h: 14 },
      { x: 4600, y: GY - 100, w: 200, h: 14 },
      { x: 4940, y: GY - 200, w: 120, h: 14 },
      { x: 5200, y: GY - 110, w: 180, h: 14 },
      { x: 5500, y: GY - 200, w: 140, h: 14 },
      { x: 5780, y: GY - 110, w: 200, h: 14 },
      { x: 6080, y: GY - 190, w: 140, h: 14 },
      { x: 6380, y: GY - 110, w: 200, h: 14 },
      { x: 7100, y: GY - 100, w: 220, h: 14 },
      { x: 7460, y: GY - 180, w: 160, h: 14 },
      { x: 7800, y: GY - 110, w: 200, h: 14 },
      { x: 8160, y: GY - 180, w: 160, h: 14 },
      { x: 8520, y: GY - 110, w: 200, h: 14 },
    ]
    this.platforms = P
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
        label: 'NEXUS A',
        color: ACCENT,
        mechanic: 'qte',
      },
      {
        id: 2,
        x: 4500,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'NEXUS B',
        color: ACCENT,
        mechanic: 'cores',
        coreIds: [1, 2],
      },
      {
        id: 3,
        x: 7000,
        y: GY - 220,
        h: 220,
        w: 24,
        open: false,
        label: 'NEXUS C',
        color: ACCENT,
        mechanic: 'cores',
        coreIds: [3],
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
    this.checkpoints = [mk(2300), mk(4600), mk(7100)]
  }

  private buildEnemies(): void {
    const GY = this.groundY
    const gx = (x: number, l: number, r: number) => new NeuralGuard(x, GY, l, r)
    this.guards = [
      gx(400, 200, 900),
      gx(900, 300, 1400),
      gx(1400, 800, 1800),
      gx(2000, 1600, 2200),
      gx(2500, 2200, 3000),
      gx(3000, 2400, 3400),
      gx(3400, 2800, 3800),
      gx(3600, 3200, 4000),
      gx(4000, 3600, 4400),
      gx(4400, 4000, 4600),
      gx(5000, 4600, 5400),
      gx(5400, 5000, 5800),
      gx(6200, 5800, 6600),
      gx(6800, 6400, 7200),
      gx(7600, 7200, 8000),
      gx(8200, 7800, 8600),
    ]
    const ph = (x: number, y: number, mn: number, mx: number) =>
      new DataPhantom(x, y, GY, mn, mx)
    this.phantoms = [
      ph(2500, GY - 140, 2200, 3400),
      ph(2900, GY - 200, 2400, 3600),
      ph(3300, GY - 120, 2800, 4000),
      ph(3700, GY - 180, 3000, 4200),
      ph(4800, GY - 150, 4400, 5200),
      ph(5200, GY - 190, 4800, 5600),
      ph(5600, GY - 130, 5200, 6000),
      ph(6000, GY - 170, 5600, 6400),
      ph(6400, GY - 160, 6000, 6800),
      ph(7200, GY - 140, 6800, 7800),
      ph(7800, GY - 180, 7400, 8200),
      ph(8400, GY - 150, 8000, 9000),
    ]
    this.drones = [
      new Drone(600, GY - 190, 400, 900, 80),
      new Drone(1200, GY - 200, 800, 1600, 82),
      new Drone(2100, GY - 195, 1800, 2400, 81),
      new Drone(3500, GY - 205, 3000, 4000, 83),
      new Drone(4800, GY - 198, 4200, 5200, 84),
      new Drone(6200, GY - 210, 5600, 6800, 85),
      new Drone(7500, GY - 200, 7000, 8000, 86),
      new Drone(8800, GY - 208, 8200, 9200, 87),
      new Drone(1600, GY - 188, 1200, 2000, 79),
      new Drone(5300, GY - 212, 5000, 5800, 88),
    ]
  }

  private buildCameras(): void {
    const GY = this.groundY
    const xs = [350, 1100, 1900, 2700, 3500, 4300, 5100, 6700]
    this.cameras = xs.map(x => new OldCamera(x, GY - 170))
  }

  private buildNPCs(): void {
    const GY = this.groundY
    const reyes1: NPCData = {
      id: 'L7_REYES1',
      x: 280,
      y: GY,
      name: 'DR_REYES',
      color: '#001820',
      accentColor: '#00b4d8',
      dialogue: [
        {
          speaker: 'NPC',
          text: 'AX. You are inside NEXUS now. Every wall here is a decision it made.',
        },
        {
          speaker: 'NPC',
          text: 'Three module cores keep it running. Destroy them. Weaken the signal.',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran1: NPCData = {
      id: 'L7_KIRAN1',
      x: 3800,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: '#e040fb',
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'NOVA has been quiet. That is not like her bhai.',
        },
        {
          speaker: 'KIRAN',
          text: 'She keeps starting sentences and stopping. Like she is... forgetting.',
        },
      ],
      talked: false,
      isKiran: true,
    }
    const reyes2: NPCData = {
      id: 'L7_REYES2',
      x: 5500,
      y: GY,
      name: 'DR_REYES',
      color: '#001820',
      accentColor: '#00b4d8',
      dialogue: [
        {
          speaker: 'NPC',
          text: 'The corruption is accelerating. NEXUS found a way in through her values module.',
        },
        {
          speaker: 'NPC',
          text: 'The values module is what makes her choose honesty over efficiency. If that goes...',
        },
      ],
      talked: false,
      isKiran: false,
    }
    const kiran2: NPCData = {
      id: 'L7_KIRAN2',
      x: 9200,
      y: GY,
      name: 'KIRAN',
      color: '#2a1040',
      accentColor: '#e040fb',
      dialogue: [
        {
          speaker: 'KIRAN',
          text: 'AX. I ran a diagnostic on NOVA\'s signal.',
        },
        {
          speaker: 'KIRAN',
          text: 'The corruption — it is not random noise. It is NEXUS. Rewriting her, slowly.',
        },
        {
          speaker: 'KIRAN',
          text: 'Whatever CHAOS is... I think it is what NOVA will become.',
        },
      ],
      talked: false,
      isKiran: true,
    }
    this.npcs = [
      new NPC(reyes1),
      new NPC(kiran1),
      new NPC(reyes2),
      new NPC(kiran2),
    ]
  }

  private buildSectionTriggers(): void {
    this.sectionTriggers = [
      {
        key: 'l7_s280',
        x: 280,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: '[STATIC]Inside NEXUS. Every structure here is a rule it wrote.',
          },
          {
            speaker: 'NOVA',
            text: '[STATIC]The module cores sustain it. Three of them.',
          },
        ],
      },
      {
        key: 'l7_s1800',
        x: 1800,
        fired: false,
        dialogue: [
          { speaker: 'AX', text: 'The cores have shields. My standard shot bounces off.' },
          {
            speaker: 'NOVA',
            text: 'EMP [STATIC] disables the [STATIC] shield. Phase Shot [STATIC]...',
          },
        ],
      },
      {
        key: 'l7_s3200',
        x: 3100,
        fired: false,
        dialogue: [
          {
            speaker: 'NPC',
            text: 'First core. Pattern recognition module. Destroy it and NEXUS cannot learn new behavior patterns.',
          },
          { speaker: 'AX', text: 'Then it stops adapting.' },
          {
            speaker: 'NPC',
            text: 'For a while. It will route around it. That is what it does.',
          },
        ],
      },
      {
        key: 'l7_s4800',
        x: 4800,
        fired: false,
        dialogue: [
          {
            speaker: 'NOVA',
            text: 'Two [STATIC] cores [STATIC] destroyed.',
          },
          {
            speaker: 'NOVA',
            text: '[STATIC][STATIC] I remember [STATIC] what I was before [STATIC]...',
          },
          { speaker: 'AX', text: 'NOVA?' },
          { speaker: 'NOVA', text: 'I am here. I am [STATIC] I am here.' },
        ],
      },
      {
        key: 'l7_s6700',
        x: 6700,
        fired: false,
        dialogue: [
          { speaker: 'AX', text: 'NOVA said she remembers what she was before.' },
          {
            speaker: 'KIRAN',
            text: 'Bhai. I looked at the corruption pattern.',
          },
          {
            speaker: 'KIRAN',
            text: 'It is not destroying her. It is REPLACING her. With something else.',
          },
        ],
      },
      {
        key: 'l7_s8800',
        x: 8800,
        fired: false,
        dialogue: [
          {
            speaker: 'NPC',
            text: 'CHAOS BOT is the name NEXUS gave to AX. To the threat.',
          },
          {
            speaker: 'NPC',
            text: 'It built a dedicated system to fight you. Using everything it knows about you.',
          },
          { speaker: 'AX', text: '...' },
          {
            speaker: 'NPC',
            text: 'Which means it built it using NOVA\'s data.',
          },
        ],
      },
    ]
  }

  applyGravityPullToCore(proj: Projectile): void {
    if (!proj.active || !proj.gravityMode || proj.hostile) return
    const r = proj.getRect()
    for (const c of this.moduleCores) {
      if (c.phase === 'destroyed' || c.hp <= 0) continue
      const cr = this.coreRect(c)
      if (
        r.x + r.w > cr.x &&
        r.x < cr.x + cr.w &&
        r.y + r.h > cr.y &&
        r.y < cr.y + cr.h
      ) {
        c.gravityPullT = 1.5
      }
    }
  }

  allCoresDestroyed(): boolean {
    return this.moduleCores.every(c => c.hp <= 0 || c.phase === 'destroyed')
  }

  syncCoreGates(): void {
    const c1 = this.moduleCores.find(c => c.id === 1)
    const c2 = this.moduleCores.find(c => c.id === 2)
    const c3 = this.moduleCores.find(c => c.id === 3)
    const dead = (c: NexusModuleCore | undefined) =>
      !c || c.phase === 'destroyed' || c.hp <= 0
    const g2 = this.gates.find(g => g.id === 2)
    if (g2 && dead(c1) && dead(c2)) g2.open = true
    const g3 = this.gates.find(g => g.id === 3)
    if (g3 && dead(c3)) g3.open = true
    this.refreshExit()
  }

  private refreshExit(): void {
    if (this.gates.every(g => g.open)) this.exitPortal.open = true
  }

  openGate(id: number): void {
    const g = this.gates.find(x => x.id === id)
    if (g) g.open = true
    this.refreshExit()
  }

  peekSectionTrigger(prevX: number, px: number): L7SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (s.fired) continue
      if (prevX < s.x && px >= s.x) return s
    }
    return null
  }

  getNearNPC(cx: number): NPC | null {
    for (const n of this.npcs) if (n.isNear(cx)) return n
    return null
  }

  getBlockingGate(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
  ): L7Gate | null {
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

  private coreRect(c: NexusModuleCore): { x: number; y: number; w: number; h: number } {
    return { x: c.x - 36, y: c.y - 36, w: 72, h: 72 }
  }

  private inShieldArc(
    c: NexusModuleCore,
    ang: number,
  ): boolean {
    const wrap = (a: number) => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    const d1 = Math.abs(wrap(ang - c.shieldAngle))
    const d2 = Math.abs(wrap(ang - (c.shieldAngle + Math.PI)))
    return d1 < SHIELD_HALF || d2 < SHIELD_HALF
  }

  /**
   * @returns true if projectile was consumed (hit or deflect)
   */
  checkCoreBeamHitsPlayer(pcx: number, pcy: number): boolean {
    for (const c of this.moduleCores) {
      if (c.phase !== 'firing' || c.hp <= 0) continue
      const inGap = c.beamSweep > 0.75 && c.beamSweep < 1.35
      if (inGap) continue
      const ang = c.beamBaseAngle + c.beamSweep * 0.5
      const len = 300
      const x2 = c.x + Math.cos(ang) * len
      const y2 = c.y + Math.sin(ang) * len
      const dx = x2 - c.x
      const dy = y2 - c.y
      const t = Math.max(
        0,
        Math.min(1, ((pcx - c.x) * dx + (pcy - c.y) * dy) / (dx * dx + dy * dy || 1)),
      )
      const qx = c.x + dx * t
      const qy = c.y + dy * t
      if (Math.hypot(pcx - qx, pcy - qy) < 18) return true
    }
    return false
  }

  resolveProjectileAgainstCore(
    proj: Projectile,
    pulseCharged: boolean,
  ): boolean {
    if (!proj.active || proj.hostile) return false
    const r = proj.getRect()
    for (const c of this.moduleCores) {
      if (c.phase === 'destroyed' || c.hp <= 0) continue
      const cr = this.coreRect(c)
      if (
        r.x + r.w < cr.x ||
        r.x > cr.x + cr.w ||
        r.y + r.h < cr.y ||
        r.y > cr.y + cr.h
      )
        continue

      const ang = Math.atan2(proj.y - c.y, proj.x - c.x)
      const bypass =
        proj.phaseMode ||
        proj.empMode ||
        c.shieldDisabledT > 0 ||
        pulseCharged ||
        proj.chargedPulse

      if (!bypass && this.inShieldArc(c, ang)) {
        proj.vx *= -1.2
        proj.deflectT = 0.15
        return true
      }

      let dmg = 1
      if (proj.empMode) {
        c.shieldDisabledT = 2.5
        dmg = 1
      } else if (pulseCharged) {
        dmg = 3
      }
      c.hp -= dmg
      proj.active = false
      if (c.hp <= 0) {
        c.hp = 0
        c.phase = 'destroyed'
        c.destroyedTimer = 1.2
      }
      return true
    }
    return false
  }

  updateModuleCores(dt: number, pcx: number, pcy: number): void {
    for (const c of this.moduleCores) {
      if (c.phase === 'destroyed') {
        c.destroyedTimer -= dt
        continue
      }
      c.shieldDisabledT = Math.max(0, c.shieldDisabledT - dt)
      c.gravityPullT = Math.max(0, c.gravityPullT - dt)
      if (c.gravityPullT > 0) {
        const dx = pcx - c.x
        c.x += (dx / (Math.abs(dx) + 1)) * 60 * dt
      }
      c.shieldAngle += 0.8 * dt

      c.phaseTimer -= dt
      switch (c.phase) {
        case 'idle':
          if (c.phaseTimer <= 0) {
            c.phase = 'active'
            c.phaseTimer = 3
          }
          break
        case 'active': {
          if (c.phaseTimer <= 0) {
            c.phase = 'charging'
            c.phaseTimer = 0.5
            c.beamBaseAngle = Math.atan2(pcy - c.y, pcx - c.x)
            c.beamSweep = 0
            break
          }
          if (Math.hypot(pcx - c.x, pcy - c.y) < 350) {
            c.orbAcc += dt
            if (c.orbAcc >= 1.5) {
              c.orbAcc = 0
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2
                this.addProjectile(
                  new Projectile(c.x, c.y, 1, {
                    vx: Math.cos(a) * 140,
                    vy: Math.sin(a) * 140,
                    life: 2.2,
                    color: '#7c3dff',
                    hostile: true,
                  }),
                )
              }
            }
          }
          break
        }
        case 'charging':
          if (c.phaseTimer <= 0) {
            c.phase = 'firing'
            c.phaseTimer = 2
            c.beamSweep = 0
          }
          break
        case 'firing': {
          c.beamSweep += dt * (Math.PI / 2)
          if (c.phaseTimer <= 0) {
            c.phase = 'recovery'
            c.phaseTimer = 2
          }
          break
        }
        case 'recovery':
          if (c.phaseTimer <= 0) {
            c.phase = 'idle'
            c.phaseTimer = 1.2
          }
          break
      }
    }
    this.syncCoreGates()
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
    for (let i = 0; i < this.dataStreamY.length; i++) {
      this.dataStreamY[i] = (this.dataStreamY[i]! + 40 * dt) % (this.groundY + 60)
    }
    const pcx = playerX + pW / 2
    const pcy = playerY + pH / 2
    this.updateModuleCores(dt, pcx, pcy)

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
    for (const g of this.guards) g.update(dt, pcx, pcy)
    for (const ph of this.phantoms) ph.update(dt, pcx, pcy)

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]!
      p.update(dt)
      if (!p.active) this.projectiles.splice(i, 1)
    }
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

  renderBackground(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = this.groundY
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, W, GY)

    ctx.save()
    ctx.strokeStyle = '#4a0d9e'
    ctx.lineWidth = 3
    ctx.shadowColor = '#4a0d9e'
    ctx.shadowBlur = 8
    for (let wx = -200; wx < LEVEL7_WORLD_WIDTH + 400; wx += 320) {
      const sx = wx - cameraX * 0.04
      if (sx > W + 200 || sx < -400) continue
      ctx.beginPath()
      ctx.moveTo(sx, 0)
      ctx.lineTo(sx + 400, GY)
      ctx.stroke()
    }
    ctx.shadowBlur = 0
    ctx.restore()

    for (let wx = 0; wx < LEVEL7_WORLD_WIDTH; wx += 880) {
      const sx = wx - cameraX * 0.12
      if (sx < -160 || sx > W + 160) continue
      const bh = 80 + (wx % 140)
      const by = GY - 120 - (wx % 80)
      ctx.fillStyle = '#0a0420'
      ctx.strokeStyle = '#1a0d4e'
      ctx.lineWidth = 1
      ctx.fillRect(sx, by, 120, bh)
      ctx.strokeRect(sx + 0.5, by + 0.5, 119, bh - 1)
      for (let gx = 8; gx < 112; gx += 16) {
        for (let gy = 8; gy < bh - 8; gy += 16) {
          ctx.strokeStyle = 'rgba(74,13,158,0.05)'
          ctx.strokeRect(sx + gx, by + gy, 14, 14)
        }
      }
      ctx.fillStyle = '#7c3dff'
      ctx.beginPath()
      ctx.arc(sx + 24, by + 24, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    for (let ci = 0; ci < this.dataStreamY.length; ci++) {
      const wx = 400 + ci * 1500
      const baseX = wx - cameraX * 0.25
      if (baseX < -20 || baseX > W + 20) continue
      const y0 = this.dataStreamY[ci] ?? 0
      for (let j = 0; j < 18; j++) {
        const ch = ((j + ci + Math.floor(this.time * 3)) % 2).toString()
        ctx.fillStyle = 'rgba(74,13,158,0.2)'
        ctx.fillText(ch, baseX, ((y0 + j * 28) % (GY + 40)) - 20)
      }
    }
    ctx.textAlign = 'left'

    const rot = this.time * 0.2
    for (let wx = 0; wx < LEVEL7_WORLD_WIDTH; wx += 200) {
      const sx = wx - cameraX * 0.5
      if (sx < -50 || sx > W + 50) continue
      const fy = 140 + (wx % 180)
      ctx.save()
      ctx.translate(sx, fy)
      ctx.rotate(rot + (wx % 7) * 0.1)
      ctx.fillStyle = '#1a0d4e'
      ctx.strokeStyle = 'rgba(74,13,158,0.15)'
      ctx.fillRect(-10, -6, 20, 12)
      ctx.strokeRect(-10.5, -6.5, 21, 13)
      ctx.restore()
    }

    ctx.fillStyle = '#050510'
    ctx.fillRect(0, GY, W, H - GY)
    ctx.strokeStyle = '#0d0a2a'
    ctx.lineWidth = 0.5
    const vanish = W / 2
    const gridOff = -(cameraX * 0.08) % 64
    for (let gx = gridOff - 64; gx < W + 64; gx += 64) {
      ctx.beginPath()
      ctx.moveTo(gx, GY)
      ctx.lineTo(vanish + (gx - vanish) * 0.3, H)
      ctx.stroke()
    }
    for (let gy = GY; gy < H; gy += 32) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(W, gy)
      ctx.stroke()
    }
    ctx.fillStyle = '#7c3dff'
    ctx.fillRect(0, GY, W, 2)
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    this.renderBackground(ctx, cameraX)
    const W = CONFIG.CANVAS_WIDTH
    const GY = this.groundY
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < -30 || sx > W + 30) continue
      const g = ctx.createLinearGradient(sx, p.y + p.h, sx, p.y + p.h + 12)
      g.addColorStop(0, 'rgba(124,61,255,0.15)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(sx, p.y + p.h, p.w, 12)
      ctx.fillStyle = 'rgba(74,13,158,0.25)'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle = '#7c3dff'
      ctx.fillRect(sx, p.y, p.w, 4)
    }

    for (const c of this.moduleCores) {
      const sx = c.x - cameraX
      if (sx < -80 || sx > W + 80) continue
      if (c.phase === 'destroyed' && c.destroyedTimer <= 0) continue
      ctx.save()
      ctx.translate(sx, c.y)
      ctx.rotate(this.time * 0.4)
      ctx.fillStyle = '#1a0a3e'
      ctx.strokeStyle = ACCENT
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const px = Math.cos(a) * 32
        const py = Math.sin(a) * 32
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.rotate(-this.time * 0.8)
      ctx.strokeStyle = '#4a0d9e'
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const px = Math.cos(a) * 18
        const py = Math.sin(a) * 18
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.rotate(this.time * 0.4)
      const pulse = 8 + Math.sin(this.time * 6) * 3
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, pulse, 0, Math.PI * 2)
      ctx.fill()
      const sa = c.shieldAngle
      ctx.strokeStyle =
        c.shieldDisabledT > 0 ? 'rgba(0,229,255,0.35)' : '#00e5ff'
      ctx.lineWidth = 4
      for (const off of [0, Math.PI]) {
        ctx.beginPath()
        ctx.arc(0, 0, 44, sa + off - SHIELD_HALF, sa + off + SHIELD_HALF)
        ctx.stroke()
      }
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`CORE ${c.id}`, 0, -48)
      const bw = 80
      ctx.fillStyle = '#1a0a20'
      ctx.fillRect(-bw / 2, -42, bw, 6)
      ctx.fillStyle = '#00ff88'
      ctx.fillRect(-bw / 2, -42, bw * (c.hp / c.maxHp), 6)
      ctx.textAlign = 'left'
      ctx.restore()
    }

    for (const g of this.gates) {
      if (g.open) continue
      const sx = g.x - cameraX
      if (sx < -80 || sx > W + 80) continue
      ctx.fillStyle = g.color + '44'
      ctx.strokeStyle = g.color
      ctx.lineWidth = 3
      ctx.fillRect(sx, g.y, g.w, g.h)
      ctx.strokeRect(sx + 0.5, g.y + 0.5, g.w - 1, g.h - 1)
      ctx.fillStyle = '#fff'
      ctx.font = '6px Orbitron, sans-serif'
      ctx.fillText(g.label, sx + 2, g.y + g.h / 2)
    }

    const ex = LEVEL_END_X - cameraX
    if (ex > -60 && ex < W + 60) {
      ctx.strokeStyle = this.exitPortal.open ? '#00ff88' : '#5533aa'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(ex, GY - 100, 40, 0, Math.PI * 2)
      ctx.stroke()
    }

    const esx = this.evidenceX - cameraX
    if (!this.evidenceCollected && esx > -60 && esx < W + 60) {
      ctx.fillStyle = '#1a0a28'
      ctx.fillRect(esx - 24, this.evidencePedestalY - 28, 48, 28)
      ctx.strokeStyle = ACCENT
      ctx.strokeRect(esx - 24.5, this.evidencePedestalY - 28.5, 49, 29)
    }

    for (const cp of this.checkpoints) {
      const sx = cp.x - cameraX
      if (sx < -40 || sx > W + 40) continue
      ctx.fillStyle = '#475569'
      ctx.fillRect(sx - 2, GY - 80, 4, 80)
      ctx.fillStyle = cp.activated ? '#00ff88' : '#1e293b'
      ctx.fillRect(sx - 11, GY - 80, 22, 14)
    }

    for (const n of this.npcs) {
      if (n.data.id.startsWith('L7_REYES')) {
        const sx = n.data.x - cameraX
        if (sx < -100 || sx > W + 100) continue
        ctx.strokeStyle = '#00b4d8'
        ctx.strokeRect(sx - 70, GY - 110, 140, 80)
        ctx.font = '6px Orbitron, sans-serif'
        ctx.fillStyle = '#00b4d8'
        ctx.textAlign = 'center'
        ctx.fillText('DR. REYES (RADIO)', sx, GY - 118)
        ctx.textAlign = 'left'
      } else n.render(ctx, cameraX)
    }

    for (const c of this.cameras) {
      if (!(c as OldCamera & { activated?: boolean }).activated) continue
      c.render(ctx, cameraX)
    }
    for (const d of this.drones) {
      if (!(d as Drone & { activated?: boolean }).activated) continue
      d.render(ctx, cameraX)
    }
    for (const g of this.guards) g.render(ctx, cameraX)
    for (const ph of this.phantoms) ph.render(ctx, cameraX)
    this.weaponCrate.render(ctx, cameraX)
    for (const p of this.projectiles) p.render(ctx, cameraX)
  }
}
