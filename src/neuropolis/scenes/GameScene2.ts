import { InputManager }       from '../engine/InputManager'
import { GameLoop }           from '../engine/GameLoop'
import { Camera }             from '../engine/Camera'
import { Player }             from '../entities/Player'
import { Projectile }         from '../entities/Projectile'
import { ParallaxBackground } from '../world/ParallaxBackground'
import {
  Level2,
  CipherTerminal,
  Checkpoint,
  TERMINAL_WALK_AWAY,
}                             from '../world/Level2'
import { HUD }                from '../ui/HUD'
import { DialogueBox }        from '../ui/DialogueBox'
import { NovaOrb }            from '../ui/NovaOrb'
import { CONFIG }             from '../constants/config'
import { TouchControls } from '../ui/TouchControls'
import {
  GlitchTwinBoss,
  ARENA_GROUND_Y,
} from '../bosses/GlitchTwinBoss'

// Structural lock-on target — matches Projectile.LockTarget so any
// object with x/y/active works (Crawler, WallHugger, …).  Keeps the
// lock-on system decoupled from the Drone class hierarchy since
// Level 2 no longer contains any Drones.
type LockableEnemy = { x: number; y: number; active: boolean }

// ──────────────────────────────────────────────────────────────
// LEVEL 2 — "THE VAULT" SCENE.
// Full rebuild against the Level 2 bible (PROJECT.md §13).
// Shares engine with GameScene but swaps enemy type, particle
// palette, shake model, evidence cinematic and backdrop.  AX
// does not know it's running a different scene — everything
// below the bg/level swap is the same controller.
// ──────────────────────────────────────────────────────────────

type Scene        = 'play' | 'dialogue'
type SpeakerTag   = 'NOVA' | 'AX' | 'KIRAN' | 'NPC'
type DialogueLine = { speaker: SpeakerTag; text: string; expression?: string }

interface Explosion {
  x:     number
  y:     number
  t:     number
  maxT:  number
  color: string
}

// ═══ SCENE TUNING ═════════════════════════════════════════════
const WORLD_WIDTH           = 11000
const LEVEL_END_X           = 10850
const SHOOT_COOLDOWN        = 0.28
const DAMAGE_IFRAMES        = 1.5
const DETECT_COOLDOWN       = 2.5
const SLOWMO_SCALE          = 0.25
const SLOWMO_DURATION_MS    = 2500
const VIGNETTE_ALPHA        = 0.5
const LOCK_RANGE            = 520
const SPAWN_X               = 180

// Enemy explosion colors + XP — Level 2 roster is Crawler /
// SentryMine / WallHugger only.  Drones and EchoDrones were
// removed in the Level-2 cleanup pass.
const CRAWLER_EXPLOSION_COLOR = '#39ff14'
const MINE_EXPLOSION_COLOR    = '#cc00ff'
const HUGGER_EXPLOSION_COLOR  = '#ff8c00'
const CRAWLER_XP              = 75
const SENTRY_XP               = 60
const HUGGER_XP               = 65

// Reticle colour — matches GameScene (Level 1).
const RETICLE_COLOR           = '#ff9100'

// Cipher-terminal rewards (Fix 1 replaces Knowledge Locks)
const TERMINAL_SOLVE_XP       = 150
const TERMINAL_SHAKE_CORRECT  = 5
const TERMINAL_SHAKE_CORRECT_T= 0.3
const TERMINAL_SHAKE_WRONG    = 2
const TERMINAL_SHAKE_WRONG_T  = 0.15

// Mine lock-on range — per Fix 3 spec, 300 px (stationary target
// so player should aim intentionally; shorter than the 440-px
// range used for moving enemies).
const MINE_LOCK_RANGE         = 300

// Boss defeat XP (Glitch Twin arena)
const BOSS_XP                 = 200
// Boss dialogue: bottom strip, narrow panel — keeps mid-screen clear for player + boss
const BOSS_DIALOGUE_HEIGHT  = 96
const BOSS_DIALOGUE_INSET     = 140

// Screen-shake magnitudes (PROJECT.md §13 2H)
const SHAKE_CRAWLER_HIT_MAG   = 6
const SHAKE_CRAWLER_HIT_DUR   = 0.4
const SHAKE_CRAWLER_DEAD_MAG  = 4
const SHAKE_CRAWLER_DEAD_DUR  = 0.3
const SHAKE_CARD_CORRECT_MAG  = 3
const SHAKE_CARD_CORRECT_DUR  = 0.2
const SHAKE_CARD_WRONG_MAG    = 2
const SHAKE_CARD_WRONG_DUR    = 0.15
const SHAKE_VAULT_OPEN_MAG    = 8
const SHAKE_VAULT_OPEN_DUR    = 0.5
const SHAKE_TWIN_DEAD_MAG     = 10
const SHAKE_TWIN_DEAD_DUR     = 0.6
const SHAKE_EVIDENCE_MAG      = 2
const SHAKE_EVIDENCE_DUR      = 0.2
const SHAKE_LEVEL_MAG         = 12
const SHAKE_LEVEL_DUR         = 0.8
// Acid flash
const ACID_FLASH_DURATION     = 1.0
const ACID_FLASH_RENDER_CUT   = 0.7
const ACID_FLASH_COLOR        = '#00ff44'

// Data-rain cinematic (evidence reveal)
const DATA_RAIN_COLUMNS       = 8
const DATA_RAIN_ROWS          = 32

const BOSS_TRIGGER_X          = 6200
const TUNNEL_BOSS_RETURN_X    = 7100
const ARENA_ENTRY_PLAYER_X    = 200
const ARENA_FADE_DURATION     = 0.5

export type GameScene2LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
  bossArena?: boolean
}

function parseGameScene2Fourth(
  fourth?: TouchControls | GameScene2LaunchOptions,
): GameScene2LaunchOptions {
  if (fourth == null) return {}
  if (fourth instanceof TouchControls) return { touchControls: fourth }
  return fourth as GameScene2LaunchOptions
}

export class GameScene2 {
  private input:    InputManager
  private camera:   Camera
  private player:   Player
  private bg:       ParallaxBackground
  private level:    Level2
  private hud:      HUD
  private dialogue: DialogueBox
  private nova:     NovaOrb

  private hp            = 3
  private score         = 0
  private time          = 0
  private scene: Scene  = 'play'

  private lastDust      = 0
  private damageTimer   = 0
  private detectedTimer = 0
  private shootCD       = 0
  // Lock-on target is structurally typed — any x/y/active.
  private lockTarget: LockableEnemy | null = null
  // Cached list from the current frame so render + cycling share it.
  private lockables:  LockableEnemy[] = []
  // Manual cycle index — advances on Q.  Reset when target dies.
  private lockCycleIndex = 0
  private lockTimer     = 0
  private muzzleFlash   = false
  private muzzleFlashT  = 0
  private muzzleX       = 0
  private muzzleY       = 0

  // New shake model: decaying magnitude + jittered x/y offsets.
  private shakeX        = 0
  private shakeY        = 0
  private shakeDecay    = 0
  private shakeMag      = 0

  private explosions: Explosion[] = []

  private slowMotionScale = 1.0
  private vignetteAlpha   = 0
  private acidFlashTimer  = 0

  // Cipher terminal currently being hacked (Fix 1).
  private activeTerminal: CipherTerminal | null = null
  // Latest checkpoint the player has touched (Fix 2).
  private respawnX        = SPAWN_X
  private respawnY        = 0
  private lastCheckpoint: Checkpoint | null = null

  private touchControls?: TouchControls
  /** Tracks `TouchControls.setHackMode` vs overlay visibility. */
  private hackOverlayPrev = false

  private inBossArena         = false
  private bossArena: GlitchTwinBoss | null = null
  private arenaFadeAlpha      = 0
  private arenaFadePhase:
    'none' | 'out' | 'in' | 'exitOut' | 'exitIn' = 'none'
  private arenaFadeTimer      = 0
  private bossIntroFired      = false
  private bossArenaDirectEntry = false
  private bossVictoryStarted  = false
  private respawnFlashTimer   = 0

