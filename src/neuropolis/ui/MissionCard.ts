import { CONFIG } from '../constants/config'

const FONT_PS2 = "'Press Start 2P'"
const FONT_ORB = 'Orbitron'

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - x, 3)
}

function easeInQuad(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x
}

export interface MissionCardData {
  levelCode: string
  levelName: string
  district: string
  lesson: string
  objective: string
  controls?: string[]
}

export class MissionCard {
  private state: 'idle' | 'entering' | 'hold' | 'exiting' | 'done' = 'idle'
  private data: MissionCardData | null = null
  private onDone: (() => void) | null = null

  private enterT = 0
  private holdT = 0
  private exitT = 0
  private totalTime = 0

  private readonly D_ENTER = 0.5
  private readonly D_HOLD = 3.2
  private readonly D_EXIT = 0.4

  show(data: MissionCardData, onDone?: () => void): void {
    this.data = data
    this.onDone = onDone ?? null
    this.state = 'entering'
    this.enterT = 0
    this.holdT = 0
    this.exitT = 0
    this.totalTime = 0
  }

  isActive(): boolean {
    return this.state !== 'idle' && this.state !== 'done'
  }

  skip(): void {
    if (this.state === 'hold') {
      this.state = 'exiting'
      this.exitT = 0
    }
  }

  update(dt: number): void {
    if (this.state === 'idle' || this.state === 'done') return
    this.totalTime += dt

    switch (this.state) {
      case 'entering': {
        this.enterT += dt
        if (this.enterT >= this.D_ENTER) {
          this.enterT = this.D_ENTER
          this.state = 'hold'
          this.holdT = 0
        }
        break
      }
      case 'hold': {
        this.holdT += dt
        if (this.holdT >= this.D_HOLD) {
          this.state = 'exiting'
          this.exitT = 0
        }
        break
      }
      case 'exiting': {
        this.exitT += dt
        if (this.exitT >= this.D_EXIT) {
          this.exitT = this.D_EXIT
          this.state = 'done'
          const cb = this.onDone
          this.onDone = null
          cb?.()
        }
        break
      }
      default:
        break
    }
  }

  /** Combined visibility 0–1 from enter/exit easing (hold = 1). */
  private visibilityAlpha(): number {
    if (this.state === 'idle' || this.state === 'done') return 0
    if (this.state === 'entering') {
      const t = this.enterT / this.D_ENTER
      return easeOutCubic(t)
    }
    if (this.state === 'exiting') {
      const t = this.exitT / this.D_EXIT
      return 1 - easeInQuad(t)
    }
    return 1
  }

