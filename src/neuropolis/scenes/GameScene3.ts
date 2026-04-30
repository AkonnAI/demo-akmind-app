import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
import { Level3, LEVEL3_WORLD_WIDTH } from '../world/Level3'
import { ParallaxBackground } from '../world/ParallaxBackground'
import { updatePatternGrids } from '../systems/PatternGrid'
import { HUD } from '../ui/HUD'
import { DialogueBox } from '../ui/DialogueBox'
import { NovaOrb } from '../ui/NovaOrb'
import { UpgradeShop } from '../ui/UpgradeShop'
import { CONFIG } from '../constants/config'
import { TouchControls } from '../ui/TouchControls'

const DRONE_XP = 50
const ENFORCER_XP = 80
const WRAITH_XP = 55

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
  text: string
  expression?: string
}

type LockableEnemy = { x: number; y: number; active: boolean }

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

  private hp = 3
  private score = 0
  private time = 0
  private scene: Scene = 'play'

  private lastDust = 0
  private damageTimer = 0
  private damageFlashTimer = 0
  private shootCD = 0
  private shootCooldown = 0.28
  private lockTarget: LockableEnemy | null = null
  private lockables: LockableEnemy[] = []
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

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene3LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
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
    )

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.prevPlayerX = this.player.getCenterX()
    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 3 — THE DATA MARKET')
    this.syncL3Objective()
    this.nova.show(260, this.groundY - 100)
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
      this.camera.x = introStart
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
    this.dialogue.show(lines as Parameters<DialogueBox['show']>[0], () => {
      this.scene = 'play'
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

  private buildLockables(): LockableEnemy[] {
    const list: LockableEnemy[] = []
    for (const d of this.level.drones) if (d.active) list.push(d)
    for (const c of this.level.cameras) list.push(c)
    for (const e of this.level.enforcers)
      if (e.active) list.push({ x: e.x, y: e.y - 10, active: true })
    return list
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
      if (
        this.input.isJustPressed('Space') ||
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
          this.camera.x = target
        } else {
          this.camera.x = Math.round(this.introCameraX)
        }
      } else {
        this.camera.follow(this.player.getCenterX(), LEVEL3_WORLD_WIDTH)
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
      this.camera.follow(this.player.getCenterX(), LEVEL3_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    this.player.update(dt, this.input)

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
      this.player.x -= this.player.vx * dt * 2
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
            () => this.level.markEvidenceConsumed(),
          )
        } else {
          this.level.markEvidenceConsumed()
        }
        this.syncL3Objective()
        this.input.update()
        return
      }
      const npc = this.level.getNearNPC(this.player.getCenterX())
      if (npc && !npc.data.talked) {
        npc.data.talked = true
        this.talk(npc.data.dialogue as DialogueLine[])
      }
    }

    const pgEv = updatePatternGrids(
      this.level.patternGrids,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      dt,
    )
    if (pgEv?.type === 'solved') {
      this.level.openGate(pgEv.gateId)
      this.hud.addScore(100)
      this.score += 100
      this.hud.showMessage('PATTERN LOCK OPEN — +100 XP', 2)
      this.syncL3Objective()
    } else if (pgEv?.type === 'wrong') {
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
        this.player.unlockWeapon(2)
        this.player.weaponSlot = 2
        this.hud.showMessage('PRISM SHOT UNLOCKED — Z TO FIRE, X TO SWITCH', 2.5)
      }
    }

    this.lockables = this.buildLockables()
    let nearest: LockableEnemy | null = null
    let best = LOCK_RANGE
    const pcx = this.player.getCenterX()
    const pcy = this.player.y + this.player.height / 2
    for (const e of this.lockables) {
      const dist = Math.hypot(e.x - pcx, e.y - pcy)
      if (dist < best) {
        best = dist
        nearest = e
      }
    }
    this.lockTarget = nearest

    if (
      this.input.isJustPressed('KeyQ') &&
      this.lockables.length > 0
    ) {
      this.lockCycleIndex =
        (this.lockCycleIndex + 1) % this.lockables.length
      this.lockTarget =
        this.lockables[this.lockCycleIndex] ?? null
    }

    if (this.input.isJustPressed('KeyZ') && this.shootCD <= 0) {
      this.shootCD = this.shootCooldown
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
        this.level.onEnemyKilledAt(d.x)
        this.hud.addScore(DRONE_XP)
        this.score += DRONE_XP
        this.spawnFireDeath(d.x, d.y + 20)
      }
    }
    for (const e of this.level.enforcers) {
      if (!e.active && !e.scoreEmitted) {
        e.scoreEmitted = true
        this.level.onEnemyKilledAt(e.x)
        this.hud.addScore(ENFORCER_XP)
        this.score += ENFORCER_XP
        this.spawnFireDeath(e.x, e.y)
      }
    }
    for (const w of this.level.wraiths) {
      if (!w.active && !w.scoreEmitted) {
        w.scoreEmitted = true
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

    const camTarget =
      this.introCameraX != null
        ? this.introCameraX
        : this.player.getCenterX()
    this.camera.follow(camTarget, LEVEL3_WORLD_WIDTH)
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
      this.talk(
        [
          {
            speaker: 'NOVA',
            text: 'Data Market cleared. Kiran is with us now.',
          },
          {
            speaker: 'KIRAN',
            text: 'District 2 is different. Richer. They will not expect us.',
          },
          { speaker: 'AX', text: 'Good.' },
        ],
        () => {
          this.onLevelComplete?.()
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

  private applyDamage(amount: number): void {
    if (this.playerShield && !this.playerShieldConsumed) {
      this.playerShieldConsumed = true
      this.hud.showMessage('NANO SHIELD ABSORBED HIT', 2)
      return
    }
    this.hp -= amount
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.4
    this.triggerShake(6, 0.35)
    if (this.hp <= 0) {
      this.hud.showMessage('RESPAWNING', 2)
      this.hp = 3
      this.hud.setHP(3)
      this.playerShieldConsumed = false
      this.player.x = this.level.checkpoints.find(c => c.activated)?.x ?? 180
      this.player.y = this.groundY - this.player.height
      this.respawnFlashTimer = 0.6
    }
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
    this.level.render(ctx, this.camera.x)
    this.renderParticles(ctx, this.camera.x)
    this.player.render(ctx, this.camera.x)
    this.nova.render(ctx, this.camera.x)

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
      const ry = lock.y
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
    this.dialogue.render(ctx)
    this.shop.render(ctx, this.time)

    ctx.fillStyle = '#1a1535'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      this.shop.isOpen()
        ? '↑↓ SELECT   Z PURCHASE   F CLOSE'
        : '← → MOVE  ↑/SPACE JUMP  Z SHOOT  X WEAPON  Q TARGET  E INTERACT',
      640,
      712,
    )
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.6) * 0.3})`
      ctx.fillRect(0, 0, 1280, 720)
    }

    ctx.restore()
  }
}
