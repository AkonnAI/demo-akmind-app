# AKMIND Demo App — Project Bible

This document is the **single source of truth** for **demo-akmind-app**: what it does, how it is built, every lesson, every game, APIs, data, and operational details. Update this file when you change flows, content, or architecture.

---

## 0. Latest Updates (Mar 2026)

Recent production-facing changes implemented in this repository:

- **Mobile-first dashboard and lesson UX refresh**
  - Dashboard hero redesign, improved lesson cards, progress rail, daily tip card, and bottom nav on mobile.
  - Lesson page interactions optimized for touch: larger quiz targets, stacked mobile layouts, and responsive stage/flow cards.
  - Complete page mobile layout tightened (badge card sizing, stacked CTAs, full-screen style payment modal on mobile).

- **Game mobile controls**
  - Added shared touch overlay controls in `src/components/games/shared/GameTouchControls.tsx`.
  - Wired controls into `GameShell2`, `GameShell3`, and `GameShell4`.
  - Added mode/ammo touch rows for lessons 3/4 and boss quiz shortcuts where required.

- **Lesson content flow change**
  - Removed YouTube embed dependency from lesson screens in active flow.
  - Added animated **"Video Uploading Soon"** placeholder panel.
  - Removed 10-second watch gate; users can continue immediately to game/quiz.

- **Admin QA/testing access improvements**
  - Admin tester identity (email `admin@akmind.com` or name `Admin`) can bypass lesson lock progression and open any game/lesson for testing.
  - Admin login screen is password-gated and uses session storage persistence.

- **Security and API hardening**
  - Added rate limiting utilities and route enforcement on demo endpoints.
  - Added Zod validation + sanitization for registration/progress input paths.
  - Added timing-safe token comparison + delayed invalid token response behavior.
  - Added CORS and payload-size checks in middleware for API routes.
  - Added hardened security headers in `next.config.ts`.

- **Storage/concurrency upgrade path**
  - `src/lib/demo-db.ts` supports DynamoDB mode (`USE_DYNAMODB=true`) and local JSON fallback.
  - Added DynamoDB diagnostics and environment/table fallback support for production troubleshooting.
  - Booking-side integration was updated in `akmind-master` so parent registration can create demo users directly in shared DynamoDB.

- **Gameplay stability fixes (History Vault / lesson 2)**
  - Fixed stale-loop closure behavior in `TimelineStage` by moving loop-time callbacks to refs (`onUpdateGameDataRef`, `onCompleteRef`, `playSoundRef`, `onXPRef`).
  - This stabilizes platform landing outcomes, health updates, and timeline completion behavior under long-running animation loops.

---

## 1. What this project is

**demo-akmind-app** is a **Next.js 15** web application for the **AKMIND** brand. It delivers a **guided demo "class"** for kids (parent registers → receives a magic link → child progresses through **4 lessons** with **video**, optional **story games**, **quizzes**, **XP**, and a **completion** experience including badge PDF and upsell UI).

**Product goals (as implemented):**

- One-time demo per email (enforced at registration).
- Token-based access to `/demo/**` (no full user accounts in this repo).
- Local JSON "database" for demo users (`data/demo-users.json`).
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
│   │   ├── admin/
│   │   │   └── page.tsx         # Admin dashboard (view users, progress stats)
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
│   │       ├── check/route.ts
│   │       └── admin/route.ts   # Admin API: list users, reset progress
│   ├── components/games/
│   │   ├── shared/
│   │   │   ├── AXCharacter.tsx  # Master player avatar (all lessons)
│   │   │   └── NovaCharacter.tsx# Master guide character (all lessons)
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

**Token lookup (normalization):** `normalizeDemoToken()` in `demo-db.ts` trims and lowercases tokens for comparisons. `createDemoUser` stores tokens normalized. `GET /api/demo/user` trims the query `token`. This avoids "invalid token" when pasting mixed case or stray spaces.

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

### `GET /api/demo/admin` (admin only)

Returns full user list (all fields) for the admin dashboard. Protected by admin key header.

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
| `/admin` | Admin panel: user list, lesson progress, XP, quiz scores |

