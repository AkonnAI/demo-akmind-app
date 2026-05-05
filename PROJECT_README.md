# AKMIND Demo App — Project Bible

This document is the **single source of truth** for **demo-akmind-app**: what it does, how it is built, every lesson, every game, APIs, data, and operational details. Update this file when you change flows, content, or architecture.

---

## 0. Latest Updates (Apr–May 2026)

Recent production-facing changes implemented in this repository:

- **Lesson video gates & “full lesson” card**
  - **`VideoPlayer`** (`src/components/lesson/VideoPlayer.tsx`) still streams from **`NEXT_PUBLIC_CDN_URL`** (`lesson-videos.ts`). It can enforce **real playback** via `video.played` TimeRanges (not scrub-only).
  - **Lesson 1:** learners can tap **Continue to Game** immediately — **no** `enforceWatchThrough`.
  - **Lessons 2–4:** learners need **≥ 180 seconds** of actual playback (`MIN_LESSON_VIDEO_PLAY_SECONDS`), capped at **video duration** if the file is shorter than 3 minutes. Then a **“Full lesson experience”** card appears: copy includes **“Full lesson launching June 2026 — stay tuned”** and the only **Continue to Game** CTA for that path lives **on the card** (the standard gradient button is hidden until admins/L1 use the standard path).
  - **Admin testers** (`admin@akmind.com` or display name `Admin`): all video gates bypassed; they always see the standard Continue button.
  - Optional **`minPlayedSeconds`** + **`enforceWatchThrough`**; if `minPlayedSeconds` is omitted but `enforceWatchThrough` is true, legacy behavior uses **~92%** of the timeline played (`WATCH_PLAYED_THRESHOLD`).

- **Demo session cookie & user API rate limit** (`src/lib/demo-session.ts`)

```typescript
/**
 * Demo access cookie — refreshed when users hit any `/demo/*` route (see middleware).
 * Tokens themselves do not expire in the database; persistence is mainly this cookie + URL.
 */
