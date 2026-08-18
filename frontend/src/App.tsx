import { useCallback, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ModulesProvider } from './data/useModules'
import { SiteCopyProvider } from './data/useSiteCopy'
import { ink, layout, paper, sans } from './design/tokens'
import {
  NavContext,
  SettingsContext,
  type Nav,
  type Origin,
  type Screen,
  type Settings,
  type Variant,
} from './lib/nav'
import { Archive } from './screens/Archive'
import { Article } from './screens/Article'
import { Cards } from './screens/Cards'
import { Cms } from './screens/Cms'
import { DesignSystem } from './screens/DesignSystem'
import { Hours } from './screens/Hours'
import { IndexScreen } from './screens/IndexScreen'
import { Landing } from './screens/Landing'
import { Logic } from './screens/Logic'
import { ModuleScreen } from './screens/ModuleScreen'
import { Notes } from './screens/Notes'
import { Report } from './screens/Report'

const settings: Settings = { density: 'roomy', showPlates: true }

export function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [variant, setVariant] = useState<Variant>('A')
  const [moduleId, setModuleId] = useState('sensory')
  const [postId, setPostId] = useState<string | null>(null)
  // Which door each template screen was entered through — see `Origin`.
  const [articleFrom, setArticleFrom] = useState<Origin>('admin')
  const [reportFrom, setReportFrom] = useState<Origin>('admin')
  const [cardsFrom, setCardsFrom] = useState<Origin>('admin')

  const openModule = useCallback((id: string) => {
    setModuleId(id)
    setScreen('module')
  }, [])

  const openArticle = useCallback((id?: string, from: Origin = 'admin') => {
    setPostId(id ?? null)
    setArticleFrom(from)
    setScreen('article')
  }, [])

  const goReport = useCallback((from: Origin = 'admin') => {
    setReportFrom(from)
    setScreen('report')
  }, [])

  const goCards = useCallback((from: Origin = 'admin') => {
    setCardsFrom(from)
    setScreen('cards')
  }, [])

  const nav = useMemo<Nav>(
    () => ({
      screen,
      variant,
      moduleId,
      postId,
      articleFrom,
      reportFrom,
      cardsFrom,
      goArt: () => setScreen('art'),
      goLanding: () => setScreen('landing'),
      goHome: () => setScreen('home'),
      goArchive: () => setScreen('archive'),
      goHours: () => setScreen('hours'),
      goNotes: () => setScreen('notes'),
      goCms: () => setScreen('cms'),
      goLogic: () => setScreen('logic'),
      goCards,
      goReport,
      openModule,
      openArticle,
      toggleVariant: () => {
        setScreen('home')
        setVariant((v) => (v === 'A' ? 'B' : 'A'))
      },
    }),
    [
      screen,
      variant,
      moduleId,
      postId,
      articleFrom,
      reportFrom,
      cardsFrom,
      openModule,
      openArticle,
      goCards,
      goReport,
    ],
  )

  return (
    <SettingsContext.Provider value={settings}>
      <SiteCopyProvider>
        <ModulesProvider>
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
                {screen === 'cms' && <Cms />}
                {screen === 'logic' && <Logic />}
                {screen === 'cards' && <Cards />}
                {screen === 'report' && <Report />}
              </div>
            </div>
          </NavContext.Provider>
        </ModulesProvider>
      </SiteCopyProvider>
    </SettingsContext.Provider>
  )
}
