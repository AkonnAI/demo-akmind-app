import { CONFIG } from '../constants/config'
import { InputManager } from '../engine/InputManager'

type AnimState = 'idle' | 'run' | 'jump' | 'fall'

export class Player {
  x: number
  y: number

  vx: number = 0
  vy: number = 0

  /** Horizontal velocity (alias of {@link vx} for camera / tooling). */
  get velocityX(): number {
    return this.vx
  }
  isOnGround: boolean = false
  isFacingRight: boolean = true

  // Weapon system — slot 0=blaster, 1=EMP, 2=prism, 3=gravity/pulse
  weaponSlot: number = 0
  hasWeapon: boolean[] = [true, false, false, false, false, false, false]
  // Legacy alias
  get hasSecondWeapon(): boolean  { return this.hasWeapon[1] ?? false }
  set hasSecondWeapon(v: boolean) { this.hasWeapon[1] = v }

  hasDoubleJump = false
  private usedDoubleJump = false

  muzzleFlashFrames = 0
  chargeT    = 0
  isCharging = false

  readonly width:    number = 22
  readonly height:   number = 54
  readonly displayW: number = CONFIG.AX_FRAME_WIDTH  * CONFIG.AX_DISPLAY_SCALE
  readonly displayH: number = CONFIG.AX_FRAME_HEIGHT * CONFIG.AX_DISPLAY_SCALE

  private sheets: Record<'idle'|'run'|'jump', HTMLImageElement>
  private loaded:  Record<'idle'|'run'|'jump', boolean> = { idle:false, run:false, jump:false }

  private animState:    AnimState = 'idle'
  private currentFrame: number   = 0
  private frameTimer:   number   = 0

  constructor(startX: number, groundY: number) {
    this.x = startX
    this.y = groundY - this.height

    this.sheets = {
      idle: new Image(),
      run:  new Image(),
      jump: new Image(),
    }
    this.sheets.idle.onload = () => { this.loaded.idle = true }
    this.sheets.run.onload  = () => { this.loaded.run  = true }
    this.sheets.jump.onload = () => { this.loaded.jump = true }
    this.sheets.idle.src = CONFIG.AX_SPRITE_IDLE
    this.sheets.run.src  = CONFIG.AX_SPRITE_RUN
    this.sheets.jump.src = CONFIG.AX_SPRITE_JUMP

    this.hasWeapon = [true, false, false, false, false, false, false]
  }

  switchWeapon(): void {
    const available = this.hasWeapon
      .map((has, i) => (has ? i : -1))
      .filter(i => i >= 0)
    if (available.length <= 1) return
    const currentPos = available.indexOf(this.weaponSlot)
    const nextPos = (currentPos + 1) % available.length
    this.weaponSlot = available[nextPos] ?? 0
  }

  unlockWeapon(n: number): void {
    if (n >= 0 && n < this.hasWeapon.length) {
      this.hasWeapon[n] = true
    }
  }

  currentWeaponName(): string {
    switch (this.weaponSlot) {
      case 0: return 'BLASTER'
      case 1: return 'EMP'
      case 2: return 'PRISM'
      case 3: return 'GRAVITY'
      case 4: return 'MIRROR'
      case 5: return 'PULSE'
      case 6: return 'PHASE'
      default: return 'BLASTER'
    }
  }

