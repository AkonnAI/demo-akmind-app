# AKMIND Demo App — Project Bible

This document is the **single source of truth** for **demo-akmind-app**: what it does, how it is built, every lesson, every game, APIs, data, and operational details. Update this file when you change flows, content, or architecture.

---

## 0. Latest Updates (Apr–May 2026)

Canonical snapshot of what the demo does today — see later sections for deep dives.

### Dual demo programs (`course`)

- **`AI Explorers`** — demo lesson ids **`1`, `2`, `3`**. Full-screen game phase uses **`NeuropolisShell`** inside **`LandscapeWrapper`** (`dynamic(..., { ssr: false })`). **`bootstrapNeuropolisDemo`** wires canvas, **`DeviceManager`**, **`InputManager`**, **`TouchControls`** (`bypassDeviceGate: true`), boot/cinematic/game scenes for **`level`** **`1` \| `2` \| `3`**.
- **`AI Builders`** — demo lesson ids **`11`, `12`, `13`**. Game phase mounts **`Sim1Scene`**, **`Sim2Scene`**, or **`Sim3Scene`** from **`src/components/games/neuro-sim/sims/`** (Python-teaching simulations + Monaco-backed editing where applicable).
- **`AI Innovators`** appears on **`DemoUser`** / **`registerSchema`** for schema continuity; landing and admin switches focus on **Explorers vs Builders**.
- **`src/lib/demo-lesson-scope.ts`** defines valid ids, **`sanitizeDemoLessonsComplete`** (drops legacy ids such as old lesson **`4`**), and **`allDemoLessonsComplete`**: **`true`** when **either** **`[1,2,3]`** or **`[11,12,13]`** is fully complete — matching **`POST /api/demo/progress`** completion / badge logic.

### Registration, admin profile, Programs tab

- **`POST /api/demo/register`** accepts optional **`course`** (defaults **`AI Explorers`**).
- **`PATCH /api/demo/admin`** with **`{ course: "AI Explorers" \| "AI Builders" }`** updates the **persisted admin demo user** — shared by **`/admin`** (`course` picker + completion preview) and **`/demo/programs`** (cyberpunk shell with sidebar / bottom nav). **`DELETE /api/demo/admin`** resets that admin user’s progress fields.
- **`/demo/programs`** is **admin testers only** (`admin@akmind.com` or display name **`Admin`**); everyone else is redirected to **`/demo`**. It calls **`GET /api/demo/user?token=…`** and expects a **flat JSON profile** (same shape as **`DemoUser`**), including **`course`** and **`earnedBadges`** (defaults to **`[]`** if missing).

### Lesson video gates & CDN mapping

- **`VideoPlayer`** (`src/components/lesson/VideoPlayer.tsx`) streams MP4 from **`NEXT_PUBLIC_CDN_URL`** when set (**`lesson-videos.ts`**). Explorers ids **`1–3`** map to CDN folders **`lesson-2` … `lesson-4`** via **`cdnLessonFolderNumber`**; Builders **`11–13`** use **`lesson-11` … `lesson-13`**. Optional **`poster.jpg`** / **`captions.vtt`** per **`LESSON_VIDEOS`** meta.
- **Video gates:** **`MIN_LESSON_VIDEO_PLAY_SECONDS` (120)** real **`played`** time on **Explorers 1–3** and **Builders 11–13** drives **`enforceWatchThrough`** / **`minPlayedSeconds`** → **`pauseVideo`** + **`playbackLocked`** + amber upsell (**Continue to Game →**). **Admin testers** bypass **lesson-lock** screens (sequencing) but follow the same **`VideoPlayer`** props on gated ids unless you change `lesson/[id]/page.tsx`.
- Optional **`enforceWatchThrough`** without **`minPlayedSeconds`** still supports **`WATCH_PLAYED_THRESHOLD`** (~92%) legacy behavior elsewhere.

### Demo session cookie & user API rate limit (`src/lib/demo-session.ts`)

```typescript
export const DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
export const DEMO_USER_API_RATE_LIMIT_PER_MINUTE = 240;
```

- **`middleware.ts`** refreshes **`demo_token`** on every **`/demo/*`** hit using **`DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS`**.
- **`GET /api/demo/user`** rate-limits per IP via **`DEMO_USER_API_RATE_LIMIT_PER_MINUTE`**.

### NOVA (Groq) + optional ElevenLabs + browser voice

- **`POST /api/nova`**: Groq (**`llama-3.3-70b-versatile`** or **`GROQ_MODEL_ID`**), **`demoMemory`** Map, prompts enriched from **`lesson-content.ts`**, **`demo-nova-stats.ts`**. **`GET /api/nova`** returns **`groqConfigured`** / **`elevenConfigured`** hints (no secrets) — useful on Amplify.
- **`server-env.ts`** + **`next.config.ts` `env`** snapshot **bakes** **`GROQ_*`** and **`ELEVENLABS_*`** into the server bundle so **Amplify Lambda** sees keys at runtime (dynamic `process.env[key]` alone is insufficient).
- **`POST /api/nova/tts`** + **`GET /api/nova/tts`** — ElevenLabs MP3 when **`ELEVENLABS_API_KEY`** and **`ELEVENLABS_VOICE_ID`** are set.
- **`NOVAChat`** / **`useNOVAVoice`**: Web Speech API on secure origins; dashboard receives **`course`** for Builders-aware copy.

### Middleware, polish, infra

