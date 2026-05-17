/**
 * Prepended before student code in Pyodide so stdin-based input() never blocks or throws I/O errors.
 */
const PYODIDE_INPUT_MOCK = `
import sys
import io

# Mock input to prevent I/O blocking
_input_values = []
def input(prompt=''):
    if _input_values:
        return str(_input_values.pop(0))
    return ''

`

export function wrapPyodideStudentCode(studentCode: string): string {
  return `${PYODIDE_INPUT_MOCK.trim()}\n${studentCode}`
}
