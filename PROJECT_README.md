# AKMIND Demo App — Project Bible

This document is the **single source of truth** for **demo-akmind-app**: what it does, how it is built, every lesson, every game, APIs, data, and operational details. Update this file when you change flows, content, or architecture.

---

## 1. What this project is

**demo-akmind-app** is a **Next.js 15** web application for the **AKMIND** brand. It delivers a **guided demo “class”** for kids (parent registers → receives a magic link → child progresses through **4 lessons** with **video**, optional **story games**, **quizzes**, **XP**, and a **completion** experience including badge PDF and upsell UI).

**Product goals (as implemented):**

- One-time demo per email (enforced at registration).
- Token-based access to `/demo/**` (no full user accounts in this repo).
- Local JSON “database” for demo users (`data/demo-users.json`).
- Optional Gmail SMTP to email demo links and notify admins.
- Four thematic lessons aligned with introductory AI curriculum.
- Three canvas/React **mini-games** (lessons 2–4) loaded with `dynamic(..., { ssr: false })`.

---

## 2. Tech stack

| Layer | Technology |
|--------|------------|
| Framework | **Next.js 15.1** (App Router) |
| UI | **React 19**, **Tailwind CSS 3.4** |
| Motion | **Framer Motion** |
| Icons | **lucide-react** |
| PDF | **jspdf** (badge download on complete page) |
| Email | **nodemailer** (Gmail transport) |
| Language | **TypeScript 5** |
| Storage | **Node `fs`** + JSON file under `data/` |

---

## 3. Repository layout (high level)

```
demo-akmind-app/
├── data/
│   └── demo-users.json          # Local persistence for registered demo users
├── public/
│   └── sounds/                  # Game SFX + bg music (referenced by useSoundEngine)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Landing: token entry / validation → demo
│   │   ├── layout.tsx
│   │   ├── demo/
│   │   │   ├── page.tsx         # Dashboard: 4 lessons, XP, locks
│   │   │   ├── complete/
│   │   │   │   └── page.tsx     # Post-program: badge PDF, payment UI (mock flow)
│   │   │   └── lesson/[id]/
│   │   │       └── page.tsx     # Per-lesson: video → game? → quiz → results
│   │   └── api/demo/
│   │       ├── register/route.ts
│   │       ├── user/route.ts
│   │       ├── progress/route.ts
│   │       └── check/route.ts
│   ├── components/games/
│   │   ├── shared/              # AXCharacter, NovaCharacter (cross-lesson)
│   │   ├── lesson2/             # History Vault, NPC zone, timeline, boss
│   │   ├── lesson3/             # The Divide (Human vs AI modes)
│   │   └── lesson4/             # Classification arena (ammo types + boss)
│   ├── lib/
│   │   ├── demo-db.ts           # Read/write demo-users.json
│   │   ├── email.ts             # sendDemoLink, sendAdminNotification
│   │   └── api-response.ts
│   ├── types/demo.ts            # Client-facing DemoUser shape (subset of DB)
│   └── middleware.ts            # /demo/* token gate + cookie set
├── .env.local                   # Local secrets (not committed)
├── next.config.ts
├── tailwind.config.ts
├── package.json
└── PROJECT_README.md            # This bible
```

---

## 4. Environment variables

Typical **`.env.local`** entries (names matter for the code):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Base URL embedded in demo emails (link: `?token=...`). |
| `NEXT_PUBLIC_LANDING_URL` | Main marketing site link (default `https://www.akmind.com`). |
| `GMAIL_USER` | SMTP from-address user. |
| `GMAIL_APP_PASSWORD` | Gmail app password for nodemailer. |
| `AKMIND_LOCAL_DB_PATH` | Optional; overrides `./data` root for JSON DB (see `demo-db.ts`). |

**Client-exposed:** only variables prefixed with `NEXT_PUBLIC_`.

---

## 5. Authentication & access model

There is **no** session/JWT stack. Access is:

1. **Registration** creates a row in `demo-users.json` with a **`demoToken`** (16-char hex-like string by default).
2. User opens link: **`/?token=...`** → validated via **`GET /api/demo/user`**.
3. App navigates to **`/demo?token=...`**.
4. **`middleware.ts`** matches **`/demo/:path*`**:
   - Requires `token` query **or** `demo_token` cookie.
   - If missing → redirect **`/?error=no-token`**.
   - If token present but no cookie → sets **`demo_token`** cookie (7 days, path `/`).

