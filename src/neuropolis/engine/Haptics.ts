export type HapticEvent =
  | 'enemyDestroyed'
  | 'puzzleSolved'
  | 'gateOpen'
  | 'bossPhase'
  | 'playerDamage'
  | 'pickup'

export class Haptics {
  private static enabled = true

  static setEnabled(on: boolean): void { this.enabled = on }

  static fire(event: HapticEvent): void {
    if (!this.enabled) return
    if (typeof navigator === 'undefined' || !navigator.vibrate) return
    switch (event) {
      case 'enemyDestroyed': navigator.vibrate(30); break
      case 'pickup':         navigator.vibrate(20); break
      case 'playerDamage':   navigator.vibrate(80); break
      case 'puzzleSolved':   navigator.vibrate([50, 50, 80]); break
      case 'gateOpen':       navigator.vibrate([40, 40, 60]); break
      case 'bossPhase':      navigator.vibrate([100, 50, 100, 50, 150]); break
    }
  }
}
