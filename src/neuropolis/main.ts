import { DeviceManager }   from './engine/DeviceManager'
import { Canvas }          from './engine/Canvas'
import { GameLoop }        from './engine/GameLoop'
import { InputManager }    from './engine/InputManager'
import { BootScene }       from './scenes/BootScene'
import { CinematicScene }  from './scenes/CinematicScene'
import { GameScene }       from './scenes/GameScene'
import { GameScene2 }      from './scenes/GameScene2'
import { GameScene3 }      from './scenes/GameScene3'
import { GameScene4 }      from './scenes/GameScene4'
import { GameScene5 }      from './scenes/GameScene5'
import { GameScene6 }      from './scenes/GameScene6'
import { GameScene7 }      from './scenes/GameScene7'
import { GameScene8 }      from './scenes/GameScene8'
import { TouchControls }   from './ui/TouchControls'

DeviceManager.init()

const gameContainer = document.getElementById('game-container')
if (!(gameContainer instanceof HTMLElement)) {
  throw new Error('NEUROPOLIS: missing #game-container (see index.html)')
}

const canvas = new Canvas()
const ctx    = canvas.getContext()
const input  = new InputManager()
const loop   = new GameLoop()
const touchControls = new TouchControls(gameContainer, input)
touchControls.hide()

type AppScene =
  | 'boot'
  | 'cinematic'
  | 'game'
  | 'game2'
  | 'game3'
  | 'game4'
  | 'game5'
  | 'game6'
  | 'game7'
  | 'game8'
let current: AppScene = 'boot'

const boot = new BootScene(input, loop)
let cinematic: CinematicScene | null = null
let game:  GameScene  | null = null
let game2: GameScene2 | null = null
let game3: GameScene3 | null = null
let game4: GameScene4 | null = null
let game5: GameScene5 | null = null
let game6: GameScene6 | null = null
let game7: GameScene7 | null = null
let game8: GameScene8 | null = null
let bootTimer = 0

loop.onUpdate((dt) => {
  switch (current) {
    case 'boot':
      touchControls.hide()
      bootTimer += dt
      boot.update(dt)
      if (bootTimer >= 3) {
        current = 'cinematic'
        cinematic = new CinematicScene(
          input, loop,
          () => {
            current = 'game'
            touchControls.show()
            game = new GameScene(input, loop, () => {
              current = 'game2'
              game2 = new GameScene2(input, loop, () => {
                current = 'game3'
                game3 = new GameScene3(input, loop, () => {
                  current = 'game4'
                  game4 = new GameScene4(input, loop, () => {
                    current = 'game5'
                    game5 = new GameScene5(input, loop, () => {
                      current = 'game6'
                      game6 = new GameScene6(
                        input,
                        loop,
                        () => {
                          current = 'game7'
                          game7 = new GameScene7(
                            input,
                            loop,
                            () => {
                              current = 'game8'
                              game8 = new GameScene8(
                                input,
                                loop,
                                () => {
                                  current = 'boot'
                                  bootTimer = 0
                                  game = null
                                  game2 = null
                                  game3 = null
                                  game4 = null
                                  game5 = null
                                  game6 = null
                                  game7 = null
                                  game8 = null
                                  cinematic = null
                                  touchControls.hide()
                                  console.log('[Main] Volume 1 complete — returned to boot.')
                                },
                                touchControls,
                              )
                              console.log('[Main] Level 8 starts.')
                            },
                            touchControls,
                          )
                          console.log('[Main] Level 7 starts.')
                        },
                        touchControls,
                      )
                      console.log('[Main] Level 6 starts.')
                    }, touchControls)
                    console.log('[Main] Level 5 starts.')
                  }, touchControls)
                  console.log('[Main] Level 4 starts.')
                }, touchControls)
                console.log('[Main] Level 3 starts.')
              }, touchControls)
              console.log('[Main] Level 2 starts.')
            }, { touchControls })
            console.log('[Main] Cinematic done. Game starts.')
          }
        )
        console.log('[Main] Starting cinematic.')
      }
      break

    case 'cinematic':
      touchControls.hide()
      cinematic?.update(dt)
      break

    case 'game':
      touchControls.show()
      game?.update(dt)
      break

    case 'game2':
      touchControls.show()
      game2?.update(dt)
      break

    case 'game3':
      touchControls.show()
      game3?.update(dt)
      break

    case 'game4':
      touchControls.show()
      game4?.update(dt)
      break

    case 'game5':
      touchControls.show()
      game5?.update(dt)
      break

    case 'game6':
      touchControls.show()
      game6?.update(dt)
      break

    case 'game7':
      touchControls.show()
      game7?.update(dt)
      break

    case 'game8':
      touchControls.show()
      game8?.update(dt)
      break
  }

  // Flush justPressed AFTER scene logic has consumed it this frame.
  // Must stay at the END — moving this above the switch re-introduces
  // the "jump / dialogue advance not responding" bug.
  input.update()
})

loop.onRender(ctx, (ctx) => {
  switch (current) {
    case 'boot':      boot.render(ctx);       break
    case 'cinematic': cinematic?.render(ctx); break
    case 'game':      game?.render(ctx);      break
    case 'game2':     game2?.render(ctx);     break
    case 'game3':     game3?.render(ctx);     break
    case 'game4':     game4?.render(ctx);     break
    case 'game5':     game5?.render(ctx);     break
    case 'game6':     game6?.render(ctx);     break
    case 'game7':     game7?.render(ctx);     break
    case 'game8':     game8?.render(ctx);     break
  }
})

loop.start()
console.log('[Neuropolis] Engine started.')