**Lesson unlock rule:** Lesson `n > 1` requires **`lessonsComplete` includes `n - 1`** (previous lesson id completed via progress API).

---

## 6. Data model (`src/lib/demo-db.ts`)

Server-side **`DemoUser`** (persisted):

| Field | Meaning |
|-------|---------|
| `id` | UUID |
| `email`, `name`, `childName`, `phone` | Registration payload |
| `demoToken` | Secret link token |
| `demoStarted`, `demoCompleted` | Flags |
| `lessonsComplete` | `number[]` of finished lesson ids (e.g. `[1,2,3,4]`) |
| `quizScores` | `Record<string, number>` keyed by lesson id string (percentage stored from UI) |
| `xp` | Running total; **incremented** on each `POST /api/demo/progress` |
| `badgeEarned` | `true` when all 4 lessons complete |
| `createdAt` | ISO timestamp |

**Client type** (`src/types/demo.ts`) is a **subset** returned by `/api/demo/user` (no internal `id`, `demoToken`, etc. in the type file — API still maps fields as needed).

**Storage path:** `{AKMIND_LOCAL_DB_PATH or ./data}/demo-users.json`.

**Token lookup (normalization):** `normalizeDemoToken()` in `demo-db.ts` trims and lowercases tokens for comparisons. `createDemoUser` stores tokens normalized. `GET /api/demo/user` trims the query `token`. This avoids “invalid token” when pasting mixed case or stray spaces.

**Demo seed users:** `data/demo-users.json` may include multiple preset rows for QA (emails, `demoToken`, etc.); progress fields are often reset to zero for a clean slate (`demoStarted: false`, empty `lessonsComplete`, `xp: 0`).

---

## 7. API reference

### `POST /api/demo/register`

**Body:** `{ parentName, email, phone, childName, presetToken? }`

- Rejects if email already used (**409**).
- Creates user; optional **`presetToken`** for testing (otherwise random).
- Sends **demo link email** + **admin notification** (fire-and-forget).
- Returns **`{ success, token }`**.

### `GET /api/demo/user?token=...`

Returns sanitized profile: name, childName, optional email/phone, **`lessonsComplete`**, **`quizScores`**, **`xp`**, **`badgeEarned`**, **`demoCompleted`**.

### `POST /api/demo/progress`

**Body:** `{ token, lessonId, quizScore?, xp? }`

- Appends **`lessonId`** to **`lessonsComplete`** if not present.
- Stores **`quizScores[String(lessonId)]`** if `quizScore` provided (percent).
- **`xp`**: adds **`xp`** to existing **`user.xp`** (additive, not replace).
- If **`lessonsComplete.length >= 4`** → sets **`demoCompleted`** and **`badgeEarned`**.

### `GET /api/demo/check?email=...`

Returns **`{ hasUsedDemo: boolean }`** for form validation.

**Response helpers:** `src/lib/api-response.ts` (`ok`, `fail`).

---

## 8. Email (`src/lib/email.ts`)

- **`sendDemoLink`**: Parent receives CTA linking to **`NEXT_PUBLIC_APP_URL?token=...`**.
- **`sendAdminNotification`**: Internal alert with registration details.
- Uses **Gmail** via nodemailer; failures are logged, not thrown to the client.

---

## 9. User-facing routes

| Route | Role |
|-------|------|
| `/` | Landing: starfield, registration context, manual token entry, validates token |
| `/demo` | Dashboard: lesson cards, XP, locks, navigate to lesson |
| `/demo/lesson/[id]` | Lesson flow: video → game (if any) → quiz → results |
| `/demo/complete` | Requires **`demoCompleted`**; confetti, badge PDF download, payment UI stub; redirects incomplete users to `/demo` |

**Middleware:** All **`/demo/**`** require token (query or cookie).

---

## 10. Lesson catalog (content + quiz + game)