export const DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/** GET /api/demo/user — generous limit so dashboards / lessons / DevTools do not false-expire sessions */
export const DEMO_USER_API_RATE_LIMIT_PER_MINUTE = 240;
```

  - **`middleware.ts`** sets `demo_token` with **`DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS`** (365 days in production usage).
  - **`GET /api/demo/user`** imports **`DEMO_USER_API_RATE_LIMIT_PER_MINUTE`** for throttling.

- **Neuropolis as the lesson game (lessons 1–4)**
  - **`src/app/demo/lesson/[id]/page.tsx`** loads **`NeuropolisShell`** via `dynamic(..., { ssr: false })` inside **`LandscapeWrapper`** when `phase === "game"` and `lessonId` is 1–4.
  - **`bootstrapNeuropolisDemo`** (`src/neuropolis/bootstrapDemoLevel.ts`) mounts canvas, **`DeviceManager.init`**, **`InputManager`**, **`TouchControls`** (`bypassDeviceGate: true` for demo), and the correct **`GameScene` / `GameScene2`–`GameScene4`** for the level. Returns a **teardown** on unmount or **Exit**.
  - **`NOVAChat`** floating FAB is **suppressed** while the game is active (`suppressNovaChatFab = phase === "game" && gameActive`) so taps go to the canvas / dialogue.

- **Lesson video playback (S3 CDN)**
  - Streams MP4 from **`NEXT_PUBLIC_CDN_URL`** using paths `videos/lesson-{n}/1080p.mp4` and optional **`poster.jpg`** / **`captions.vtt`** (when captions are enabled in **`src/lib/lesson-videos.ts`**).
  - If the CDN URL is missing, the UI shows a clear configuration message instead of crashing.

- **NOVA AI companion (Groq) + voice**
  - **`POST /api/nova`** (`src/app/api/nova/route.ts`): Groq **`llama-3.3-70b-versatile`**, short warm replies (1–2 sentences), in-memory conversation **`demoMemory`** keyed by `userId` / `userName` for continuity within a server instance.
  - Lesson summaries and live demo stats are injected via **`src/lib/lesson-content.ts`** and **`src/lib/demo-nova-stats.ts`** so NOVA can answer progress/XP/quiz questions without inventing numbers.
  - **`src/components/NOVAChat.tsx`**: floating launcher + chat panel; **`src/components/NOVACharacter.tsx`** (dashboard-style avatar, distinct from in-game `games/shared/NovaCharacter.tsx`).
  - **`src/hooks/useNOVAVoice.ts`** + **`src/components/NOVAVoiceButton.tsx`**: Web Speech API (listen + speak), sentence-chunked TTS, Chrome keep-alive pause/resume, HTTPS check on non-localhost, clearer mic-permission copy, silent retry on `no-speech`, first-tap delay before starting recognition.
  - **`GROQ_API_KEY`** required at runtime for full replies; ensure it is set in Amplify/hosting env vars.

- **Mobile layout polish (NOVA + dashboard)**
  - **`globals.css`**: `.nova-float-button` raises the closed NOVA FAB above the 64px bottom nav on viewports ≤768px (`bottom: 80px`, `right: 16px`).
  - **`NOVAChat`**: full-screen panel on mobile; closed button position synced with resize; voice error banner only when `error && voiceState === "idle"`.
  - **`src/app/demo/page.tsx`**: extra **`pb-20`** on main content so lists are not hidden behind bottom nav; hero/stats tuned for small screens (padding, heading size, stacked hero + optional NOVA character hidden below ~380px width).

- **Cyberpunk demo UI**
  - Dark navy glass aesthetic (`globals.css`), aligned with akmind-dashboard; dashboard, lesson flow, complete page, and NOVA chrome updated accordingly.

- **Mobile-first dashboard and lesson UX (ongoing)**
  - Bottom nav on mobile, touch-friendly quiz/lesson cards, complete page and modals responsive.

- **Game mobile controls**
  - Shared touch overlay in `src/components/games/shared/GameTouchControls.tsx`; wired into `GameShell2`–`GameShell4`.

- **Lesson content flow**
  - Lesson videos use **`VideoPlayer`** + **`lesson-videos.ts`** (S3 URLs); gating rules above apply per lesson id.

- **Admin QA**
  - Tester identity (`admin@akmind.com` / name `Admin`) can unlock any lesson for testing; admin panel password/session gated.
  - **`GET /api/demo/user`**: known admin dev token path provisions **`getOrCreateAdminUser()`** so DynamoDB deployments do not show "expired" when the admin row was missing.

- **Security / scale**
  - Rate limits, Zod + sanitization, timing-safe token compare, CORS + payload limits in middleware, security headers in `next.config.ts`.
  - **`USE_DYNAMODB=true`** + AWS table env vars for production concurrency (see `demo-db.ts`).

- **Gameplay stability (lesson 2 / History Vault)**
  - `TimelineStage` ref-based callbacks for stable rAF loops (health, completion, sounds).

---

## 1. What this project is

**demo-akmind-app** is a **Next.js 15** web application for the **AKMIND** brand. It delivers a **guided demo "class"** for kids (parent registers → receives a magic link → child progresses through **4 lessons** with **video**, optional **story games**, **quizzes**, **XP**, and a **completion** experience including badge PDF and upsell UI).

**Product goals (as implemented):**

- One-time demo per email (enforced at registration).
- Token-based access to `/demo/**` (no full user accounts in this repo).
- Local JSON "database" for demo users (`data/demo-users.json`), **or** AWS **DynamoDB** when `USE_DYNAMODB=true`.
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
| Storage | **Node `fs`** + JSON under `data/` **or** **DynamoDB** (`@aws-sdk/*`) |
| AI | **groq-sdk** — NOVA chat (`/api/nova`) |

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
│   │   │       └── page.tsx     # Per-lesson: VideoPlayer → NeuropolisShell (L1–4) → quiz → results
│   │   └── api/
│   │       ├── nova/route.ts    # NOVA: Groq chat + server-side memory slice
│   │       └── demo/
│   │           ├── register/route.ts
│   │           ├── user/route.ts
│   │           ├── progress/route.ts
│   │           ├── check/route.ts
│   │           └── admin/route.ts   # Admin API: list users, reset progress
│   ├── components/
│   │   ├── NOVAChat.tsx         # Floating NOVA UI + voice controls
│   │   ├── NOVACharacter.tsx    # Chat/dashboard avatar (distinct from games/shared)
│   │   ├── NOVAVoiceButton.tsx
│   │   ├── lesson/
│   │   │   └── VideoPlayer.tsx  # S3 MP4; optional enforceWatchThrough + minPlayedSeconds
│   │   └── games/
│   │       ├── neuropolis/
│   │       │   └── NeuropolisShell.tsx  # bootstrapNeuropolisDemo mount + Exit portal
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
│   │   ├── demo-nova-stats.ts   # Live XP/streak/badge stats for NOVA prompt
│   │   ├── lesson-content.ts    # Module/lesson summaries for NOVA context
│   │   ├── lesson-videos.ts     # CDN URLs + lesson video metadata
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
| `NEXT_PUBLIC_CDN_URL` | Public S3 base URL for lesson videos and posters. |
| `NEXT_PUBLIC_APP_URL` | Base URL embedded in demo emails (link: `?token=...`). |
| `NEXT_PUBLIC_LANDING_URL` | Main marketing site link (default `https://www.akmind.com`). |
| `GMAIL_USER` | SMTP from-address user. |
| `GMAIL_APP_PASSWORD` | Gmail app password for nodemailer. |
| `AKMIND_LOCAL_DB_PATH` | Optional; overrides `./data` root for JSON DB (see `demo-db.ts`). |
| `GROQ_API_KEY` | Groq API key for **`POST /api/nova`** (set in hosting e.g. Amplify). |
| `USE_DYNAMODB` | Set `true` to use DynamoDB instead of local JSON (production). |
| `AWS_REGION` | AWS region for DynamoDB client. |
| `DEMO_USERS_TABLE` | DynamoDB table name for demo users. |
| `ADMIN_PASSWORD` | Protects admin UI/API where implemented (see routes). |

**Client-exposed:** only variables prefixed with `NEXT_PUBLIC_`.

**Voice:** Web Speech API requires a **secure context** on real devices — use **HTTPS** (e.g. production domain); `http://localhost` is exempt in the hook’s protocol check.

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

**Lesson unlock rule:** Lesson `n > 1` requires **`lessonsComplete` includes `n - 1`** (previous lesson id completed via progress API).

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

### `POST /api/nova`

**Body (typical):** `message`, optional `conversationHistory`, `userName`, `childName`, `userId`, `currentLesson`, `xp`, `lessonsComplete`, `currentModule`, `lessonOrder`, `quizScores`, `badgeEarned`.

- Validates non-empty message and max length (~600 chars).
- Merges **`demoMemory`** (Map) with client history, slices to recent turns, calls Groq with a system prompt built from **`buildDemoLiveStats`** + **`getModuleSummary` / `getLessonSummary`**.
- Returns **`{ response: string }`**; on failure returns a friendly string with optional **`error: true`** (see route).

**Note:** In-memory `demoMemory` resets when the serverless instance cold-starts; client `conversationHistory` still supplies continuity.

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
| `/demo` | Dashboard: lesson cards, XP, locks, **NOVAChat** launcher |
| `/demo/lesson/[id]` | Lesson flow: **VideoPlayer** → (optional **June 2026** card for L2–4) → **NeuropolisShell** (L1–4) → quiz → results; **NOVAChat** suppressed during fullscreen game |
| `/demo/complete` | Requires **`demoCompleted`**; confetti, badge PDF download, payment UI stub; redirects incomplete users to `/demo` |
| `/admin` | Admin panel: user list, lesson progress, XP, quiz scores |

**Middleware:** All **`/demo/**`** require token (query or cookie).

---

## 10. Lesson catalog (content + quiz + game)

Content is primarily defined in **`src/app/demo/lesson/[id]/page.tsx`** (`LESSONS` constant). Dashboard copy is duplicated per lesson in **`src/app/demo/page.tsx`** (`LESSONS` array for UI metadata).

### Shared mechanics

- Lessons **1–4** set **`hasGame: true`**; each opens **`NeuropolisShell`** with `level={lessonId}` (see **§10c**).
- **`GAME_BONUS_XP`:** `200` — included when posting XP after quiz if the embedded game was completed (`page.tsx`).
- **`GAME_MECHANICS`:** Neuropolis district blurbs keyed by lesson id.

### 10a. Video gates & Continue UX (authoritative excerpts)

Constants and derived flags from **`src/app/demo/lesson/[id]/page.tsx`**:

```typescript
import type { DemoUser } from "@/types/demo"; // top of page.tsx

/** Lessons 2–4: minimum seconds of actual video playback before continue unlocks. */
const MIN_LESSON_VIDEO_PLAY_SECONDS = 180;

