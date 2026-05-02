import { CONFIG } from '../constants/config'
import { InputManager } from '../engine/InputManager'
import { GameLoop } from '../engine/GameLoop'
import { DialogueBox } from '../ui/DialogueBox'
import { NovaOrb } from '../ui/NovaOrb'
import { attachDialoguePointerAdvance } from '../ui/dialoguePointerAdvance'
import { ParallaxBackground } from '../world/ParallaxBackground'

type NovaExpr = 'idle' | 'happy' | 'warning' | 'urgent' | 'explaining'

// One scene = one full-screen composition + lines
interface Scene {
  draw: (ctx: CanvasRenderingContext2D, t: number) => void
  lines: { speaker: 'NOVA'|'AX'|'NARRATOR', text: string, expression?: string }[]
}

export class CinematicScene {
  private input: InputManager
  private dialogue: DialogueBox
  private nova: NovaOrb
  private bg: ParallaxBackground
  private onComplete: () => void

  private time = 0
  private fade = 1       // 1=black, 0=visible
  private fadeDir = -1   // -1=fade in, 1=fade out
  private sceneIdx = 0
  private transitioning = false
  private started = false
  private barH = 0       // cinematic bars

  private axSprite!: HTMLImageElement
  private axLoaded = false

  private readonly pointerDetach: () => void

  private readonly scenes: Scene[]

  constructor(
    input: InputManager,
    _loop: GameLoop,
    onComplete: () => void
  ) {
    this.input = input
    this.onComplete = onComplete
    this.dialogue = new DialogueBox()
    this.nova = new NovaOrb()
    this.bg = new ParallaxBackground(3000)

    this.axSprite = new Image()
    this.axSprite.onload = () => { this.axLoaded = true }
    this.axSprite.src = '/sprites/AX.png'

    this.pointerDetach = attachDialoguePointerAdvance(() => {
      if (!this.started || this.transitioning) return
      if (!this.dialogue.isVisible()) return
      this.dialogue.advance()
      const expr = this.dialogue.getCurrentExpression()
      this.nova.setExpression(expr as NovaExpr)
    })

    // Define all scenes here
    this.scenes = [
      // SCENE 0 — Pure black, narrator
      {
        draw: (ctx, t) => this.drawBlack(ctx, t),
        lines: [
          { speaker:'NARRATOR', text:'Neuropolis. 2041.' },
          { speaker:'NARRATOR', text:'One city. One AI. Zero oversight.' },
          { speaker:'NARRATOR', text:'District 1 calls it something else.' },
        ]
      },
      // SCENE 1 — City night, drone scanning
      {
        draw: (ctx, t) => this.drawCityNight(ctx, t),
        lines: [
          { speaker:'NOVA', text:'AX.', expression:'idle' },
          { speaker:'AX',   text:'Who are you? How are you in my glasses?' },
          { speaker:'NOVA', text:'I am NOVA. I chose you because you ask the right questions.', expression:'explaining' },
        ]
      },
      // SCENE 2 — Drone outside, red scan
      {
        draw: (ctx, t) => this.drawDroneScene(ctx, t),
        lines: [
          { speaker:'AX',   text:'That drone. It is scanning our building.' },
          { speaker:'NOVA', text:'Demolition scheduled. Your family has until morning.', expression:'warning' },
          { speaker:'AX',   text:'An algorithm decided that. About our home.' },
          { speaker:'NOVA', text:'Yes.', expression:'idle' },
        ]
      },
      // SCENE 3 — AX decides
      {
        draw: (ctx, t) => this.drawDecision(ctx, t),
        lines: [
          { speaker:'AX',   text:'Then we learn how it works. And we stop it.' },
          { speaker:'NOVA', text:'Exactly. That is why I chose you.', expression:'happy' },
          { speaker:'AX',   text:'Show me everything.' },
          { speaker:'NOVA', text:'District 1 first. Then we move inward.', expression:'explaining' },
        ]
      },
      // SCENE 4 — Title card
      {
        draw: (ctx, t) => this.drawTitleCard(ctx, t),
        lines: [
          { speaker:'NARRATOR', text:'District 1 — The Algorithm Maze.' },
          { speaker:'NARRATOR', text:'Defeat CHAOS BOT. Save Neuropolis.' },
        ]
      },
    ]
  }

  /** Stop DOM listeners (call before discarding the scene). */
  destroy(): void {
    this.pointerDetach()
  }

  // ── SCENE RENDERERS ──────────────────