- **`/api/*`**: origin allowlist includes **same-origin** + **`https://akmind.com`** / **`www`** / **`demo.akmind.com`** / **`app.akmind.com`** (+ localhost); rejects oversized bodies (**10 KB** cap).
- **`MonacoErrorFilter`** (`src/app/layout.tsx`) quiets Monaco worker noise in dev.
- **`NOVAChat`** FAB **`suppressNovaChatFab`** during fullscreen game / XP overlay so taps reach canvas or sim UI.
- Cyberpunk glass UI (**`globals.css`**), mobile bottom nav (**`/demo`**, **`/demo/programs`**), **`GameTouchControls`**, DynamoDB (**`USE_DYNAMODB`**), timing-safe token compare, security headers — unchanged themes.

---

## 1. What this project is

**demo-akmind-app** is a **Next.js 15** web application for the **AKMIND** brand. It delivers a **guided demo "class"** for kids (parent registers → receives a magic link → child progresses through **one of two three-lesson tracks** — **AI Explorers** or **AI Builders** — with **video**, **embedded games**, **quizzes**, **XP**, badge slugs, and a **completion** experience including certificate PDF and upsell UI).

**Product goals (as implemented):**

- One-time demo per email (enforced at registration).
- Token-based access to `/demo/**` (no full user accounts in this repo).
- Each learner carries a **`course`** (**Explorers** vs **Builders**) chosen at registration (and adjustable for the **admin demo user** via **`/admin`** or **`/demo/programs`**).
- Local JSON "database" for demo users (`data/demo-users.json`), **or** AWS **DynamoDB** when `USE_DYNAMODB=true`.
- Optional Gmail SMTP to email demo links and notify admins.
- **Explorers:** lessons **1–3** — Neuropolis canvas story levels + quizzes.
- **Builders:** lessons **11–13** — neuro-sim Python teaching flows + quizzes.
- Heavy interaction shells load with `dynamic(..., { ssr: false })` (Neuropolis, neuro-sim, landscape wrapper).

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
| Storage | **Node `fs`** + JSON under `data/` **or** **DynamoDB** (`@aws-sdk/*`) |
| AI | **groq-sdk** — NOVA chat (`POST /api/nova`); optional **ElevenLabs** HTTP API (`POST /api/nova/tts`) |

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
│   │   │   └── page.tsx         # Dev panel: admin demo token, Explorers/Builders picker, completion preview
│   │   ├── demo/
│   │   │   ├── page.tsx         # Dashboard: course-aware lesson cards (1–3 or 11–13), XP, locks
│   │   │   ├── badges/
│   │   │   │   └── page.tsx     # Earned badges + catalog (DEMO_BADGES)
│   │   │   ├── programs/
│   │   │   │   └── page.tsx     # Admin testers: switch AI Explorers vs AI Builders (PATCH /api/demo/admin)
│   │   │   ├── complete-preview/
│   │   │   │   └── page.tsx     # Static celebrate preview (marketing / QA)
│   │   │   ├── complete/
│   │   │   │   └── page.tsx     # Post-program: certificate PDF, payment UI (mock flow)
│   │   │   └── lesson/[id]/
│   │   │       └── page.tsx     # VideoPlayer → Neuropolis (Explorers 1–3) OR neuro-sim (Builders 11–13) → quiz
│   │   └── api/
│   │       ├── nova/
│   │       │   ├── route.ts     # POST Groq chat; GET health (env visibility)
│   │       │   └── tts/route.ts # POST ElevenLabs TTS when configured
│   │       └── demo/
│   │           ├── register/route.ts
│   │           ├── user/route.ts
│   │           ├── progress/route.ts
│   │           ├── check/route.ts
│   │           └── admin/route.ts   # GET admin demo token URL; PATCH course; DELETE reset admin progress
│   ├── components/
│   │   ├── MonacoErrorFilter.tsx # Dev: suppress Monaco worker console noise
│   │   ├── NOVAChat.tsx         # Floating NOVA UI + voice controls
│   │   ├── NOVACharacter.tsx    # Chat/dashboard avatar (distinct from games/shared)
│   │   ├── NOVAVoiceButton.tsx
│   │   ├── lesson/
│   │   │   └── VideoPlayer.tsx  # S3 MP4; optional enforceWatchThrough + minPlayedSeconds
│   │   └── games/
│   │       ├── neuropolis/
│   │       │   └── NeuropolisShell.tsx  # bootstrapNeuropolisDemo mount + Exit portal
│   │       ├── neuro-sim/       # Builders embedded sims (Sim1–3 scenes, store, Monaco helpers)
│   │       ├── shared/          # LandscapeWrapper, AXCharacter, NovaCharacter, …
│   │       ├── lesson2/         # GameShell2… — legacy/alternate; live flow uses Neuropolis
│   │       ├── lesson3/
│   │       └── lesson4/
│   ├── neuropolis/              # Canvas demo engine (scenes, entities, TouchControls)
│   │   ├── bootstrapDemoLevel.ts
│   │   └── …
│   ├── hooks/
│   │   └── useNOVAVoice.ts      # SpeechRecognition + speechSynthesis
│   ├── lib/
│   │   ├── demo-session.ts      # Cookie max-age + GET /api/demo/user rate limit constants
│   │   ├── demo-db.ts           # JSON or DynamoDB persistence
│   │   ├── demo-lesson-scope.ts # Valid lesson ids 1–3 & 11–13; completion helpers
│   │   ├── demo-badges.ts       # DEMO_BADGES definitions + unlock conditions
│   │   ├── server-env.ts        # Amplify-safe env reads + build-time snapshot
│   │   ├── demo-nova-stats.ts   # Live XP/streak/badge stats for NOVA prompt
│   │   ├── lesson-content.ts    # Module/lesson summaries for NOVA context (Explorers + Builders keys)
│   │   ├── lesson-videos.ts     # CDN URLs + lesson video metadata + folder mapping
│   │   ├── email.ts             # sendDemoLink, sendAdminNotification
│   │   └── api-response.ts
│   ├── types/demo.ts            # Client-facing DemoUser shape (subset of DB)
│   └── middleware.ts            # /demo/* token gate + cookie; /api/* origin + payload guards
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
| `NEXT_PUBLIC_CDN_URL` | Public S3 base URL for lesson videos and posters. |
| `NEXT_PUBLIC_APP_URL` | Base URL embedded in demo emails (link: `?token=...`). |
| `NEXT_PUBLIC_LANDING_URL` | Main marketing site link (default `https://www.akmind.com`). |
| `GMAIL_USER` | SMTP from-address user. |
| `GMAIL_APP_PASSWORD` | Gmail app password for nodemailer. |
| `AKMIND_LOCAL_DB_PATH` | Optional; overrides `./data` root for JSON DB (see `demo-db.ts`). |
| `GROQ_API_KEY` | Groq API key for **`POST /api/nova`** (Amplify: add per branch + redeploy). |
| `GROQ_MODEL_ID` | Optional override for the Groq chat model id. |
| `ELEVENLABS_API_KEY` | Optional; enables **`POST /api/nova/tts`**. |
| `ELEVENLABS_VOICE_ID` | ElevenLabs voice id (paired with API key). |
| `ELEVENLABS_MODEL_ID` | Optional ElevenLabs model id for TTS. |
| `USE_DYNAMODB` | Set `true` to use DynamoDB instead of local JSON (production). |
| `AWS_REGION` | AWS region for DynamoDB client. |
| `DEMO_USERS_TABLE` | DynamoDB table name for demo users. |
| `ADMIN_PASSWORD` | Protects admin UI/API where implemented (see routes). |

