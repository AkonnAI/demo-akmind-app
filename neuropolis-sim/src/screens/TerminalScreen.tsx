import Editor, { type BeforeMount } from '@monaco-editor/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import MissionIntro from '../components/MissionIntro'
import NovaHUD from '../components/NovaHUD'
import { LESSONS } from '../data/lessons'
import { lastPythonErrorLine, stripNovaPrefix } from '../lib/briefUtils'
import {
  CITY_FAR,
  CITY_LAYER_FILTER,
  CITY_MID,
  CITY_NEAR,
} from '../lib/cityLayers'
import { Audio } from '../lib/audio'
import { useGameStore } from '../store/useGameStore'
import Sim1Scene from '../sims/Sim1Scene'
import Sim2Scene from '../sims/Sim2Scene'
import type { Sim2GraderResult } from '../sims/sim2-grader'
import {
  gradeSim2WithAge,
  SIM2_TEST_CASES,
  staticGradeSim2,
} from '../sims/sim2-grader'
import Sim3Scene from '../sims/Sim3Scene'
import type { Sim3GraderResult } from '../sims/sim3-grader'
import { gradeSim3 } from '../sims/sim3-grader'
import { wrapPyodideStudentCode } from '../lib/pyodideStudentCode'

const WARNING_ICON =
  '/assets/icons/kenney_game-icons/PNG/White/2x/warning.png'

const INSPECT = `
import json
_result = {}
for _k, _v in list(globals().items()):
    if not _k.startswith('_') and _k not in dir(__builtins__):
        try:
            _result[_k] = {'type': type(_v).__name__, 'value': str(_v)[:50]}
        except:
            pass
`

type RunStatus = 'idle' | 'running' | 'loading-py' | 'success' | 'error'

type VarEntry = { name: string; type: string; value: string }

type ExecuteResult = {
  variables: VarEntry[]
  correct: number
  error: string | null
} | null

declare global {
  interface Window {
    loadPyodide?: (opts?: { indexURL?: string }) => Promise<PyodideAPI>
  }
}

type PyodideAPI = {
  runPythonAsync: (code: string) => Promise<void>
  runPython: (code: string) => unknown
}

// ─── Fallback right panel for lessons 2-10 ───────────────────────────────────