  private wrapLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxW: number,
  ): string[] {
    const words = text.split(/\s+/)
    const out: string[] = []
    let row = ''
    for (const word of words) {
      const test = row + (row ? ' ' : '') + word
      if (ctx.measureText(test).width > maxW && row) {
        out.push(row)
        row = word
      } else {
        row = test
      }
    }
    if (row) out.push(row)
    return out
  }

  private drawCornerBrackets(
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; w: number; h: number },
    style: { col: string; arm: number; lw: number },
  ): void {
    const { x, y, w, h } = box
    const { col, arm, lw } = style
    ctx.save()
    ctx.strokeStyle = col
    ctx.lineWidth = lw
    const br = (x0: number, y0: number, dx: number, dy: number): void => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0 + dx * arm, y0)
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0, y0 + dy * arm)
      ctx.stroke()
    }
    br(x, y, 1, 1)
    br(x + w, y, -1, 1)
    br(x, y + h, 1, -1)
    br(x + w, y + h, -1, -1)
    ctx.restore()
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'idle' || this.state === 'done' || !this.data) return

    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT
    const S = W / 1280

    const vis = this.visibilityAlpha()
    if (vis <= 0) return

    const cardW = Math.round(700 * S)
    const cardH = Math.round(380 * S)
    const cx = W / 2
    const cy = H / 2
    const cardX = Math.round(cx - cardW / 2)
    const cardY = Math.round(cy - cardH / 2)

    let enterScale = 1
    if (this.state === 'entering') {
      enterScale =
        0.92 + 0.08 * easeOutCubic(this.enterT / this.D_ENTER)
    } else if (this.state === 'exiting') {
      enterScale = 1 - 0.06 * easeInQuad(this.exitT / this.D_EXIT)
    }

    ctx.save()
    ctx.imageSmoothingEnabled = false

    // 1. Overlay
    ctx.fillStyle = `rgba(0, 0, 10, ${0.82 * vis})`
    ctx.fillRect(0, 0, W, H)

    ctx.translate(cx, cy)
    ctx.scale(enterScale, enterScale)
    ctx.translate(-cx, -cy)

    ctx.globalAlpha = vis

    // 2. Card body + cyan border
    ctx.fillStyle = 'rgba(6, 4, 18, 0.97)'
    ctx.fillRect(cardX, cardY, cardW, cardH)
    ctx.strokeStyle = '#00e5ff'
    ctx.lineWidth = Math.max(1, Math.round(2 * S))
    ctx.strokeRect(
      cardX + 0.5,
      cardY + 0.5,
      cardW - 1,
      cardH - 1,
    )

    const bracketArm = Math.round(18 * S)
    this.drawCornerBrackets(ctx, { x: cardX, y: cardY, w: cardW, h: cardH }, {
      col: 'rgba(0, 229, 255, 0.85)',
      arm: bracketArm,
      lw: Math.max(1, Math.round(1.5 * S)),
    })

    const accentH = Math.max(3, Math.round(4 * S))
    ctx.fillStyle = '#00e5ff'
    ctx.globalAlpha = vis * 0.95
    ctx.fillRect(cardX, cardY, cardW, accentH)
    ctx.globalAlpha = vis

    // 3. Scan line
    const scanY =
      cardY +
      accentH +
      ((this.totalTime * 90 * S) % (cardH - accentH - Math.round(8 * S)))
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + Math.round(12 * S), scanY)
    ctx.lineTo(cardX + cardW - Math.round(12 * S), scanY)
    ctx.stroke()

    const padX = Math.round(28 * S)
    const padTop = Math.round(20 * S) + accentH
    let y = cardY + padTop
    const innerW = cardW - 2 * padX
    const d = this.data

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    // 4. Header
    ctx.font = `${Math.round(10 * S)}px ${FONT_PS2}, monospace`
    ctx.fillStyle = 'rgba(0, 229, 255, 0.55)'
    ctx.fillText('// MISSION BRIEFING //', cardX + padX, y)
    y += Math.round(28 * S)

    // 5. levelCode + levelName
    ctx.font = `bold ${Math.round(14 * S)}px ${FONT_PS2}, monospace`
    ctx.fillStyle = '#00e5ff'
    ctx.fillText(d.levelCode.toUpperCase(), cardX + padX, y)
    y += Math.round(26 * S)

    ctx.font = `bold ${Math.round(24 * S)}px ${FONT_ORB}, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(d.levelName.toUpperCase(), cardX + padX, y)
    y += Math.round(36 * S)

    // 6. District
    ctx.font = `${Math.round(11 * S)}px ${FONT_ORB}, sans-serif`
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(d.district.toUpperCase(), cardX + padX, y)
    y += Math.round(26 * S)

    // 7. Lesson
    ctx.font = `${Math.round(12 * S)}px ${FONT_ORB}, sans-serif`
    ctx.fillStyle = '#c084fc'
    ctx.fillText(`LESSON: ${d.lesson.toUpperCase()}`, cardX + padX, y)
    y += Math.round(28 * S)

    // 8. Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + padX, y)
    ctx.lineTo(cardX + cardW - padX, y)
    ctx.stroke()
    y += Math.round(22 * S)

    // 9. Objective
    ctx.font = `${Math.round(10 * S)}px ${FONT_PS2}, monospace`
    ctx.fillStyle = 'rgba(0, 229, 255, 0.75)'
    ctx.fillText('OBJECTIVE', cardX + padX, y)
    y += Math.round(22 * S)

    ctx.font = `${Math.round(14 * S)}px ${FONT_ORB}, sans-serif`
    ctx.fillStyle = '#fbbf24'
    const objLines = this.wrapLines(ctx, d.objective.toUpperCase(), innerW)
    const objLineH = Math.round(20 * S)
    for (const line of objLines) {
      if (y > cardY + cardH - Math.round(72 * S)) break
      ctx.fillText(line, cardX + padX, y)
      y += objLineH
    }

    // 10. Controls hints
    if (d.controls && d.controls.length > 0) {
      y += Math.round(8 * S)
      ctx.font = `${Math.round(10 * S)}px ${FONT_ORB}, sans-serif`
      ctx.fillStyle = '#64748b'
      for (const hint of d.controls) {
        if (y > cardY + cardH - Math.round(52 * S)) break
        ctx.fillText(hint, cardX + padX, y)
        y += Math.round(18 * S)
      }
    }

    // 11. Pulsing prompt during hold
    if (this.state === 'hold') {
      const pulse = 0.45 + Math.sin(this.totalTime * 5) * 0.45
      ctx.save()
      ctx.globalAlpha = vis * pulse
      ctx.font = `${Math.round(12 * S)}px ${FONT_PS2}, monospace`
      ctx.fillStyle = '#00e5ff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        'PRESS SPACE OR TAP TO BEGIN',
        cx,
        cardY + cardH - Math.round(16 * S),
      )
      ctx.restore()
    }

    ctx.restore()
  }
}
