import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import BootScreen from './screens/BootScreen'
import MissionBrief from './screens/MissionBrief'
import MissionSelect from './screens/MissionSelect'
import SuccessScreen from './screens/SuccessScreen'
import TerminalScreen from './screens/TerminalScreen'
import { useGameStore } from './store/useGameStore'
import CustomCursor from './components/CustomCursor'
import BackgroundGrid from './components/BackgroundGrid'
import AdminPanel from './components/AdminPanel'

function ScreenWrap({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const screen = useGameStore((s) => s.screen)

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <CustomCursor />
      <BackgroundGrid />
      <AdminPanel />
      <AnimatePresence mode="wait">
        {screen === 'boot' ? (
          <ScreenWrap key="boot">
            <BootScreen />
          </ScreenWrap>
        ) : null}
        {screen === 'mission-select' ? (
          <ScreenWrap key="mission-select">
            <MissionSelect />
          </ScreenWrap>
        ) : null}
        {screen === 'mission-brief' ? (
          <ScreenWrap key="mission-brief">
            <MissionBrief />
          </ScreenWrap>
        ) : null}
        {screen === 'terminal' ? (
          <ScreenWrap key="terminal">
            <TerminalScreen />
          </ScreenWrap>
        ) : null}
        {screen === 'success' ? (
          <ScreenWrap key="success">
            <SuccessScreen />
          </ScreenWrap>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
