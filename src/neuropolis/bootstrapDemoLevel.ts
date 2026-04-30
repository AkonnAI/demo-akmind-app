import { Canvas } from "./engine/Canvas";
import { GameLoop } from "./engine/GameLoop";
import { InputManager } from "./engine/InputManager";
import { BootScene } from "./scenes/BootScene";
import { CinematicScene } from "./scenes/CinematicScene";
import { GameScene } from "./scenes/GameScene";
import { GameScene2 } from "./scenes/GameScene2";
import { GameScene3 } from "./scenes/GameScene3";
import { GameScene4 } from "./scenes/GameScene4";
import { TouchControls } from "./ui/TouchControls";

export type NeuropolisDemoLevel = 1 | 2 | 3 | 4;

type IntroPhase = "boot" | "cinematic" | "game";

/**
 * Mount Neuropolis into `root` (cleared first). Runs one demo level (maps to demo lessons 1–4).
 * Lesson 1 matches standalone `main.ts`: BootScene (~3s) → CinematicScene → GameScene.
 * Returns idempotent teardown (stop loop, remove listeners, clear root).
 */
export function bootstrapNeuropolisDemo(
  root: HTMLElement,
  level: NeuropolisDemoLevel,
  onLevelComplete: () => void
): () => void {
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
  const touchControls = new TouchControls(gameContainer);
  touchControls.hide();

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

  let introPhase: IntroPhase = level === 1 ? "boot" : "game";
  let bootTimer = 0;
  const bootScene: BootScene | null =
    level === 1 ? new BootScene(input, loop) : null;
  let cinematic: CinematicScene | null = null;

  let scene: GameScene | GameScene2 | GameScene3 | GameScene4 | null = null;

  const beginLevel1Gameplay = (): void => {
    if (disposed) return;
    touchControls.show();
    scene = new GameScene(input, loop, handleComplete);
  };

  if (level !== 1) {
    touchControls.show();
    switch (level) {
      case 2:
        scene = new GameScene2(input, loop, handleComplete, touchControls);
        break;
      case 3:
        scene = new GameScene3(input, loop, handleComplete, touchControls);
        break;
      case 4:
        scene = new GameScene4(input, loop, handleComplete, touchControls);
        break;
      default:
        teardown();
        throw new Error(`Invalid Neuropolis demo level: ${level}`);
    }
  }

  loop.onUpdate((dt) => {
    if (level === 1 && introPhase === "boot") {
      touchControls.hide();
      bootTimer += dt;
      bootScene?.update(dt);
      if (bootTimer >= 3) {
        introPhase = "cinematic";
        cinematic = new CinematicScene(input, loop, () => {
          if (disposed) return;
          introPhase = "game";
          beginLevel1Gameplay();
        });
      }
      input.update();
      return;
    }

    if (level === 1 && introPhase === "cinematic") {
      touchControls.hide();
      cinematic?.update(dt);
      input.update();
      return;
    }

    scene?.update(dt);
    input.update();
  });

  loop.onRender(ctx, (c) => {
    if (level === 1 && introPhase === "boot") {
      bootScene?.render(c);
      return;
    }
    if (level === 1 && introPhase === "cinematic") {
      cinematic?.render(c);
      return;
    }
    scene?.render(c);
  });

  loop.start();

  return teardown;
}
