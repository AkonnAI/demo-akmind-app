# PROJECTGAME_README — Neuropolis (AKMIND Canvas Game)

This document describes **Neuropolis**, the side‑scrolling canvas game that ships inside **demo-akmind-app**. It covers story framing, all eight engineered levels, mechanics, bosses, file layout, and how the **full campaign** differs from the **public demo** embedded in `/demo/lesson/[id]`.

---

## 1. High-level concept

**Neuropolis** is a cyberpunk, AKMIND-branded **learning-adventure platformer** built on a custom **Canvas 2D** loop (no Unity/Phaser). The hero **AX** moves through districts of a city controlled by corporate AI (**NeuroCorps**, **NEXUS**), guided by **NOVA**—an AI presence in AX’s glasses—while gameplay reinforces curriculum themes (algorithms, history, patterns, bias, scale, broadcast power, modularity, corrupted optimization).

**Setting (opening cinematic, canonical copy)**  
- Year **2041**. One city, centralized AI, weak oversight.  
- **District 1 — Algorithm Slums**: demolition scans, drones, “algorithm decided” displacement.  
- AX commits to learning how the system works and stopping it; NOVA starts them in **District 1 — The Algorithm Maze**.  
- Narrator stakes: **Defeat CHAOS BOT. Save Neuropolis.**

Primary narrative beats deepen through mid‑game broadcasts and climax in **Level 8 — Chaos Protocol**, including NOVA’s confession of NeuroCorps/NEXUS origin and the **CHAOS** antagonist.

---

## 2. Technology stack

| Layer | Implementation |
|--------|----------------|
| Rendering | HTML `<canvas>`, internal resolution **1280×720** (`CONFIG` in `src/neuropolis/constants/config.ts`) |
| Loop | `GameLoop` — separate update/render hooks |
| Input | `InputManager` — keyboard + `TouchControls` overlay |
| World | Tile-ish geometry via platform rects; wide scrolling levels (`Camera`) |
| Assets | Pixel sprite sheets for AX: `public/sprites/AX.png`, `AX_Run.png`, `AX_Jump.png` |
| Device | `DeviceManager` — mobile detection, optional landscape lock (demo can bypass gating) |
| Haptics | `Haptics` — web vibration where available |

---

## 3. How to run the game in this repo

### 3.1 Public demo (Next.js) — **three Neuropolis segments**

- **Route:** `/demo/lesson/[id]` with `id` **1, 2, or 3** and `hasGame: true` in lesson config.  
- **Component:** `src/components/games/neuropolis/NeuropolisShell.tsx`  
- **Bootstrap:** `bootstrapNeuropolisDemo(root, level, onComplete)` in `src/neuropolis/bootstrapDemoLevel.ts`  
- **Important mapping (demo `level` 1|2|3):**  
  - Demo **1** → `GameScene2` (engine **Level 2 — The Vault**)  
  - Demo **2** → `GameScene3` (engine **Level 3 — The Data Market**)  
  - Demo **3** → `GameScene4` (engine **Level 4 — The Bias Engine**)  
- The demo **does not** mount `GameScene` (Level 1) or levels 5–8. It uses `TouchControls` with **`bypassDeviceGate: true`**, tears down on **Exit** or level complete, and coexists with the lesson page’s **NOVA** chat (suppressed during fullscreen game where implemented).

### 3.2 Full “Volume 1” campaign (standalone engine entry)

- **File:** `src/neuropolis/main.ts`  
- **Flow:** `BootScene` (3s) → `CinematicScene` → `GameScene` (L1) → `GameScene2` → … → `GameScene8` → loops back to boot.  
- **Expects DOM:** a `#game-container` element (as noted in `main.ts`). This path is **not** wired by default Next.js `app` pages in this repository; it is the **authoring / full-play** entry when bundled with a suitable HTML shell (see also `admin.ts` below).

### 3.3 Level select / section jump (authoring)

