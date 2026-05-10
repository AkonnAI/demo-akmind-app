import { OldCamera }     from '../entities/OldCamera'
import { Projectile }    from '../entities/Projectile'
import { NPC, NPCData }  from '../entities/NPC'
import { Crawler }       from '../entities/Crawler'
import { SentryMine }    from '../entities/SentryMine'
import { WallHugger }    from '../entities/WallHugger'
import { CONFIG }        from '../constants/config'
import { InputManager }  from '../engine/InputManager'

// ────────────────────────────────────────────────────────────
// LEVEL 2 — "THE VAULT"
// Full rebuild per PROJECT.md §13 (Level 2 visual bible).
// Underground tunnel, stone platforms, water floor, ceiling
// torches, Crawler enemy, timeline puzzle, Glitch Twin handled in GameScene2,
// dataset reveal.  NOTHING from Level 1 carries over visually.
// ────────────────────────────────────────────────────────────

// ═══ WORLD ═══════════════════════════════════════════════════
const WORLD_WIDTH_L2          = 11000
const LEVEL_END_X             = 10850

// ═══ CEILING / ARCHITECTURE ══════════════════════════════════
const CEILING_Y               = 80
const CEILING_BODY            = '#1a0e0a'
const CEILING_BODY_DARK       = '#100604'
const CEILING_CRACK           = '#0a0503'
const CEILING_CRACK_SPACING   = 300
const PILLAR_SPACING          = 600
const PILLAR_W                = 40
const PILLAR_COLOR            = '#1a0e0a'
const ARCH_STROKE             = '#2a1a12'
const BG_BASE                 = '#020108'
const BG_TINT_TOP             = '#04010a'
const BG_TINT_MID             = '#0a0408'
const SERVER_RACK_ALPHA       = 0.10

// ═══ TORCHES ═════════════════════════════════════════════════
const TORCH_SPACING           = 1800
const TORCH_W                 = 6
const TORCH_H                 = 14
const TORCH_LIGHT_RADIUS      = 220
const TORCH_LIGHT_ALPHA       = 0.12
const TORCH_COLOR             = '#ff8c00'
const DARK_OVERLAY_ALPHA      = 0.35
const DARK_OVERLAY_DIST       = 300

// ═══ PLATFORMS ═══════════════════════════════════════════════
const PLATFORM_BODY           = '#1e1008'
const PLATFORM_TOP            = '#c87941'
const PLATFORM_EDGE           = '#0a0804'
const PLATFORM_MOSS           = '#1a4a1a'
const PLATFORM_MOSS_ALPHA     = 0.20

// ═══ WATER FLOOR ═════════════════════════════════════════════
const WATER_BASE              = '#060318'
const WATER_WAVE              = '#0a2a4a'
const WATER_WAVE_ALPHA        = 0.4

// ═══ GATES ═══════════════════════════════════════════════════
const ARENA_WALL_COLOR        = '#ff1744'

// ═══ CIPHER TERMINALS (Level 2 gating mechanic) ══════════════
// Tall server rack bolted to the ground — blocks path until
// hacked.  Player walks up, presses E, then cycles 4 digits
// with Z/E and confirms with SPACE.  Wrong digits reset to
// 0000 and bounce the index back to 0 (punishment, no damage).
// See GameScene2.activeTerminal / terminal-hacking block.
const TERMINAL_W              = 48
const TERMINAL_H              = 120
export const TERMINAL_HACK_RANGE = 60
export const TERMINAL_WALK_AWAY  = 80
const TERMINAL_BODY_COLOR     = '#0e0a1e'
const TERMINAL_BORDER_COLOR   = '#334155'
const TERMINAL_BOLT_COLOR     = '#1e293b'
const TERMINAL_SCREEN_BG      = '#020818'
const TERMINAL_MATRIX_COLOR   = '#00ff44'
const TERMINAL_AMBER          = '#ff9100'
const TERMINAL_SOLVED_COLOR   = '#00ff44'
const TERMINAL_WRONG_COLOR    = '#ff0000'
const TERMINAL_SELECT_COLOR   = '#00e5ff'
const TERMINAL_SCREEN_TOP_PAD = 4
const TERMINAL_SCREEN_H       = 50
const TERMINAL_KEYBOARD_H     = 30
const TERMINAL_SOLVED_ANIM    = 1.2
const TERMINAL_WRONG_FLASH    = 0.6

// ═══ CHECKPOINTS ═════════════════════════════════════════════
const CP_FLAG_W               = 22
const CP_FLAG_H               = 14
const CP_POLE_W               = 3
const CP_POLE_H               = 80
const CP_POLE_COLOR           = '#475569'
const CP_FLAG_OFF_COLOR       = '#1e293b'
const CP_FLAG_ON_COLOR        = '#00ff88'
const CP_ACTIVATE_TIME        = 0.8

// ═══ VAULT CHAMBER (zone 3) ══════════════════════════════════
const VAULT_CHAMBER_X_MIN     = 3800
const VAULT_CHAMBER_X_MAX     = 5600
const VAULT_DOOR_X            = 5500
const VAULT_DOOR_H            = 220
const VAULT_SEGMENT_COUNT     = 5
const VAULT_SEGMENT_W         = 16
const VAULT_SEGMENT_GAP       = 8

// ═══ TIMELINE CARDS ═══════════════════════════════════════════
const CARD_W                  = 90
const CARD_H                  = 130
const CARD_PICKUP_RANGE       = 100
const CARD_CARRY_OFFSET_Y     = -100
const SLOT_W                  = 90
const SLOT_H                  = 50
const SLOT_PLACE_RANGE        = 85
const SLOT_Y_OFFSET           = 60
// One vivid color per decade — NO two cards share a hue.
const CARD_COLORS: readonly string[] = [
  '#00e5ff',  // 1950 cyan
  '#ff6b00',  // 1956 orange
  '#cc00ff',  // 1997 violet
  '#00ff88',  // 2012 green
  '#ff2d7a',  // 2022 hot pink
]

// ═══ FORMER BOSS ARENA ZONE (tunnel visuals only) ═══════════════
const ARENA_X_MIN             = 6150
const ARENA_X_MAX             = 7100

// ═══ EVIDENCE PEDESTAL (zone 5) ═══════════════════════════════
const EVIDENCE_X              = 8800
const EVIDENCE_COLLECT_RANGE  = 60
const EVIDENCE_PEDESTAL_H     = 80
const EVIDENCE_PEDESTAL_W     = 50

// ═══ NOVA LINES ═══════════════════════════════════════════════
const CARD_NOVA_LINES: readonly string[] = [
  'Turing asked if machines could think. The question that started everything.',
  'Dartmouth, 1956. John McCarthy named this field. Eight scientists, eight weeks.',
  'Deep Blue defeated Kasparov. A machine beat the best human at chess.',
  'Deep learning let AI see for the first time. A breakthrough that changed everything.',
  'ChatGPT. One hundred million users in two months. AI reached everyone overnight.',
]
const CARD_HINT_LINES: readonly string[] = [
  'That year does not fit. When did a mathematician first ask if machines could think?',
  'Not quite. When was AI officially named as a field at a summer workshop?',
  'Wrong era. When did a computer first defeat a world chess champion?',
  'Not there. When did deep learning let AI recognize images for the first time?',
  'That is not right. When did a chatbot reach one hundred million users overnight?',
]

// ─── INTERFACES ──────────────────────────────────────────────

export interface Platform {
  x: number; y: number; w: number; h: number
  mossCount?: number
  mossSeed?:  number
}

interface MovingPlatform extends Platform {
  baseX:     number
  amplitude: number
  speed:     number
  phase:     number
}

/** Terminal dissolve / solve particle — used for both the
 *  solved-burst sparks (green) and wrong-reset bounce (amber). */
export interface TerminalParticle {
  x:     number
  y:     number
  vx:    number
  vy:    number
  life:  number
  color: string
}

/** A Cipher Terminal — tall server rack.  Blocks the path while
 *  `active === true` (i.e. still locked).  The player walks up
 *  to it, presses E, then cycles the four digits with Z/E and
 *  confirms with SPACE.  See GameScene2 terminal-hacking block. */
export interface CipherTerminal {
  id:            number
  x:             number      // center x
  y:             number      // TOP of terminal body
  w:             number
  h:             number
  era:           string
  question:      string
  correctYear:   string
  digits:        number[]    // always length 4
  digitIndex:    number      // 0..3 while hacking; 4 = submit edge
  active:        boolean     // false once solved — no longer blocks
  isHacking:     boolean     // true while the player is at the terminal
  hackTimer:     number
  solvedTimer:   number      // counts down after solve for animation
  wrongFlash:    number      // red-flash timer after a wrong submit
  screenPhase:   number      // animates scrolling matrix lines
  triggered:     boolean     // NOVA intro line shown once
  novaLine:      string
  wrongNovaHint: string
  particles:     TerminalParticle[]
}

export interface Checkpoint {
  x:             number
  y:             number      // bottom of pole (= groundY)
  activated:     boolean
  activateTimer: number
  particles:     TerminalParticle[]
}

interface Gate {
  id:    number
  x:     number
  y:     number
  h:     number
  w:     number        // explicit width so arena wall differs from quiz gates
  open:  boolean
  label: string
  color: string
}

interface TimelineCard {
  id:            number
  label:         string
  sublabel:      string
  year:          string
  correctSlot:   number
  placedSlot:    number | null
  isCorrect:     boolean
  floatSeed:     number
  worldX:        number
  worldY:        number
  originX:       number
  originY:       number
  isCarried:     boolean
  isHighlighted: boolean
  wrongFlash:    number
  ejectTime:     number          // lerp timer for bounce-back arc (0→0.4)
  ejectFromX:    number
  ejectFromY:    number
}

interface TimelineSlot {
  index:  number
  x:      number
  y:      number
  year:   string
  color:  string
  filled: boolean
  cardId: number | null
  redFlash: number
}

interface VaultDoor {
  x:          number
  y:          number
  h:          number
  open:       boolean
  segments:   number
  openTimer:  number
  expandH:    number
}

interface EvidencePedestal {
  x: number
  y: number
  collected: boolean
}

interface BurningRobot { x: number; splay: number }

export interface SectionTrigger {
  x:        number
  fired:    boolean
  dialogue: { speaker: 'NOVA'|'AX'|'KIRAN'|'NPC', text: string, expression?: string }[]
}

interface DataChip { x: number; y: number; collected: boolean }

// ─── EVENT TYPES ─────────────────────────────────────────────

export type TimelineCardEvent =
  | { type: 'placed_correct'; cardId: number; slotIndex: number; novaLine: string }
  | { type: 'placed_wrong';   cardId: number; novaHint: string }
  | { type: 'vault_open' }

export type CipherTerminalEvent =
  | { type: 'solved'; terminalId: number; era: string; novaLine: string }
  | { type: 'wrong';  terminalId: number; novaHint: string }

export type HazardKind = 'sentry' | 'wallhugger'

export interface HazardEvent {
  kind: HazardKind
}

// ────────────────────────────────────────────────────────────
//                        LEVEL 2 CLASS
// ────────────────────────────────────────────────────────────

export class Level2 {
  readonly groundY:    number
  readonly levelEnd   = LEVEL_END_X
  readonly worldWidth = WORLD_WIDTH_L2

