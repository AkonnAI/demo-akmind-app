import { Canvas }       from './engine/Canvas'
import { CONFIG }       from './constants/config'
import { GameLoop }     from './engine/GameLoop'
import { InputManager } from './engine/InputManager'
import { GameScene }    from './scenes/GameScene'
import { GameScene2 }   from './scenes/GameScene2'
import { GameScene3 }   from './scenes/GameScene3'
import { GameScene4 }   from './scenes/GameScene4'
import { GameScene5 }   from './scenes/GameScene5'
import { GameScene6 }   from './scenes/GameScene6'
import { GameScene7 }   from './scenes/GameScene7'
import { GameScene8 }   from './scenes/GameScene8'
import { TouchControls } from './ui/TouchControls'
import { DeviceManager } from './engine/DeviceManager'

// ──────────────────────────────────────────────────────────────
// ADMIN ENTRY POINT
// Jumps straight into any BUILT level — skips boot + cinematic.
// See PROJECT.md §13 (Admin Page) for the full contract.
// ──────────────────────────────────────────────────────────────

type SceneLike = {
  update: (dt: number) => void
  render: (ctx: CanvasRenderingContext2D) => void
}

interface LevelEntry {
  num:      number
  name:     string
  district: string
  lesson:   string
  built:    boolean
}

type SectionRow = { label: string; startX: number; bossArena?: boolean }

const L1_SECTIONS: SectionRow[] = [
  { label: '1. Tutorial Alley',        startX: 180   },
  { label: '2. Community Square',      startX: 2200  },
  { label: '3. Server Alley',          startX: 4250  },
  { label: '4. Mirror Puzzle',         startX: 4700  },
  { label: '5. Smart Door Gauntlet',   startX: 7800  },
]

const L2_SECTIONS: SectionRow[] = [
  { label: '1. Entry Tunnel',          startX: 180   },
  { label: '2. Approach Corridor',     startX: 2100  },
  { label: '3. Vault Chamber',         startX: 3800  },
  { label: '4. Boss Arena',            startX: -1, bossArena: true },
  { label: '5. Evidence Run',          startX: 7400  },
  { label: '6. Exit Gauntlet',         startX: 9300  },
]

const L3_SECTIONS: SectionRow[] = [
  { label: '1. Market Entry',    startX: 180   },
  { label: '2. Pattern Plaza',   startX: 2100  },
  { label: '3. Evidence Zone',   startX: 5100  },
  { label: '4. Exit Sprint',     startX: 7300  },
]

const L4_SECTIONS: SectionRow[] = [
  { label: '1. Facility Entry',  startX: 180   },
  { label: '2. Scale Room 1',    startX: 2000  },
  { label: '3. Mid Facility',    startX: 4200  },
  { label: '4. Scale Room 2',    startX: 6500  },
]

const L5_SECTIONS: SectionRow[] = [
  { label: '1. Mirror Entry',    startX: 180   },
  { label: '2. Puzzle Room 1',   startX: 1800  },
  { label: '3. Mid Lab',         startX: 4500  },
  { label: '4. Puzzle Room 2',   startX: 6200  },
]

const L6_SECTIONS: SectionRow[] = [
  { label: '1. Tower Entry',      startX: 180   },
  { label: '2. Dish Array',       startX: 2100  },
  { label: '3. Transmitter Zone', startX: 5100  },
  { label: '4. Final Core',       startX: 7600  },
]

const L7_SECTIONS: SectionRow[] = [
  { label: '1. Entry',        startX: 180   },
  { label: '2. Memory Ch.1',    startX: 2300  },
  { label: '3. Core Access',    startX: 4600  },
  { label: '4. Exit Conduit',   startX: 7100  },
]

const L8_SECTIONS: SectionRow[] = [
  { label: 'CHAOS FIGHT',       startX: 0     },
]