- **File:** `src/neuropolis/admin.ts`  
- **Purpose:** launch any **built** level 1–8, optionally at a **section start** or **boss arena** (Level 2).  
- **Expects DOM:** `#admin-game-container` plus the admin grid markup that `buildGrid()` injects.  
- **Metadata:** the `LEVELS` array in `admin.ts` is the **single convenient table** of level names, districts, and **lesson blurbs** used for the admin cards.

---

## 4. Global physics & player (`CONFIG` + `Player`)

From `src/neuropolis/constants/config.ts` and `src/neuropolis/entities/Player.ts`:

- **Gravity, run speed, jump** — tuned 2D platformer feel (`GRAVITY`, `PLAYER_SPEED`, `JUMP_FORCE`).  
- **AX** — animated idle/run/jump sheets; **display scale** separate from **hitbox** (22×54 collision).  
- **Weapons (slots 0–6):** `BLASTER`, `EMP`, `PRISM`, `GRAVITY`, `MIRROR`, `PULSE`, `PHASE` — unlocked per level in each `GameScene` constructor.  
- **Double jump** — enabled from **Level 7** onward (`Player.hasDoubleJump`).  
- **Lock-on** — used against flying or special targets in several scenes (shared “lockable” pattern).  
- **Dialogue** — freezes play in many scenes; **Space** / **ArrowUp** / pointer advance (see `dialoguePointerAdvance.ts`) step lines.

**Keyboard (see `InputManager`)**  
Arrows or **WASD** for movement/jump; **Space** jump; **Z** shoot (and often advance dialogue); **E** interact; additional keys used in minigates (**Q**, **F**, etc. per scene). **Escape** is defined for future / edge use.

**Touch**  
`TouchControls` simulates keys and must stay above high z-index game wrappers on mobile.

---

## 5. Level catalog (engine numbering 1–8)

The **HUD strings** below are taken from the live `GameSceneN` code. **District / lesson** strings come from `src/neuropolis/admin.ts` (`LEVELS`).

| # | HUD title | District (admin) | Lesson hook (admin) | World module | Scene |
|---|-----------|------------------|---------------------|--------------|-------|
| 1 | **LEVEL 1 — THE SCAN** | District 1 — Algorithm Slums | What is AI | `Level1.ts` | `GameScene.ts` |
| 2 | **LEVEL 2 — THE VAULT** | District 1 — Algorithm Slums | History of AI | `Level2.ts` | `GameScene2.ts` |
| 3 | **LEVEL 3 — THE DATA MARKET** | District 1 — Algorithm Slums | Pattern recognition in data | `Level3.ts` | `GameScene3.ts` |
| 4 | **LEVEL 4 — THE BIAS ENGINE** | District 2 — NeuroCorps Facility | Biased training data skews predictions | `Level4.ts` | `GameScene4.ts` |
| 5 | **LEVEL 5 — THE MIRROR LAB** | District 3 — Social Prediction Lab | AI mirrors what it is trained on | `Level5.ts` | `GameScene5.ts` |
| 6 | **LEVEL 6 — THE BROADCAST CORE** | District 4 — NEXUS 2.0 Tower | AI broadcasts at scale | `Level6.ts` | `GameScene6.ts` |
| 7 | **LEVEL 7 — THE NEURAL CORE** | District 5 — NEXUS 2.0 Server Core | Modular AI — break a module, system adapts | `Level7.ts` | `GameScene7.ts` |
| 8 | **LEVEL 8 — CHAOS PROTOCOL** | District 5 — NEXUS 2.0 Finale | Corrupted AI — optimized without constraints | `Level8.ts` | `GameScene8.ts` |

### 5.1 Admin “jump to section” layout

Section labels and approximate `startX` anchors are defined in `admin.ts`:

- **L1:** Tutorial Alley, Community Square, Server Alley, Mirror Puzzle, Smart Door Gauntlet  
- **L2:** Entry Tunnel, Approach Corridor, Vault Chamber, **Boss Arena**, Evidence Run, Exit Gauntlet  
- **L3:** Market Entry, Pattern Plaza, Evidence Zone, Exit Sprint  
- **L4:** Facility Entry, Scale Room 1, Mid Facility, Scale Room 2  
- **L5:** Mirror Entry, Puzzle Room 1, Mid Lab, Puzzle Room 2  
- **L6:** Tower Entry, Dish Array, Transmitter Zone, Final Core  
- **L7:** Entry, Memory Ch.1, Core Access, Exit Conduit  
- **L8:** Chaos fight

