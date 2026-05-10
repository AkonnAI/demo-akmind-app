export class AudioManager {
  private static instance: AudioManager

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  private constructor() {}

  private readonly sounds: Map<string, HTMLAudioElement> = new Map()
  private musicTrack: HTMLAudioElement | null = null
  private musicKey: string | null = null
  private readonly sfxVolume = 0.7
  private readonly musicVolume = 0.4
  private muted = false

  preload(sounds: Record<string, string>): void {
    for (const [key, path] of Object.entries(sounds)) {
      const audio = new Audio(path)
      audio.preload = 'auto'
      this.sounds.set(key, audio)
    }
  }

  playSFX(key: string): void {
    if (this.muted) return
    const sound = this.sounds.get(key)
    if (!sound) return
    const clone = sound.cloneNode(true) as HTMLAudioElement
    clone.volume = this.sfxVolume
    void clone.play().catch(() => {})
  }

  playMusic(key: string, loop = true): void {
    if (this.musicKey === key && this.musicTrack && !this.musicTrack.paused) {
      return
    }

    if (this.musicTrack) {
      this.musicTrack.pause()
      this.musicTrack.currentTime = 0
    }

    const sound = this.sounds.get(key)
    if (!sound) return

    sound.loop = loop
    sound.volume = this.musicVolume
    this.musicTrack = sound
    this.musicKey = key
    void sound.play().catch(() => {})
  }

  stopMusic(): void {
    if (this.musicTrack) {
      this.musicTrack.pause()
      this.musicTrack.currentTime = 0
      this.musicTrack = null
      this.musicKey = null
    }
  }

  setMuted(val: boolean): void {
    this.muted = val
    if (this.muted && this.musicTrack) {
      this.musicTrack.pause()
    }
    if (!this.muted && this.musicTrack) {
      void this.musicTrack.play().catch(() => {})
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  isMuted(): boolean {
    return this.muted
  }
}

export const audioManager = AudioManager.getInstance()
