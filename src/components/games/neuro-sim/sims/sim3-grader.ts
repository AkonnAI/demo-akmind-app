export interface Sim3GraderResult {
  iterations: number
  loopType: 'for' | 'while' | null
  error: string | null
  /** True when code uses range(0, …) — used for challenge 3. */
  rangeStartsAtZero: boolean
}

type PyodideAPI = {
  runPythonAsync: (code: string) => Promise<void>
  runPython: (code: string) => unknown
}

const WRAP_CODE = `
import sys as _sys, io as _io
_old_out = _sys.stdout
_sys.stdout = _io.StringIO()
`

const CAPTURE_CODE = `
_sim3_stdout = _sys.stdout.getvalue()
_sys.stdout = _old_out
`

export async function gradeSim3(
  code: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pyodide: any,
): Promise<Sim3GraderResult> {
  const py = pyodide as PyodideAPI
  const rangeStartsAtZero = /range\s*\(\s*0\s*,/.test(code)

  const loopType: 'for' | 'while' | null = /\bfor\b/.test(code)
    ? 'for'
    : /\bwhile\b/.test(code)
      ? 'while'
      : null

  try {
    const wrapped = `${WRAP_CODE.trim()}\n${code}\n${CAPTURE_CODE.trim()}`
    await py.runPythonAsync(wrapped)
    const rawOut = py.runPython('_sim3_stdout')
    const out = typeof rawOut === 'string' ? rawOut : ''
    const iterations = out.split('\n').filter((l) => l.trim().length > 0).length

    return { iterations, loopType, error: null, rangeStartsAtZero }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const lastLine = msg.split('\n').findLast((l) => l.trim().length > 0) ?? msg
    return {
      iterations: 0,
      loopType,
      error: lastLine,
      rangeStartsAtZero,
    }
  }
}
