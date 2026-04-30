import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Projectile, type GravityField } from '../entities/Projectile'
import { Level4, LEVEL4_WORLD_WIDTH } from '../world/Level4'
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
import { renderGravityFieldsVfx } from '../systems/gravityFieldVfx'

const DRONE_XP = 50
const AUDIT_XP = 70
const SPAWN_X = 180
const LOCK_RANGE = 520
const DAMAGE_IFRAMES = 1.5
const SHOOT_COOLDOWN = 0.28
const GRAVITY_FIRE_COOLDOWN = 2.5

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
  text: string
  expression?: string
}

type LockableEnemy = { x: number; y: number; active: boolean }

interface L4Particle {
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

export type GameScene4LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene4LaunchOptions,
): GameScene4LaunchOptions {
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

export class GameScene4 {
  private readonly groundY = 610

  private input: InputManager
  private camera: Camera
  private player: Player
  private level: Level4
  private hud: HUD
  private dialogue: DialogueBox
  private nova: NovaOrb

  private hp = 3
  private score = 0
  private time = 0
  private scene: Scene = 'play'

  private lastDust = 0
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

  private particles: L4Particle[] = []
  private respawnFlashTimer = 0
  private respawnX = SPAWN_X
  private respawnY = 0

  private prevPlayerX = 0
  private lastOnGround = true
  private gateHack: GateHackState | null = null
  private gravityFields: GravityField[] = []
  private gravityFireCD = 0
  private scaleHintCD = 0

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene4LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
    this.input = input
    this.camera = new Camera()
    this.level = new Level4(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l4_')
    this.nova = new NovaOrb()

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.respawnX = Math.max(40, sx - 40)
    this.respawnY = this.groundY - this.player.height
    this.prevPlayerX = this.player.getCenterX()

    this.player.hasWeapon = [true, true, true, false, false, false, false]
    this.player.weaponSlot = 0

    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 4 — THE BIAS ENGINE')
    this.syncL4Objective()
    this.nova.show(260, this.groundY - 100)
    this.onLevelComplete = onLevelComplete

    if (opts.startX != null) {
      this.level.applySectionStart(opts.startX)
      this.camera.follow(this.player.getCenterX(), LEVEL4_WORLD_WIDTH)
    }

    console.log('[GameScene4] Level 4 — Bias Engine.')
  }

  private syncL4Objective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const g2 = this.level.gates.find(g => g.id === 2)?.open
    const g3 = this.level.gates.find(g => g.id === 3)?.open
    let obj: string
    if (!g1) obj = 'GATE 1 — BALANCE SCALE (120 EACH SIDE)'
    else if (!g2) obj = 'GATE 2 — TERMINAL QTE (E AT CONSOLE)'
    else if (!g3) obj = 'GATE 3 — BALANCE SCALE (160 EACH SIDE)'
    else obj = 'REACH FACILITY EXIT PORTAL'
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

  private spawnFireDeath(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      const speed = 80 + Math.random() * 100
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.35 + Math.random() * 0.2,
        color: '#00b4d8',
      })
    }
  }

  private spawnImpact(wx: number, wy: number): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      this.particles.push({
        x: wx,
        y: wy,
        vx: Math.cos(a) * 70,
        vy: Math.sin(a) * 70,
        life: 0.25,
        color: '#aacce8',
      })
    }
  }

  private spawnDust(wx: number, wy: number, dir: number): void {
    for (let k = 0; k < 3; k++) {
      this.particles.push({
        x: wx + (Math.random() - 0.5) * 8,
        y: wy,
        vx: dir * (-30 - Math.random() * 20) + (Math.random() - 0.5) * 15,
        vy: -12 - Math.random() * 25,
        life: 0.18,
        color: 'rgba(180,190,210,0.55)',
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
      p.vy += (p.grav ?? 380) * dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save()
    for (const p of this.particles) {
      const sx = p.x - cameraX
      if (sx < -30 || sx > CONFIG.CANVAS_WIDTH + 30) continue
      const baseA = p.life0 != null ? p.life / p.life0 : p.life * 3
      ctx.globalAlpha = Math.max(0, Math.min(1, baseA))
      ctx.fillStyle = p.color
      const sz = p.size ?? 4
      ctx.fillRect(sx - sz / 2, p.y - sz / 2, sz, sz)
    }
    ctx.globalAlpha = 1
    ctx.restore()
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
    for (const a of this.level.auditBots) {
      if (!a.active || !a.activated) continue
      list.push({ x: a.x, y: a.y - 8, active: true })
    }
    for (const s of this.level.swarms) {
      if (!s.active || !s.activated) continue
      list.push({ x: s.x, y: s.y, active: true })
    }
    return list
  }

  private resolvePrismWallHits(): void {
    const gy = this.groundY
    const maxX = LEVEL4_WORLD_WIDTH
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
      for (const sc of this.level.balanceScales) {
        for (const b of sc.blocks) {
          const cx = b.x + b.w / 2
          const cy = b.y + b.h / 2
          const dx = gf.x - cx
          const dy = gf.y - cy
          const d = Math.hypot(dx, dy) || 1
          if (d < gf.radius) {
            b.x += (dx / d) * pull
            b.y += (dy / d) * pull * 0.35
          }
        }
      }
      for (const a of this.level.auditBots) {
        if (!a.active) continue
        const dx = gf.x - a.x
        const dy = gf.y - a.y
        const d = Math.hypot(dx, dy) || 1
        if (d < gf.radius) {
          a.x += (dx / d) * pull * 0.9
          a.y += (dy / d) * pull * 0.25
        }
      }
      for (const d of this.level.drones) {
        if (!d.active) continue
        const dx = gf.x - d.x
        const dy = gf.y - d.y
        const dist = Math.hypot(dx, dy) || 1
        if (dist < gf.radius) {
          d.x += (dx / dist) * pull * 0.85
          d.y += (dy / dist) * pull * 0.3
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

      for (const a of this.level.auditBots) {
        if (!a.active) continue
        if (!rectsOverlap(a.getRect(), proj.getRect())) continue
        if (proj.prismMode) continue
        if (proj.empMode) a.stun(3)
        else a.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      swarmLoop: for (const sw of this.level.swarms) {
        if (!sw.active) continue
        for (const cr of sw.getCubeRects()) {
          if (!rectsOverlap(proj.getRect(), cr)) continue
          sw.hitCube(cr.idx)
          proj.active = false
          break swarmLoop
        }
      }
    }
  }

  private applyDamage(amount: number): void {
    this.hp -= amount
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.4
    this.triggerShake(6, 0.35)
    if (this.hp <= 0) {
      this.hud.showMessage('RESPAWNING', 2)
      this.hp = 3
      this.hud.setHP(3)
      this.player.x = this.respawnX
      this.player.y = this.respawnY
      this.respawnFlashTimer = 0.55
    }
  }

  update(dt: number): void {
    const prevCenterX = this.prevPlayerX
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
    this.scaleHintCD = Math.max(0, this.scaleHintCD - dt)

    if (this.muzzleFlash) {
      this.muzzleFlashT -= dt
      if (this.muzzleFlashT <= 0) this.muzzleFlash = false
    }
    if (this.respawnFlashTimer > 0)
      this.respawnFlashTimer = Math.max(0, this.respawnFlashTimer - dt)

    this.updateParticles(dt)

    if (this.gateHack) {
      this.gateHack = updateGateHack(
        this.gateHack,
        dt,
        this.input,
        () => {
          this.level.openGate(2)
          this.hud.showMessage('SECTOR B UNLOCKED', 2)
          this.syncL4Objective()
        },
        () => {},
        (m, d) => this.hud.showMessage(m, d),
        (mag, dur) => this.triggerShake(mag, dur),
      )
      if (this.scene === 'play') {
        this.dialogue.update(dt)
        this.camera.follow(this.player.getCenterX(), LEVEL4_WORLD_WIDTH)
      }
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
        this.player.resolveGround(this.groundY)
      }
      this.level.update(
        dt,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
        0,
      )
      this.camera.follow(this.player.getCenterX(), LEVEL4_WORLD_WIDTH)
      this.nova.moveTo(this.player.x + 70, this.player.y - 30)
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
      if (this.player.vy > 0) this.player.vy = 0
      this.player.isOnGround = true
    } else {
      this.player.resolveGround(this.groundY)
    }

    const gateBlock = this.level.getBlockingGate(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
    )
    if (gateBlock) {
      this.player.x -= this.player.vx * dt * 2
      this.player.vx = 0
    }

    const cxAfter = this.player.getCenterX()
    const st = this.level.peekSectionTrigger(prevCenterX, cxAfter)
    if (st) {
      if (!DialogueBox.hasFired(st.key)) {
        DialogueBox.markFired(st.key)
        st.fired = true
        this.talk(st.dialogue as DialogueLine[])
      } else st.fired = true
    }

    const cp = this.level.updateCheckpointsForPlayer(cxAfter)
    if (cp) {
      this.respawnX = Math.max(40, cp.x - 20)
      this.respawnY = this.groundY - this.player.height
      const key =
        cp.x < 4000 ? 'l4_cp1' : cp.x < 6500 ? 'l4_cp2' : 'l4_cp3'
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
      const hg = this.level.getHackableGate(this.player.getCenterX())
      if (hg && !hg.open) {
        this.gateHack = createGateHack(hg.id, 4)
        this.hud.showMessage('QTE — MATCH THE KEYS', 2)
        this.prevPlayerX = this.player.getCenterX()
        this.input.update()
        return
      }

      if (
        this.level.tryCollectEvidence(
          this.player.getCenterX(),
          this.player.y + this.player.height / 2,
        )
      ) {
        if (!DialogueBox.hasFired('l4_evidence')) {
          DialogueBox.markFired('l4_evidence')
          this.talk(
            [
              {
                speaker: 'NOVA',
                text: 'Biased weight tables. This is the smoking gun.',
              },
              { speaker: 'AX', text: 'Uploading to the chain.' },
            ],
            () => this.level.markEvidenceConsumed(),
          )
        } else this.level.markEvidenceConsumed()
        this.input.update()
        return
      }

      const npc = this.level.getNearNPC(this.player.getCenterX())
      if (npc && !npc.data.talked) {
        npc.data.talked = true
        this.talk(npc.data.dialogue as DialogueLine[])
      }
    }

    for (const sc of this.level.balanceScales) {
      if (sc.solved) continue
      const L = sc.blocks
        .filter(b => b.onPan === 'left')
        .reduce((s, b) => s + b.weight, 0)
      const R = sc.blocks
        .filter(b => b.onPan === 'right')
        .reduce((s, b) => s + b.weight, 0)
      if (L > 0 && R > 0 && L !== R && this.scaleHintCD <= 0) {
        this.scaleHintCD = 5
        this.hud.showMessage(
          'NOVA: District 1 data weighs less. NeuroCorps decided that.',
          3.5,
        )
      }
    }

    for (const sc of this.level.balanceScales) {
      if (sc.solved && !DialogueBox.hasFired(`l4_scale_solved_${sc.id}`)) {
        DialogueBox.markFired(`l4_scale_solved_${sc.id}`)
        this.hud.showMessage(
          'NOVA: Balanced. But it only balanced because you corrected the bias.',
          3.2,
        )
        this.hud.addScore(120)
        this.score += 120
        this.syncL4Objective()
      }
    }

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
      this.player.unlockWeapon(3)
      this.player.weaponSlot = 3
      this.hud.showMessage('GRAVITY BOLT — Z TO FIRE (COOLDOWN)', 2.8)
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

    if (this.input.isJustPressed('KeyZ') && this.shootCD <= 0) {
      const slot = this.player.weaponSlot
      if (slot === 3 && this.gravityFireCD > 0) {
        /* wait */
      } else {
        this.shootCD =
          slot === 3 ? this.shootCooldown + 0.15 : this.shootCooldown
        if (slot === 3) this.gravityFireCD = GRAVITY_FIRE_COOLDOWN
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

    for (const d of this.level.drones) {
      if (!d.active && !d.exploded) {
        d.exploded = true
        this.hud.addScore(DRONE_XP)
        this.score += DRONE_XP
        this.spawnFireDeath(d.x, d.y + 20)
      }
    }
    for (const a of this.level.auditBots) {
      if (!a.active && !a.scoreEmitted) {
        a.scoreEmitted = true
        this.hud.addScore(AUDIT_XP)
        this.score += AUDIT_XP
        this.spawnFireDeath(a.x, a.y)
      }
    }

    if (
      this.damageTimer <= 0 &&
      this.level.auditBots.some(a =>
        a.active && a.checkShotHit(
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
        ),
      )
    ) {
      this.applyDamage(1)
    }

    for (const sw of this.level.swarms) {
      if (this.damageTimer > 0) break
      for (const r of sw.getScatterRects()) {
        if (
          rectsOverlap(r, {
            x: this.player.x,
            y: this.player.y,
            w: this.player.width,
            h: this.player.height,
          })
        ) {
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
      this.player.vx,
    )
    for (const g of this.level.drainSpawnedGravityFields())
      this.gravityFields.push(g)
    this.applyGravityFields(dt)
    this.resolvePrismWallHits()
    this.applyProjectileHits()

    this.camera.follow(this.player.getCenterX(), LEVEL4_WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    if (
      !this.level.levelComplete &&
      this.player.x > 9000 &&
      this.level.exitPortal.open
    ) {
      this.level.levelComplete = true
      this.talk(
        [
          {
            speaker: 'NOVA',
            text: 'Bias Engine disabled. The weighted scales are evidence.',
          },
          {
            speaker: 'NPC',
            text: 'Take it. I cannot undo what I built. But you can expose it.',
          },
          {
            speaker: 'KIRAN',
            text: 'District 3. The Social Prediction Lab. That is where they use this data.',
          },
          { speaker: 'AX', text: 'Then that is where we go.' },
        ],
        () => this.onLevelComplete?.(),
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
    } else this.lastDust = 0.1

    this.syncL4Objective()
    this.prevPlayerX = this.player.getCenterX()
    this.input.update()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#e8e8f0'
    ctx.fillRect(0, 0, 1280, 720)

    ctx.save()
    if (this.shakeMag > 0) ctx.translate(this.shakeX, this.shakeY)

    ctx.imageSmoothingEnabled = false
    this.level.render(ctx, this.camera.x)
    renderGravityFieldsVfx(ctx, this.gravityFields, this.camera.x, this.time)
    this.renderParticles(ctx, this.camera.x)
    this.player.render(ctx, this.camera.x)
    this.nova.render(ctx, this.camera.x)

    if (this.damageFlashTimer > 0) {
      const alpha = (this.damageFlashTimer / 0.4) * 0.2
      ctx.fillStyle = `rgba(200,0,40,${alpha})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    const lock = this.lockTarget
    if (lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = lock.y
      ctx.save()
      ctx.strokeStyle = '#00b4d8'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.45 + Math.sin(this.lockTimer) * 0.2
      ctx.beginPath()
      ctx.arc(rx, ry, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.restore()
    }

    if (this.muzzleFlash) {
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.85
      ctx.fillRect(this.muzzleX - this.camera.x - 6, this.muzzleY - 6, 12, 12)
      ctx.globalAlpha = 1
    }

    this.hud.render(ctx, { deferControls: true })
    this.dialogue.render(ctx)

    ctx.fillStyle = '#1a2030'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      '← → MOVE  ↑/SPACE JUMP  Z SHOOT  X WEAPON  Q TARGET  E INTERACT',
      640,
      712,
    )
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.55) * 0.28})`
      ctx.fillRect(0, 0, 1280, 720)
    }

    if (this.gateHack)
      renderGateHackOverlay(ctx, this.gateHack, this.time)

    ctx.restore()
  }

}