function isAdminTester(user: DemoUser | null): boolean {
  if (!user) return false;
  return (
    user.email?.toLowerCase() === "admin@akmind.com" || user.name === "Admin"
  );
}

const adminMode = isAdminTester(user);
const minVideoRequired = !adminMode && lessonId >= 2 && lessonId <= 4;
const showLaunchCard = minVideoRequired && videoWatchSatisfied;
const showStandardContinue = !minVideoRequired || adminMode;
const canContinueFromVideo =
  adminMode || lessonId === 1 || videoWatchSatisfied;
```

`<VideoPlayer>` wiring:

```tsx
<VideoPlayer
  lessonId={lessonId}
  enforceWatchThrough={minVideoRequired}
  minPlayedSeconds={
    minVideoRequired ? MIN_LESSON_VIDEO_PLAY_SECONDS : undefined
  }
  onWatchSatisfied={() => setVideoWatchSatisfied(true)}
/>
```

After the **3-minute** gate, learners see the **full lesson** card; **Continue to Game** on that card enters the game phase. The standard gradient button is shown only when **`showStandardContinue`** (lesson 1, or admin bypass):

```tsx
{showLaunchCard && (
  <div
    className="mt-6 rounded-xl border px-5 py-5 sm:px-6 sm:py-6"
    style={{
      background: "rgba(99,102,241,0.08)",
      borderColor: "rgba(99,102,241,0.28)",
      backdropFilter: "blur(12px)",
    }}
  >
    <p className="font-semibold text-indigo-200">Full lesson experience</p>
    <p className="mt-2 text-sm text-slate-400">
      Full lesson launching June 2026 — stay tuned. You can still continue to the
      demo game below.
    </p>
    <button
      type="button"
      className="mt-5 rounded-xl px-7 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #6366F1, #4F46E5)",
        boxShadow: "var(--glow-indigo)",
      }}
      onClick={() =>
        lesson.hasGame ? setPhase("game") : setPhase("quiz")
      }
    >
      {lesson.hasGame ? "Continue to Game →" : "Continue to Quiz →"}
    </button>
  </div>
)}
{showStandardContinue && (
  <button
    type="button"
    disabled={!canContinueFromVideo}
    className={`mt-6 rounded-xl px-7 py-3 font-semibold text-white transition-all duration-200 ${
      canContinueFromVideo
        ? "hover:-translate-y-0.5"
        : "cursor-not-allowed opacity-45"
    }`}
    style={{
      background: "linear-gradient(135deg, #6366F1, #4F46E5)",
      boxShadow: "var(--glow-indigo)",
    }}
    onClick={() =>
      lesson.hasGame ? setPhase("game") : setPhase("quiz")
    }
  >
    {lesson.hasGame ? "Continue to Game →" : "Continue to Quiz →"}
  </button>
)}
```

While **`phase === "game"`** and **`gameActive`**, **`suppressNovaChatFab`** hides **`NOVAChat`** so taps reach the canvas.

### 10b. `VideoPlayer.tsx` (full source — `src/components/lesson/VideoPlayer.tsx`)

Satisfaction is evaluated on **`timeupdate`** and **`ended`**. Props: **`enforceWatchThrough`**, optional **`minPlayedSeconds`** (uses **`video.played`** summed seconds, capped by duration), optional **`onWatchSatisfied`**.

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

### 10c. Neuropolis shell wiring (`page.tsx`)

```typescript
const NeuropolisShell = dynamic(
  () => import("@/components/games/neuropolis/NeuropolisShell"),
  { ssr: false }
);
const LandscapeWrapper = dynamic(
  () => import("@/components/games/shared/LandscapeWrapper"),
  { ssr: false }
);
```

```tsx
{phase === "game" && lesson.hasGame && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      overflow: "hidden",
      maxWidth: "100vw",
      maxHeight: "100vh",
    }}
  >
    {gameActive && lessonId >= 1 && lessonId <= 4 && (
      <LandscapeWrapper>
        <NeuropolisShell
          level={lessonId as 1 | 2 | 3 | 4}
          onComplete={async () => {
            await exitGame();
            setGameComplete(true);
            setPhase("quiz");
          }}
          onExit={exitGame}
        />
      </LandscapeWrapper>
    )}
    {/* … placeholders for lessonId outside 1–4 or post-game UI … */}
  </div>
)}
```

**Bootstrap:** `NeuropolisShell` calls **`bootstrapNeuropolisDemo(mountEl, level, onComplete)`** (`src/neuropolis/bootstrapDemoLevel.ts`): **`DeviceManager.init`**, **`Canvas`**, **`InputManager`**, **`TouchControls`** (`bypassDeviceGate: true`), **`GameLoop`**, then **`BootScene`** (lesson 1 only) → **`CinematicScene`** or straight to **`GameScene` / `GameScene2`–`GameScene4`**. Teardown on unmount or **Exit** clears listeners and DOM.

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
 * Mount Neuropolis into `root` (cleared first). Runs one demo level (maps to demo lessons 1–4).
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

### Lesson 1 — Welcome to Artificial Intelligence

- **Type:** `live`; info panel contrasts **paid live class** vs **demo** (recording + full Neuropolis + quiz, no purchase).
- **Video:** S3 **`VideoPlayer`** — learners **skip** the watch gate (**Continue** always enabled via **`lessonId === 1`**).
- **`hasGame`:** `true` → **Neuropolis level 1**.
- **`xpReward`:** 100 (scaled by **`quizXpFromAccuracy`**).
- **Quiz:** **3** questions (see `LESSONS[1].quiz` in `page.tsx`).
- **Flow:** Video → Continue → Neuropolis → Quiz → Results → **`POST /api/demo/progress`**.

### Lesson 2 — History of AI — From Dreams to Machines

- **Video:** learners need **≥ `MIN_LESSON_VIDEO_PLAY_SECONDS`** real playback → **June 2026** card → Continue → **Neuropolis level 2**.
- **`xpReward`:** 300; **5** quiz questions (milestones / Turing / ChatGPT, etc. — see `LESSONS[2].quiz` in `page.tsx`).

### Lesson 3 — AI vs Humans: What Can AI Do?

- Same learner video gate as lesson 2 → **Neuropolis level 3**; **`xpReward`:** 300; **5** quiz questions.

### Lesson 4 — Types of AI: Narrow, General & Super

- Same learner video gate → **Neuropolis level 4**; **`xpReward`:** 300; **5** quiz questions.

### Quiz UX

- **Option buttons:** `text-slate-800 font-medium` by default (dark, readable); hover shifts to `indigo-50` background + `indigo-700` text; correct → `green-500` border + `green-50` bg; wrong pick → `red-500` border + `red-50` bg.
- **`quizXpFromAccuracy`:** 100% → full `xpReward`; ≥80% → 90%; ≥60% → 70%; else 50%.
- **Total XP posted** on results: **`quizXp + (GAME_BONUS_XP if game complete)`** (200 bonus).
- **`POST /api/demo/progress`** **adds** that total to stored **`xp`** (cumulative across lessons).

### After lesson 4

- **`phase === 'complete'`** on lesson page: after ~3s, redirect **`/demo/complete`** if `lessonId >= 4`, else **`/demo`**.

---

## 11. Shared Character Components

> **Routing note:** The live lesson player mounts **`NeuropolisShell`** (canvas engine under `src/neuropolis/`). The **`GameShell2`–`GameShell4`** trees in **§§11a–13** are **legacy / alternate** React implementations kept in-repo; they are **not** imported by **`lesson/[id]/page.tsx`** today.

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

## 15. Key UX & pedagogy themes by "district"

| Lesson | Theme | Player fantasy |
|--------|--------|----------------|
| 1 | What is AI? | Neuropolis L1 + quiz |
| 2 | History timeline | Neuropolis L2 (demo); legacy `GameShell2` in tree |
| 3 | Human vs AI | Neuropolis L3 (demo); legacy `GameShell3` |
| 4 | AI taxonomy | Neuropolis L4 (demo); legacy `GameShell4` |

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

- **NOVA:** To teach NOVA new curriculum facts, extend **`src/lib/lesson-content.ts`** (summaries) and/or **`buildDemoLiveStats`** inputs in **`demo-nova-stats.ts`**. Wire additional props into **`NOVAChat`** from **`demo/page.tsx`** and **`lesson/[id]/page.tsx`** so `POST /api/nova` receives consistent `xp`, `lessonsComplete`, `quizScores`, `currentModule`, `lessonOrder`.
- **New lesson:** Add to **`LESSONS`** in `lesson/[id]/page.tsx` + dashboard **`LESSONS`** in `demo/page.tsx`; wire `gameActive && lessonId === n` → **`NeuropolisShell`** (and extend **`bootstrapDemoLevel.ts`** / scenes if needed); align **`MIN_LESSON_VIDEO_PLAY_SECONDS`** / gate rules if the lesson should mimic L2–4.
- **New game shell:** Mirror `GameShell3`/`4`; export `onComplete(xp)` and `onExit()`; dynamic import with **`ssr: false`** if using canvas/window keys.
- **New character:** Add to `src/components/games/shared/`; import via `@/components/games/shared/CharacterName`.
- **XP:** Lesson results should remain consistent with **additive** `POST /api/demo/progress` behavior.
- **Unlock:** Tied to **`lessonsComplete`** containing previous id; progress endpoint currently pushes ids on each completion — ensure ordering matches product rules.
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
- **bootstrapNeuropolisDemo:** Function in **`src/neuropolis/bootstrapDemoLevel.ts`** that constructs canvas, loop, input, touch controls, and the active **`GameScene`** for lessons 1–4.
- **Crumbling platform:** Platform that shakes then falls when AX stands on it, respawning after 150 frames.
- **Time Bubble:** Floating enemy in TimelineStage showing a wrong year; contact freezes + destroys it.
- **Moving platform:** Oscillating horizontal platform that carries AX when stood on.

---

*Last updated: May 2026 — **`demo-session`** (365-day `demo_token`, **`GET /api/demo/user`** rate limit 240/min); lesson **video gates** (L1 open; L2–4 ≥180s playback + June 2026 card); **`NeuropolisShell`** / **`bootstrapNeuropolisDemo`** as live lesson games; **`VideoPlayer`** `minPlayedSeconds` + `enforceWatchThrough`; legacy **`GameShell2`–`GameShell4`** documented separately.*
