export type Sim2Route = 'senior' | 'student' | 'regular' | 'derail'

export interface Sim2GraderResult {
  route: Sim2Route | null
  age: number | null
  error: string | null
}

/**
 * Map Python stdout text + fallback age to a Sim2 route.
 * Called after capturing Pyodide stdout for a test age.
 */
export function mapOutputToRoute(output: string, fallbackAge: number): Sim2Route {
  const lo = output.toLowerCase()

  const isSenior =
    lo.includes('senior') ||
    lo.includes('elder') ||
    lo.includes('pension') ||
    (lo.includes('50') && lo.includes('%'))

  const isStudent =
    lo.includes('student') ||
    lo.includes('youth') ||
    lo.includes('young') ||
    (lo.includes('30') && lo.includes('%'))

  const isRegular =
    lo.includes('regular') ||
    lo.includes('full fare') ||
    lo.includes('standard') ||
    lo.includes('normal fare')

  if (isSenior) return 'senior'
  if (isStudent) return 'student'
  if (isRegular) return 'regular'

  // Heuristic by age when output gives no clear signal
  if (fallbackAge >= 60) return 'senior'
  if (fallbackAge < 25) return 'student'
  return 'regular'
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
  // Strip any input() call that reads age (scaffold artefact)
  const stripped = studentCode.replace(
    /^[^\n]*int\s*\(\s*input\s*\([^)]*\)\s*\)[^\n]*$/m,
    '',
  )

  return `
import sys as _sys, io as _io
_old_out = _sys.stdout
_sys.stdout = _io.StringIO()
age = ${testAge}
${stripped}
_sim2_out = _sys.stdout.getvalue()
_sys.stdout = _old_out
`.trim()
}
