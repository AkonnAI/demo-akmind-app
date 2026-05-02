import { DeviceManager }      from '../engine/DeviceManager'
import { InputManager }       from '../engine/InputManager'
import { GameLoop }           from '../engine/GameLoop'
import { Camera }             from '../engine/Camera'
import { Player }             from '../entities/Player'
import { Projectile }         from '../entities/Projectile'
import { Drone }              from '../entities/Drone'
import { ParallaxBackground } from '../world/ParallaxBackground'
import { Level1 }             from '../world/Level1'
import { HUD }                from '../ui/HUD'
import { DialogueBox }        from '../ui/DialogueBox'
import { NovaOrb }            from '../ui/NovaOrb'
import type { TouchControls } from '../ui/TouchControls'
import { attachDialoguePointerAdvance } from '../ui/dialoguePointerAdvance'
import { CONFIG }             from '../constants/config'
import { Haptics }            from '../engine/Haptics'

type Scene        = 'play' | 'dialogue'
type SpeakerTag   = 'NOVA' | 'AX' | 'KIRAN' | 'NPC'
type DialogueLine = { speaker: SpeakerTag; text: string; expression?: string }
type QuizLike     = { explanation: string }

export type GameSceneLaunchOptions = { startX?: number; touchControls?: TouchControls }

export class GameScene {
  private input:    InputManager
  private camera:   Camera
  private player:   Player
  private bg:       ParallaxBackground
  private level:    Level1
  private hud:      HUD
  private dialogue: DialogueBox
  private nova:     NovaOrb

  private touchControls?: TouchControls
  private dialoguePointerDetach: (() => void) | null = null

  private readonly WORLD_WIDTH = 12000
  private hp           = 3
  private score        = 0
  private time         = 0
  private scene: Scene = 'play'
  private activeQuiz: NonNullable<ReturnType<Level1['getNearQuiz']>> | null = null

  private lastDust      = 0
  private damageTimer   = 0
  private detectedTimer = 0
  private shootCD       = 0
  private lockTarget: Drone | null = null
  private lockTimer     = 0
  private muzzleFlash   = false
  private muzzleFlashT  = 0
  private muzzleX       = 0
  private muzzleY       = 0
  private screenShake   = 0
  private explosions: { x:number; y:number; t:number; maxT:number }[] = []