**Client-exposed:** only variables prefixed with `NEXT_PUBLIC_`.

**Voice:** Browser Web Speech API requires a **secure context** on real devices — use **HTTPS** (e.g. production domain); `http://localhost` is exempt in the hook’s protocol check. Optional server-side speech uses ElevenLabs via **`POST /api/nova/tts`** when configured.

---

## 5. Authentication & access model

There is **no** session/JWT stack. Access is:

1. **Registration** creates a row in `demo-users.json` with a **`demoToken`** (16-char hex-like string by default).
2. User opens link: **`/?token=...`** → validated via **`GET /api/demo/user`**.
3. App navigates to **`/demo?token=...`**.
4. **`middleware.ts`** matches **`/demo/:path*`**:
   - Requires `token` query **or** `demo_token` cookie.
   - If missing → redirect **`/?error=no-token`**.
   - If token present but no cookie → sets **`demo_token`** cookie (**365 days** via `DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS` in `src/lib/demo-session.ts`, path `/`).

**Lesson unlock rule (course-aware):** Within a track, lesson **`n`** unlocks only after the previous id in that track is in **`lessonsComplete`** — **`2`** requires **`1`**, **`3`** requires **`2`**, **`12`** requires **`11`**, **`13`** requires **`12`**. **`1`** and **`11`** are always eligible. **`lesson/[id]/page.tsx`** also blocks mismatched ids (e.g. Builders user opening **`/demo/lesson/1`**).

**Middleware cookie refresh** (`src/middleware.ts`): every `/demo/*` hit extends `demo_token` using **`DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS`** from **`src/lib/demo-session.ts`**.

```typescript
import { DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS } from "@/lib/demo-session";

const res = NextResponse.next();
res.cookies.set("demo_token", token, {
  maxAge: DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});
return res;
```

---

## 6. Data model (`src/lib/demo-db.ts`)

Server-side **`DemoUser`** (persisted):

| Field | Meaning |
|-------|---------|
| `id` | UUID |
| `email`, `name`, `childName`, `phone` | Registration payload |
| `demoToken` | Secret link token |
| `course` | **`AI Explorers`** \| **`AI Builders`** \| **`AI Innovators`** — drives dashboard + lesson eligibility |
| `demoStarted`, `demoCompleted` | Flags |
| `lessonsComplete` | Finished lesson ids (**`1–3`** and/or **`11–13`** after sanitization — legacy **`4`** dropped) |
| `quizScores` | `Record<string, number>` keyed by lesson id string (percentage stored from UI) |
| `xp` | Running total; **incremented** on each `POST /api/demo/progress` |
| `badgeEarned` | `true` when **`allDemoLessonsComplete`** for the merged lesson list |
| `earnedBadges` | Slugs satisfied by **`DEMO_BADGES`** (`demo-badges.ts`) |
| `createdAt` | ISO timestamp |

**Client type** (`src/types/demo.ts`): mirrors the **`GET /api/demo/user`** payload (**`course`**, **`earnedBadges`**, progress fields — no internal `id` / `demoToken`).

**Badge definitions (`demo-badges.ts`):** Most slugs still key off Explorers ids **`1–3`**; **`ai-classifier`** (`slug`) uses **`allDemoLessonsComplete`**, so it unlocks when **either** Explorers **or** Builders finishes all three lessons. Add Builders-specific rows here when marketing wants distinct achievements.

**Storage path:** `{AKMIND_LOCAL_DB_PATH or ./data}/demo-users.json`.

**Token lookup (normalization):** `normalizeDemoToken()` in `demo-db.ts` trims and lowercases tokens for comparisons. `createDemoUser` stores tokens normalized. `GET /api/demo/user` trims the query `token`. This avoids "invalid token" when pasting mixed case or stray spaces.

**Demo seed users:** `data/demo-users.json` may include multiple preset rows for QA (emails, `demoToken`, etc.); progress fields are often reset to zero for a clean slate (`demoStarted: false`, empty `lessonsComplete`, `xp: 0`).

