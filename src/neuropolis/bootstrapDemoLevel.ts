import { Canvas } from "./engine/Canvas";
import { audioManager } from "./engine/AudioManager";
import { CONFIG } from "./constants/config";
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
  audioManager.preload({
    jump: "/sounds/jump.mp3",
    shoot: "/sounds/shoot.mp3",
    enemyHit: "/sounds/enemyHit.mp3",
    bossHit: "/sounds/bossHit.mp3",
    coin: "/sounds/coin.mp3",
    correct: "/sounds/correct.mp3",
    wrong: "/sounds/wrong.mp3",
    checkpoint: "/sounds/checkpoint.mp3",
    gateOpen: "/sounds/gateOpen.mp3",
    victory: "/sounds/victory.mp3",
    bgDistrict2: "/sounds/district2-bg.mp3",
    bgDistrict3: "/sounds/district3-bg.mp3",
    bgDistrict4: "/sounds/district4-bg.mp3",
  });
  root.replaceChildren();

  const gameContainer = document.createElement("div");
  gameContainer.id = "game-container";
  Object.assign(gameContainer.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#0a0a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const canvasEl = document.createElement("canvas");
  canvasEl.id = "game-canvas";
  Object.assign(canvasEl.style, {
    position: "absolute",
    display: "block",
  });

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

  let onPointerDown = (_e: PointerEvent): void => {};

  const teardown = (): void => {
    if (disposed) return;
    disposed = true;
    audioManager.stopMusic();
    canvasEl.removeEventListener("pointerdown", onPointerDown);
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

  onPointerDown = (e: PointerEvent): void => {
    if (disposed || !scene) return;
    const rect = canvasEl.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    scene.handleHudPointerDown(canvasX, canvasY);
  };
  canvasEl.addEventListener("pointerdown", onPointerDown);

  switch (level) {
    case 1:
      audioManager.playMusic("bgDistrict2");
      break;
    case 2:
      audioManager.playMusic("bgDistrict3");
      break;
    case 3:
      audioManager.playMusic("bgDistrict4");
      break;
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
