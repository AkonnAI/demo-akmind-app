import { InputManager } from '../engine/InputManager'
import { DeviceManager } from '../engine/DeviceManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { audioManager } from '../engine/AudioManager'
import { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
import { Haptics } from '../engine/Haptics'
import { Level3, LEVEL3_WORLD_WIDTH } from '../world/Level3'
import { ParallaxBackground } from '../world/ParallaxBackground'
import {
  updatePatternGrids,
  renderPatternGridFloorTiles,
  renderPatternGridHudPanels,
} from '../systems/PatternGrid'
import { HUD } from '../ui/HUD'
import { DialogueBox } from '../ui/DialogueBox'
import { NovaOrb } from '../ui/NovaOrb'
import { UpgradeShop } from '../ui/UpgradeShop'
import { CONFIG } from '../constants/config'
import { TouchControls } from '../ui/TouchControls'
import { attachDialoguePointerAdvance } from '../ui/dialoguePointerAdvance'
import { MarketEnforcer } from '../entities/MarketEnforcer'
import { Drone } from '../entities/Drone'
import type { LockTarget } from '../entities/Projectile'
import { MissionCard, type MissionCardData } from '../ui/MissionCard'

const DRONE_XP = 50
const ENFORCER_XP = 80
const WRAITH_XP = 55

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
  text: string
  expression?: string
}

interface L3Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  grav?: number
  life0?: number
  size?: number
}

const SPAWN_X = 180
const LOCK_RANGE = 520
const DAMAGE_IFRAMES = 1.5

export type GameScene3LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene3LaunchOptions,
): GameScene3LaunchOptions {
  if (fourth == null) return {}
  if (fourth instanceof TouchControls) return { touchControls: fourth }
  return fourth
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w < b.x ||
    a.x > b.x + b.w ||
    a.y + a.h < b.y ||
    a.y > b.y + b.h
  )
}

export class GameScene3 {
  private readonly groundY = 610

  private input: InputManager
  private camera: Camera
  private bg: ParallaxBackground
  private player: Player
  private level: Level3
  private hud: HUD
  private dialogue: DialogueBox
  private nova: NovaOrb
  private shop: UpgradeShop
  private missionCard = new MissionCard()

  private touchControls?: TouchControls
  private dialoguePointerDetach: (() => void) | null = null

  private hp = 3
  private score = 0
  private time = 0
  private scene: Scene = 'play'

  private lastDust = 0
  private damageTimer = 0
  private damageFlashTimer = 0
  private shootCD = 0
  private shootCooldown = 0.28
  private lockTarget: LockTarget | null = null
  private lockables: LockTarget[] = []
  private lockCycleIndex = 0
  private lockTimer = 0
  private muzzleFlash = false
  private muzzleFlashT = 0
  private muzzleX = 0
  private muzzleY = 0

  private shakeX = 0
  private shakeY = 0
  private shakeDecay = 0
  private shakeMag = 0

  private arenaFadeAlpha = 0
  private introCinematicActive = false
  private introCameraX: number | null = null
  private playerShield = false
  private playerShieldConsumed = false

  private prevPlayerX = 0
  private evidenceDialogStarted = false
  private lastOnGround = true

  private particles: L3Particle[] = []
  private respawnFlashTimer = 0

  private gate1TutShown = false
  private gate2TutShown = false
  private gate3TutShown = false
  private showLevelCompleteCard = false

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene3LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    this.touchControls = opts.touchControls
    this.arenaFadeAlpha = opts.startX == null ? 1 : 0
    this.input = input
    this.camera = new Camera()
    this.bg = new ParallaxBackground(LEVEL3_WORLD_WIDTH)
    this.level = new Level3(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l3_')
    this.nova = new NovaOrb()

    this.shop = new UpgradeShop(
      () => this.hud.getXP(),
      (n: number) => this.hud.spendXP(n),
      (id: string) => this.handlePurchase(id),
      (msg, d) => this.hud.showMessage(msg, d ?? 2),
    )

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.prevPlayerX = this.player.getCenterX()
    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 3 — THE DATA MARKET')
    this.syncL3Objective()
    this.onLevelComplete = onLevelComplete

    if (opts.startX != null) {
      this.level.applySectionStart(opts.startX)
      this.camera.follow(this.player.getCenterX(), LEVEL3_WORLD_WIDTH)
    }

    if (!opts.startX) {
      const maxCam = LEVEL3_WORLD_WIDTH - CONFIG.CANVAS_WIDTH
      const introStart = Math.max(
        0,
        Math.min(2800 - CONFIG.CANVAS_WIDTH / 2, maxCam),
      )
      this.arenaFadeAlpha = 1.0
      this.introCinematicActive = true
      this.introCameraX = introStart
      this.camera.syncFromXY(introStart, 0)
      this.talk(
        [
          {
            speaker: 'NARRATOR',
            text: 'District 1 — Data Market boundary. 02:04.',
          },
          {
            speaker: 'NOVA',
            text: 'Outdoor market. Heavy patrols. Three sector locks before the exit.',
          },
          {
            speaker: 'AX',
            text: 'Pattern tiles first. Then evidence. Then we run.',
          },
        ],
        () => {
          this.introCinematicActive = false
          this.introCameraX = null
        },
      )
    }

    console.log('[GameScene3] Level 3 — Data Market.')

    this.missionCard.show({
      levelCode: 'LEVEL 3',
      levelName: 'THE DATA MARKET',
      district: 'DISTRICT 1 — ALGORITHM SLUMS',
      lesson: 'PATTERN RECOGNITION IN DATA',
      objective: 'STEP THE PATTERN. COLLECT EVIDENCE. REACH THE EXIT.',
      controls: ['← → MOVE', '↑ JUMP', 'Z SHOOT', 'E INTERACT'],
    } satisfies MissionCardData)
  }