function SimComingSoon() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <img
        alt=""
        src={CITY_FAR}
        style={{ position: 'absolute', bottom: 0, width: '100%', imageRendering: 'pixelated', filter: CITY_LAYER_FILTER }}
      />
      <img
        alt=""
        src={CITY_MID}
        style={{ position: 'absolute', bottom: 0, width: '100%', imageRendering: 'pixelated', filter: CITY_LAYER_FILTER }}
      />
      <img
        alt=""
        src={CITY_NEAR}
        style={{ position: 'absolute', bottom: 0, width: '100%', filter: CITY_LAYER_FILTER, zIndex: 1 }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5,10,15,0.5)',
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontWeight: 700,
            fontSize: 22,
            color: 'rgba(0,212,255,0.5)',
            letterSpacing: 4,
          }}
        >
          SIMULATION COMING SOON
        </div>
        <div
          style={{
            fontFamily: 'SpaceGrotesk, sans-serif',
            fontSize: 13,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: 2,
          }}
        >
          BUILDING ONE AT A TIME
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TerminalScreen() {
  const activeLessonId = useGameStore((s) => s.activeLessonId)
  const addXP = useGameStore((s) => s.addXP)
  const unlockLesson = useGameStore((s) => s.unlockLesson)
  const completeLesson = useGameStore((s) => s.completeLesson)
  const setScreen = useGameStore((s) => s.setScreen)

  const activeLesson = LESSONS.find((l) => l.id === activeLessonId)

  const instructionBody =
    activeLesson !== undefined ? stripNovaPrefix(activeLesson.briefText) : ''

  const [code, setCode] = useState(activeLesson?.scaffoldCode ?? '')
  const [liveCode, setLiveCode] = useState(activeLesson?.scaffoldCode ?? '')

  useEffect(() => {
    if (activeLesson) {
      setCode(activeLesson.scaffoldCode)
      setLiveCode(activeLesson.scaffoldCode)
    }
  }, [activeLesson])

  const [status, setStatus] = useState<RunStatus>('idle')
  const [outputText, setOutputText] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [variableCount, setVariableCount] = useState(0)
  const [executeResult, setExecuteResult] = useState<ExecuteResult>(null)
  const [sim2Result, setSim2Result] = useState<Sim2GraderResult | null>(null)
  const [sim2SessionKey, setSim2SessionKey] = useState(0)
  const [sim3Result, setSim3Result] = useState<Sim3GraderResult | null>(null)
  const [showIntro, setShowIntro] = useState(true)

  const pyodideRef = useRef<PyodideAPI | null>(null)
  const pyodidePromiseRef = useRef<Promise<PyodideAPI> | null>(null)
  const successTimersRef = useRef<number[]>([])

  useEffect(() => {
    setVariableCount(0)
    setExecuteResult(null)
    setSim2Result(null)
    setSim2SessionKey(0)
    setSim3Result(null)
  }, [activeLesson?.id])

  const ensurePyodide = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current
    if (pyodidePromiseRef.current) return pyodidePromiseRef.current

    pyodidePromiseRef.current = (async () => {
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js'
          s.async = true
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load Pyodide'))
          document.head.appendChild(s)
        })
      }

      const pyodide = await window.loadPyodide!({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/',
      })
      pyodideRef.current = pyodide
      return pyodide
    })()

    return pyodidePromiseRef.current
  }, [])

  const beforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('neuropolis', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '7B2FFF', fontStyle: 'bold' },
        { token: 'string', foreground: '00FF88' },
        { token: 'number', foreground: 'FF9500' },
        { token: 'comment', foreground: '3A4A5C', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'E0F7FF' },
      ],
      colors: {
        'editor.background': '#080D14',
        'editor.foreground': '#E0F7FF',
        'editorLineNumber.foreground': '#1A3A4A',
        'editorCursor.foreground': '#00D4FF',
        'editor.selectionBackground': '#7B2FFF33',
        'editor.lineHighlightBackground': '#00D4FF08',
        'editorIndentGuide.background': '#0A1A24',
      },
    })
    monaco.editor.setTheme('neuropolis')
  }, [])

  useEffect(
    () => () => {
      successTimersRef.current.forEach((t) => window.clearTimeout(t))
      successTimersRef.current = []
    },
    [],
  )

  const handleSim2Test = useCallback(
    async (age: number) => {
      if (!activeLesson || activeLesson.id !== 2) return
      const py = pyodideRef.current
      const stamp = Date.now()
      if (!py) {
        setSim2Result({ ...staticGradeSim2(code, age), _timestamp: stamp })
        return
      }
      const result = await gradeSim2WithAge(code, age, py)
      setSim2Result({ ...result, age, error: result.error ?? null, _timestamp: stamp })
    },
    [activeLesson, code],
  )

  const handleSim2Complete = useCallback(() => {
    addXP(175)
    unlockLesson(3)
    completeLesson(2)
    setScreen('success')
  }, [addXP, unlockLesson, completeLesson, setScreen])

  const handleSim3TestInput = useCallback(
    (templateCode: string) => {
      setCode(templateCode)
      setLiveCode(templateCode)
    },
    [],
  )

  const runCode = useCallback(async () => {
    if (!activeLesson) return

    successTimersRef.current.forEach((t) => window.clearTimeout(t))
    successTimersRef.current = []

    setStatus('running')
    setOutputText(null)
    setErrorText(null)
    Audio.play('glitch')

    try {
      setStatus('loading-py')
      const py = await ensurePyodide()
      setStatus('running')

      if (activeLesson.id === 2) {
        setSim2SessionKey((k) => k + 1)
        setSim2Result(null)

        const ages = [67, 20, 35]
        const runSim2Full = async () => {
          const bridge = py
          for (let i = 0; i < ages.length; i++) {
            const age = ages[i]
            const stamp = Date.now()
            try {
              if (!bridge) {
                setSim2Result({
                  ...staticGradeSim2(code, age),
                  age,
                  _timestamp: stamp,
                })
              } else {
                const graded = await gradeSim2WithAge(code, age, bridge)
                setSim2Result({
                  ...graded,
                  age,
                  error: graded.error ?? null,
                  _timestamp: stamp,
                })
              }
            } catch {
              setSim2Result({
                route: 'derail',
                age,
                error: null,
                _timestamp: stamp,
              })
            }
            if (i < ages.length - 1) {
              await new Promise<void>((resolve) => {
                window.setTimeout(resolve, 4200)
              })
            }
          }
          setOutputText(null)
          setErrorText(null)
          setStatus('idle')
        }

        void runSim2Full()
        setOutputText(null)
        setErrorText(null)
        return
      }

      if (activeLesson.id === 3) {
        const result3 = await gradeSim3(code, py)
        setSim3Result(result3)

        if (result3.error) {
          setStatus('error')
          setErrorText(result3.error)
        } else {
          setStatus('idle')
          setOutputText(
            result3.iterations === 0
              ? 'No output captured — make sure your loop body calls print(). Watch the simulator for challenge progress.'
              : `Loop ran ${result3.iterations} iteration${result3.iterations !== 1 ? 's' : ''}. Follow the simulator — complete all three loop challenges to finish the mission.`,
          )
        }
        return
      }

      const safeCode = wrapPyodideStudentCode(code)
      await py.runPythonAsync(safeCode)
      await py.runPythonAsync(INSPECT)

      const raw = py.runPython('import json\njson.dumps(_result)')
      const jsonStr = typeof raw === 'string' ? raw : String(raw ?? '{}')

      const parsed = JSON.parse(jsonStr) as Record<
        string,
        { type: string; value: string }
      >
      const rawEntries = Object.entries(parsed)
      // Sim 1: ignore imported modules (sys/io from stdin mock, json from INSPECT).
      // Count only learner-defined values, not the Pyodide harness.
      const entries =
        activeLesson.id === 1
          ? rawEntries.filter(([, meta]) => meta.type !== 'module')
          : rawEntries

      if (activeLesson.id === 1) {
        setVariableCount(entries.length)

        const variables: VarEntry[] = entries.slice(0, 5).map(([name, meta]) => ({
          name,
          type: meta.type,
          value: meta.value,
        }))

        setExecuteResult({
          variables,
          correct: variables.length,
          error: null,
        })
      }

      const summary = entries
        .map(([k, v]) => `${k}: (${v.type}) ${v.value}`)
        .join('\n')

      if (activeLesson.id === 1) {
        if (entries.length >= 5) {
          setStatus('success')
          setOutputText(summary)

          const t1 = window.setTimeout(() => {
            Audio.play('confirm')
            addXP(activeLesson.xpReward)
            unlockLesson(activeLesson.id + 1)
            completeLesson(activeLesson.id)
          }, 1500)

          const t2 = window.setTimeout(() => setScreen('success'), 3500)

          successTimersRef.current = [t1, t2]
        } else {
          setStatus('idle')
          setOutputText(
            `Partial sync: ${entries.length}/5 variables.\n${summary}`,
          )
        }
      } else {
        setStatus('idle')
        setOutputText(summary || '(no variables captured)')
      }
    } catch (e) {
      setStatus('error')
      Audio.play('error')
      const raw = e instanceof Error ? e.message : String(e)
      const errMsg = lastPythonErrorLine(raw)
      setErrorText(errMsg)
      if (activeLesson.id === 1) {
        setExecuteResult({ variables: [], correct: 0, error: errMsg })
      } else if (activeLesson.id === 2) {
        setSim2Result({
          route: 'derail',
          age: SIM2_TEST_CASES[0].age,
          error: errMsg,
          _timestamp: Date.now(),
        })
      }
    }
  }, [
    activeLesson,
    code,
    ensurePyodide,
    addXP,
    unlockLesson,
    completeLesson,
    setScreen,
  ])

  useEffect(() => {
    if (!activeLesson) setScreen('mission-select')
  }, [activeLesson, setScreen])

  if (!activeLesson) return null

  const dotColor =
    status === 'idle'
      ? '#444'
      : status === 'running' || status === 'loading-py'
        ? '#FF9500'
        : status === 'success'
          ? '#00FF88'
          : '#E63946'

  const badge =
    status === 'idle'
      ? { text: 'IDLE', color: 'rgba(255,255,255,0.35)' }
      : status === 'loading-py'
        ? { text: 'LOADING PYTHON…', color: '#FF9500' }
        : status === 'running'
          ? { text: 'RUNNING', color: '#FF9500' }
          : status === 'success'
            ? { text: 'SUCCESS', color: '#00FF88' }
            : { text: 'ERROR', color: '#E63946' }

  const sim1ProgressPct = Math.min(100, (variableCount / 5) * 100)

  return (
    <div className="terminal-container">
      {showIntro && (
        <MissionIntro
          lesson={activeLesson}
          onDismiss={() => {
            setShowIntro(false)
          }}
        />
      )}
      {/* ── Left: editor panel ─────────────────────────────────────────────── */}
      <div
        className="terminal-left"
        style={{
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          className="terminal-top-bar"
          style={{
            height: 48,
            flexShrink: 0,
            background: '#050A0F',
            borderBottom: '1px solid rgba(0,212,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
              animation:
                status === 'running' || status === 'loading-py'
                  ? 'status-blink 0.8s ease-in-out infinite'
                  : undefined,
            }}
          />
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              color: '#00D4FF',
            }}
          >
            Terminal
          </span>
          <span style={{ color: 'rgba(255,255,255,0.25)' }}>•</span>
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            {activeLesson.title}
          </span>
          <div style={{ flex: 1 }} />
          <span
            style={{
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: 3,
              color: badge.color,
            }}
          >
            {badge.text}
          </span>
        </div>

        {/* Mission info */}
        <div
          className="mission-bar"
          style={{
            flexShrink: 0,
            maxHeight: 80,
            overflow: 'hidden',
            background: 'rgba(0,212,255,0.04)',
            borderBottom: '1px solid rgba(0,212,255,0.08)',
            padding: '10px 20px',
          }}
        >
          <div style={{ marginBottom: activeLesson.id === 1 ? 8 : 0 }}>
            <span
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: '#00D4FF',
                letterSpacing: 2,
              }}
            >
              MISSION:{' '}
            </span>
            <span
              style={{
                fontFamily: 'SpaceGrotesk, sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              {instructionBody}
            </span>
          </div>
          {activeLesson.id === 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: 'SpaceGrotesk, sans-serif',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {variableCount} / 5 variables defined
              </span>
              <div
                style={{
                  width: 120,
                  height: 4,
                  background: 'rgba(0,212,255,0.1)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${sim1ProgressPct}%`,
                    height: '100%',
                    background: '#00D4FF',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mobile-nova-hint">
          <span style={{ color: '#00D4FF', fontWeight: 700, fontSize: 10 }}>
            NOVA:{' '}
          </span>
          <span
            style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}
          >
            {(activeLesson?.briefText ?? '')
              .replace('NOVA:', '')
              .trim()}
          </span>
        </div>

        {/* Editor */}
      <div className="monaco-container" style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            defaultLanguage="python"
            theme="neuropolis"
            value={code}
            onChange={(v) => {
              const val = v ?? ''
              setCode(val)
              setLiveCode(val)
            }}
            beforeMount={beforeMount}
            options={{
              fontFamily: 'JetBrainsMono, monospace',
              fontSize: 15,
              lineHeight: 1.8,
              minimap: { enabled: false },
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
              },
              padding: { top: 16 },
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Execute button */}
        <div
          style={{
            height: 64,
            flexShrink: 0,
            background: '#050A0F',
            borderTop: '1px solid rgba(0,212,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            data-hoverable
            className={`execute-btn${status === 'idle' ? ' terminal-execute-btn--idle-pulse' : ''}`}
            onClick={() => void runCode()}
            style={{
              width: 200,
              height: 44,
              background: 'linear-gradient(135deg, #7B2FFF, #00D4FF)',
              fontFamily: 'SpaceGrotesk, sans-serif',
              fontWeight: 700,
              fontSize: 15,
              color: '#050A0F',
              borderRadius: 8,
              border: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.04)'
              if (status === 'idle')
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(0,212,255,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              if (status === 'idle') e.currentTarget.style.boxShadow = 'none'
            }}
          >
            EXECUTE
          </button>
        </div>
      </div>

      {/* ── Right: simulation panel ────────────────────────────────────────── */}
      <div
        className="terminal-right"
        style={{
          background: '#050A0F',
        }}
      >
        {activeLessonId === 1 && <Sim1Scene executeResult={executeResult} liveCode={liveCode} />}
        {activeLessonId === 2 && (
          <Sim2Scene
            executeResult={sim2Result}
            liveCode={liveCode}
            sessionKey={sim2SessionKey}
            onComplete={handleSim2Complete}
            onTestInput={handleSim2Test}
          />
        )}
        {activeLessonId === 3 && (
          <Sim3Scene
            executeResult={sim3Result}
            liveCode={liveCode}
            onTestInput={handleSim3TestInput}
          />
        )}
        {activeLessonId !== 1 && activeLessonId !== 2 && activeLessonId !== 3 && <SimComingSoon />}

        {/* Error panel (overlaid on top of sim) */}
        <AnimatePresence>
          {errorText && activeLessonId !== 2 && (
            <motion.div
              key="err"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80%',
                background: 'rgba(230,57,70,0.1)',
                border: '1px solid rgba(230,57,70,0.5)',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                zIndex: 30,
              }}
            >
              <img
                alt=""
                src={WARNING_ICON}
                width={20}
                height={20}
                style={{
                  flexShrink: 0,
                  filter:
                    'brightness(0) invert(1) sepia(1) saturate(10) hue-rotate(320deg)',
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'SpaceGrotesk, sans-serif',
                    fontWeight: 700,
                    fontSize: 12,
                    color: '#E63946',
                    letterSpacing: 2,
                  }}
                >
                  Python Error
                </div>
                <div
                  style={{
                    fontFamily: 'JetBrainsMono, monospace',
                    fontSize: 13,
                    color: 'rgba(255,100,100,0.9)',
                    marginTop: 4,
                    wordBreak: 'break-word',
                  }}
                >
                  {errorText}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Output panel for non-sim-1 lessons */}
        <AnimatePresence>
          {outputText &&
            activeLessonId !== 1 &&
            activeLessonId !== 2 && (
            <motion.div
              key="out"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '80%',
                background: 'rgba(8,13,20,0.9)',
                border: '1px solid rgba(0,255,136,0.3)',
                borderRadius: 8,
                padding: '12px 16px',
                fontFamily: 'JetBrainsMono, monospace',
                fontSize: 13,
                color: '#00FF88',
                whiteSpace: 'pre-wrap',
                zIndex: 30,
              }}
            >
              {outputText}
            </motion.div>
          )}
        </AnimatePresence>

        {activeLessonId !== 2 && (
          <NovaHUD
            className="nova-hud"
            text={
              activeLesson?.briefText
                ? activeLesson.briefText.replace(/^NOVA:\s*/i, '')
                : 'Welcome to the terminal.'
            }
            autoHide={6000}
          />
        )}
      </div>
    </div>
  )
}
