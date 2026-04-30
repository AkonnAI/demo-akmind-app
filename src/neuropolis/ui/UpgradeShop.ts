import { CONFIG } from '../constants/config'
import type { InputManager } from '../engine/InputManager'

export interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  purchased: boolean
  icon: string
  category: 'weapon' | 'defense' | 'utility'
}

const DEFAULT_ITEMS = (): ShopItem[] => [
  {
    id: 'emp_gun',
    name: 'EMP BLASTER',
    description: 'Stuns enemies for 1.5s. Switch with X key.',
    cost: 300,
    category: 'weapon',
    icon: '⚡',
    purchased: false,
  },
  {
    id: 'health_refill',
    name: 'SYSTEM REPAIR',
    description: 'Restores 1 HP. Single use.',
    cost: 150,
    category: 'utility',
    icon: '💊',
    purchased: false,
  },
  {
    id: 'double_jump',
    name: 'BOOT JETS',
    description: 'Press JUMP again in mid-air.',
    cost: 400,
    category: 'utility',
    icon: '⚙',
    purchased: false,
  },
  {
    id: 'fast_shoot',
    name: 'RAPID FIRE',
    description: 'Reduces shot cooldown from 0.28s to 0.16s.',
    cost: 250,
    category: 'weapon',
    icon: '🔫',
    purchased: false,
  },
  {
    id: 'shield',
    name: 'NANO SHIELD',
    description: 'First hit per life is blocked. Shield resets on respawn.',
    cost: 350,
    category: 'defense',
    icon: '🛡',
    purchased: false,
  },
]

export class UpgradeShop {
  private visible = false
  private openTimer = 0
  private items: ShopItem[]
  private selectedIdx = 0
  private confirmMode = false
  private pendingIdx = 0
  private xpRef: () => number
  private spendXP: (n: number) => boolean
  private onPurchase: (id: string) => void
  private toast: (msg: string, duration?: number) => void

  constructor(
    xpRef: () => number,
    spendXP: (n: number) => boolean,
    onPurchase: (id: string) => void,
    toast?: (msg: string, duration?: number) => void,
  ) {
    this.xpRef = xpRef
    this.spendXP = spendXP
    this.onPurchase = onPurchase
    this.toast = toast ?? (() => {})
    this.items = DEFAULT_ITEMS()
  }

  open(): void {
    this.visible = true
    this.selectedIdx = 0
    this.confirmMode = false
    this.openTimer = 2.5
  }

  close(): void {
    this.visible = false
    this.confirmMode = false
  }

  isOpen(): boolean {
    return this.visible
  }

  updateShop(dt: number): void {
    if (this.openTimer > 0) this.openTimer = Math.max(0, this.openTimer - dt)
  }

  handleInput(input: InputManager): void {
    if (!this.visible) return
    if (this.confirmMode) {
      if (input.isJustPressed('KeyX') || input.isJustPressed('Escape')) {
        this.confirmMode = false
        return
      }
      if (input.isJustPressed('KeyZ')) {
        this.doPurchase(this.pendingIdx)
        this.confirmMode = false
      }
      return
    }
    if (input.isJustPressed('ArrowUp') || input.isJustPressed('KeyW')) {
      this.selectedIdx =
        (this.selectedIdx - 1 + this.items.length) % this.items.length
    }
    if (input.isJustPressed('ArrowDown') || input.isJustPressed('KeyS')) {
      this.selectedIdx = (this.selectedIdx + 1) % this.items.length
    }
    if (input.isJustPressed('KeyE') || input.isJustPressed('Space')) {
      this.pendingIdx = this.selectedIdx
      this.confirmMode = true
      return
    }
    if (input.isJustPressed('KeyF') || input.isJustPressed('Escape')) {
      this.close()
    }
  }

