import { Drone }       from '../entities/Drone'
import { OldCamera }   from '../entities/OldCamera'
import { Projectile }  from '../entities/Projectile'
import { NPC, NPCData } from '../entities/NPC'
import { CONFIG }      from '../constants/config'

export interface Platform {
  x: number; y: number; w: number; h: number
}

interface QuizPanel {
  id:             number
  x:              number
  y:              number
  question:       string
  options:        string[]
  correct:        number
  answered:       boolean
  correct_answer: boolean
  triggered:      boolean
  unlocksGateId:  number
  explanation:    string
}

interface Gate {
  id:    number
  x:     number
  y:     number
  h:     number
  open:  boolean
  label: string
  color: string
}

interface MirrorItem {
  x: number; y: number; collected: boolean
}

interface SmartDoor {
  x:          number
  y:          number
  w:          number
  h:          number
  open:       boolean
  isStalled:  boolean
  stallTimer: number
  glowPhase:  number
}

interface BurningRobot {
  x: number; splay: number
}

export interface SectionTrigger {
  x:        number
  fired:    boolean
  dialogue: { speaker: 'NOVA'|'AX'|'KIRAN'|'NPC', text: string, expression?: string }[]
}

interface DataChip {
  x: number; y: number; collected: boolean
}

export class Level1 {
  readonly groundY:  number
  readonly levelEnd = 10500

  platforms:     Platform[]     = []
  drones:        Drone[]        = []
  cameras:       OldCamera[]    = []
  npcs:          NPC[]          = []
  quizPanels:    QuizPanel[]    = []
  gates:         Gate[]         = []
  projectiles:   Projectile[]   = []
  burningRobots: BurningRobot[] = []
  chips:         DataChip[]     = []
  mirrorItem:    MirrorItem | null = null
  smartDoor:     SmartDoor | null  = null

  hasMirror     = false
  levelComplete = false

  private time = 0
  private sectionTriggers: SectionTrigger[] = []

  constructor(groundY: number) {
    this.groundY = groundY
    this.buildLevel()
  }

  // ─── BUILDER ──────────────────────────

  private buildLevel(): void {
    const GY = this.groundY
    this.buildPlatforms(GY)
    this.buildDrones(GY)
    this.buildCameras(GY)
    this.buildNPCs(GY)
    this.buildQuizPanels(GY)
    this.buildGates(GY)
    this.buildBurningRobots()
    this.buildChips(GY)
    this.mirrorItem = { x: 5200, y: GY - 50, collected: false }
    this.smartDoor  = {
      x: 7800, y: GY - 130,
      w: 32, h: 130,
      open: false, isStalled: false,
      stallTimer: 0, glowPhase: 0
    }
    this.buildTriggers()
  }

  private buildPlatforms(GY: number): void {
    this.platforms = [
      // ─ ZONE 1: Tutorial Alley (0–2000) ─
      { x:  350, y: GY-110, w: 180, h: 16 },
      { x:  620, y: GY-170, w: 160, h: 16 },
      { x:  880, y: GY-120, w: 200, h: 16 },
      { x: 1160, y: GY-180, w: 160, h: 16 },
      { x: 1420, y: GY-110, w: 220, h: 16 },
      { x: 1700, y: GY-160, w: 160, h: 16 },
      { x: 1960, y: GY-120, w: 180, h: 16 },

      // ─ ZONE 2: Community Square (2200–4000) ─
      { x: 2300, y: GY-100, w: 240, h: 16 },
      { x: 2640, y: GY-160, w: 180, h: 16 },
      { x: 2920, y: GY-110, w: 200, h: 16 },
      { x: 3200, y: GY-170, w: 160, h: 16 },
      { x: 3460, y: GY-120, w: 220, h: 16 },
      { x: 3740, y: GY-160, w: 180, h: 16 },
      { x: 4000, y: GY-110, w: 200, h: 16 },

      // ─ ZONE 3: Server Alley (4200–6000) ─
      { x: 4300, y: GY-140, w: 180, h: 16 },
      { x: 4580, y: GY-200, w: 160, h: 16 },
      { x: 4840, y: GY-140, w: 200, h: 16 },
      { x: 5120, y: GY-180, w: 160, h: 16 },
      { x: 5380, y: GY-130, w: 220, h: 16 },
      { x: 5660, y: GY-170, w: 180, h: 16 },
      { x: 5920, y: GY-130, w: 200, h: 16 },

      // ─ ZONE 4: Mirror Shop (6200–7500) ─
      { x: 6200, y: GY-110, w: 220, h: 16 },
      { x: 6520, y: GY-170, w: 180, h: 16 },
      { x: 6800, y: GY-120, w: 200, h: 16 },
      { x: 7080, y: GY-160, w: 160, h: 16 },
      { x: 7340, y: GY-110, w: 220, h: 16 },

      // ─ ZONE 5: Smart Door Gauntlet (7800–10500) ─
      { x: 8000, y: GY-150, w: 180, h: 16 },
      { x: 8280, y: GY-210, w: 160, h: 16 },
      { x: 8540, y: GY-150, w: 200, h: 16 },
      { x: 8820, y: GY-190, w: 180, h: 16 },
      { x: 9100, y: GY-140, w: 220, h: 16 },
      { x: 9400, y: GY-180, w: 180, h: 16 },
      { x: 9680, y: GY-140, w: 200, h: 16 },
      { x: 9960, y: GY-170, w: 180, h: 16 },
      { x:10240, y: GY-130, w: 220, h: 16 },
    ]
  }

