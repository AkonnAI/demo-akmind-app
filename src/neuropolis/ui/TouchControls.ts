/**
 * DOM overlay touch buttons — dispatches synthetic KeyboardEvents so
 * InputManager (window keydown/keyup) picks them up unchanged.
 */

export interface TouchButton {
  key:   string
  label: string
  x:     number
  y:     number
  w:     number
  h:     number
  color: string
  shape: 'circle' | 'rect'
}

const NORMAL_LAYOUT: TouchButton[] = [
  { key: 'ArrowLeft',  label: '◀',      x: 4,  y: 72, w: 11, h: 16, color: '#00e5ff', shape: 'circle' },
  { key: 'ArrowRight', label: '▶',      x: 18, y: 72, w: 11, h: 16, color: '#00e5ff', shape: 'circle' },
  { key: 'Space',      label: '↑',      x: 82, y: 60, w: 11, h: 16, color: '#00ff88', shape: 'circle' },
  { key: 'KeyZ',       label: '⚡',     x: 72, y: 72, w: 11, h: 16, color: '#ff9100', shape: 'circle' },
  { key: 'KeyE',       label: '◈',      x: 86, y: 76, w: 10, h: 14, color: '#e040fb', shape: 'circle' },
  { key: 'KeyQ',       label: 'TARGET', x: 72, y: 56, w: 10, h: 8,  color: '#ff6b00', shape: 'rect' },
]

const HACK_LAYOUT: TouchButton[] = [
  { key: 'ArrowUp',    label: '▲',        x: 35, y: 76, w: 12, h: 17, color: '#00e5ff', shape: 'circle' },
  { key: 'ArrowDown',  label: '▼',        x: 52, y: 76, w: 12, h: 17, color: '#00e5ff', shape: 'circle' },
  { key: 'Space',      label: 'CONFIRM',  x: 68, y: 76, w: 14, h: 17, color: '#00ff88', shape: 'rect' },
  { key: 'KeyF',       label: '✕ CANCEL', x: 2,  y: 76, w: 14, h: 10, color: '#ff4444', shape: 'rect' },
]

export class TouchControls {
  private container: HTMLElement
  private normalEls: HTMLElement[] = []
  private hackEls:   HTMLElement[] = []
  private hackMode  = false
  private visible   = false

  private readonly onResize = (): void => {
    this.updateDisplay()
  }

  constructor(canvasContainer: HTMLElement) {
    // Do not assign `position: relative` here — it would override
    // `#admin-game-container { position: fixed }` on admin.html and
    // break fullscreen layout (blank play area).  `#game-container`
    // already sets `position: relative` in index.html.
    this.container = document.createElement('div')
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      z-index: 2;
      background: transparent;
    `
    canvasContainer.appendChild(this.container)

    for (const b of NORMAL_LAYOUT) this.normalEls.push(this.createButton(b))
    for (const b of HACK_LAYOUT)   this.hackEls.push(this.createButton(b))

    this.container.style.display = 'none'
    window.addEventListener('resize', this.onResize)
  }

  private createButton(def: TouchButton): HTMLElement {
    const el = document.createElement('button')
    el.type = 'button'
    el.setAttribute('aria-label', def.label)
    el.textContent = def.label
    const radius = def.shape === 'circle' ? '50%' : '8px'
    const baseBg = 'rgba(5, 3, 14, 0.75)'
    const applyBase = (): void => {
      el.style.background = baseBg
      el.style.boxShadow  = `0 0 12px ${def.color}44`
      el.style.transform  = 'scale(1)'
    }
    el.style.cssText = `
      position: absolute;
      left: ${def.x}%; top: ${def.y}%; width: ${def.w}%; height: ${def.h}%;
      font-family: Orbitron, monospace;
      font-size: clamp(10px, 2vw, 16px);
      background: ${baseBg};
      border: 2px solid ${def.color};
      color: ${def.color};
      border-radius: ${radius};
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: all;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      cursor: pointer;
      transition: background 0.1s, box-shadow 0.1s, transform 0.1s;
      box-shadow: 0 0 12px ${def.color}44;
      padding: 2px;
      line-height: 1.1;
      text-align: center;
    `
    if (def.shape === 'rect' && def.label.length > 3) {
      el.style.fontSize = 'clamp(7px, 1.4vw, 11px)'
    }

    const down = (e: PointerEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      el.style.background = `${def.color}4d`
      el.style.boxShadow  = `0 0 20px ${def.color}88`
      el.style.transform  = 'scale(0.94)'
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: def.key, bubbles: true, cancelable: true,
      }))
    }
    const up = (e: PointerEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      applyBase()
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: def.key, bubbles: true, cancelable: true,
      }))
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointerleave', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('contextmenu', (e) => e.preventDefault())

    el.style.display = 'none'
    this.container.appendChild(el)
    return el
  }

  private updateDisplay(): void {
    if (!this.visible) {
      this.container.style.display = 'none'
      return
    }
    const should =
      'ontouchstart' in window || window.innerWidth <= 1024
    this.container.style.display = should ? 'block' : 'none'
    if (should) this.refreshButtonVisibility()
  }

  private refreshButtonVisibility(): void {
    const showNorm = !this.hackMode
    for (const el of this.normalEls) el.style.display = showNorm ? 'flex' : 'none'
    for (const el of this.hackEls)   el.style.display = !showNorm ? 'flex' : 'none'
  }

  setHackMode(active: boolean): void {
    this.hackMode = active
    if (this.visible) this.refreshButtonVisibility()
  }

  show(): void {
    this.visible = true
    this.updateDisplay()
  }

  hide(): void {
    this.visible = false
    this.container.style.display = 'none'
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize)
    this.container.remove()
  }
}
