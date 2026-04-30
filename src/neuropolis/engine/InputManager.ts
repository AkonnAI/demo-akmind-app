// Keys we care about in Neuropolis
type GameKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "ArrowUp"
  | "ArrowDown"
  | "Space"
  | "KeyZ"
  | "KeyE"
  | "KeyF"
  | "KeyQ"
  | "KeyX"
  | "KeyW"
  | "KeyS"
  | "Escape";

export class InputManager {
  private held = new Set<GameKey>();
  private justPressed = new Set<GameKey>();
  private justReleased = new Set<GameKey>();

  private validKeys: GameKey[] = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "KeyZ",
    "KeyE",
    "KeyF",
    "KeyQ",
    "KeyX",
    "KeyW",
    "KeyS",
    "Escape",
  ];

  private readonly boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private readonly boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);

  constructor() {
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    this.held.clear();
    this.justPressed.clear();
    this.justReleased.clear();
  }

  private isGameKey(code: string): code is GameKey {
    return this.validKeys.includes(code as GameKey);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isGameKey(e.code)) return;
    e.preventDefault();
    if (!this.held.has(e.code)) this.justPressed.add(e.code);
    this.held.add(e.code);
    this.justReleased.delete(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (!this.isGameKey(e.code)) return;
    this.held.delete(e.code);
    this.justReleased.add(e.code);
  }

  isDown(key: GameKey): boolean {
    return this.held.has(key);
  }
  isHeld(key: GameKey): boolean {
    return this.held.has(key);
  }
  isJustPressed(key: GameKey): boolean {
    return this.justPressed.has(key);
  }
  isJustReleased(key: GameKey): boolean {
    return this.justReleased.has(key);
  }

  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }
}