  private onLevelComplete: (() => void) | undefined

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onLevelComplete?: () => void,
    options?: GameSceneLaunchOptions,
  ) {
    this.touchControls = options?.touchControls
    this.input    = input
    this.camera   = new Camera()
    this.bg       = new ParallaxBackground(this.WORLD_WIDTH)
    this.level    = new Level1(this.bg.getGroundY())
    this.hud      = new HUD()
    this.dialogue = new DialogueBox()
    DialogueBox.resetForLevel('l1_')
    this.nova     = new NovaOrb()

    const sx = options?.startX ?? 180
    this.player = new Player(sx, this.bg.getGroundY())
    if (options?.startX != null) {
      this.level.applyStartSection(options.startX)
      this.camera.follow(this.player.getCenterX(), this.WORLD_WIDTH)
    }
    this.hud.setHP(3)
    this.hud.setLevel('LEVEL 1 — THE SCAN')
    this.hud.setObjective('REACH THE SMART LOCK AT THE END')
    this.onLevelComplete = onLevelComplete
    console.log('[GameScene] Level 1 — The Scan loaded.')
  }

  private talk(lines: DialogueLine[], onDone?: () => void): void {
    this.scene = 'dialogue'
    this.nova.show(this.player.x + 70, this.player.y - 30)
    this.touchControls?.hide()
    this.dialoguePointerDetach?.()
    this.dialoguePointerDetach = attachDialoguePointerAdvance(() => {
      this.dialogue.advance()
    })
    this.dialogue.show(lines, () => {
      this.dialoguePointerDetach?.()
      this.dialoguePointerDetach = null
      this.touchControls?.show()
      this.scene = 'play'
      this.nova.hide()
      onDone?.()
    })
  }

  update(dt: number): void {
    this.time += dt
    this.bg.update(dt)
    this.nova.update(dt)

    this.shootCD       = Math.max(0, this.shootCD - dt)
    this.damageTimer   = Math.max(0, this.damageTimer - dt)
    this.detectedTimer = Math.max(0, this.detectedTimer - dt)
    this.lockTimer    += dt * 4

    if (this.muzzleFlash) {
      this.muzzleFlashT -= dt
      if (this.muzzleFlashT <= 0) this.muzzleFlash = false
    }
    this.screenShake *= 0.8
    if (this.screenShake < 0.1) this.screenShake = 0
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i]
      if (!e) continue
      e.t -= dt
      if (e.t <= 0) this.explosions.splice(i, 1)
    }

    // Drone deaths
    for (const d of this.level.drones) {
      if (!d.active && !d.exploded) {
        d.exploded = true
        Haptics.fire('enemyDestroyed')
        this.screenShake = 5
        this.explosions.push({ x: d.x, y: d.y, t: 0.6, maxT: 0.6 })
        this.score += 50
        this.hud.addScore(50)
        this.hud.showMessage('+50 XP  DRONE DOWN', 1.5)
        this.bg.spawnImpact(d.x, d.y + 20)
      }
    }

    // Dialogue state — player frozen
    if (this.scene === 'dialogue') {
      this.dialogue.update(dt)
      // Space advances any dialogue. When a quiz is armed, Z and E
      // also advance — so the player can mash the answer key without
      // getting stuck on the question intro.
      const advance =
        this.input.isJustPressed('Space') ||
        (this.activeQuiz !== null &&
          (this.input.isJustPressed('KeyZ') ||
            this.input.isJustPressed('KeyE')))
      if (advance) {
        this.dialogue.advance()
      }
      this.player.vx = 0
      if (!this.player.isOnGround) {
        this.player.vy += CONFIG.GRAVITY * dt
        this.player.y  += this.player.vy * dt
        this.player.resolveGround(this.bg.getGroundY())
      }
      this.level.update(dt)
      this.camera.follow(this.player.getCenterX(), this.WORLD_WIDTH)
      this.nova.moveTo(this.player.x + 70, this.player.y - 30)
      this.input.update()
      return
    }

    // ── PLAY ──────────────────────────
    const prevGround = this.player.isOnGround

    this.player.update(dt, this.input)

    // Platform collision (mutual-exclusive with ground)
    const platY = this.level.checkPlatformCollision(
      this.player.x, this.player.y,
      this.player.width, this.player.height, this.player.vy
    )
    if (platY !== null) {
      this.player.y          = platY
      this.player.vy         = 0
      this.player.isOnGround = true
    } else {
      this.player.resolveGround(this.bg.getGroundY())
    }

    // Gate blocking — when hitting a gate, show its quiz immediately.
    // NOTE: the player oscillates in/out of gate AABB due to push-back.
    // We ARM the quiz every frame we're touching the gate (so Z/E can
    // answer it even if player is nudged back a pixel), but we only fire
    // the intro talk() ONCE per quiz (quiz.triggered is the one-shot gate).
    const hitGate = this.level.getBlockingGate(
      this.player.x, this.player.y,
      this.player.width, this.player.height
    )
    if (hitGate) {
      this.player.x  -= this.player.vx * dt * 3
      this.player.vx  = 0

      const quiz = this.level.quizPanels.find(
        q => q.unlocksGateId === hitGate.id && !q.correct_answer
      )
      if (quiz) {
        this.activeQuiz = quiz
        if (!quiz.triggered && this.scene === 'play') {
          quiz.triggered = true
          const optA = (quiz.options[0] ?? '').replace(/^A\s*/, '')
          const optB = (quiz.options[1] ?? '').replace(/^B\s*/, '')
          this.talk([
            { speaker:'NOVA',
              text: quiz.question,
              expression:'explaining' },
            { speaker:'NOVA',
              text: `[Z] ${optA}    [E] ${optB}`,
              expression:'explaining' },
          ])
        }
      }
    } else if (this.activeQuiz &&
               this.activeQuiz.correct_answer) {
      // Only drop activeQuiz once its gate is definitively open.
      this.activeQuiz = null
    }

    this.camera.follow(this.player.getCenterX(), this.WORLD_WIDTH)
    this.nova.moveTo(this.player.x + 70, this.player.y - 30)

    // Lock-on target
    let nearest: Drone | null = null
    let nearestD = 440
    for (const d of this.level.drones) {
      if (!d.active) continue
      const dist = Math.hypot(
        d.x - this.player.getCenterX(),
        d.y - this.player.y
      )
      if (dist < nearestD) { nearestD = dist; nearest = d }
    }
    this.lockTarget = nearest

    // ── QUIZ ANSWER (when at a gate) ──
    if (this.activeQuiz) {
      const q = this.activeQuiz
      if (this.input.isJustPressed('KeyZ')) {
        const correct = this.level.answerQuiz(q, 0)
        this.handleQuizResult(correct, q)
        if (correct) this.activeQuiz = null
      } else if (this.input.isJustPressed('KeyE')) {
        const correct = this.level.answerQuiz(q, 1)
        this.handleQuizResult(correct, q)
        if (correct) this.activeQuiz = null
      }
    }

    // ── NPC TALK — E key (only when no active quiz) ──
    if (!this.activeQuiz && this.input.isJustPressed('KeyE')) {
      const npc = this.level.getNearNPC(this.player.getCenterX())
      if (npc && !npc.data.talked) {
        npc.data.talked = true
        this.talk(npc.data.dialogue)
      }
    }

    // ── SHOOT — Z key (only when not answering a quiz) ──
    if (!this.activeQuiz &&
        this.input.isJustPressed('KeyZ') &&
        this.shootCD <= 0) {
      this.shootCD = 0.28
      const dir = this.player.isFacingRight ? 1 : -1
      const px  = this.player.x + (dir > 0 ? this.player.width + 4 : -4)
      const py  = this.player.y + this.player.height * 0.38
      const proj = new Projectile(px, py, dir)
      if (this.lockTarget) proj.lockOn(this.lockTarget)
      this.level.addProjectile(proj)
      this.muzzleFlash  = true
      this.muzzleFlashT = 0.07
      this.muzzleX = px
      this.muzzleY = py
    }

    // Mirror pickup
    if (!this.level.hasMirror) {
      const got = this.level.checkMirrorPickup(
        this.player.getCenterX(),
        this.player.y + this.player.height / 2
      )
      if (got) {
        this.level.hasMirror = true
        this.hud.showMessage('MIRROR FRAGMENT COLLECTED', 2.5)
        this.talk([
          { speaker: 'AX',   text: 'Got the mirror.' },
          { speaker: 'NOVA', text: 'Smart door ahead. Walk up and press F to use it.',
            expression: 'explaining' },
        ])
      }
    }

    // Collect chips
    const chipXP = this.level.collectChips(
      this.player.getCenterX(),
      this.player.y + this.player.height / 2
    )
    if (chipXP > 0) {
      this.score += chipXP
      this.hud.addScore(chipXP)
    }

    // Mirror use — F key
    if (this.input.isJustPressed('KeyF')) {
      const used = this.level.tryUseMirror(this.player.getCenterX())
      if (used) {
        this.hud.showMessage('MIRROR DEPLOYED — LOCK CONFUSED', 3)
        this.talk([
          { speaker: 'NOVA',
            text: 'AI only knows what it was trained on.',
            expression: 'explaining' },
          { speaker: 'NOVA',
            text: 'Show it something outside training data — it fails completely.',
            expression: 'happy' },
          { speaker: 'AX',
            text: 'Edge case. It cannot classify its own reflection.' },
          { speaker: 'NOVA',
            text: 'Understanding is the weapon. Remember that.',
            expression: 'happy' },
        ])
      } else if (!this.level.hasMirror) {
        this.hud.showMessage("NEED MIRROR FIRST — CHECK DEEPA'S SHOP", 2)
      }
    }

    // Section triggers — only fire if not blocked by a gate and not in dialogue
    if (this.scene === 'play' && !this.activeQuiz) {
      const trigger = this.level.checkTrigger(this.player.x)
      if (trigger) this.talk(trigger.dialogue)
    }

    // Detection damage
    const detected = this.level.isDetected(
      this.player.getCenterX(),
      this.player.y + this.player.height / 2
    )
    if (detected &&
        this.detectedTimer <= 0 &&
        this.damageTimer   <= 0) {
      this.hp--
      Haptics.fire('playerDamage')
      this.hud.setHP(this.hp)
      this.damageTimer   = 1.5
      this.detectedTimer = 2.5
      this.screenShake   = 8
      this.hud.showMessage('SCANNED — TAKE COVER', 2)
      if (this.hp <= 0) {
        this.hud.showMessage('SYSTEM FAILURE — RESPAWNING', 3)
        setTimeout(() => {
          this.hp = 3
          this.hud.setHP(3)
          this.player.x = 180
          this.player.y = this.bg.getGroundY() - this.player.height
        }, 2200)
      } else {
        this.talk([{
          speaker: 'NOVA',
          text: 'That drone learned your pattern. Change how you move.',
          expression: 'warning'
        }])
      }
    }

    // Level complete
    if (!this.level.levelComplete &&
        this.player.x > 10450 &&
        this.level.smartDoor?.open) {
      this.level.levelComplete = true
      this.score += 500
      this.hud.addScore(500)
      this.hud.showMessage('LEVEL 1 COMPLETE — +500 XP', 5)
      this.talk([
        { speaker: 'NOVA',
          text: 'You just used AI knowledge to defeat an AI system.',
          expression: 'happy' },
        { speaker: 'NOVA',
          text: 'That is what we do for this entire city.',
          expression: 'happy' },
        { speaker: 'AX',
          text: 'Understanding is the weapon.' },
        { speaker: 'KIRAN',
          text: 'Bhai. I saw everything. I am with you.' },
        { speaker: 'NOVA',
          text: 'Level 2 — The Vault. History of AI. Preparing.',
          expression: 'explaining' },
      ], () => {
        this.onLevelComplete?.()
      })
    }

    // Particles — spawn at player feet so they show on platforms too
    if (!prevGround && this.player.isOnGround) {
      this.bg.spawnImpact(this.player.getFootX(), this.player.getFootY())
    }
    if (this.player.isOnGround && Math.abs(this.player.vx) > 40) {
      this.lastDust += dt
      if (this.lastDust > 0.10) {
        this.lastDust = 0
        const dir = this.player.isFacingRight ? -1 : 1
        this.bg.spawnDust(
          this.player.getFootX() + (this.player.isFacingRight ? -12 : 12),
          this.player.getFootY(),
          dir
        )
      }
    } else {
      this.lastDust = 0.10
    }

    this.level.update(dt)
    this.hud.update(dt)
    this.input.update()
  }

  private handleQuizResult(correct: boolean, quiz: QuizLike): void {
    if (correct) {
      Haptics.fire('gateOpen')
      this.score += 100
      this.hud.addScore(100)
      this.hud.showMessage('CORRECT! +100 XP — GATE OPEN', 2.5)
      this.talk([{
        speaker: 'NOVA',
        text: quiz.explanation,
        expression: 'happy'
      }])
    } else {
      this.hud.showMessage('WRONG — READ THE QUESTION AGAIN', 2)
      this.talk([{
        speaker: 'NOVA',
        text: 'Not quite. Think about what makes something AI.',
        expression: 'warning'
      }])
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    if (this.screenShake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake
      )
    }

    ctx.fillStyle = '#05030e'
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)

    this.bg.render(ctx, this.camera.x)
    ctx.imageSmoothingEnabled = false
    this.level.render(ctx, this.camera.x)
    this.player.render(ctx, this.camera.x)
    if (this.scene === 'dialogue') {
      this.nova.render(ctx, this.camera.x)
    }

    // Damage flash
    if (this.damageTimer > 1.2) {
      ctx.fillStyle   = '#ff0000'
      ctx.globalAlpha = 0.18
      ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT)
      ctx.globalAlpha = 1
    }

    // Lock-on reticle
    const lock = this.lockTarget
    if (lock && lock.active) {
      const rx = lock.x - this.camera.x
      const ry = lock.y
      const pulse = Math.sin(this.lockTimer * 5)
      const sz = 30 + pulse * 4
      ctx.strokeStyle = '#ff9100'
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
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.5
      ctx.fillRect(rx - 2, ry - 2, 4, 4)
      const dist = Math.round(Math.hypot(
        lock.x - this.player.getCenterX(),
        lock.y - this.player.y
      ))
      ctx.fillStyle   = '#ff9100'
      ctx.globalAlpha = 0.8
      ctx.font        = '10px Orbitron, sans-serif'
      ctx.textAlign   = 'center'
      ctx.fillText(`LOCK ${dist}px`, rx, ry - sz - 6)
      ctx.textAlign   = 'left'
      ctx.globalAlpha = 1
    }

    // Explosions
    for (const e of this.explosions) {
      const sx  = e.x - this.camera.x
      const pct = e.t / e.maxT
      const r   = (1 - pct) * 55
      ctx.strokeStyle = '#ff9100'
      ctx.lineWidth   = 2
      ctx.globalAlpha = pct * 0.9
      ctx.beginPath()
      ctx.arc(sx, e.y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#ff1744'
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

    // Muzzle flash
    if (this.muzzleFlash) {
      const sx = this.muzzleX - this.camera.x
      ctx.fillStyle   = '#00ffff'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.arc(sx, this.muzzleY, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(sx, this.muzzleY, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Mirror HUD
    if (this.level.hasMirror) {
      ctx.fillStyle   = '#ffffff'
      ctx.globalAlpha = 0.7
      ctx.font        = `8px Orbitron, sans-serif`
      ctx.fillText('[MIRROR ✓]  F = USE AT SMART DOOR', 20, 56)
      ctx.globalAlpha = 1
    }

    this.dialogue.render(ctx)
    this.hud.render(ctx)

    // Controls bar — desktop only (touch HUD uses on-screen controls)
    if (!DeviceManager.shouldShowTouchOverlay()) {
      ctx.fillStyle = '#1a1535'
      ctx.font      = `8px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(
        '← → MOVE   ↑/SPACE JUMP   Z SHOOT/QUIZ-A   E TALK/QUIZ-B   F USE ITEM',
        CONFIG.CANVAS_WIDTH / 2,
        CONFIG.CANVAS_HEIGHT - 8
      )
      ctx.textAlign = 'left'
    }

    ctx.restore()
  }
}