---

## 7. API reference

### `POST /api/demo/register`

**Body:** `{ parentName, email, phone, childName, presetToken?, course? }`

- **`course`** optional — **`AI Explorers`** \| **`AI Builders`** \| **`AI Innovators`** (defaults **Explorers** when omitted).
- Rejects if email already used (**409**).
- Creates user; optional **`presetToken`** for testing (otherwise random).
- Sends **demo link email** + **admin notification** (fire-and-forget).
- Returns **`{ success, token }`**.

### `GET /api/demo/user?token=...`

Returns sanitized profile: **`course`**, **`earnedBadges`**, name, childName, optional email/phone, **`lessonsComplete`**, **`quizScores`**, **`xp`**, **`badgeEarned`**, **`demoCompleted`**.

### `POST /api/demo/progress`

**Body:** `{ token, lessonId, quizScore?, xp?, badgesBefore? }`

- **`lessonId`** must be **Explorers `1–3`** or **Builders `11–13`** (see **`progressSchema`**).
- Appends **`lessonId`** to **`lessonsComplete`** (sanitized + deduped).
- Stores **`quizScores[String(lessonId)]`** if `quizScore` provided (percent).
- **`xp`**: adds **`xp`** to existing **`user.xp`** (additive, not replace).
- Computes **`demoCompleted`** / **`badgeEarned`** via **`allDemoLessonsComplete`** — **`true`** when **either** full Explorers track **or** full Builders track is complete (**three** lessons each).
- Updates **`earnedBadges`** from **`DEMO_BADGES`**; optional **`badgesBefore`** lets the UI diff **`newBadges`** for celebrations.
- When the learner completes the full track for the first time, **`sendDemoCompletionReport`** fires (best-effort email).

### `GET /api/demo/check?email=...`

Returns **`{ hasUsedDemo: boolean }`** for form validation.

### `/api/demo/admin`

Unauthenticated HTTP surface intended for **local/dev QA** (`src/app/api/demo/admin/route.ts`):

- **`GET`** — provisions **`getOrCreateAdminUser()`** and returns **`token`**, **`accessUrl`**, **`course`** for the shared admin demo profile.
- **`PATCH`** — JSON **`{ course: "AI Explorers" \| "AI Builders" }`** updates that profile’s active program (same mutation **`/admin`** and **`/demo/programs`** use).
- **`DELETE`** — resets progress/Xp/quizzes/**`earnedBadges`** on the admin demo user.

**Note:** `/admin` UI adds a separate browser **`NEXT_PUBLIC_ADMIN_PASSWORD`** gate (`sessionStorage`) — not enforced inside these route handlers.

**Response helpers:** `src/lib/api-response.ts` (`ok`, `fail`).

### `GET /api/nova`

Returns **`{ groqConfigured, elevenConfigured, hint }`** — verifies Lambda/build sees Groq/ElevenLabs env flags (**no secrets**).

### `POST /api/nova`

**Body (typical):** `message`, optional `conversationHistory`, `userName`, `childName`, `userId`, `currentLesson`, `xp`, `lessonsComplete`, `currentModule`, `lessonOrder`, `quizScores`, `badgeEarned`, **`course`**.

- Validates non-empty message and max length (~600 chars).
- Merges **`demoMemory`** (Map) with client history, slices to recent turns, calls Groq with a system prompt built from **`buildDemoLiveStats`** + **`getModuleSummary` / `getLessonSummary`** (includes Builders recap intents — see route helpers).
- Returns **`{ response: string }`**; on failure returns a friendly string with optional **`error: true`** (see route).

**Note:** In-memory `demoMemory` resets when the serverless instance cold-starts; client `conversationHistory` still supplies continuity.

### `GET /api/nova/tts` / `POST /api/nova/tts`

- **`GET`** → **`{ enabled: boolean }`** when **`ELEVENLABS_API_KEY`** + **`ELEVENLABS_VOICE_ID`** exist.
- **`POST`** JSON **`{ text, emotion? }`** → streamed/generated audio (**503** if not configured).

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
| `/demo` | Dashboard: **course-aware** lesson list (**1–3** or **11–13**), XP, locks, **NOVAChat**, nav to badges/programs (programs admin-only) |
| `/demo/badges` | Badge catalog + earned slugs (**`DEMO_BADGES`**) |
| `/demo/programs` | **Admin testers only:** switch **AI Explorers** vs **AI Builders** (`PATCH /api/demo/admin`) |
| `/demo/lesson/[id]` | Video → (**≥120s** learner gate on **1–3** & **11–13**) → upsell pause → **Neuropolis** *(Explorers)* **or** **neuro-sim Sim1–3** *(Builders)* → quiz → **`POST /api/demo/progress`**; **`NOVAChat`** suppressed during fullscreen game / XP overlay |
| `/demo/complete` | Requires **`demoCompleted`**; confetti, certificate PDF download, payment UI stub; redirects incomplete users to `/demo` |
| `/demo/complete-preview` | Static completion celebration preview (QA / marketing) |
| `/admin` | Password-gated dev hub: admin demo **`course`** picker, token shortcuts, completion preview embed |

**Middleware:** **`/demo/**`** routes require **`token`** query **or** **`demo_token`** cookie (same as §5). **`/api/**`** passes through with origin/size guards (§0).

---

## 10. Lesson catalog (content + quiz + game)

Lesson payloads live in **`src/app/demo/lesson/[id]/page.tsx`** as **`LESSONS_EXPLORERS`** (**ids `1–3`**) and **`LESSONS_BUILDERS`** (**ids `11–13`**). Dashboard cards duplicate titles/metadata in **`LESSONS_EXPLORERS` / `LESSONS_BUILDERS`** inside **`src/app/demo/page.tsx`**.

### Shared mechanics

- Every shipped lesson sets **`hasGame: true`**.
- **Explorers (`1–3`):** fullscreen **`NeuropolisShell`** inside **`LandscapeWrapper`** with **`level`=`lessonId`** (**`1` \| `2` \| `3`**).
- **Builders (`11–13`):** fullscreen **`Sim1Scene` \| `Sim2Scene` \| `Sim3Scene`** (dynamic imports).
- **`GAME_BONUS_XP`:** `200` — included when posting XP after quiz if the embedded game finished (`page.tsx`).
- **`GAME_MECHANICS`:** Human-readable blurbs per lesson id (includes placeholders for Builders narrative strings).

### 10a. Video gates & Continue UX (authoritative excerpts)

Constants and derived flags from **`src/app/demo/lesson/[id]/page.tsx`**:

```typescript
/** Demo lessons 1–3 and 11–13: minimum seconds of video playback before upsell + continue unlocks (non-admin). */
const MIN_LESSON_VIDEO_PLAY_SECONDS = 120;

