import { CONFIG } from '../constants/config'

/** Minimal shape for smooth follow (e.g. {@link Player}). */
export type CameraFollowTarget = {
  x: number
  y: number
  vx: number
}

export class Camera {
  x = 0
  y = 0

  private targetX = 0
  private targetY = 0
  private currentX = 0
  private currentY = 0

  private readonly SMOOTH = 6.0
  private readonly LOOK_AHEAD = 80
  private readonly VERTICAL_OFFSET = -60
  private readonly DEAD_ZONE_X = 40
  private readonly DEAD_ZONE_Y = 30

  /**
   * Snap scroll position and reset smooth-follow internals (intro rails, boss arena, etc.).
   */
  syncFromXY(scrollX: number, scrollY: number): void {
    this.x = scrollX
    this.y = scrollY
    this.targetX = scrollX
    this.currentX = scrollX
    this.targetY = scrollY
    this.currentY = scrollY
  }

  /** Legacy instant horizontal follow (centers on world X). */
  follow(centerX: number, worldWidth: number): void
  follow(
    player: CameraFollowTarget,
    dt: number,
    worldWidth: number,
    worldHeight: number,
  ): void
  follow(
    a: number | CameraFollowTarget,
    b: number,
    c?: number,
    d?: number,
  ): void {
    if (typeof a === 'number') {
      const centerX = a
      const worldWidth = b
      const halfW = CONFIG.CANVAS_WIDTH / 2
      const nx = Math.max(
        0,
        Math.min(centerX - halfW, worldWidth - CONFIG.CANVAS_WIDTH),
      )
      this.syncFromXY(nx, 0)
      return
    }

    const player = a
    const dt = b
    const worldWidth = c!
    const worldHeight = d!

    const vx = player.vx
    const lookAheadX =
      vx > 0 ? this.LOOK_AHEAD : vx < 0 ? -this.LOOK_AHEAD : 0

    const desiredX = player.x - CONFIG.CANVAS_WIDTH / 2 + lookAheadX
    const desiredY =
      player.y - CONFIG.CANVAS_HEIGHT / 2 + this.VERTICAL_OFFSET

    const dxFromTarget = desiredX - this.targetX
    const dyFromTarget = desiredY - this.targetY
    if (Math.abs(dxFromTarget) > this.DEAD_ZONE_X) {
      this.targetX += dxFromTarget - Math.sign(dxFromTarget) * this.DEAD_ZONE_X
    }
    if (Math.abs(dyFromTarget) > this.DEAD_ZONE_Y) {
      this.targetY += dyFromTarget - Math.sign(dyFromTarget) * this.DEAD_ZONE_Y
    }

    const lerpFactor = 1 - Math.exp(-this.SMOOTH * dt)
    this.currentX += (this.targetX - this.currentX) * lerpFactor
    this.currentY += (this.targetY - this.currentY) * lerpFactor

    this.x = Math.max(
      0,
      Math.min(this.currentX, worldWidth - CONFIG.CANVAS_WIDTH),
    )
    this.y = Math.max(
      0,
      Math.min(this.currentY, worldHeight - CONFIG.CANVAS_HEIGHT),
    )
  }
}
