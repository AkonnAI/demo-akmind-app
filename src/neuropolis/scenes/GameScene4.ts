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

  // Fix 2 — Drone detection state
  private detectionWarningShown = false
  private detectionEndTimer = 0
  private prevDetecting = false

  // Fix 9C / Fix 10 — Scale balanced rising-edge flags
  private balancedFlags = [false, false]

  // Fix 10 — Level complete card
  private levelCompleteTriggered = false
  private showLevelCompleteCard = false

  private prevPlayerX = 0
  private lastOnGround = true
  private gateHack: GateHackState | null = null
  private gravityFields: GravityField[] = []
  private gravityFireCD = 0
  private scaleHintCD = 0

  /** Picked-up data block (E to carry / drop) for balance scales. */
  private heldDataBlock: { scaleIdx: number; blockIdx: number } | null = null

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

  private applyCarriedDataBlockPosition(): void {
    if (!this.heldDataBlock) return
    const sc = this.level.balanceScales[this.heldDataBlock.scaleIdx]
    const b = sc?.blocks[this.heldDataBlock.blockIdx]
    if (!b) {
      this.heldDataBlock = null
      return
    }
    b.carried = true
    const dir = this.player.isFacingRight ? 1 : -1
    b.x = Math.round(
      this.player.x + (dir > 0 ? this.player.width + 4 : -b.w - 4),
    )
    b.y = Math.round(this.player.y - b.h - 6)
    b.vx = 0
    b.onPan = 'none'
  }

  /** E near block: pick up; E again: drop at feet. */
  private tryToggleHeldDataBlock(): boolean {
    if (this.heldDataBlock) {
      const sc = this.level.balanceScales[this.heldDataBlock.scaleIdx]
      const b = sc?.blocks[this.heldDataBlock.blockIdx]
      if (b) {
        b.carried = false
        b.x = Math.round(this.player.getCenterX() - b.w / 2)
        b.y = this.groundY - b.h
        b.vx = 0
      }
      this.heldDataBlock = null
      this.hud.showMessage('DROP BLOCK — E', 1)
      return true
    }
    const pcx = this.player.getCenterX()
    const pcy = this.player.y + this.player.height / 2
    let best: { sc: number; bi: number; d: number } | null = null
    for (let si = 0; si < this.level.balanceScales.length; si++) {
      const scale = this.level.balanceScales[si]!
      if (scale.solved) continue
      for (let bi = 0; bi < scale.blocks.length; bi++) {
        const block = scale.blocks[bi]!
        if (block.carried) continue
        const bx = block.x + block.w / 2
        const by = block.y + block.h / 2
        const d = Math.hypot(bx - pcx, by - pcy)
        if (d < 72 && (!best || d < best.d)) best = { sc: si, bi, d }
      }
    }
    if (!best) return false
    this.heldDataBlock = { scaleIdx: best.sc, blockIdx: best.bi }
    this.level.balanceScales[best.sc]!.blocks[best.bi]!.carried = true
    this.hud.showMessage('CARRYING BLOCK — E DROP', 2.2)
    return true
  }

  private syncL4Objective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const g2 = this.level.gates.find(g => g.id === 2)?.open
    const g3 = this.level.gates.find(g => g.id === 3)?.open
    let obj: string
    if (!g1) obj = 'GATE 1 — SCALE 120 / PAN'
    else if (!g2) obj = 'GATE 2 — CONSOLE QTE (E)'
    else if (!g3) obj = 'GATE 3 — SCALE 160 / PAN'
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

  /** Level 4 — keep view stable (no camera shake; enemies already convey impact). */
  private triggerShake(_m: number, _d: number): void {
    this.shakeMag = 0
    this.shakeX = 0
    this.shakeY = 0
    this.shakeDecay = 0
    void _m
    void _d
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
    const pcx = this.player.getCenterX()
    const pcy = this.player.y
    for (const d of this.level.drones) {
      if (!d.active || !(d as { activated?: boolean }).activated) continue
      if (Math.hypot(d.x - pcx, (d.y + 10) - pcy) < 440) list.push(d)
    }
    for (const a of this.level.auditBots) {
      if (!a.active || !a.activated) continue
      if (Math.hypot(a.x - pcx, (a.y + 10) - pcy) < 440) list.push(a)
    }
    for (const s of this.level.swarms) {
      if (!s.active || !s.activated) continue
      if (Math.hypot(s.x - pcx, (s.y + 10) - pcy) < 440) list.push(s)
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
          if (b.carried) continue
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

  private spawnImpactBurst(wx: number, wy: number, proj: { color: string | null; empMode: boolean; prismMode: boolean; gravityMode: boolean }): void {
    const c = proj.color ?? (proj.empMode ? '#7c4dff' : proj.prismMode ? '#e040fb' : proj.gravityMode ? '#00b4d8' : '#00e5ff')
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2
      const speed = 80 + Math.random() * 40
      this.particles.push({ x: wx, y: wy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.3, color: c, life0: 0.3 })
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
        this.spawnImpactBurst(proj.x, proj.y, proj)
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const c of this.level.cameras) {
        if (!rectsOverlap(proj.getRect(), { x: c.x - 20, y: c.y - 10, w: 40, h: 40 })) continue
        if (proj.empMode) c.stun(1.5)
        this.spawnImpactBurst(proj.x, proj.y, proj)
        proj.active = false
        break
      }
      if (!proj.active) continue

      blockLoop: for (const sc of this.level.balanceScales) {
        for (const b of sc.blocks) {
          if (b.carried) continue
          if (
            !rectsOverlap(proj.getRect(), {
              x: b.x,
              y: b.y,
              w: b.w,
              h: b.h,
            })
          )
            continue
          const imp =
            Math.abs(proj.vx) > 45
              ? proj.vx * 0.88
              : Math.sign(proj.vx || 1) * 300
          b.vx += imp
          this.spawnImpactBurst(proj.x, proj.y, proj)
          proj.active = false
          break blockLoop
        }
      }
      if (!proj.active) continue

      for (const a of this.level.auditBots) {
        if (!a.active) continue
        if (!rectsOverlap(a.getRect(), proj.getRect())) continue
        if (proj.prismMode) continue
        if (proj.empMode) a.stun(3)
        else a.takeHit()
        this.spawnImpactBurst(proj.x, proj.y, proj)
        proj.active = false
        break
      }
      if (!proj.active) continue

      swarmLoop: for (const sw of this.level.swarms) {
        if (!sw.active) continue
        for (const cr of sw.getCubeRects()) {
          if (!rectsOverlap(proj.getRect(), cr)) continue
          sw.hitCube(cr.idx)
          this.spawnImpactBurst(proj.x, proj.y, proj)
          proj.active = false
          break swarmLoop
        }
      }
    }

    // Fix 7 — Remove deactivated projectiles immediately so render doesn't show hit ones
    for (let i = this.level.projectiles.length - 1; i >= 0; i--) {
      if (!this.level.projectiles[i]!.active) this.level.projectiles.splice(i, 1)
    }
  }

  private applyDamage(amount: number): void {
    this.hp -= amount
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.4
    this.triggerShake(6, 0.35)
    if (this.hp <= 0) {
      if (this.heldDataBlock) {
        const sc = this.level.balanceScales[this.heldDataBlock.scaleIdx]
        const b = sc?.blocks[this.heldDataBlock.blockIdx]
        if (b) {
          b.carried = false
          b.x = Math.round(this.player.getCenterX() - b.w / 2)
          b.y = this.groundY - b.h
          b.vx = 0
        }
        this.heldDataBlock = null
      }
      this.hud.showMessage('RESPAWNING', 2)
      this.hp = 3
      this.hud.setHP(3)
      this.player.x = this.respawnX
      this.player.y = this.respawnY
      this.respawnFlashTimer = 0.55
    }
  }

  update(dt: number): void {
    // Fix 10 — Level complete card blocks all other input
    if (this.showLevelCompleteCard) {
      this.time += dt
      this.nova.update(dt)
      this.hud.update(dt)
      if (this.input.isJustPressed('Space')) {
        this.onLevelComplete?.()
      }
      this.input.update()
      return
    }

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
    if (gateBlock && !gateBlock.open) {
      if (this.player.vx > 0) {
        this.player.x = gateBlock.x - this.player.width - 1
      } else if (this.player.vx < 0) {
        this.player.x = gateBlock.x + gateBlock.w + 1
      }
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
      } else {
        this.tryToggleHeldDataBlock()
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

    // Fix 5 — Clear dead lock target first, then find nearest live enemy
    if (this.lockTarget && !this.lockTarget.active) this.lockTarget = null

    this.lockables = this.buildLockables()
    if (!this.lockTarget && this.lockables.length > 0) {
      this.lockTarget = this.lockables.reduce((nearest, e) => {
        const dE = Math.hypot(e.x - this.player.getCenterX(), e.y - this.player.y)
        const dN = Math.hypot(nearest.x - this.player.getCenterX(), nearest.y - this.player.y)
        return dE < dN ? e : nearest
      })
    }

    if (this.input.isJustPressed('KeyQ') && this.lockables.length > 0) {
      this.lockCycleIndex = (this.lockCycleIndex + 1) % this.lockables.length
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

    // Fix 6 — AuditBot shot damage (guards: active, i-frames, distance)
    for (const a of this.level.auditBots) {
      if (!a.active) continue
      if (this.damageTimer > 0) break
      if (!a.checkShotHit(this.player.x, this.player.y, this.player.width, this.player.height)) continue
      if (Math.hypot(a.x - this.player.x, a.y - this.player.y) < 35) {
        this.applyDamage(1)
        this.hud.showMessage('SYSTEM DAMAGE — HP -1', 2, '#ff4444')
        break
      }
      // Shot damage (can hit from any range)
      this.applyDamage(1)
      this.hud.showMessage('SYSTEM DAMAGE — HP -1', 2, '#ff4444')
      break
    }

    // Fix 6 — Swarm scatter contact (guards: active, i-frames)
    for (const sw of this.level.swarms) {
      if (!sw.active) continue
      if (this.damageTimer > 0) continue
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
          this.hud.showMessage('SYSTEM DAMAGE — HP -1', 2, '#ff4444')
          break
        }
      }
    }

    // Fix 2 — Drone detection with learning arc
    {
      let anyDetecting = false
      for (const d of this.level.drones) {
        if (!d.active || !(d as { activated?: boolean }).activated) continue
        if (!d.isDetecting(this.player.getCenterX(), this.player.y + this.player.height / 2)) continue
        anyDetecting = true
        if (this.damageTimer <= 0) {
          this.applyDamage(1)
          this.hud.showMessage('DETECTED — AI LEARNING', 2, '#ff4444')
        }
        if (!this.detectionWarningShown) {
          this.detectionWarningShown = true
          if (!DialogueBox.hasFired('l4_drone_detect')) {
            DialogueBox.markFired('l4_drone_detect')
            this.talk([
              { speaker: 'NOVA', text: 'That drone just learned your movement pattern. AI improves from every interaction.' },
            ])
          }
          d.addScanBonus(0.2, 2)
        }
        this.detectionEndTimer = 3
        break
      }

      if (!anyDetecting && this.prevDetecting) {
        this.hud.showMessage('SCAN EVADED', 1.5, '#00ff88')
      }
      this.prevDetecting = anyDetecting

      if (!anyDetecting && this.detectionWarningShown) {
        this.detectionEndTimer = Math.max(0, this.detectionEndTimer - dt)
        if (this.detectionEndTimer <= 0) this.detectionWarningShown = false
      }
    }

    this.applyCarriedDataBlockPosition()

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

    // Fix 9C — Scale balanced rising-edge effects
    for (let i = 0; i < this.level.balanceScales.length; i++) {
      const sc = this.level.balanceScales[i]!
      const nowBalanced = sc.isBalanced()
      if (nowBalanced && !this.balancedFlags[i]) {
        this.balancedFlags[i] = true
        this.triggerShake(4, 0.4)
        this.hud.showMessage('SCALE BALANCED — GATE OPEN', 3, '#00ff88')
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2
          this.particles.push({
            x: sc.x, y: sc.panSurfaceY - 48,
            vx: Math.cos(a) * 100, vy: Math.sin(a) * 100,
            life: 0.6, color: '#00ff88', life0: 0.6,
          })
        }
        this.syncL4Objective()
      } else if (!nowBalanced) {
        this.balancedFlags[i] = false
      }
    }

    this.camera.follow(this.player.getCenterX(), LEVEL4_WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    // Fix 10 — Level complete: both scales balanced + player past level end
    if (
      !this.levelCompleteTriggered &&
      this.level.scale1.isBalanced() &&
      this.level.scale2.isBalanced() &&
      this.player.x > this.level.levelEnd
    ) {
      this.levelCompleteTriggered = true
      this.level.levelComplete = true
      this.player.vx = 0
      this.player.vy = 0
      this.talk(
        [
          { speaker: 'NOVA', text: 'You balanced the scales. Literally and conceptually.' },
          { speaker: 'AX',   text: 'NeuroCorps never ran this test on their real training data.' },
          { speaker: 'NOVA', text: 'They knew what balanced data would show. They chose not to look.' },
          { speaker: 'AX',   text: 'The Learning Forge is next. Where they turn this corrupted data into AI.' },
          { speaker: 'NOVA', text: 'District 5. The Mirror Lab. Where bias gets reflected and amplified.' },
        ],
        () => {
          this.hud.addScore(500)
          this.score += 500
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
    } else this.lastDust = 0.1

    this.syncL4Objective()
    this.prevPlayerX = this.player.getCenterX()
    this.input.update()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#070b14'
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

    ctx.fillStyle = 'rgba(0,0,0,0.88)'
    ctx.fillRect(0, 684, 1280, 36)
    ctx.strokeStyle = 'rgba(0,181,216,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 684.5)
    ctx.lineTo(1280, 684.5)
    ctx.stroke()
    ctx.fillStyle = '#f1f5f9'
    ctx.imageSmoothingEnabled = false
    ctx.font = 'bold 11px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      'ARROWS MOVE  ·  SPACE JUMP  ·  Z  ·  X  ·  Q  ·  E (CARRY/DROP)',
      640,
      706,
    )
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.55) * 0.28})`
      ctx.fillRect(0, 0, 1280, 720)
    }

    if (this.gateHack)
      renderGateHackOverlay(ctx, this.gateHack, this.time)

    ctx.restore()

    // Fix 10 — Level complete card (outside shake transform)
    if (this.showLevelCompleteCard) {
      this.renderLevelCompleteCard(ctx)
    }
  }

  private renderLevelCompleteCard(ctx: CanvasRenderingContext2D): void {
    const W = 1280, H = 720
    ctx.setLineDash([])

    // Base
    ctx.fillStyle = 'rgba(0,0,0,0.92)'
    ctx.fillRect(0, 0, W, H)

    // Outer border
    ctx.lineWidth = 3
    ctx.strokeStyle = '#4a9eff'
    ctx.strokeRect(40.5, 40.5, W - 81, H - 81)

    // Inner accent border
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(0,229,255,0.3)'
    ctx.strokeRect(50.5, 50.5, W - 101, H - 101)

    ctx.textAlign = 'center'
    ctx.imageSmoothingEnabled = false

    // District label
    ctx.font = '13px Orbitron, sans-serif'
    ctx.fillStyle = '#4a9eff'
    ctx.fillText('DISTRICT 4', W / 2, 180)

    // Title
    ctx.font = '24px Orbitron, sans-serif'
    ctx.fillStyle = '#00e5ff'
    ctx.fillText('TOOL TOWER — CLEARED', W / 2, 230)

    // Red separator
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ff3030'
    ctx.beginPath(); ctx.moveTo(W / 2 - 200, 270); ctx.lineTo(W / 2 + 200, 270); ctx.stroke()

    // XP
    ctx.font = '20px Orbitron, sans-serif'
    ctx.fillStyle = '#ffcc00'
    ctx.fillText('+ 500 XP', W / 2, 320)

    // Lesson lines
    ctx.font = '11px Orbitron, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Give AI a task too vague and it becomes everything.', W / 2, 360)
    ctx.font = '10px Orbitron, sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText('Give it a specific purpose and it becomes useful.', W / 2, 385)

    // Progress badges
    const badges = [
      { label: 'SCALE 1', done: this.level.scale1.isBalanced() },
      { label: 'SCALE 2', done: this.level.scale2.isBalanced() },
      { label: 'ARCHIVE', done: this.level.gates.find(g => g.id === 3)?.open ?? false },
    ]
    const badgeCenters = [W / 2 - 100, W / 2, W / 2 + 100]
    for (let i = 0; i < badges.length; i++) {
      const bx = badgeCenters[i]! - 45
      const by = 430
      ctx.fillStyle = badges[i]!.done ? '#00ff88' : '#1e293b'
      ctx.fillRect(bx, by, 90, 80)
      ctx.lineWidth = 2
      ctx.strokeStyle = badges[i]!.done ? '#00ff88' : '#334155'
      ctx.strokeRect(bx + 1, by + 1, 88, 78)
      ctx.font = '10px Orbitron, sans-serif'
      ctx.fillStyle = badges[i]!.done ? '#001a0a' : '#475569'
      ctx.fillText(badges[i]!.label, badgeCenters[i]!, by + 35)
      if (badges[i]!.done) {
        ctx.font = '20px Orbitron, sans-serif'
        ctx.fillText('✓', badgeCenters[i]!, by + 60)
      }
    }

    // Danger stripe
    ctx.fillStyle = 'rgba(255,40,40,0.3)'
    ctx.fillRect(40, 620, 1200, 20)

    // Space prompt (pulsing)
    const pulse = 0.6 + 0.4 * Math.abs(Math.sin(this.time * 3))
    ctx.globalAlpha = pulse
    ctx.font = '11px Orbitron, sans-serif'
    ctx.fillStyle = '#00e5ff'
    ctx.fillText('[SPACE] CONTINUE TO DISTRICT 5', W / 2, 560)
    ctx.globalAlpha = 1

    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.04)'
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)

    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

}