const adminMode = isAdminTester(user);
const minVideoRequired =
  (lessonId >= 1 && lessonId <= 3) || (lessonId >= 11 && lessonId <= 13);
const showPurchaseUpsell = minVideoRequired && videoWatchSatisfied;
```

After the **120-second** gate fires, **`VideoPlayer`** pauses via **`pauseVideo`** and **`playbackLocked`** disables scrubbing until the learner taps **Continue** on the upsell card (demo CTA). **`Admin testers`** still bypass locked-lesson routing but currently receive the same **`enforceWatchThrough`** wiring on ids **`1–3`** / **`11–13`**.

`<VideoPlayer>` wiring (trimmed):

```tsx
<VideoPlayer
  lessonId={lessonId}
  enforceWatchThrough={minVideoRequired}
  minPlayedSeconds={
    minVideoRequired ? MIN_LESSON_VIDEO_PLAY_SECONDS : undefined
  }
  playbackLocked={showPurchaseUpsell}
  pauseVideo={pauseVideo}
  onWatchSatisfied={() => {
    setVideoWatchSatisfied(true);
    setPauseVideo(true);
  }}
/>
```

While **`phase === "game"`** && **`gameActive`** (or XP overlay), **`suppressNovaChatFab`** hides **`NOVAChat`** so taps reach Neuropolis or the neuro-sim canvas.

### 10b. `VideoPlayer.tsx` (full source — `src/components/lesson/VideoPlayer.tsx`)

Satisfaction is evaluated on **`timeupdate`** and **`ended`**. Props: **`enforceWatchThrough`**, optional **`minPlayedSeconds`** (uses **`video.played`** summed seconds, capped by duration), optional **`onWatchSatisfied`**, optional **`pauseVideo`**, optional **`playbackLocked`** (disables controls/scrubbing while the upsell overlays the player).

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  getVideoUrl,
  getPosterUrl,
  getCaptionsUrl,
  LESSON_VIDEOS,
} from "@/lib/lesson-videos";

/** Fraction of the timeline that must have been played (not merely seeked past) for learners. */
const WATCH_PLAYED_THRESHOLD = 0.92;

function playedWatchFraction(video: HTMLVideoElement): number {
  const d = video.duration;
  if (!d || !Number.isFinite(d) || d <= 0) return 0;
  let played = 0;
  for (let i = 0; i < video.played.length; i++) {
    played += video.played.end(i) - video.played.start(i);
  }
  return Math.min(1, played / d);
}

/** Sum of `played` TimeRanges — actual playback seconds, not scrub-only. */
function playedSecondsTotal(video: HTMLVideoElement): number {
  let played = 0;
  for (let i = 0; i < video.played.length; i++) {
    played += video.played.end(i) - video.played.start(i);
  }
  return played;
}

/** Require `minSec` unless the file is shorter — then require full duration. */
function requiredPlayedSeconds(
  video: HTMLVideoElement,
  minSec: number,
): number {
  const d = video.duration;
  if (!Number.isFinite(d) || d <= 0) return minSec;
  return Math.min(minSec, d);
}

interface VideoPlayerProps {
  lessonId: number;
  onEnded?: () => void;
  onProgress?: (pct: number) => void;
  /**
   * When true, `onWatchSatisfied` fires only after enough of the file has actually been played.
   * Seeking to the end alone does not count until playback covers most of the timeline.
   */
  enforceWatchThrough?: boolean;
  /** If set with `enforceWatchThrough`, satisfaction uses this many seconds of real playback (capped by video duration). */
  minPlayedSeconds?: number;
  onWatchSatisfied?: () => void;
}

export default function VideoPlayer({
  lessonId,
  onEnded,
  onProgress,
  enforceWatchThrough = false,
  minPlayedSeconds,
  onWatchSatisfied,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const satisfiedSent = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const meta = LESSON_VIDEOS[lessonId];
  const videoUrl = (() => {
    try {
      return getVideoUrl(lessonId);
    } catch {
      return null;
    }
  })();
  const posterUrl = getPosterUrl(lessonId);
  const captionsUrl = meta?.hasCaptions ? getCaptionsUrl(lessonId) : undefined;

  useEffect(() => {
    satisfiedSent.current = false;
  }, [lessonId, retryKey, enforceWatchThrough, minPlayedSeconds]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tryWatchSatisfied = () => {
      if (!enforceWatchThrough || satisfiedSent.current) return;
      const minS = minPlayedSeconds;
      if (minS != null && minS > 0) {
        const need = requiredPlayedSeconds(v, minS);
        if (playedSecondsTotal(v) < need) return;
      } else if (playedWatchFraction(v) < WATCH_PLAYED_THRESHOLD) {
        return;
      }
      satisfiedSent.current = true;
      onWatchSatisfied?.();
    };

    const handleLoaded = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setError(
        "Video failed to load. Please check your connection and try again."
      );
    };
    const handleEnded = () => {
      onEnded?.();
      tryWatchSatisfied();
    };
    const handleTimeUpdate = () => {
      if (onProgress && v.duration) {
        onProgress((v.currentTime / v.duration) * 100);
      }
      tryWatchSatisfied();
    };

    v.addEventListener("loadedmetadata", handleLoaded);
    v.addEventListener("error", handleError);
    v.addEventListener("ended", handleEnded);
    v.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      v.removeEventListener("loadedmetadata", handleLoaded);
      v.removeEventListener("error", handleError);
      v.removeEventListener("ended", handleEnded);
      v.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [
    onEnded,
    onProgress,
    onWatchSatisfied,
    enforceWatchThrough,
    minPlayedSeconds,
    retryKey,
    lessonId,
  ]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryKey((k) => k + 1);
  };

  if (!videoUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-500/40 bg-slate-950">
        <div className="px-4 text-center text-red-300">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p className="text-sm">Video CDN not configured.</p>
          <p className="mt-1 text-xs text-red-400/70">
            NEXT_PUBLIC_CDN_URL missing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="text-center text-cyan-300">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading video…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <div className="px-4 text-center text-red-300">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p className="mb-3 text-sm">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs text-cyan-300 transition hover:bg-cyan-500/30"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <video
        key={`${lessonId}-${retryKey}`}
        ref={videoRef}
        className="h-full w-full"
        controls
        preload="metadata"
        playsInline
        poster={posterUrl}
        crossOrigin="anonymous"
      >
        <source src={videoUrl} type="video/mp4" />
        {captionsUrl && (
          <track
            kind="captions"
            src={captionsUrl}
            srcLang="en"
            label="English"
            default
          />
        )}
        Your browser does not support HTML5 video.
      </video>
    </div>
  );
}
```