---

## 6. Level-by-level mechanics & story hooks

### Level 1 — The Scan (`GameScene` + `Level1`)

- **Objective (initial HUD):** **REACH THE SMART LOCK AT THE END**  
- **Themes:** surveillance, quizzes as knowledge gates, drones, projectiles, **smart lock / door** pacing.  
- **Features:** `Drone`, `OldCamera`, **quiz panels** with explanations, **gates**, **mirror item** puzzle hooks, **NPCs**, **burning robots** ambiance, **data chips**, section triggers with NOVA/AX/KIRAN dialogue.  
- **Boss:** none in the traditional sense; progression is environmental and puzzle/combat mixed.

### Level 2 — The Vault (`GameScene2` + `Level2`)

- **Visual bible:** underground vault, water floor, torches, stone platforms — separate art pass from Level 1 (`Level2.ts` header comments).  
- **Enemies:** `Crawler`, `SentryMine`, `WallHugger` (drones removed for this level).  
- **Cipher terminals:** stand near rack, **E** to hack; **Z/E** cycle digits, **Space** confirm; wrong code resets—teaches patience/pattern. Exported helpers e.g. `TERMINAL_HACK_RANGE`, `TERMINAL_WALK_AWAY`.  
- **Boss:** **`GlitchTwinBoss`** — twin/decoy identity puzzle; arena at dedicated section; objectives cycle between **defeat boss** and **reach tunnel end**.  
- **Cinematic beats:** evidence / dataset reveal, acid-flash stylization, data-rain style presentation (see scene implementation).  
- **XP:** terminal solves, enemy kills, boss defeat (`BOSS_XP`).

### Level 3 — The Data Market (`GameScene3` + `Level3`)

- **HUD:** **LEVEL 3 — THE DATA MARKET**  
- **Intro sample:** narrator timestamp + NOVA explains **three sector locks**; AX: pattern → evidence → run.  
- **Objectives (dynamic):**  
  1. **GATE 1** — step floor **pattern** in order (`PatternGrid` system)  
  2. **GATE 2** — **collect evidence** at pedestal (**E**)  
  3. **GATE 3** — second pattern grid, then exit  
  4. Exit portal  
- **Combat / hazards:** `MarketEnforcer`, `DataWraith`, drones, cameras; **upgrade shop** (`UpgradeShop`) spends HUD XP.  
- **World:** parallax background; accent color **purple** (`#e040fb`).

### Level 4 — The Bias Engine (`GameScene4` + `Level4`)

- **Themes:** training bias, **balance scales** as metaphor for skewed data.  
- **Weapons start:** blaster + EMP + prism.  
- **Objectives:**  
  1. **GATE 1** — **scale** puzzle (**120 / pan** — balance beam mechanics in `WeightScale`)  
  2. **GATE 2** — **console QTE** (`GateHack`)  
  3. **GATE 3** — second scale (**160 / pan**)  
  4. Facility exit portal  
- **Enemies / tech:** `AuditBot`, `ProcessorSwarm`, drones; **gravity weapon** charges with cooldown; **gravity fields** from shots (`Projectile` + `gravityFieldVfx`).  
- **Carry mechanic:** **E** picks up / drops **data blocks** near scales.

### Level 5 — The Mirror Lab (`GameScene5` + `Level5`)

- **Themes:** reflection / training distribution → “mirror” behavior.  
- **Weapons:** adds **gravity** slot.  
- **Objectives:**  
  1. Terminal **QTE**  
  2. **Align mirror panels** (**E** on mirrors) via `MirrorRedirect` puzzles  
  3. Second mirror room  
  4. Lab exit  
- **Entities:** `ShieldBot`, `MirrorBot`, `PhantomNode`, weapon crate, drones; gate hack overlay reused.