const LEVELS: LevelEntry[] = [
  {
    num: 1,
    name: 'THE SCAN',
    district: 'District 1 — Algorithm Slums',
    lesson:   'What is AI',
    built:    true,
  },
  {
    num: 2,
    name: 'THE VAULT',
    district: 'District 1 — Algorithm Slums',
    lesson:   'History of AI',
    built:    true,
  },
  {
    num: 3,
    name: 'THE DATA MARKET',
    district: 'District 1 — Algorithm Slums',
    lesson:   'Pattern recognition in data',
    built:    true,
  },
  {
    num: 4,
    name: 'THE BIAS ENGINE',
    district: 'District 2 — NeuroCorps Facility',
    lesson:   'Biased training data skews predictions',
    built:    true,
  },
  {
    num: 5,
    name: 'THE MIRROR LAB',
    district: 'District 3 — Social Prediction Lab',
    lesson:   'AI mirrors what it is trained on',
    built:    true,
  },
  {
    num: 6,
    name: 'THE BROADCAST CORE',
    district: 'District 4 — NEXUS 2.0 Tower',
    lesson:   'AI broadcasts at scale',
    built:    true,
  },
  {
    num: 7,
    name: 'THE NEURAL CORE',
    district: 'District 5 — NEXUS 2.0 Server Core',
    lesson:   'AI systems are modular — break a module, the system adapts',
    built:    true,
  },
  {
    num: 8,
    name: 'CHAOS PROTOCOL',
    district: 'District 5 — NEXUS 2.0 Finale',
    lesson:   'Corrupted AI is still AI — optimized without constraints',
    built:    true,
  },
]

// ─── ACTIVE-RUN STATE ─────────────────────────────────────────
//
// A single InputManager is created on first launch and reused across
// runs — it binds window keydown/keyup listeners in its constructor
// and we don't want to leak duplicates when the user hops between
// levels. Each launchLevel call spins up its own Canvas + GameLoop
// and stopCurrentLevel tears the loop down so no orphan rAF keeps
// running behind the admin panel.

let activeLoop:   GameLoop     | null = null
let sharedInput:  InputManager | null = null
let sharedCanvas: Canvas       | null = null
let touchControls: TouchControls | null = null
let hudPointerDetach: (() => void) | null = null

// ─── DOM HELPERS ──────────────────────────────────────────────