  // Entities — Level 2 roster is deliberately short:
  // Crawler (ceiling), SentryMine (stationary), WallHugger (wall
  // patrol).  NO Drones, NO EchoDrones — those lived in Level 1 or
  // were removed as part of the Level-2 cleanup pass.
  platforms:       Platform[]        = []
  movingPlatforms: MovingPlatform[]  = []
  crawlers:        Crawler[]         = []
  sentryMines:     SentryMine[]      = []
  wallHuggers:     WallHugger[]      = []
  cameras:         OldCamera[]       = []
  npcs:            NPC[]             = []
  gates:           Gate[]            = []
  cipherTerminals: CipherTerminal[]  = []
  checkpoints:     Checkpoint[]      = []
  projectiles:     Projectile[]      = []
  burningRobots:   BurningRobot[]    = []
  chips:           DataChip[]        = []

  // Puzzle state
  timelineCards:   TimelineCard[]    = []
  timelineSlots:   TimelineSlot[]    = []
  vaultDoor!:      VaultDoor
  evidencePedestal!: EvidencePedestal

  // Public flags
  hasMirror           = false
  levelComplete       = false
  vaultCipherCracked  = false
  glitchTwinDefeated  = false
  evidenceCollected   = false
  slowMotionActive    = false
  timeComplete        = false

  // Landings queue — GameScene2 drains these each frame to spawn
  // big acid-splash bursts in the bg particle system.
  pendingCrawlerLandings: { x: number; y: number }[] = []

  // Queued cipher-terminal events pushed from GameScene2 back into
  // the UI layer (XP + dialogue) — same pattern as the old lock
  // events, but now routed through the hacking flow in GameScene2.
  pendingTerminalEvents: CipherTerminalEvent[] = []

  private time = 0
  /** Latest player centre X from `update()` — for terminal `[ E ]` prompt. */
  lastPlayerCenterX = 0
  private sectionTriggers: SectionTrigger[] = []
  private pendingTimelineEvents: TimelineCardEvent[] = []
  private torchXs: number[] = []

  constructor(groundY: number) {
    this.groundY = groundY
    this.buildLevel()
  }

  // ─── BUILDER ────────────────────────────

  private buildLevel(): void {
    const GY = this.groundY
    this.buildPlatforms(GY)
    this.buildMovingPlatforms(GY)
    this.buildCrawlers()
    this.buildSentryMines(GY)
    this.buildWallHuggers(GY)
    this.buildCameras(GY)
    this.buildNPCs(GY)
    this.buildGates(GY)
    this.buildCipherTerminals(GY)
    this.buildCheckpoints(GY)
    this.buildBurningRobots()
    this.buildChips(GY)
    this.buildTimelineCards(GY)
    this.buildTimelineSlots(GY)
    this.buildVaultDoor(GY)
    this.buildEvidencePedestal(GY)
    this.buildTriggers()
    this.buildTorches()
  }

  private buildPlatforms(GY: number): void {
    this.platforms = [
      // ZONE 1: Entry tunnel (0-2000) — 5 static
      { x:  350, y: GY-110, w: 180, h: 16 },
      { x:  620, y: GY-170, w: 160, h: 16 },
      { x:  900, y: GY-130, w: 180, h: 16 },
      { x: 1400, y: GY-140, w: 180, h: 16 },
      { x: 1700, y: GY-200, w: 160, h: 16 },
      // ZONE 2: Approach (2100-3700) — 8 static
      { x: 2100, y: GY-120, w: 200, h: 16 },
      { x: 2380, y: GY-180, w: 180, h: 16 },
      // Vertical descent shaft — 4 tightly spaced at x=3000–3200
      { x: 3000, y: GY-230, w: 70,  h: 16 },
      { x: 3100, y: GY-170, w: 70,  h: 16 },
      { x: 3000, y: GY-110, w: 70,  h: 16 },
      { x: 3100, y: GY-50,  w: 70,  h: 16 },
      { x: 3250, y: GY-150, w: 200, h: 16 },
      { x: 3520, y: GY-200, w: 180, h: 16 },
      // ZONE 3: Vault chamber (3800-5600) — 3 static
      { x: 3830, y: GY-260, w: 180, h: 16 },
      { x: 5400, y: GY-220, w: 180, h: 16 },
      { x: 5570, y: GY-260, w: 120, h: 16 },
      // ZONE 5: Evidence run (7400-11000) — 12 static
      { x: 7500, y: GY-110, w: 180, h: 16 },
      { x: 7800, y: GY-170, w: 160, h: 16 },
      { x: 8100, y: GY-130, w: 180, h: 16 },
      { x: 8400, y: GY-190, w: 160, h: 16 },
      { x: 8700, y: GY-140, w: 180, h: 16 },
      { x: 9000, y: GY-180, w: 160, h: 16 },
      { x: 9300, y: GY-130, w: 200, h: 16 },
      { x: 9550, y: GY-180, w: 160, h: 16 },
      { x: 9850, y: GY-150, w: 180, h: 16 },
      { x:10100, y: GY-200, w: 180, h: 16 },
      { x:10400, y: GY-160, w: 200, h: 16 },
      { x:10650, y: GY-130, w: 180, h: 16 },
    ]
    // Seed moss patches per platform deterministically.
    this.platforms.forEach((p, i) => {
      p.mossSeed  = (p.x * 17 + p.y * 31 + i) | 0
      p.mossCount = (this.hash(p.mossSeed) % 3)
    })
  }

  private buildMovingPlatforms(GY: number): void {
    const defs: Array<Omit<MovingPlatform,'x'>> = [
      { baseX:1200, y: GY-180, w:140, h:16, amplitude:120, speed:60, phase:0   },
      { baseX:2600, y: GY-200, w:120, h:16, amplitude:100, speed:80, phase:2.1 },
      { baseX:4200, y: GY-160, w:160, h:16, amplitude:140, speed:50, phase:4.4 },
    ]
    for (const d of defs) {
      const mp: MovingPlatform = {
        x: d.baseX, y: d.y, w: d.w, h: d.h,
        baseX: d.baseX, amplitude: d.amplitude,
        speed:  d.speed, phase: d.phase,
        mossSeed: (d.baseX * 17) | 0,
        mossCount: 0,                     // moving platforms never grow moss
      }
      this.movingPlatforms.push(mp)
      this.platforms.push(mp)             // live reference, collision stays in sync
    }
  }

  /** Crawlers — NO entries inside the vault zone (x 3800-5600)
   *  per Fix 4A.  That area is a pure timeline-puzzle room.
   *  Format: [startX, rangeLeft, rangeRight, speed, dripIdle] */
  private buildCrawlers(): void {
    const defs: Array<[number, number, number, number, number]> = [
      // Zone 1 (3) — speed 70–80
      [  320, 100, 260,  70, 4.0],
      [ 1000,  80, 260,  75, 4.0],
      [ 1700, 120, 240,  80, 4.0],
      // Zone 2 (3) — speed 85–100
      [ 2200, 100, 260,  85, 3.5],
      [ 2700, 100, 260,  92, 3.5],
      [ 3300, 100, 260, 100, 3.5],
      // Zone 3 vault — EMPTY (pure puzzle area, Fix 4A)
      // Zone 5 (8 fast) — speed 100–120
      [ 7480, 140, 240, 100, 2],
      [ 7880, 140, 240, 105, 2],
      [ 8280, 140, 240, 110, 2],
      [ 8700, 140, 240, 112, 2],
      [ 9100, 140, 240, 116, 2],
      [ 9500, 140, 240, 118, 2],
      [ 9900, 140, 240, 120, 2],
      [10400, 140, 240, 120, 2],
    ]
    this.crawlers = defs.map(
      ([sx, rl, rr, sp, di]) => new Crawler(sx, rl, rr, sp, di)
    )
  }

  /** SentryMines — vault-zone entries at x=4100 and x=5300 removed
   *  (Fix 4A).  8 total remaining across zones 1, 2 and 5. */
  private buildSentryMines(GY: number): void {
    const positions = [
       700, 1400, 2300, 2900, 7800, 8600, 9300, 10100,
    ]
    this.sentryMines = positions.map(x => new SentryMine(x, GY))
  }

  /** WallHuggers — none inside x 3800-5600.  Existing roster
   *  already satisfies this (none were in the vault zone), kept
   *  explicit in comments so future edits notice the rule. */
  private buildWallHuggers(GY: number): void {
    // Vault-safe pillars only.
    const pillarXs = [900, 1600, 2600, 5800, 7400, 8800, 9800]
    this.wallHuggers = pillarXs.map((x, i) =>
      new WallHugger(x, GY, 120 + (i % 3) * 80)
    )
  }

  private buildCameras(GY: number): void {
    // 20 total — zones 1, 2, 5 only.  No cameras inside vault or arena.
    const positions = [
      // Zone 1 (6)
      240, 520, 820, 1160, 1460, 1740,
      // Zone 2 (6)
      2150, 2420, 2700, 2980, 3260, 3540,
      // Zone 5 (8)
      7460, 7780, 8120, 8420, 8720, 9020, 9320, 9620,
    ]
    this.cameras = positions.map(x => new OldCamera(x, GY - 80))
  }