### 10c. Game-phase wiring (`lesson/[id]/page.tsx`)

Dynamic imports (trimmed):

```typescript
const NeuropolisShell = dynamic(
  () => import("@/components/games/neuropolis/NeuropolisShell"),
  { ssr: false }
);
const LandscapeWrapper = dynamic(
  () => import("@/components/games/shared/LandscapeWrapper"),
  { ssr: false }
);
const Sim1Scene = dynamic(
  () => import("@/components/games/neuro-sim/sims/Sim1Scene"),
  { ssr: false }
);
const Sim2Scene = dynamic(
  () => import("@/components/games/neuro-sim/sims/Sim2Scene"),
  { ssr: false }
);
const Sim3Scene = dynamic(
  () => import("@/components/games/neuro-sim/sims/Sim3Scene"),
  { ssr: false }
);
```

Fullscreen **`phase === "game"`** branch:

```tsx
{gameActive && lessonId >= 1 && lessonId <= 3 && (
  <LandscapeWrapper>
    <NeuropolisShell
      level={lessonId as 1 | 2 | 3}
      onComplete={async () => {
        await exitGame();
        setGameComplete(true);
        setPhase("quiz");
      }}
      onExit={exitGame}
    />
  </LandscapeWrapper>
)}

{gameActive && user?.course === "AI Builders" && lessonId >= 11 && lessonId <= 13 && (
  <>
    {lessonId === 11 && <Sim1Scene onComplete={...} onExit={exitGame} />}
    {lessonId === 12 && <Sim2Scene onComplete={...} onExit={exitGame} />}
    {lessonId === 13 && <Sim3Scene onComplete={...} onExit={exitGame} />}
  </>
)}
```

**Bootstrap:** **`NeuropolisShell`** calls **`bootstrapNeuropolisDemo(mountEl, level, onComplete)`** (`src/neuropolis/bootstrapDemoLevel.ts`) where **`NeuropolisDemoLevel`** is **`1 | 2 | 3`**. Pipeline: **`DeviceManager.init`**, **`Canvas`**, **`InputManager`**, **`TouchControls`** (`bypassDeviceGate: true`), **`GameLoop`**, **`BootScene`** / **`CinematicScene`** as needed → **`GameScene`–`GameScene4`** canvas districts. Builders simulations manage their own teardown via **`onExit`** / **`onComplete`** props.

### 10d. `NeuropolisShell.tsx` (full source)

```tsx
"use client";

import {
  bootstrapNeuropolisDemo,
  type NeuropolisDemoLevel,
} from "@/neuropolis/bootstrapDemoLevel";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  level: NeuropolisDemoLevel;
  onComplete: () => void;
  onExit: () => void | Promise<void>;
};

export default function NeuropolisShell({ level, onComplete, onExit }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  const [exitPortalHost, setExitPortalHost] = useState<HTMLElement | null>(
    null,
  );
  onCompleteRef.current = onComplete;
  onExitRef.current = onExit;

  useEffect(() => {
    setExitPortalHost(document.body);
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const teardown = bootstrapNeuropolisDemo(el, level, () => {
      onCompleteRef.current();
    });
    teardownRef.current = teardown;

    return () => {
      teardownRef.current = null;
      teardown();
    };
  }, [level]);

  const handleExit = () => {
    teardownRef.current?.();
    teardownRef.current = null;
    void onExitRef.current();
  };

  const exitButton = (
    <button
      type="button"
      data-neuropolis-exit="true"
      onClick={handleExit}
      aria-label="Exit game"
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 1100,
        background: "rgba(239,68,68,0.12)",
        border: "1px solid rgba(239,68,68,0.55)",
        borderRadius: 8,
        color: "#f87171",
        fontSize: 13,
        padding: "8px 14px",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      Exit
    </button>
  );

  return (
    <>
      {exitPortalHost ? createPortal(exitButton, exitPortalHost) : null}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0a0a1a",
          zIndex: 1,
        }}
      >
        <div
          ref={mountRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </>
  );
}
```

