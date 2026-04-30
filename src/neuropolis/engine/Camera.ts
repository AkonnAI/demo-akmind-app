import { CONFIG } from '../constants/config'

export class Camera {
  x: number = 0
  y: number = 0

  follow(targetX: number, worldWidth: number): void {
    const halfW = CONFIG.CANVAS_WIDTH / 2
    this.x = Math.max(0, Math.min(
      targetX - halfW,
      worldWidth - CONFIG.CANVAS_WIDTH
    ))
  }
}