  private syncL3Objective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const g2 = this.level.gates.find(g => g.id === 2)?.open
    const g3 = this.level.gates.find(g => g.id === 3)?.open

    let obj: string
    if (!g1) {
      obj = 'GATE 1 — STEP THE FLOOR PATTERN IN ORDER (1→4)'
    } else if (!g2) {
      obj = 'GATE 2 — COLLECT EVIDENCE AT THE PEDESTAL (E)'
    } else if (!g3) {
      obj = 'GATE 3 — SECOND PATTERN GRID · THEN REACH EXIT'
    } else {
      obj = 'REACH THE MARKET EXIT PORTAL'
    }
    this.hud.setObjective(obj)
  }

  private spawnImpact(wx: number, wy: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * (90 + Math.random() * 40),
        vy: Math.sin(a) * (90 + Math.random() * 40),
        life: 0.35 + Math.random() * 0.15,
        color: '#4a9eff',
      })
    }
  }

  private spawnDust(wx: number, wy: number, dir: number): void {
    for (let k = 0; k < 3; k++) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 8,
        y: wy,
        vx: dir * (-35 - Math.random() * 25) + (Math.random() - 0.5) * 20,
        vy: -15 - Math.random() * 35,
        life: 0.2 + Math.random() * 0.15,
        color: 'rgba(74,158,255,0.65)',
      })
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (!p) continue
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += (p.grav ?? 420) * dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    for (const p of this.particles) {
      const sx = p.x - cameraX
      const sy = p.y
      if (sx < -40 || sx > CONFIG.CANVAS_WIDTH + 40) continue
      const baseA = p.life0 != null ? p.life / p.life0 : p.life * 2.5
      ctx.globalAlpha = Math.max(0, Math.min(1, baseA))
      ctx.fillStyle = p.color
      const sz = p.size ?? 5
      ctx.fillRect(sx - sz / 2, sy - sz / 2, sz, sz)
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }

  private spawnFireDeath(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4
      const speed = 60 + Math.random() * 140
      const isFlame = Math.random() > 0.4
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: isFlame ? 0.55 + Math.random() * 0.25 : 0.2,
        life0: isFlame ? 0.8 : 0.2,
        color: isFlame
          ? (Math.random() > 0.5 ? '#ff6600' : '#ff9100')
          : '#ffffff',
        size: isFlame ? 3 + Math.random() * 4 : 2,
        grav: isFlame ? -60 : 0,
      })
    }
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y - 10,
        vx: (Math.random() - 0.5) * 30,
        vy: -25 - Math.random() * 40,
        life: 0.8 + Math.random() * 0.4,
        life0: 1.2,
        color: '#2a2a2a',
        size: 6 + Math.random() * 6,
        grav: -20,
      })
    }
  }

  private handlePurchase(id: string): void {
    switch (id) {
      case 'emp_gun':
        this.player.hasSecondWeapon = true
        this.hud.showMessage('EMP BLASTER INSTALLED — PRESS X TO SWITCH', 3)
        break
      case 'health_refill':
        if (this.hp < 3) {
          this.hp++
          this.hud.setHP(this.hp)
        }
        this.hud.showMessage('SYSTEM REPAIRED +1 HP', 2)
        break
      case 'double_jump':
        this.player.hasDoubleJump = true
        this.hud.showMessage('BOOT JETS INSTALLED — DOUBLE JUMP ENABLED', 3)
        break
      case 'fast_shoot':
        this.shootCooldown = 0.16
        this.hud.showMessage('RAPID FIRE INSTALLED', 2)
        break
      case 'shield':
        this.playerShield = true
        this.playerShieldConsumed = false
        this.hud.showMessage('NANO SHIELD ACTIVE — FIRST HIT BLOCKED', 3)
        break
      default:
        break
    }
  }

  private talk(lines: DialogueLine[], onDone?: () => void): void {
    this.scene = 'dialogue'
    this.nova.show(this.player.x + 70, this.player.y - 30)
    this.touchControls?.hide()
    this.dialoguePointerDetach?.()
    this.dialoguePointerDetach = attachDialoguePointerAdvance(() => {
      this.dialogue.advance()
    })
    this.dialogue.show(lines as Parameters<DialogueBox['show']>[0], () => {
      this.dialoguePointerDetach?.()
      this.dialoguePointerDetach = null
      this.touchControls?.show()
      this.scene = 'play'
      this.nova.hide()
      onDone?.()
    })
  }

  private triggerShake(m: number, d: number): void {
    if (d <= 0) return
    this.shakeMag = m
    this.shakeDecay = m / d
    this.shakeX = (Math.random() - 0.5) * m
    this.shakeY = (Math.random() - 0.5) * m
  }

  /** Combat targets only (Level 1 locks drones; L3 adds ground enforcers). */
  private buildLockables(): LockTarget[] {
    const out: LockTarget[] = []
    for (const d of this.level.drones) if (d.active) out.push(d)
    for (const e of this.level.enforcers) if (e.active) out.push(e)
    return out
  }

  /** World point used for range + reticle — entity body center, not wall props. */
  private lockReticleY(e: LockTarget): number {
    if (e instanceof MarketEnforcer) return e.y - 10
    if (e instanceof Drone) return e.y + 3
    return e.y
  }

  /**
   * Same pattern as GameScene2: full lockables pool, Q cycles, auto-nearest
   * within LOCK_RANGE (520) when not manually locked.
   */
  private updateLockTarget(): void {
    if (this.lockTarget && !this.lockTarget.active) this.lockTarget = null

    this.lockables = this.buildLockables()
    const pool = this.lockables
    if (pool.length === 0) {
      this.lockTarget = null
      this.lockCycleIndex = 0
      return
    }

    if (this.input.isJustPressed('KeyQ')) {
      this.lockCycleIndex = (this.lockCycleIndex + 1) % pool.length
      this.lockTarget = pool[this.lockCycleIndex] ?? null
      return
    }

    if (
      this.lockTarget &&
      this.lockTarget.active &&
      pool.includes(this.lockTarget)
    ) {
      return
    }

    const pcx = this.player.getCenterX()
    const pcy = this.player.y
    const fr = this.player.isFacingRight
    let nearest: LockTarget | null = null
    let best = LOCK_RANGE
    let nearestFront: LockTarget | null = null
    let bestFront = LOCK_RANGE
    for (const e of pool) {
      const ty = this.lockReticleY(e)
      const dd = Math.hypot(e.x - pcx, ty - pcy)
      if (dd < best) {
        best = dd
        nearest = e
      }
      const inFront = fr ? e.x >= pcx - 80 : e.x <= pcx + 80
      if (inFront && dd < bestFront) {
        bestFront = dd
        nearestFront = e
      }
    }
    this.lockTarget = nearestFront ?? nearest
    if (this.lockTarget != null) {
      this.lockCycleIndex = Math.max(0, pool.indexOf(this.lockTarget))
    }
  }

  private applyProjectileHits(): void {
    for (const proj of this.level.projectiles) {
      if (!proj.active) continue

      for (const d of this.level.drones) {
        if (!d.active) continue
        if (!rectsOverlap(d.getRect(), proj.getRect())) continue
        if (proj.empMode) d.stun(1.5)
        d.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const c of this.level.cameras) {
        if (
          !rectsOverlap(proj.getRect(), {
            x: c.x - 20,
            y: c.y - 10,
            w: 40,
            h: 40,
          })
        )
          continue
        if (proj.empMode) c.stun(1.5)
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const e of this.level.enforcers) {
        if (!e.active) continue
        if (!rectsOverlap(e.getRect(), proj.getRect())) continue
        e.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const w of this.level.wraiths) {
        if (!w.active) continue
        if (!rectsOverlap(w.getRect(), proj.getRect())) continue
        if (proj.empMode) {
          w.takeDamage(true)
          proj.active = false
        } else if (proj.prismMode) {
          w.spawnPrismChildren()
          proj.active = false
        } else {
          proj.active = false
        }
        break
      }
    }
  }

  private resolvePrismWallHits(): void {
    const gy = this.groundY
    const maxX = LEVEL3_WORLD_WIDTH
    for (const proj of this.level.projectiles) {
      if (!proj.active || !proj.prismMode) continue
      let hit = false
      if (proj.y > gy - 4 || proj.y < 40) hit = true
      if (proj.x < 4 || proj.x > maxX - 4) hit = true
      if (!hit) {
        const r = proj.getRect()
        for (const pl of this.level.platforms) {
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
      const base = Math.atan2(proj.vy, proj.vx)
      const spd = 260
      for (const ang of [-Math.PI / 6, 0, Math.PI / 6]) {
        const a = base + ang
        this.level.addProjectile(
          new Projectile(proj.x, proj.y, 1, {
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 0.5,
            color: '#e040fb',
          }),
        )
      }
      proj.active = false
    }
  }

  update(dtRaw: number): void {
    this.missionCard.update(dtRaw)
    if (this.missionCard.isActive()) {
      if (this.input.isJustPressed('Space') || this.input.isJustPressed('ArrowUp')) {
        this.missionCard.skip()
      }
      this.hud.update(dtRaw)
      this.input.update()
      return
    }

    const dt = dtRaw
    const prevCenterX = this.prevPlayerX
    this.time += dt
    this.bg.update(dt)
    this.shop.updateShop(dt)
    this.nova.update(dt)
    this.hud.update(dt)
    this.hud.setWeapon(this.player.currentWeaponName())

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

    this.shootCD = Math.max(0, this.shootCD - dt)
    this.damageTimer = Math.max(0, this.damageTimer - dt)
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt)
    }
    this.lockTimer += dt * 4

    if (this.muzzleFlash) {
      this.muzzleFlashT -= dt
      if (this.muzzleFlashT <= 0) this.muzzleFlash = false
    }

    if (this.arenaFadeAlpha > 0) {
      this.arenaFadeAlpha = Math.max(0, this.arenaFadeAlpha - dt * 2.0)
    }

    if (this.respawnFlashTimer > 0) {
      this.respawnFlashTimer = Math.max(0, this.respawnFlashTimer - dt)
    }

    this.updateParticles(dt)

    if (this.scene === 'dialogue') {
      this.dialogue.update(dt)
      if (this.input.isJustPressed('Space')) {
        if (this.missionCard.isActive()) {
          this.missionCard.skip()
        } else {
          this.dialogue.advance()
        }
      } else if (
        this.input.isJustPressed('KeyZ') ||
        this.input.isJustPressed('KeyE')
      ) {
        this.dialogue.advance()
      }
      this.player.vx = 0
      if (!this.player.isOnGround) {
        this.player.vy += CONFIG.GRAVITY * dt
        this.player.y += this.player.vy * dt
        this.player.resolveGround(this.groundY)
      }
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      const maxCam = LEVEL3_WORLD_WIDTH - CONFIG.CANVAS_WIDTH
      if (this.introCameraX != null) {
        const target = Math.max(
          0,
          Math.min(
            this.player.getCenterX() - CONFIG.CANVAS_WIDTH / 2,
            maxCam,
          ),
        )
        this.introCameraX -= 280 * dt
        if (this.introCameraX <= target) {
          this.camera.syncFromXY(target, 0)
        } else {
          this.camera.syncFromXY(Math.round(this.introCameraX), 0)
        }
      } else {
        this.camera.follow(
          this.player,
          dt,
          LEVEL3_WORLD_WIDTH,
          CONFIG.CANVAS_HEIGHT,
        )
      }
      this.nova.moveTo(this.player.x + 70, this.player.y - 30)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    if (this.shop.isOpen()) {
      this.shop.handleInput(this.input)
      this.player.vx = 0
      this.player.vy = 0
      this.camera.follow(
        this.player,
        dt,
        LEVEL3_WORLD_WIDTH,
        CONFIG.CANVAS_HEIGHT,
      )
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    if (this.showLevelCompleteCard) {
      this.player.vx = 0
      this.player.vy = 0
      if (this.input.isJustPressed('Space')) {
        this.onLevelComplete?.()
      }
      this.camera.follow(
        this.player,
        dt,
        LEVEL3_WORLD_WIDTH,
        CONFIG.CANVAS_HEIGHT,
      )
      this.nova.moveTo(this.player.x + 70, this.player.y - 30)
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    const wantsJump =
      this.input.isJustPressed('ArrowUp') || this.input.isJustPressed('Space')
    const wasOnGround = this.player.isOnGround
    this.player.update(dt, this.input)
    if (wantsJump && wasOnGround) {
      audioManager.playSFX('jump')
    }

    const platY = this.level.checkPlatformCollision(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.player.vy,
    )
    if (platY !== null) {
      this.player.y = platY
      this.player.vy = 0
      this.player.isOnGround = true
    } else {
      this.player.resolveGround(this.groundY)
    }

    const gate = this.level.getBlockingGate(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    if (gate) {
      if (this.player.vx > 0) {
        this.player.x = gate.x - this.player.width
      } else if (this.player.vx < 0) {
        this.player.x = gate.x + gate.w
      }
      this.player.vx = 0
    }

    const wall = this.level.getBlockingWall(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    if (wall) {
      if (this.player.vx > 0) {
        this.player.x = wall.x - this.player.width
      } else if (this.player.vx < 0) {
        this.player.x = wall.x + wall.w
      }
      this.player.vx = 0
    }

    const gate2 = this.level.gates.find(g => g.id === 2)
    if (
      gate2 &&
      !gate2.open &&
      Math.abs(this.player.getCenterX() - gate2.x) < 80
    ) {
      this.level.updateCrowdMood('stood_near_gate')
    } else {
      this.level.resetStoodGateFrames()
    }

    const cxAfterMove = this.player.getCenterX()
    const st = this.level.peekSectionTrigger(prevCenterX, cxAfterMove)
    if (st) {
      if (!DialogueBox.hasFired(st.key)) {
        DialogueBox.markFired(st.key)
        st.fired = true
        this.talk(st.dialogue as DialogueLine[])
      } else {
        st.fired = true
      }
    }

    const cp = this.level.updateCheckpointsForPlayer(cxAfterMove)
    if (cp) {
      audioManager.playSFX('gateOpen')
      const key =
        cp.x < 3000 ? 'l3_cp_1' : cp.x < 6000 ? 'l3_cp_2' : 'l3_cp_3'
      if (!DialogueBox.hasFired(key)) {
        DialogueBox.markFired(key)
        this.talk([
          {
            speaker: 'NOVA',
            text: 'Checkpoint logged. Respawn tether updated.',
            expression: 'happy',
          },
        ])
      }
    }

    const gateTutPlay = this.scene === 'play'
    if (
      gateTutPlay &&
      !this.gate1TutShown &&
      prevCenterX < 1500 &&
      cxAfterMove >= 1500
    ) {
      if (!DialogueBox.hasFired('L3_GATE1_TUT')) {
        DialogueBox.markFired('L3_GATE1_TUT')
        this.gate1TutShown = true
        this.talk([
          {
            speaker: 'NOVA',
            text: 'Pattern Recognition Gate ahead. NeuroCorps locks sectors with AI-learned sequences.',
          },
          {
            speaker: 'NOVA',
            text: 'Four numbered tiles on the floor. Step on them 1 → 2 → 3 → 4 in order. Walk straight through — the numbers tell you the sequence.',
          },
          {
            speaker: 'NOVA',
            text: 'Wrong tile resets the lock. Take a second to read the numbers before you move.',
          },
        ])
      } else {
        this.gate1TutShown = true
      }
    }
    if (
      gateTutPlay &&
      !this.gate2TutShown &&
      prevCenterX < 3500 &&
      cxAfterMove >= 3500
    ) {
      if (!DialogueBox.hasFired('L3_GATE2_TUT')) {
        DialogueBox.markFired('L3_GATE2_TUT')
        this.gate2TutShown = true
        this.talk([
          {
            speaker: 'NOVA',
            text: 'Evidence terminal ahead — Kiran stashed proof here. Press E when you reach the pedestal to collect it and unlock Gate 2.',
          },
        ])
      } else {
        this.gate2TutShown = true
      }
    }
    if (
      gateTutPlay &&
      !this.gate3TutShown &&
      prevCenterX < 6400 &&
      cxAfterMove >= 6400
    ) {
      if (!DialogueBox.hasFired('L3_GATE3_TUT')) {
        DialogueBox.markFired('L3_GATE3_TUT')
        this.gate3TutShown = true
        this.talk([
          {
            speaker: 'NOVA',
            text: 'Second pattern lock. Same mechanic — tiles 1 through 4 in order.',
          },
          {
            speaker: 'NOVA',
            text: 'Look at the numbers before you step. This sequence runs right-to-left. Adjust your approach.',
          },
          {
            speaker: 'NOVA',
            text: 'After this gate, reach the green exit portal to complete the level.',
          },
        ])
      } else {
        this.gate3TutShown = true
      }
    }

    if (this.input.isJustPressed('KeyX')) {
      this.player.switchWeapon()
      this.hud.showMessage(`${this.player.currentWeaponName()} READY`, 1)
    }

    if (this.input.isJustPressed('KeyE')) {
      const near = this.level.getNearShopTerminal(this.player.getCenterX())
      if (near) {
        this.shop.open()
        this.input.update()
        return
      }
      if (
        !this.evidenceDialogStarted &&
        this.level.tryCollectEvidence(
          this.player.getCenterX(),
          this.player.y + this.player.height / 2,
        )
      ) {
        this.evidenceDialogStarted = true
        if (!DialogueBox.hasFired('l3_evidence_ped')) {
          DialogueBox.markFired('l3_evidence_ped')
          this.talk(
            [
              {
                speaker: 'NOVA',
                text: 'NeuroCorps data chain. Every weight adjustment from 2014 onward.',
              },
              { speaker: 'AX', text: 'This is what they buried.' },
              {
                speaker: 'NOVA',
                text: 'Gate two is open. One more pattern grid. Then run.',
              },
            ],
            () => {
              this.level.markEvidenceConsumed()
              audioManager.playSFX('gateOpen')
            },
          )
        } else {
          this.level.markEvidenceConsumed()
          audioManager.playSFX('gateOpen')
        }
        this.syncL3Objective()
        this.input.update()
        return
      }
      const npc = this.level.getNearNPC(this.player.getCenterX())
      if (npc && npc.isNear(this.player.getCenterX())) {
        if (!npc.data.talked) {
          this.talk(npc.data.dialogue as DialogueLine[], () => {
            npc.data.talked = true
          })
        } else {
          const lines = npc.data.dialogue
          const last = lines[lines.length - 1]
          if (last) this.talk([last])
        }
      }
    }

    const pgSlice =
      this.level.patternGrids[0]?.solved === true
        ? this.level.patternGrids
        : [this.level.patternGrids[0]!]
    const pgEv = updatePatternGrids(
      pgSlice,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      dt,
    )
    if (pgEv?.type === 'solved') {
      audioManager.playSFX('correct')
      Haptics.fire('puzzleSolved')
      this.level.openGate(pgEv.gateId)
      audioManager.playSFX('gateOpen')
      this.hud.addScore(100)
      this.score += 100
      this.hud.showMessage('PATTERN LOCK OPEN — +100 XP', 2)
      if (pgEv.gridId === 1) {
        const g2 = this.level.patternGrids.find(g => g.id === 2)
        if (g2) g2.activated = true
      }
      this.syncL3Objective()
    } else if (pgEv?.type === 'wrong') {
      audioManager.playSFX('wrong')
      this.hud.showMessage('PATTERN RESET', 0.8)
    } else if (pgEv?.type === 'correct') {
      this.hud.showMessage('STEP OK', 0.35)
    }

    if (
      this.level.weaponCrate.overlapsPlayer(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
    ) {
      if (!this.level.weaponCrate.data.collected) {
        this.level.weaponCrate.data.collected = true
        Haptics.fire('pickup')
        this.player.unlockWeapon(2)
        this.player.weaponSlot = 2
        this.hud.showMessage('PRISM SHOT UNLOCKED — Z TO FIRE, X TO SWITCH', 2.5)
      }
    }

    this.updateLockTarget()

    if (this.input.isJustPressed('KeyZ') && this.shootCD <= 0) {
      this.shootCD = this.shootCooldown
      audioManager.playSFX('shoot')
      const dir = this.player.isFacingRight ? 1 : -1
      const px =
        this.player.x + (dir > 0 ? this.player.width + 4 : -4)
      const py = this.player.y + this.player.height * 0.38
      const opts =
        this.player.weaponSlot === 1
          ? { empMode: true as const }
          : this.player.weaponSlot === 2
            ? { prismMode: true as const }
            : {}
      const proj = new Projectile(px, py, dir, opts)
      const lt = this.lockTarget
      if (lt && lt.active && this.player.weaponSlot === 0) {
        proj.lockOn(lt)
      } else if (this.player.weaponSlot === 0) {
        proj.vx = dir * 520
        proj.vy = 0
      }
      this.level.addProjectile(proj)
      this.player.muzzleFlashFrames = 4
      this.muzzleFlash = true
      this.muzzleFlashT = 0.07
      this.muzzleX = px
      this.muzzleY = py
    }

    for (const d of this.level.drones) {
      if (!d.active && !d.exploded) {
        d.exploded = true
        Haptics.fire('enemyDestroyed')
        audioManager.playSFX('enemyHit')
        this.level.onEnemyKilledAt(d.x)
        this.hud.addScore(DRONE_XP)
        this.score += DRONE_XP
        this.spawnFireDeath(d.x, d.y + 20)
      }
    }
    for (const e of this.level.enforcers) {
      if (!e.active && !e.scoreEmitted) {
        e.scoreEmitted = true
        Haptics.fire('enemyDestroyed')
        audioManager.playSFX('enemyHit')
        this.level.onEnemyKilledAt(e.x)
        this.hud.addScore(ENFORCER_XP)
        this.score += ENFORCER_XP
        this.spawnFireDeath(e.x, e.y)
      }
    }
    for (const w of this.level.wraiths) {
      if (!w.active && !w.scoreEmitted) {
        w.scoreEmitted = true
        Haptics.fire('enemyDestroyed')
        audioManager.playSFX('enemyHit')
        this.level.onEnemyKilledAt(w.x)
        this.hud.addScore(WRAITH_XP)
        this.score += WRAITH_XP
        this.spawnFireDeath(w.x, w.y)
      }
    }

    if (
      this.damageTimer <= 0 &&
      this.level.checkEnforcerBodyHit(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
    ) {
      this.applyDamage(1)
    }
    if (
      this.damageTimer <= 0 &&
      this.level.checkEnforcerOrbHit(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
    ) {
      this.applyDamage(1)
    }
    if (
      this.damageTimer <= 0 &&
      this.level.checkWraithHit(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
    ) {
      this.applyDamage(1)
    }

    if (this.introCameraX != null) {
      this.camera.syncFromXY(this.introCameraX, 0)
    } else {
      this.camera.follow(
        this.player,
        dt,
        LEVEL3_WORLD_WIDTH,
        CONFIG.CANVAS_HEIGHT,
      )
    }
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    this.level.update(
      dt,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    this.resolvePrismWallHits()
    this.applyProjectileHits()

    if (!this.level.levelComplete &&
      this.player.x > 9000 &&
      this.level.exitPortal.open) {
      this.level.levelComplete = true
      audioManager.playSFX('victory')
      this.player.vx = 0
      this.player.vy = 0
      this.talk(
        [
          {
            speaker: 'NOVA',
            text: 'Data Market cleared. You\'ve seen how data moves through this city — bought, sold, stolen.',
          },
          {
            speaker: 'AX',
            text: 'And how NeuroCorps uses it to control every district.',
          },
          {
            speaker: 'NOVA',
            text: 'The Forge is next. District 3 — where they turn this data into AI. Where the bias gets baked in.',
          },
          {
            speaker: 'AX',
            text: 'Then that\'s where we go.',
          },
        ],
        () => {
          this.showLevelCompleteCard = true
        },
      )
    }

    if (!this.lastOnGround && this.player.isOnGround) {
      this.spawnImpact(this.player.getFootX(), this.player.getFootY())
    }
    this.lastOnGround = this.player.isOnGround
    if (this.player.isOnGround && Math.abs(this.player.vx) > 40) {
      this.lastDust += dt
      if (this.lastDust > 0.1) {
        this.lastDust = 0
        const dir = this.player.isFacingRight ? -1 : 1
        this.spawnDust(
          this.player.getFootX() + (this.player.isFacingRight ? -12 : 12),
          this.player.getFootY(),
          dir,
        )
      }
    } else {
      this.lastDust = 0.1
    }

    this.syncL3Objective()
    this.prevPlayerX = this.player.getCenterX()
    this.input.update()
  }

  private renderLevelCompleteCard(ctx: CanvasRenderingContext2D): void {
    if (!this.showLevelCompleteCard) return
    const ORB = 'Orbitron'
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(0,0,0,0.92)'
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

    ctx.strokeStyle = '#e040fb'
    ctx.lineWidth = 3
    ctx.strokeRect(40, 40, CONFIG.CANVAS_WIDTH - 80, CONFIG.CANVAS_HEIGHT - 80)
    ctx.strokeStyle = 'rgba(0,229,255,0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(48, 48, CONFIG.CANVAS_WIDTH - 96, CONFIG.CANVAS_HEIGHT - 96)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#e040fb'
    ctx.font = `14px ${ORB}, sans-serif`
    ctx.fillText('DISTRICT 2', CONFIG.CANVAS_WIDTH / 2, 180)
    ctx.fillStyle = '#00e5ff'
    ctx.font = `22px ${ORB}, sans-serif`
    ctx.fillText('DATA MARKET — CLEARED', CONFIG.CANVAS_WIDTH / 2, 220)

    ctx.strokeStyle = '#e040fb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CONFIG.CANVAS_WIDTH / 2 - 200, 260)
    ctx.lineTo(CONFIG.CANVAS_WIDTH / 2 + 200, 260)
    ctx.stroke()

    ctx.fillStyle = '#ffcc00'
    ctx.font = `18px ${ORB}, sans-serif`
    ctx.fillText('+ 500 XP', CONFIG.CANVAS_WIDTH / 2, 300)

    ctx.fillStyle = '#ffffff'
    ctx.font = `11px ${ORB}, sans-serif`
    ctx.fillText(
      'Lesson: AI is only as honest as the data it learns from.',
      CONFIG.CANVAS_WIDTH / 2,
      340,
    )

    ctx.fillStyle = '#94a3b8'
    ctx.font = `italic 9px ${ORB}, sans-serif`
    ctx.fillText(
      '"Garbage in, garbage out. But this was worse — it was garbage put in on purpose."',
      CONFIG.CANVAS_WIDTH / 2,
      370,
      500,
    )

    const patternsOk = this.level.patternGrids.every(g => g.solved)
    const evidenceOk = this.level.evidenceCollected
    const kiranNpc = this.level.npcs.find(n => n.data.isKiran)
    const kiranOk = kiranNpc?.data.talked === true
    const badgeOk = [patternsOk, evidenceOk, kiranOk]
    const labels = ['PATTERNS', 'EVIDENCE', 'KIRAN'] as const
    const left0 = CONFIG.CANVAS_WIDTH / 2 - 80 - 40
    for (let i = 0; i < 3; i++) {
      const xl = left0 + i * (80 + 40)
      const ok = badgeOk[i]
      ctx.fillStyle = ok ? '#00ff88' : '#475569'
      ctx.fillRect(xl, 420, 80, 80)
      if (ok) {
        ctx.fillStyle = '#0a0614'
        ctx.font = `bold 32px ${ORB}, sans-serif`
        ctx.fillText('✓', xl + 40, 475)
      }
      ctx.fillStyle = '#e040fb'
      ctx.font = `8px ${ORB}, sans-serif`
      ctx.fillText(labels[i]!, xl + 40, 510)
    }

    const pulse = Math.sin(this.time * 4) * 0.3 + 0.7
    ctx.globalAlpha = pulse
    ctx.fillStyle = '#00e5ff'
    ctx.font = `10px ${ORB}, sans-serif`
    ctx.fillText(
      '[SPACE] CONTINUE TO DISTRICT 3',
      CONFIG.CANVAS_WIDTH / 2,
      520,
    )
    ctx.globalAlpha = 1

    for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.04)'
      ctx.fillRect(0, y, CONFIG.CANVAS_WIDTH, 1)
    }

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.textAlign = 'left'
    ctx.restore()
  }

  private applyDamage(amount: number): void {
    if (this.playerShield && !this.playerShieldConsumed) {
      this.playerShieldConsumed = true
      this.hud.showMessage('NANO SHIELD ABSORBED HIT', 2)
      return
    }
    this.hp -= amount
    Haptics.fire('playerDamage')
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.4
    this.triggerShake(6, 0.35)
    if (this.hp <= 0) {
      this.hud.showMessage('RESPAWNING', 2)
      this.hp = 3
      this.hud.setHP(3)
      this.playerShieldConsumed = false
      const respawnX = [...this.level.checkpoints].reverse().find(c => c.activated)?.x ?? 180
      this.player.x = respawnX
      this.player.y = this.groundY - this.player.height
      this.level.applySectionStart(respawnX)
      this.syncL3Objective()
      this.respawnFlashTimer = 0.6
    }
  }

  handleHudPointerDown(canvasX: number, canvasY: number): void {
    this.hud.handleClick(canvasX, canvasY)
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#0c0c14'
    ctx.fillRect(0, 0, 1280, 720)

    ctx.save()
    if (this.shakeMag > 0) {
      ctx.translate(this.shakeX, this.shakeY)
    }

    ctx.imageSmoothingEnabled = false
    this.bg.render(ctx, this.camera.x)
    this.level.render(ctx, this.camera.x, this.player.getCenterX())
    this.level.renderProjectiles(ctx, this.camera.x)
    this.renderParticles(ctx, this.camera.x)
    this.player.render(ctx, this.camera.x)
    if (this.scene === 'dialogue') {
      this.nova.render(ctx, this.camera.x)
    }
    renderPatternGridFloorTiles(
      ctx,
      this.level.patternGrids,
      this.camera.x,
      this.time,
      this.player.x,
    )
    renderPatternGridHudPanels(
      ctx,
      this.level.patternGrids,
      this.camera.x,
      this.time,
      this.player.x,
    )

    if (this.damageFlashTimer > 0) {
      const alpha = (this.damageFlashTimer / 0.4) * 0.22
      const grad = ctx.createRadialGradient(
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT / 2,
        160,
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT / 2,
        500,
      )
      grad.addColorStop(0, 'rgba(255,0,0,0)')
      grad.addColorStop(1, `rgba(220,0,0,${alpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    const lock = this.lockTarget
    if (lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = this.lockReticleY(lock)
      ctx.save()
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5 + Math.sin(this.lockTimer) * 0.25
      ctx.beginPath()
      ctx.arc(rx, ry, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
    }

    if (this.muzzleFlash) {
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.85
      ctx.fillRect(
        this.muzzleX - this.camera.x - 6,
        this.muzzleY - 6,
        12,
        12,
      )
      ctx.globalAlpha = 1
    }

    if (this.arenaFadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.arenaFadeAlpha})`
      ctx.fillRect(0, 0, 1280, 720)
    }

    this.hud.render(ctx, { deferControls: true })
    this.renderLevelCompleteCard(ctx)
    if (this.introCinematicActive) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 56)
      ctx.fillRect(
        0,
        CONFIG.CANVAS_HEIGHT - 56,
        CONFIG.CANVAS_WIDTH,
        56,
      )
    }
    if (this.dialogue.isVisible()) {
      const playerScreenY = this.player.y - this.camera.y
      if (playerScreenY > CONFIG.CANVAS_HEIGHT * 0.5) {
        this.dialogue.setPosition('top')
      } else {
        this.dialogue.setPosition('bottom')
      }
    }
    this.dialogue.render(ctx)
    this.shop.render(ctx, this.time)

    ctx.fillStyle = '#1a1535'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    const bottomHint = this.shop.isOpen()
      ? '↑↓ SELECT   E / SPACE CONFIRM   F CLOSE   (Z CONFIRMS BUY)'
      : this.showLevelCompleteCard
        ? '[SPACE] CONTINUE'
        : '← → / A D MOVE  ↑ / W / SPACE JUMP  Z SHOOT  X WEAPON  Q TARGET  E INTERACT'
    const hideGameplayHint =
      !this.shop.isOpen() &&
      !this.showLevelCompleteCard &&
      DeviceManager.shouldShowTouchOverlay()
    if (!hideGameplayHint) {
      ctx.fillText(bottomHint, 640, 712)
    }
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.6) * 0.3})`
      ctx.fillRect(0, 0, 1280, 720)
    }

    ctx.restore()

    this.missionCard.render(ctx)
  }
}
