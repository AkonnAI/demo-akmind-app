import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Projectile, type GravityField } from '../entities/Projectile'
import { Level6, LEVEL6_WORLD_WIDTH } from '../world/Level6'
import {
  renderMHzDialFullscreen,
  type MHzDialTerminal,
} from '../systems/FrequencyDial'
import { renderGravityFieldsVfx } from '../systems/gravityFieldVfx'
import { HUD } from '../ui/HUD'
import { DialogueBox } from '../ui/DialogueBox'
import { NovaOrb } from '../ui/NovaOrb'
import { CONFIG } from '../constants/config'
import { TouchControls } from '../ui/TouchControls'
import {
  createGateHack,
  updateGateHack,
  renderGateHackOverlay,
  type GateHackState,
} from '../systems/GateHack'

const DRONE_XP = 50
const SENTINEL_XP = 120
const NEXUS_XP = 200
const SPAWN_X = 180
const LOCK_RANGE = 520
const DAMAGE_IFRAMES = 1.5
const SHOOT_COOLDOWN = 0.28
const GRAVITY_FIRE_CD = 2.5
const INJECT_FLASH_T = 0.3
const INJECT_GLITCH_T = 0.52

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
  text: string
  expression?: string
}

type LockableEnemy = { x: number; y: number; active: boolean }

interface PulseWave {
  id: number
  cx: number
  cy: number
  r: number
  t: number
  maxT: number
  hit: Set<string>
}

type InjectFinalePhase = 'flash' | 'glitch'

