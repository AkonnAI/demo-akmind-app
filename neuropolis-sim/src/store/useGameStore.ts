import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GameScreen =
  | 'boot'
  | 'mission-select'
  | 'mission-brief'
  | 'terminal'
  | 'success'

type GameState = {
  screen: GameScreen
  activeLessonId: number | null
  xp: number
  unlockedLessons: number[]
  completedLessons: number[]
  setScreen: (s: GameScreen) => void
  setActiveLesson: (id: number | null) => void
  addXP: (n: number) => void
  unlockLesson: (id: number) => void
  completeLesson: (id: number) => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      screen: 'boot',
      activeLessonId: null,
      xp: 0,
      unlockedLessons: [1],
      completedLessons: [],

      setScreen: (s) => set({ screen: s }),

      setActiveLesson: (id) => set({ activeLessonId: id }),

      addXP: (n) => set({ xp: get().xp + n }),

      unlockLesson: (id) => {
        const u = get().unlockedLessons
        if (u.includes(id)) return
        set({ unlockedLessons: [...u, id].sort((a, b) => a - b) })
      },

      completeLesson: (id) => {
        const c = get().completedLessons
        if (c.includes(id)) return
        set({ completedLessons: [...c, id].sort((a, b) => a - b) })
      },
    }),
    {
      name: 'neuropolis-game',
      partialize: (s) => ({
        xp: s.xp,
        unlockedLessons: s.unlockedLessons,
        completedLessons: s.completedLessons,
      }),
    },
  ),
)
