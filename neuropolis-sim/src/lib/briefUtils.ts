/** Strip leading "NOVA:" prefix from mission brief copy. */
export function stripNovaPrefix(text: string): string {
  return text.replace(/^NOVA:\s*/i, '').trim()
}

/** Take only the last meaningful line from a Python traceback / error string. */
export function lastPythonErrorLine(raw: string): string {
  const lines = raw.trim().split(/\r?\n/)
  const trimmed = lines.map((l) => l.trim()).filter((l) => l.length > 0)
  return trimmed.length ? trimmed[trimmed.length - 1]! : raw.trim()
}
