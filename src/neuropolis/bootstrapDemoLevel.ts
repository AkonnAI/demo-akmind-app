import { Canvas } from "./engine/Canvas";
import { DeviceManager } from "./engine/DeviceManager";
import { GameLoop } from "./engine/GameLoop";
import { InputManager } from "./engine/InputManager";
import { GameScene2 } from "./scenes/GameScene2";
import { GameScene3 } from "./scenes/GameScene3";
import { GameScene4 } from "./scenes/GameScene4";
import { TouchControls } from "./ui/TouchControls";

/** Demo lesson id 1–3 → engine scenes that were previously levels 2–4. */
export type NeuropolisDemoLevel = 1 | 2 | 3;

/**
 * Mount Neuropolis into `root` (cleared first). Maps demo lesson 1→GameScene2, 2→GameScene3, 3→GameScene4.
 * Returns idempotent teardown (stop loop, remove listeners, clear root).
 */
export function bootstrapNeuropolisDemo(
  root: HTMLElement,
  level: NeuropolisDemoLevel,
  onLevelComplete: () => void
): () => void {
  DeviceManager.init();
  root.replaceChildren();

  const gameContainer = document.createElement("div");
  gameContainer.id = "game-container";
  Object.assign(gameContainer.style, {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: "#0a0a1a",
  });

  const canvasEl = document.createElement("canvas");
  canvasEl.id = "game-canvas";

  gameContainer.appendChild(canvasEl);
  root.appendChild(gameContainer);

  const canvas = new Canvas("game-canvas");
  const ctx = canvas.getContext();
  const input = new InputManager();
  const loop = new GameLoop();
  const touchControls = new TouchControls(gameContainer, input, {
    bypassDeviceGate: true,
  });
  touchControls.show();

  let disposed = false;

  const teardown = (): void => {
    if (disposed) return;
    disposed = true;
    loop.stop();
    touchControls.destroy();
    input.destroy();
    canvas.destroy();
    root.replaceChildren();
  };

  const handleComplete = (): void => {
    teardown();
    onLevelComplete();
  };

  let scene: GameScene2 | GameScene3 | GameScene4 | null = null;

  switch (level) {
    case 1:
      scene = new GameScene2(input, loop, handleComplete, touchControls);
      break;
    case 2:
      scene = new GameScene3(input, loop, handleComplete, touchControls);
      break;
    case 3:
      scene = new GameScene4(input, loop, handleComplete, touchControls);
      break;
    default:
      teardown();
      throw new Error(`Invalid Neuropolis demo level: ${level}`);
  }

  loop.onUpdate((dt) => {
    scene?.update(dt);
    input.update();
  });

  loop.onRender(ctx, (c) => {
    scene?.render(c);
  });

  loop.start();

  return teardown;
}