### Level 6 — The Broadcast Core (`GameScene6` + `Level6`)

- **Themes:** mass influence, transmission, **MHz tuning**.  
- **Weapons:** adds **mirror** (fourth alt-fire style in progression).  
- **Objectives:**  
  1. **Tune dial** at terminal (**E**) — `FrequencyDial` fullscreen UI  
  2. Second dial gate  
  3. **Inject evidence** at transmitter (**E**) — includes hack/minigame burst (`GateHack` inject sequence)  
  4. Ends with **“VOLUME 1 COMPLETE”** style messaging on HUD when inject done  
- **Enemies:** `BroadcastSentinel`, **NEXUSProxy** boss-tier encounter, drones; **pulse waves** and cinematic glitch beats.

### Level 7 — The Neural Core (`GameScene7` + `Level7`)

- **Themes:** modular redundancy — **three destructible module cores** with shields and phases.  
- **Weapons:** adds **pulse**; **double jump** on.  
- **NOVA visual:** corruption tier increases as cores fall (`NovaOrb.setCorrupted`).  
- **Objectives:**  
  1. Security **QTE** gate  
  2. **Destroy three NEXUS module cores**  
  3. Exit → proceed to Chaos Protocol  
- **Entities:** `NeuralGuard`, `DataPhantom`, core bosses as level-local state machines (`NexusModuleCore` interface in `Level7.ts`).

### Level 8 — Chaos Protocol (`GameScene8` + `Level8` + bosses/systems)

- **Structure:**  
  - **Corridor** climb + optional **NPC Reyes** dialogue (signal / NEXUS / choice theme).  
  - **NOVA talk** (cinematic bars) — reveals **NOVA = New Objective Value Architecture**, built by NeuroCorps, part of NEXUS; historical beats (**1950, 1956, 1997, 2012, 2022**).  
  - **CHAOS** taunt → **arena fight** vs **`ChaosBoss`**.  
  - **Restoration** phase — `RestorationCipher` interactive overlay.  
  - **Ending / complete** timer then `onLevelComplete`.  
- **Weapons:** all slots including **PHASE**.  
- **Boss (`ChaosBoss`):** multi-phase HP, attacks typified as **RING**, **BEAM**, **CLONE**, **MEMORY**; corruption lines; **restoration** trigger on success; arena floor constant `CHAOS_ARENA_FLOOR_Y`.  
- **Small world:** `Level8` minimal platforms + one NPC definition (`L8_REYES`).

---

## 7. Major entities (enemy / prop roster)

Paths under `src/neuropolis/entities/`:

| Entity | Typical role |
|--------|----------------|
| `Player` | AX |
| `Drone`, `Projectile` | Ranged combat baseline |
| `OldCamera` | Detection / zone hazard |
| `NPC` | Dialogue delivery |
| `Crawler`, `WallHugger`, `SentryMine` | Level 2 hazards |
| `MarketEnforcer`, `DataWraith` | Level 3 |
| `AuditBot`, `ProcessorSwarm` | Level 4 |
| `ShieldBot`, `MirrorBot`, `PhantomNode` | Level 5 |
| `BroadcastSentinel`, `NEXUSProxy` | Level 6 |
| `NeuralGuard`, `DataPhantom` | Level 7 |
| `WeaponCrate` | Weapon progression pickups |
| `SmartLock`, etc. | Gatekeeping props (Level 1 ecosystem) |

**Bosses** live in `src/neuropolis/bosses/`:

- `GlitchTwinBoss.ts` — Level 2  
- `ChaosBoss.ts` — Level 8  

---

## 8. Systems (mechanics libraries)

| System file | Purpose |
|-------------|---------|
| `systems/PatternGrid.ts` | Stepping floor tiles in sequence (Level 3) |
| `systems/WeightScale.ts` | Balance puzzles + draggable/pannable weights (Level 4) |
| `systems/GateHack.ts` | Timing / QTE console hacks (Levels 4–6, inject) |
| `systems/MirrorRedirect.ts` | Rotating mirror beams (Level 5) |
| `systems/FrequencyDial.ts` | Radio dial minigame (Level 6) |
| `systems/gravityFieldVfx.ts` | Gravity well visuals |
| `systems/RestorationCipher.ts` | Post-Chaos restoration UI (Level 8) |

