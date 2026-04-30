export const CONFIG = {
  // Internal resolution — game always renders at this size
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Physics
  GRAVITY: 1600,         // pixels per second squared
  PLAYER_SPEED: 200,     // pixels per second horizontal
  JUMP_FORCE: -680,      // pixels per second vertical (negative = up)

  // World
  TILE_SIZE: 32,

  // Colors
  COLOR_BG: '#0a0a1a',
  COLOR_CYAN: '#00ffff',
  COLOR_WHITE: '#ffffff',
  COLOR_DIM: '#444466',
  COLOR_FPS: '#666688',

  // Sprite sources — all 3 animation sheets
  AX_SPRITE_IDLE: '/sprites/AX.png',
  AX_SPRITE_RUN:  '/sprites/AX_Run.png',
  AX_SPRITE_JUMP: '/sprites/AX_Jump.png',

  // Frame counts per sheet
  AX_FRAMES_IDLE: 5,
  AX_FRAMES_RUN:  4,
  AX_FRAMES_JUMP: 3,

  // Frame width/height same for all sheets
  AX_FRAME_WIDTH:  48,
  AX_FRAME_HEIGHT: 48,
  AX_DISPLAY_SCALE: 1.8,   // visual scale only; collision box unchanged

  // Animation speeds (seconds per frame)
  AX_SPD_IDLE: 0.166,   // 6 fps
  AX_SPD_RUN:  0.083,   // 12 fps
  AX_SPD_JUMP: 0.100,   // 10 fps
} as const