Content is primarily defined in **`src/app/demo/lesson/[id]/page.tsx`** (`LESSONS` constant). Dashboard copy is duplicated per lesson in **`src/app/demo/page.tsx`** (`LESSONS` array for UI metadata).

### Lesson 1 — Welcome to Artificial Intelligence

- **Type:** Live recording (~15 min in UI).
- **Video:** YouTube embed `ad79nYk2keg`.
- **`hasGame`:** `false`.
- **`xpReward` (quiz base):** 100 (scaled by quiz accuracy in results).
- **Flow:** Video → auto “watched” after 30s timer → Quiz → Results → marks lesson done on progress post.
- **Quiz:** 3 questions (AI definition, examples, learning from data).

### Lesson 2 — History of AI — From Dreams to Machines

- **Type:** Self-paced + game.
- **Video:** `JMUxmLyrhSk`.
- **`xpReward`:** 300 (quiz portion).
- **`hasGame`:** `true` → **`GameShell2`** (`dynamic`, `ssr: false`).
- **`GAME_BONUS_XP`:** +200 XP if game finished before quiz (see lesson page logic).
- **Game tagline (`GAME_MECHANICS[2]`):** Timeline / Time Corruptor.
- **Quiz:** 5 questions (Turing, Deep Blue, AlphaGo, ChatGPT, Turing Test).

### Lesson 3 — AI vs Humans: What Can AI Do?

- **Video:** `rcd7Ov9b5QM`.
- **`hasGame`:** `true` → **`GameShell3`**.
- **`GAME_MECHANICS[3]`:** Human/AI modes, The Divide.
- **Quiz:** 5 questions (strengths, empathy, bias, sarcasm, collaboration).

### Lesson 4 — Types of AI: Narrow, General & Super

- **Video:** `aWKNGWdAMGA`.
- **`hasGame`:** `true` → **`GameShell4`**.
- **`GAME_MECHANICS[4]`:** Classify Narrow/General/Super.
- **Quiz:** 5 questions (assistants, AGI, AGI definition, today’s AI, super AI).

### Quiz scoring & XP (lesson page)

- **`quizXpFromAccuracy`:** 100% → full `xpReward`; ≥80% → 90%; ≥60% → 70%; else 50%.
- **Total XP posted** on results: **`quizXp + (GAME_BONUS_XP if game complete)`** (200 bonus).
- **`POST /api/demo/progress`** **adds** that total to stored **`xp`** (cumulative across lessons).

### After lesson 4

- **`phase === 'complete'`** on lesson page: after ~3s, redirect **`/demo/complete`** if `lessonId >= 4`, else **`/demo`**.

---

## 11. Games — Lesson 2 (`GameShell2`)

**Shell:** `src/components/games/lesson2/GameShell2.tsx`

**States (`gameTypes.ts`):**  
`LOADING` → `CINEMATIC_INTRO` → **`NPC_EXPLORE`** → `STAGE_1` → **`STAGE_CUTSCENE`** → `STAGE_2` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

**Shared pieces:** `LoadingScreen`, `CinematicIntro2`, **`NPCExploreZone2`**, **`StageCutscene2`**, `TimelineStage`, `BossBattleLesson2`, `VictoryScreenLesson2`, `DialogueBox` (lesson 2), `NovaCharacter` (**`src/components/games/shared/NovaCharacter.tsx`**), `ChaosBotCharacter`, `useSoundEngine`.

### `DialogueBox` (lesson 2 only)

Path: `src/components/games/lesson2/DialogueBox.tsx`

| Prop | Purpose |
|------|---------|
| `startFull?: boolean` | Skip typewriter; show full text immediately (cinematics / cutscenes). |
| `dock?: "viewport" \| "panel"` | Default **`viewport`**: `position: fixed`, height **160**. **`panel`**: `position: absolute`, height **200**, docks inside a cinematic column so dialogue does not cover characters. |

### Cinematic (`CinematicIntro2`)

Path: `src/components/games/lesson2/CinematicIntro2.tsx`