  private buildNPCs(GY: number): void {
    const npcs: NPCData[] = [
      {
        id: 'elder_vault',
        x: 380, y: GY,
        name: 'ELDER',
        color: '#2d3a4a',
        accentColor: '#94a3b8',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'You are going deeper than most have. These tunnels remember things NeuroCorps forgot.' },
          { speaker:'AX',   text:'What did they forget?' },
          { speaker:'NPC',
            text:'History. They built their systems on top of it without ever learning what came before.' },
          { speaker:'NOVA',
            text:'The vault ahead is locked with the history of AI itself. Every milestone from Turing to ChatGPT.',
            expression:'explaining' },
          { speaker:'NPC',
            text:'They assumed nobody down here would know. Prove them wrong, child.' },
        ],
      },
      {
        id: 'archives_keeper',
        x: 2400, y: GY,
        name: 'ARCHIVES',
        color: '#2a1a4a',
        accentColor: '#a855f7',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'I keep what NeuroCorps wiped from the public records. The real timeline of AI.' },
          { speaker:'AX',   text:'The vault cipher needs that timeline?' },
          { speaker:'NPC',
            text:'Five milestones. If you know when they happened — in order — the vault opens.' },
          { speaker:'NOVA',
            text:'NeuroCorps assumed nobody in District 1 learned this history. That assumption is the crack.',
            expression:'warning' },
          { speaker:'NPC',
            text:'Their contempt is built into the lock. Turn it back on them.' },
        ],
      },
      {
        id: 'preet_vault',
        x: 6000, y: GY,
        name: 'PREET',
        color: '#1a2a4a',
        accentColor: '#00e5ff',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'Bhai — you actually cracked the vault? People have tried that for years.' },
          { speaker:'AX',   text:'We knew the history. That was the key.' },
          { speaker:'NPC',
            text:'Listen — the next chamber has two bots. They look identical.' },
          { speaker:'NOVA',
            text:'Glitch Twins. One follows a pattern. One is pure noise.',
            expression:'warning' },
          { speaker:'NPC',
            text:'Which means one of them is actually AI. The other is a bug pretending to be.' },
          { speaker:'AX',   text:'Count the steps. Whichever one is consistent — that is the real one.' },
        ],
      },
      {
        id: 'kiran_vault',
        x: 8600, y: GY,
        name: 'KIRAN',
        color: '#1a1a2e',
        accentColor: '#e040fb',
        talked: false, isKiran: true,
        dialogue: [
          { speaker:'KIRAN',
            text:'Bhai. I patched into your feed. That dataset on the pedestal — I saw it too.' },
          { speaker:'AX',   text:'What did you see?' },
          { speaker:'KIRAN',
            text:'Our family building. 2016. Income flagged as zero for six months straight.' },
          { speaker:'KIRAN',
            text:'Ma was running the kirana store the whole time. We have receipts. How did it become zero?' },
          { speaker:'NOVA',
            text:'Because someone made it zero. This is not an algorithm mistake. Someone fed it a lie.',
            expression:'warning' },
          { speaker:'KIRAN',
            text:'Every family in District 1 is on that dataset bhai. Find who did it.' },
          { speaker:'AX',   text:'We will. I promise.' },
        ],
      },
    ]
    this.npcs = npcs.map(d => new NPC(d))
  }

  /** Build the three Cipher Terminals that replace Level 1's quiz
   *  gates AND the previous Knowledge-Lock laser grids.  Each is
   *  a tall server rack bolted to the ground.  Player walks up,
   *  presses E, then cycles four digits with Z/E and confirms
   *  with SPACE.  Wrong submits bounce back to `0000` at index 0. */
  private buildCipherTerminals(GY: number): void {
    const ty = GY - TERMINAL_H
    const defs: Array<{
      id:        number
      x:         number
      era:       string
      question:  string
      correct:   string
      startDig:  [number, number, number, number]
      novaLine:  string
      wrongHint: string
    }> = [
      { id: 1, x: 1600, era: 'THE NAMING',
        question:  'YEAR AI WAS OFFICIALLY NAMED',
        correct:   '1956',
        startDig:  [1, 9, 0, 0],
        novaLine:  '1956. Dartmouth College. John McCarthy named this field. Eight scientists, eight weeks. This is where it all began.',
        wrongHint: 'Not that year. The Dartmouth workshop — summer of which year?',
      },
      { id: 2, x: 3150, era: 'THE VISION',
        question:  'YEAR DEEP LEARNING LET AI SEE',
        correct:   '2012',
        startDig:  [2, 0, 0, 0],
        novaLine:  '2012. Geoffrey Hinton\'s team won the image recognition contest by a massive margin. Suddenly AI could see. Everything changed.',
        wrongHint: 'Not that year. When did deep learning first beat humans at seeing images?',
      },
      { id: 3, x: 9850, era: 'THE EXPLOSION',
        question:  'YEAR ChatGPT REACHED 100M USERS',
        correct:   '2022',
        startDig:  [2, 0, 1, 9],
        novaLine:  'November 2022. One hundred million people in two months. AI moved from research labs to everyone\'s pocket overnight.',
        wrongHint: 'Not that era. When did a chatbot reach one hundred million users in two months?',
      },
    ]
    this.cipherTerminals = defs.map(d => ({
      id:            d.id,
      x:             d.x,
      y:             ty,
      w:             TERMINAL_W,
      h:             TERMINAL_H,
      era:           d.era,
      question:      d.question,
      correctYear:   d.correct,
      digits:        [...d.startDig],
      digitIndex:    0,
      active:        true,
      isHacking:     false,
      hackTimer:     0,
      solvedTimer:   0,
      wrongFlash:    0,
      screenPhase:   d.id * 0.7,
      triggered:     false,
      novaLine:      d.novaLine,
      wrongNovaHint: d.wrongHint,
      particles:     [],
    }))
  }

  /** Three waypoint checkpoints — after Zone 2, after vault,
   *  after boss.  Touched by walking through; updates respawn
   *  anchor in GameScene2 (Fix 2). */
  private buildCheckpoints(GY: number): void {
    const xs = [2800, 5700, 8000]
    this.checkpoints = xs.map(x => ({
      x,
      y:             GY,
      activated:     false,
      activateTimer: 0,
      particles:     [],
    }))
  }

  private buildGates(GY: number): void {
    // Level 2's historical gating is done entirely by Knowledge
    // Locks (laser grids — see buildKnowledgeLocks).  The only
    // Gate-shaped blocker left is the arena wall that seals the
    // mini-boss fight.
    this.gates = [
      { id:99, x:ARENA_X_MAX, y:GY-220, h:220, w:8,
        open:true, label:'arenaWall', color: ARENA_WALL_COLOR },
    ]
  }

  private buildBurningRobots(): void {
    const positions = [
      400, 900, 1600, 2300, 3000, 3600, 5800,
      6500, 7600, 8200, 8700, 9300, 9900, 10400, 10800,
    ]
    this.burningRobots = positions.map((x, i) => ({
      x, splay: (i % 3) - 1,
    }))
  }

  private buildChips(GY: number): void {
    this.chips = this.platforms.map(p => ({
      x: p.x + p.w / 2,
      y: p.y - 20,
      collected: false,
    }))
    for (let x = 300; x < this.levelEnd; x += 220) {
      if (x >= VAULT_CHAMBER_X_MIN && x <= VAULT_CHAMBER_X_MAX) continue
      if (x >= ARENA_X_MIN && x <= ARENA_X_MAX) continue
      this.chips.push({ x, y: GY - 30, collected: false })
    }
  }

  private buildTimelineCards(GY: number): void {
    const startY = GY - 230
    const defs = [
      { id:1, year:'1950', label:'THE QUESTION',  sub:'Alan Turing',       correctSlot:0 },
      { id:2, year:'1956', label:'THE NAMING',    sub:'Dartmouth College', correctSlot:1 },
      { id:3, year:'1997', label:'THE VICTORY',   sub:'Deep Blue',         correctSlot:2 },
      { id:4, year:'2012', label:'THE VISION',    sub:'Deep Learning',     correctSlot:3 },
      { id:5, year:'2022', label:'THE EXPLOSION', sub:'ChatGPT',           correctSlot:4 },
    ]
    // Deterministic shuffle so cards never start in order.
    const xPerm = [4500, 3900, 5100, 4200, 4800]
    this.timelineCards = defs.map((d, i) => {
      const sx = xPerm[i] ?? 4000
      return {
        id:            d.id,
        label:         d.label,
        sublabel:      d.sub,
        year:          d.year,
        correctSlot:   d.correctSlot,
        placedSlot:    null,
        isCorrect:     false,
        floatSeed:     i * 1.3,
        worldX:        sx,
        worldY:        startY,
        originX:       sx,
        originY:       startY,
        isCarried:     false,
        isHighlighted: false,
        wrongFlash:    0,
        ejectTime:     0,
        ejectFromX:    sx,
        ejectFromY:    startY,
      }
    })
  }

  private buildTimelineSlots(GY: number): void {
    const sy   = GY - SLOT_Y_OFFSET
    const xs   = [3950, 4250, 4550, 4850, 5150]
    this.timelineSlots = xs.map((x, i) => ({
      index:  i,
      x,
      y:      sy,
      year:   ['1950','1956','1997','2012','2022'][i] ?? '',
      color:  CARD_COLORS[i] ?? '#ffffff',
      filled: false,
      cardId: null,
      redFlash: 0,
    }))
  }

  private buildVaultDoor(GY: number): void {
    this.vaultDoor = {
      x: VAULT_DOOR_X,
      y: GY - VAULT_DOOR_H,
      h: VAULT_DOOR_H,
      open: false,
      segments: 0,
      openTimer: 0,
      expandH: 0,
    }
  }

  private buildEvidencePedestal(GY: number): void {
    this.evidencePedestal = {
      x: EVIDENCE_X,
      y: GY - EVIDENCE_PEDESTAL_H,
      collected: false,
    }
  }

  private buildTriggers(): void {
    this.sectionTriggers = [
      {
        x: 280, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'We are underground now. Ancient brick arches overhead. Water on the stone.',
            expression:'idle' },
          { speaker:'AX',
            text:'Amber torchlight. This is older than NeuroCorps.' },
          { speaker:'NOVA',
            text:'Much older. The vault ahead predates their entire surveillance grid.',
            expression:'explaining' },
          { speaker:'NOVA',
            text:'Watch the ceiling — the drones down here do not fly. They crawl.',
            expression:'warning' },
        ],
      },
      {
        x: 1350, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'A cipher terminal up ahead. Old NeuroCorps hardware — they lock paths behind year codes.',
            expression:'explaining' },
          { speaker:'AX',
            text:'So I walk up and crack it?' },
          { speaker:'NOVA',
            text:'Press E at the terminal. Z and E cycle each digit. Space confirms. Four digits. One year.',
            expression:'explaining' },
        ],
      },
      {
        x: 3800, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'NeuroCorps built this vault using a historical cipher. They assumed nobody in the Slums would know the history of AI.',
            expression:'warning' },
          { speaker:'AX',
            text:'They assumed wrong. Tell me the first key.' },
          { speaker:'NOVA',
            text:'1950. A mathematician named Alan Turing asked a question that started everything: can machines think?',
            expression:'explaining' },
        ],
      },
      {
        x: 5600, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Five milestones. That is the foundation every AI in this city was built on.',
            expression:'happy' },
          { speaker:'AX',
            text:'Every AI. Including the one that condemned my family.' },
          { speaker:'NOVA',
            text:'Especially that one. Keep moving — we are close to something real.',
            expression:'warning' },
        ],
      },
      {
        x: 7700, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Wall Hugger class. It patrols a fixed path. Until it sees you. Then it abandons the pattern entirely.',
            expression:'explaining' },
          { speaker:'AX',
            text:'So it is not AI either?' },
          { speaker:'NOVA',
            text:'The patrol is programmed. The leap is a trigger condition. One rule: if target detected, jump. Still deterministic.',
            expression:'explaining' },
        ],
      },
      {
        x: 8700, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Pedestal ahead. One data chip. The algorithm that condemned your building — I can see its timestamp.',
            expression:'explaining' },
          { speaker:'AX', text:'Let me collect it.' },
        ],
      },
      {
        x: 9400, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'We have the when. We need the what. District 2 — the Data Markets — that is where this data came from.',
            expression:'explaining' },
          { speaker:'AX', text:'Exit first. Then we go there.' },
        ],
      },
    ]
  }

  private buildTorches(): void {
    this.torchXs = []
    for (let x = TORCH_SPACING / 2; x < this.worldWidth; x += TORCH_SPACING) {
      this.torchXs.push(x)
    }
  }

  // ─── COLLISION ─────────────────────────

  checkPlatformCollision(
    ax: number, ay: number, aw: number, ah: number, vy: number
  ): number | null {
    if (vy < 0) return null
    const fy = ay + ah
    for (const p of this.platforms) {
      if (ax + aw < p.x + 4 || ax > p.x + p.w - 4) continue
      if (fy >= p.y && fy <= p.y + p.h + 10) return p.y - ah
    }
    return null
  }

  getCipherTerminals(): CipherTerminal[] {
    return this.cipherTerminals
  }

  isGateBlocking(
    ax: number, ay: number, aw: number, ah: number
  ): boolean {
    for (const g of this.gates) {
      if (g.open) continue
      if (ax + aw > g.x && ax < g.x + g.w &&
          ay + ah > g.y && ay < g.y + g.h) return true
    }
    const v = this.vaultDoor
    if (!v.open) {
      const totalW = VAULT_SEGMENT_COUNT * VAULT_SEGMENT_W
                   + (VAULT_SEGMENT_COUNT - 1) * VAULT_SEGMENT_GAP
      if (ax + aw > v.x && ax < v.x + totalW &&
          ay + ah > v.y && ay < v.y + v.h) return true
    }
    // Cipher terminals block as hard walls
    for (const t of this.cipherTerminals) {
      if (!t.active) continue
      const tLeft  = t.x - t.w / 2
      const tRight = t.x + t.w / 2
      if (ax + aw > tLeft && ax < tRight &&
          ay + ah > t.y  && ay < t.y + t.h) return true
    }
    return false
  }

  /** Returns the CipherTerminal currently blocking the player
   *  (if any).  Null if the player is in open space or all
   *  terminals in reach are already solved. */
  getCipherTerminalBlock(
    ax: number, ay: number, aw: number, ah: number
  ): CipherTerminal | null {
    const halfW = TERMINAL_W / 2
    for (const t of this.cipherTerminals) {
      if (!t.active) continue
      const tx = t.x - halfW
      if (ax + aw <= tx)               continue
      if (ax     >= tx + TERMINAL_W)   continue
      if (ay + ah <= t.y)              continue
      if (ay     >= t.y + TERMINAL_H)  continue
      return t
    }
    return null
  }

  /** Returns the nearest *active* terminal whose horizontal distance
   *  to `px` is ≤ TERMINAL_HACK_RANGE.  Used by GameScene2 to arm
   *  the E-key hacking prompt. */
  getNearTerminal(px: number): CipherTerminal | null {
    let best: CipherTerminal | null = null
    let bestD = TERMINAL_HACK_RANGE
    for (const t of this.cipherTerminals) {
      if (!t.active) continue
      const d = Math.abs(t.x - px)
      if (d < bestD) { bestD = d; best = t }
    }
    return best
  }

  /**
   * Call every PLAY frame from GameScene2. Activates the first
   * checkpoint the player has walked past (centre X ≥ pole X).
   */
  updateCheckpointsForPlayer(playerCenterX: number): Checkpoint | null {
    for (const cp of this.checkpoints) {
      if (cp.activated) continue
      if (playerCenterX >= cp.x) {
        cp.activated     = true
        cp.activateTimer = CP_ACTIVATE_TIME
        this.spawnCheckpointBurst(cp)
        return cp
      }
    }
    return null
  }

  /** Fast-forward for admin section jump — opens gates, solves quizzes. */
  applySectionStart(startX: number, opts?: { skipCheckpoints?: boolean }): void {
    for (const s of this.sectionTriggers) {
      if (s.x < startX) s.fired = true
    }
    for (const g of this.gates) {
      if (g.x < startX) g.open = true
    }
    for (const t of this.cipherTerminals) {
      if (t.x < startX) {
        t.active      = false
        t.isHacking   = false
        t.digitIndex  = 4
        t.solvedTimer = 0
        t.wrongFlash  = 0
      }
    }
    if (!opts?.skipCheckpoints) {
      for (const cp of this.checkpoints) {
        if (cp.x < startX) {
          cp.activated     = true
          cp.activateTimer = 0
        }
      }
    }
  }

  collectChips(px: number, py: number): number {
    let total = 0
    for (const c of this.chips) {
      if (c.collected) continue
      if (Math.hypot(px - c.x, py - c.y) < 28) {
        c.collected = true
        total += 10
      }
    }
    return total
  }

  getNearNPC(px: number): NPC | null {
    for (const n of this.npcs) {
      if (!n.data.talked && n.isNear(px)) return n
    }
    return null
  }

  checkTrigger(px: number): SectionTrigger | null {
    for (const s of this.sectionTriggers) {
      if (!s.fired && px > s.x) {
        s.fired = true
        return s
      }
    }
    return null
  }

  /** Crawler acid-drip damage check.  Returns 'hit' and consumes
   *  the striking drip so one damage per drip. */
  checkCrawlerDamage(ax: number, ay: number, aw: number, ah: number):
    'hit' | null {
    for (const c of this.crawlers) {
      if (c.checkDripHit(ax, ay, aw, ah)) return 'hit'
    }
    return null
  }

  /** Sentry Mine projectile damage check — + pattern bursts. */
  checkSentryProjectileDamage(
    ax: number, ay: number, aw: number, ah: number
  ): 'hit' | null {
    for (const m of this.sentryMines) {
      if (m.checkProjectileHit(ax, ay, aw, ah)) return 'hit'
    }
    return null
  }

  /** Wall Hugger leap-body damage check. */
  checkWallHuggerDamage(
    ax: number, ay: number, aw: number, ah: number
  ): 'hit' | null {
    for (const w of this.wallHuggers) {
      if (w.checkLeapHit(ax, ay, aw, ah)) return 'hit'
    }
    return null
  }

  /** Submit the player's current digit guess against the correct
   *  year.  Called by GameScene2 the moment `digitIndex` rolls
   *  past the last slot (SPACE confirm).  Mutates the terminal
   *  state and returns a typed event the scene uses to drive XP,
   *  NOVA dialogue, HUD messages, and screen shake. */
  submitCipherTerminal(t: CipherTerminal): CipherTerminalEvent {
    const entered = t.digits.join('')
    if (entered === t.correctYear) {
      t.active      = false
      t.isHacking   = false
      t.solvedTimer = TERMINAL_SOLVED_ANIM
      t.wrongFlash  = 0
      this.spawnTerminalSolvedBurst(t)
      return {
        type:       'solved',
        terminalId: t.id,
        era:        t.era,
        novaLine:   t.novaLine,
      }
    }
    // Wrong — reset progress, red flash, no dissolve.
    t.wrongFlash = TERMINAL_WRONG_FLASH
    t.digitIndex = 0
    t.digits     = [0, 0, 0, 0]
    return {
      type:       'wrong',
      terminalId: t.id,
      novaHint:   t.wrongNovaHint,
    }
  }

  private spawnTerminalSolvedBurst(t: CipherTerminal): void {
    // 8 sparks from the top of the terminal, green flavour.
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
      t.particles.push({
        x:     t.x,
        y:     t.y + 2,
        vx:    Math.cos(a) * (80 + Math.random() * 140),
        vy:    Math.sin(a) * (80 + Math.random() * 160),
        life:  0.6,
        color: i % 2 === 0 ? TERMINAL_SOLVED_COLOR : '#a8ffc8',
      })
    }
  }

  private spawnCheckpointBurst(cp: Checkpoint): void {
    for (let i = 0; i < 12; i++) {
      const off = (Math.random() - 0.5) * 120
      cp.particles.push({
        x:     cp.x + off,
        y:     cp.y - CP_POLE_H + 6,
        vx:    off * 1.4,
        vy:    -140 - Math.random() * 160,
        life:  0.6,
        color: CP_FLAG_ON_COLOR,
      })
    }
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p)
  }

  isInVaultChamber(px: number): boolean {
    if (this.vaultDoor.open) return false
    return px >= VAULT_CHAMBER_X_MIN && px <= VAULT_CHAMBER_X_MAX
  }

  // ─── TIMELINE PUZZLE ──────────────────────

  handleTimelineInput(
    input: InputManager, playerX: number, playerY: number
  ): TimelineCardEvent | null {
    const queued = this.pendingTimelineEvents.shift()
    if (queued) return queued

    if (!this.isInVaultChamber(playerX)) {
      for (const c of this.timelineCards) c.isHighlighted = false
      return null
    }

    const carried = this.timelineCards.find(c => c.isCarried) ?? null
    if (carried) {
      carried.worldX = playerX
      carried.worldY = playerY + CARD_CARRY_OFFSET_Y
    }

    for (const c of this.timelineCards) c.isHighlighted = false
    let highlighted: TimelineCard | null = null
    if (!carried) {
      let bestDist = CARD_PICKUP_RANGE
      for (const c of this.timelineCards) {
        if (c.placedSlot !== null && c.isCorrect) continue
        if (c.ejectTime > 0) continue   // card mid-bounceback
        const dist = Math.hypot(
          playerX - c.worldX,
          (playerY + 30) - c.worldY
        )
        if (dist < bestDist) { bestDist = dist; highlighted = c }
      }
      if (highlighted) highlighted.isHighlighted = true
    }

    if (input.isJustPressed('KeyZ')) {
      if (carried) {
        carried.isCarried = false
      } else if (highlighted) {
        highlighted.isCarried = true
        highlighted.isHighlighted = false
      }
    }

    if (input.isJustPressed('KeyE') && carried) {
      let best: TimelineSlot | null = null
      let bestDist = SLOT_PLACE_RANGE
      for (const s of this.timelineSlots) {
        if (s.filled) continue
        const dist = Math.abs(playerX - s.x)
        if (dist < bestDist) { bestDist = dist; best = s }
      }
      if (best) {
        if (carried.correctSlot === best.index) {
          carried.isCarried  = false
          carried.placedSlot = best.index
          carried.isCorrect  = true
          carried.worldX     = best.x
          carried.worldY     = best.y - 20
          best.filled = true
          best.cardId = carried.id
          this.vaultDoor.segments++
          const line = CARD_NOVA_LINES[carried.id - 1] ?? ''
          const ev: TimelineCardEvent = {
            type: 'placed_correct',
            cardId: carried.id,
            slotIndex: best.index,
            novaLine: line,
          }
          if (this.vaultDoor.segments >= VAULT_SEGMENT_COUNT && !this.vaultDoor.open) {
            this.vaultDoor.open       = true
            this.vaultDoor.openTimer  = 0
            this.vaultCipherCracked   = true
            this.timeComplete         = true
            this.pendingTimelineEvents.push({ type: 'vault_open' })
          }
          return ev
        } else {
          // WRONG — start bounce arc back to origin + red flash on slot.
          carried.isCarried  = false
          carried.ejectTime  = 0.01
          carried.ejectFromX = carried.worldX
          carried.ejectFromY = carried.worldY
          carried.wrongFlash = 0.6
          best.redFlash      = 0.5
          const hint = CARD_HINT_LINES[carried.id - 1] ?? ''
          return { type: 'placed_wrong', cardId: carried.id, novaHint: hint }
        }
      }
    }

    return null
  }

  // ─── EVIDENCE ──────────────────────────

  tryCollectEvidence(px: number, py: number): boolean {
    const p = this.evidencePedestal
    if (!p || p.collected) return false
    if (Math.hypot(px - p.x, py - p.y) < EVIDENCE_COLLECT_RANGE) {
      p.collected = true
      this.evidenceCollected = true
      return true
    }
    return false
  }

  // ─── UPDATE ─────────────────────────────

  update(dt: number, playerX: number = 0, playerY: number = 0): void {
    this.time += dt
    this.lastPlayerCenterX = playerX

    // Moving platforms — live x, same object reference inside platforms[]
    for (const mp of this.movingPlatforms) {
      const omega = mp.speed / mp.amplitude
      mp.x = mp.baseX + Math.sin(this.time * omega + mp.phase) * mp.amplitude
    }

    // Card wrong-flash + eject bounce arc
    for (const c of this.timelineCards) {
      if (c.wrongFlash > 0) c.wrongFlash = Math.max(0, c.wrongFlash - dt)
      if (c.ejectTime > 0) {
        c.ejectTime += dt
        const t = Math.min(1, c.ejectTime / 0.4)
        // Parabolic arc: lerp x/y with a negative sine for height.
        c.worldX = c.ejectFromX + (c.originX - c.ejectFromX) * t
        c.worldY = c.ejectFromY + (c.originY - c.ejectFromY) * t
                 - Math.sin(t * Math.PI) * 40
        if (t >= 1) {
          c.ejectTime = 0
          c.worldX = c.originX
          c.worldY = c.originY
        }
      }
    }

    // Slot red flash timers
    for (const s of this.timelineSlots) {
      if (s.redFlash > 0) s.redFlash = Math.max(0, s.redFlash - dt)
    }

    // Cipher-terminal screen anim + particle decay + solve/wrong
    // timers.  Digit input itself is driven by GameScene2.
    this.updateCipherTerminals(dt)

    // Checkpoint activation-burst particle decay.
    this.tickCheckpointVisuals(dt)

    // Vault zone safety — while the player is inside the timeline
    // chamber, pause every crawler whose beat overlaps the zone.
    const inVault = playerX >= 3700 && playerX <= 5700
    for (const c of this.crawlers) {
      const inside = c.x >= 3600 && c.x <= 5800
      c.patrolPaused = inside && inVault
    }

    // Vault door animation (segment-expand + fade)
    if (this.vaultDoor.open) {
      this.vaultDoor.openTimer += dt
      if (this.vaultDoor.openTimer < 0.5) {
        this.vaultDoor.expandH += 240 * dt    // 4px per frame at 60fps
      }
    }

    this.cameras.forEach(c => c.update(dt))
    this.npcs.forEach(n    => n.update(dt))

    // Crawlers — each gets player X so they know when to accelerate.
    for (const c of this.crawlers) {
      const wasLanded = c.isLanded()
      c.updateCrawler(dt, playerX, this.groundY)
      if (!wasLanded && c.isLanded()) {
        this.pendingCrawlerLandings.push({ x: c.x, y: this.groundY - 4 })
      }
    }
    // Cull fully dissolved crawlers.
    this.crawlers = this.crawlers.filter(c => !c.isDone())

    // Sentry Mines — charge/fire/cooldown + their own projectiles.
    for (const m of this.sentryMines) m.update(dt, playerX, playerY)
    this.sentryMines = this.sentryMines.filter(m => !m.isDone())

    // Wall Huggers — vertical patrol + leap attack.
    for (const w of this.wallHuggers) w.update(dt, playerX, playerY)
    this.wallHuggers = this.wallHuggers.filter(w => !w.isDone())

    // Projectile collisions — Level 2 enemy check order:
    //   Crawler → SentryMine → WallHugger → Knowledge-Lock orb.
    // Each projectile can only score one hit per frame.
    for (const p of this.projectiles) {
      p.update(dt)
      if (!p.active) continue
      const pr = p.getRect()

      // 1) Crawlers (lock-on homing lets these be hit from below).
      for (const c of this.crawlers) {
        if (!c.active) continue
        const cr = c.getRect()
        if (pr.x < cr.x+cr.w && pr.x+pr.w > cr.x &&
            pr.y < cr.y+cr.h && pr.y+pr.h > cr.y) {
          p.active = false
          c.takeHit()
          break
        }
      }
      if (!p.active) continue

      // 2) Sentry Mines
      for (const m of this.sentryMines) {
        if (!m.active) continue
        const mr = m.getRect()
        if (pr.x < mr.x+mr.w && pr.x+pr.w > mr.x &&
            pr.y < mr.y+mr.h && pr.y+pr.h > mr.y) {
          p.active = false
          m.takeHit()
          break
        }
      }
      if (!p.active) continue

      // 3) Wall Huggers
      for (const w of this.wallHuggers) {
        if (!w.active) continue
        const wr = w.getRect()
        if (pr.x < wr.x+wr.w && pr.x+pr.w > wr.x &&
            pr.y < wr.y+wr.h && pr.y+pr.h > wr.y) {
          p.active = false
          w.takeHit()
          break
        }
      }
      if (!p.active) continue

      // Cipher terminals are hacked, not shot — projectiles just
      // pass through them without triggering a hit check.
    }
    this.projectiles = this.projectiles.filter(p => p.active)
  }

  /** Per-frame animation work for the cipher terminals — screen
   *  phase scroll, solvedTimer/wrongFlash decay, particle physics. */
  private updateCipherTerminals(dt: number): void {
    for (const t of this.cipherTerminals) {
      t.screenPhase += dt
      if (t.isHacking) t.hackTimer += dt
      if (t.solvedTimer > 0)
        t.solvedTimer = Math.max(0, t.solvedTimer - dt)
      if (t.wrongFlash > 0)
        t.wrongFlash  = Math.max(0, t.wrongFlash  - dt)
      for (const p of t.particles) {
        p.x    += p.vx * dt
        p.y    += p.vy * dt
        p.vy   += 220 * dt
        p.life -= dt
      }
      t.particles = t.particles.filter(p => p.life > 0)
    }
  }

  private tickCheckpointVisuals(dt: number): void {
    for (const cp of this.checkpoints) {
      if (cp.activateTimer > 0)
        cp.activateTimer = Math.max(0, cp.activateTimer - dt)
      for (const p of cp.particles) {
        p.x    += p.vx * dt
        p.y    += p.vy * dt
        p.vy   += 180 * dt
        p.life -= dt
      }
      cp.particles = cp.particles.filter(p => p.life > 0)
    }
  }

  // ─── RENDER ────────────────────────────

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W  = CONFIG.CANVAS_WIDTH
    const GY = this.groundY

    ctx.imageSmoothingEnabled = false

    this.renderUndergroundBackdrop(ctx, cameraX, W, GY)
    this.renderCeiling(ctx, cameraX, W)
    this.renderArches(ctx, cameraX, W, GY)
    this.renderServerRacks(ctx, cameraX, W, GY)
    this.renderTorches(ctx, cameraX, W, GY)
    this.renderDarkOverlay(ctx, cameraX, W, GY)
    this.renderWaterFloor(ctx, W, GY)
    this.renderPlatforms(ctx, cameraX, W)
    this.renderChips(ctx, cameraX)
    this.renderCheckpoints(ctx, cameraX, GY)
    this.renderBurningRobots(ctx, cameraX, GY)
    this.renderGates(ctx, cameraX)
    this.renderCipherTerminals(ctx, cameraX)
    this.cameras.forEach(c => c.render(ctx, cameraX))
    this.sentryMines.forEach(m => m.render(ctx, cameraX))
    this.wallHuggers.forEach(w => w.render(ctx, cameraX))
    this.npcs.forEach(n    => n.render(ctx, cameraX))
    this.renderTimelineSlots(ctx, cameraX)
    this.renderTimelineCards(ctx, cameraX)
    this.renderVaultDoor(ctx, cameraX)
    this.renderArena(ctx, cameraX, GY)
    this.crawlers.forEach(c => c.render(ctx, cameraX))
    this.renderEvidencePedestal(ctx, cameraX)
    this.projectiles.forEach(p => p.render(ctx, cameraX))
    this.renderExit(ctx, cameraX, GY)
  }

  // ── Backdrop ────────────────────────────────────────
  private renderUndergroundBackdrop(
    ctx: CanvasRenderingContext2D, _cx: number, W: number, GY: number
  ): void {
    void _cx
    ctx.fillStyle = BG_BASE
    ctx.fillRect(0, CEILING_Y, W, GY - CEILING_Y)
    // Subtle vertical gradient — brown-dark upper, dim magenta-ish lower.
    const grad = ctx.createLinearGradient(0, CEILING_Y, 0, GY)
    grad.addColorStop(0, BG_TINT_TOP)
    grad.addColorStop(1, BG_TINT_MID)
    ctx.fillStyle   = grad
    ctx.globalAlpha = 0.8
    ctx.fillRect(0, CEILING_Y, W, GY - CEILING_Y)
    ctx.globalAlpha = 1
  }

  private renderCeiling(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number
  ): void {
    // Solid stone ceiling band.
    ctx.fillStyle = CEILING_BODY
    ctx.fillRect(0, 0, W, CEILING_Y)
    ctx.fillStyle = CEILING_BODY_DARK
    ctx.fillRect(0, 0, W, 14)
    // Horizontal cracks every CEILING_CRACK_SPACING px (world space, with parallax).
    ctx.strokeStyle = CEILING_CRACK
    ctx.lineWidth   = 1
    ctx.globalAlpha = 0.7
    for (let wx = 0; wx < this.worldWidth; wx += CEILING_CRACK_SPACING) {
      const sx = wx - cameraX * 0.9
      if (sx < -CEILING_CRACK_SPACING || sx > W + 10) continue
      const y = 30 + ((wx * 7) % 40)
      ctx.beginPath()
      ctx.moveTo(sx,     y)
      ctx.lineTo(sx + CEILING_CRACK_SPACING - 20, y + 6)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    // Bottom shadow line — separates ceiling from tunnel body.
    ctx.fillStyle = '#000000'
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, CEILING_Y - 3, W, 3)
    ctx.globalAlpha = 1
  }

  private renderArches(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number, GY: number
  ): void {
    const first = Math.floor(cameraX / PILLAR_SPACING) * PILLAR_SPACING - PILLAR_SPACING
    for (let wx = first; wx < cameraX + W + PILLAR_SPACING; wx += PILLAR_SPACING) {
      const sx = wx - cameraX
      // Two pillars per arch (visual only — no collision)
      ctx.fillStyle   = PILLAR_COLOR
      ctx.globalAlpha = 0.85
      ctx.fillRect(sx - PILLAR_W, CEILING_Y, PILLAR_W, GY - CEILING_Y)
      ctx.fillRect(sx + PILLAR_W, CEILING_Y, PILLAR_W, GY - CEILING_Y)
      ctx.globalAlpha = 1
      // Arch stroke connecting them
      ctx.strokeStyle = ARCH_STROKE
      ctx.lineWidth   = 3
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.moveTo(sx - PILLAR_W, CEILING_Y + 30)
      ctx.quadraticCurveTo(sx, CEILING_Y - 30, sx + PILLAR_W * 2, CEILING_Y + 30)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  private renderServerRacks(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number, GY: number
  ): void {
    // Very faint server-rack silhouettes far in the background.
    for (let wx = 0; wx < this.worldWidth; wx += 260) {
      const sx = wx - cameraX * 0.85
      if (sx < -40 || sx > W + 40) continue
      ctx.fillStyle   = '#3a1a08'
      ctx.globalAlpha = SERVER_RACK_ALPHA
      ctx.fillRect(sx, GY - 200, 28, 160)
      ctx.globalAlpha = SERVER_RACK_ALPHA * 0.8
      ctx.fillRect(sx + 40, GY - 180, 22, 140)
      ctx.globalAlpha = 1
    }
  }

  private renderTorches(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number, GY: number
  ): void {
    for (const wx of this.torchXs) {
      const sx = wx - cameraX
      if (sx < -TORCH_LIGHT_RADIUS || sx > W + TORCH_LIGHT_RADIUS) continue
      // Light cone — radial gradient downward.
      const grad = ctx.createRadialGradient(
        sx, CEILING_Y + 10, 10,
        sx, CEILING_Y + TORCH_LIGHT_RADIUS, TORCH_LIGHT_RADIUS
      )
      grad.addColorStop(0, `rgba(255,140,0,${TORCH_LIGHT_ALPHA + 0.04})`)
      grad.addColorStop(1, 'rgba(255,140,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(
        sx - TORCH_LIGHT_RADIUS,
        CEILING_Y,
        TORCH_LIGHT_RADIUS * 2,
        GY - CEILING_Y
      )
      // Torch body itself (little rect hanging from ceiling).
      ctx.fillStyle = '#2a1204'
      ctx.fillRect(sx - TORCH_W / 2, CEILING_Y, TORCH_W, TORCH_H)
      // Flame tip — warm orange with tiny flicker.
      const flick = 0.8 + Math.sin(this.time * 8 + wx * 0.03) * 0.2
      ctx.fillStyle   = TORCH_COLOR
      ctx.globalAlpha = flick
      ctx.fillRect(sx - 3, CEILING_Y + TORCH_H, 6, 6)
      ctx.fillStyle   = '#ffd27a'
      ctx.globalAlpha = flick * 0.8
      ctx.fillRect(sx - 2, CEILING_Y + TORCH_H + 2, 4, 3)
      ctx.globalAlpha = 1
    }
  }

  private renderDarkOverlay(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number, GY: number
  ): void {
    // Darken regions that are >DARK_OVERLAY_DIST from the nearest torch.
    // Approximate as 40-px strips — fast and still smooth enough.
    ctx.fillStyle = '#000000'
    const stripW = 40
    for (let x = 0; x < W; x += stripW) {
      const wx = x + cameraX + stripW / 2
      let dist = Infinity
      for (const tx of this.torchXs) {
        const d = Math.abs(wx - tx)
        if (d < dist) dist = d
      }
      if (dist > DARK_OVERLAY_DIST) {
        const falloff = Math.min(1, (dist - DARK_OVERLAY_DIST) / 300)
        ctx.globalAlpha = DARK_OVERLAY_ALPHA * falloff
        ctx.fillRect(x, CEILING_Y, stripW, GY - CEILING_Y)
      }
    }
    ctx.globalAlpha = 1
  }

  private renderWaterFloor(
    ctx: CanvasRenderingContext2D, W: number, GY: number
  ): void {
    // Dark water base fill (bottom area below the "walking" line).
    ctx.fillStyle = WATER_BASE
    ctx.fillRect(0, GY, W, CONFIG.CANVAS_HEIGHT - GY)

    // 3 animated sine-wave lines at different phases and y offsets.
    ctx.strokeStyle = WATER_WAVE
    ctx.lineWidth   = 1
    ctx.globalAlpha = WATER_WAVE_ALPHA
    for (let band = 0; band < 3; band++) {
      const baseY = GY + 8 + band * 10
      const phase = this.time * (1.2 + band * 0.3) + band * 0.9
      ctx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = baseY + Math.sin(x * 0.04 + phase) * 3
        if (x === 0) ctx.moveTo(x, y)
        else         ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Walking surface accent — a thin amber-ish separator line.
    ctx.fillStyle   = '#23120a'
    ctx.fillRect(0, GY - 2, W, 2)
    ctx.fillStyle   = PLATFORM_TOP
    ctx.globalAlpha = 0.35
    ctx.fillRect(0, GY - 1, W, 1)
    ctx.globalAlpha = 1
  }

  private renderPlatforms(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number
  ): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < 0 || sx > W) continue
      const isMoving = (p as MovingPlatform).baseX !== undefined
      // Body
      ctx.fillStyle = PLATFORM_BODY
      ctx.fillRect(sx, p.y, p.w, p.h)
      // Amber worn stone top
      ctx.fillStyle = PLATFORM_TOP
      ctx.fillRect(sx, p.y, p.w, 5)
      // Rough right edge
      ctx.fillStyle = PLATFORM_EDGE
      ctx.fillRect(sx + p.w - 3, p.y, 3, p.h)
      // Underside shadow
      ctx.fillStyle = '#050302'
      ctx.fillRect(sx, p.y + p.h - 3, p.w, 3)
      // Moss patches (seeded so each static platform looks consistent)
      const mossCount = p.mossCount ?? 0
      if (mossCount > 0) {
        ctx.fillStyle   = PLATFORM_MOSS
        ctx.globalAlpha = PLATFORM_MOSS_ALPHA
        const seed = p.mossSeed ?? 0
        for (let i = 0; i < mossCount; i++) {
          const rx = this.hash(seed + i * 7) % Math.max(1, p.w - 12)
          const rw = 6 + (this.hash(seed + i * 11) % 10)
          ctx.fillRect(sx + rx, p.y - 1, rw, 2)
        }
        ctx.globalAlpha = 1
      }
      // Moving — arrow indicator
      if (isMoving) {
        ctx.fillStyle   = PLATFORM_TOP
        ctx.globalAlpha = 0.6
        ctx.font        = `7px Orbitron, sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText('◄ ►', sx + p.w/2, p.y - 3)
        ctx.textAlign   = 'left'
        ctx.globalAlpha = 1
      }
    }
  }

  private renderChips(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const c of this.chips) {
      if (c.collected) continue
      const sx = c.x - cameraX
      if (sx < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue
      const pulse = Math.sin(this.time * 3 + c.x) * 0.2
      ctx.fillStyle   = '#ffcc00'
      ctx.globalAlpha = 0.8 + pulse
      ctx.fillRect(sx - 4, c.y - 4, 8, 8)
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.2
      ctx.fillRect(sx - 7, c.y - 7, 14, 14)
      ctx.globalAlpha = 1
    }
  }

  private renderGates(ctx: CanvasRenderingContext2D, cameraX: number): void {
    void ctx
    void cameraX
    // Arena wall gate stays open — Glitch Twin fight lives in GameScene2.
  }

  /** Cipher Terminal — tall server rack.  Blocks the path until
   *  solved; renders a scrolling matrix screen when idle, a digit
   *  selector when hacking, a green "CRACKED" screen when solved,
   *  and a red "WRONG" overlay on bad submits. */
  private renderCipherTerminals(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    for (const t of this.cipherTerminals) {
      const sx = t.x - cameraX
      if (sx < -80 || sx > W + 80) continue
      this.drawCipherTerminalBody(ctx, t, sx)
      this.drawCipherTerminalScreen(ctx, t, sx)
      this.drawTerminalKeyboard(ctx, t, sx)
      if (t.active &&
          Math.abs(this.lastPlayerCenterX - t.x) <= 80) {
        this.drawTerminalHackPrompt(ctx, t, sx)
      }
      this.drawTerminalParticles(ctx, t, cameraX)
    }
  }

  private drawCipherTerminalBody(
    ctx: CanvasRenderingContext2D, t: CipherTerminal, sx: number
  ): void {
    const x = sx - t.w / 2
    // Blocking glow on sides — amber pulse while active.
    if (t.active) {
      const pulse = 0.35 + Math.sin(this.time * 4) * 0.15
      ctx.fillStyle   = TERMINAL_AMBER
      ctx.globalAlpha = pulse * 0.55
      ctx.fillRect(x - 3, t.y,      3, t.h)
      ctx.fillRect(x + t.w, t.y,    3, t.h)
      ctx.globalAlpha = 1
    }
    // Dark metal body.
    ctx.fillStyle = TERMINAL_BODY_COLOR
    ctx.fillRect(x, t.y, t.w, t.h)
    // 1.5-px border.
    ctx.strokeStyle = TERMINAL_BORDER_COLOR
    ctx.lineWidth   = 1.5
    ctx.strokeRect(x + 0.25, t.y + 0.25, t.w - 0.5, t.h - 0.5)
    // Four corner bolts.
    ctx.fillStyle = TERMINAL_BOLT_COLOR
    const bolts: [number, number][] = [
      [x + 4,       t.y + 4],
      [x + t.w - 4, t.y + 4],
      [x + 4,       t.y + t.h - 4],
      [x + t.w - 4, t.y + t.h - 4],
    ]
    for (const [bx, by] of bolts) {
      ctx.beginPath()
      ctx.arc(bx, by, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    // Status LED — top-right of body.
    const ledX = x + t.w - 7
    const ledY = t.y + 7
    if (t.active) {
      const blink = 0.45 + 0.55 * Math.sin(this.time * Math.PI * 2)
      ctx.fillStyle   = '#ff4444'
      ctx.globalAlpha = blink
    } else {
      ctx.fillStyle   = '#00ff88'
      ctx.globalAlpha = 1
    }
    ctx.beginPath()
    ctx.arc(ledX, ledY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  private terminalEraAccent(era: string): string {
    if (era === 'THE NAMING')    return '#ff6b00'
    if (era === 'THE VISION')   return '#00ff88'
    if (era === 'THE EXPLOSION') return '#cc00ff'
    return TERMINAL_AMBER
  }

  /** Bottom keyboard strip — 3 rows of tiny key caps. */
  private drawTerminalKeyboard(
    ctx: CanvasRenderingContext2D, t: CipherTerminal, sx: number
  ): void {
    const x  = sx - t.w / 2
    const ky = t.y + t.h - TERMINAL_KEYBOARD_H
    ctx.fillStyle = '#0a0818'
    ctx.fillRect(x, ky, t.w, TERMINAL_KEYBOARD_H)
    let yy = ky + 5
    for (let row = 0; row < 3; row++) {
      let xx = x + 8
      for (let col = 0; col < 8; col++) {
        ctx.fillStyle = '#1e2a3a'
        ctx.fillRect(xx, yy, 3, 2)
        xx += 7
      }
      yy += 6
    }
  }

  /** Floating `[ E ] HACK` above the rack when the player is in range. */
  private drawTerminalHackPrompt(
    ctx: CanvasRenderingContext2D, t: CipherTerminal, sx: number
  ): void {
    const accent = this.terminalEraAccent(t.era)
    const pulse  = 0.6 + 0.4 * Math.sin(this.time * Math.PI * 4)
    ctx.save()
    ctx.fillStyle   = accent
    ctx.globalAlpha = pulse
    ctx.font        = `7px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    const hx = sx
    const hy = t.y - 18
    ctx.fillText('[ E ] HACK', hx, hy)
    // Small arrow pointing down at the terminal roof.
    ctx.beginPath()
    ctx.moveTo(hx - 5, hy + 8)
    ctx.lineTo(hx + 5, hy + 8)
    ctx.lineTo(hx,     hy + 14)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  private drawCipherTerminalScreen(
    ctx: CanvasRenderingContext2D, t: CipherTerminal, sx: number
  ): void {
    const x  = sx - t.w / 2
    const sy = t.y + TERMINAL_SCREEN_TOP_PAD
    const sw = t.w - 8
    const sh = TERMINAL_SCREEN_H
    const sxi = x + 4
    // Screen frame.
    ctx.fillStyle = TERMINAL_SCREEN_BG
    ctx.fillRect(sxi, sy, sw, sh)

    if (!t.active && t.solvedTimer <= 0) {
      // Fully solved long-term state — dim green CRACKED label.
      ctx.fillStyle   = '#003a18'
      ctx.fillRect(sxi, sy, sw, sh)
      ctx.fillStyle   = TERMINAL_SOLVED_COLOR
      ctx.globalAlpha = 0.6
      ctx.font        = `bold 7px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('CRACKED', sxi + sw / 2, sy + sh / 2 + 3)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
      return
    }

    if (t.solvedTimer > 0) {
      // Fresh-solve flash — full green + expanding CRACKED burst.
      ctx.fillStyle   = TERMINAL_SOLVED_COLOR
      ctx.globalAlpha = 0.2 + Math.sin(this.time * 12) * 0.1
      ctx.fillRect(sxi, sy, sw, sh)
      ctx.globalAlpha = 1
      ctx.fillStyle = TERMINAL_SOLVED_COLOR
      ctx.font      = `bold 8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('CRACKED', sxi + sw / 2, sy + sh / 2 + 3)
      ctx.textAlign = 'left'
      return
    }

    if (t.wrongFlash > 0) {
      ctx.fillStyle   = '#ff0000'
      ctx.globalAlpha = 0.2 * (t.wrongFlash / TERMINAL_WRONG_FLASH)
      ctx.fillRect(sxi, sy, sw, sh)
      ctx.globalAlpha = 1
    }

    if (t.isHacking) {
      this.drawTerminalRemoteSession(ctx, t, sxi, sy, sw, sh)
    } else {
      this.drawTerminalIdleUI(ctx, t, sxi, sy, sw, sh)
    }

    if (t.wrongFlash > 0) {
      ctx.fillStyle   = TERMINAL_WRONG_COLOR
      ctx.globalAlpha = t.wrongFlash / TERMINAL_WRONG_FLASH
      ctx.font        = `bold 7px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('WRONG', sxi + sw / 2, sy + sh - 6)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    }
  }

  private drawTerminalIdleUI(
    ctx: CanvasRenderingContext2D, t: CipherTerminal,
    sxi: number, sy: number, sw: number, sh: number
  ): void {
    const accent = this.terminalEraAccent(t.era)
    // Faint era-coloured glow from screen centre.
    const cx = sxi + sw / 2
    const cy = sy + sh / 2
    const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40)
    g.addColorStop(0, accent + '33')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(sxi, sy, sw, sh)

    // Matrix scroll — faint green chars scrolling downward.
    ctx.save()
    ctx.beginPath()
    ctx.rect(sxi, sy, sw, sh)
    ctx.clip()
    ctx.fillStyle   = TERMINAL_MATRIX_COLOR
    ctx.globalAlpha = 0.3
    ctx.font        = `9px Orbitron, monospace`
    const scroll = (t.screenPhase * 20) % 10
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 6; row++) {
        const yy = sy + row * 7 + scroll
        const ch = ((Math.floor(t.screenPhase * 10) + col * 7 + row * 3) % 16)
                     .toString(16).toUpperCase()
        ctx.fillText(ch, sxi + 4 + col * 10, yy)
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()

    ctx.fillStyle = accent
    ctx.font      = `bold 7px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(t.era, sxi + sw / 2, sy + 22)
    ctx.textAlign = 'left'
  }

  /** Full-screen overlay handles digits — rack screen shows link status. */
  private drawTerminalRemoteSession(
    ctx: CanvasRenderingContext2D, _t: CipherTerminal,
    sxi: number, sy: number, sw: number, sh: number
  ): void {
    ctx.fillStyle   = TERMINAL_SELECT_COLOR
    ctx.globalAlpha = 0.15
    ctx.fillRect(sxi, sy, sw, sh)
    ctx.globalAlpha = 1
    ctx.fillStyle = TERMINAL_SELECT_COLOR
    ctx.font      = `bold 6px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('◈ REMOTE', sxi + sw / 2, sy + sh / 2 - 2)
    ctx.font      = `5px Orbitron, sans-serif`
    ctx.fillText('SESSION', sxi + sw / 2, sy + sh / 2 + 8)
    ctx.textAlign = 'left'
  }

  private drawTerminalParticles(
    ctx: CanvasRenderingContext2D, t: CipherTerminal, cameraX: number
  ): void {
    for (const p of t.particles) {
      const sx = p.x - cameraX
      const a  = Math.max(0, p.life / 0.6)
      ctx.fillStyle   = p.color
      ctx.globalAlpha = a
      ctx.fillRect(sx - 1, p.y - 1, 3, 3)
    }
    ctx.globalAlpha = 1
  }

  /** Checkpoint pole + flag — dark/inactive by default, green
   *  waving flag + halo + activation burst when triggered. */
  private renderCheckpoints(
    ctx: CanvasRenderingContext2D, cameraX: number, GY: number
  ): void {
    for (const cp of this.checkpoints) {
      const sx = cp.x - cameraX
      if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) continue
      // Pole.
      ctx.fillStyle = CP_POLE_COLOR
      ctx.fillRect(sx - CP_POLE_W / 2, GY - CP_POLE_H, CP_POLE_W, CP_POLE_H)
      // Flag.
      const baseX = cp.x + 2
      const baseY = GY - CP_POLE_H
      if (cp.activated) {
        const w = Math.sin(this.time * 4) * 4
        const w2 = Math.sin(this.time * 4 + 0.8) * 4
        ctx.save()
        ctx.translate(baseX - cameraX, baseY)
        ctx.fillStyle = CP_FLAG_ON_COLOR
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(14, w)
        ctx.lineTo(22, w2 + 12)
        ctx.lineTo(0, 14)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        // Halo.
        const grad = ctx.createRadialGradient(
          sx, baseY + 7, 4,
          sx, baseY + 7, 50
        )
        grad.addColorStop(0, '#00ff8818')
        grad.addColorStop(1, 'rgba(0,255,136,0)')
        ctx.fillStyle = grad
        ctx.fillRect(sx - 50, baseY - 30, 100, 80)
      } else {
        ctx.fillStyle = CP_FLAG_OFF_COLOR
        ctx.fillRect(
          baseX - cameraX, baseY, CP_FLAG_W, CP_FLAG_H,
        )
      }
      // Activation burst particles.
      for (const p of cp.particles) {
        const psx = p.x - cameraX
        const a   = Math.max(0, p.life / 0.6)
        ctx.fillStyle   = p.color
        ctx.globalAlpha = a
        ctx.fillRect(psx - 1, p.y - 1, 3, 3)
      }
      ctx.globalAlpha = 1
    }
  }

  private renderTimelineSlots(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const anySlot = this.timelineSlots[0]
    if (!anySlot) return
    const pedestalY = anySlot.y + SLOT_H / 2 + 10
    const first = this.timelineSlots[0]!
    const last  = this.timelineSlots[this.timelineSlots.length - 1]!
    const pedestalX1 = first.x - SLOT_W / 2 - 10 - cameraX
    const pedestalX2 = last.x  + SLOT_W / 2 + 10 - cameraX
    ctx.fillStyle = PLATFORM_BODY
    ctx.fillRect(pedestalX1, pedestalY, pedestalX2 - pedestalX1, 20)
    ctx.fillStyle = PLATFORM_TOP
    ctx.fillRect(pedestalX1, pedestalY, pedestalX2 - pedestalX1, 3)

    for (const s of this.timelineSlots) {
      const sx = s.x - cameraX
      if (sx + SLOT_W < -40 || sx - SLOT_W > CONFIG.CANVAS_WIDTH + 40) continue
      const topX = sx - SLOT_W / 2
      const topY = s.y - SLOT_H / 2
      ctx.fillStyle = '#080408'
      ctx.fillRect(topX, topY, SLOT_W, SLOT_H)

      if (s.filled) {
        ctx.fillStyle   = s.color
        ctx.globalAlpha = 0.22
        ctx.fillRect(topX, topY, SLOT_W, SLOT_H)
        ctx.globalAlpha = 1
        const pulse = 0.55 + Math.sin(this.time * 2) * 0.25
        ctx.strokeStyle = s.color
        ctx.lineWidth   = 2
        ctx.globalAlpha = pulse
        ctx.strokeRect(topX, topY, SLOT_W, SLOT_H)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#ffffff'
        ctx.font      = `bold 11px Orbitron, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(s.year, sx, topY + 28)
        ctx.fillStyle = s.color
        ctx.font      = `bold 10px Orbitron, sans-serif`
        ctx.textAlign = 'right'
        ctx.fillText('✓', topX + SLOT_W - 8, topY + 14)
      } else {
        ctx.strokeStyle = s.color
        ctx.lineWidth   = 1
        ctx.globalAlpha = 0.65
        ctx.setLineDash([4, 4])
        ctx.strokeRect(topX, topY, SLOT_W, SLOT_H)
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.fillStyle   = s.color
        ctx.globalAlpha = 0.8
        ctx.font        = `bold 10px Orbitron, sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText(s.year, sx, topY + 30)
        ctx.globalAlpha = 1
        if (s.redFlash > 0) {
          ctx.fillStyle   = '#ff1744'
          ctx.globalAlpha = s.redFlash
          ctx.fillRect(topX, topY, SLOT_W, SLOT_H)
          ctx.globalAlpha = 1
        }
      }
      ctx.textAlign = 'left'
    }
  }

  private renderTimelineCards(ctx: CanvasRenderingContext2D, cameraX: number): void {
    for (const c of this.timelineCards) {
      const bobY = c.placedSlot !== null
        ? 0
        : Math.sin(this.time * 1.2 + c.floatSeed) * 10
      const rot  = c.placedSlot !== null
        ? 0
        : Math.sin(this.time * 0.6 + c.floatSeed) * (Math.PI / 45) // ±4°

      const sx = c.worldX - cameraX
      const sy = c.worldY + bobY
      if (sx + CARD_W < -80 || sx - CARD_W > CONFIG.CANVAS_WIDTH + 80) continue
      const color = CARD_COLORS[c.correctSlot] ?? '#ffffff'

      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(rot)
      const halfW = CARD_W / 2
      const halfH = CARD_H / 2
      const scale = c.placedSlot !== null ? 0.5 : 1
      ctx.scale(scale, scale)

      // Highlight outer glow (colored per card for readability)
      if (c.isHighlighted) {
        ctx.shadowBlur  = 18
        ctx.shadowColor = color
        ctx.strokeStyle = color
        ctx.lineWidth   = 2
        ctx.strokeRect(-halfW - 4, -halfH - 4, CARD_W + 8, CARD_H + 8)
        ctx.shadowBlur  = 0
      }

      // Card body
      ctx.fillStyle = '#080418'
      ctx.fillRect(-halfW, -halfH, CARD_W, CARD_H)

      // 6-px top bar in the card's unique color
      ctx.fillStyle = color
      ctx.fillRect(-halfW, -halfH, CARD_W, 6)

      // Outer border
      ctx.strokeStyle = color
      ctx.lineWidth   = 1
      ctx.globalAlpha = 0.6
      ctx.strokeRect(-halfW, -halfH, CARD_W, CARD_H)
      ctx.globalAlpha = 1

      // Year text (bold 14)
      ctx.fillStyle = '#ffffff'
      ctx.font      = `bold 14px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(c.year, 0, -halfH + 28)

      // Label (8 px, primary color)
      ctx.fillStyle = color
      ctx.font      = `8px Orbitron, sans-serif`
      ctx.fillText(c.label, 0, -halfH + 50)

      // Sublabel (6 px, muted)
      ctx.fillStyle = '#94a3b8'
      ctx.font      = `6px Orbitron, sans-serif`
      ctx.fillText(c.sublabel, 0, -halfH + 66)

      // Portrait silhouette — circle head + rect shoulders in primary color @25%
      ctx.fillStyle   = color
      ctx.globalAlpha = 0.25
      ctx.beginPath()
      ctx.arc(0, halfH - 28, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(-12, halfH - 22, 24, 20)
      ctx.globalAlpha = 1

      if (c.wrongFlash > 0) {
        ctx.fillStyle   = '#ff1744'
        ctx.globalAlpha = c.wrongFlash
        ctx.fillRect(-halfW, -halfH, CARD_W, CARD_H)
        ctx.globalAlpha = 1
      }
      if (c.placedSlot !== null && c.isCorrect) {
        ctx.fillStyle = '#00ff88'
        ctx.font      = `bold 20px Orbitron, sans-serif`
        ctx.fillText('✓', halfW - 14, -halfH + 28)
      }
      ctx.restore()
      ctx.textAlign = 'left'

      if (c.isHighlighted && !c.isCarried) {
        ctx.fillStyle   = color
        ctx.globalAlpha = 0.7 + Math.sin(this.time * 4) * 0.2
        ctx.font        = `bold 7px Orbitron, sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText('[Z] PICK UP', sx, sy + CARD_H / 2 + 14)
        ctx.textAlign   = 'left'
        ctx.globalAlpha = 1
      }
      if (c.isCarried) {
        ctx.fillStyle   = '#ff9100'
        ctx.globalAlpha = 0.85 + Math.sin(this.time * 6) * 0.15
        ctx.font        = `bold 7px Orbitron, sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText('[E] PLACE   [Z] DROP', sx, sy + CARD_H / 2 + 14)
        ctx.textAlign   = 'left'
        ctx.globalAlpha = 1
      }
    }
  }

  private renderVaultDoor(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const v = this.vaultDoor
    const sx = v.x - cameraX
    const totalW = VAULT_SEGMENT_COUNT * VAULT_SEGMENT_W
                 + (VAULT_SEGMENT_COUNT - 1) * VAULT_SEGMENT_GAP
    if (sx + totalW < -40 || sx > CONFIG.CANVAS_WIDTH + 40) return

    // Frame
    ctx.fillStyle = '#06030f'
    ctx.fillRect(sx - 8, v.y - 8, totalW + 16, v.h + 16)
    ctx.fillStyle = '#221611'
    ctx.fillRect(sx - 8, v.y - 8, 4, v.h + 16)
    ctx.fillRect(sx + totalW + 4, v.y - 8, 4, v.h + 16)

    // Title
    ctx.fillStyle   = '#ff9100'
    ctx.globalAlpha = 0.85
    ctx.font        = `bold 10px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText('VAULT 1956', sx + totalW / 2, v.y - 18)
    ctx.globalAlpha = 0.55
    ctx.font        = `7px Orbitron, sans-serif`
    ctx.fillText('SOLVE THE TIMELINE TO UNLOCK', sx + totalW / 2, v.y - 4)
    ctx.textAlign   = 'left'
    ctx.globalAlpha = 1

    const openAlpha = v.open
      ? Math.max(0, 1 - v.openTimer * 0.9)
      : 1

    for (let i = 0; i < VAULT_SEGMENT_COUNT; i++) {
      const segX = sx + i * (VAULT_SEGMENT_W + VAULT_SEGMENT_GAP)
      const lit  = i < v.segments
      const segColor = CARD_COLORS[i] ?? '#ff9100'
      const expand = v.open ? v.expandH : 0
      ctx.globalAlpha = openAlpha

      if (lit) {
        ctx.fillStyle = segColor
        ctx.fillRect(segX, v.y - expand, VAULT_SEGMENT_W, v.h + expand)
        ctx.shadowBlur  = 12
        ctx.shadowColor = segColor
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth   = 1
        ctx.strokeRect(segX, v.y - expand, VAULT_SEGMENT_W, v.h + expand)
        ctx.shadowBlur  = 0
        // Upward sparks (3/s per segment)
        for (let p = 0; p < 3; p++) {
          const pt = (this.time * 2 + i * 0.5 + p * 0.7) % 1
          const py = v.y + v.h - pt * v.h
          const px = segX + VAULT_SEGMENT_W / 2 + Math.sin(pt * Math.PI * 4) * 4
          ctx.fillStyle   = segColor
          ctx.globalAlpha = (1 - pt) * openAlpha
          ctx.fillRect(px, py, 2, 2)
        }
        ctx.globalAlpha = openAlpha
      } else {
        ctx.fillStyle = '#0a0408'
        ctx.fillRect(segX, v.y, VAULT_SEGMENT_W, v.h)
        ctx.strokeStyle = '#ff6b00'
        ctx.lineWidth   = 1
        ctx.globalAlpha = 0.4 * openAlpha
        ctx.strokeRect(segX, v.y, VAULT_SEGMENT_W, v.h)
        ctx.globalAlpha = openAlpha
      }
      ctx.globalAlpha = 1
    }

    // Grand-opening burst ring
    if (v.open && v.openTimer < 1.2) {
      const r = v.openTimer * 180
      ctx.strokeStyle = '#ffcc80'
      ctx.lineWidth   = 2
      ctx.globalAlpha = Math.max(0, 1 - v.openTimer * 0.85)
      ctx.beginPath()
      ctx.arc(sx + totalW / 2, v.y + v.h / 2, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  private renderArena(
    ctx: CanvasRenderingContext2D, cameraX: number, GY: number
  ): void {
    const s1 = ARENA_X_MIN - cameraX
    const s2 = ARENA_X_MAX - cameraX
    const W  = CONFIG.CANVAS_WIDTH
    if (s2 >= 0 && s1 <= W) {
      const visX = Math.max(s1, 0)
      const visW = Math.min(s2, W) - visX
      ctx.fillStyle   = '#1a0a2e'
      ctx.globalAlpha = 0.8
      ctx.fillRect(visX, GY - 6, visW, 10)
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#ff9100'
      ctx.lineWidth   = 0.5
      ctx.globalAlpha = 0.25 + Math.sin(this.time * 2) * 0.1
      for (let x = ARENA_X_MIN; x < ARENA_X_MAX; x += 30) {
        const sx = x - cameraX
        ctx.beginPath()
        ctx.moveTo(sx, GY - 4)
        ctx.lineTo(sx + 20, GY - 4)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

  }

  private renderEvidencePedestal(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const p = this.evidencePedestal
    if (!p) return
    const sx = p.x - cameraX
    if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) return
    const px = sx - EVIDENCE_PEDESTAL_W / 2
    const py = p.y
    // Stone pillar
    ctx.fillStyle = '#14080a'
    ctx.fillRect(px, py, EVIDENCE_PEDESTAL_W, EVIDENCE_PEDESTAL_H)
    ctx.fillStyle = '#2a110e'
    ctx.fillRect(px, py, EVIDENCE_PEDESTAL_W, 4)
    ctx.fillStyle = '#0a0408'
    ctx.fillRect(px, py + EVIDENCE_PEDESTAL_H - 6, EVIDENCE_PEDESTAL_W, 6)
    // Amber glow
    const glow = 0.5 + Math.sin(this.time * 2) * 0.3
    ctx.fillStyle   = '#ff9100'
    ctx.globalAlpha = 0.22 * glow
    ctx.beginPath()
    ctx.ellipse(sx, py, 44, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    if (!p.collected) {
      const cy = py - 14
      const pulse = Math.sin(this.time * 3) * 0.25
      ctx.fillStyle   = '#ffcc00'
      ctx.globalAlpha = 0.9 + pulse
      ctx.fillRect(sx - 7, cy - 7, 14, 14)
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.3
      ctx.fillRect(sx - 14, cy - 14, 28, 28)
      ctx.globalAlpha = 1
      ctx.fillStyle   = '#ff1744'
      ctx.globalAlpha = 0.75 + Math.sin(this.time * 4) * 0.2
      ctx.font        = `bold 8px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('DATA FRAGMENT', sx, py - 32)
      ctx.font        = `6px Orbitron, sans-serif`
      ctx.globalAlpha = 0.6
      ctx.fillText('walk to collect', sx, py - 20)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    } else {
      ctx.fillStyle   = '#2a1a12'
      ctx.globalAlpha = 0.6
      ctx.fillRect(sx - 6, py - 14, 12, 10)
      ctx.globalAlpha = 1
    }
  }

  private renderExit(
    ctx: CanvasRenderingContext2D, cameraX: number, GY: number
  ): void {
    if (!this.vaultDoor.open) return
    const ex = 10810 - cameraX
    const ey = GY - 120
    if (ex < -60 || ex > CONFIG.CANVAS_WIDTH + 60) return
    const pulse = 0.15 + Math.sin(this.time * 2) * 0.08
    ctx.fillStyle   = '#ff9100'
    ctx.globalAlpha = pulse
    ctx.fillRect(ex - 8, ey - 8, 56, 116)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#3d1a00'
    ctx.fillRect(ex, ey, 40, 100)
    ctx.strokeStyle = '#ff9100'
    ctx.lineWidth   = 2
    ctx.strokeRect(ex, ey, 40, 100)
    ctx.fillStyle   = '#ffcc80'
    ctx.globalAlpha = 0.1 + pulse
    ctx.fillRect(ex + 2, ey + 2, 36, 96)
    ctx.globalAlpha = 1
    ctx.fillStyle   = '#ff9100'
    ctx.font        = `bold 8px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText('DISTRICT 2', ex + 20, ey - 12)
    ctx.textAlign   = 'left'
  }

  private renderBurningRobots(
    ctx: CanvasRenderingContext2D, cameraX: number, GY: number
  ): void {
    const t  = this.time
    const fc = ['#ff4400', '#ff6600', '#ff9100', '#ffcc00']
    for (const robot of this.burningRobots) {
      const sx = robot.x - cameraX
      if (sx < -80 || sx > CONFIG.CANVAS_WIDTH + 80) continue
      ctx.save()
      ctx.translate(sx, GY - 6)
      ctx.rotate(0.3 + robot.splay * 0.05)
      ctx.fillStyle = '#0d0b18'
      ctx.fillRect(-14, -34, 28, 32)
      ctx.strokeStyle = '#ff4400'
      ctx.lineWidth   = 1
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.moveTo(-5, -30); ctx.lineTo(-1, -20); ctx.lineTo(-7, -14)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#0f0d20'
      ctx.fillRect(-9, -46, 18, 14)
      ctx.strokeStyle = '#ff1744'
      ctx.lineWidth   = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(-8,-44); ctx.lineTo(-4,-40)
      ctx.moveTo(-4,-44); ctx.lineTo(-8,-40)
      ctx.moveTo( 3,-44); ctx.lineTo( 7,-40)
      ctx.moveTo( 7,-44); ctx.lineTo( 3,-40)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
      for (let i = 0; i < 5; i++) {
        const fh = 16 + Math.sin(t*5 + i*1.3) * 8
        const fx = sx - 8 + i*5 + Math.sin(t*3+i) * 3
        const fy = GY - 38 - Math.sin(t*3+i) * 4
        ctx.fillStyle   = fc[i % 4] ?? '#ff9100'
        ctx.globalAlpha = 0.7 + Math.sin(t*6+i) * 0.2
        ctx.beginPath()
        ctx.moveTo(fx - 3, fy)
        ctx.lineTo(fx + 3, fy)
        ctx.lineTo(fx + Math.sin(t*4+i)*2, fy - fh)
        ctx.closePath()
        ctx.fill()
      }
      for (let i = 0; i < 3; i++) {
        const smX = sx - 4 + i*5 + Math.sin(t*0.8+i) * 6
        const smY = GY - 52 - i*16 - ((t*10 + i*8) % 28)
        ctx.fillStyle   = '#1a1428'
        ctx.globalAlpha = 0.2 - i*0.05
        ctx.beginPath()
        ctx.arc(smX, smY, 5 + i*2, 0, Math.PI*2)
        ctx.fill()
      }
      ctx.fillStyle   = '#0a0614'
      ctx.globalAlpha = 0.8
      ctx.fillRect(sx - 20, GY - 4, 40, 4)
      ctx.fillStyle   = '#ff4400'
      ctx.globalAlpha = 0.15
      ctx.fillRect(sx - 16, GY - 3, 32, 2)
      ctx.globalAlpha = 1
    }
  }

  // ── Deterministic seeded hash used by moss placement. Keeps
  //    platform decoration consistent between renders.
  private hash(seed: number): number {
    let s = (seed | 0) * 1664525 + 1013904223
    s = s ^ (s >>> 16)
    return (s >>> 0)
  }
}
