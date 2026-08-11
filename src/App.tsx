import { useCallback, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ink, layout, paper, sans } from './design/tokens'
import {
  NavContext,
  SettingsContext,
  type Nav,
  type Screen,
  type Settings,
  type Variant,
} from './lib/nav'
import { Archive } from './screens/Archive'
import { Article } from './screens/Article'
import { DesignSystem } from './screens/DesignSystem'
import { Hours } from './screens/Hours'
import { IndexScreen } from './screens/IndexScreen'
import { Landing } from './screens/Landing'
import { ModuleScreen } from './screens/ModuleScreen'
import { Notes } from './screens/Notes'

const settings: Settings = { density: 'roomy', showPlates: true }

export function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [variant, setVariant] = useState<Variant>('A')
  const [moduleId, setModuleId] = useState('sensory')

  const openModule = useCallback((id: string) => {
    setModuleId(id)
    setScreen('module')
  }, [])

  const nav = useMemo<Nav>(
    () => ({
      screen,
      variant,
      moduleId,
      goArt: () => setScreen('art'),
      goLanding: () => setScreen('landing'),
      goHome: () => setScreen('home'),
      goArchive: () => setScreen('archive'),
      goHours: () => setScreen('hours'),
      goNotes: () => setScreen('notes'),
      openModule,
      openArticle: () => setScreen('article'),
      toggleVariant: () => {
        setScreen('home')
        setVariant((v) => (v === 'A' ? 'B' : 'A'))
      },
    }),
    [screen, variant, moduleId, openModule],
  )

  return (
    <SettingsContext.Provider value={settings}>
      <NavContext.Provider value={nav}>
        <div
          style={{
            minHeight: '100vh',
            background: paper.cream,
            color: ink.base,
            fontFamily: sans,
            fontWeight: 200,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <Sidebar />
          <div style={{ marginLeft: layout.sidebarClosed }}>
            {screen === 'hours' && <Hours />}
            {screen === 'notes' && <Notes />}
            {screen === 'art' && <DesignSystem />}
            {screen === 'landing' && <Landing />}
            {screen === 'home' && <IndexScreen />}
            {screen === 'module' && <ModuleScreen />}
            {screen === 'article' && <Article />}
            {screen === 'archive' && <Archive />}
          </div>
        </div>
      </NavContext.Provider>
    </SettingsContext.Provider>
  )
}
