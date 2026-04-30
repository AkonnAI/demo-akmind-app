export class XPBar {
  private currentXP = 0
  private displayXP = 0
  private playerLevel = 1
  private flashTimer = 0
  private levelUpTimer = 0
  private xpGainQueue: number[] = []

  private readonly thresholds = [0, 500, 1200, 2200, 3500]

  addXP(amount: number): void {
    this.xpGainQueue.push(amount)
    this.flashTimer = 0.35
  }

  spendXP(amount: number): void {
    this.currentXP = Math.max(0, this.currentXP - amount)
    this.displayXP = Math.max(0, this.displayXP - amount)
  }

  getCurrentXP(): number {
    return this.currentXP
  }

  getPlayerLevel(): number {
    return this.playerLevel
  }

  update(dt: number): void {
    while (this.xpGainQueue.length > 0) {
      const n = this.xpGainQueue.shift()
      if (n != null) this.currentXP += n
    }
    const diff = this.currentXP - this.displayXP
    if (diff > 0) {
      this.displayXP += diff * Math.min(1, dt * 4)
      if (Math.abs(this.currentXP - this.displayXP) < 0.5) {
        this.displayXP = this.currentXP
      }
    }
    const newLevel = this.computeLevel(this.displayXP)
    if (newLevel > this.playerLevel) {
      this.playerLevel = newLevel
      this.levelUpTimer = 2.0
    }
    if (this.flashTimer > 0) this.flashTimer -= dt
    if (this.levelUpTimer > 0) this.levelUpTimer -= dt
  }

  private computeLevel(xp: number): number {
    for (let i = this.thresholds.length - 1; i >= 0; i--) {
      if (xp >= (this.thresholds[i] ?? 0)) return i + 1
    }
    return 1
  }

  render(ctx: CanvasRenderingContext2D): void {
    const BAR_X = 960
    const BAR_Y = 8
    const BAR_W = 240
    const BAR_H = 12

    const curThresh = this.thresholds[this.playerLevel - 1] ?? 0
    const nextThresh = this.thresholds[this.playerLevel]
    let fillFrac = 0
    if (nextThresh !== undefined) {
      fillFrac = Math.min(
        1,
        (this.displayXP - curThresh) / (nextThresh - curThresh),
      )
    } else {
      fillFrac = 1
    }

    ctx.save()
    ctx.imageSmoothingEnabled = false

    ctx.fillStyle = '#0a0814'
    ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H)
    ctx.strokeStyle = '#1a1040'
    ctx.lineWidth = 1
    ctx.strokeRect(BAR_X, BAR_Y, BAR_W, BAR_H)

    if (fillFrac > 0) {
      const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0)
      grad.addColorStop(0, '#00e5ff')
      grad.addColorStop(1, '#7c4dff')
      ctx.fillStyle = grad
      ctx.fillRect(BAR_X, BAR_Y, BAR_W * fillFrac, BAR_H)
    }

    if (fillFrac > 0) {
      const shimmerX =
        BAR_X + BAR_W * fillFrac * (((Date.now() % 1200) / 1200) * 0.9)
      const shimmerGrad = ctx.createLinearGradient(
        shimmerX - 20,
        0,
        shimmerX + 20,
        0,
      )
      shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)')
      shimmerGrad.addColorStop(0.5, 'rgba(255,255,255,0.35)')
      shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = shimmerGrad
      ctx.fillRect(BAR_X, BAR_Y, BAR_W * fillFrac, BAR_H)
    }

    if (this.flashTimer > 0) {
      ctx.fillStyle = `rgba(255,255,255,${(this.flashTimer / 0.35) * 0.4})`
      ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H)
    }

    ctx.font = "bold 8px 'Press Start 2P', monospace"
    ctx.fillStyle = '#7c4dff'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`LV${this.playerLevel}`, BAR_X - 6, BAR_Y + 9)

    ctx.font = '8px Orbitron, monospace'
    ctx.fillStyle = '#00e5ff'
    ctx.textAlign = 'left'
    const nextT = this.thresholds[this.playerLevel]
    if (nextT !== undefined) {
      ctx.fillText(
        `${Math.floor(this.displayXP)}/${nextT}`,
        BAR_X + BAR_W + 6,
        BAR_Y + 9,
      )
    } else {
      ctx.fillText('MAX', BAR_X + BAR_W + 6, BAR_Y + 9)
    }

    if (this.levelUpTimer > 0) {
      const alpha = Math.min(1, this.levelUpTimer / 0.5)
      const scale = 1 + (1 - Math.min(1, this.levelUpTimer / 0.3)) * 0.4
      ctx.save()
      ctx.translate(BAR_X + BAR_W / 2, BAR_Y + 26)
      ctx.scale(scale, scale)
      ctx.font = "bold 10px 'Press Start 2P', monospace"
      ctx.fillStyle = `rgba(255,204,0,${alpha})`
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ffcc00'
      ctx.shadowBlur = 12
      ctx.fillText(`LEVEL UP  LV${this.playerLevel}`, 0, 0)
      ctx.shadowBlur = 0
      ctx.restore()
    }

    ctx.textAlign = 'left'
    ctx.restore()
  }
}
