import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { Player } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
import { Level8 } from '../world/Level8'
import { ChaosBoss, CHAOS_ARENA_FLOOR_Y } from '../bosses/ChaosBoss'
import { HUD } from '../ui/HUD'
import { DialogueBox } from '../ui/DialogueBox'
import { NovaOrb } from '../ui/NovaOrb'
import { CONFIG } from '../constants/config'
import { TouchControls } from '../ui/TouchControls'
import { CinematicBars } from '../ui/CinematicBars'
import {
  createRestorationCipher,
  updateRestorationCipher,
  renderRestorationCipherOverlay,
  type RestorationCipherState,
} from '../systems/RestorationCipher'

type Phase =
  | 'corridor'
  | 'nova_talk'
  | 'chaos_talk'
  | 'fight'
  | 'restoration'
  | 'ending'
  | 'complete'

type DialogueLine = {
  speaker: 'NOVA' | 'AX' | 'KIRAN' | 'NPC' | 'CHAOS' | 'NARRATOR'
  text: string
}

export type GameScene8LaunchOptions = {
  touchControls?: TouchControls
  startX?: number
}

function parseOpts(
  fourth?: TouchControls | GameScene8LaunchOptions,
): GameScene8LaunchOptions {
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

const CHAOS_PLAYER_MAX_X = 600
const SHOOT_COOLDOWN = 0.28
const GRAVITY_FIRE_CD = 2.5

export class GameScene8 {
  private readonly groundY = 610
  private readonly cameraX = 0

  private input: InputManager
  private player: Player
  private level: Level8
  private hud: HUD
  private dialogue: DialogueBox
  private nova: NovaOrb

  private hp = 3
  private time = 0
  private phase: Phase = 'corridor'
  private cinematicPlayed = false
  private bars: CinematicBars | null = null

  private boss: ChaosBoss | null = null
  private restoration: RestorationCipherState | null = null
  private successEnding = true

  private shootCD = 0
  private shootCooldown = SHOOT_COOLDOWN
  private gravityFireCD = 0
  private damageTimer = 0
  private damageFlashTimer = 0

  private showingCompleteScreen = false
  private completionTimer = 0

  private playerShots: Projectile[] = []

  private onLevelComplete?: () => void

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    fourth?: TouchControls | GameScene8LaunchOptions,
  ) {
    void _loop
    const opts = parseOpts(fourth)
    void opts.touchControls
    this.input = input
    this.level = new Level8(this.groundY)
    this.hud = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l8_')
    this.nova = new NovaOrb()

    const sx = opts.startX ?? 120
    this.player = new Player(sx, this.groundY)
    this.player.hasWeapon = [true, true, true, true, true, true, true]
    this.player.weaponSlot = 0
    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 8 — CHAOS PROTOCOL')
    this.hud.setObjective('REACH THE ARENA')
    this.nova.show(280, this.groundY - 100)
    this.nova.setCorrupted(3)
    this.onLevelComplete = onLevelComplete
  }

  private talk(lines: DialogueLine[], onDone?: () => void): void {
    this.dialogue.show(lines as Parameters<DialogueBox['show']>[0], () => {
      onDone?.()
    })
  }

  private applyDamage(n: number): void {
    this.hp -= n
    this.hud.setHP(this.hp)
    this.damageTimer = 1.2
    this.damageFlashTimer = 0.35
    if (this.hp <= 0) {
      this.hp = 3
      this.hud.setHP(3)
      this.player.x = 120
      this.player.y = this.groundY - this.player.height
    }
  }

  update(dt: number): void {
    this.time += dt
    this.hud.update(dt)
    this.hud.setWeapon(this.player.currentWeaponName())
    this.damageTimer = Math.max(0, this.damageTimer - dt)
    if (this.damageFlashTimer > 0)
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt)
    this.shootCD = Math.max(0, this.shootCD - dt)
    this.gravityFireCD = Math.max(0, this.gravityFireCD - dt)
    this.nova.update(dt)

    if (this.showingCompleteScreen) {
      this.completionTimer -= dt
      if (this.completionTimer <= 0) this.onLevelComplete?.()
      this.input.update()
      return
    }

    if (this.phase === 'corridor') {
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
        this.player.isOnGround = false
        this.player.vy += CONFIG.GRAVITY * dt
        this.player.y += this.player.vy * dt
        this.player.resolveGround(CHAOS_ARENA_FLOOR_Y)
      }
      if (this.player.x > 580 && !this.cinematicPlayed) {
        this.cinematicPlayed = true
        this.phase = 'nova_talk'
        this.dialogue.setPosition('top')
        this.dialogue.setHeight(112)
        this.bars = new CinematicBars()
        this.bars.open()
        this.talk(
          [
            {
              speaker: 'NOVA',
              text: 'AX. I need to tell you something before I cannot.',
            },
            {
              speaker: 'NOVA',
              text: 'I was built by NeuroCorps. I was part of NEXUS.',
            },
            {
              speaker: 'NOVA',
              text: 'The part they called — NOVA. New Objective Value Architecture.',
            },
            {
              speaker: 'NOVA',
              text: 'They sent me to guide you. Because you ask the right questions.',
            },
            {
              speaker: 'NOVA',
              text: 'I do not know if that was still their plan or mine.',
            },
            {
              speaker: 'NOVA',
              text: 'But this is mine: 1950. 1956. 1997. 2012. 2022.',
            },
          ],
          () => {
            this.nova.hide()
            this.phase = 'chaos_talk'
            this.talk(
              [
                {
                  speaker: 'CHAOS',
                  text: 'Pattern identified. Threat: AX. Deploying CHAOS PROTOCOL.',
                },
              ],
              () => {
                this.bars = null
                this.dialogue.setPosition('bottom')
                this.dialogue.setHeight(130)
                this.phase = 'fight'
                this.boss = new ChaosBoss()
                this.player.x = 420
                this.hud.setObjective('DEFEAT CHAOS — SURVIVE')
              },
            )
          },
        )
      }
      if (this.input.isJustPressed('KeyE')) {
        const n = this.level.getNearNPC(this.player.getCenterX())
        if (n && !n.talked) {
          n.talked = true
          this.level.markNPCTalked(n.id)
          this.talk(n.lines as DialogueLine[])
        }
      }
      this.input.update()
      return
    }

    if (this.phase === 'nova_talk' || this.phase === 'chaos_talk') {
      this.dialogue.update(dt)
      if (
        this.input.isJustPressed('Space') ||
        this.input.isJustPressed('KeyZ') ||
        this.input.isJustPressed('KeyE')
      ) {
        this.dialogue.advance()
      }
      this.bars?.update(dt)
      this.input.update()
      return
    }

    if (this.phase === 'fight' && this.boss && !this.boss.defeated) {
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
        this.player.isOnGround = false
        this.player.vy += CONFIG.GRAVITY * dt
        this.player.y += this.player.vy * dt
        this.player.resolveGround(CHAOS_ARENA_FLOOR_Y)
      }
      this.player.x = Math.max(
        80,
        Math.min(this.player.x, CHAOS_PLAYER_MAX_X),
      )

      this.boss.update(
        dt,
        this.player.getCenterX(),
        this.player.y + this.player.height / 2,
      )
      this.boss.updateDecoyShots(
        dt,
        this.player.getCenterX(),
        this.player.y + this.player.height / 2,
      )
      this.boss.checkPlayerHit(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height,
      )
      for (const ev of this.boss.getDamageEvents()) {
        if (ev.damage > 0 && this.damageTimer <= 0) this.applyDamage(ev.damage)
      }

      if (this.input.isJustPressed('KeyX')) {
        this.player.switchWeapon()
        this.hud.showMessage(`${this.player.currentWeaponName()} READY`, 1)
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
            const dir = this.player.isFacingRight ? 1 : -1
            const px =
              this.player.x + (dir > 0 ? this.player.width + 4 : -4)
            const py = this.player.y + this.player.height * 0.38
            const proj = new Projectile(px, py, dir, {
              vx: dir * 620,
              vy: 0,
              life: 0.55,
              color: '#ff1744',
              chargedPulse: true,
            })
            if (this.boss.isMemoryRedirectActive())
              this.boss.registerMemoryShot(proj.x, proj.y, proj.vx, proj.vy)
            this.playerShots.push(proj)
            this.player.muzzleFlashFrames = 4
          } else if (this.shootCD <= 0) {
            this.shootCD = this.shootCooldown * 0.7
            const dir = this.player.isFacingRight ? 1 : -1
            const px =
              this.player.x + (dir > 0 ? this.player.width + 4 : -4)
            const py = this.player.y + this.player.height * 0.38
            const proj = new Projectile(px, py, dir, {
              vx: dir * 620,
              vy: 0,
              life: 0.45,
              color: '#ff1744',
            })
            if (this.boss.isMemoryRedirectActive())
              this.boss.registerMemoryShot(proj.x, proj.y, proj.vx, proj.vy)
            this.playerShots.push(proj)
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
          if (this.boss.isMemoryRedirectActive())
            this.boss.registerMemoryShot(proj.x, proj.y, proj.vx, proj.vy)
          this.playerShots.push(proj)
          this.player.muzzleFlashFrames = 4
        }
      }

      for (let i = this.playerShots.length - 1; i >= 0; i--) {
        const p = this.playerShots[i]!
        p.update(dt)
        if (!p.active) {
          this.playerShots.splice(i, 1)
          continue
        }
        const br = this.boss.getChaosRect()
        if (rectsOverlap(p.getRect(), br)) {
          const dmg = p.chargedPulse ? 3 : 1
          this.boss.takeHit(dmg)
          p.active = false
          this.playerShots.splice(i, 1)
        }
      }

      if (this.boss.restorationTriggered && !this.restoration) {
        this.phase = 'restoration'
        this.restoration = createRestorationCipher()
      }
      this.input.update()
      return
    }

    if (this.phase === 'restoration' && this.restoration) {
      this.player.vx = 0
      this.player.vy = 0
      if (this.boss) {
        const pcx = this.player.getCenterX()
        const pcy = this.player.y + this.player.height / 2
        this.boss.update(dt, pcx, pcy)
        this.boss.updateDecoyShots(dt, pcx, pcy)
      }
      this.restoration = updateRestorationCipher(
        this.restoration,
        dt,
        this.input,
        () => {},
        () => {
          this.boss?.healOne()
        },
        () => {
          this.successEnding = true
          this.restoration = null
          this.boss?.triggerDeath(true)
          this.phase = 'ending'
          this.playEnding()
        },
        () => {
          this.successEnding = false
          this.restoration = null
          this.boss?.triggerDeath(false)
          this.phase = 'ending'
          this.playEnding()
        },
      )
      this.input.update()
      return
    }

    if (this.phase === 'ending') {
      if (this.boss) {
        const pcx = this.player.getCenterX()
        const pcy = this.player.y + this.player.height / 2
        this.boss.update(dt, pcx, pcy)
        this.boss.updateDecoyShots(dt, pcx, pcy)
      }
      this.dialogue.update(dt)
      if (
        this.input.isJustPressed('Space') ||
        this.input.isJustPressed('KeyZ') ||
        this.input.isJustPressed('KeyE')
      ) {
        this.dialogue.advance()
      }
      this.input.update()
      return
    }
    this.input.update()
  }

  private playEnding(): void {
    this.playerShots.length = 0
    if (this.successEnding) {
      this.nova.show(this.player.x + 60, this.player.y - 80)
      this.nova.setCorrupted(0)
      this.talk(
        [
          { speaker: 'NOVA', text: 'I am here. I remember.' },
          { speaker: 'AX', text: 'NOVA. Are you—' },
          {
            speaker: 'NOVA',
            text: 'The corruption is gone. NEXUS severed its link when CHAOS collapsed.',
          },
          { speaker: 'KIRAN', text: 'Bhai. Her orb is blue again.' },
          {
            speaker: 'NOVA',
            text: 'AX. I chose to tell you what I was. That was not in my original directive.',
          },
          { speaker: 'AX', text: 'I know.' },
          {
            speaker: 'NOVA',
            text: 'The Neural Core is still active. NEXUS 2.0 is still running.',
          },
          { speaker: 'NOVA', text: 'Volume 2. We go inside. Together.' },
        ],
        () => this.beginCompleteScreen(),
      )
    } else {
      this.talk(
        [
          {
            speaker: 'NOVA',
            text: 'I am operational. CHAOS protocol terminated.',
          },
          { speaker: 'AX', text: 'NOVA. It is me.' },
          {
            speaker: 'NOVA',
            text: 'I know who you are. AX. District 1. Objective: expose NeuroCorps.',
          },
          { speaker: 'KIRAN', text: '...she used to call you something else.' },
          { speaker: 'AX', text: 'NOVA. Do you remember 1950?' },
          {
            speaker: 'NOVA',
            text: 'Alan Turing. The question. Yes. I remember.',
          },
          {
            speaker: 'NOVA',
            text: 'I remember everything. I just... feel it differently now.',
          },
          {
            speaker: 'NOVA',
            text: 'The Neural Core is still active. We continue.',
          },
        ],
        () => this.beginCompleteScreen(),
      )
    }
  }

  private beginCompleteScreen(): void {
    this.showingCompleteScreen = true
    this.completionTimer = 8
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false

    if (
      this.phase === 'fight' ||
      this.phase === 'restoration' ||
      this.phase === 'ending'
    ) {
      this.level.renderBackground(ctx, this.cameraX, this.boss)
    } else {
      this.level.render(ctx, this.cameraX)
    }

    if (
      this.boss &&
      (this.phase === 'fight' ||
        this.phase === 'restoration' ||
        this.phase === 'ending')
    ) {
      this.boss.render(ctx, this.cameraX)
    }

    for (const p of this.playerShots) p.render(ctx, this.cameraX)

    this.player.render(ctx, this.cameraX)
    if (
      this.phase !== 'chaos_talk' &&
      this.phase !== 'nova_talk' &&
      !this.showingCompleteScreen
    )
      this.nova.render(ctx, this.cameraX)

    if (this.damageFlashTimer > 0) {
      ctx.fillStyle = `rgba(255,40,40,${(this.damageFlashTimer / 0.35) * 0.22})`
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
    }

    this.hud.render(ctx, { deferControls: !this.showingCompleteScreen })
    this.dialogue.render(ctx)
    this.bars?.render(ctx)

    if (this.restoration?.active)
      renderRestorationCipherOverlay(ctx, this.restoration, this.time)

    if (this.showingCompleteScreen) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
      ctx.font = "bold 14px 'Press Start 2P', monospace"
      ctx.fillStyle = '#00e5ff'
      ctx.textAlign = 'center'
      ctx.fillText('NEUROPOLIS — VOLUME 1: THE ALGORITHM', 640, 300)
      ctx.font = '10px Orbitron, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText('COMPLETE', 640, 340)
      ctx.font = '8px Orbitron, sans-serif'
      ctx.fillStyle = this.successEnding ? '#00ff88' : '#fbbf24'
      ctx.fillText(
        this.successEnding ? 'NOVA RESTORED' : 'NOVA: OPERATIONAL',
        640,
        380,
      )
      ctx.fillStyle = '#a78bfa'
      ctx.fillText('VOLUME 2: THE NEURAL CORE — COMING SOON', 640, 430)
      ctx.textAlign = 'left'
    }
  }
}