  private buildDrones(GY: number): void {
    this.drones = [
      new Drone( 450, GY-210,  140, 0,   38),
      new Drone( 720, GY-290,  0,   160, 42),
      new Drone(1000, GY-200,  120, 80,  45),
      new Drone(1280, GY-270,  0,   150, 42),
      new Drone(1560, GY-210,  110, 90,  48),
      new Drone(1840, GY-280,  0,   160, 44),
      new Drone(2400, GY-230,  130, 0,   52),
      new Drone(2700, GY-300,  0,   160, 55),
      new Drone(3000, GY-220,  120, 100, 58),
      new Drone(3300, GY-280,  0,   150, 55),
      new Drone(3600, GY-230,  130, 80,  60),
      new Drone(3900, GY-290,  0,   160, 58),
      new Drone(4450, GY-250,  140, 0,   65),
      new Drone(4720, GY-310,  0,   170, 68),
      new Drone(5000, GY-240,  130, 100, 70),
      new Drone(5280, GY-300,  0,   160, 68),
      new Drone(5560, GY-250,  120, 90,  72),
      new Drone(5840, GY-310,  0,   170, 70),
      new Drone(6300, GY-260,  150, 0,   72),
      new Drone(6600, GY-320,  0,   180, 75),
      new Drone(6900, GY-250,  140, 100, 78),
      new Drone(7200, GY-300,  0,   160, 75),
      new Drone(7500, GY-260,  120, 100, 78),
      new Drone(8100, GY-280,  160, 0,   82),
      new Drone(8400, GY-330,  0,   180, 85),
      new Drone(8700, GY-270,  150, 100, 88),
      new Drone(9000, GY-310,  0,   170, 85),
      new Drone(9300, GY-270,  140, 100, 88),
      new Drone(9600, GY-320,  0,   180, 90),
      new Drone(9900, GY-280,  160, 0,   88),
      new Drone(10200,GY-310,  0,   170, 92),
    ]
  }

  private buildCameras(GY: number): void {
    const positions = [
      300, 580, 860, 1120, 1480, 1760,
      2280, 2560, 2900, 3180, 3520, 3800,
      4280, 4640, 4920, 5200, 5500, 5780,
      6180, 6480, 6780, 7060, 7360,
      7980, 8260, 8560, 8840, 9120, 9420,
      9700, 9980, 10260,
    ]
    this.cameras = positions.map(x => new OldCamera(x, GY - 80))
  }

