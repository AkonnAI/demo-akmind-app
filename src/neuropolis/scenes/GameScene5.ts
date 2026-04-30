import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
import { Level5, LEVEL5_WORLD_WIDTH } from '../world/Level5'
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
const SHIELD_XP = 55
const MIRROR_BOT_XP = 90
const PHANTOM_XP = 60
const SPAWN_X = 180
const LOCK_RANGE = 520
const DAMAGE_IFRAMES = 1.5
const SHOOT_COOLDOWN = 0.28

type Scene = 'play' | 'dialogue'
type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'NARRATOR'
  text: string
  expression?: string
}

type LockableEnemy = { x: number; y: number; active: boolean }

interface P5 {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export type GameScene5LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene5LaunchOptions,
): GameScene5LaunchOptions {
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

export class GameScene5 {
  private readonly groundY = 610

  private input: InputManager
  private camera: Camera
  private player: Player
  private level: Level5
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

  private particles: P5[] = []
  private respawnFlashTimer = 0
  private respawnX = SPAWN_X
  private respawnY = 0
  private prevPlayerX = 0
  private lastOnGround = true
  private gateHack: GateHackState | null = null

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene5LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
    this.input = input
    this.camera = new Camera()
    this.level = new Level5(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l5_')
    this.nova = new NovaOrb()

    const sx = opts.startX ?? SPAWN_X
    this.player = new Player(sx, this.groundY)
    this.respawnX = Math.max(40, sx - 40)
    this.respawnY = this.groundY - this.player.height
    this.prevPlayerX = this.player.getCenterX()
    this.player.hasWeapon = [true, true, true, true, false, false, false]
    this.player.weaponSlot = 0

    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 5 — THE MIRROR LAB')
    this.syncObjective()
    this.nova.show(260, this.groundY - 100)
    this.onLevelComplete = onLevelComplete

    if (opts.startX != null) {
      this.level.applySectionStart(opts.startX)
      this.camera.follow(this.player.getCenterX(), LEVEL5_WORLD_WIDTH)
    }
    console.log('[GameScene5] Level 5 — Mirror Lab.')
  }

  private syncObjective(): void {
    const g1 = this.level.gates.find(g => g.id === 1)?.open
    const g2 = this.level.gates.find(g => g.id === 2)?.open
    const g3 = this.level.gates.find(g => g.id === 3)?.open
    let obj: string
    if (!g1) obj = 'GATE 1 — TERMINAL QTE'
    else if (!g2) obj = 'GATE 2 — ALIGN MIRROR PANELS (E ON MIRRORS)'
    else if (!g3) obj = 'GATE 3 — SECOND MIRROR ROOM'
    else obj = 'REACH LAB EXIT'
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

  private spawnBurst(x: number, y: number, col: string): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * 90,
        vy: Math.sin(a) * 90,
        life: 0.3,
        color: col,
      })
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 300 * dt
      if (p.life <= 0) this.particles.splice(i, 1)
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, cameraX: number): void {
    ctx.save()
    for (const p of this.particles) {
      const sx = p.x - cameraX
      ctx.globalAlpha = Math.max(0, p.life * 3)
      ctx.fillStyle = p.color
      ctx.fillRect(sx - 2, p.y - 2, 4, 4)
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
    for (const m of this.level.mirrors) {
      if (!m.active || !m.activated) continue
      list.push(m)
    }
    for (const ph of this.level.phantoms) {
      if (!ph.active || !ph.activated || !ph.isVulnerable()) continue
      list.push(ph)
    }
    for (const s of this.level.shields) {
      if (!s.active || !s.activated) continue
      list.push({ x: s.x + 16, y: s.y + 10, active: true })
    }
    return list
  }

  private resolvePrismWallHits(): void {
    const gy = this.groundY
    const maxX = LEVEL5_WORLD_WIDTH
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

  private resolveMirrorBounces(): void {
    const gy = this.groundY
    for (const proj of this.level.projectiles) {
      if (!proj.active || !proj.mirrorMode || proj.bounceCount >= 3) continue
      const r = proj.getRect()
      let bounced = false
      if (proj.y + r.h / 2 >= gy - 2) {
        proj.y = gy - 6
        proj.bounceVertical()
        bounced = true
      }
      if (proj.x < 4) {
        proj.x = 6
        proj.bounceHorizontal()
        bounced = true
      } else if (proj.x > LEVEL5_WORLD_WIDTH - 4) {
        proj.x = LEVEL5_WORLD_WIDTH - 6
        proj.bounceHorizontal()
        bounced = true
      }
      if (!bounced) {
        for (const pl of this.level.platforms) {
          if (!rectsOverlap(r, pl)) continue
          const cx = proj.x
          const cy = proj.y
          const pcx = pl.x + pl.w / 2
          const pcy = pl.y + pl.h / 2
          if (Math.abs(cx - pcx) > Math.abs(cy - pcy)) proj.bounceHorizontal()
          else proj.bounceVertical()
          bounced = true
          this.spawnBurst(proj.x, proj.y, '#e2e8f0')
          break
        }
      } else this.spawnBurst(proj.x, proj.y, '#e2e8f0')
    }
  }

  private probePhantoms(): void {
    for (const ph of this.level.phantoms) {
      for (const pr of this.level.projectiles) {
        if (!pr.active) continue
        const d = Math.hypot(pr.x - ph.x, pr.y - ph.y)
        if (d < 44) ph.checkReveal(pr.x, pr.y)
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

      for (const s of this.level.shields) {
        if (!s.active) continue
        if (!rectsOverlap(s.getRect(), proj.getRect())) continue
        if (proj.empMode) s.stun(2)
        s.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const mb of this.level.mirrors) {
        if (!mb.active) continue
        if (!rectsOverlap(mb.getRect(), proj.getRect())) continue
        mb.takeHit()
        proj.active = false
        break
      }
      if (!proj.active) continue

      for (const ph of this.level.phantoms) {
        if (!ph.active || !ph.isVulnerable()) continue
        if (!rectsOverlap(ph.getRect(), proj.getRect())) continue
        ph.takeHit()
        proj.active = false
        break
      }
    }
  }

  private applyDamage(n: number): void {
    this.hp -= n
    this.hud.setHP(this.hp)
    this.damageTimer = DAMAGE_IFRAMES
    this.damageFlashTimer = 0.35
    this.triggerShake(5, 0.3)
    if (this.hp <= 0) {
      this.hp = 3
      this.hud.setHP(3)
      this.player.x = this.respawnX
      this.player.y = this.respawnY
      this.respawnFlashTimer = 0.5
      this.hud.showMessage('RESPAWNING', 1.5)
    }
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
          this.level.openGate(1)
          this.hud.showMessage('SECTOR UNLOCKED', 2)
          this.syncObjective()
        },
        () => {},
        (m, d) => this.hud.showMessage(m, d),
        (mag, dur) => this.triggerShake(mag, dur),
      )
      this.dialogue.update(dt)
      this.camera.follow(this.player.getCenterX(), LEVEL5_WORLD_WIDTH)
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
      )
      this.camera.follow(this.player.getCenterX(), LEVEL5_WORLD_WIDTH)
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
      const hg = this.level.getHackableGate(cx)
      if (hg && !hg.open) {
        this.gateHack = createGateHack(hg.id, 4)
        this.prevPlayerX = cx
        this.input.update()
        return
      }
      if (this.level.tryFlipNearMirror(cx, this.player.y + this.player.height / 2)) {
        this.hud.showMessage('MIRROR FLIPPED', 0.5)
        this.input.update()
        return
      }
      if (
        this.level.tryCollectEvidence(
          cx,
          this.player.y + this.player.height / 2,
        )
      ) {
        if (!DialogueBox.hasFired('l5_ev')) {
          DialogueBox.markFired('l5_ev')
          this.talk(
            [
              { speaker: 'NOVA', text: 'Lab routing map secured. Good for District 4 intel.' },
            ],
            () => this.level.markEvidenceConsumed(),
          )
        } else this.level.markEvidenceConsumed()
        this.input.update()
        return
      }
      const npc = this.level.getNearNPC(cx)
      if (npc && !npc.data.talked) {
        npc.data.talked = true
        this.talk(npc.data.dialogue as DialogueLine[])
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

    if (this.input.isJustPressed('KeyQ') && this.lockables.length > 0) {
      this.lockCycleIndex = (this.lockCycleIndex + 1) % this.lockables.length
      this.lockTarget = this.lockables[this.lockCycleIndex] ?? null
    }

    if (this.input.isJustPressed('KeyZ') && this.shootCD <= 0) {
      this.shootCD = this.shootCooldown
      const dir = this.player.isFacingRight ? 1 : -1
      const px =
        this.player.x + (dir > 0 ? this.player.width + 4 : -4)
      const py = this.player.y + this.player.height * 0.38
      const slot = this.player.weaponSlot
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

    for (const d of this.level.drones) {
      if (!d.active && !d.exploded) {
        d.exploded = true
        this.hud.addScore(DRONE_XP)
        this.score += DRONE_XP
        this.spawnBurst(d.x, d.y + 18, '#00e5ff')
      }
    }
    for (const s of this.level.shields) {
      if (!s.active && !s.scoreEmitted) {
        s.scoreEmitted = true
        this.hud.addScore(SHIELD_XP)
        this.score += SHIELD_XP
        this.spawnBurst(s.x + 16, s.y + 20, '#e2e8f0')
      }
    }
    for (const mb of this.level.mirrors) {
      if (!mb.active && !mb.scoreEmitted) {
        mb.scoreEmitted = true
        this.hud.addScore(MIRROR_BOT_XP)
        this.score += MIRROR_BOT_XP
        this.spawnBurst(mb.x, mb.y, '#ffffff')
      }
    }
    for (const ph of this.level.phantoms) {
      if (!ph.active && !ph.scoreEmitted) {
        ph.scoreEmitted = true
        this.hud.addScore(PHANTOM_XP)
        this.score += PHANTOM_XP
        this.spawnBurst(ph.x, ph.y, '#9b59b6')
      }
    }

    if (this.damageTimer <= 0) {
      for (const ph of this.level.phantoms) {
        if (ph.checkShotHit(
          this.player.x,
          this.player.y,
          this.player.width,
          this.player.height,
        )) {
          this.applyDamage(1)
          break
        }
      }
      for (const mb of this.level.mirrors) {
        const gr = mb.getGhostRect()
        if (
          gr &&
          rectsOverlap(gr, {
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
    )
    this.probePhantoms()
    this.resolveMirrorBounces()
    this.resolvePrismWallHits()
    this.applyProjectileHits()

    this.camera.follow(this.player.getCenterX(), LEVEL5_WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    if (
      !this.level.levelComplete &&
      this.player.x > 9200 &&
      this.level.exitPortal.open
    ) {
      this.level.levelComplete = true
      this.talk(
        [
          {
            speaker: 'NOVA',
            text: 'Mirror Lab offline. Prediction models corrupted from inside.',
          },
          {
            speaker: 'KIRAN',
            text: 'District 4. The Broadcast Core. That is where NEXUS 2.0 transmits.',
          },
          { speaker: 'AX', text: 'We end this at the source.' },
        ],
        () => this.onLevelComplete?.(),
      )
    }

    if (!this.lastOnGround && this.player.isOnGround) {
      this.spawnBurst(this.player.getFootX(), this.player.getFootY(), '#8899aa')
    }
    this.lastOnGround = this.player.isOnGround
    if (this.player.isOnGround && Math.abs(this.player.vx) > 40) {
      this.lastDust += dt
      if (this.lastDust > 0.12) {
        this.lastDust = 0
        const dir = this.player.isFacingRight ? -1 : 1
        this.particles.push({
          x: this.player.getFootX() + (this.player.isFacingRight ? -10 : 10),
          y: this.player.getFootY(),
          vx: dir * -40,
          vy: -20,
          life: 0.2,
          color: 'rgba(200,210,230,0.5)',
        })
      }
    } else this.lastDust = 0.12

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
      this.player.unlockWeapon(4)
      this.player.weaponSlot = 4
      this.hud.showMessage('MIRROR SHOT — RICOCHETS OFF WALLS', 2.5)
    }

    this.syncObjective()
    this.prevPlayerX = cx
    this.input.update()
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#0a0a10'
    ctx.fillRect(0, 0, 1280, 720)

    ctx.save()
    if (this.shakeMag > 0) ctx.translate(this.shakeX, this.shakeY)
    ctx.imageSmoothingEnabled = false
    this.level.render(ctx, this.camera.x)
    this.renderParticles(ctx, this.camera.x)
    this.player.render(ctx, this.camera.x)
    this.nova.render(ctx, this.camera.x)

    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(200,40,60,${(this.damageFlashTimer / 0.35) * 0.18})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    const lock = this.lockTarget
    if (lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = lock.y
      ctx.save()
      ctx.strokeStyle = '#e2e8f0'
      ctx.globalAlpha = 0.4 + Math.sin(this.lockTimer) * 0.2
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
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '8px Orbitron, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(
      '← → MOVE  ↑ JUMP  Z SHOOT  X WEAPON  Q TARGET  E HACK / FLIP MIRROR',
      640,
      712,
    )
    ctx.textAlign = 'left'

    if (this.respawnFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.respawnFlashTimer / 0.5) * 0.25})`
      ctx.fillRect(0, 0, 1280, 720)
    }
    if (this.gateHack)
      renderGateHackOverlay(ctx, this.gateHack, this.time)
    ctx.restore()
  }
}