### 10e. `bootstrapDemoLevel.ts` (full source)

```typescript
import { Canvas } from "./engine/Canvas";
import { DeviceManager } from "./engine/DeviceManager";
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
 * Mount Neuropolis into `root` (cleared first). Runs one demo level (`NeuropolisDemoLevel` 1–3 for shipped Explorers lessons).
 * Lesson 1 matches standalone `main.ts`: BootScene (~3s) → CinematicScene → GameScene.
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
  touchControls.hide();

  let disposed = false;

  const teardown = (): void => {
    if (disposed) return;
    disposed = true;
    cinematic?.destroy();
    cinematic = null;
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
    scene = new GameScene(input, loop, handleComplete, { touchControls });
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
      touchControls.show();
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
```

### AI Explorers — lessons `1–3` (`LESSONS_EXPLORERS`)

Three conceptual-lesson **`course === "AI Explorers"`** track. Each row uses **`VideoPlayer`** (CDN when configured — mapped folders **`lesson-2` … `lesson-4`**), fullscreen **`NeuropolisShell`** (**`level` `1 | 2 | 3`**), then quiz.

**Video gate:** **`MIN_LESSON_VIDEO_PLAY_SECONDS`** upsell flow on ids **`1–3`** (see §10a).

- **Lesson `1` — History of AI — From Dreams to Machines** — Neuropolis **`level={1}`**; **`xpReward`:** 300; **5** quiz questions.
- **Lesson `2` — AI vs Humans: What Can AI Do?** — Neuropolis **`level={2}`**; **`xpReward`:** 300; **5** quiz questions.
- **Lesson `3` — Types of AI: Narrow, General & Super** — Neuropolis **`level={3}`**; **`xpReward`:** 300; **5** quiz questions.

### AI Builders — lessons `11–13` (`LESSONS_BUILDERS`)

Python primer track. Copy/titles on the dashboard align with **`lesson-content.ts`** keys **`1-11` … `1-13`**. Video gate mirrors Explorers (**ids `11–13`**). Game phase mounts **`Sim1Scene`**, **`Sim2Scene`**, **`Sim3Scene`** respectively.

### Quiz UX & XP posting

- **Option buttons:** `text-slate-800 font-medium` by default (dark, readable); hover shifts to `indigo-50` background + `indigo-700` text; correct → `green-500` border + `green-50` bg; wrong pick → `red-500` border + `red-50` bg.
- **`quizXpFromAccuracy`:** 100% → full `xpReward`; ≥80% → 90%; ≥60% → 70%; else 50%.
- **Total XP posted** on results: **`quizXp + (GAME_BONUS_XP if game complete)`** (200 bonus).
- **`POST /api/demo/progress`** **adds** that total to stored **`xp`** (cumulative across lessons) and returns **`newBadges`** when slugs flip.

### End-of-track navigation

After the XP overlay **Continue**, learners route to **`/demo/complete`** when **`lessonId >= 13`** on Builders **or** **`lessonId >= 3`** on Explorers; otherwise back to **`/demo`** (`lesson/[id]/page.tsx`).

---

## 11. Shared Character Components

> **Routing note:** Explorers lessons mount **`NeuropolisShell`** (canvas engine under `src/neuropolis/`). Builders lessons mount **`src/components/games/neuro-sim/`** sim scenes. The **`GameShell2`–`GameShell4`** trees in **§§11a–13** are **legacy / alternate** React implementations kept in-repo; they are **not** imported by **`lesson/[id]/page.tsx`** today.

### AXCharacter (`src/components/games/shared/AXCharacter.tsx`)

Master player avatar for the **legacy** lesson 2–4 React shells and reference layouts. **Neuropolis** renders AX-style gameplay on canvas via its own entities/sprites — keep this component docs when working with `DivideStage`, `TypeHunterStage`, etc.

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

Master guide/narrator character used by **legacy** in-game lesson shells (**`GameShell2`–`GameShell4`**). Distinct from **`src/components/NOVACharacter.tsx`**, which is the **dashboard/chat** NOVA avatar paired with **`NOVAChat`**. Neuropolis uses **`src/neuropolis/ui/DialogueBox.ts`** (and related UI) for in-engine dialogue.

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

## 11a. Games — Lesson 2 (`GameShell2`) — legacy

**Shell:** `src/components/games/lesson2/GameShell2.tsx` (**not** wired from `/demo/lesson/[id]`; see **§10c** Neuropolis.)

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

## 12. Games — Lesson 3 (`GameShell3`) — legacy

**Shell:** `src/components/games/lesson3/GameShell3.tsx` (**not** wired from the live lesson page.)

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

## 13. Games — Lesson 4 (`GameShell4`) — legacy

**Shell:** `src/components/games/lesson4/GameShell4.tsx` (**not** wired from the live lesson page.)

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

## 15. Key UX & pedagogy themes by track