function el<T extends HTMLElement>(sel: string): T {
  const node = document.querySelector(sel)
  if (!node) throw new Error(`Admin DOM element not found: ${sel}`)
  return node as T
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSectionRows(
  levelNum: number,
): string {
  const secs =
    levelNum === 1 ? L1_SECTIONS
    : levelNum === 2 ? L2_SECTIONS
    : levelNum === 3 ? L3_SECTIONS
    : levelNum === 4 ? L4_SECTIONS
    : levelNum === 5 ? L5_SECTIONS
    : levelNum === 6 ? L6_SECTIONS
    : levelNum === 7 ? L7_SECTIONS
    : levelNum === 8 ? L8_SECTIONS
    : L1_SECTIONS
  return secs.map((s) => `
      <button type="button" class="section-btn" data-level="${levelNum}"
        data-start-x="${s.bossArena ? '-1' : String(s.startX)}"
        data-boss-arena="${s.bossArena ? '1' : '0'}"
      >${escapeHTML(s.label)}</button>
    `).join('')
}

function buildGrid(): void {
  const grid = el<HTMLElement>('#level-grid')
  grid.innerHTML = ''
  for (const lvl of LEVELS) {
    const card = document.createElement('article')
    card.className = 'card' + (lvl.built ? ' built' : '')
    const sectionBlock = lvl.built && lvl.num >= 1 && lvl.num <= 8
      ? `
      <button type="button" class="section-toggle" data-card="${lvl.num}">
        ▾ JUMP TO SECTION
      </button>
      <div class="section-list" id="section-list-${lvl.num}">
        ${buildSectionRows(lvl.num)}
      </div>`
      : ''
    card.innerHTML = `
      <div class="num">LEVEL ${String(lvl.num).padStart(2, '0')}</div>
      <div class="name">LEVEL ${lvl.num} &mdash; ${escapeHTML(lvl.name)}</div>
      <div class="district">${escapeHTML(lvl.district)}</div>
      <div class="lesson">Lesson: ${escapeHTML(lvl.lesson)}</div>
      <span class="badge ${lvl.built ? 'built' : 'soon'}">${
        lvl.built ? 'BUILT' : 'COMING SOON'
      }</span>
      <button
        class="play-btn ${lvl.built ? '' : 'disabled'}"
        type="button"
        data-level="${lvl.num}"
        ${lvl.built ? '' : 'aria-disabled="true"'}
      >&#9654; PLAY</button>
      ${sectionBlock}
    `
    grid.appendChild(card)

    const btn = card.querySelector<HTMLButtonElement>('.play-btn')
    if (btn && lvl.built) {
      btn.addEventListener('click', () => launchLevel(lvl.num))
    }

    const toggle = card.querySelector<HTMLButtonElement>('.section-toggle')
    const list = card.querySelector<HTMLElement>(`#section-list-${lvl.num}`)
    if (toggle && list) {
      toggle.addEventListener('click', () => {
        list.classList.toggle('expanded')
        toggle.textContent = list.classList.contains('expanded')
          ? '▴ JUMP TO SECTION'
          : '▾ JUMP TO SECTION'
      })
    }
    for (const sb of card.querySelectorAll<HTMLButtonElement>('.section-btn')) {
      sb.addEventListener('click', () => {
        const n = Number(sb.dataset.level)
        const ba = sb.dataset.bossArena === '1'
        const sx = Number(sb.dataset.startX)
        launchLevel(n, ba ? { bossArena: true } : { startX: sx })
      })
    }
  }
}

// ─── LAUNCH / STOP ────────────────────────────────────────────

type LaunchOptions = { startX?: number; bossArena?: boolean }

function launchLevel(num: number, options?: LaunchOptions): void {
  if (activeLoop) stopCurrentLevel()

  document.body.classList.add('playing')

  const wrap = document.getElementById('admin-game-container')
  if (!(wrap instanceof HTMLElement)) {
    throw new Error('Admin: missing #admin-game-container')
  }
  if (!sharedInput) sharedInput = new InputManager()

  if (!touchControls) {
    touchControls = new TouchControls(wrap, sharedInput)
  } else {
    touchControls.setInput(sharedInput)
  }
  touchControls.show()

  if (!sharedCanvas) sharedCanvas = new Canvas('admin-game-canvas')
  else sharedCanvas.resize()

  const ctx   = sharedCanvas.getContext()
  const input = sharedInput
  const loop  = new GameLoop()

  const scene: SceneLike =
    num === 8
      ? new GameScene8(input, loop, undefined, {
          touchControls: touchControls!,
          startX:        options?.startX,
        })
      : num === 7
        ? new GameScene7(input, loop, undefined, {
            touchControls: touchControls!,
            startX:        options?.startX,
          })
      : num === 6
        ? new GameScene6(input, loop, undefined, {
            touchControls: touchControls!,
            startX:        options?.startX,
          })
      : num === 5
        ? new GameScene5(input, loop, undefined, {
            touchControls: touchControls!,
            startX:        options?.startX,
          })
        : num === 4
          ? new GameScene4(input, loop, undefined, {
              touchControls: touchControls!,
              startX:        options?.startX,
            })
          : num === 3
            ? new GameScene3(input, loop, undefined, {
                touchControls: touchControls!,
                startX:        options?.startX,
              })
            : num === 2
              ? new GameScene2(input, loop, undefined, {
                  touchControls: touchControls!,
                  startX:        options?.bossArena ? undefined : options?.startX,
                  bossArena:     options?.bossArena === true,
                })
              : new GameScene(input, loop, undefined, {
                  startX: options?.startX,
                  touchControls: touchControls!,
                })

  const canvasEl = sharedCanvas.getCanvas()
  if (num >= 2 && num <= 4) {
    const onHudPointerDown = (e: PointerEvent): void => {
      const rect = canvasEl.getBoundingClientRect()
      const scaleX = CONFIG.CANVAS_WIDTH / rect.width
      const scaleY = CONFIG.CANVAS_HEIGHT / rect.height
      const canvasX = (e.clientX - rect.left) * scaleX
      const canvasY = (e.clientY - rect.top) * scaleY
      ;(scene as GameScene2 | GameScene3 | GameScene4).handleHudPointerDown(
        canvasX,
        canvasY,
      )
    }
    canvasEl.addEventListener('pointerdown', onHudPointerDown)
    hudPointerDetach = (): void => {
      canvasEl.removeEventListener('pointerdown', onHudPointerDown)
    }
  }

  loop.onUpdate((dt) => {
    scene.update(dt)
    input.update()
  })
  loop.onRender(ctx, (ctx2) => {
    scene.render(ctx2)
  })

  loop.start()
  activeLoop = loop
  console.log(`[Admin] Launched level ${num}.`)
}

function stopCurrentLevel(): void {
  hudPointerDetach?.()
  hudPointerDetach = null
  if (activeLoop) {
    activeLoop.stop()
    activeLoop = null
  }
  touchControls?.hide()
  document.body.classList.remove('playing')
  console.log('[Admin] Returned to panel.')
}

// ─── BOOTSTRAP ────────────────────────────────────────────────

function main(): void {
  DeviceManager.init()
  buildGrid()
  const backBtn = el<HTMLButtonElement>('#back-btn')
  backBtn.addEventListener('click', () => stopCurrentLevel())
  console.log('[Admin] Panel ready.')
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true })
} else {
  main()
}
