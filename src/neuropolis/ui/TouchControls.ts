/**
 * DOM overlay touch controls — virtual joystick (left zone) + 4 action
 * buttons (right zone). All elements use position:fixed and are sized /
 * positioned against the canvas's actual getBoundingClientRect() so they
 * stay within the letterboxed canvas area on any phone.
 */

import type { InputManager } from '../engine/InputManager'
import type { GameKey }      from '../engine/InputManager'
import { DeviceManager }     from '../engine/DeviceManager'

// ── Button spec ──────────────────────────────────────────────────
interface BtnSpec {
  label:      string
  color:      string
  /** % of canvas width from the canvas's RIGHT edge */
  rightPct:   number
  /** % of canvas height from the canvas's BOTTOM edge */
  bottomPct:  number
  /** Base px size — clamped to canvas height fraction at runtime */
  basePx:     number
  /** canvas-height fraction cap (e.g. 0.12 → never taller than 12% of canvas) */
  heightFrac: number
  key:        GameKey
}

/**
 * Must sit above fullscreen game wrappers (e.g. admin #admin-game-container z-index 900)
 * but below fixed chrome like the ← ADMIN back button (1000).
 */
const TOUCH_UI_Z = 960

const NORMAL_BTNS: BtnSpec[] = [
  { label: '↑', color: '#ffcc00', rightPct:  7, bottomPct: 20, basePx: 52, heightFrac: 0.13, key: 'ArrowUp' },
  { label: 'Z', color: '#00e5ff', rightPct: 22, bottomPct: 12, basePx: 46, heightFrac: 0.12, key: 'KeyZ'    },
  { label: 'X', color: '#e040fb', rightPct: 35, bottomPct:  7, basePx: 40, heightFrac: 0.10, key: 'KeyX'    },
  { label: 'E', color: '#00ff88', rightPct:  7, bottomPct: 40, basePx: 40, heightFrac: 0.10, key: 'KeyE'    },
]

const HACK_BTNS: BtnSpec[] = [
  { label: 'OK', color: '#00ff88', rightPct: 22, bottomPct: 12, basePx: 50, heightFrac: 0.13, key: 'Space' },
  { label: '✕',  color: '#ff4444', rightPct:  7, bottomPct: 12, basePx: 42, heightFrac: 0.11, key: 'KeyF'  },
]

function hex2rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function btnSize(spec: BtnSpec, canvasH: number): number {
  return Math.min(spec.basePx, canvasH * spec.heightFrac)
}

export type TouchControlsOptions = {
  /**
   * When true, show joystick/buttons whenever `show()` is active — ignores
   * DeviceManager (fixes Chrome DevTools emulation + embedded demo).
   */
  bypassDeviceGate?: boolean
}

export class TouchControls {
  private container:  HTMLElement
  private activZone:  HTMLElement   // joystick capture zone (position:fixed)
  private joyBase:    HTMLElement
  private joyKnob:    HTMLElement
  private normalBtns: { el: HTMLElement; spec: BtnSpec }[] = []
  private hackBtns:   { el: HTMLElement; spec: BtnSpec }[] = []

  private hackMode = false
  private visible  = false

  // Joystick state
  private joyActive    = false
  private joyPointerId = -1
  private joyClientX   = 0
  private joyClientY   = 0
  private maxRadius    = 28            // updated on reposition
  private heldLeft     = false
  private heldRight    = false
  private heldUp       = false
  private heldDown     = false

  // key held per pointer-id (action buttons multi-touch)
  private btnHeld = new Map<number, GameKey>()

  private input: InputManager | null
  private readonly bypassDeviceGate: boolean

  private readonly onResize = (): void => {
    requestAnimationFrame(() => {
      this.updateDisplay()
      requestAnimationFrame(() => this.updateDisplay())
    })
  }