  private doPurchase(idx: number): void {
    const item = this.items[idx]
    if (!item) return
    if (item.id === 'health_refill') {
      if (this.spendXP(item.cost)) {
        this.onPurchase(item.id)
        this.toast('+UPGRADE UNLOCKED', 2)
      }
      return
    }
    if (item.purchased) return
    if (this.spendXP(item.cost)) {
      item.purchased = true
      this.onPurchase(item.id)
      this.toast('+UPGRADE UNLOCKED', 2)
    }
  }

  render(ctx: CanvasRenderingContext2D, _time: number): void {
    if (!this.visible) return

    const W = CONFIG.CANVAS_WIDTH
    const H = CONFIG.CANVAS_HEIGHT

    ctx.save()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'

    ctx.fillStyle = 'rgba(0,0,0,0.88)'
    ctx.fillRect(0, 0, W, H)

    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      ctx.fillRect(0, y, W, 1)
    }

    const PX = 280
    const PY = 130
    const PW = 720
    const PH = 440

    ctx.save()
    ctx.shadowColor = '#7c4dff'
    ctx.shadowBlur = 30
    ctx.strokeStyle = '#7c4dff'
    ctx.lineWidth = 2
    ctx.fillStyle = '#06040e'
    ctx.fillRect(PX, PY, PW, PH)
    ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1)
    ctx.shadowBlur = 0
    ctx.restore()

    const L = 18
    ctx.strokeStyle = '#7c4dff'
    ctx.lineWidth = 2.5
    const corners: [number, number, number, number][] = [
      [PX, PY, 1, 1],
      [PX + PW, PY, -1, 1],
      [PX, PY + PH, 1, -1],
      [PX + PW, PY + PH, -1, -1],
    ]
    for (const [cx, cy, dx, dy] of corners) {
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + dx * L, cy)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy + dy * L)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(124,77,255,0.15)'
    ctx.fillRect(PX, PY, PW, 44)
    ctx.strokeStyle = 'rgba(124,77,255,0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(PX, PY + 44)
    ctx.lineTo(PX + PW, PY + 44)
    ctx.stroke()

    ctx.font = "bold 8px 'Press Start 2P', monospace"
    ctx.fillStyle = '#7c4dff'
    ctx.textAlign = 'left'
    ctx.fillText('◈ AX UPGRADE TERMINAL', PX + 12, PY + 27)

    ctx.font = '8px Orbitron, monospace'
    ctx.fillStyle = '#00e5ff'
    ctx.textAlign = 'right'
    ctx.fillText(`XP: ${Math.floor(this.xpRef())}`, PX + PW - 12, PY + 27)
    ctx.textAlign = 'left'

    const itemH = 66
    const listY = PY + 54
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!
      const iy = listY + i * itemH
      const sel = i === this.selectedIdx
      const afford = this.xpRef() >= item.cost

      if (sel) {
        ctx.fillStyle = 'rgba(124,77,255,0.18)'
        ctx.fillRect(PX + 8, iy, PW - 16, itemH - 4)
        ctx.strokeStyle = '#7c4dff'
        ctx.lineWidth = 1
        ctx.strokeRect(PX + 8 + 0.5, iy + 0.5, PW - 17, itemH - 5)
      }

      ctx.font = '22px sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(item.icon, PX + 18, iy + 38)

      ctx.font = 'bold 10px Orbitron, monospace'
      ctx.fillStyle =
        item.purchased && item.id !== 'health_refill'
          ? '#334155'
          : sel
            ? '#ffffff'
            : '#94a3b8'
      ctx.fillText(item.name, PX + 52, iy + 22)

      ctx.font = '8px Orbitron, monospace'
      ctx.fillStyle = '#475569'
      ctx.fillText(item.description, PX + 52, iy + 38)

      ctx.textAlign = 'right'
      if (item.purchased && item.id !== 'health_refill') {
        ctx.font = "bold 8px 'Press Start 2P', monospace"
        ctx.fillStyle = '#00ff88'
        ctx.fillText('✓ INSTALLED', PX + PW - 16, iy + 30)
      } else {
        ctx.font = 'bold 9px Orbitron, monospace'
        ctx.fillStyle = afford ? '#ffcc00' : '#4a3000'
        ctx.fillText(`${item.cost} XP`, PX + PW - 16, iy + 30)
      }
      ctx.textAlign = 'left'

      const catColor =
        item.category === 'weapon'
          ? '#ff9100'
          : item.category === 'defense'
            ? '#00e5ff'
            : '#00ff88'
      ctx.fillStyle = catColor + '33'
      ctx.strokeStyle = catColor
      ctx.lineWidth = 0.8
      ctx.fillRect(PX + 52, iy + 44, 52, 12)
      ctx.strokeRect(PX + 52, iy + 44, 52, 12)
      ctx.font = '5px Orbitron, monospace'
      ctx.fillStyle = catColor
      ctx.fillText(item.category.toUpperCase(), PX + 56, iy + 53)
    }

    ctx.fillStyle = 'rgba(124,77,255,0.1)'
    ctx.fillRect(PX, PY + PH - 32, PW, 32)
    ctx.font = '7px Orbitron, monospace'
    ctx.fillStyle = '#475569'
    ctx.textAlign = 'center'
    ctx.fillText(
      this.confirmMode
        ? ''
        : '↑↓ SELECT   E / SPACE CONFIRM   F / ESC CLOSE',
      PX + PW / 2,
      PY + PH - 12,
    )
    ctx.textAlign = 'left'

    if (this.openTimer > 0) {
      ctx.save()
      const greetAlpha =
        Math.min(1, this.openTimer / 0.4) * Math.min(1, this.openTimer * 0.8)
      ctx.font = "bold 10px 'Press Start 2P', monospace"
      ctx.fillStyle = `rgba(124,77,255,${greetAlpha})`
      ctx.shadowColor = '#7c4dff'
      ctx.shadowBlur = 12
      ctx.textAlign = 'center'
      const greeting =
        this.openTimer > 2.0
          ? 'WELCOME, HACKER.'
          : this.openTimer > 1.0
            ? 'WHAT CAN I DO FOR YOU?'
            : 'CHOOSE WISELY.'
      ctx.fillText(greeting, CONFIG.CANVAS_WIDTH / 2, 112)
      ctx.shadowBlur = 0
      ctx.textAlign = 'left'
      ctx.restore()
    }

    if (this.confirmMode) {
      const item = this.items[this.pendingIdx]
      ctx.fillStyle = 'rgba(0,0,0,0.7)'
      ctx.fillRect(0, 0, W, H)
      const bx = W / 2 - 160
      const by = H / 2 - 70
      ctx.fillStyle = '#0a0614'
      ctx.strokeStyle = '#ffcc00'
      ctx.lineWidth = 2
      ctx.fillRect(bx, by, 320, 140)
      ctx.strokeRect(bx + 0.5, by + 0.5, 319, 139)
      ctx.textAlign = 'center'
      ctx.font = "bold 12px Orbitron, monospace"
      ctx.fillStyle = '#ffcc00'
      ctx.fillText('CONFIRM PURCHASE?', W / 2, by + 28)
      if (item) {
        ctx.font = '11px Orbitron, monospace'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(item.name, W / 2, by + 52)
        ctx.fillStyle = '#ffcc00'
        ctx.fillText(`${item.cost} XP`, W / 2, by + 72)
      }
      ctx.fillStyle = '#ffffff'
      ctx.font = '10px Orbitron, monospace'
      ctx.fillText(`YOUR XP: ${Math.floor(this.xpRef())}`, W / 2, by + 92)
      ctx.font = '11px Orbitron, monospace'
      ctx.fillStyle = '#00ff88'
      ctx.fillText('[Z] CONFIRM', W / 2 - 70, by + 118)
      ctx.fillStyle = '#ff4444'
      ctx.fillText('[X / ESC] CANCEL', W / 2 + 70, by + 118)
      ctx.font = '9px Orbitron, monospace'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('Z to buy · X or ESC to cancel', W / 2, by + 132)
      ctx.textAlign = 'left'
    }

    ctx.restore()
  }
}