export type GameScene6LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene6LaunchOptions,
): GameScene6LaunchOptions {
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

export class GameScene6 {
  private readonly groundY = 610

  private input: InputManager
  private camera: Camera
  private player: Player
  private level: Level6
  private hud: HUD
  private dialogue: DialogueBox
  private nova: NovaOrb

  private hp = 3
  private score = 0
  private time = 0
  private scene: Scene = 'play'

  private damageTimer = 0
  private damageFlashTimer = 0
  private shootCD = 0
  private shootCooldown = SHOOT_COOLDOWN
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

  private respawnFlashTimer = 0
  private respawnX = SPAWN_X
  private respawnY = 0
  private prevPlayerX = 0

  private dialMode: MHzDialTerminal | null = null
  private injectHack: GateHackState | null = null
  private injectFinale: { phase: InjectFinalePhase; t: number } | null = null
  private gravityFields: GravityField[] = []
  private gravityFireCD = 0
  private pulseWaves: PulseWave[] = []
  private nextPulseWaveId = 1
  private injectOffered = false

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene6LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
    this.input = input
    this.camera = new Camera()
    this.level = new Level6(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l6_')
    this.nova = new NovaOrb()

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.respawnX = Math.max(40, sx - 40)
    this.respawnY = this.groundY - this.player.height
    this.prevPlayerX = this.player.getCenterX()
    this.player.hasWeapon = [true, true, true, true, true, false, false]
    this.player.weaponSlot = 0

    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 6 — THE BROADCAST CORE')
    this.syncObjective()
    this.nova.show(260, this.groundY - 100)
    this.onLevelComplete = onLevelComplete

    if (opts.startX != null) {
      this.level.applySectionStart(opts.startX)
      this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
    }
    console.log('[GameScene6] Level 6 — Broadcast Core.')
  }

  private syncObjective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const g3 = this.level.gates.find(g => g.id === 3)?.open
    let obj: string
    if (!g1) obj = 'GATE 1 — TUNE DIAL (E AT TERMINAL)'
    else if (!g3) obj = 'GATE 2 — SECOND DIAL'
    else if (!this.level.injectUsed)
      obj = 'INJECT EVIDENCE AT TRANSMITTER (E)'
    else obj = 'VOLUME 1 COMPLETE'
    this.hud.setObjective(obj)
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

  private respawn(): void {
    this.hp = 3
    this.hud.setHP(3)
    this.player.x = this.respawnX
    this.player.y = this.respawnY
    this.player.vx = 0
    this.player.vy = 0
    this.respawnFlashTimer = 0.55
    this.hud.showMessage('RESPAWNED', 1.5)
  }

  private buildLockables(): LockableEnemy[] {
    const list: LockableEnemy[] = []
    for (const d of this.level.drones) {
      if (
        !d.active ||
        !(d as { activated?: boolean }).activated
      )
        continue
      list.push(d)
    }
    for (const s of this.level.sentinels) {
      if (!s.active || !s.activated) continue
      list.push({ x: s.x, y: s.y - 10, active: true })
    }
    const nx = this.level.nexus
    if (nx?.active && nx.activated) {
      list.push({ x: nx.x, y: nx.y, active: true })
    }
    return list
  }

  private resolvePrismWallHits(): void {
    const gy = this.groundY
    const maxX = LEVEL6_WORLD_WIDTH
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

  private applyGravityFields(dt: number): void {
    for (let i = this.gravityFields.length - 1; i >= 0; i--) {
      const gf = this.gravityFields[i]!
      gf.timer -= dt
      if (gf.timer <= 0) {
        this.gravityFields.splice(i, 1)
        continue
      }
      const pull = 200 * dt
      for (const d of this.level.drones) {
        if (!d.active) continue
        const dx = gf.x - d.x
        const dy = gf.y - d.y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < gf.radius) {
          d.x += (dx / dist) * pull * 0.9
          d.y += (dy / dist) * pull * 0.35
        }
      }
      for (const s of this.level.sentinels) {
        if (!s.active) continue
        const dx = gf.x - s.x
        const dy = gf.y - s.y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < gf.radius) {
          s.x += (dx / dist) * pull * 0.85
          s.y += (dy / dist) * pull * 0.2
        }
      }
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

      for (const s of this.level.sentinels) {
        if (!s.active) continue
        if (!rectsOverlap(s.getRect(), proj.getRect())) continue
        if (proj.empMode) s.stun(3)
        else s.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      const nx = this.level.nexus
      if (nx?.active && nx.isVulnerable()) {
        if (rectsOverlap(nx.getRect(), proj.getRect())) {
          nx.takeHit()
          proj.active = false
        }
      }
    }
  }

  private updatePulseWaves(dt: number): void {
    for (const w of this.pulseWaves) {
      w.t += dt
      w.r += 320 * dt
    }
    this.pulseWaves = this.pulseWaves.filter(w => w.t < w.maxT)

    const ringW = 48
    for (const w of this.pulseWaves) {
      const hitR = w.r
      const inner = hitR - ringW
      for (let i = 0; i < this.level.drones.length; i++) {
        const d = this.level.drones[i]!
        if (!d.active) continue
        const key = `d:${i}:${w.id}`
        if (w.hit.has(key)) continue
        const dist = Math.hypot(d.x - w.cx, d.y - w.cy)
        if (dist < hitR && dist > inner) {
          w.hit.add(key)
          d.stun(2.2)
          const ux = (d.x - w.cx) / (dist || 1)
          const uy = (d.y - w.cy) / (dist || 1)
          d.x += ux * 42
          d.y += uy * 16
          for (let k = 0; k < 3; k++) d.takeHit()
        }
      }
      for (let i = 0; i < this.level.sentinels.length; i++) {
        const s = this.level.sentinels[i]!
        if (!s.active) continue
        const key = `s:${i}:${w.id}`
        if (w.hit.has(key)) continue
        const dist = Math.hypot(s.x - w.cx, s.y - w.cy)
        if (dist < hitR && dist > inner - 5) {
          w.hit.add(key)
          s.stun(2.4)
          const ux = (s.x - w.cx) / (dist || 1)
          const uy = (s.y - w.cy) / (dist || 1)
          s.x += ux * 38
          s.y += uy * 12
          s.takeHit()
          s.takeHit()
        }
      }
      const nx = this.level.nexus
      if (nx?.active && nx.isVulnerable()) {
        const key = `nx:${w.id}`
        if (!w.hit.has(key)) {
          const dist = Math.hypot(nx.x - w.cx, nx.y - w.cy)
          if (dist < hitR && dist > inner - 8) {
            w.hit.add(key)
            const ux = (nx.x - w.cx) / (dist || 1)
            const uy = (nx.y - w.cy) / (dist || 1)
            nx.x += ux * 24
            nx.y += uy * 10
            nx.takeHit()
            nx.takeHit()
          }
        }
      }
    }
  }

  private applyDamage(n: number): void {
    this.hp -= n
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.35
    this.triggerShake(6, 0.3)
    if (this.hp <= 0) this.respawn()
  }

  update(dt: number): void {
    const prevCx = this.prevPlayerX
    this.time += dt
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
    if (this.damageFlashTimer > 0)
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt)
    this.lockTimer += dt * 4
    this.gravityFireCD = Math.max(0, this.gravityFireCD - dt)
    if (this.muzzleFlash) {
      this.muzzleFlashT -= dt
      if (this.muzzleFlashT <= 0) this.muzzleFlash = false
    }
    if (this.respawnFlashTimer > 0)
      this.respawnFlashTimer = Math.max(0, this.respawnFlashTimer - dt)

    if (this.injectFinale) {
      this.injectFinale.t -= dt
      if (this.injectFinale.t <= 0) {
        if (this.injectFinale.phase === 'flash') {
          this.injectFinale = { phase: 'glitch', t: INJECT_GLITCH_T }
        } else {
          this.injectFinale = null
          this.injectHack = createGateHack(100, 6, {
            roundDuration: 0.85,
            title: 'INJECT UPLINK',
          })
        }
      }
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    if (this.injectHack) {
      this.injectHack = updateGateHack(
        this.injectHack,
        dt,
        this.input,
        () => {
          this.injectHack = null
          this.level.injectUsed = true
          this.talk(
            [
              {
                speaker: 'NOVA',
                text: 'Broadcast successful. Every screen in Neuropolis just showed the truth.',
              },
              {
                speaker: 'KIRAN',
                text: 'My phone. Messages from District 1, 2, 3... bhai they are all awake.',
              },
              { speaker: 'AX', text: 'NEXUS 2.0 is still running. We stopped one broadcast.' },
              {
                speaker: 'NPC',
                text: 'The algorithm itself — it is still active. You need to get inside it.',
              },
              {
                speaker: 'NOVA',
                text: 'Volume 2. The Neural Core. That is the only way to end this.',
              },
              { speaker: 'AX', text: 'Then we go in.' },
            ],
            () => this.onLevelComplete?.(),
          )
        },
        () => {},
        (m, d) => this.hud.showMessage(m, d),
        (mag, dur) => this.triggerShake(mag, dur),
      )
      this.dialogue.update(dt)
      this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    if (this.dialMode) {
      const d = this.dialMode
      if (this.input.isHeld('ArrowLeft'))
        d.currentFreq = Math.max(0, d.currentFreq - 8 * dt)
      if (this.input.isHeld('ArrowRight'))
        d.currentFreq = Math.min(100, d.currentFreq + 8 * dt)
      if (this.input.isJustPressed('KeyE')) {
        if (Math.abs(d.currentFreq - d.targetFreq) <= d.tolerance) {
          d.solved = true
          this.level.openGate(d.gateId)
          this.dialMode = null
          this.hud.showMessage('FREQUENCY LOCKED', 2)
          this.syncObjective()
        } else {
          this.applyDamage(1)
          d.currentFreq = 50
          this.hud.showMessage('SURGE — FREQUENCY RESET', 2)
        }
      }
      if (this.input.isJustPressed('Escape')) {
        this.dialMode = null
        this.hud.showMessage('TUNING CANCELLED', 1)
      }
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

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
      }
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    this.player.update(dt, this.input)

    if (this.player.y > this.groundY + 80) {
      this.respawn()
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
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
      if (this.player.vy > 0) this.player.vy = 0
      this.player.isOnGround = true
    } else {
      this.player.isOnGround = false
    }

    const gb = this.level.getBlockingGate(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    if (gb) {
      this.player.x -= this.player.vx * dt * 2
      this.player.vx = 0
    }

    const cx = this.player.getCenterX()
    const cy = this.player.y + this.player.height / 2
    const st = this.level.peekSectionTrigger(prevCx, cx)
    if (st) {
      if (!DialogueBox.hasFired(st.key)) {
        DialogueBox.markFired(st.key)
        st.fired = true
        this.talk(st.dialogue as DialogueLine[])
      } else st.fired = true
    }

    const cp = this.level.updateCheckpointsForPlayer(cx)
    if (cp) {
      this.respawnX = Math.max(40, cp.x - 20)
      this.respawnY = this.groundY - this.player.height
    }

    if (this.input.isJustPressed('KeyX')) {
      this.player.switchWeapon()
      this.hud.showMessage(`${this.player.currentWeaponName()} READY`, 1)
    }

    if (this.input.isJustPressed('KeyE')) {
      const dial = this.level.getNearDial(cx, cy)
      if (dial) {
        this.dialMode = dial
        this.input.update()
        return
      }
      if (
        !this.injectOffered &&
        this.level.getNearInject(cx, this.player.y + this.player.height) &&
        this.level.exitPortal.open &&
        !this.level.injectUsed
      ) {
        this.injectOffered = true
        this.talk(
          [
            { speaker: 'NOVA', text: 'Evidence injected. Broadcasting city-wide in 3...' },
            { speaker: 'AX', text: 'Do it.' },
            { speaker: 'NOVA', text: '2... 1...' },
          ],
          () => {
            this.injectFinale = { phase: 'flash', t: INJECT_FLASH_T }
          },
        )
        this.input.update()
        return
      }
      const npc = this.level.getNearNPC(cx)
      if (npc && !npc.data.talked) {
        npc.data.talked = true
        this.talk(npc.data.dialogue as DialogueLine[])
      }
    }

    const slot = this.player.weaponSlot
    if (slot === 5) {
      if (this.input.isHeld('KeyZ')) {
        this.player.isCharging = true
        this.player.chargeT = Math.min(0.85, this.player.chargeT + dt)
      }
      if (this.input.isJustReleased('KeyZ')) {
        const ch = this.player.chargeT
        this.player.chargeT = 0
        this.player.isCharging = false
        if (ch >= 0.8) {
          this.pulseWaves.push({
            id: this.nextPulseWaveId++,
            cx: this.player.getCenterX(),
            cy: this.player.y + this.player.height * 0.4,
            r: 20,
            t: 0,
            maxT: 0.65,
            hit: new Set(),
          })
          this.triggerShake(10, 0.4)
        } else if (this.shootCD <= 0) {
          this.shootCD = this.shootCooldown * 0.7
          const dir = this.player.isFacingRight ? 1 : -1
          const px =
            this.player.x + (dir > 0 ? this.player.width + 4 : -4)
          const py = this.player.y + this.player.height * 0.38
          this.level.addProjectile(
            new Projectile(px, py, dir, {
              vx: dir * 620,
              vy: 0,
              life: 0.45,
              color: '#ff1744',
            }),
          )
          this.player.muzzleFlashFrames = 3
        }
      }
    } else if (this.input.isJustPressed('KeyZ') && this.shootCD <= 0) {
      if (slot === 3 && this.gravityFireCD > 0) {
        /* wait */
      } else {
        this.shootCD =
          slot === 3 ? this.shootCooldown + 0.12 : this.shootCooldown
        if (slot === 3) this.gravityFireCD = GRAVITY_FIRE_CD
        const dir = this.player.isFacingRight ? 1 : -1
        const px =
          this.player.x + (dir > 0 ? this.player.width + 4 : -4)
        const py = this.player.y + this.player.height * 0.38
        const opts =
          slot === 1
            ? { empMode: true as const }
            : slot === 2
              ? { prismMode: true as const }
              : slot === 3
                ? { gravityMode: true as const }
                : slot === 4
                  ? { mirrorMode: true as const }
                  : {}
        const proj = new Projectile(px, py, dir, opts)
        const lt = this.lockTarget
        if (lt && lt.active && slot === 0) proj.lockOn(lt)
        this.level.addProjectile(proj)
        this.player.muzzleFlashFrames = 4
        this.muzzleFlash = true
        this.muzzleFlashT = 0.07
        this.muzzleX = px
        this.muzzleY = py
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
      this.lockTarget = this.lockables[this.lockCycleIndex] ?? null
    }

    for (const d of this.level.drones) {
      if (!d.active && !d.exploded) {
        d.exploded = true
        this.hud.addScore(DRONE_XP)
        this.score += DRONE_XP
      }
    }
    for (const s of this.level.sentinels) {
      if (!s.active && !s.scoreEmitted) {
        s.scoreEmitted = true
        this.hud.addScore(SENTINEL_XP)
        this.score += SENTINEL_XP
      }
    }
    const nx = this.level.nexus
    if (nx && !nx.active && !nx.scoreEmitted) {
      nx.scoreEmitted = true
      this.hud.addScore(NEXUS_XP)
      this.score += NEXUS_XP
    }

    if (this.damageTimer <= 0) {
      for (const s of this.level.sentinels) {
        if (s.active && s.checkShotHit(
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
        )) {
          this.applyDamage(1)
          break
        }
      }
    }

    this.level.update(
      dt,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    for (const g of this.level.drainSpawnedGravityFields())
      this.gravityFields.push(g)
    this.applyGravityFields(dt)
    this.resolvePrismWallHits()
    this.applyProjectileHits()
    this.updatePulseWaves(dt)

    this.camera.follow(this.player.getCenterX(), LEVEL6_WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    if (
      this.level.weaponCrate.overlapsPlayer(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      ) &&
      !this.level.weaponCrate.data.collected
    ) {
      this.level.weaponCrate.data.collected = true
      this.player.unlockWeapon(5)
      this.player.weaponSlot = 5
      this.hud.showMessage('PULSE CANNON — HOLD Z TO CHARGE', 2.8)
    }

    this.syncObjective()
    this.prevPlayerX = cx
    this.input.update()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#14040a'
    ctx.fillRect(0, 0, 1280, 720)

    ctx.save()
    if (this.shakeMag > 0) ctx.translate(this.shakeX, this.shakeY)
    ctx.imageSmoothingEnabled = false
    this.level.render(ctx, this.camera.x)

    for (const w of this.pulseWaves) {
      const sx = w.cx - this.camera.x
      ctx.save()
      ctx.strokeStyle = 'rgba(255,23,68,0.5)'
      ctx.lineWidth = 5
      ctx.shadowColor = '#ff1744'
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.arc(sx, w.cy, w.r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx, w.cy, Math.max(8, w.r - 44), 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.restore()
    }

    renderGravityFieldsVfx(ctx, this.gravityFields, this.camera.x, this.time, {
      accent: '#00e5ff',
    })

    this.player.render(ctx, this.camera.x)
    this.nova.render(ctx, this.camera.x)

    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,30,30,${(this.damageFlashTimer / 0.35) * 0.2})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    const lock = this.lockTarget
    if (lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = lock.y
      ctx.save()
      ctx.strokeStyle = '#ff1744'
      ctx.globalAlpha = 0.45
      ctx.beginPath()
      ctx.arc(rx, ry, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    if (this.muzzleFlash) {
      ctx.fillStyle = '#fff'
      ctx.globalAlpha = 0.85
      ctx.fillRect(this.muzzleX - this.camera.x - 5, this.muzzleY - 5, 10, 10)
      ctx.globalAlpha = 1
    }

    this.hud.render(ctx, { deferControls: true })
    this.dialogue.render(ctx)

    if (this.dialMode)
      renderMHzDialFullscreen(ctx, this.dialMode, this.time)

    if (this.injectFinale) {
      const W = CONFIG.CANVAS_WIDTH
      const H = CONFIG.CANVAS_HEIGHT
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      if (this.injectFinale.phase === 'flash') {
        const u = 1 - this.injectFinale.t / INJECT_FLASH_T
        ctx.fillStyle = `rgba(255,255,255,${0.2 + u * 0.55})`
        ctx.fillRect(0, 0, W, H)
      } else {
        ctx.fillStyle = `rgba(0,255,200,${0.06 + Math.sin(this.time * 20) * 0.04})`
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        for (let i = 0; i < 28; i++) {
          const y = ((i * 37 + this.time * 180) % (H + 40)) - 20
          const skew = Math.sin(this.time * 14 + i) * 6
          ctx.fillRect(skew, y, W, 2)
        }
        ctx.strokeStyle = 'rgba(255,23,68,0.25)'
        ctx.lineWidth = 1
        for (let j = 0; j < 12; j++) {
          const x = ((j * 113 - this.time * 260) % (W + 80)) - 40
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x + (j % 2 === 0 ? 40 : -30), H)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    if (this.injectHack)
      renderGateHackOverlay(ctx, this.injectHack, this.time)

    ctx.fillStyle = '#f0f0f0'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      '← → MOVE  ↑ JUMP  Z SHOOT/HOLD(PULSE)  X WEAPON  Q TARGET  E INTERACT',
      640,
      712,
    )
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.55) * 0.28})`
      ctx.fillRect(0, 0, 1280, 720)
    }
    ctx.restore()
  }
}
