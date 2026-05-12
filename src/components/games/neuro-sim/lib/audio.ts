type SfxName = 'glitch' | 'confirm' | 'error' | 'select' | 'maximize'
type PlayName = SfxName | 'music'

const SFX_MAP: Record<SfxName, string> = {
  glitch: '/audio/sfx/kenney_interface-sounds/Audio/glitch_001.ogg',
  confirm: '/audio/sfx/kenney_interface-sounds/Audio/confirmation_001.ogg',
  error: '/audio/sfx/kenney_interface-sounds/Audio/error_001.ogg',
  select: '/audio/sfx/kenney_interface-sounds/Audio/select_001.ogg',
  maximize: '/audio/sfx/kenney_interface-sounds/Audio/maximize_001.ogg',
}

const MUSIC_SRC =
  '/audio/music/sharvarion-sci-fi-ambient-music-183269.mp3'

let initialized = false
let musicAwaitingUnmute = false
let musicEl: HTMLAudioElement | null = null
const sfxEls: Partial<Record<SfxName, HTMLAudioElement>> = {}

function safePlay(el: HTMLAudioElement | null | undefined) {
  if (!el) return
  try {
    el.currentTime = 0
    void el.play().catch(() => {})
  } catch {
    /* ignore autoplay / decode errors */
  }
}

function ensureLoaded() {
  if (initialized) return
  initialized = true

  musicEl = new window.Audio(MUSIC_SRC)
  musicEl.loop = true
  musicEl.volume = 0.25
  musicEl.preload = 'auto'
  void musicEl.load()

  for (const k of Object.keys(SFX_MAP) as SfxName[]) {
    const a = new window.Audio(SFX_MAP[k])
    a.preload = 'auto'
    void a.load()
    sfxEls[k] = a
  }
}

export const Audio = {
  play(name: PlayName) {
    ensureLoaded()
    try {
      if (name === 'music') {
        if (!musicEl) return
        musicAwaitingUnmute = true
        musicEl.muted = true
        musicEl.volume = 0.25
        musicEl.loop = true
        safePlay(musicEl)
        return
      }

      if (musicEl && musicAwaitingUnmute) {
        musicEl.muted = false
        musicAwaitingUnmute = false
      }

      const el = sfxEls[name]
      safePlay(el)
    } catch {
      /* ignore */
    }
  },

  stopMusic() {
    try {
      if (!musicEl) return
      musicEl.pause()
      musicEl.currentTime = 0
    } catch {
      /* ignore */
    }
  },

  startMusic() {
    ensureLoaded()
    try {
      if (!musicEl) return
      musicAwaitingUnmute = true
      musicEl.muted = true
      musicEl.volume = 0.25
      musicEl.loop = true
      safePlay(musicEl)
    } catch {
      /* ignore */
    }
  },
}
