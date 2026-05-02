/**
 * While dialogue is open, tap / click almost anywhere to advance (same as Space).
 * Uses **capture** so fixed DOM (chat FAB, etc.) cannot swallow the gesture before we see it.
 */
export function attachDialoguePointerAdvance(onAdvance: () => void): () => void {
  const skipSelector =
    'button, a[href], input, textarea, select, [role="button"], .nova-float-button'

  const handler = (e: PointerEvent): void => {
    const t = e.target
    if (!(t instanceof Element)) return
    if (t.closest(skipSelector)) return
    if (t.closest('[data-neuropolis-exit]')) return
    onAdvance()
  }

  window.addEventListener('pointerdown', handler, true)
  return () => window.removeEventListener('pointerdown', handler, true)
}