  // Seeded "data rain" columns for the evidence reveal cinematic
  private dataRainCols: { x: number; y: number; speed: number; chars: string[] }[] = []
  private dataRainActive = false

  private onLevelComplete: (() => void) | undefined

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene2LaunchOptions,
  ) {
    void _loop
    const opts = parseGameScene2Fourth(fourth)
    this.touchControls = opts.touchControls
    // Fade in from black at vault entry — must use arenaFadePhase 'in' so updateArenaFade
    // runs; alpha=1 + phase 'none' leaves a permanent black overlay if decay never applies.
    if (opts.startX == null && !opts.bossArena) {
      this.arenaFadeAlpha = 1
      this.arenaFadePhase = 'in'
      this.arenaFadeTimer = 0
    } else {
      this.arenaFadeAlpha = 0
      this.arenaFadePhase = 'none'
      this.arenaFadeTimer = 0
    }
    this.input    = input
    this.camera   = new Camera()
    this.bg       = new ParallaxBackground(WORLD_WIDTH)
    this.level    = new Level2(this.bg.getGroundY())
    this.hud      = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l2_')
    this.nova     = new NovaOrb()

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.bg.getGroundY())
    this.respawnX = opts.startX != null ? Math.max(40, sx - 40) : SPAWN_X
    this.respawnY = this.bg.getGroundY() - this.player.height
    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 2 — THE VAULT')
    this.hud.setObjective(
      opts.bossArena
        ? 'DEFEAT THE GLITCH TWIN — IDENTIFY THE PATTERN'
        : 'NAVIGATE THE UNDERGROUND VAULT',
    )
    this.nova.show(260, this.bg.getGroundY() - 100)
    this.onLevelComplete = onLevelComplete

    if (opts.bossArena) {
      this.inBossArena        = true
      this.bossArenaDirectEntry = true
      this.bossArena          = new GlitchTwinBoss()
      this.level.glitchTwinDefeated = false
      this.player.x           = 150
      this.player.y           = ARENA_GROUND_Y - this.player.height
      this.player.vx          = 0
      this.player.vy          = 0
      this.camera.x           = 0
      this.dialogue.setPosition('bottom')
      this.dialogue.setHeight(BOSS_DIALOGUE_HEIGHT)
      this.dialogue.setHorizontalInset(BOSS_DIALOGUE_INSET)
      this.hud.setObjective('DEFEAT THE GLITCH TWIN — IDENTIFY THE PATTERN')
    } else if (opts.startX != null) {
      this.level.applySectionStart(opts.startX, { skipCheckpoints: false })
      this.camera.follow(this.player.getCenterX(), WORLD_WIDTH)
    }

    this.initDataRainColumns()
    console.log('[GameScene2] Level 2 loaded — underground, water, crawlers.')
  }

  private initDataRainColumns(): void {
    for (let c = 0; c < DATA_RAIN_COLUMNS; c++) {
      const chars: string[] = []
      for (let r = 0; r < DATA_RAIN_ROWS; r++) chars.push(this.randHex())
      this.dataRainCols.push({
        x:     (CONFIG.CANVAS_WIDTH / DATA_RAIN_COLUMNS) * c + 20,
        y:     Math.random() * CONFIG.CANVAS_HEIGHT,
        speed: 120 + Math.random() * 180,
        chars,
      })
    }
  }

  private randHex(): string {
    const d = '0123456789ABCDEF'
    return d[Math.floor(Math.random() * 16)] ?? '0'
  }

  private triggerShake(magnitude: number, duration: number): void {
    // PROJECT.md §13 2H — decay-based shake, smoother than scalar.
    if (duration <= 0) return
    this.shakeMag   = magnitude
    this.shakeDecay = magnitude / duration
    this.shakeX     = (Math.random() - 0.5) * magnitude
    this.shakeY     = (Math.random() - 0.5) * magnitude
  }

  private talk(lines: DialogueLine[], onDone?: () => void): void {
    this.scene = 'dialogue'
    this.dialogue.show(lines, () => {
      this.scene = 'play'
      onDone?.()
    })
  }

  private updateArenaFade(dt: number): void {
    if (this.arenaFadePhase === 'none') return
    this.arenaFadeTimer += dt
    const t = ARENA_FADE_DURATION
    if (this.arenaFadePhase === 'out') {
      this.arenaFadeAlpha = Math.min(1, this.arenaFadeTimer / t)
      if (this.arenaFadeTimer >= t) {
        this.inBossArena        = true
        this.bossVictoryStarted = false
        this.bossArena          = new GlitchTwinBoss()
        this.dialogue.setPosition('bottom')
        this.dialogue.setHeight(BOSS_DIALOGUE_HEIGHT)
        this.dialogue.setHorizontalInset(BOSS_DIALOGUE_INSET)
        this.hud.setObjective('DEFEAT THE GLITCH TWIN — IDENTIFY THE PATTERN')
        this.player.x           = ARENA_ENTRY_PLAYER_X
        this.player.y        = ARENA_GROUND_Y - this.player.height
        this.player.vx       = 0
        this.player.vy       = 0
        this.nova.moveTo(this.player.x + 70, this.player.y - 30)
        this.arenaFadePhase  = 'in'
        this.arenaFadeTimer  = 0
        this.arenaFadeAlpha  = 1
      }
    } else if (this.arenaFadePhase === 'in') {
      this.arenaFadeAlpha = 1 - Math.min(1, this.arenaFadeTimer / t)
      if (this.arenaFadeTimer >= t) {
        this.arenaFadePhase = 'none'
        this.arenaFadeAlpha = 0
        if (this.inBossArena && !this.bossIntroFired) {
          this.bossIntroFired = true
          this.talk([
            { speaker:'NOVA',
              text:'Two patrol bots. One real NeuroCorps unit. One decoy designed to exhaust you.',
              expression:'explaining' },
          ], () => { this.bossArena?.startObserving() })
        }
      }
    } else if (this.arenaFadePhase === 'exitOut') {
      this.arenaFadeAlpha = Math.min(1, this.arenaFadeTimer / t)
      if (this.arenaFadeTimer >= t) {
        this.inBossArena        = false
        this.bossArena           = null
        this.dialogue.setPosition('bottom')
        this.dialogue.setHeight(130)
        this.dialogue.setHorizontalInset(0)
        this.hud.setObjective('REACH THE END OF THE TUNNEL')
        this.level.glitchTwinDefeated = true
        this.player.x           = TUNNEL_BOSS_RETURN_X
        this.player.y           = this.bg.getGroundY() - this.player.height
        this.player.vx          = 0
        this.player.vy          = 0
        this.level.applySectionStart(TUNNEL_BOSS_RETURN_X, { skipCheckpoints: true })
        this.nova.moveTo(this.player.x + 70, this.player.y - 30)
        this.arenaFadePhase     = 'exitIn'
        this.arenaFadeTimer     = 0
        this.arenaFadeAlpha     = 1
      }
    } else if (this.arenaFadePhase === 'exitIn') {
      this.arenaFadeAlpha = 1 - Math.min(1, this.arenaFadeTimer / t)
      if (this.arenaFadeTimer >= t) {
        this.arenaFadePhase = 'none'
        this.arenaFadeAlpha = 0
        this.talk([{
          speaker:'NOVA',
          text:'Back to the tunnel. The evidence run is ahead.',
          expression:'explaining',
        }])
      }
    }
  }

  update(dtRaw: number): void {
    const dt = dtRaw * this.slowMotionScale

    this.time += dt
    this.updateArenaFade(dt)
    // Campaign intro: constructor sets alpha=1; decay while not in boss fade (same as GameScene3).
    if (this.arenaFadePhase === 'none' && this.arenaFadeAlpha > 0) {
      this.arenaFadeAlpha = Math.max(0, this.arenaFadeAlpha - dt * 2.0)
    }
    if (this.respawnFlashTimer > 0) {
      this.respawnFlashTimer = Math.max(0, this.respawnFlashTimer - dt)
    }
    this.bg.update(dt)
    this.nova.update(dt)

    this.shootCD       = Math.max(0, this.shootCD - dt)
    this.damageTimer   = Math.max(0, this.damageTimer - dt)
    this.detectedTimer = Math.max(0, this.detectedTimer - dt)
    this.acidFlashTimer = Math.max(0, this.acidFlashTimer - dt)
    this.lockTimer    += dt * 4

    if (this.muzzleFlash) {
      this.muzzleFlashT -= dt
      if (this.muzzleFlashT <= 0) this.muzzleFlash = false
    }

    // Decay shake magnitude and re-jitter offsets for this frame.
    if (this.shakeMag > 0) {
      this.shakeMag = Math.max(0, this.shakeMag - this.shakeDecay * dt)
      if (this.shakeMag <= 0) {
        this.shakeX = 0
        this.shakeY = 0
      } else {
        this.shakeX = (Math.random() - 0.5) * this.shakeMag
        this.shakeY = (Math.random() - 0.5) * this.shakeMag
      }
    }

    // Update data-rain columns while cinematic active.
    if (this.dataRainActive) {
      for (const col of this.dataRainCols) {
        col.y += col.speed * dt
        if (col.y > CONFIG.CANVAS_HEIGHT + DATA_RAIN_ROWS * 12) {
          col.y = -DATA_RAIN_ROWS * 12
          for (let i = 0; i < col.chars.length; i++) col.chars[i] = this.randHex()
        }
      }
    }

    // Explosion timers
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i]
      if (!e) continue
      e.t -= dt
      if (e.t <= 0) this.explosions.splice(i, 1)
    }

    // Crawler deaths → green explosion + ceiling "fall" tumble runs
    // inside the crawler itself; we just award XP once and push FX.
    for (const c of this.level.crawlers) {
      if (!c.active && !c.exploded) {
        // exploded flag flips true when the crawler lands.  Until
        // then the body is still tumbling through the air.
        if (c.isLanded()) {
          c.exploded = true
          this.triggerShake(SHAKE_CRAWLER_DEAD_MAG, SHAKE_CRAWLER_DEAD_DUR)
          this.explosions.push({
            x: c.x, y: this.bg.getGroundY() - 10,
            t: 0.6, maxT: 0.6,
            color: CRAWLER_EXPLOSION_COLOR,
          })
          this.score += CRAWLER_XP
          this.hud.addScore(CRAWLER_XP)
          this.hud.showMessage(`+${CRAWLER_XP} XP  CRAWLER DOWN`, 1.5)
        }
      }
    }

    // Drain crawler-landing events → big acid splash particle bursts.
    while (this.level.pendingCrawlerLandings.length > 0) {
      const ev = this.level.pendingCrawlerLandings.shift()
      if (ev) this.bg.spawnAcidSplash(ev.x, ev.y)
    }

    // Sentry Mine deaths → magenta explosion
    for (const m of this.level.sentryMines) {
      if (!m.active && !m.exploded) {
        m.exploded = true
        this.triggerShake(4, 0.25)
        this.explosions.push({
          x: m.x, y: m.y, t: 0.5, maxT: 0.5,
          color: MINE_EXPLOSION_COLOR,
        })
        this.score += SENTRY_XP
        this.hud.addScore(SENTRY_XP)
        this.hud.showMessage(`+${SENTRY_XP} XP  MINE DISABLED`, 1.5)
      }
    }

    // Wall Hugger deaths → orange tumble + explosion
    for (const w of this.level.wallHuggers) {
      if (!w.active && !w.exploded) {
        w.exploded = true
        this.triggerShake(4, 0.25)
        this.explosions.push({
          x: w.x, y: w.y, t: 0.5, maxT: 0.5,
          color: HUGGER_EXPLOSION_COLOR,
        })
        this.score += HUGGER_XP
        this.hud.addScore(HUGGER_XP)
        this.hud.showMessage(`+${HUGGER_XP} XP  HUGGER DOWN`, 1.5)
      }
    }

    // Dialogue state — player frozen.
    if (this.scene === 'dialogue') {
      this.dialogue.update(dt)
      if (this.input.isJustPressed('Space')) this.dialogue.advance()
      this.player.vx = 0
      if (!this.player.isOnGround) {
        this.player.vy += CONFIG.GRAVITY * dt
        this.player.y  += this.player.vy * dt
        const gY = this.inBossArena ? ARENA_GROUND_Y : this.bg.getGroundY()
        this.player.resolveGround(gY)
      }
      if (!this.inBossArena) {
        this.level.update(
          dt,
          this.player.getCenterX(),
          this.player.y + this.player.height / 2
        )
      } else {
        for (const p of this.level.projectiles) p.update(dt)
        this.level.projectiles =
          this.level.projectiles.filter(p => p.active)
      }
      this.camera.follow(this.player.getCenterX(), WORLD_WIDTH)
      this.nova.moveTo(this.player.x + 70, this.player.y - 30)
      this.input.update()
      return
    }

    // ── PLAY ──────────────────────────
    const prevGround = this.player.isOnGround
    const hackOverlay = !!(this.activeTerminal?.isHacking)
    const arenaFadeBusy = this.arenaFadePhase === 'out' ||
      this.arenaFadePhase === 'exitOut'
    const groundY = this.inBossArena ? ARENA_GROUND_Y : this.bg.getGroundY()

    if (!hackOverlay && !arenaFadeBusy) {
      this.player.update(dt, this.input)
    } else if (!hackOverlay && arenaFadeBusy) {
      this.player.vx = 0
      this.player.update(dt, this.input)
    } else {
      this.player.vx = 0
      this.player.vy = 0
    }

    if (!this.inBossArena) {
      const platY = this.level.checkPlatformCollision(
        this.player.x, this.player.y,
        this.player.width, this.player.height, this.player.vy
      )
      if (platY !== null) {
        this.player.y          = platY
        this.player.vy         = 0
        this.player.isOnGround = true
      } else {
        this.player.resolveGround(groundY)
      }
    } else {
      this.player.resolveGround(groundY)
      const m = 40
      this.player.x = Math.max(
        m,
        Math.min(CONFIG.CANVAS_WIDTH - this.player.width - m, this.player.x),
      )
    }

    if (
      this.inBossArena &&
      this.bossArena &&
      this.bossArenaDirectEntry &&
      !this.bossIntroFired &&
      this.scene === 'play'
    ) {
      this.bossIntroFired = true
      this.talk([
        { speaker: 'NOVA',
          text: 'Two patrol bots. One real NeuroCorps unit. One decoy designed to exhaust you.' },
        { speaker: 'NOVA',
          text: 'The real one follows a learned patrol — consistent, predictable, the same every time.',
          expression: 'explaining' },
        { speaker: 'AX',
          text: 'The other one?' },
        { speaker: 'NOVA',
          text: 'Moves randomly. Randomness is not intelligence. It is just chaos.',
          expression: 'explaining' },
        { speaker: 'NOVA',
          text: 'Watch them both. Count the steps. Find the pattern.',
          expression: 'warning' },
      ], () => { this.bossArena?.startObserving() })
    }

    // Gate / Cipher-Terminal blocking — no popups.  Level 2's
    // gating mechanic is the Cipher Terminal: player hacks it
    // by cycling digits to the correct year.  Here we just push
    // the player back if any blocker sits in front of them
    // (arena wall, vault door, or active cipher terminal).
    if (this.level.isGateBlocking(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    )) {
      this.player.x  -= this.player.vx * dt * 3
      this.player.vx  = 0
    }

    if (!this.inBossArena) {
      this.camera.follow(this.player.getCenterX(), WORLD_WIDTH)
    } else {
      this.camera.x = 0
    }
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    if (!hackOverlay && !this.inBossArena) {
      this.lockables = this.buildLockables()
      this.updateLockTarget()
    }

    const inVault = !this.inBossArena &&
      this.level.isInVaultChamber(this.player.getCenterX())

    if (!hackOverlay &&
        !this.inBossArena &&
        !this.level.glitchTwinDefeated &&
        this.scene === 'play' &&
        this.arenaFadePhase === 'none' &&
        this.player.x > BOSS_TRIGGER_X) {
      this.arenaFadePhase = 'out'
      this.arenaFadeTimer = 0
    }

    // ── TIMELINE PUZZLE ──
    if (!hackOverlay && this.scene === 'play') {
      const ev = this.level.handleTimelineInput(
        this.input,
        this.player.getCenterX(),
        this.player.y
      )
      if (ev) {
        if (ev.type === 'placed_correct') {
          this.triggerShake(SHAKE_CARD_CORRECT_MAG, SHAKE_CARD_CORRECT_DUR)
          this.score += 100
          this.hud.addScore(100)
          this.hud.showMessage('CORRECT! +100 XP', 2)
          this.talk([{ speaker:'NOVA', text: ev.novaLine, expression:'happy' }])
        } else if (ev.type === 'placed_wrong') {
          this.triggerShake(SHAKE_CARD_WRONG_MAG, SHAKE_CARD_WRONG_DUR)
          this.hud.showMessage('WRONG YEAR — TRY AGAIN', 2)
          this.talk([{ speaker:'NOVA', text: ev.novaHint, expression:'warning' }])
        } else if (ev.type === 'vault_open') {
          this.score += 200
          this.hud.addScore(200)
          this.hud.showMessage('VAULT CIPHER CRACKED — +200 XP BONUS', 3)
          this.triggerShake(SHAKE_VAULT_OPEN_MAG, SHAKE_VAULT_OPEN_DUR)
          this.talk([
            { speaker:'NOVA', text:'Five milestones. You know them all now.' },
            { speaker:'NOVA',
              text:'They built their contempt into the cipher. We used their assumptions against them.',
              expression:'happy' },
          ])
        }
      }
    }

    // ── NPC TALK + CIPHER TERMINAL (E) ──
    if (!hackOverlay && !inVault && this.input.isJustPressed('KeyE')) {
      const nearTerm = this.level.getNearTerminal(this.player.getCenterX())
      if (nearTerm) {
        this.activeTerminal = nearTerm
        nearTerm.isHacking  = true
        if (!nearTerm.triggered) {
          nearTerm.triggered = true
          this.hud.showMessage(
            `NOVA — ${nearTerm.question}  Use Z/↑ and E/↓ on digits; Space confirms each. Esc/F cancels.`,
            4.5
          )
        }
      } else {
        const npc = this.level.getNearNPC(this.player.getCenterX())
        if (npc && !npc.data.talked) {
          npc.data.talked = true
          this.talk(npc.data.dialogue)
        }
      }
    }

    // ── CIPHER TERMINAL — full-screen hack overlay (PLAY continues) ──
    if (this.activeTerminal) {
      const t = this.activeTerminal
      if (!t.active) {
        t.isHacking         = false
        this.activeTerminal = null
      } else if (Math.abs(this.player.getCenterX() - t.x) > TERMINAL_WALK_AWAY) {
        t.isHacking         = false
        this.activeTerminal = null
      } else if (this.scene === 'play' && t.isHacking) {
        if (this.input.isJustPressed('KeyF') ||
            this.input.isJustPressed('Escape')) {
          t.isHacking         = false
          this.activeTerminal = null
        } else {
          const idx = Math.min(3, Math.max(0, t.digitIndex))
          if (this.input.isJustPressed('KeyZ') ||
              this.input.isJustPressed('ArrowUp')) {
            t.digits[idx] = ((t.digits[idx] ?? 0) + 1) % 10
          }
          if (this.input.isJustPressed('KeyE') ||
              this.input.isJustPressed('ArrowDown')) {
            t.digits[idx] = ((t.digits[idx] ?? 0) + 9) % 10
          }
          if (this.input.isJustPressed('Space')) {
            if (t.digitIndex < 3) {
              t.digitIndex++
            } else {
              const ev = this.level.submitCipherTerminal(t)
              if (ev.type === 'solved') {
                this.activeTerminal = null
                this.triggerShake(TERMINAL_SHAKE_CORRECT, TERMINAL_SHAKE_CORRECT_T)
                this.score += TERMINAL_SOLVE_XP
                this.hud.addScore(TERMINAL_SOLVE_XP)
                this.hud.showMessage(`TERMINAL CRACKED — ${ev.era}`, 2.5)
                this.talk([{
                  speaker:'NOVA', text: ev.novaLine, expression:'happy',
                }])
              } else {
                this.triggerShake(TERMINAL_SHAKE_WRONG, TERMINAL_SHAKE_WRONG_T)
                this.hud.showMessage(
                  `INCORRECT — ${ev.novaHint}`,
                  3.5
                )
              }
            }
          }
        }
      }
    }

    // ── SHOOT ──
    if (!inVault &&
        !hackOverlay &&
        !this.activeTerminal?.isHacking &&
        this.input.isJustPressed('KeyZ') &&
        this.shootCD <= 0) {
      this.shootCD = SHOOT_COOLDOWN
      const dir = this.player.isFacingRight ? 1 : -1
      const px  = this.player.x + (dir > 0 ? this.player.width + 4 : -4)
      const py  = this.player.y + this.player.height * 0.38
      const proj = new Projectile(px, py, dir)
      if (this.lockTarget && this.lockTarget.active) proj.lockOn(this.lockTarget)
      this.level.addProjectile(proj)
      this.muzzleFlash  = true
      this.muzzleFlashT = 0.07
      this.muzzleX = px
      this.muzzleY = py
    }

    // Chip collection
    const chipXP = !this.inBossArena ? this.level.collectChips(
      this.player.getCenterX(),
      this.player.y + this.player.height / 2
    ) : 0
    if (chipXP > 0) {
      this.score += chipXP
      this.hud.addScore(chipXP)
    }

    // Crawler acid-drip damage
    const crawlerEv = !this.inBossArena ? this.level.checkCrawlerDamage(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    ) : null
    if (crawlerEv === 'hit' && this.damageTimer <= 0) {
      this.hp--
      this.hud.setHP(this.hp)
      this.triggerShake(SHAKE_CRAWLER_HIT_MAG, SHAKE_CRAWLER_HIT_DUR)
      this.acidFlashTimer = ACID_FLASH_DURATION
      this.damageTimer    = DAMAGE_IFRAMES
      this.detectedTimer  = DETECT_COOLDOWN
      this.hud.showMessage('ACID DRIP — WATCH THE CEILING', 2)
      if (this.hp <= 0) {
        this.respawn()
      } else {
        this.talk([{
          speaker:'NOVA',
          text:'Green drip — that is acid. Do not stand still under the ceiling.',
          expression:'warning',
        }])
      }
    }

    // Sentry Mine + pattern projectile damage
    const mineEv = !this.inBossArena ? this.level.checkSentryProjectileDamage(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    ) : null
    if (mineEv === 'hit' && this.damageTimer <= 0) {
      this.hp--
      this.hud.setHP(this.hp)
      this.triggerShake(6, 0.35)
      this.damageTimer   = DAMAGE_IFRAMES
      this.detectedTimer = DETECT_COOLDOWN
      this.hud.showMessage('MINE BURST — GET OUT OF RANGE', 2)
      if (this.hp <= 0) this.respawn()
    }

    // Wall Hugger leap damage
    const huggerEv = !this.inBossArena ? this.level.checkWallHuggerDamage(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    ) : null
    if (huggerEv === 'hit' && this.damageTimer <= 0) {
      this.hp--
      this.hud.setHP(this.hp)
      this.triggerShake(5, 0.3)
      this.damageTimer   = DAMAGE_IFRAMES
      this.detectedTimer = DETECT_COOLDOWN
      this.hud.showMessage('HUGGER STRIKE', 1.8)
      if (this.hp <= 0) this.respawn()
    }

    // Drain terminal events pushed by Level2 (from submitCipherTerminal
    // called above).  Currently handled inline; the queue stays
    // drained so other observers (telemetry, logging) can hook in.
    this.level.pendingTerminalEvents.length = 0

    // ── CHECKPOINTS — auto-activate on walk-past ──
    if (this.scene === 'play' && !this.inBossArena) {
      const cp = this.level.updateCheckpointsForPlayer(this.player.getCenterX())
      if (cp && cp !== this.lastCheckpoint) {
        this.lastCheckpoint = cp
        this.respawnX = cp.x - 40
        this.respawnY = this.bg.getGroundY() - this.player.height
        this.triggerShake(2, 0.15)
        this.hud.showMessage('✓ CHECKPOINT', 2)
        this.talk([{
          speaker:'NOVA',
          text:'Position saved. If you fall here — you come back here.',
          expression:'happy',
        }])
      }
    }

    // Evidence pedestal — cinematic slow-motion discovery.
    if (!this.inBossArena && !hackOverlay && !this.level.evidenceCollected) {
      const got = this.level.tryCollectEvidence(
        this.player.getCenterX(),
        this.player.y + this.player.height / 2
      )
      if (got) {
        this.slowMotionScale = SLOWMO_SCALE
        this.vignetteAlpha   = VIGNETTE_ALPHA
        this.dataRainActive  = true
        this.triggerShake(SHAKE_EVIDENCE_MAG, SHAKE_EVIDENCE_DUR)
        setTimeout(() => {
          this.slowMotionScale = 1
          this.vignetteAlpha   = 0
          this.dataRainActive  = false
        }, SLOWMO_DURATION_MS)
        this.hud.showMessage('▸ DATA FRAGMENT RECOVERED', 3)
        this.talk([
          { speaker:'NOVA',
            text:'The algorithm that condemned your building — I can see its timestamp.',
            expression:'explaining' },
          { speaker:'NOVA',
            text:'Built in 2019, using data from 2014 to 2018. A period when District 1 income was systematically under-reported.',
            expression:'explaining' },
          { speaker:'AX',
            text:'It did not make a mistake. It was lied to.' },
          { speaker:'NOVA',
            text:'Yes. And now we know when the lie was planted. We move to find where.',
            expression:'warning' },
        ])
      }
    }

    // Section triggers
    if (!hackOverlay && !this.inBossArena && this.scene === 'play') {
      const trigger = this.level.checkTrigger(this.player.x)
      if (trigger) this.talk(trigger.dialogue)
    }

    // Level complete
    if (!this.inBossArena &&
        !this.level.levelComplete &&
        this.player.x > LEVEL_END_X &&
        this.level.vaultDoor.open) {
      this.level.levelComplete = true
      this.score += 500
      this.hud.addScore(500)
      this.hud.showMessage('LEVEL 2 COMPLETE — +500 XP', 5)
      this.triggerShake(SHAKE_LEVEL_MAG, SHAKE_LEVEL_DUR)
      this.talk([
        { speaker:'NOVA',
          text:'You cracked a cipher built on the entire history of AI.' },
        { speaker:'NOVA',
          text:'The dataset we found — deliberately corrupted income records from 2014 to 2018.',
          expression:'warning' },
        { speaker:'AX',
          text:'Not a mistake. Someone did this on purpose.' },
        { speaker:'KIRAN',
          text:'Our families are on that dataset bhai. We have to keep going.' },
        { speaker:'NOVA',
          text:'District 2. The Data Markets. That is where this data came from.',
          expression:'explaining' },
      ], () => {
        this.onLevelComplete?.()
      })
    }

    // Water footstep FX — replaces Level 1 dust.
    if (!hackOverlay && !this.inBossArena && !prevGround && this.player.isOnGround) {
      this.bg.spawnWaterSplash(this.player.getFootX(), this.player.getFootY())
    }
    if (!hackOverlay && !this.inBossArena && this.player.isOnGround && Math.abs(this.player.vx) > 40) {
      this.lastDust += dt
      if (this.lastDust > 0.10) {
        this.lastDust = 0
        const dir = this.player.isFacingRight ? -1 : 1
        this.bg.spawnWaterDrip(
          this.player.getFootX() + (this.player.isFacingRight ? -12 : 12),
          this.player.getFootY(),
          dir
        )
      }
    } else {
      this.lastDust = 0.10
    }

    if (!this.inBossArena) {
      this.level.update(
        dt,
        this.player.getCenterX(),
        this.player.y + this.player.height / 2
      )
    } else {
      for (const p of this.level.projectiles) p.update(dt)
      this.level.projectiles =
        this.level.projectiles.filter(p => p.active)
    }

    if (this.inBossArena && this.bossArena) {
      const ba = this.bossArena
      ba.update(
        dt,
        this.player.getCenterX(),
        this.player.y,
      )
      let bossDamagedByPlayerThisFrame = false
      for (const proj of this.level.projectiles) {
        if (!proj.active) continue
        const rect = ba.getRealTwinRect()
        const pr = proj.getRect()
        if (
          pr.x < rect.x + rect.w &&
          pr.x + pr.w > rect.x &&
          pr.y < rect.y + rect.h &&
          pr.y + pr.h > rect.y
        ) {
          proj.active = false
          if (!bossDamagedByPlayerThisFrame) {
            bossDamagedByPlayerThisFrame = true
            ba.takeHit()
            this.triggerShake(SHAKE_CARD_CORRECT_MAG + 1, 0.25)
            this.hud.showMessage('HIT — KEEP GOING', 1)
          }
        }
      }
      for (const proj of this.level.projectiles) {
        if (!proj.active) continue
        for (let di = 0; di < ba.getDecoyCount(); di++) {
          const dr = ba.getDecoyRect(di)
          if (!dr) continue
          const pr = proj.getRect()
          if (
            pr.x < dr.x + dr.w &&
            pr.x + pr.w > dr.x &&
            pr.y < dr.y + dr.h &&
            pr.y + pr.h > dr.y
          ) {
            proj.active = false
            ba.splitDecoy(di)
            this.hud.showMessage('WRONG TWIN — DECOY SPLITS', 1.5)
            this.triggerShake(3, 0.2)
            break
          }
        }
      }
      const events = ba.getDamageEvents()
      for (const e of events) {
        if (this.damageTimer > 0) continue
        this.hp--
        this.hud.setHP(this.hp)
        this.damageTimer = DAMAGE_IFRAMES
        this.detectedTimer = DETECT_COOLDOWN
        this.triggerShake(6, 0.4)
        this.hud.showMessage(
          e.type === 'decoy'
            ? 'DECOY HIT — FOCUS ON THE REAL'
            : e.type === 'laser'
              ? 'LASER HIT — MOVE'
              : 'BOSS HIT — MOVE',
          2,
        )
        if (this.hp <= 0) {
          setTimeout(() => {
            this.hp = 3
            this.hud.setHP(3)
            this.player.x = this.respawnX
            this.player.y = this.respawnY
          }, 2200)
        }
      }
      if (ba.isDefeated() && !this.bossVictoryStarted) {
        this.bossVictoryStarted = true
        this.triggerShake(SHAKE_TWIN_DEAD_MAG, SHAKE_TWIN_DEAD_DUR)
        this.score += BOSS_XP
        this.hud.addScore(BOSS_XP)
        this.hud.showMessage('GLITCH TWIN DEFEATED — +200 XP', 3)
        this.dialogue.setPosition('bottom')
        this.dialogue.setHeight(BOSS_DIALOGUE_HEIGHT)
        this.dialogue.setHorizontalInset(BOSS_DIALOGUE_INSET)
        this.talk([
          { speaker:'NOVA',
            text:'The decoy dissolves the moment the real one dies. They were linked.',
            expression:'explaining' },
          { speaker:'AX',
            text:'The decoy had no real purpose. Just chaos.' },
          { speaker:'NOVA',
            text:'Exactly. Randomness is not intelligence. You identified the real AI by finding the pattern.',
            expression:'happy' },
          { speaker:'KIRAN',
            text:'Bhai. That was something. You just beat a NeuroCorps unit by watching it walk.' },
          { speaker:'AX',
            text:'AI equals patterns.' },
          { speaker:'NOVA',
            text:'More than got it. You used it. That is the difference.',
            expression:'happy' },
        ], () => {
          this.dialogue.setPosition('bottom')
          this.dialogue.setHeight(130)
          this.dialogue.setHorizontalInset(0)
          this.arenaFadePhase = 'exitOut'
          this.arenaFadeTimer = 0
        })
      }
    }

    this.hud.update(dt)

    const hNow = !!(this.activeTerminal?.isHacking)
    if (hNow !== this.hackOverlayPrev) {
      this.hackOverlayPrev = hNow
      this.touchControls?.setHackMode(hNow)
    }
    this.input.update()
  }

  private innerRingColor(outer: string): string {
    switch (outer) {
      case CRAWLER_EXPLOSION_COLOR: return '#baff88'
      case MINE_EXPLOSION_COLOR:    return '#ff9cff'
      case HUGGER_EXPLOSION_COLOR:  return '#ffce80'
      default:                      return '#ff1744'
    }
  }

  private respawn(): void {
    this.hud.showMessage('SYSTEM FAILURE — RESPAWNING', 3)
    // Capture the latest checkpoint snapshot now — if the user
    // tabs away or dies mid-frame we'd lose it otherwise.
    const spawnX = this.respawnX
    const spawnY = this.respawnY || (this.bg.getGroundY() - this.player.height)
    setTimeout(() => {
      this.hp = 3
      this.hud.setHP(3)
      this.damageTimer = 0
      this.respawnFlashTimer = 0.6
      this.player.x = spawnX
      this.player.y = spawnY
      this.player.vx = 0
      this.player.vy = 0
      // Clear any hacking state so the UI doesn't stick.
      if (this.activeTerminal) {
        this.activeTerminal.isHacking = false
        this.activeTerminal = null
      }
      this.hackOverlayPrev = false
      this.touchControls?.setHackMode(false)
    }, 2200)
  }

  /** Build the combined live-lockables list this frame.  Order
   *  matters — it's also the Q-cycle order and the lowest-priority
   *  tier for auto-select:
   *    1) Crawlers       (high priority, 440 px range)
   *    2) Wall Huggers   (high priority, 440 px range)
   *    3) Sentry Mines   (low  priority, 300 px range — stationary
   *       so player needs to aim intentionally).
   *  Appears to be a single flat list from the caller's side, but
   *  updateLockTarget() checks the index against sentryMines to
   *  apply the shorter MINE_LOCK_RANGE threshold. */
  private buildLockables(): LockableEnemy[] {
    const out: LockableEnemy[] = []
    for (const c of this.level.crawlers)    if (c.active) out.push(c)
    for (const w of this.level.wallHuggers) if (w.active) out.push(w)
    for (const m of this.level.sentryMines) if (m.active) out.push(m)
    return out
  }

  /** Compute this frame's lockTarget.  Q-press cycles through the
   *  lockables pool; otherwise we auto-select the nearest within
   *  LOCK_RANGE whenever there's no live target. */
  private updateLockTarget(): void {
    const pool = this.lockables
    if (pool.length === 0) {
      this.lockTarget     = null
      this.lockCycleIndex = 0
      return
    }

    // Manual cycle on Q — stays locked onto the chosen target
    // until it dies (or the pool empties).
    if (this.input.isJustPressed('KeyQ')) {
      this.lockCycleIndex = (this.lockCycleIndex + 1) % pool.length
      this.lockTarget     = pool[this.lockCycleIndex] ?? null
      return
    }

    // Keep the existing target if it is still alive AND still in
    // the pool (guards against enemies being filtered out server-
    // side mid-frame).
    if (this.lockTarget && this.lockTarget.active &&
        pool.includes(this.lockTarget)) {
      return
    }

    // Auto-pick nearest — moving enemies use LOCK_RANGE (520 px),
    // stationary Sentry Mines use the tighter MINE_LOCK_RANGE
    // (300 px) and are treated as the lowest-priority tier: we
    // only fall back to a mine when no crawler/hugger is in range.
    const pcx = this.player.getCenterX()
    const pcy = this.player.y
    const mines = this.level.sentryMines
    let bestPrimary: LockableEnemy | null = null
    let bestPrimaryD = LOCK_RANGE
    let bestPrimaryI = 0
    let bestMine: LockableEnemy | null = null
    let bestMineD = MINE_LOCK_RANGE
    let bestMineI = 0
    pool.forEach((e, i) => {
      const dd = Math.hypot(e.x - pcx, e.y - pcy)
      if (mines.includes(e as never)) {
        if (dd < bestMineD) { bestMineD = dd; bestMine = e; bestMineI = i }
      } else {
        if (dd < bestPrimaryD) { bestPrimaryD = dd; bestPrimary = e; bestPrimaryI = i }
      }
    })
    if (bestPrimary) {
      this.lockTarget     = bestPrimary
      this.lockCycleIndex = bestPrimaryI
    } else {
      this.lockTarget     = bestMine
      this.lockCycleIndex = bestMineI
    }
  }

  private renderBossHealthBar(ctx: CanvasRenderingContext2D): void {
    const boss = this.bossArena
    if (!boss) return
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.font = 'bold 10px Orbitron, monospace'
    ctx.fillStyle = '#00e5ff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('GLITCH TWIN — REAL UNIT', 640, 240)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(340, 250, 600, 16)
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = 1
    ctx.strokeRect(340, 250, 600, 16)
    const pct = boss.getRealHP() / 3
    if (pct > 0) {
      const grad = ctx.createLinearGradient(340, 0, 940, 0)
      grad.addColorStop(0, '#00e5ff')
      grad.addColorStop(1, '#0066aa')
      ctx.fillStyle = grad
      ctx.fillRect(340, 250, 600 * pct, 16)
    }
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(540, 250)
    ctx.lineTo(540, 266)
    ctx.moveTo(740, 250)
    ctx.lineTo(740, 266)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.restore()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    if (this.shakeMag > 0) {
      ctx.translate(this.shakeX, this.shakeY)
    }

    // Underground base — no city sky.  Backdrop is owned by Level2.
    ctx.fillStyle = '#020108'
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

    ctx.imageSmoothingEnabled = false
    const cam = this.inBossArena ? 0 : this.camera.x
    if (this.inBossArena && this.bossArena) {
      this.bossArena!.render(ctx)
      for (const p of this.level.projectiles) {
        p.render(ctx, 0)
      }
      this.player.render(ctx, 0)
      this.nova.render(ctx, 0)
    } else {
      this.level.render(ctx, this.camera.x)
      this.player.render(ctx, this.camera.x)
      this.nova.render(ctx, this.camera.x)
    }

    this.bg.renderParticles(ctx, cam)
    this.bg.renderRipples(ctx, cam)

    // Red damage flash (non-acid — kept for drone scans).
    if (this.damageTimer > 1.2 && this.acidFlashTimer < ACID_FLASH_RENDER_CUT) {
      ctx.fillStyle   = '#ff0000'
      ctx.globalAlpha = 0.18
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
      ctx.globalAlpha = 1
    }
    // Green acid flash
    if (this.acidFlashTimer > ACID_FLASH_RENDER_CUT) {
      ctx.fillStyle   = ACID_FLASH_COLOR
      ctx.globalAlpha = 0.15
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
      ctx.globalAlpha = 1
    }

    // Lock-on reticle — uses structural x/y/active access, matches
    // Level 1's visual style (single amber colour).  Draws four
    // corner brackets pulsing with lockTimer, a centre dot, and a
    // distance read-out.
    const lock = this.lockTarget
    if (!this.inBossArena && lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = lock.y
      const pulse = Math.sin(this.lockTimer * 5)
      const sz = 30 + pulse * 4
      ctx.strokeStyle = RETICLE_COLOR
      ctx.lineWidth   = 1.5
      ctx.globalAlpha = 0.7 + pulse * 0.2
      const corners: [number, number][] = [[-1,-1],[1,-1],[-1,1],[1,1]]
      for (const c of corners) {
        const cx2 = c[0]
        const cy2 = c[1]
        const bx  = rx + cx2 * sz
        const by  = ry + cy2 * sz
        ctx.beginPath()
        ctx.moveTo(bx, by - cy2 * 12)
        ctx.lineTo(bx, by)
        ctx.lineTo(bx - cx2 * 12, by)
        ctx.stroke()
      }
      ctx.fillStyle   = RETICLE_COLOR
      ctx.globalAlpha = 0.5
      ctx.fillRect(rx - 2, ry - 2, 4, 4)
      const dist = Math.round(Math.hypot(
        lock.x - this.player.getCenterX(),
        lock.y - this.player.y
      ))
      ctx.fillStyle   = RETICLE_COLOR
      ctx.globalAlpha = 0.8
      ctx.font        = '10px Orbitron, sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(`LOCK ${dist}px`, rx, ry - sz - 6)
      // Small hint — Q cycles between multiple targets.
      if (this.lockables.length > 1) {
        ctx.fillStyle   = RETICLE_COLOR
        ctx.globalAlpha = 0.55
        ctx.font        = '9px Orbitron, sans-serif'
        ctx.fillText(
          `[Q] ${this.lockCycleIndex + 1}/${this.lockables.length}`,
          rx, ry + sz + 14
        )
      }
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    }

    // Explosions — color per enemy type
    for (const e of this.explosions) {
      const sx  = e.x - cam
      const pct = e.t / e.maxT
      const r   = (1 - pct) * 55
      ctx.strokeStyle = e.color
      ctx.lineWidth   = 2
      ctx.globalAlpha = pct * 0.9
      ctx.beginPath()
      ctx.arc(sx, e.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = this.innerRingColor(e.color)
      ctx.lineWidth   = 1.5
      ctx.globalAlpha = pct * 0.6
      ctx.beginPath()
      ctx.arc(sx, e.y, r * 0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle   = '#ffffff'
      ctx.globalAlpha = pct * 0.95
      ctx.beginPath()
      ctx.arc(sx, e.y, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Muzzle flash — starburst (6 cyan lines radiating from muzzle,
    // duration 0.07 s per spec Fix 5).
    if (this.muzzleFlash) {
      const sx = this.muzzleX - cam
      ctx.save()
      ctx.translate(sx, this.muzzleY)
      ctx.strokeStyle = '#00ffff'
      ctx.lineWidth   = 2
      ctx.globalAlpha = 0.9
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.rotate(i * (Math.PI / 3))
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(14, 0)
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()
      ctx.globalAlpha = 1
    }

    // Timeline HUD banner when in vault chamber
    if (!this.inBossArena &&
        this.level.isInVaultChamber(this.player.getCenterX())) {
      const placed = this.level.timelineCards.filter(c => c.isCorrect).length
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.85
      ctx.font        = `8px Orbitron, sans-serif`
      ctx.fillText(
        `TIMELINE ${placed} / 5   Z PICK UP / DROP   E PLACE IN SLOT`,
        20, 62
      )
      ctx.globalAlpha = 1
    }

    const bossUi = !!(this.inBossArena && this.bossArena)
    this.hud.render(ctx, { deferControls: bossUi })
    this.dialogue.render(ctx)
    if (bossUi) {
      this.renderBossHealthBar(ctx)
      this.hud.renderControlsBar(ctx)
    }

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.6) * 0.3})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    if (this.arenaFadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.arenaFadeAlpha})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    // Evidence cinematic overlays (data-rain + vignette).  Render
    // AFTER HUD so they sit above everything but below the shake
    // ctx.restore() so the overlay is screen-space stable.
    if (this.dataRainActive) {
      this.renderDataRain(ctx)
    }
    if (this.vignetteAlpha > 0) {
      const grad = ctx.createRadialGradient(
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT / 2,
        200,
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT / 2,
        700
      )
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(80,0,0,${this.vignetteAlpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    // Controls bar — hidden while full-screen hack overlay is open.
    if (!this.activeTerminal?.isHacking) {
      ctx.fillStyle = '#1a1535'
      ctx.font      = `8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      let bar = '← → MOVE   ↑/SPACE JUMP   Z SHOOT   Q CYCLE TARGET   E TALK / PLACE'
      if (this.level.getNearTerminal(this.player.getCenterX())) {
        bar = '[ E ] HACK TERMINAL'
      }
      ctx.fillText(bar,
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT - 8
      )
      ctx.textAlign = 'left'
    }

    ctx.restore()

    // Full-screen hack UI — NOT inside shake transform (screen-fixed).
    if (this.activeTerminal?.isHacking) {
      ctx.save()
      this.renderHackingScreen(ctx, this.activeTerminal)
      ctx.restore()
    }
  }

  /** Full-screen cipher terminal overlay (spec: Change 1). */
  private renderHackingScreen(
    ctx: CanvasRenderingContext2D,
    terminal: CipherTerminal
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const px = 300
    const py = 150
    const pw = 680
    const ph = 420

    ctx.fillStyle = 'rgba(0, 0, 0, 0.82)'
    ctx.fillRect(0, 0, W, H)

    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
      ctx.fillRect(0, y, W, 1)
    }

    const eraColor = this.terminalEraColor(terminal.era)
    const eraFill  = eraColor + '33'

    ctx.save()
    ctx.shadowColor = '#00e5ff'
    ctx.shadowBlur  = 30
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth   = 2
    ctx.fillStyle   = '#030a12'
    ctx.fillRect(px, py, pw, ph)
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1)
    ctx.shadowBlur = 0
    ctx.strokeStyle = '#00e5ff'

    const L = 20
    const drawCorner = (cx: number, cy: number, dx: number, dy: number): void => {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + dx * L, cy)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy + dy * L)
      ctx.stroke()
    }
    ctx.lineWidth = 3
    drawCorner(px,       py,        1,  1)
    drawCorner(px + pw,  py,       -1,  1)
    drawCorner(px,       py + ph,   1, -1)
    drawCorner(px + pw,  py + ph,  -1, -1)
    ctx.restore()

    // Header bar
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)'
    ctx.fillRect(px, py, pw, 45)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(px, py + 45)
    ctx.lineTo(px + pw, py + 45)
    ctx.stroke()
    ctx.fillStyle = '#00e5ff'
    ctx.font      = `8px 'Press Start 2P'`
    ctx.textAlign = 'left'
    ctx.fillText('◈ NEUROCORPS CIPHER v2.1', px + 12, py + 28)
    ctx.fillStyle = '#94a3b8'
    ctx.font      = `7px Orbitron, sans-serif`
    const tid = terminal.id * 117 + 4821
    ctx.textAlign = 'right'
    ctx.fillText(`TERMINAL ID: NC-${tid}`, px + pw - 12, py + 26)
    ctx.textAlign = 'left'

    // Era pill
    const pillW = 200
    const pillH = 28
    const pillX = px + (pw - pillW) / 2
    const pillY = py + 55
    ctx.fillStyle = eraFill
    ctx.strokeStyle = eraColor
    ctx.lineWidth   = 1
    ctx.fillRect(pillX, pillY, pillW, pillH)
    ctx.strokeRect(pillX + 0.5, pillY + 0.5, pillW - 1, pillH - 1)
    ctx.fillStyle = eraColor
    ctx.font      = `bold 9px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(terminal.era, px + pw / 2, pillY + 19)
    ctx.textAlign = 'left'

    // Question
    const qx = px + 40
    let qy = py + 98
    ctx.fillStyle = '#4a5568'
    ctx.font      = `6px Orbitron, sans-serif`
    ctx.fillText('ENCRYPTED QUERY:', qx, qy)
    qy += 14
    ctx.fillStyle = '#ffffff'
    ctx.font      = `bold 11px Orbitron, sans-serif`
    const maxQW = pw - 80
    const words = terminal.question.split(/\s+/)
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > maxQW && line) {
        ctx.fillText(line, qx, qy)
        qy += 14
        line = w
      } else {
        line = test
      }
    }
    if (line) ctx.fillText(line, qx, qy)

    // Divider
    ctx.strokeStyle = '#00e5ff'
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.moveTo(px, py + 160)
    ctx.lineTo(px + pw, py + 160)
    ctx.stroke()
    ctx.globalAlpha = 1

    // ENTER YEAR + digit boxes (80×70, gap 12)
    ctx.fillStyle = '#94a3b8'
    ctx.font      = `7px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('ENTER YEAR:', px + pw / 2, py + 180)
    ctx.textAlign = 'left'

    const boxW = 80
    const boxH = 70
    const gap  = 12
    const rowW = 4 * boxW + 3 * gap
    const startX = px + (pw - rowW) / 2
    const boxTop = py + 198
    const shake = terminal.wrongFlash > 0
      ? Math.sin(terminal.wrongFlash * 50) * 6
      : 0

    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (boxW + gap) + shake * (i % 2 === 0 ? 1 : -1)
      const by = boxTop
      const confirmed = i < terminal.digitIndex
      const selected  = i === terminal.digitIndex && terminal.digitIndex < 4
      ctx.fillStyle = '#060f1a'
      ctx.fillRect(bx, by, boxW, boxH)
      let border = '#1e3a4a'
      if (terminal.solvedTimer > 0) border = 'rgba(0, 255, 136, 0.6)'
      else if (confirmed)          border = 'rgba(0, 255, 136, 0.6)'
      else if (selected) {
        border = '#00e5ff'
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur  = 20
      }
      ctx.strokeStyle = border
      ctx.lineWidth   = 2
      ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1)
      ctx.shadowBlur = 0

      const digitColor =
        terminal.solvedTimer > 0 ? '#00ff88'
        : selected ? '#ffffff'
        : '#94a3b8'
      ctx.fillStyle = digitColor
      ctx.font      = `bold 36px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(String(terminal.digits[i] ?? 0), bx + boxW / 2, by + 48)

      if (selected && terminal.digitIndex < 4) {
        const blink = Math.sin(this.time * Math.PI * 2 * 4) > 0
        if (blink) {
          ctx.fillStyle = '#00e5ff'
          ctx.fillRect(bx + boxW / 2 - 15, by + boxH - 10, 30, 3)
        }
      }
      if (confirmed) {
        ctx.fillStyle = '#00ff88'
        ctx.font      = `6px Orbitron, sans-serif`
        ctx.textAlign = 'right'
        ctx.fillText('✓', bx + boxW - 4, by + 12)
      }
      ctx.textAlign = 'left'
    }

    // Progress dots
    const dotY = py + 278
    const cx0  = px + pw / 2
    for (let i = 0; i < 4; i++) {
      const dcx = cx0 + i * 28 - (3 * 28) / 2
      const confirmed = i < terminal.digitIndex
      const selected  = i === terminal.digitIndex && terminal.digitIndex < 4
      ctx.beginPath()
      ctx.arc(dcx, dotY, 8, 0, Math.PI * 2)
      if (confirmed) {
        ctx.fillStyle = '#00ff88'
        ctx.fill()
      } else if (selected) {
        const p = 0.5 + 0.5 * Math.sin(this.time * 6)
        ctx.fillStyle = `rgba(0, 229, 255, ${0.4 + p * 0.5})`
        ctx.fill()
        ctx.strokeStyle = '#00e5ff'
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#1e3a4a'
        ctx.stroke()
      }
    }

    // Hint pills
    const pillRowY = py + 300
    const pillSpecs: Array<[string, string]> = [
      ['[Z] or [↑]', 'INCREASE'],
      ['[E] or [↓]', 'DECREASE'],
      ['[SPACE]',    'CONFIRM DIGIT'],
    ]
    const pillW2 = 140
    const pillH2 = 32
    const pillGap = 10
    const rowW2 = 3 * pillW2 + 2 * pillGap
    let px0 = px + (pw - rowW2) / 2
    for (const [keyL, lab] of pillSpecs) {
      ctx.fillStyle = '#0a1628'
      ctx.strokeStyle = '#1e3a4a'
      ctx.lineWidth   = 1
      ctx.fillRect(px0, pillRowY, pillW2, pillH2)
      ctx.strokeRect(px0 + 0.5, pillRowY + 0.5, pillW2 - 1, pillH2 - 1)
      ctx.textAlign = 'center'
      ctx.font      = `6px Orbitron, sans-serif`
      ctx.fillStyle = '#ff9100'
      ctx.fillText(keyL, px0 + pillW2 / 2, pillRowY + 12)
      ctx.font      = `5px Orbitron, sans-serif`
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(lab, px0 + pillW2 / 2, pillRowY + 24)
      ctx.textAlign = 'left'
      px0 += pillW2 + pillGap
    }

    ctx.fillStyle = '#4a5568'
    ctx.font      = `6px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('[ ESC or F ] CANCEL HACK', px + pw / 2, py + 348)
    ctx.textAlign = 'left'

    // Wrong overlay + bar
    if (terminal.wrongFlash > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.15)'
      ctx.fillRect(px, py, pw, ph)
      ctx.fillStyle = '#ff4444'
      ctx.font      = `bold 8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('✗ INCORRECT SEQUENCE — RESETTING', px + pw / 2, py + ph - 36)
      const barW = pw - 80
      const frac = terminal.wrongFlash / 0.6
      ctx.strokeStyle = '#ff4444'
      ctx.strokeRect(px + 40, py + ph - 22, barW, 8)
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(px + 40, py + ph - 22, barW * frac, 8)
      ctx.textAlign = 'left'
    }

    // Solved overlay + matrix rain + ACCESS GRANTED
    if (terminal.solvedTimer > 0) {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.12)'
      ctx.fillRect(px, py, pw, ph)

      ctx.save()
      ctx.beginPath()
      ctx.rect(px + 4, py + 4, pw - 8, ph - 8)
      ctx.clip()
      ctx.font = `13px Orbitron, monospace`
      for (let col = 0; col < 8; col++) {
        const speed = 40 + col * 18
        const colX  = px + 30 + col * ((pw - 60) / 8)
        for (let row = 0; row < 18; row++) {
          const yy = py + ((row * 22 + this.time * speed) % (ph + 40)) - 20
          const ch = '0123456789ABCDEF'[
            (Math.floor(this.time * 20) + col * 3 + row * 5) % 16
          ] ?? '0'
          ctx.fillStyle = 'rgba(0, 255, 68, 0.4)'
          ctx.fillText(ch, colX, yy)
        }
      }
      ctx.restore()

      const elapsed = 1.2 - terminal.solvedTimer
      const sc = elapsed < 0.3
        ? 0.8 + 0.2 * (elapsed / 0.3)
        : 1
      ctx.save()
      ctx.translate(px + pw / 2, py + ph / 2)
      ctx.scale(sc, sc)
      ctx.fillStyle = '#00ff88'
      ctx.font      = `bold 16px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText('ACCESS GRANTED', 0, 0)
      ctx.restore()
      ctx.textAlign = 'left'
    }

    // Side data streams
    ctx.font = `9px Orbitron, monospace`
    for (let col = 0; col < 3; col++) {
      const sx = 12 + col * 28
      const sp = 35 + col * 22
      for (let row = 0; row < 40; row++) {
        const yy = ((row * 14 + this.time * sp) % H)
        const ch = '0123456789ABCDEF'[
          (row + col + Math.floor(this.time * 10)) % 16
        ] ?? '0'
        ctx.fillStyle = 'rgba(0, 229, 255, 0.08)'
        ctx.fillText(ch, sx, yy)
      }
    }
    for (let col = 0; col < 3; col++) {
      const sx = 1000 + col * 28
      const sp = 40 + col * 18
      for (let row = 0; row < 40; row++) {
        const yy = ((row * 14 + this.time * sp) % H)
        const ch = '0123456789ABCDEF'[
          (row * 2 + col + Math.floor(this.time * 8)) % 16
        ] ?? '0'
        ctx.fillStyle = 'rgba(0, 229, 255, 0.08)'
        ctx.fillText(ch, sx, yy)
      }
    }
  }

  private terminalEraColor(era: string): string {
    if (era === 'THE NAMING')    return '#ff6b00'
    if (era === 'THE VISION')   return '#00ff88'
    if (era === 'THE EXPLOSION') return '#cc00ff'
    return '#ff9100'
  }

  private renderDataRain(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.fillStyle = '#00ff44'
    ctx.globalAlpha = 0.1
    ctx.font = `13px Orbitron, monospace`
    for (const col of this.dataRainCols) {
      for (let r = 0; r < DATA_RAIN_ROWS; r++) {
        const y = col.y + r * 12
        if (y < 0 || y > CONFIG.CANVAS_HEIGHT) continue
        ctx.fillText(col.chars[r] ?? '0', col.x, y)
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }
}
