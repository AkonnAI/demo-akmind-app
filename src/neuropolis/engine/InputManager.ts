// Keys we care about in Neuropolis
type GameKey =
  | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
  | 'Space' | 'KeyZ' | 'KeyE' | 'KeyF' | 'KeyQ' | 'KeyX' | 'KeyW' | 'KeyS' | 'KeyA' | 'KeyD'
  | 'Escape'

export class InputManager {
  private held        = new Set<GameKey>()
  private justPressed = new Set<GameKey>()
  private justReleased = new Set<GameKey>()

  private validKeys: GameKey[] = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'KeyZ', 'KeyE', 'KeyF', 'KeyQ', 'KeyX', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'Escape',
  ]

  private readonly boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e)
  private readonly boundKeyUp = (e: KeyboardEvent) => this.onKeyUp(e)

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

  update(): void {
    this.justPressed.clear()
    this.justReleased.clear()
  }
}
