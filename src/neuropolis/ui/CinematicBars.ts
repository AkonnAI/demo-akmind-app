import { CONFIG } from '../constants/config'

/** Letterbox bars disabled — they hid gameplay/sprites behind opaque strips + dialogue overlap. */
export class CinematicBars {
  private barHeight = 0
  private targetHeight = 0
  private animating = false
  private done = false

  open(): void {
    this.animating = false
    this.done = true
    this.barHeight = 0
  }

  update(_dt: number): void {
    void _dt
    if (!this.animating && !this.done) this.done = true
  }

  isReady(): boolean { return this.done }

  render(_ctx: CanvasRenderingContext2D): void {
    void _ctx
  }
}