  constructor(
    canvasContainer: HTMLElement,
    input?: InputManager,
    opts?: TouchControlsOptions,
  ) {
    this.input = input ?? null
    this.bypassDeviceGate = opts?.bypassDeviceGate === true

    // Mount into #touch-layer when present; fall back to canvasContainer
    const touchLayer = document.getElementById('touch-layer')
    const mountPoint = touchLayer ?? canvasContainer

    // Container is just a DOM anchor — the interactive children use position:fixed
    this.container = document.createElement('div')
    this.container.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;'
    mountPoint.appendChild(this.container)

    // Joystick elements
    this.activZone = this.makeActivZone()
    this.joyBase   = this.makeJoyBase()
    this.joyKnob   = this.makeJoyKnob()
    this.joyBase.appendChild(this.joyKnob)
    document.body.appendChild(this.activZone)   // fixed → goes on body
    document.body.appendChild(this.joyBase)

    // Action buttons
    for (const spec of NORMAL_BTNS) {
      const el = this.makeButton(spec)
      document.body.appendChild(el)
      this.normalBtns.push({ el, spec })
    }
    for (const spec of HACK_BTNS) {
      const el = this.makeButton(spec)
      document.body.appendChild(el)
      this.hackBtns.push({ el, spec })
    }

    this.container.style.display = 'none'
    window.addEventListener('resize', this.onResize)
    window.addEventListener('orientationchange', this.onResize)

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll()
    })
  }

  // ── Layout helpers ────────────────────────────────────────────

  /** Return the canvas rect; fall back to a full-viewport rect if missing. */
  private canvasRect(): DOMRect {
    const c = document.querySelector('canvas') as HTMLCanvasElement | null
    return c?.getBoundingClientRect() ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }

  /**
   * Reposition all fixed elements relative to the canvas rect.
   * Called every time display state changes or viewport resizes.
   */
  private repositionAll(): void {
    const r  = this.canvasRect()
    const vh = r.height

    // Joystick activation zone: left 40% × bottom 60% of canvas
    const zoneH = vh * 0.60
    Object.assign(this.activZone.style, {
      left:   `${r.left}px`,
      top:    `${r.top + vh * 0.40}px`,
      width:  `${r.width * 0.40}px`,
      height: `${zoneH}px`,
    })

    // Joystick base / knob sizes (scaled to canvas height)
    const baseD = Math.min(72, vh * 0.18)
    const knobD = Math.min(32, vh * 0.082)
    this.maxRadius = baseD * 0.42

    this.joyBase.style.width  = `${baseD}px`
    this.joyBase.style.height = `${baseD}px`
    this.joyKnob.style.width  = `${knobD}px`
    this.joyKnob.style.height = `${knobD}px`

    // Action buttons
    const allBtns = [...this.normalBtns, ...this.hackBtns]
    for (const { el, spec } of allBtns) {
      const sz = btnSize(spec, vh)
      const left = r.right - r.width * (spec.rightPct / 100) - sz
      const top  = r.bottom - r.height * (spec.bottomPct / 100) - sz
      Object.assign(el.style, {
        left:   `${left}px`,
        top:    `${top}px`,
        width:  `${sz}px`,
        height: `${sz}px`,
        fontSize: `${Math.round(sz * 0.38)}px`,
      })
    }
  }

  // ── Element factories ─────────────────────────────────────────

  private makeActivZone(): HTMLElement {
    const el = document.createElement('div')
    el.style.cssText = `position:fixed;z-index:${TOUCH_UI_Z};pointer-events:auto;touch-action:none;`
    el.addEventListener('pointerdown',   (e) => this.onJoyStart(e))
    el.addEventListener('pointermove',   (e) => this.onJoyMove(e))
    el.addEventListener('pointerup',     (e) => this.onJoyEnd(e))
    el.addEventListener('pointercancel', (e) => this.onJoyEnd(e))
    el.addEventListener('contextmenu',   (e) => e.preventDefault())
    return el
  }

  private makeJoyBase(): HTMLElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: fixed;
      z-index: ${TOUCH_UI_Z + 1};
      border-radius: 50%;
      background: rgba(0,229,255,0.10);
      border: 1.5px solid rgba(0,229,255,0.45);
      display: none;
      pointer-events: none;
      touch-action: none;
      transform: translate(-50%, -50%);
    `
    return el
  }

  private makeJoyKnob(): HTMLElement {
    const el = document.createElement('div')
    el.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(0,229,255,0.32);
      border: 1px solid #00e5ff;
      box-shadow: 0 0 8px rgba(0,229,255,0.55);
      pointer-events: none;
      touch-action: none;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      transition: transform 60ms;
    `
    return el
  }

  private makeButton(s: BtnSpec): HTMLElement {
    const rgb  = hex2rgb(s.color)
    const el   = document.createElement('button')
    const base = (): void => {
      el.style.background = 'rgba(10,14,28,0.72)'
      el.style.boxShadow  = `0 0 10px rgba(0,0,0,0.5), inset 0 0 6px rgba(${rgb},0.18)`
      el.style.transform  = 'scale(1)'
    }
    el.type = 'button'
    el.setAttribute('aria-label', s.label)
    el.textContent = s.label
    el.style.cssText = `
      position: fixed;
      z-index: ${TOUCH_UI_Z};
      font-family: Orbitron, monospace;
      font-weight: bold;
      background: rgba(10,14,28,0.72);
      border: 1.5px solid ${s.color};
      color: ${s.color};
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      cursor: pointer;
      transition: background 70ms, box-shadow 70ms, transform 70ms;
      box-shadow: 0 0 10px rgba(0,0,0,0.5), inset 0 0 6px rgba(${rgb},0.18);
      backdrop-filter: blur(4px);
    `

    el.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation()
      el.setPointerCapture(e.pointerId)
      el.style.background = `rgba(${rgb},0.32)`
      el.style.boxShadow  = `0 0 18px ${s.color}`
      el.style.transform  = 'scale(0.90)'
      this.btnHeld.set(e.pointerId, s.key)
      this.keyDown(s.key)
    })
    const up = (e: PointerEvent): void => {
      e.preventDefault(); e.stopPropagation()
      const held = this.btnHeld.get(e.pointerId)
      if (held) { this.keyUp(held); this.btnHeld.delete(e.pointerId) }
      base()
    }
    el.addEventListener('pointerup',     up)
    el.addEventListener('pointerleave',  up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('contextmenu',   (e) => e.preventDefault())

    el.style.display = 'none'
    return el
  }

  // ── Joystick events ───────────────────────────────────────────

  private onJoyStart(e: PointerEvent): void {
    if (this.joyActive) return
    this.joyActive    = true
    this.joyPointerId = e.pointerId
    this.joyClientX   = e.clientX
    this.joyClientY   = e.clientY
    this.activZone.setPointerCapture(e.pointerId)
    this.joyBase.style.left    = `${e.clientX}px`
    this.joyBase.style.top     = `${e.clientY}px`
    this.joyBase.style.display = 'block'
  }

  private onJoyMove(e: PointerEvent): void {
    if (!this.joyActive || e.pointerId !== this.joyPointerId) return
    const dx   = e.clientX - this.joyClientX
    const dy   = e.clientY - this.joyClientY
    const dist = Math.hypot(dx, dy)
    const clamp = Math.min(dist, this.maxRadius)
    const angle  = dist === 0 ? 0 : Math.atan2(dy, dx)
    const ox = dist === 0 ? 0 : Math.cos(angle) * clamp
    const oy = dist === 0 ? 0 : Math.sin(angle) * clamp
    this.joyKnob.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`

    const mag = dist / this.maxRadius
    const active = mag >= 0.20

    if (!this.hackMode) {
      const wL = active && dx < -this.maxRadius * 0.50
      const wR = active && dx >  this.maxRadius * 0.50
      this.setJoyKey('ArrowLeft',  wL, this.heldLeft);  this.heldLeft  = wL
      this.setJoyKey('ArrowRight', wR, this.heldRight); this.heldRight = wR
    } else {
      const wU = active && dy < -this.maxRadius * 0.50
      const wD = active && dy >  this.maxRadius * 0.50
      this.setJoyKey('ArrowUp',   wU, this.heldUp);   this.heldUp   = wU
      this.setJoyKey('ArrowDown', wD, this.heldDown); this.heldDown = wD
    }
  }

  private onJoyEnd(e: PointerEvent): void {
    if (e.pointerId !== this.joyPointerId) return
    this.joyActive = false
    this.joyBase.style.display  = 'none'
    this.joyKnob.style.transform = 'translate(-50%, -50%)'
    this.releaseJoyKeys()
  }

  private setJoyKey(key: GameKey, want: boolean, was: boolean): void {
    if (want && !was) this.keyDown(key)
    if (!want && was) this.keyUp(key)
  }

  private releaseJoyKeys(): void {
    if (this.heldLeft)  this.keyUp('ArrowLeft')
    if (this.heldRight) this.keyUp('ArrowRight')
    if (this.heldUp)    this.keyUp('ArrowUp')
    if (this.heldDown)  this.keyUp('ArrowDown')
    this.heldLeft = this.heldRight = this.heldUp = this.heldDown = false
  }

  // ── InputManager bridge ───────────────────────────────────────

  private keyDown(key: GameKey): void {
    if (this.input) { this.input.simulateKeyDown(key) }
    else { window.dispatchEvent(new KeyboardEvent('keydown', { code: key, bubbles: true, cancelable: true })) }
  }

  private keyUp(key: GameKey): void {
    if (this.input) { this.input.simulateKeyUp(key) }
    else { window.dispatchEvent(new KeyboardEvent('keyup', { code: key, bubbles: true, cancelable: true })) }
  }

  private releaseAll(): void {
    this.releaseJoyKeys()
    for (const [pid, key] of this.btnHeld) { this.keyUp(key); this.btnHeld.delete(pid) }
  }

  // ── Visibility / display ──────────────────────────────────────

  private shouldShowOverlay(): boolean {
    if (this.bypassDeviceGate) return true
    return DeviceManager.shouldShowTouchOverlay()
  }

  /** Wire after InputManager exists (e.g. admin entry created controls early). */
  setInput(input: InputManager): void {
    this.input = input
  }

  private updateDisplay(): void {
    const show = this.visible && this.shouldShowOverlay()
    this.container.style.display = show ? 'block' : 'none'

    const joyVisible = show
    this.activZone.style.display = joyVisible ? 'block' : 'none'
    // joyBase is shown dynamically on touch; just hide it when invisible
    if (!joyVisible) {
      this.joyBase.style.display = 'none'
      this.releaseAll()
    }

    if (show) {
      this.repositionAll()
      this.refreshButtonVisibility()
    } else {
      for (const { el } of [...this.normalBtns, ...this.hackBtns]) el.style.display = 'none'
    }
  }

  private refreshButtonVisibility(): void {
    const showN = !this.hackMode
    for (const { el } of this.normalBtns) el.style.display = showN ? 'flex' : 'none'
    for (const { el } of this.hackBtns)   el.style.display = showN ? 'none' : 'flex'
  }

  // ── Public API ────────────────────────────────────────────────

  setHackMode(active: boolean): void {
    this.hackMode = active
    if (this.visible) this.refreshButtonVisibility()
    if (!active) {
      if (this.heldUp)   this.keyUp('ArrowUp')
      if (this.heldDown) this.keyUp('ArrowDown')
      this.heldUp = this.heldDown = false
    }
  }

  show(): void {
    this.visible = true
    const refresh = (): void => this.updateDisplay()
    refresh()
    requestAnimationFrame(() => {
      refresh()
      requestAnimationFrame(refresh)
    })
  }

  hide(): void {
    this.visible = false
    this.releaseAll()
    this.updateDisplay()
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('orientationchange', this.onResize)
    this.releaseAll()
    this.activZone.remove()
    this.joyBase.remove()
    for (const { el } of [...this.normalBtns, ...this.hackBtns]) el.remove()
    this.container.remove()
  }
}
