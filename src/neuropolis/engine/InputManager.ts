// Keys we care about in Neuropolis
export type GameKey =
  | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
  | 'Space' | 'KeyZ' | 'KeyE' | 'KeyF' | 'KeyQ' | 'KeyX' | 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD'
  | 'Escape'

export class InputManager {
  private held        = new Set<GameKey>()
  private justPressed = new Set<GameKey>()
  private justReleased = new Set<GameKey>()

  private readonly boundKeyDown = (e: KeyboardEvent): void => {
    this.onKeyDown(e)
  }
  private readonly boundKeyUp = (e: KeyboardEvent): void => {
    this.onKeyUp(e)
  }

  private validKeys: GameKey[] = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'KeyZ', 'KeyE', 'KeyF', 'KeyQ', 'KeyX', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Escape',
  ]

  constructor() {
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.held.clear()
    this.justPressed.clear()
    this.justReleased.clear()
  }

  private isGameKey(code: string): code is GameKey {
    return this.validKeys.includes(code as GameKey)
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.isGameKey(e.code)) return
    e.preventDefault()
    if (!this.held.has(e.code)) this.justPressed.add(e.code)
    this.held.add(e.code)
    this.justReleased.delete(e.code)
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.isGameKey(e.code)) return
    this.held.delete(e.code)
    this.justReleased.add(e.code)
  }

  isDown(key: GameKey): boolean {
    if (key === 'ArrowLeft')  return this.held.has('ArrowLeft')  || this.held.has('KeyA')
    if (key === 'ArrowRight') return this.held.has('ArrowRight') || this.held.has('KeyD')
    if (key === 'ArrowUp')    return this.held.has('ArrowUp')    || this.held.has('KeyW')
    if (key === 'ArrowDown')  return this.held.has('ArrowDown')  || this.held.has('KeyS')
    return this.held.has(key)
  }
  isHeld(key: GameKey): boolean { return this.isDown(key) }
  isJustPressed(key: GameKey): boolean {
    if (key === 'ArrowLeft')  return this.justPressed.has('ArrowLeft')  || this.justPressed.has('KeyA')
    if (key === 'ArrowRight') return this.justPressed.has('ArrowRight') || this.justPressed.has('KeyD')
    if (key === 'ArrowUp')    return this.justPressed.has('ArrowUp')    || this.justPressed.has('KeyW')
    if (key === 'ArrowDown')  return this.justPressed.has('ArrowDown')  || this.justPressed.has('KeyS')
    return this.justPressed.has(key)
  }
  isJustReleased(key: GameKey): boolean  { return this.justReleased.has(key) }

  simulateKeyDown(code: GameKey): void {
    if (!this.held.has(code)) this.justPressed.add(code)
    this.held.add(code)
  }

  simulateKeyUp(code: GameKey): void {
    this.held.delete(code)
  }

  /** Remove a key from this frame's just-pressed set (and alias keys for arrows). */
  consumeJustPressed(key: GameKey): void {
    switch (key) {
      case 'ArrowLeft':
        this.justPressed.delete('ArrowLeft')
        this.justPressed.delete('KeyA')
        break
      case 'ArrowRight':
        this.justPressed.delete('ArrowRight')
        this.justPressed.delete('KeyD')
        break
      case 'ArrowUp':
        this.justPressed.delete('ArrowUp')
        this.justPressed.delete('KeyW')
        break
      case 'ArrowDown':
        this.justPressed.delete('ArrowDown')
        this.justPressed.delete('KeyS')
        break
      default:
        this.justPressed.delete(key)
    }
  }

  update(): void {
    this.justPressed.clear()
    this.justReleased.clear()
  }
}