  private drawBlack(ctx: CanvasRenderingContext2D, t: number): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)

    // Subtle scan line texture
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.012
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1)
    }
    ctx.globalAlpha = 1

    // City name faint glow
    ctx.fillStyle = '#00e5ff'
    ctx.globalAlpha = 0.06 + Math.sin(t * 0.8) * 0.03
    ctx.font = `13px Orbitron, sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('ALGORITHM SLUMS — DISTRICT 1', W/2, H/2 - 20)
    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  private drawCityNight(
    ctx: CanvasRenderingContext2D, t: number
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = CONFIG.CANVAS_HEIGHT - 110

    // City background
    this.bg.render(ctx, 120)

    // Darken whole screen, keep right side lighter so city reads through
    ctx.fillStyle = '#000000'
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, 0, W, H - 130)
    ctx.globalAlpha = 0.30
    ctx.fillRect(W * 0.50, 0, W * 0.50, H - 130)
    ctx.globalAlpha = 1

    // AX silhouette at left — looking right toward city
    this.drawAXFull(ctx, W * 0.18, GY, t, false)

    // NOVA orb beside AX
    this.nova.show(W * 0.32, GY - 120)
    this.nova.render(ctx)
  }

  private drawDroneScene(
    ctx: CanvasRenderingContext2D, t: number
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = CONFIG.CANVAS_HEIGHT - 110

    // City background
    this.bg.render(ctx, 80)

    // Night vignette — darker left, lighter right
    ctx.fillStyle = '#000000'
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, 0, W, H - 130)
    ctx.globalAlpha = 0.30
    ctx.fillRect(W * 0.50, 0, W * 0.50, H - 130)
    ctx.globalAlpha = 1

    // NeuroCorps drone — big, center-right, menacing
    const driftX = W * 0.65 + Math.sin(t * 0.9) * 18
    const driftY = H * 0.20 + Math.sin(t * 1.3) * 6
    this.drawDroneLarge(ctx, driftX, driftY, t)

    // AX looking up at drone
    this.drawAXFull(ctx, W * 0.22, GY, t, true)

    // NOVA beside AX
    this.nova.show(W * 0.36, GY - 110)
    this.nova.render(ctx)
  }

  private drawDecision(
    ctx: CanvasRenderingContext2D, t: number
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const GY = CONFIG.CANVAS_HEIGHT - 110

    this.bg.render(ctx, 60)

    // Vignette — darker left, lighter right
    ctx.fillStyle = '#000000'
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, 0, W, H - 130)
    ctx.globalAlpha = 0.30
    ctx.fillRect(W * 0.50, 0, W * 0.50, H - 130)
    ctx.globalAlpha = 1

    // AX + NOVA side by side, facing right
    this.drawAXFull(ctx, W * 0.20, GY, t, false)
    this.nova.show(W * 0.38, GY - 130)
    this.nova.render(ctx)

    // Faint glow on horizon — hope
    ctx.fillStyle = '#00e5ff'
    ctx.globalAlpha = 0.04 + Math.sin(t * 0.5) * 0.02
    ctx.fillRect(0, GY - 60, W, 60)
    ctx.globalAlpha = 1
  }

  private drawTitleCard(
    ctx: CanvasRenderingContext2D, t: number
  ): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT

    // Dark city far in background
    this.bg.render(ctx, 0)
    ctx.fillStyle = '#000000'
    ctx.globalAlpha = 0.82
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1

    // District title — large centered
    ctx.fillStyle = '#00e5ff'
    ctx.globalAlpha = 0.9 + Math.sin(t * 2) * 0.05
    ctx.font = `bold 20px 'Press Start 2P'`
    ctx.textAlign = 'center'
    ctx.fillText('DISTRICT 1', W/2, H/2 - 30)

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.7
    ctx.font = `10px 'Press Start 2P'`
    ctx.fillText('THE ALGORITHM MAZE', W/2, H/2 + 10)

    ctx.textAlign = 'left'
    ctx.globalAlpha = 1
  }

  // ── CHARACTER DRAWERS ─────────────────

  private drawAXFull(
    ctx: CanvasRenderingContext2D,
    x: number, groundY: number,
    t: number, _lookingUp: boolean
  ): void {
    if (!this.axLoaded) return

    // Use exact same rendering as Player.ts
    // Frame cycles slowly during cinematic
    const frame = Math.floor(t * 6) % CONFIG.AX_FRAMES_IDLE
    const srcX  = frame * 48
    const scale = CONFIG.AX_DISPLAY_SCALE  // 1.5
    const dw    = Math.floor(48 * scale)
    const dh    = Math.floor(48 * scale)
    const dx    = Math.floor(x - dw / 2)
    const dy    = Math.floor(groundY - dh)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      this.axSprite,
      srcX, 0, 48, 48,
      dx, dy, dw, dh
    )
  }

  private drawDroneLarge(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, t: number
  ): void {
    // Large imposing NeuroCorps drone
    // Main body
    ctx.fillStyle = '#0a0818'
    ctx.fillRect(x - 40, y + 4, 80, 18)
    ctx.fillRect(x - 12, y - 12, 24, 16)

    // Rotor arms — 4 arms
    ctx.fillStyle = '#0d0b1e'
    ctx.fillRect(x - 55, y + 6,  18, 8)
    ctx.fillRect(x + 37, y + 6,  18, 8)
    ctx.fillRect(x - 8,  y - 20, 16, 10)

    // Rotor circles
    ctx.strokeStyle = '#1a1535'
    ctx.lineWidth = 2
    const rotors: [number, number][] = [
      [x - 50, y + 10],
      [x + 50, y + 10],
    ]
    for (const [rx, ry] of rotors) {
      ctx.beginPath()
      ctx.arc(rx, ry, 12, 0, Math.PI*2)
      ctx.stroke()
      // Spinning blur
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(rx, ry, 10, 0, Math.PI*2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // NeuroCorps hexagon logo
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    for (let i=0; i<6; i++) {
      const a = (i/6)*Math.PI*2 - Math.PI/6
      const hx = x + Math.cos(a)*9
      const hy = y + 10 + Math.sin(a)*9
      if (i === 0) ctx.moveTo(hx, hy)
      else         ctx.lineTo(hx, hy)
    }
    ctx.closePath()
    ctx.stroke()
    ctx.globalAlpha = 1

    // Red blink
    const blink = Math.sin(t * 7) > 0.2
    ctx.fillStyle = blink ? '#ff1744' : '#2d0008'
    ctx.fillRect(x - 4, y + 8, 8, 8)

    // RED SCAN BEAM — wide, visible, scary
    const swing = Math.sin(t * 1.1) * 50
    ctx.strokeStyle = '#ff1744'
    ctx.lineWidth = 1
    // 7 scan lines fanning out
    for (let i = -3; i <= 3; i++) {
      ctx.globalAlpha = 0.08 + (1 - Math.abs(i)/4) * 0.10
      ctx.beginPath()
      ctx.moveTo(x + i * 6, y + 22)
      ctx.lineTo(x + swing + i * 30, y + 200)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Filled cone
    ctx.fillStyle = '#ff1744'
    ctx.globalAlpha = 0.05
    ctx.beginPath()
    ctx.moveTo(x - 20, y + 22)
    ctx.lineTo(x + 20, y + 22)
    ctx.lineTo(x + swing + 60, y + 200)
    ctx.lineTo(x + swing - 60, y + 200)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1

    // Scan line on building surface
    ctx.fillStyle = '#ff0000'
    ctx.globalAlpha = 0.06
    ctx.fillRect(0, y + 196, CONFIG.CANVAS_WIDTH, 4)
    ctx.globalAlpha = 1
  }

  // ── LIFECYCLE ────────────────────────

  private startScene(idx: number): void {
    this.sceneIdx = idx
    if (idx >= this.scenes.length) {
      // Fade to black then done
      this.fadeDir = 1
      this.fade = 0
      setTimeout(() => this.onComplete(), 800)
      return
    }
    const s = this.scenes[idx]
    this.dialogue.show(s.lines, () => {
      // Fade out then next scene
      this.transitioning = true
      this.fadeDir = 1
      this.fade = 0
    })
  }

  update(dt: number): void {
    this.time += dt
    this.bg.update(dt)
    this.nova.update(dt)
    this.dialogue.update(dt)

    // Cinematic bars slide in
    if (this.barH < 70) {
      this.barH += dt * 200
      if (this.barH >= 70) {
        this.barH = 70
        if (!this.started) {
          this.started = true
          this.startScene(0)
        }
      }
    }

    // Fade
    this.fade += this.fadeDir * dt * 2.5
    this.fade = Math.max(0, Math.min(1, this.fade))

    // When fade out complete — go to next scene
    if (this.transitioning && this.fade >= 1) {
      this.transitioning = false
      this.fadeDir = -1
      this.startScene(this.sceneIdx + 1)
    }

    // Input — SPACE advances
    if (this.input.isJustPressed('Space') ||
        this.input.isJustPressed('ArrowUp')) {
      if (!this.transitioning) {
        this.dialogue.advance()
        const expr = this.dialogue.getCurrentExpression()
        this.nova.setExpression(expr as NovaExpr)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT

    // Draw current scene
    ctx.imageSmoothingEnabled = false
    this.scenes[this.sceneIdx]?.draw(ctx, this.time)

    // Rain overlay (always present)
    this.drawRain(ctx)

    // Dialogue bar
    this.dialogue.render(ctx)

    // Cinematic bars top and bottom
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, this.barH)
    ctx.fillRect(0, H - this.barH, W, this.barH)

    // Fade overlay
    if (this.fade > 0) {
      ctx.fillStyle = '#000000'
      ctx.globalAlpha = this.fade
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
  }

  private drawRain(ctx: CanvasRenderingContext2D): void {
    // Subtle rain over entire scene
    ctx.strokeStyle = '#003344'
    ctx.lineWidth = 0.5
    const drops = 40
    for (let i = 0; i < drops; i++) {
      const rx = ((i * 337 + this.time * 180) % CONFIG.CANVAS_WIDTH)
      const ry = ((i * 193 + this.time * 300) % (CONFIG.CANVAS_HEIGHT - 130))
      ctx.globalAlpha = 0.12
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(rx - 1, ry + 12)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}
