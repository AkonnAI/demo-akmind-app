import { CONFIG } from '../constants/config'
import { audioManager } from '../engine/AudioManager'
import { XPBar } from './XPBar'

const S = CONFIG.CANVAS_WIDTH / 1280

const ORB = 'Orbitron'
const PS2 = "'Press Start 2P'"

export type HUDRenderOptions = { deferControls?: boolean }

export class HUD {
  private xpBar      = new XPBar()
  private hp         = 3
  private maxHp      = 3
  private score      = 0
  private level      = 'LEVEL 1 — THE SCAN'
  private objective  = 'REACH THE SMART LOCK AT THE END'
  private message      = ''
  private msgTimer     = 0
  private messageColor = '#00e5ff'
  private time         = 0
  private weaponName   = ''

  private muteBtn = { x: 0, y: 0, size: 28 }

  setHP(hp: number): void        { this.hp        = Math.max(0, hp) }
  setWeapon(name: string): void  { this.weaponName = name }
  addScore(n: number): void {
    this.score += n
    this.xpBar.addXP(n)
  }

  getXP(): number { return this.xpBar.getCurrentXP() }

  spendXP(amount: number): boolean {
    if (this.xpBar.getCurrentXP() < amount) return false
    this.xpBar.spendXP(amount)
    return true
  }

  setLevel(s: string): void     { this.level     = s }
  setObjective(s: string): void { this.objective = s }

  showMessage(msg: string, duration = 3, color?: string): void {
    this.message      = msg
    this.msgTimer     = duration
    this.messageColor = color ?? '#00e5ff'
  }

  handleClick(cx: number, cy: number): void {
    const b = this.muteBtn
    if (cx >= b.x && cx <= b.x + b.size && cy >= b.y && cy <= b.y + b.size) {
      audioManager.toggleMute()
    }
  }

  update(dt: number): void {
    this.time += dt
    this.xpBar.update(dt)
    if (this.msgTimer > 0) {
      this.msgTimer -= dt
      if (this.msgTimer <= 0) this.message = ''
    }
  }

  renderControlsBar(ctx: CanvasRenderingContext2D): void {
    const W = CONFIG.CANVAS_WIDTH
    const CH = CONFIG.CANVAS_HEIGHT
    const controlsBarH = Math.round(24 * S)
    const barTop = CH - controlsBarH
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = 'rgba(8, 4, 30, 0.9)'
    ctx.fillRect(0, barTop, W, controlsBarH)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, barTop + 0.5); ctx.lineTo(W, barTop + 0.5); ctx.stroke()
    ctx.font = `bold ${Math.round(13 * S)}px ${ORB}, sans-serif`
    ctx.fillStyle = '#e2e8f0'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('← → / A D MOVE   ↑ / W / SPACE JUMP   Z SHOOT   X WEAPON   E INTERACT', W / 2, barTop + controlsBarH / 2)
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.restore()
  }

  render(ctx: CanvasRenderingContext2D, opts?: HUDRenderOptions): void {
    const W = CONFIG.CANVAS_WIDTH
    const hpRowH = Math.round(44 * S)
    const objRowH = Math.round(26 * S)
    ctx.save()
    ctx.imageSmoothingEnabled = false

    // Row 1 — HP + Level name
    ctx.fillStyle = 'rgba(8, 4, 30, 0.9)'
    ctx.fillRect(0, 0, W, hpRowH)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, hpRowH + 0.5); ctx.lineTo(W, hpRowH + 0.5); ctx.stroke()

    ctx.font = `14px ${ORB}, sans-serif`
    ctx.fillStyle = '#ff4444'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText('HP', 16, 24)

    const sq = Math.round(18 * S)
    const gap = Math.round(5 * S)
    const startX = Math.round(52 * S)
    const heartY = Math.round((hpRowH - sq) / 2)
    for (let i = 0; i < this.maxHp; i++) {
      const hx = startX + i * (sq + gap)
      if (i < this.hp) {
        ctx.fillStyle = '#ff4444'
      } else {
        ctx.fillStyle = '#1a0a0a'
        ctx.fillRect(hx, heartY, sq, sq)
        ctx.strokeStyle = '#ff444444'; ctx.lineWidth = 1
        ctx.strokeRect(hx + 0.5, heartY + 0.5, sq - 1, sq - 1)
        continue
      }
      ctx.fillRect(hx, heartY, sq, sq)
    }

    // Weapon name (top-right area)
    if (this.weaponName) {
      ctx.font = `9px ${ORB}, sans-serif`
      ctx.fillStyle = '#00e5ff'; ctx.textAlign = 'right'
      ctx.fillText(`[${this.weaponName}]`, W - 200, 24)
      ctx.textAlign = 'left'
    }

    ctx.font = `bold ${Math.round(15 * S)}px ${PS2}, sans-serif`
    ctx.fillStyle = '#00e5ff'; ctx.textAlign = 'center'
    ctx.fillText(this.level, 640, 24)

    // Row 2 — Objective
    ctx.fillStyle = 'rgba(5, 3, 14, 0.85)'
    ctx.fillRect(0, hpRowH, W, objRowH)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, hpRowH + objRowH + 0.5); ctx.lineTo(W, hpRowH + objRowH + 0.5); ctx.stroke()

    const objA = 0.7 + Math.sin(this.time * 1.5) * 0.3
    ctx.globalAlpha = objA
    ctx.font = `${Math.round(14 * S)}px ${ORB}, sans-serif`
    ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.objective, W / 2, hpRowH + objRowH / 2)
    ctx.textBaseline = 'alphabetic'
    ctx.globalAlpha = 1

    // Center message
    if (this.message) {
      const alpha = this.msgTimer > 0.5 ? 1 : this.msgTimer * 2
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold ${Math.round(18 * S)}px ${ORB}, sans-serif`
      ctx.textAlign = 'center'
      const mw = ctx.measureText(this.message).width + 32
      ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.8 * alpha
      ctx.fillRect(W / 2 - mw / 2, 300, mw, 28)
      ctx.globalAlpha = alpha
      ctx.fillStyle = this.messageColor
      ctx.fillText(this.message, W / 2, 320)
      ctx.restore()
    }

    if (!opts?.deferControls) this.renderControlsBar(ctx)

    this.xpBar.render(ctx)

    ctx.textAlign = 'left'

    {
      const S = CONFIG.CANVAS_WIDTH / 1280
      const btnSize = Math.round(28 * S)
      const btnX = CONFIG.CANVAS_WIDTH - Math.round(44 * S)
      const btnY = Math.round(8 * S)
      this.muteBtn = { x: btnX, y: btnY, size: btnSize }

      ctx.save()
      ctx.fillStyle = 'rgba(8,4,30,0.85)'
      ctx.fillRect(btnX, btnY, btnSize, btnSize)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1
      ctx.strokeRect(btnX, btnY, btnSize, btnSize)
      ctx.font = `${Math.round(16 * S)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(audioManager.isMuted() ? '🔇' : '🔊', btnX + btnSize / 2, btnY + btnSize / 2)
      ctx.restore()
    }

    ctx.restore()
  }
}
