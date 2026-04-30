import { CONFIG } from '../constants/config'

type Speaker = 'NOVA' | 'AX' | 'NARRATOR' | 'CHAOS' | 'KAEL' | 'KIRAN' | 'NPC'

export interface DialogueLine {
  speaker: Speaker
  text: string
  expression?: string
}

const FONT_PS2 = "'Press Start 2P'"
const FONT_ORB = 'Orbitron'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function withAlpha(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

export class DialogueBox {
  private static firedKeys = new Set<string>()

  static markFired(key: string): void {
    DialogueBox.firedKeys.add(key)
  }

  static hasFired(key: string): boolean {
    return DialogueBox.firedKeys.has(key)
  }

  static resetAll(): void {
    DialogueBox.firedKeys.clear()
  }

  static resetForLevel(prefix: string): void {
    for (const key of [...DialogueBox.firedKeys]) {
      if (key.startsWith(prefix)) DialogueBox.firedKeys.delete(key)
    }
  }

  private visible = false
  private lines: DialogueLine[] = []
  private idx = 0
  private displayed = ''
  private typeT = 0
  private readonly SPD = 0.022
  private done = false
  private onDone: (() => void) | null = null

  private time = 0
  private position: 'top' | 'bottom' = 'bottom'
  private boxHeight = 130
  /** Side margins so the panel does not span full canvas width (keeps mid-screen visible). */
  private horizontalInset = 0

  setPosition(pos: 'top' | 'bottom'): void {
    this.position = pos
  }

  setHeight(h: number): void {
    this.boxHeight = h
  }

  /** Inset from left/right in px; 0 = full width (default). */
  setHorizontalInset(px: number): void {
    this.horizontalInset = Math.max(0, px)
  }

  private readonly COL: Record<Speaker, string> = {
    NOVA:     '#00e5ff',
    AX:       '#818cf8',
    NARRATOR: '#94a3b8',
    CHAOS:    '#ff4444',
    KAEL:     '#e2e8f0',
    KIRAN:    '#e040fb',
    NPC:      '#fbbf24',
  }

  show(lines: DialogueLine[], onDone?: () => void): void {
    this.lines = lines
    this.idx = 0
    this.displayed = ''
    this.typeT = 0
    this.done = false
    this.visible = true
    this.onDone = onDone ?? null
  }

  hide(): void { this.visible = false }
  isVisible(): boolean { return this.visible }

  advance(): void {
    if (!this.visible) return
    if (!this.done) {
      this.displayed = this.lines[this.idx]?.text ?? ''
      this.done = true
      return
    }
    this.idx++
    if (this.idx >= this.lines.length) {
      this.visible = false
      this.onDone?.()
      return
    }
    this.displayed = ''
    this.typeT = 0
    this.done = false
  }

  getCurrentExpression(): string {
    return this.lines[this.idx]?.expression ?? 'idle'
  }

  update(dt: number): void {
    if (!this.visible) return
    this.time += dt
    if (this.done) return
    const target = this.lines[this.idx]?.text ?? ''
    this.typeT += dt
    while (this.typeT >= this.SPD &&
           this.displayed.length < target.length) {
      this.typeT -= this.SPD
      this.displayed += target[this.displayed.length]
    }
    if (this.displayed.length >= target.length) this.done = true
  }

  private drawPortrait(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    pw: number,
    ph: number,
    col: string,
    initial: string,
  ): void {
    ctx.save()
    ctx.fillStyle = '#020112'
    ctx.fillRect(px, py, pw, ph)
    ctx.strokeStyle = col
    ctx.lineWidth = 1.5
    ctx.strokeRect(px + 0.75, py + 0.75, pw - 1.5, ph - 1.5)
    const L = 10
    ctx.strokeStyle = col
    ctx.lineWidth = 1.5
    const br = (x0: number, y0: number, dx: number, dy: number): void => {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0 + dx * L, y0)
      ctx.moveTo(x0, y0)
      ctx.lineTo(x0, y0 + dy * L)
      ctx.stroke()
    }
    br(px, py, 1, 1)
    br(px + pw, py, -1, 1)
    br(px, py + ph, 1, -1)
    br(px + pw, py + ph, -1, -1)
    ctx.font = `bold 36px ${FONT_ORB}, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = withAlpha(col, 0.25)
    ctx.fillText(initial, px + pw / 2, py + ph / 2)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.restore()
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

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return
    const line = this.lines[this.idx]
    if (!line) return

    const W = CONFIG.CANVAS_WIDTH
    const CH = CONFIG.CANVAS_HEIGHT
    const isTop = this.position === 'top'
    const col = this.COL[line.speaker]
    const border60 = withAlpha(col, 0.6)
    const initial = line.speaker[0] ?? '?'
    const BH = this.boxHeight
    const mx = this.horizontalInset
    const innerW = W - 2 * mx
    const pxL = mx + 12
    const portraitW = 84
    const portraitPad = 8
    const textMaxW = Math.max(200, innerW - 24 - portraitW - portraitPad)

    ctx.save()
    ctx.imageSmoothingEnabled = false

    if (isTop) {
      const BY = 56
      ctx.fillStyle = 'rgba(2, 1, 18, 0.96)'
      ctx.fillRect(mx, BY, innerW, BH)
      ctx.strokeStyle = border60
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(mx, BY + BH)
      ctx.lineTo(mx + innerW, BY + BH)
      ctx.stroke()
      ctx.fillStyle = col
      ctx.fillRect(mx, BY, 4, BH)

      ctx.font = `bold 12px ${FONT_PS2}, sans-serif`
      ctx.fillStyle = col
      ctx.textAlign = 'left'
      ctx.fillText(line.speaker, pxL, BY + 22)

      ctx.font = `11px ${FONT_ORB}, sans-serif`
      ctx.fillStyle = '#f1f5f9'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      const rows = this.wrapLines(ctx, this.displayed, textMaxW)
      let ty = BY + 50
      const lineH = 24
      for (const r of rows) {
        if (ty > BY + BH - 8) break
        ctx.fillText(r, pxL, ty)
        ty += lineH
      }
      ctx.shadowBlur = 0

      const portraitX = mx + innerW - portraitW - portraitPad
      this.drawPortrait(ctx, portraitX, BY + 4, portraitW, portraitW, col, initial)

      if (this.done) {
        const pulse = 0.4 + Math.sin(this.time * 4) * 0.4
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = `14px ${FONT_ORB}, sans-serif`
        ctx.fillStyle = col
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText('▶', mx + innerW - 18, BY + Math.min(72, BH - 28))
        ctx.globalAlpha = 1
        ctx.restore()
      }
    } else {
      const BY = CH - BH
      ctx.fillStyle = 'rgba(2, 1, 18, 0.96)'
      ctx.fillRect(mx, BY, innerW, BH)
      ctx.strokeStyle = border60
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(mx, BY)
      ctx.lineTo(mx + innerW, BY)
      ctx.stroke()
      ctx.fillStyle = col
      ctx.fillRect(mx, BY, 4, BH)

      ctx.font = `bold 12px ${FONT_PS2}, sans-serif`
      ctx.fillStyle = col
      ctx.textAlign = 'left'
      ctx.fillText(line.speaker, pxL, BY + 22)

      ctx.font = `11px ${FONT_ORB}, sans-serif`
      ctx.fillStyle = '#f1f5f9'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 3
      const rows = this.wrapLines(ctx, this.displayed, textMaxW)
      let ty = BY + 50
      const lineH = 24
      for (const r of rows) {
        if (ty > BY + BH - 12) break
        ctx.fillText(r, pxL, ty)
        ty += lineH
      }
      ctx.shadowBlur = 0

      const portraitX = mx + innerW - portraitW - portraitPad
      this.drawPortrait(ctx, portraitX, BY + 4, portraitW, portraitW, col, initial)

      if (this.done) {
        const pulse = 0.4 + Math.sin(this.time * 4) * 0.4
        ctx.save()
        ctx.globalAlpha = pulse
        ctx.font = `14px ${FONT_ORB}, sans-serif`
        ctx.fillStyle = col
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText('▶', mx + innerW - 18, BY + BH - 22)
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }

    ctx.restore()
  }
}
