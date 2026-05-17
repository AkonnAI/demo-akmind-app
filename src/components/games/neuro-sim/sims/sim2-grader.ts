export type Sim2Route = 'senior' | 'student' | 'regular' | 'derail'

export interface Sim2GraderResult {
  route: Sim2Route | null
  age: number | null
  error: string | null
  /** Bumped by TerminalScreen each Sim2 run so the scene reruns animations when routes repeat */
  readonly _timestamp?: number
}

/**
 * Map Python stdout text + fallback age to a Sim2 route.
 * Called after capturing Pyodide stdout for a test age.
 */
export function mapOutputToRoute(output: string): Sim2Route {
  const lo = output.toLowerCase()

  if (lo.includes('senior') || lo.includes('50')) return 'senior'
  if (lo.includes('student') || lo.includes('30')) return 'student'
  return 'regular'
}

/** Strip stdin lines and inject the test age for Pyodide (no real input()). */
export function injectAge(studentCode: string, age: number): string {
  const lines = studentCode.split('\n')
  const filtered = lines.filter((line) => !line.includes('input('))
  return `age = ${age}\n${filtered.join('\n')}`
}

/** Derive route from if / elif thresholds in source (runs after executing student code once). */
export function detectSim2Route(codeRaw: string, age: number): Sim2Route {
  const code = codeRaw.replace(/\r\n/g, '\n').trim()
  if (!/\bif\b/.test(code) || !/\belif\b/.test(code) || !/\belse\b/.test(code))
    return 'derail'

  const seniorMatch = /\bif\s+age\s*>=\s*(\d+)/.exec(code)
  const studentMatch = /\belif\s+age\s*<\s*(\d+)/.exec(code)
  if (!seniorMatch || !studentMatch) return 'derail'

  const seniorAge = Number.parseInt(seniorMatch[1], 10)
  const studentMaxAge = Number.parseInt(studentMatch[1], 10)
  if (Number.isNaN(seniorAge) || Number.isNaN(studentMaxAge)) return 'derail'
  if (age >= seniorAge) return 'senior'
  if (age < studentMaxAge) return 'student'
  return 'regular'
}

/** Run student code once in Pyodide for a probe age and map to station route (structure-based). */
export async function gradeSim2WithAge(
  studentCode: string,
  testAge: number,
  py: { runPythonAsync: (code: string) => Promise<void> },
): Promise<Sim2GraderResult> {
  try {
    await py.runPythonAsync(buildSim2PyodideCode(studentCode, testAge))
    const route = detectSim2Route(studentCode, testAge)
    return { route, age: testAge, error: null }
  }
  catch {
    return { route: 'derail', age: testAge, error: null }
  }
}

/**
 * Client-side static analysis — no Pyodide required.
 * Used for instant test-button feedback before Pyodide is ready.
 */
export function staticGradeSim2(code: string, testAge: number): Sim2GraderResult {
  if (!code.trim()) {
    return { route: 'derail', age: testAge, error: 'No code written' }
  }

  if (!/\bif\b/.test(code)) {
    return {
      route: 'derail',
      age: testAge,
      error: 'No if statement found — write an if/elif/else block',
    }
  }

  // Extract numeric thresholds from age comparisons.
  // Patterns: age >= 60 | age > 59 | 60 <= age | age < 25 | age <= 24
  let seniorThreshold = 60
  let studentThreshold = 25

  const ageGtRe = /\bage\s*>=?\s*(\d+)|\b(\d+)\s*<[=?]?\s*age\b/g
  for (const m of code.matchAll(ageGtRe)) {
    const v = Number.parseInt(m[1] ?? m[2] ?? '60', 10)
    if (v >= 50 && v <= 80) {
      seniorThreshold = v
      break
    }
  }

  const ageLtRe = /\bage\s*<[=?]?\s*(\d+)|\b(\d+)\s*>=?\s*age\b/g
  for (const m of code.matchAll(ageLtRe)) {
    const v = Number.parseInt(m[1] ?? m[2] ?? '25', 10)
    if (v >= 15 && v <= 40) {
      studentThreshold = v
      break
    }
  }

  let route: Sim2Route
  if (testAge >= seniorThreshold) {
    route = 'senior'
  } else if (testAge < studentThreshold) {
    route = 'student'
  } else {
    route = 'regular'
  }

  return { route, age: testAge, error: null }
}

/** Expected routes for the 3 canonical test ages. */
export const SIM2_TEST_CASES = [
  { age: 67, expected: 'senior' as Sim2Route },
  { age: 20, expected: 'student' as Sim2Route },
  { age: 35, expected: 'regular' as Sim2Route },
]

/** Pyodide wrapper code — prepend to student code for one test run. */
export function buildSim2PyodideCode(studentCode: string, testAge: number): string {
  const body = injectAge(studentCode, testAge)

  return `
import sys as _sys, io as _io
_old_out = _sys.stdout
_sys.stdout = _io.StringIO()
${body}
_sim2_out = _sys.stdout.getvalue()
_sys.stdout = _old_out
`.trim()
}