  update(dt: number, input: InputManager): void {
    if (this.muzzleFlashFrames > 0) this.muzzleFlashFrames--
    if (this.isOnGround) this.usedDoubleJump = false

    const movingLeft  = input.isDown('ArrowLeft')
    const movingRight = input.isDown('ArrowRight')

    if (movingLeft) {
      this.vx = -CONFIG.PLAYER_SPEED
      this.isFacingRight = false
    } else if (movingRight) {
      this.vx = CONFIG.PLAYER_SPEED
      this.isFacingRight = true
    } else {
      this.vx *= Math.pow(0.001, dt)
      if (Math.abs(this.vx) < 1) this.vx = 0
    }

    const wantsJump = input.isJustPressed('ArrowUp') || input.isJustPressed('Space')
    if (wantsJump && this.isOnGround) {
      this.vy = CONFIG.JUMP_FORCE
      this.isOnGround = false
      this.currentFrame = 0; this.frameTimer = 0
    } else if (wantsJump && !this.isOnGround && this.hasDoubleJump && !this.usedDoubleJump) {
      this.vy = CONFIG.JUMP_FORCE
      this.usedDoubleJump = true
      this.currentFrame = 0; this.frameTimer = 0
    }

    this.vy += CONFIG.GRAVITY * dt
    if (this.vy > 1400) this.vy = 1400

    this.x += this.vx * dt
    this.y += this.vy * dt

    if (this.x < 0) { this.x = 0; this.vx = 0 }

    const prevState = this.animState
    if (!this.isOnGround) {
      this.animState = this.vy < 0 ? 'jump' : 'fall'
    } else if (Math.abs(this.vx) > 5) {
      this.animState = 'run'
    } else {
      this.animState = 'idle'
    }

    if (this.animState !== prevState) { this.currentFrame = 0; this.frameTimer = 0 }

    let speed: number, frameCount: number
    switch (this.animState) {
      case 'run':
        speed = CONFIG.AX_SPD_RUN; frameCount = CONFIG.AX_FRAMES_RUN; break
      case 'jump':
        speed = CONFIG.AX_SPD_JUMP; frameCount = CONFIG.AX_FRAMES_JUMP
        this.frameTimer += dt
        if (this.frameTimer >= speed) {
          this.frameTimer = 0
          if (this.currentFrame < CONFIG.AX_FRAMES_JUMP - 1) this.currentFrame++
        }
        return
      case 'fall':
        this.currentFrame = 1; return
      case 'idle': default:
        speed = CONFIG.AX_SPD_IDLE; frameCount = CONFIG.AX_FRAMES_IDLE; break
    }
    this.frameTimer += dt
    if (this.frameTimer >= speed) {
      this.frameTimer = 0
      this.currentFrame = (this.currentFrame + 1) % frameCount
    }
  }

  resolveGround(groundY: number): void {
    const feetY = this.y + this.height
    if (feetY >= groundY) {
      this.y = groundY - this.height
      this.vy = 0
      this.isOnGround = true
    } else {
      this.isOnGround = false
    }
  }

