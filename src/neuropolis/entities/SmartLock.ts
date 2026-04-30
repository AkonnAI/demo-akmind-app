export class SmartLock {
  x: number
  y: number
  isOpen   = false
  isStalled = false   // mirror used
  private stallTimer = 0
  private time = 0
  readonly width  = 20
  readonly height = 60

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  update(dt: number): void {
    this.time += dt
    if (this.isStalled) {
      this.stallTimer -= dt
      if (this.stallTimer <= 0) {
        this.isStalled = false
      }
    }
  }

  stall(): void {
    // Mirror used — stall for 3 seconds then open
    this.isStalled = true
    this.stallTimer = 3
    setTimeout(() => { this.isOpen = true }, 2800)
  }

  getRect() {
    return { x: this.x, y: this.y, w: this.width, h: this.height }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const sx = this.x - cameraX
    const sy = this.y
    if (sx < -40 || sx > 1320) return

    ctx.imageSmoothingEnabled = false

    if (this.isOpen) {
      // Open — just a dim outline
      ctx.strokeStyle = '#003344'
      ctx.lineWidth = 1
      ctx.strokeRect(sx, sy, this.width, this.height)
      return
    }

    // Door body
    ctx.fillStyle = '#0a0818'
    ctx.fillRect(sx, sy, this.width, this.height)
    ctx.strokeStyle = '#1a1535'
    ctx.lineWidth = 1
    ctx.strokeRect(sx, sy, this.width, this.height)

    // Lock panel
    ctx.fillStyle = this.isStalled ? '#442200' : '#003344'
    ctx.fillRect(sx + 3, sy + 20, 14, 22)

    // Lock light
    const pulse = Math.sin(this.time * 3) > 0
    if (this.isStalled) {
      // Amber — confused
      ctx.fillStyle = '#ff9100'
      ctx.globalAlpha = 0.7 + Math.sin(this.time * 12) * 0.3
    } else {
      // Cyan — scanning
      ctx.fillStyle = pulse ? '#00e5ff' : '#003344'
      ctx.globalAlpha = 1
    }
    ctx.fillRect(sx + 7, sy + 24, 6, 6)
    ctx.globalAlpha = 1

    // Scan beam from lock
    if (!this.isStalled) {
      ctx.strokeStyle = '#00e5ff'
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.12 + Math.sin(this.time * 2) * 0.06
      ctx.beginPath()
      ctx.moveTo(sx + 10, sy + 27)
      ctx.lineTo(sx - 60, sy + 27 + Math.sin(this.time * 2) * 20)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Hint label above door — pulsing amber "F HACK" prompt
    ctx.fillStyle   = '#ff9100'
    ctx.globalAlpha = 0.7 + Math.sin(this.time * 5) * 0.3
    ctx.font        = `9px 'Press Start 2P'`
    ctx.textAlign   = 'center'
    ctx.fillText('[ F HACK ]', sx + 10, sy - 10)
    ctx.textAlign   = 'left'
    ctx.globalAlpha = 1
  }
}
