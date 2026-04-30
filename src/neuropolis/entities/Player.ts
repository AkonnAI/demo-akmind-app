import { CONFIG } from '../constants/config'
import { InputManager } from '../engine/InputManager'

type AnimState = 'idle' | 'run' | 'jump' | 'fall'

export class Player {
  x: number
  y: number

  vx: number = 0
  vy: number = 0
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
      ctx.fillStyle = '#1E293B'
      ctx.fillRect(this.x - cameraX, this.y, this.width, this.height)
      ctx.fillStyle = '#00ffff'
      ctx.fillRect(this.x - cameraX, this.y + 10, this.width, 8)
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
    const ssx   = Math.floor(this.x - cameraX)
    const ssy   = Math.floor(this.y)
    const fr    = this.isFacingRight
    const handY = ssy + Math.floor(this.height * 0.52)

    ctx.save()
    ctx.imageSmoothingEnabled = false

    if (!fr) {
      ctx.translate(ssx, 0)
      ctx.scale(-1, 1)
      ctx.translate(-ssx - this.width, 0)
    }
    const gunX = ssx + (fr ? this.width - 4 : 4)
    const wSlot = this.weaponSlot

    if (wSlot === 0) {
      ctx.fillStyle = '#1e2a3a'
      ctx.fillRect(gunX - 2, handY - 3, 16, 6)
      ctx.fillStyle = '#2a3a4a'
      ctx.fillRect(gunX - 2, handY - 3, 16, 1)
      ctx.fillStyle = '#0f1a24'
      ctx.fillRect(gunX + 13, handY - 1, 7, 3)
      ctx.fillStyle = '#00e5ff'
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 5
      ctx.fillRect(gunX + 19, handY - 1, 2, 3)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#00e5ff'; ctx.globalAlpha = 0.6
      ctx.fillRect(gunX + 2, handY - 2, 3, 4)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#0f1a24'
      ctx.fillRect(gunX + 4, handY + 3, 3, 4)

    } else if (wSlot === 1) {
      ctx.fillStyle = '#1a0a28'
      ctx.fillRect(gunX - 2, handY - 4, 20, 8)
      ctx.fillStyle = '#280f3a'
      ctx.fillRect(gunX - 2, handY - 4, 20, 1)
      ctx.fillStyle = '#0f0618'
      ctx.fillRect(gunX + 17, handY - 2, 9, 4)
      ctx.fillStyle = '#7c4dff'
      ctx.shadowColor = '#7c4dff'; ctx.shadowBlur = 7
      ctx.fillRect(gunX + 2, handY - 2, 3, 3)
      ctx.fillRect(gunX + 2, handY + 2, 3, 3)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#7c4dff'
      ctx.shadowColor = '#7c4dff'; ctx.shadowBlur = 8
      ctx.fillRect(gunX + 25, handY - 2, 2, 4)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#120820'
      ctx.fillRect(gunX + 6, handY + 4, 4, 5)

    } else if (wSlot === 2) {
      ctx.fillStyle = '#2a0a2e'
      ctx.fillRect(gunX - 2, handY - 4, 18, 8)
      ctx.fillStyle = '#3a1040'
      ctx.fillRect(gunX - 2, handY - 4, 18, 1)
      ctx.save()
      ctx.translate(gunX + 18, handY)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#e040fb'
      ctx.shadowColor = '#e040fb'; ctx.shadowBlur = 8
      ctx.fillRect(-4, -4, 8, 8)
      ctx.shadowBlur = 0
      ctx.restore()
      ctx.strokeStyle = '#e040fb'; ctx.globalAlpha = 0.4; ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(gunX + 2, handY - 3); ctx.lineTo(gunX + 14, handY + 3)
      ctx.moveTo(gunX + 2, handY + 3); ctx.lineTo(gunX + 14, handY - 3)
      ctx.stroke()
      ctx.globalAlpha = 1

    } else if (wSlot === 3) {
      ctx.fillStyle = '#0a1428'
      ctx.fillRect(gunX - 2, handY - 5, 22, 10)
      ctx.fillStyle = '#14203a'
      ctx.fillRect(gunX - 2, handY - 5, 22, 1)
      ctx.fillStyle = '#060e1a'
      ctx.fillRect(gunX + 19, handY - 3, 10, 6)
      for (let gi = 0; gi < 3; gi++) {
        ctx.strokeStyle = '#00b4d8'; ctx.globalAlpha = 0.15 + gi * 0.1; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(gunX + 8, handY, 3 + gi * 2, -Math.PI / 2, Math.PI / 2); ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (wSlot === 4) {
      ctx.fillStyle = '#1a1e28'
      ctx.fillRect(gunX - 2, handY - 4, 18, 8)
      ctx.save()
      ctx.translate(gunX + 16, handY)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = '#e2e8f0'
      ctx.shadowColor = '#e2e8f0'; ctx.shadowBlur = 6
      ctx.fillRect(-3, -3, 6, 6)
      ctx.shadowBlur = 0
      ctx.restore()
    } else if (wSlot === 5) {
      const charge = Math.min(1, this.chargeT / 0.8)
      ctx.fillStyle = '#280808'
      ctx.fillRect(gunX - 2, handY - 5, 24, 10)
      ctx.fillStyle = '#3a1010'
      ctx.fillRect(gunX - 2, handY - 5, 24, 1)
      ctx.fillStyle = '#1a0404'
      ctx.fillRect(gunX + 18, handY - 3, 12, 6)
      if (charge > 0) {
        const r = 6 + charge * 10
        ctx.fillStyle = '#ff1744'
        ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 6 + charge * 12
        ctx.globalAlpha = 0.5 + charge * 0.45
        ctx.beginPath(); ctx.arc(gunX + 26, handY, r, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0; ctx.globalAlpha = 1
      }
    } else if (wSlot === 6) {
      ctx.globalAlpha = 0.75
      ctx.fillStyle = 'rgba(200,180,255,0.55)'
      ctx.beginPath()
      ctx.ellipse(gunX + 10, handY, 12, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.35
      ctx.fillStyle = 'rgba(220,200,255,0.4)'
      ctx.beginPath()
      ctx.ellipse(gunX + 4, handY, 10, 4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.ellipse(gunX - 2, handY, 8, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    ctx.restore()

    // Muzzle flash
    if (this.muzzleFlashFrames > 0) {
      const flashColors = [
        '#00e5ff', '#7c4dff', '#e040fb', '#00b4d8', '#e2e8f0', '#ff1744',
        '#dcd0ff',
      ]
      const fc    = flashColors[this.weaponSlot] ?? '#00e5ff'
      const alpha = this.muzzleFlashFrames / 4
      const tipSX = fr ? ssx + this.width + 20 : ssx - 20
      ctx.save()
      ctx.translate(tipSX, handY)
      ctx.shadowColor = fc; ctx.shadowBlur = 14
      ctx.fillStyle   = fc; ctx.globalAlpha = alpha
      for (let fi = 0; fi < 4; fi++) {
        ctx.save(); ctx.rotate(fi * Math.PI / 2)
        ctx.fillRect(-1.5, -9, 3, 7); ctx.restore()
      }
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
      ctx.restore()
    }
  }

  getCenterX(): number  { return this.x + this.width / 2 }
  getVX(): number       { return this.vx }
  getFootX(): number    { return this.x + this.width / 2 }
  getFootY(): number    { return this.y + this.height }
}
