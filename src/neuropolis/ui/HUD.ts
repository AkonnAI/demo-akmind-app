import { CONFIG } from '../constants/config'
import { XPBar } from './XPBar'

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
  private message    = ''
  private msgTimer   = 0
  private time       = 0
  private weaponName = ''

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

  showMessage(msg: string, duration = 3): void {
    this.message  = msg
    this.msgTimer = duration
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
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = 'rgba(8, 4, 30, 0.9)'
    ctx.fillRect(0, 700, W, 20)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 700.5); ctx.lineTo(W, 700.5); ctx.stroke()
    ctx.font = `8px ${ORB}, sans-serif`
    ctx.fillStyle = '#334155'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('← → / A D MOVE   ↑ / W / SPACE JUMP   Z SHOOT   X WEAPON   E INTERACT', W / 2, 713)
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
    ctx.restore()
  }

  render(ctx: CanvasRenderingContext2D, opts?: HUDRenderOptions): void {
    const W = CONFIG.CANVAS_WIDTH
    ctx.save()
    ctx.imageSmoothingEnabled = false

    // Row 1 — HP + Level name
    ctx.fillStyle = 'rgba(8, 4, 30, 0.9)'
    ctx.fillRect(0, 0, W, 36)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 36.5); ctx.lineTo(W, 36.5); ctx.stroke()

    ctx.font = `14px ${ORB}, sans-serif`
    ctx.fillStyle = '#ff4444'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText('HP', 16, 24)

    const sq = 16, gap = 4, startX = 52, heartY = 10
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

    ctx.font = `bold 13px ${PS2}, sans-serif`
    ctx.fillStyle = '#00e5ff'; ctx.textAlign = 'center'
    ctx.fillText(this.level, 640, 24)

    // Row 2 — Objective
    ctx.fillStyle = 'rgba(5, 3, 14, 0.85)'
    ctx.fillRect(0, 36, W, 20)
    ctx.strokeStyle = '#1a1035'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 56.5); ctx.lineTo(W, 56.5); ctx.stroke()

    const objA = 0.7 + Math.sin(this.time * 1.5) * 0.3
    ctx.globalAlpha = objA
    ctx.font = `11px ${ORB}, sans-serif`
    ctx.fillStyle = '#6366f1'; ctx.textAlign = 'center'
    ctx.fillText(this.objective.slice(0, 52), 640, 50)
    ctx.globalAlpha = 1

    // Center message
    if (this.message) {
      const alpha = this.msgTimer > 0.5 ? 1 : this.msgTimer * 2
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold 14px ${ORB}, sans-serif`
      ctx.textAlign = 'center'
      const mw = ctx.measureText(this.message).width + 32
      ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.8 * alpha
      ctx.fillRect(W / 2 - mw / 2, 300, mw, 28)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#00e5ff'
      ctx.fillText(this.message, W / 2, 320)
      ctx.restore()
    }

    if (!opts?.deferControls) this.renderControlsBar(ctx)

    this.xpBar.render(ctx)

    ctx.textAlign = 'left'
    ctx.restore()
  }
}