- **Layout:** Each panel uses **`min-height: 100vh`**, **`flexDirection: column`**, **`justifyContent: space-between`**: upper **`flex: 1`** stage (characters), lower **200px** slot with **`DialogueBox dock="panel"`**.
- **Panel 0:** City skyline with `CitySkyline stripBottom={200}` so buildings sit above the dialogue strip.
- **Panel 2 (Time Corruptor):** Background **`radial-gradient(circle at center, rgba(120,53,15,0.4) 0%, #050510 70%)`**, **`AmberRiseParticles`** (10 dots, `ci2-amber-rise` float-up), NOVA **`left: 25%`**, **`size={0.9}`**, rotating clock **`left: 75%`** / **`bottom: 20`** in the stage band (mirrors “right 25%” placement).
- **Panel 3:** AX + NOVA at **`size={0.8}`**, centered in stage.
- **Stars / particles / scanlines** on layers; Space advances via `DialogueBox`.

### NPC pre-mission — `NPCExploreZone2`

Path: `src/components/games/lesson2/NPCExploreZone2.tsx`

- Canvas **1200px** wide; sepia History Vault art; **60** amber rain streaks; flat ground physics (arrows, Space jump).
- **3 NPCs** with proximity speech bubbles (lines rotate every **3s**); **3** spinning diamond collectibles (+**15 XP** each); **mission door** at **x=1100** (cyan glow after talking to any NPC); **NOVA** `DialogueBox` on enter; tip if door touched without NPC contact; **90s** pressure message.
- **`onComplete` → `STAGE_1`**, **`onXP`** wired to shell `addXP`.

### Stages 1 & 2 — `TimelineStage`

- Side-scrolling platformer; **AX** sprite (`AXCharacter` overlay + canvas).
- **`LEVEL_W` ~2800**; camera follow; platforms with **year** milestones vs **traps**.
- Land on **correct** platform in **sequence** → progress + NOVA VO lines; wrong order or trap → damage + warning.
- **Rain:** 60 drops in world space (`rainDropsRef`), updated each frame, drawn **after** sky gradient **before** platforms; stroke **`rgba(251,191,36,0.12)`**, `sx = d.x - camera`.
- Stage 1 complete: shell **`addXP(200)`** → **`STAGE_CUTSCENE`** (not straight to stage 2).

### Stage bridge — `StageCutscene2`

Path: `src/components/games/lesson2/StageCutscene2.tsx`

- Two panels (**~4s** each or Space / dialogue advance); NOVA warning then CHAOS_BOT (large **`ChaosBotCharacter`**, idle glitch); **`onComplete` → `STAGE_2`**.

### Boss intro

Two-step `DialogueBox`: NOVA then CHAOS_BOT (“Time Corruptor”).

### Boss — `BossBattleLesson2`

Separate boss fight module (quiz-shields / timeline locks per original design).

### Victory — `VictoryScreenLesson2`

XP summary + continue to quiz via parent `onComplete(xpEarned)` from shell.

**HUD:** Health, ammo, wanted stars, mute, exit. District **2 — History Vault**.

### Lesson 2 — code reference (high level)

**`src/components/games/lesson2/gameTypes.ts`** — game state union includes the new steps:

```ts
export type GameStateLesson2 =
  | "LOADING"
  | "CINEMATIC_INTRO"
  | "NPC_EXPLORE"
  | "STAGE_1"
  | "STAGE_CUTSCENE"
  | "STAGE_2"
  | "BOSS_INTRO"
  | "BOSS_BATTLE"
  | "VICTORY"
  | "COMPLETE";
```

**`GameShell2.tsx`** (behavioral wiring):

- After cinematic: `transitionTo("NPC_EXPLORE")` → `<NPCExploreZone2 onComplete={() => transitionTo("STAGE_1")} onXP={addXP} />`.
- After stage 1: `transitionTo("STAGE_CUTSCENE")` → `<StageCutscene2 onComplete={() => transitionTo("STAGE_2")} />`.

**`src/lib/demo-db.ts`** — token match uses normalization:

```ts
export function normalizeDemoToken(token: string): string {
  return token.trim().toLowerCase();
}

export function getDemoUserByToken(token: string): DemoUser | null {
  const want = normalizeDemoToken(token);
  if (!want) return null;
  return (
    readUsers().find((u) => normalizeDemoToken(u.demoToken) === want) ?? null
  );
}
```

---

## 11a. Shared NOVA character (`NovaCharacter`)