---

## 9. UI / presentation

| File | Role |
|------|------|
| `ui/HUD.ts` | HP, level title, objective, XP messages, weapon name |
| `ui/DialogueBox.ts` | Speaker strips, expressions |
| `ui/NovaOrb.ts` | NOVA floating orb + corruption states |
| `ui/TouchControls.ts` | On-screen sticks/buttons |
| `ui/UpgradeShop.ts` | Level 3 XP purchases |
| `ui/XPBar.ts` | Progress bar widgets |
| `ui/CinematicBars.ts` | Letterboxing (Level 8) |
| `world/ParallaxBackground.ts` | City depth & mood |

---

## 10. Opening & meta scenes

- **`BootScene`** — NEUROPOLIS logo, “INITIALIZING…”, font wait, FPS; transitions after ~3s in `main.ts`.  
- **`CinematicScene`** — five visual slices (black city title card, night balcony, drone scan, decision, district title); full narrator/NOVA/AX script documented in source (`CinematicScene.ts`).  

---

## 11. Folder map (`src/neuropolis/`)

```
src/neuropolis/
├── main.ts                 # Full campaign driver
├── admin.ts                # Level grid + section launcher
├── bootstrapDemoLevel.ts   # Next.js demo mount (lessons 1–3 → scenes 2–4)
├── constants/config.ts     # Canvas size, physics, sprite paths
├── engine/                 # Canvas, loop, camera, input, haptics, device
├── entities/               # Game objects
├── bosses/                 # GlitchTwin, Chaos
├── systems/                # Puzzles / minigames
├── scenes/                 # Boot, Cinematic, GameScene…GameScene8
├── ui/                     # HUD, dialogue, controls
└── world/                  # Level1…Level8, ParallaxBackground
```

**React bridge**

```
src/components/games/neuropolis/NeuropolisShell.tsx
```

---

## 12. Pedagogical alignment (design intent)

Each level’s **admin lesson string** is the teaching headline the gameplay props metaphorically support:

- **L1** — definition & surveillance literacy  
- **L2** — history & timelines under pressure (vault / cipher)  
- **L3** — patterns & evidence in noisy environments  
- **L4** — bias as imbalance (scales)  
- **L5** — training data ↔ mirrored outcomes  
- **L6** — reach & responsibility of broadcast AI  
- **L7** — redundancy / modularity of real systems  
- **L8** — misaligned optimization (**CHAOS**) and restoration ethics  

---

## 13. Maintenance notes for contributors

1. **Demo vs engine indices:** Public demo **lesson ids 1–3** map to **`GameScene2`–`GameScene4`**, not `GameScene` (L1). Updating marketing copy in `page.tsx` should stay consistent with `bootstrapDemoLevel.ts`.  
2. **Single source for level metadata:** Prefer updating `LEVELS` in `admin.ts` when renaming districts or lesson blurbs, then mirror any user-facing strings if needed.  
3. **Input flush order:** `main.ts` documents that `input.update()` must run **after** scene logic each frame to fix jump/dialogue edge cases—preserve that ordering when refactoring.  
4. **New mechanics:** Add under `systems/`, wire through the owning `GameSceneN` + `LevelN`, expose tutorial text via `HUD.setObjective` and section triggers.  
5. **Assets:** New AX frames should respect `CONFIG` frame sizes or update `CONFIG` consistently to avoid desync between hitbox and sprite.

---

## 14. Related project docs

- **`PROJECT_README.md`** — Demo app architecture, APIs, Neuropolis shell wiring section.  
- **This file (`PROJECTGAME_README.md`)** — Game-only reference for Neuropolis levels, story, and code.

---

*Generated from the repository source tree as an internal design reference. If gameplay diverges from this document, treat the TypeScript implementation as authoritative and update this README in the same change.*