  private buildNPCs(GY: number): void {
    const npcs: NPCData[] = [
      {
        id: 'old_man',
        x: 260, y: GY,
        name: 'ELDER',
        color: '#2d3a4a',
        accentColor: '#94a3b8',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'You — young one. Be careful. The glowing machines above — they remember every face they see.' },
          { speaker:'AX',
            text:'They remember?' },
          { speaker:'NPC',
            text:'My grandson walked past one last week. Next day his school application was rejected. No reason given.' },
          { speaker:'NOVA',
            text:'The drone flagged him as a potential threat. NEXUS updated his risk score automatically.',
            expression:'warning' },
          { speaker:'NPC',
            text:'The dark cameras on the walls — those are old. Before NeuroCorps. They cannot think. They just watch.' },
        ]
      },
      {
        id: 'chai_grandma',
        x: 1900, y: GY,
        name: 'MALATHI',
        color: '#4a2a1a',
        accentColor: '#ff9100',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'Chai? No charge for someone running from those machines.' },
          { speaker:'AX',
            text:'Thank you. How long have you been here?' },
          { speaker:'NPC',
            text:'Thirty years. Same spot. Now NeuroCorps says this street is scheduled for demolition.' },
          { speaker:'NPC',
            text:'An algorithm decided. No human looked at my cart. No human asked.' },
          { speaker:'NOVA',
            text:'Her cart has been here longer than NeuroCorps has existed. The algorithm has no data for that.',
            expression:'warning' },
          { speaker:'AX',
            text:'We are going to fix this.' },
          { speaker:'NPC',
            text:'I have heard that before. But you have that light in your glasses. It is different somehow.' },
        ]
      },
      {
        id: 'young_coder',
        x: 3100, y: GY,
        name: 'PREET',
        color: '#1a2a4a',
        accentColor: '#00e5ff',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'Hey. You are AX right? Word travels fast in the Slums.' },
          { speaker:'AX',
            text:'What do you know about the drones?' },
          { speaker:'NPC',
            text:'I have been watching them. Each drone adjusts its patrol based on what it sees.' },
          { speaker:'NPC',
            text:'If you walk the same path twice — it learns you. Third time it is ready.' },
          { speaker:'NOVA',
            text:'That is machine learning in action. It updates its model from every interaction.',
            expression:'explaining' },
          { speaker:'NPC',
            text:'I figured out that if you change your movement pattern every time — it cannot predict you.' },
          { speaker:'AX',
            text:'Vary the input — disrupt the learning.' },
          { speaker:'NOVA',
            text:'Exactly. AI learns from patterns. Destroy the pattern — weaken the AI.',
            expression:'happy' },
        ]
      },
      {
        id: 'kiran',
        x: 3980, y: GY,
        name: 'KIRAN',
        color: '#1a1a2e',
        accentColor: '#e040fb',
        talked: false, isKiran: true,
        dialogue: [
          { speaker:'KIRAN',
            text:'Bhai. You are the one taking on NeuroCorps with a hacking tool?' },
          { speaker:'AX',
            text:'You know a better way?' },
          { speaker:'KIRAN',
            text:'I have an engineering degree. NeuroCorps AI said I was not suitable for technical work.' },
          { speaker:'KIRAN',
            text:'My school data was misclassified. Algorithm saw the label — never looked at my actual work.' },
          { speaker:'NOVA',
            text:'That is the problem. The AI learned from corrupted data and called the result objective.',
            expression:'warning' },
          { speaker:'KIRAN',
            text:'So I run a chai stall. And the algorithm thinks that proves it was right about me.' },
          { speaker:'AX',
            text:'Come with us. We are going to expose this.' },
          { speaker:'KIRAN',
            text:'I have been waiting three years for someone to say that. Lead the way bhai.' },
        ]
      },
      {
        id: 'repair_woman',
        x: 5100, y: GY,
        name: 'DEEPA',
        color: '#2a1a1a',
        accentColor: '#ff4444',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'My shop is destroyed. NeuroCorps bot walked through the wall last week.' },
          { speaker:'AX',
            text:'What were they looking for?' },
          { speaker:'NPC',
            text:'Nothing. The patrol algorithm calculated this was the optimal path. My shop was an obstacle.' },
          { speaker:'NOVA',
            text:'Input — process — output. The bot had no concept that a shop was there. Just an obstacle in its map.',
            expression:'explaining' },
          { speaker:'NPC',
            text:'There is a mirror fragment on the floor. From my display case. Take it — it is no use to me now.' },
          { speaker:'AX',
            text:'Thank you. I am sorry about your shop.' },
          { speaker:'NPC',
            text:'Bring the demolition orders down. That will be thanks enough.' },
        ]
      },
      {
        id: 'scared_man',
        x: 7600, y: GY,
        name: 'SURESH',
        color: '#1a2a1a',
        accentColor: '#00ff88',
        talked: false, isKiran: false,
        dialogue: [
          { speaker:'NPC',
            text:'Do not go near that door. It scanned my face. Now I am flagged as unauthorized.' },
          { speaker:'AX',
            text:'What happened when it flagged you?' },
          { speaker:'NPC',
            text:'Police bot arrived in four minutes. No officer. No explanation. Just removal.' },
          { speaker:'NOVA',
            text:'The smart lock feeds into NEXUS. One flag creates a chain reaction across all systems.',
            expression:'warning' },
          { speaker:'AX',
            text:'What if I show it something it has no data for?' },
          { speaker:'NOVA',
            text:'The mirror. AI only knows what it was trained on. Show it its own reflection — edge case. It stalls.',
            expression:'explaining' },
          { speaker:'NPC',
            text:'A mirror? That is insane enough to work.' },
        ]
      },
    ]
    this.npcs = npcs.map(d => new NPC(d))
  }

  private buildQuizPanels(GY: number): void {
    // Panels sit DIRECTLY ABOVE their gates. Hidden until the player
    // physically collides with the gate (see checkGateCollisionTrigger).
    this.quizPanels = [
      {
        id: 1, x: 1940, y: GY - 340,
        question: 'WHICH ONE IS AI?',
        options: [
          'A  Glowing drone (learns from scans)',
          'B  Dark camera (fixed, never changes)',
        ],
        correct: 0,
        answered: false, correct_answer: false,
        triggered: false,
        unlocksGateId: 1,
        explanation: 'RIGHT. If it learns from data — it is AI. Fixed rules forever — not AI.',
      },
      {
        id: 2, x: 4040, y: GY - 340,
        question: 'HOW DOES AI IMPROVE?',
        options: [
          'A  It follows fixed rules always',
          'B  It learns from every interaction',
        ],
        correct: 1,
        answered: false, correct_answer: false,
        triggered: false,
        unlocksGateId: 2,
        explanation: 'EXACTLY. Every scan updates the drone. That is machine learning working against us.',
      },
      {
        id: 3, x: 5960, y: GY - 340,
        question: 'WHAT IS NARROW AI?',
        options: [
          'A  Powerful at one task only',
          'B  Can do anything like a human',
        ],
        correct: 0,
        answered: false, correct_answer: false,
        triggered: false,
        unlocksGateId: 3,
        explanation: 'CORRECT. Every AI you have ever used is Narrow AI. Brilliant at one thing. Nothing else.',
      },
      {
        id: 4, x: 7520, y: GY - 340,
        question: 'AI FAILS WHEN SHOWN:',
        options: [
          'A  A face it recognizes',
          'B  Something outside its training data',
        ],
        correct: 1,
        answered: false, correct_answer: false,
        triggered: false,
        unlocksGateId: 4,
        explanation: 'YES. Show AI something it was never trained on and it has no response. Edge case.',
      },
    ]
  }

  private buildGates(GY: number): void {
    this.gates = [
      { id:1, x:2060, y:GY-200, h:200, open:false,
        label:'GATE 1', color:'#00e5ff' },
      { id:2, x:4160, y:GY-200, h:200, open:false,
        label:'GATE 2', color:'#e040fb' },
      { id:3, x:6080, y:GY-200, h:200, open:false,
        label:'GATE 3', color:'#ff9100' },
      { id:4, x:7640, y:GY-200, h:200, open:false,
        label:'GATE 4', color:'#00ff88' },
    ]
  }

  private buildBurningRobots(): void {
    const positions = [
      420, 820, 1300, 1800, 2420, 2950,
      3480, 4050, 4620, 5150, 5700,
      6250, 6800, 7350, 7950, 8500,
      9050, 9600, 10150,
    ]
    this.burningRobots = positions.map((x, i) => ({
      x, splay: (i % 3) - 1
    }))
  }

  private buildChips(GY: number): void {
    this.chips = this.platforms.map(p => ({
      x: p.x + p.w / 2,
      y: p.y - 20,
      collected: false,
    }))
    for (let x = 300; x < this.levelEnd; x += 220) {
      this.chips.push({ x, y: GY - 30, collected: false })
    }
  }

  /** Admin section jump — skip triggers, quizzes, and gates before startX. */
  applyStartSection(startX: number): void {
    for (const s of this.sectionTriggers) {
      if (s.x < startX) s.fired = true
    }
    for (const g of this.gates) {
      if (g.x < startX) g.open = true
    }
    for (const q of this.quizPanels) {
      const gate = this.gates.find(g => g.id === q.unlocksGateId)
      if (gate && gate.x < startX) {
        q.triggered       = true
        q.answered        = true
        q.correct_answer  = true
      }
    }
  }

  private buildTriggers(): void {
    this.sectionTriggers = [
      {
        x: 260, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'AX — those drones above use AI. They learn from every face they scan.',
            expression:'explaining' },
          { speaker:'AX',
            text:'The dark cameras on the walls?' },
          { speaker:'NOVA',
            text:'Old mechanical ones. No AI. Fixed program. Walk straight past.',
            expression:'explaining' },
          { speaker:'NOVA',
            text:'This is the most important rule: if it learns — it is AI. If it only follows fixed rules forever — it is not.',
            expression:'explaining' },
          { speaker:'AX',
            text:'Glowing and adapting equals AI. Dark and fixed equals not.' },
          { speaker:'NOVA',
            text:'Remember that for everything we face in this city.',
            expression:'happy' },
        ]
      },
      {
        x: 2200, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Community square. People still live here despite the demolition orders.',
            expression:'idle' },
          { speaker:'AX',
            text:'They refuse to leave.' },
          { speaker:'NOVA',
            text:'Their homes are their identity. NeuroCorps has no way to compute that.',
            expression:'warning' },
        ]
      },
      {
        x: 4250, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Server alley. Every rack you see is jury-rigged by residents for warmth and power.',
            expression:'idle' },
          { speaker:'AX',
            text:'NeuroCorps never upgraded the infrastructure out here.' },
          { speaker:'NOVA',
            text:'Deliberately. A district dependent on NeuroCorps is easier to control.',
            expression:'warning' },
        ]
      },
      {
        x: 4700, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:"Ahead is Deepa's repair shop. A patrol bot walked straight through her wall last week.",
            expression:'warning' },
          { speaker:'AX',
            text:'It just walked through her shop?' },
          { speaker:'NOVA',
            text:'Optimal path calculation. The bot had no concept of what was there. Input. Process. Output.',
            expression:'explaining' },
          { speaker:'AX',
            text:'We should pay our respects. She said there was a mirror fragment in the rubble.' },
          { speaker:'NOVA',
            text:'Find it. The smart door further ahead uses face recognition. The mirror is our bypass.',
            expression:'explaining' },
        ]
      },
      {
        x: 7750, fired: false,
        dialogue: [
          { speaker:'AX',
            text:'That door. Cyan scan beam. Smart lock.' },
          { speaker:'NOVA',
            text:'Face recognition AI. Walk up with the mirror and press F.',
            expression:'explaining' },
          { speaker:'NOVA',
            text:'It will try to classify its own reflection. No training data for that. Edge case. It stalls.',
            expression:'happy' },
        ]
      },
      {
        x: 8200, fired: false,
        dialogue: [
          { speaker:'NOVA',
            text:'Final stretch. More drones but you know what to do now.',
            expression:'explaining' },
          { speaker:'AX',
            text:'Vary the pattern. Disrupt the learning.' },
          { speaker:'NOVA',
            text:'You just described how to fight AI using AI knowledge. That is the whole point of this city.',
            expression:'happy' },
        ]
      },
    ]
  }

  // ─── COLLISION ────────────────────────

  checkPlatformCollision(
    ax: number, ay: number,
    aw: number, ah: number, vy: number
  ): number | null {
    if (vy < 0) return null
    const fy = ay + ah
    for (const p of this.platforms) {
      if (ax + aw < p.x + 4 || ax > p.x + p.w - 4) continue
      if (fy >= p.y && fy <= p.y + p.h + 10) return p.y - ah
    }
    return null
  }

  isGateBlocking(
    ax: number, ay: number, aw: number, ah: number
  ): boolean {
    for (const g of this.gates) {
      if (g.open) continue
      if (ax + aw > g.x && ax < g.x + 40 &&
          ay + ah > g.y && ay < g.y + g.h) return true
    }
    return false
  }

  /** Like isGateBlocking but returns the Gate itself (or null). */
  getBlockingGate(
    ax: number, ay: number, aw: number, ah: number
  ): Gate | null {
    for (const g of this.gates) {
      if (g.open) continue
      if (ax + aw > g.x && ax < g.x + 40 &&
          ay + ah > g.y && ay < g.y + g.h) {
        return g
      }
    }
    return null
  }

  tryUseMirror(px: number): boolean {
    const d = this.smartDoor
    if (!d || d.open || d.isStalled || !this.hasMirror) return false
    if (Math.abs(px - (d.x + d.w / 2)) > 130) return false
    d.isStalled  = true
    d.stallTimer = 4
    return true
  }

  checkMirrorPickup(px: number, py: number): boolean {
    const m = this.mirrorItem
    if (!m || m.collected) return false
    if (Math.hypot(px - m.x, py - m.y) < 55) {
      m.collected = true
      return true
    }
    return false
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

  getNearQuiz(px: number): QuizPanel | null {
    for (const q of this.quizPanels) {
      if (!q.triggered) continue
      if (q.answered && q.correct_answer) continue
      if (Math.abs(px - (q.x + 140)) < 200) return q
    }
    return null
  }

  /**
   * Called every frame with the player's AABB. If the player is colliding
   * with a CLOSED gate whose quiz has not been triggered yet, mark the
   * quiz as triggered and return true so the caller can fire a dialogue.
   */
  checkGateCollisionTrigger(
    ax: number, ay: number, aw: number, ah: number
  ): boolean {
    for (const g of this.gates) {
      if (g.open) continue
      if (ax + aw > g.x && ax < g.x + 40 &&
          ay + ah > g.y && ay < g.y + g.h) {
        const q = this.quizPanels.find(qq => qq.unlocksGateId === g.id)
        if (q && !q.triggered && !(q.answered && q.correct_answer)) {
          q.triggered = true
          return true
        }
      }
    }
    return false
  }

  answerQuiz(q: QuizPanel, choice: number): boolean {
    const correct = (choice === q.correct)
    q.answered       = true
    q.correct_answer = correct
    if (correct) {
      const gate = this.gates.find(g => g.id === q.unlocksGateId)
      if (gate) gate.open = true
    } else {
      setTimeout(() => { q.answered = false }, 2000)
    }
    return correct
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

  isDetected(px: number, py: number): boolean {
    return this.drones.some(d => d.isDetecting(px, py))
  }

  addProjectile(p: Projectile): void {
    this.projectiles.push(p)
  }

  update(dt: number): void {
    this.time += dt
    this.drones.forEach(d  => d.update(dt))
    this.cameras.forEach(c => c.update(dt))
    this.npcs.forEach(n    => n.update(dt))

    const door = this.smartDoor
    if (door?.isStalled) {
      door.stallTimer -= dt
      door.glowPhase  += dt * 8
      if (door.stallTimer <= 0) {
        door.isStalled = false
        door.open      = true
      }
    }

    for (const p of this.projectiles) {
      p.update(dt)
      if (!p.active) continue
      const pr = p.getRect()
      for (const d of this.drones) {
        if (!d.active) continue
        const dr = d.getRect()
        if (pr.x < dr.x+dr.w && pr.x+pr.w > dr.x &&
            pr.y < dr.y+dr.h && pr.y+pr.h > dr.y) {
          p.active = false
          d.takeHit()
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.active)
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const W  = CONFIG.CANVAS_WIDTH
    const GY = this.groundY

    this.renderPlatforms(ctx, cameraX, W)
    this.renderChips(ctx, cameraX)
    this.renderBurningRobots(ctx, cameraX, GY)
    this.renderMirrorItem(ctx, cameraX)
    this.renderGates(ctx, cameraX)
    this.renderQuizPanels(ctx, cameraX)
    this.cameras.forEach(c => c.render(ctx, cameraX))
    this.drones.forEach(d  => d.render(ctx, cameraX))
    this.npcs.forEach(n    => n.render(ctx, cameraX))
    this.renderSmartDoor(ctx, cameraX)
    this.projectiles.forEach(p => p.render(ctx, cameraX))
    this.renderExit(ctx, cameraX, GY)
  }

  private renderPlatforms(
    ctx: CanvasRenderingContext2D, cameraX: number, W: number
  ): void {
    for (const p of this.platforms) {
      const sx = p.x - cameraX
      if (sx + p.w < 0 || sx > W) continue
      ctx.fillStyle = '#12082a'
      ctx.fillRect(sx, p.y, p.w, p.h)
      ctx.fillStyle   = '#e040fb'
      ctx.globalAlpha = 1
      ctx.fillRect(sx, p.y, p.w, 5)
      ctx.fillStyle   = '#9c27b0'
      ctx.globalAlpha = 0.5
      ctx.fillRect(sx, p.y, 2, p.h)
      ctx.fillRect(sx + p.w - 2, p.y, 2, p.h)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#0a0416'
      ctx.fillRect(sx, p.y + p.h - 4, p.w, 4)
    }
  }

  private renderChips(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
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

  private renderGates(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    for (const g of this.gates) {
      const sx = g.x - cameraX
      if (sx + 40 < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue

      if (g.open) {
        // Open — just a dim arch remains
        ctx.strokeStyle = '#003322'
        ctx.lineWidth   = 1
        ctx.strokeRect(sx, g.y, 40, g.h)
        ctx.fillStyle   = '#00ff88'
        ctx.globalAlpha = 0.5
        ctx.font        = `bold 8px Orbitron, sans-serif`
        ctx.textAlign   = 'center'
        ctx.fillText('OPEN', sx + 20, g.y - 10)
        ctx.textAlign   = 'left'
        ctx.globalAlpha = 1
        continue
      }

      const pulse = 0.6 + Math.sin(this.time * 2.5) * 0.35

      // Solid gate wall
      ctx.fillStyle = '#06021a'
      ctx.fillRect(sx, g.y, 40, g.h)

      // Thick glowing vertical edges
      ctx.fillStyle   = g.color
      ctx.globalAlpha = pulse
      ctx.fillRect(sx,      g.y, 5, g.h)
      ctx.fillRect(sx + 35, g.y, 5, g.h)
      ctx.globalAlpha = 1

      // Horizontal security bars
      for (let by = g.y + 16; by < g.y + g.h - 8; by += 24) {
        ctx.fillStyle = '#0c0828'
        ctx.fillRect(sx + 5, by, 30, 12)
        ctx.fillStyle   = g.color
        ctx.globalAlpha = 0.15
        ctx.fillRect(sx + 5, by, 30, 2)
        ctx.globalAlpha = 1
      }

      // Lock unit in center
      const lockY = g.y + g.h / 2 - 20
      ctx.fillStyle = '#0a0620'
      ctx.fillRect(sx + 8, lockY, 24, 40)
      ctx.strokeStyle = g.color
      ctx.lineWidth   = 1.5
      ctx.strokeRect(sx + 8, lockY, 24, 40)

      // Blinking lock light
      const blink = Math.sin(this.time * 4) > 0
      ctx.fillStyle   = blink ? g.color : '#0a0620'
      ctx.globalAlpha = blink ? 0.9 : 0.3
      ctx.fillRect(sx + 14, lockY + 8, 12, 8)
      ctx.globalAlpha = 1

      // Padlock icon
      ctx.strokeStyle = g.color
      ctx.lineWidth   = 1
      ctx.globalAlpha = 0.7
      ctx.strokeRect(sx + 14, lockY + 20, 12, 10)
      ctx.beginPath()
      ctx.arc(sx + 20, lockY + 20, 5, Math.PI, 0)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Large gate label
      ctx.fillStyle   = g.color
      ctx.globalAlpha = 1
      ctx.font        = `bold 9px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText(g.label, sx + 20, g.y - 28)

      // LOCKED subtitle
      ctx.fillStyle   = g.color
      ctx.globalAlpha = pulse
      ctx.font        = `7px Orbitron, sans-serif`
      ctx.fillText('LOCKED', sx + 20, g.y - 14)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1

      // Dashed connector — quiz panel → gate
      const quiz = this.quizPanels.find(
        q => q.unlocksGateId === g.id
      )
      if (quiz && quiz.triggered && !quiz.answered) {
        const qsx  = quiz.x - cameraX + 120
        const qsy  = quiz.y + 50
        const gTop = g.y
        if (qsx > -20 && qsx < CONFIG.CANVAS_WIDTH + 20) {
          ctx.strokeStyle = g.color
          ctx.lineWidth   = 1
          ctx.globalAlpha = 0.25
          ctx.setLineDash([6, 4])
          ctx.beginPath()
          ctx.moveTo(qsx, qsy)
          ctx.lineTo(sx + 20, gTop)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
        }
      }
    }
  }

  private renderQuizPanels(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    for (const q of this.quizPanels) {
      if (!q.triggered) continue
      if (q.answered && q.correct_answer) continue

      const sx = q.x - cameraX
      const bw = 280
      const bh = 120
      if (sx + bw < -20 || sx > CONFIG.CANVAS_WIDTH + 20) continue

      const gate  = this.gates.find(g => g.id === q.unlocksGateId)
      const color = gate?.color || '#00e5ff'

      // Drop shadow
      ctx.fillStyle   = '#000000'
      ctx.globalAlpha = 0.5
      ctx.fillRect(sx + 4, q.y + 4, bw, bh)
      ctx.globalAlpha = 1

      // Panel body
      ctx.fillStyle = '#08041e'
      ctx.fillRect(sx, q.y, bw, bh)

      // Top color bar
      ctx.fillStyle = color
      ctx.fillRect(sx, q.y, bw, 5)

      // Border
      ctx.strokeStyle = color
      ctx.lineWidth   = 2
      ctx.strokeRect(sx, q.y, bw, bh)

      // Inner glow
      ctx.fillStyle   = color
      ctx.globalAlpha = 0.04
      ctx.fillRect(sx + 2, q.y + 5, bw - 4, bh - 7)
      ctx.globalAlpha = 1

      // Question text
      ctx.fillStyle = '#ffffff'
      ctx.font      = `bold 10px Orbitron, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(q.question, sx + 12, q.y + 26)

      // Divider
      ctx.strokeStyle = color
      ctx.lineWidth   = 0.5
      ctx.globalAlpha = 0.4
      ctx.beginPath()
      ctx.moveTo(sx + 8,      q.y + 34)
      ctx.lineTo(sx + bw - 8, q.y + 34)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Option A (amber)
      ctx.fillStyle = '#ff9100'
      ctx.font      = `bold 9px Orbitron, sans-serif`
      ctx.fillText('[Z]', sx + 12, q.y + 56)
      ctx.fillStyle = '#ffe0b2'
      ctx.font      = `8px Orbitron, sans-serif`
      ctx.fillText((q.options[0] ?? '').substring(2), sx + 44, q.y + 56)

      // Option B (magenta)
      ctx.fillStyle = '#e040fb'
      ctx.font      = `bold 9px Orbitron, sans-serif`
      ctx.fillText('[E]', sx + 12, q.y + 80)
      ctx.fillStyle = '#f3e5f5'
      ctx.font      = `8px Orbitron, sans-serif`
      ctx.fillText((q.options[1] ?? '').substring(2), sx + 44, q.y + 80)

      // Footer hint
      ctx.fillStyle   = color
      ctx.globalAlpha = 0.6
      ctx.font        = `7px Orbitron, sans-serif`
      ctx.textAlign   = 'right'
      ctx.fillText(`UNLOCKS ${gate?.label || ''}`, sx + bw - 8, q.y + bh - 8)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1

      // Wrong answer flash
      if (q.answered && !q.correct_answer) {
        ctx.fillStyle   = '#ff1744'
        ctx.globalAlpha = 0.9
        ctx.fillRect(sx, q.y + bh - 26, bw, 26)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#ffffff'
        ctx.font      = `bold 8px Orbitron, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText('WRONG — TRY AGAIN', sx + bw / 2, q.y + bh - 10)
        ctx.textAlign = 'left'
      }

      // Pulsing arrow above
      const arrowPulse = 0.5 + Math.sin(this.time * 3) * 0.4
      ctx.fillStyle   = color
      ctx.globalAlpha = arrowPulse
      ctx.font        = `bold 14px Orbitron, sans-serif`
      ctx.textAlign   = 'center'
      ctx.fillText('▼', sx + bw / 2, q.y - 8)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    }
  }

  private renderMirrorItem(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    const m = this.mirrorItem
    if (!m || m.collected) return
    const sx = m.x - cameraX
    if (sx < -60 || sx > CONFIG.CANVAS_WIDTH + 60) return
    const pulse = Math.sin(this.time * 3) * 0.2
    ctx.fillStyle   = '#ffffff'
    ctx.globalAlpha = 0.07 + pulse * 0.03
    ctx.fillRect(sx - 28, m.y - 36, 56, 52)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#334155'
    ctx.fillRect(sx - 16, m.y - 24, 32, 38)
    ctx.fillStyle   = '#e2e8f0'
    ctx.globalAlpha = 0.9
    ctx.fillRect(sx - 12, m.y - 20, 24, 30)
    ctx.fillStyle   = '#ffffff'
    ctx.globalAlpha = 0.45 + pulse
    ctx.fillRect(sx - 9, m.y - 17, 9, 16)
    ctx.globalAlpha = 1
    ctx.fillStyle   = '#ffffff'
    ctx.font        = `bold 8px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    ctx.globalAlpha = 0.9 + pulse
    ctx.fillText('[MIRROR]', sx, m.y - 30)
    ctx.globalAlpha = 0.55
    ctx.font        = `6px Orbitron, sans-serif`
    ctx.fillText('walk to collect', sx, m.y + 22)
    ctx.textAlign   = 'left'
    ctx.globalAlpha = 1
  }

  private renderSmartDoor(
    ctx: CanvasRenderingContext2D, cameraX: number
  ): void {
    const d = this.smartDoor
    if (!d) return
    const sx = d.x - cameraX
    if (sx + d.w < -20 || sx > CONFIG.CANVAS_WIDTH + 20) return

    if (d.open) {
      ctx.strokeStyle = '#004455'
      ctx.lineWidth   = 1
      ctx.strokeRect(sx, d.y, d.w, d.h)
      return
    }

    ctx.fillStyle = '#060318'
    ctx.fillRect(sx - 4, d.y, d.w + 8, d.h)

    if (d.isStalled) {
      const fl = 0.6 + Math.sin(d.glowPhase) * 0.4
      ctx.strokeStyle = '#ff9100'
      ctx.lineWidth   = 3
      ctx.globalAlpha = fl
      ctx.strokeRect(sx - 4, d.y, d.w + 8, d.h)
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.07 * fl
      for (let sy = d.y; sy < d.y + d.h; sy += 6) {
        ctx.fillRect(sx - 4, sy, d.w + 8, 2)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ff9100'
      ctx.font      = `bold 8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.globalAlpha = fl
      ctx.fillText('CONFUSED...', sx + d.w/2, d.y - 18)
      ctx.fillText(`${Math.ceil(d.stallTimer)}s`, sx + d.w/2, d.y - 4)
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
    } else {
      const pulse = 0.7 + Math.sin(this.time * 3) * 0.3
      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth   = 3
      ctx.globalAlpha = pulse
      ctx.strokeRect(sx - 4, d.y, d.w + 8, d.h)
      ctx.fillStyle   = '#00e5ff'
      ctx.globalAlpha = 0.05 * pulse
      for (let sy = d.y; sy < d.y + d.h; sy += 8) {
        ctx.fillRect(sx - 4, sy, d.w + 8, 3)
      }
      const beam = Math.sin(this.time * 2) * 30
      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth   = 0.8
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.moveTo(sx - 4, d.y + d.h/2)
      ctx.lineTo(sx - 110 + beam, d.y + d.h/2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#00e5ff'
      ctx.font      = `bold 8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('SMART LOCK', sx + d.w/2, d.y - 18)
      if (this.hasMirror) {
        ctx.fillStyle   = '#ff9100'
        ctx.globalAlpha = 0.9 + Math.sin(this.time * 4) * 0.1
        ctx.fillText('[F] USE MIRROR', sx + d.w/2, d.y - 4)
      } else {
        ctx.fillStyle   = '#94a3b8'
        ctx.globalAlpha = 0.7
        ctx.fillText('need mirror first', sx + d.w/2, d.y - 4)
      }
      ctx.textAlign = 'left'
      ctx.globalAlpha = 1
    }

    ctx.fillStyle   = '#0f0930'
    ctx.globalAlpha = 0.8
    for (let by = d.y + 12; by < d.y + d.h; by += 18) {
      ctx.fillRect(sx, by, d.w, 8)
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = d.isStalled ? '#331100' : '#003344'
    ctx.fillRect(sx + 4, d.y + d.h/2 - 14, d.w - 8, 28)
    ctx.fillStyle = d.isStalled
      ? '#ff9100'
      : (Math.sin(this.time * 4) > 0 ? '#00e5ff' : '#002233')
    ctx.globalAlpha = 0.9
    ctx.fillRect(sx + 8, d.y + d.h/2 - 6, d.w - 16, 12)
    ctx.globalAlpha = 1
  }

  private renderExit(
    ctx: CanvasRenderingContext2D, cameraX: number, GY: number
  ): void {
    if (!this.smartDoor?.open) return
    const ex = 10460 - cameraX
    const ey = GY - 120
    if (ex < -60 || ex > CONFIG.CANVAS_WIDTH + 60) return
    const pulse = 0.15 + Math.sin(this.time * 2) * 0.08
    ctx.fillStyle   = '#00e5ff'
    ctx.globalAlpha = pulse
    ctx.fillRect(ex - 8, ey - 8, 56, 116)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#003344'
    ctx.fillRect(ex, ey, 40, 100)
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth   = 2
    ctx.strokeRect(ex, ey, 40, 100)
    ctx.fillStyle   = '#00ffff'
    ctx.globalAlpha = 0.1 + pulse
    ctx.fillRect(ex + 2, ey + 2, 36, 96)
    ctx.globalAlpha = 1
    ctx.fillStyle   = '#00e5ff'
    ctx.font        = `bold 8px Orbitron, sans-serif`
    ctx.textAlign   = 'center'
    ctx.fillText('EXIT', ex + 20, ey - 12)
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
}