Path: **`src/components/games/shared/NovaCharacter.tsx`** (imported by lesson 2 UI and other shells as needed).

**Visual spec (current):**

- **Head fill:** `linear-gradient(135deg, #1a1a2e, #0f3460)` (dark blue; not pink/red).
- **Head border:** **`#fbbf24`** (gold); warning expression pulses gold shadow/border, not red fill.
- **Antenna tip:** **`#fbbf24`** with gold glow.
- **Eyes:** Cyan **`#22d3ee`**, **`box-shadow: 0 0 6px #22d3ee`** (no dark pupil disks).
- **Side panels:** Gold border / inset glow; **gold** indicator dots (not cyan).
- **Mouth LEDs / orbit accents:** Gold-leaning palette to match trim; celebrate mode keeps stronger purple/cyan pulse where intended.

Props: `expression`, optional `size` (scale multiplier).

---

## 12. Games — Lesson 3 (`GameShell3`)

**Shell:** `src/components/games/lesson3/GameShell3.tsx`

**States:** `LOADING` → `CINEMATIC_INTRO` → `STAGE_1` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

**Note:** **Stage 2 of the divide platformer was removed** for demo simplicity; one **`DivideStage`** then boss.

### Cinematic — `CinematicIntro3`

Panels introducing Human vs AI / The Divide.

### Stage — `DivideStage`

- Canvas + **`AXCharacter`** overlay.
- Two halves of city (warm / cool), **purple divide** line, platforms, **4 challenge zones** (2 human-side, 2 AI-side).
- **H / A** toggle **Human** vs **AI** mode (HUD pill + NOVA).
- Enter correct zone in correct mode → **`DecisionGate`** modals (mini puzzles).
- Wrong mode → **warning text**, no HP drain for wrong zone.
- **4 zones done** → NOVA dialogue → **go to center** (arrow) → touch center → **`onComplete`** → shell adds **500 XP** → **`BOSS_INTRO`**.
- Progress: **Zones ●●○○**; bottom **instruction banner**; **Shift+Enter** dev skip to end of divide (hands off to boss path).

### Boss intro

NOVA + Chaos bot dialogue scenes.

### Boss — `BossBattle3`

- **Briefing overlay** (5s countdown): controls, orange vs blue projectile rules, HUD.
- **Divide Keeper** boss: split orange/teal sprite, HP bar, phased gameplay (split phases, merged phase), projectiles labeled **H** / **A**.
- AX **44×64**; mode pill on canvas; wrong-hit feedback; **Shift+Enter** dev skip (if still present).
- Win → `VictoryScreen` (District 3 theming).

**HUD:** Dynamic warm/cool bar; **Mode pill** during stage + boss; **“THE DIVIDE — UNITE THE CITY”**.

---

## 13. Games — Lesson 4 (`GameShell4`)

**Shell:** `src/components/games/lesson4/GameShell4.tsx`

**States:** `LOADING` → `CINEMATIC_INTRO` → `STAGE_1` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

**Shared:** Copied from lesson2: `useSoundEngine`, `LoadingScreen`, `AXCharacter`, `NovaCharacter` (`shared/`), `DialogueBox`; lesson-specific `VictoryScreen`.

### Cinematic — `CinematicIntro4`

Five panels: three AI zones (Narrow / General / Super), enemy silhouettes, NOVA brief, ammo legend (1/2/3), district title.

### Stage — `TypeHunterStage`

- Side-scroller; **ammo types:** `narrow | general | super | null`.
- **Keys 1/2/3** select ammo; **Z** fires. Projectiles differ (size, trail, glow for super).
- **12 enemies** in four groups (mix of types), tags (e.g. narrow: Spam Filter / Chess Bot / …).
- Wrong ammo → **bounce** toward player; colored **hint** text; correct → particles + **NOVA** toast.
- **Two gates:** quiz modals at approximate **x≈600** and **x≈1400** (must answer correctly to continue; wrong costs HP).
- Win when **all enemies dead** and **both gates** cleared → shell transitions (+**450 XP** on stage complete + combat XP along the way).

### Boss intro — `BossIntro4`

Short NOVA `DialogueBox` before **THE UNDEFINED**.

### Boss — `BossBattle4`