| Track | Lesson id | Theme | Interactive surface |
|--------|-----------|--------|---------------------|
| AI Explorers | 1 | History of AI timeline | Neuropolis **`level={1}`** |
| AI Explorers | 2 | AI vs human strengths | Neuropolis **`level={2}`** |
| AI Explorers | 3 | Taxonomy (Narrow / General / Super) | Neuropolis **`level={3}`** |
| AI Builders | 11 | Variables & data | **`Sim1Scene`** |
| AI Builders | 12 | Branching logic / decisions | **`Sim2Scene`** |
| AI Builders | 13 | Loops & iteration | **`Sim3Scene`** |

Legacy **`GameShell2`–`GameShell4`** sections below retain art/audio notes for archival QA — they do **not** represent the live `/demo/lesson/[id]` wiring.

---

## 16. Completion & monetization surface

**`/demo/complete`** (`src/app/demo/complete/page.tsx`):

- Guard: **`demoCompleted`** must be true else redirect to `/demo`.
- Confetti, **jsPDF** certificate download (Builders vs Explorers copy adapts per **`course`** where implemented).
- **Payment UI** (UPI / card / etc.) — presentation-layer flow with local state (`paymentSuccess`), not a live payment processor in-repo.

---

## 17. Admin panel & Programs tab

**`/admin`** (`src/app/admin/page.tsx`): browser password (**`NEXT_PUBLIC_ADMIN_PASSWORD`**, default **`changeme`** via env fallback). Once unlocked, loads **`GET /api/demo/admin`** for the persistent admin demo **`token`** + **`course`**, exposes **AI Explorers vs AI Builders** buttons (**`PATCH /api/demo/admin`**), reset (**`DELETE`**), deep links, and embeds the **`DemoCompleteCelebration`** preview block.

**`/demo/programs`**: Same **`PATCH`** capability inside the polished demo chrome, but **only `admin@akmind.com` / name `Admin`** may view it — everyone else redirects to **`/demo`**.

Neither route lists arbitrary registered families from DynamoDB/JSON; use **`data/demo-users.json`** or AWS console for that operational view.

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

- **NOVA:** Extend **`lesson-content.ts`** (Explorers **`1-1`–`1-4`** keys, Builders **`1-11`–`1-13`** keys) and **`demo-nova-stats.ts`**. Thread **`course`** into **`NOVAChat`** wherever you surface context (`demo/page.tsx`, `lesson/[id]/page.tsx`).
- **New lesson:** Add parallel entries to **`LESSONS_EXPLORERS` / `LESSONS_BUILDERS`** in `lesson/[id]/page.tsx`, mirror dashboard arrays in `demo/page.tsx`, register ids in **`demo-lesson-scope.ts`**, extend **`lesson-videos.ts`** + **`validators.ts` `progressSchema`**, then wire the game branch (**`NeuropolisShell`** vs neuro-sim) inside the **`phase === "game"`** block.
- **New game shell:** Mirror `GameShell3`/`4`; export `onComplete(xp)` and `onExit()`; dynamic import with **`ssr: false`** if using canvas/window keys.
- **New character:** Add to `src/components/games/shared/`; import via `@/components/games/shared/CharacterName`.
- **XP:** Lesson results should remain consistent with **additive** `POST /api/demo/progress` behavior.
- **Unlock:** Sequential within a track (**`1→2→3`** or **`11→12→13`**). Crossing tracks is prevented in the lesson page when **`user.course`** disagrees with the requested id.
- **AX in canvas games:** Use HTML overlay div + `ref.style.transform` for zero-re-render positioning; never draw AX as a canvas `fillRect`. Track `axAnim`/`axFacing` with refs + `queueMicrotask` guards.

---

## 20. Glossary

- **AX:** Player avatar name across games. Rendered by `shared/AXCharacter.tsx`.
- **NOVA (chat):** AI assistant UI + **`POST /api/nova`**. Avatar: `src/components/NOVACharacter.tsx`.
- **NOVA (in-game):** Guide portrait in games. `src/components/games/shared/NovaCharacter.tsx`.
- **Chaos Bot / Time Corruptor / Divide Keeper / The Undefined:** Antagonists per lesson.
- **Token:** `demoToken` string; not a JWT.
- **GAME_BONUS_XP:** Flat +200 for finishing embedded game before quiz (lessons with games).
- **NeuropolisShell:** React wrapper that mounts **`bootstrapNeuropolisDemo`** and portals an **Exit** control to `document.body`.
- **Neuro-sim (`Sim1–3`):** Builders-only React/Python lesson surfaces under **`src/components/games/neuro-sim/`**, dynamically imported from **`lesson/[id]/page.tsx`**.
- **bootstrapNeuropolisDemo:** Function in **`src/neuropolis/bootstrapDemoLevel.ts`** that constructs canvas, loop, input, touch controls, and the active **`GameScene`** bundle for **`NeuropolisDemoLevel` `1 | 2 | 3`**.
- **Crumbling platform:** Platform that shakes then falls when AX stands on it, respawning after 150 frames.
- **Time Bubble:** Floating enemy in TimelineStage showing a wrong year; contact freezes + destroys it.
- **Moving platform:** Oscillating horizontal platform that carries AX when stood on.

---

*Last updated: May 2026 — dual tracks (**AI Explorers `1–3` · Neuropolis** vs **AI Builders `11–13` · neuro-sim**); **`course`** on users + **`/admin`** / **`/demo/programs`** switches; **`demo-lesson-scope`** completion rules; **`GET /api/demo/user`** returns **`earnedBadges`**; **`POST /api/demo/progress`** + **`badgesBefore`** / **`newBadges`**; **`GET`/`POST /api/nova`** + **`/api/nova/tts`** + Amplify **`server-env`/`next.config` env** baking; **`middleware`** API origins; **`MonacoErrorFilter`**; CDN folder remap via **`cdnLessonFolderNumber`**; legacy **`GameShell2`–`GameShell4`** archived here for reference.*