  private getActiveSheet(): HTMLImageElement | null {
    switch (this.animState) {
      case 'run':  return this.loaded.run  ? this.sheets.run  : null
      case 'jump':
      case 'fall': return this.loaded.jump ? this.sheets.jump : null
      default:     return this.loaded.idle ? this.sheets.idle : null
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number): void {
    const screenX = Math.round(this.x - cameraX - (this.displayW - this.width) / 2)
    const screenY = Math.round(this.y - (this.displayH - this.height))

    ctx.imageSmoothingEnabled = false
    const sheet = this.getActiveSheet()

    if (sheet) {
      const srcX = this.currentFrame * CONFIG.AX_FRAME_WIDTH
      if (!this.isFacingRight) {
        ctx.save()
        ctx.translate(screenX + this.displayW, screenY)
        ctx.scale(-1, 1)
        ctx.drawImage(sheet, srcX, 0, CONFIG.AX_FRAME_WIDTH, CONFIG.AX_FRAME_HEIGHT,
          0, 0, this.displayW, this.displayH)
        ctx.restore()
      } else {
        ctx.drawImage(sheet, srcX, 0, CONFIG.AX_FRAME_WIDTH, CONFIG.AX_FRAME_HEIGHT,
          screenX, screenY, this.displayW, this.displayH)
      }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.globalAlpha = 0.25
      ctx.strokeRect(screenX + this.displayW * 0.2, screenY + this.displayH * 0.15,
        this.displayW * 0.6, this.displayH * 0.75)
      ctx.globalAlpha = 1
    } else {
      const bx = Math.floor(this.x - cameraX)
      ctx.fillStyle = '#1E293B'
      ctx.fillRect(bx, this.y, this.width, this.height)
      ctx.fillStyle = '#00ffff'
      ctx.fillRect(bx, this.y + 10, this.width, 8)
    }

    // ── WEAPON RENDER ──────────────────────────────────────────
    this.renderWeapon(ctx, cameraX, screenX, screenY)
  }

  private renderWeapon(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    _screenX: number,
    _screenY: number,
  ): void {
    const ssx = Math.floor(this.x - cameraX)
    const ssy = Math.floor(this.y)
    const fr = this.isFacingRight
    const armY = ssy + 28
    const cx = ssx + this.width / 2
    const dir = fr ? 1 : -1
    const armLen = 18
    const armThick = 4
    const tipX = cx + dir * armLen
    const tipY = armY
    const barLeft = fr ? cx : cx - armLen

    ctx.save()
    ctx.imageSmoothingEnabled = false

    const wSlot = this.weaponSlot

    const strokeArm = (stroke: string, fill: string) => {
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.strokeRect(barLeft + 0.5, armY - armThick / 2 + 0.5, armLen - 1, armThick - 1)
      ctx.fillStyle = fill
      ctx.fillRect(barLeft, armY - armThick / 2, armLen, armThick)
      ctx.fillStyle = stroke
      ctx.beginPath()
      ctx.arc(tipX, tipY, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    if (wSlot === 0) {
      ctx.fillStyle = '#00e5ff'
      ctx.shadowColor = '#00e5ff'
      ctx.shadowBlur = 6
      ctx.fillRect(barLeft, armY - armThick / 2, armLen, armThick)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#00e5ff'
      ctx.beginPath()
      ctx.arc(tipX, tipY, 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (wSlot === 1) {
      strokeArm('#7c4dff', '#1a0a28')
      ctx.fillStyle = '#7c4dff'
      ctx.fillRect(barLeft + 3, armY - 1, 4, 2)
      ctx.fillRect(barLeft + 3, armY + 1, 4, 2)
    } else if (wSlot === 2) {
      strokeArm('#e040fb', '#2a0a2e')
    } else if (wSlot === 3) {
      strokeArm('#00b4d8', '#0a1428')
      for (let gi = 0; gi < 3; gi++) {
        ctx.strokeStyle = '#00b4d8'
        ctx.globalAlpha = 0.15 + gi * 0.1
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(cx + dir * 8, armY, 3 + gi * 2, -Math.PI / 2, Math.PI / 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (wSlot === 4) {
      strokeArm('#e2e8f0', '#1a1e28')
    } else if (wSlot === 5) {
      const charge = Math.min(1, this.chargeT / 0.8)
      strokeArm('#ff1744', '#280808')
      if (charge > 0) {
        ctx.fillStyle = '#ff1744'
        ctx.shadowColor = '#ff1744'
        ctx.shadowBlur = 6 + charge * 12
        ctx.globalAlpha = 0.5 + charge * 0.45
        ctx.beginPath()
        ctx.arc(tipX, tipY, 4 + charge * 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }
    } else if (wSlot === 6) {
      ctx.globalAlpha = 0.75
      ctx.fillStyle = 'rgba(200,180,255,0.55)'
      ctx.fillRect(barLeft, armY - 3, armLen, 6)
      ctx.globalAlpha = 0.35
      ctx.fillStyle = 'rgba(220,200,255,0.4)'
      ctx.fillRect(barLeft + 2, armY - 2, armLen - 4, 4)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#dcd0ff'
      ctx.beginPath()
      ctx.arc(tipX, tipY, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()

    if (this.muzzleFlashFrames > 0) {
      const flashColors = [
        '#00e5ff', '#7c4dff', '#e040fb', '#00b4d8', '#e2e8f0', '#ff1744',
        '#dcd0ff',
      ]
      const fc = flashColors[this.weaponSlot] ?? '#00e5ff'
      const alpha = this.muzzleFlashFrames / 4
      ctx.save()
      ctx.shadowColor = fc
      ctx.shadowBlur = 14
      ctx.fillStyle = fc
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.arc(tipX, tipY, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  getCenterX(): number  { return this.x + this.width / 2 }
  getVX(): number       { return this.vx }
  getFootX(): number    { return this.x + this.width / 2 }
  getFootY(): number    { return this.y + this.height }
}