- **Briefing** + countdown; boss cycles type every **60 frames** in a **180-frame** loop (Narrow → General → Super); segmented body highlights active phase.
- Player must match **ammo to current phase** to reduce **9 HP**.
- Attacks: beam (jump over), spread shots, super combo + ground shock.
- Victory → long **NOVA** dialogue in `DialogueBox` (demo completion message).

### Victory — `VictoryScreen` (lesson4)

Confetti + XP + NOVA line + **Continue to quiz**.

**HUD:** **CLASSIFICATION ARENA**; **ammo readout** (none / NARROW / GENERAL / SUPER); bottom control strip.

---

## 14. Audio

Each lesson’s `useSoundEngine.ts` loads from **`/public/sounds/`**:

- **Background:** e.g. `district1-bg.mp3` (loop).
- **One-shots:** `correct`, `wrong`, `victory`, `shoot`, `jump`, `enemyHit`, `bossHit`, `playerHit`, `gateOpen`, etc.

Missing files fail silently in try/catch.

---

## 15. Key UX & pedagogy themes by “district”

| Lesson | Theme | Player fantasy |
|--------|--------|----------------|
| 1 | What is AI? | Watch + quiz only |
| 2 | History timeline | Restore erased milestones; defeat Time Corruptor |
| 3 | Human vs AI | Mode-switch polarity; unite The Divide |
| 4 | AI taxonomy | Classify Narrow / General / Super; boss “Undefined” cycles types |

---

## 16. Completion & monetization surface

**`/demo/complete`** (`src/app/demo/complete/page.tsx`):

- Guard: **`demoCompleted`** must be true else redirect to `/demo`.
- Confetti, **jsPDF** “badge” certificate download.
- **Payment UI** (UPI / card / etc.) — presentation-layer flow with local state (`paymentSuccess`), not a live payment processor in-repo.

---

## 17. Development

```bash
npm install
npm run dev      # default :3000; if busy, Next tries 3001, 3002, …
npm run build
npm run start
npm run lint
```

**Clean build cache (required when chunks go missing):** If you see errors like **`Cannot find module './994.js'`** under `.next/server`, stop the dev server, delete **`.next`**, then **`npm run dev`** or **`npm run build`** again. Stale or concurrent builds often cause webpack chunk mismatches.

```powershell
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run dev
```

**Demo token / API:** Always open the app on the **same origin and port** Next prints (e.g. `http://localhost:3003`). Hitting `:3000` while the app runs on `:3003` loads a different process and tokens from `demo-users.json` will not match.

**Games:** Prefer a clean **`.next`** after large refactors.

**Testing a user:** Use `POST /api/demo/register` or maintain **`presetToken`** in request body; inspect **`data/demo-users.json`**. Use a **`demoToken`** value exactly as stored (normalization handles trim/lowercase).

---

## 18. Conventions & extension points

- **New lesson:** Add to **`LESSONS`** in `lesson/[id]/page.tsx` + dashboard **`LESSONS`** in `demo/page.tsx`; wire `gameActive && lessonId === n` shell; bump progress logic if program length changes.
- **New game shell:** Mirror `GameShell3`/`4`; export `onComplete(xp)` and `onExit()`; dynamic import with **`ssr: false`** if using canvas/window keys.
- **XP:** Lesson results should remain consistent with **additive** `POST /api/demo/progress` behavior.
- **Unlock:** Tied to **`lessonsComplete`** containing previous id; progress endpoint currently pushes ids on each completion — ensure ordering matches product rules.

---

## 19. Glossary

- **AX:** Player avatar name across games.
- **NOVA:** Guide character (dialogue).
- **Chaos Bot / Time Corruptor / Divide Keeper / The Undefined:** Antagonists per lesson.
- **Token:** `demoToken` string; not a JWT.
- **GAME_BONUS_XP:** Flat +200 for finishing embedded game before quiz (lessons with games).

---

*Last updated: Lesson 2 History Vault flow (NPC explore, stage cutscene, timeline rain), shared NOVA palette, cinematic panel layout + `DialogueBox` docking, demo token normalization, and dev troubleshooting (`.next` chunks / port mismatch). Maintain this file alongside functional changes.*
