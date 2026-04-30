import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
import { Level7, LEVEL7_WORLD_WIDTH, type L7Gate } from '../world/Level7'
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
const SPAWN_X = 180
const LOCK_RANGE = 520
const DAMAGE_IFRAMES = 1.5
const SHOOT_COOLDOWN = 0.28
const GRAVITY_FIRE_CD = 2.5

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR' | 'CHAOS'
  text: string
  expression?: string
}

type LockableEnemy = { x: number; y: number; active: boolean }

export type GameScene7LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene7LaunchOptions,
): GameScene7LaunchOptions {
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

export class GameScene7 {
  private readonly groundY = 610

  private input: InputManager
  private camera: Camera
  private player: Player
  private level: Level7
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

  private gateHack: GateHackState | null = null
  private gravityFireCD = 0
  private weaponJamT = 0
  private beamHitCD = 0
  private coreBeamCD = 0

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene7LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
    this.input = input
    this.camera = new Camera()
    this.level = new Level7(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l7_')
    this.nova = new NovaOrb()

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.respawnX = Math.max(40, sx - 40)
    this.respawnY = this.groundY - this.player.height
    this.prevPlayerX = this.player.getCenterX()
    this.player.hasWeapon = [true, true, true, true, true, true, false]
    this.player.hasDoubleJump = true
    this.player.weaponSlot = 0

    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 7 — THE NEURAL CORE')
    this.syncObjective()
    this.nova.show(260, this.groundY - 100)
    this.nova.setCorrupted(1)
    this.onLevelComplete = onLevelComplete

    if (opts.startX != null) {
      this.level.applySectionStart(opts.startX)
      this.camera.follow(this.player.getCenterX(), LEVEL7_WORLD_WIDTH)
    }
  }

  private syncObjective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const all = this.level.allCoresDestroyed()
    let obj: string
    if (!g1) obj = 'GATE 1 — SECURITY QTE'
    else if (!all) obj = 'DESTROY THREE NEXUS MODULE CORES'
    else if (!this.level.exitPortal.open) obj = 'REACH EXIT'
    else obj = 'PROCEED TO CHAOS PROTOCOL'
    this.hud.setObjective(obj)
  }

  private updateNovaCorruption(): void {
    const c1 = this.level.moduleCores.find(c => c.id === 1)
    const c2 = this.level.moduleCores.find(c => c.id === 2)
    if (c1 && c1.hp <= 0) this.nova.setCorrupted(2)
    if (c2 && c2.hp <= 0) this.nova.setCorrupted(3)
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

  private applyDamage(n: number): void {
    this.hp -= n
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.35
    this.triggerShake(6, 0.28)
    if (this.hp <= 0) this.respawn()
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
    for (const ph of this.level.phantoms) {
      if (!ph.active || !ph.activated || !ph.isSolidVisible()) continue
      list.push(ph)
    }
    for (const g of this.level.guards) {
      if (!g.active || !g.activated) continue
      list.push(g)
    }
    return list
  }

  private applyProjectileHits(): void {
    for (const proj of this.level.projectiles) {
      if (!proj.active || proj.hostile) continue
      this.level.applyGravityPullToCore(proj)

      const pulseCharged = proj.chargedPulse
      if (this.level.resolveProjectileAgainstCore(proj, pulseCharged)) continue

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

      for (const g of this.level.guards) {
        if (!g.active) continue
        if (!rectsOverlap(g.getRect(), proj.getRect())) continue
        if (proj.empMode) g.stun(3)
        if (proj.phaseMode) g.takeHit()
        else g.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const ph of this.level.phantoms) {
        if (!ph.active) continue
        if (!rectsOverlap(ph.getRect(), proj.getRect())) continue
        if (proj.phaseMode) ph.reveal(3)
        ph.takeHit()
        proj.active = false
        break
      }
    }
  }

  private hostileProjectileHits(): void {
    const px = this.player.getCenterX()
    const py = this.player.y + this.player.height / 2
    if (this.damageTimer > 0 || this.beamHitCD > 0) return
    for (const proj of this.level.projectiles) {
      if (!proj.active || !proj.hostile) continue
      if (
        proj.x > this.player.x &&
        proj.x < this.player.x + this.player.width &&
        proj.y > this.player.y &&
        proj.y < this.player.y + this.player.height
      ) {
        proj.active = false
        this.applyDamage(1)
      }
    }
    for (const g of this.level.guards) {
      const b = g.getActiveBeam()
      if (!b || !g.active) continue
      const distSeg = (x: number, y: number) => {
        const x1 = b.x1
        const y1 = b.y1
        const x2 = b.x2
        const y2 = b.y2
        const dx = x2 - x1
        const dy = y2 - y1
        const t = Math.max(
          0,
          Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)),
        )
        const qx = x1 + dx * t
        const qy = y1 + dy * t
        return Math.hypot(x - qx, y - qy)
      }
      if (distSeg(px, py) < 14) {
        this.beamHitCD = 0.45
        this.applyDamage(1)
      }
    }
    void py
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

    if (this.gateHack) {
      this.gateHack = updateGateHack(
        this.gateHack,
        dt,
        this.input,
        () => {
          this.gateHack = null
          this.level.openGate(1)
          this.hud.showMessage('GATE OPEN', 1.5)
          this.syncObjective()
        },
        () => {},
        (m, d) => this.hud.showMessage(m, d),
        (mag, dur) => this.triggerShake(mag, dur),
      )
      this.camera.follow(this.player.getCenterX(), LEVEL7_WORLD_WIDTH)
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
      this.camera.follow(this.player.getCenterX(), LEVEL7_WORLD_WIDTH)
      this.prevPlayerX = this.player.getCenterX()
      this.input.update()
      return
    }

    this.weaponJamT = Math.max(0, this.weaponJamT - dt)
    this.beamHitCD = Math.max(0, this.beamHitCD - dt)
    this.coreBeamCD = Math.max(0, this.coreBeamCD - dt)
    if (this.weaponJamT > 0) this.player.weaponSlot = 0

    this.player.update(dt, this.input)

    for (const ph of this.level.phantoms) {
      if (!ph.active) continue
      if (
        rectsOverlap(ph.getRect(), {
          x: this.player.x,
          y: this.player.y,
          w: this.player.width,
          h: this.player.height,
        })
      ) {
        if (ph.isSolidVisible()) {
          this.weaponJamT = 2
          this.hud.showMessage('WEAPON INTERFERENCE — 2s', 1.8)
        }
      }
    }

    if (this.player.y > this.groundY + 120) {
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
      this.player.resolveGround(this.groundY)
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
      const gate = this.level.getBlockingGate(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      ) as L7Gate | null
      if (gate && gate.id === 1 && !gate.open && gate.mechanic === 'qte') {
        this.gateHack = createGateHack(gate.id, 4)
        this.input.update()
        return
      }
      if (this.level.tryCollectEvidence(this.player.x, this.player.y)) {
        this.level.markEvidenceConsumed()
        this.talk([
          {
            speaker: 'NOVA',
            text: '[STATIC] This module stores identity weights.',
          },
          {
            speaker: 'NOVA',
            text: '[STATIC] Who is trusted. Who is [STATIC] feared. Who is [STATIC]',
          },
          { speaker: 'NOVA', text: '[STATIC][STATIC][STATIC] AX. I need you to [STATIC]' },
          {
            speaker: 'NOVA',
            text: '[STATIC] I need you to remember 1950. 1956. 1997. 2012. 2022.',
          },
        ])
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
                  : slot === 6
                    ? { phaseMode: true as const }
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
    for (const e of this.lockables) {
      const dist = Math.hypot(e.x - cx, e.y - cy)
      if (dist < best) {
        best = dist
        nearest = e
      }
    }
    this.lockTarget = nearest

    if (this.input.isJustPressed('KeyQ') && this.lockables.length > 0) {
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

    this.level.update(
      dt,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    this.applyProjectileHits()
    this.hostileProjectileHits()
    if (
      this.damageTimer <= 0 &&
      this.coreBeamCD <= 0 &&
      this.level.checkCoreBeamHitsPlayer(cx, cy)
    ) {
      this.coreBeamCD = 0.35
      this.applyDamage(1)
    }

    this.camera.follow(this.player.getCenterX(), LEVEL7_WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)
    this.updateNovaCorruption()

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
      this.player.unlockWeapon(6)
      this.player.weaponSlot = 6
      this.hud.showMessage('PHASE SHOT — BYPASSES SHIELDS', 2.5)
    }

    if (
      !this.level.levelComplete &&
      this.player.x > this.level.levelEnd &&
      this.level.allCoresDestroyed()
    ) {
      this.level.levelComplete = true
      this.talk(
        [
          { speaker: 'AX', text: 'Three cores down.' },
          {
            speaker: 'KIRAN',
            text: 'NOVA is still here. But she is different.',
          },
          {
            speaker: 'NPC',
            text: 'CHAOS is ahead. Whatever you find there...',
          },
          {
            speaker: 'NPC',
            text: 'It knows you, AX. It learned from someone who loves you.',
          },
        ],
        () => this.onLevelComplete?.(),
      )
    }

    this.syncObjective()
    this.prevPlayerX = cx
    this.input.update()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, 1280, 720)

    ctx.save()
    if (this.shakeMag > 0) ctx.translate(this.shakeX, this.shakeY)
    ctx.imageSmoothingEnabled = false
    this.level.render(ctx, this.camera.x)
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
      ctx.strokeStyle = '#7c3dff'
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

    if (this.gateHack)
      renderGateHackOverlay(ctx, this.gateHack, this.time)

    ctx.fillStyle = '#e2e8f0'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      '← → MOVE  ↑ JUMP  Z SHOOT  X WEAPON  Q TARGET  E INTERACT',
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