**Middleware:** All **`/demo/**`** require token (query or cookie).

---

## 10. Lesson catalog (content + quiz + game)

Content is primarily defined in **`src/app/demo/lesson/[id]/page.tsx`** (`LESSONS` constant). Dashboard copy is duplicated per lesson in **`src/app/demo/page.tsx`** (`LESSONS` array for UI metadata).

### Lesson 1 — Welcome to Artificial Intelligence

- **Type:** Live recording (~15 min in UI).
- **Video:** YouTube embed `ad79nYk2keg`.
- **`hasGame`:** `false`.
- **`xpReward` (quiz base):** 100 (scaled by quiz accuracy in results).
- **Flow:** Video → auto "watched" after 30s timer → Quiz → Results → marks lesson done on progress post.
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
- **Quiz:** 5 questions (assistants, AGI, AGI definition, today's AI, super AI).

### Quiz UX

- **Option buttons:** `text-slate-800 font-medium` by default (dark, readable); hover shifts to `indigo-50` background + `indigo-700` text; correct → `green-500` border + `green-50` bg; wrong pick → `red-500` border + `red-50` bg.
- **`quizXpFromAccuracy`:** 100% → full `xpReward`; ≥80% → 90%; ≥60% → 70%; else 50%.
- **Total XP posted** on results: **`quizXp + (GAME_BONUS_XP if game complete)`** (200 bonus).
- **`POST /api/demo/progress`** **adds** that total to stored **`xp`** (cumulative across lessons).

### After lesson 4

- **`phase === 'complete'`** on lesson page: after ~3s, redirect **`/demo/complete`** if `lessonId >= 4`, else **`/demo`**.

---

## 11. Shared Character Components

### AXCharacter (`src/components/games/shared/AXCharacter.tsx`)

Master player avatar used by all three game lessons (lesson2, lesson3, lesson4). All lesson-specific copies have been deleted.

**Visual spec:**
- Container: **44×68px** base, `overflow: visible` (legs extend ~20px below).
- CSS keyframe animations injected via `<style>` tag: `ax-leftleg`, `ax-rightleg`, `ax-leftarm`, `ax-rightarm`, `ax-bodybob`, `ax-idle`, `ax-hitshake`, `ax-hitflash`, `ax-celebrate`, `ax-armup`, `ax-legkick-l/r`.
- Three-layer wrapper: outer layout div → mirror wrapper (scaleX for facing, `transformOrigin` at horizontal center) → scale wrapper → animation wrapper.

**Props:**

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `animation` | `"idle"\|"walk"\|"jump"\|"celebrate"\|"hit"` | required | Active animation state |
| `facing` | `"left"\|"right"` | `"right"` | Character direction; uses `scaleX(-1)` mirror internally |
| `size` | `number` | `1` | Scale multiplier (e.g. `1.1`, `1.6`) |
| `glowColor` | `string` | `"rgba(99,102,241,0.5)"` | Ambient glow under character |

**Usage in game loops:**
- Track `axAnim` and `axFacing` state with refs (`lastAnimRef`, `lastFacingRef`).
- Use `queueMicrotask(() => setState(value))` inside `requestAnimationFrame` loops to batch updates without blocking.
- For canvas-based games: position an absolutely-placed HTML overlay div via `ref.style.transform = translate(sx, sy)` — no re-render per frame.
- Remove any external `scaleX` from wrapper divs; `facing` prop handles direction internally.

### NovaCharacter (`src/components/games/shared/NovaCharacter.tsx`)

Master guide/narrator character used by all three game lessons. All lesson-specific copies have been deleted.

**Visual spec (holographic robot head):**
- Antenna with gold tip + `nova-antenna-ping` pulse animation.
- Head: `linear-gradient(135deg, #1a1a2e, #0f3460)` fill; **`#fbbf24`** (gold) border.
- Scanline overlay inside head (subtle `repeating-linear-gradient`).
- Cyan visor strip with `nova-visor-flicker` animation.
- **Hexagon eyes:** `clipPath: polygon(25% 0%, 75% 0%, 100% 50%, ...)`, color `#22d3ee`; inner highlight circle.
- **LED mouth:** 3 LED dots driven by `tick` state (180ms `setInterval`); `getLed(col, expression, tick)` returns gold `#fbbf24` or dim `rgba(251,191,36,0.2)` based on animated pattern rows per expression.
- **Side panels:** gold border/inset glow; 3 indicator dots per panel that sequence via `tick % 3`.
- **Neck connector** at bottom.
- **3 orbital sparkles:** `nova-orbit` CSS keyframe with staggered `animation-delay` offsets.
- Float animation: Framer Motion `y: [0, -8*size, 0]`, 2.5s loop.

**Props:**

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `expression` | `"idle"\|"happy"\|"explaining"\|"warning"\|"celebrating"` | required | Drives LED mouth pattern, eye/sparkle color, head animation |
| `size` | `number` | `1` | Scale multiplier |

**Expression behavior:**
- `warning`: `nova-warn-blink` pulses gold border shadow; eyes flicker with `nova-visor-flicker`.
- `celebrating`: `nova-celebrate-pulse` cyan/indigo box-shadow; purple eyes + sparkles.
- `idle/explaining/happy`: standard cyan palette; continuous LED mouth cycling.

---

## 11a. Games — Lesson 2 (`GameShell2`)

**Shell:** `src/components/games/lesson2/GameShell2.tsx`

**States (`gameTypes.ts`):**
`LOADING` → `CINEMATIC_INTRO` → **`NPC_EXPLORE`** → `STAGE_1` → **`STAGE_CUTSCENE`** → `STAGE_2` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

**Shared pieces:** `LoadingScreen`, `CinematicIntro2`, **`NPCExploreZone2`**, **`StageCutscene2`**, `TimelineStage`, `BossBattleLesson2`, `VictoryScreenLesson2`, `DialogueBox`, `shared/NovaCharacter`, `ChaosBotCharacter`, `useSoundEngine`.

### `DialogueBox` (lesson 2)

Path: `src/components/games/lesson2/DialogueBox.tsx`

| Prop | Purpose |
|------|---------|
| `character` | `"NOVA"\|"AX"\|"CHAOS_BOT"\|"DATA_PHANTOM"\|"OVERFIT_MONSTER"\|"BLANK_SLATE"\|"NARRATOR"` — drives portrait color + label |
| `text` | Dialogue string; typewriter effect (25ms/char) unless `startFull` |
| `onComplete` | Called when Space/click in `done` phase |
| `startFull?` | Skip typewriter; show full text immediately (cinematics) |
| `dock?` | `"viewport"` (default): `position: fixed`, height 160. `"panel"`: `position: absolute`, height 200, sits inside cinematic column layout |

### Cinematic (`CinematicIntro2`)

Path: `src/components/games/lesson2/CinematicIntro2.tsx`

**Layout:** Each panel is a flex column (`min-height: 100vh`, `justifyContent: space-between`): upper `flex: 1` stage area (characters/props), lower **200px** `PANEL_DIALOGUE_SLOT` with `DialogueBox dock="panel"`. `CaptionBox` and `SpeechBubble` helpers have been removed; all narration goes through `DialogueBox`.

**Shared decorators (all panels):**
- `Stars` — static star field (z-index 1).
- `FloatParticles` — 15 gold dots (`ci2-float-up` CSS, staggered delays).
- `AmberRiseParticles` — 10 smaller ember dots that float upward and fade (`ci2-amber-rise`), used on the clock panel.
- `Scanlines` — `repeating-linear-gradient` overlay, `ci2-scanline` shift animation (z-index 5).

**Panel breakdown:**

| Panel | Background | Stage content | DialogueBox character |
|-------|-----------|--------------|----------------------|
| 0 | `linear-gradient(165deg, #3d2b1f, #1a0a00, #0d0d24)` | `CitySkyline stripBottom={200}` — SVG 12-building amber skyline with window grids and antennas | NARRATOR |
| 1 | `radial-gradient(ellipse at center, #2e1a0a, #0d0d24)` | `ChaosBotCharacter animation="roar" size={2.4}` | NARRATOR |
| 2 | `radial-gradient(circle at center, rgba(120,53,15,0.4), #050510)` | NOVA `left:25%` / `size={0.9}` + `RotatingClock` `left:75%` | NOVA |
| 3 | `radial-gradient(ellipse at center, #2d1b0a, #070712)` | AX + NOVA centered, `size={0.8}` | NOVA |
| 4 | `linear-gradient(180deg, #1a0a00, #0d0d24)` | `NeonDistrictSign` at top, AX + platform stub at bottom-left | AX |

**`CitySkyline`:** SVG `viewBox="0 0 700 200"`, `preserveAspectRatio="xMidYMax slice"`. 12 buildings with `#1e1206`/`#160e04`/`#1a1108` fills, `#78350f` stroke, antenna lines, amber `#fde68a` windows (every 5th window unlit). City glow radial gradient behind.

**`RotatingClock`:** Pure SVG (`180×180`). Hands are SVG `<line>` elements from center `(90,90)` with `style={{ transformOrigin: "90px 90px", animation: "ci2-clock-hour/minute ..." }}`. CSS keyframes use plain `rotate(0deg)` → `rotate(360deg)` (no translate). Hour hand spins at 60s; minute hand at 10s. Quarter/full-hour ticks have `strokeWidth={4}`, others `strokeWidth={2}`.

**`NeonDistrictSign`:** Bordered div with `ci2-neon-pulse` flicker animation on the gold "DISTRICT 2" title text.

### NPC pre-mission — `NPCExploreZone2`

Path: `src/components/games/lesson2/NPCExploreZone2.tsx`

**Canvas scene:**
- **Sky + background:** `linear-gradient` sky; two layers of parallax amber city silhouettes (opacity 0.35 / 0.45).
- **Amber rain:** 60 streaks in world space, `rgba(251,191,36,0.15)` stroke, reset at top when off-screen.
- **Ground glow line:** 6px `linear-gradient(to bottom, rgba(251,191,36,0.5), transparent)` at `groundTop`.
- **Grid:** Vertical amber grid lines on ground at 48px intervals.
- **Ember particles:** Up to 20 `Ember` objects (`x, y, vy, vx, life, maxLife, size`) spawned every 4 frames from ground level. Rise with slight horizontal drift; alpha fade in/out over their lifetime. Color transitions from `#fbbf24` to `#f97316` past 50% life. Drawn with `shadowBlur: 4`.

**NPC rendering (`drawNpc`):**
- **Ground glow:** Radial gradient ellipse beneath each NPC, color tied to `npc.body`.
- **Shadow blur** via `ctx.shadowColor = n.head; ctx.shadowBlur = 8` during body/head draw.
- **Body/head:** RoundRect with `n.body` / `n.head` fill (22×30 body, 18×18 head).
- **Visor strip:** Semi-transparent black bar across upper head.
- **Eyes:** Two `ctx.arc` circles in `n.eyeColor` (NPC-specific: green / purple / orange-tinted).
- **Antenna:** Line + tip circle in `n.head` color.
- **Name plate:** Dark rect + `n.head`-colored monospace text above head.

**NPC data** (`NPCS` array): Each NPC now has an `eyeColor` field alongside `body`, `head`.

**AXCharacter overlay:**
- AX is **no longer drawn on canvas** (removed the `ctx.fillRect` blue rectangle).
- An absolutely-positioned `<div ref={axOverlayRef}>` wraps `<AXCharacter animation={axAnim} facing={axFacing} size={1} />`.
- Positioned via direct DOM: `axOverlayRef.current.style.transform = translate(${sax}px, ${ax.y}px)` inside the rAF loop — **no React re-render per frame**.
- `axAnim` / `axFacing` state updated via `queueMicrotask` with ref guards (`lastAnimRef`, `lastFacingRef`) only when value changes.

**NPC/NOVA dialogue overlap fix:**
- `tryDoorEnter` now clears `nearNpcIdRef.current = null` and calls `setActiveNpc(null)` before a **300ms `setTimeout`** that triggers `setShowMissionNova(true)`. Prevents the NPC speech bubble from showing simultaneously with the NOVA `DialogueBox`.

**Physics / collectibles / door:** Unchanged from original — GRAVITY 0.6, JUMP_VY -14, MOVE_SPD 2.8, 3 collectibles (+15 XP each), door at x=1100 with cyan glow + animated arrow.

### Stages 1 & 2 — `TimelineStage`

Path: `src/components/games/lesson2/TimelineStage.tsx`

**Physics constants (updated):**
- `GRAVITY = 0.55` (was 0.6)
- `JUMP_VY = -12` (was -14)

**Platform heights:** All platforms capped at **max 160px** above ground. Previous layout placed some platforms unreachably high.

**New mechanics:**

#### Moving Platforms (3)
- Interface: `MovingPlat { id, x, baseX, y, w, h, range, speed, dir }`
- Oscillate horizontally: `x = baseX + Math.sin(fr * 0.02) * range`.
- AX carries with platform when standing: `ax.x += mp.speed * mp.dir * …` (AX follows movement).
- Visually distinct: cyan border, darker fill.

#### Crumbling Platforms (2)
- Extended `TPlat` with: `crumble?, crumbleTimer?, crumbling?, crumbleOrigY?, crumbleRespawnTimer?`
- State machine: normal → shake (`crumbleTimer > 0` after AX lands) → crumble (fall, `crumbleOrigY` stored) → respawn (after 150 frames, reset to original Y).
- Visual: crack marks drawn when `crumbleTimer > 0`; orange tint when crumbling.

#### Time Bubbles (4 floating enemies)
- Interface: `TimeBubble { id, x, baseY, year, frozen, frozenTimer, dead }`
- Wrong years: `"3000 BC"`, `"1850 AD"`, `"2099 AD"`, `"4001 AD"`.
- Float via `Math.sin(fr * 0.03) * 30` vertical oscillation.
- AX collision → bubble frozen (visual pulse), +20 XP, bubble fades then respawns.
- Drawn as pulsing circles with year text label.

**AX rendering:**
- No external `scaleX` wrapper; facing handled by `AXCharacter facing` prop.
- `axAnim` / `axFacing` tracked via refs + `queueMicrotask` state updates.
- AX positioned: `translate(${sx}px, ${ax.y}px)` (fixed from original `ax.y + AX_H` bug that placed top at ground level).

### Stage bridge — `StageCutscene2`

Path: `src/components/games/lesson2/StageCutscene2.tsx`

Two panels (~4s each or Space/dialogue advance); NOVA warning then CHAOS_BOT (`ChaosBotCharacter`, idle glitch); `onComplete → STAGE_2`.

### Boss — `BossBattleLesson2`

Path: `src/components/games/lesson2/BossBattleLesson2.tsx`

**Taunt system (new):**
- `showTaunt(character, text)` `useCallback` — sets `taunt` state, auto-dismisses after 4000ms via `tauntTimerRef`.
- `TauntBanner`: `AnimatePresence` overlay (Framer Motion slide in/out), red border, monospace text.
- **3 triggered taunts:**
  1. **Start** (800ms delay on mount): `"You think HISTORY matters?! I AM THE FUTURE! And the future has no memory!"`
  2. **Phase 2** (`hp ≤ 6`, `phase === 1`): `"Impossible! You actually remember these dates?! Let me make you FORGET!"`
  3. **Phase 3** (`hp ≤ 3`, `phase === 2`): `"STOP! If you restore history... everyone will know I was just a buggy prototype! PLEASE!"`
- Phase transitions also fire `playSound("gateOpen")`.

**NOVA defeat dialogue (updated):** `"The timeline is restored! Every milestone matters — from Turing's dream to today's AI revolution. History is saved, AX!"`

### Victory — `VictoryScreenLesson2`

XP summary + continue to quiz via parent `onComplete(xpEarned)` from shell.

**HUD:** Health, ammo, wanted stars, mute, exit. District **2 — History Vault**.

---

## 12. Games — Lesson 3 (`GameShell3`)

**Shell:** `src/components/games/lesson3/GameShell3.tsx`

**States:** `LOADING` → `CINEMATIC_INTRO` → `STAGE_1` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

**Note:** Stage 2 of the divide platformer was removed for demo simplicity; one `DivideStage` then boss.

### Cinematic — `CinematicIntro3`

Panels introducing Human vs AI / The Divide. Imports `AXCharacter` and `NovaCharacter` from `shared/`.

### Stage — `DivideStage`

- Canvas + `AXCharacter` overlay (shared).
- `axFacing` state tracked with `lastFacingRef`; external `scaleX` removed.
- Two halves of city (warm / cool), purple divide line, platforms, 4 challenge zones.
- **H / A** toggle Human vs AI mode (HUD pill + NOVA).
- Enter correct zone in correct mode → `DecisionGate` modals (mini puzzles).
- Wrong mode → warning text, no HP drain.
- 4 zones done → NOVA dialogue → go to center → touch center → `onComplete` → shell adds 500 XP → `BOSS_INTRO`.

### Boss — `BossBattle3`

Divide Keeper boss: split orange/teal sprite, HP bar, phased gameplay, projectiles labeled H/A. Victory → `VictoryScreen` (District 3 theming).

**HUD:** Dynamic warm/cool bar; mode pill during stage + boss; **"THE DIVIDE — UNITE THE CITY"**.

---

## 13. Games — Lesson 4 (`GameShell4`)

**Shell:** `src/components/games/lesson4/GameShell4.tsx`

**States:** `LOADING` → `CINEMATIC_INTRO` → `STAGE_1` → `BOSS_INTRO` → `BOSS_BATTLE` → `VICTORY` → `COMPLETE`.

### Cinematic — `CinematicIntro4`

Five panels: three AI zones (Narrow / General / Super), enemy silhouettes, NOVA brief, ammo legend, district title. Imports `NovaCharacter` from `shared/`.

### Stage — `TypeHunterStage`

- Side-scroller; ammo types: `narrow | general | super | null`.
- Physics: `GRAVITY = 0.55`, `JUMP_VY = -12`; platforms capped at **max 130px** above ground.
- `axAnim` tracks `"idle"|"walk"|"jump"|"hit"`; `invTimer` on ax ref (30 frames after bounced projectile hit).
- `axFacing` state with ref guard; no external `scaleX` on wrapper.
- Keys 1/2/3 select ammo; Z fires. Wrong ammo → bounce; correct → particles + NOVA toast.
- Two gates: quiz modals at x≈600 and x≈1400.
- Win when all enemies dead + both gates cleared.

### Boss — `BossBattle4`

Briefing + countdown; boss cycles type every 60 frames (Narrow → General → Super); match ammo to current phase to reduce 9 HP. Attacks: beam, spread shots, super combo + ground shock.

### Victory — `VictoryScreen` (lesson4)

Confetti + XP + NOVA line + Continue to quiz.

**HUD:** CLASSIFICATION ARENA; ammo readout; bottom control strip.

---

## 14. Audio

Each lesson's `useSoundEngine.ts` loads from **`/public/sounds/`**:

- **Background music:** `district2-bg.mp3`, `district3-bg.mp3`, `district4-bg.mp3` (looped).
- **One-shots:** `correct.mp3`, `wrong.mp3`, `victory.mp3`, `shoot.mp3`, `jump.mp3`, `enemyHit.mp3`, `bossHit.mp3`, `gateOpen.mp3`, `checkpoint.mp3`, `coin.mp3`.

Missing files fail silently in try/catch. `useSoundEngine` exposes `playSound(key)`, `playBgMusic()`, `stopBgMusic()`, `toggleMute()`, `isMuted`.

---

## 15. Key UX & pedagogy themes by "district"

| Lesson | Theme | Player fantasy |
|--------|--------|----------------|
| 1 | What is AI? | Watch + quiz only |
| 2 | History timeline | Restore erased milestones; defeat Time Corruptor |
| 3 | Human vs AI | Mode-switch polarity; unite The Divide |
| 4 | AI taxonomy | Classify Narrow / General / Super; boss "Undefined" cycles types |

---

## 16. Completion & monetization surface

**`/demo/complete`** (`src/app/demo/complete/page.tsx`):

- Guard: **`demoCompleted`** must be true else redirect to `/demo`.
- Confetti, **jsPDF** "badge" certificate download.
- **Payment UI** (UPI / card / etc.) — presentation-layer flow with local state (`paymentSuccess`), not a live payment processor in-repo.

---

## 17. Admin panel

**Route:** `/admin` (`src/app/admin/page.tsx`)
**API:** `GET /api/demo/admin` (`src/app/api/demo/admin/route.ts`)

- Displays all registered demo users: name, email, child name, XP, lessons complete, quiz scores, badge status.
- Protected by admin key (header or env check — see route implementation).
- Does not require `demoCompleted`; accessible independently from the demo token flow.

---

## 18. Development

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

**Games:** Prefer a clean **`.next`** after large refactors or after deleting/renaming component files.

**Testing a user:** Use `POST /api/demo/register` or maintain **`presetToken`** in request body; inspect **`data/demo-users.json`**. Use a **`demoToken`** value exactly as stored (normalization handles trim/lowercase).

**ESLint in game loops:** Next.js treats ESLint errors as build failures. Common issues in rAF loops:
- `react-hooks/exhaustive-deps` — add all functions referenced inside `useEffect` to the dep array; use `useCallback` + stable refs.
- `@typescript-eslint/no-unused-vars` — delete orphaned refs immediately when refactoring.

---

## 19. Conventions & extension points

- **New lesson:** Add to **`LESSONS`** in `lesson/[id]/page.tsx` + dashboard **`LESSONS`** in `demo/page.tsx`; wire `gameActive && lessonId === n` shell; bump progress logic if program length changes.
- **New game shell:** Mirror `GameShell3`/`4`; export `onComplete(xp)` and `onExit()`; dynamic import with **`ssr: false`** if using canvas/window keys.
- **New character:** Add to `src/components/games/shared/`; import via `@/components/games/shared/CharacterName`.
- **XP:** Lesson results should remain consistent with **additive** `POST /api/demo/progress` behavior.
- **Unlock:** Tied to **`lessonsComplete`** containing previous id; progress endpoint currently pushes ids on each completion — ensure ordering matches product rules.
- **AX in canvas games:** Use HTML overlay div + `ref.style.transform` for zero-re-render positioning; never draw AX as a canvas `fillRect`. Track `axAnim`/`axFacing` with refs + `queueMicrotask` guards.

---

## 20. Glossary

- **AX:** Player avatar name across games. Rendered by `shared/AXCharacter.tsx`.
- **NOVA:** Guide character (dialogue). Rendered by `shared/NovaCharacter.tsx`.
- **Chaos Bot / Time Corruptor / Divide Keeper / The Undefined:** Antagonists per lesson.
- **Token:** `demoToken` string; not a JWT.
- **GAME_BONUS_XP:** Flat +200 for finishing embedded game before quiz (lessons with games).
- **TauntBanner:** AnimatePresence overlay in BossBattleLesson2 that surfaces boss taunts at phase transitions.
- **Crumbling platform:** Platform that shakes then falls when AX stands on it, respawning after 150 frames.
- **Time Bubble:** Floating enemy in TimelineStage showing a wrong year; contact freezes + destroys it.
- **Moving platform:** Oscillating horizontal platform that carries AX when stood on.

---

*Last updated: Full visual overhaul — shared AXCharacter + NovaCharacter (holographic robot head), CinematicIntro2 rebuild (SVG skyline, SVG rotating clock, amber particles, scanlines, DialogueBox), NPCExploreZone2 rebuild (ember particles, ground glow, improved NPC rendering with glow/eyes/nameplates, AXCharacter HTML overlay, NPC→NOVA delay fix), TimelineStage mechanics (moving platforms, crumbling platforms, Time Bubbles, lowered heights, GRAVITY/JUMP_VY tuning), BossBattleLesson2 taunt system (3-phase TauntBanner), quiz option text brightened (slate-800 + indigo hover), admin panel added.*
