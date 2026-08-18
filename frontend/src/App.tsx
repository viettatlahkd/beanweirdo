import { useCallback, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { navByKey } from './content/navItems'
import { ModulesProvider } from './data/useModules'
import { SiteCopyProvider } from './data/useSiteCopy'
import { ink, layout, paper, sans } from './design/tokens'
import { AuthGate, AuthProvider } from './lib/auth'
import { AREA_HOME, isPrivate, screenAllowed, type Area } from './lib/area'
import {
  NavContext,
  SettingsContext,
  type Nav,
  type Origin,
  type Screen,
  type Settings,
  type Variant,
} from './lib/nav'
import { Editor } from './admin/screens/Editor'
import { NewPostWizard } from './admin/screens/NewPostWizard'
import { Preview } from './admin/screens/Preview'
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
import { MemoScreen } from './screens/MemoScreen'
import { Notes } from './screens/Notes'
import { Report } from './screens/Report'

const settings: Settings = { density: 'roomy', showPlates: true }

/**
 * Where an area opens.
 *
 * `?screen=<navKey>` deep-links a specific page — that's how the sidebar
 * crosses from one area into another. `?preview=<id>` is the older deep link
 * the editor's "open in new tab" still uses.
 */
function initialState(area: Area): { screen: Screen; postId: string | null } {
  const params = new URLSearchParams(window.location.search)

  const preview = params.get('preview')
  if (preview && area === 'admin') return { screen: 'postPreview', postId: preview }

  const requested = params.get('screen')
  const match = requested ? navByKey(requested) : undefined
  // Only honour a deep link into a screen this area is allowed to draw.
  if (match && screenAllowed(area, match.screen)) return { screen: match.screen, postId: null }

  return { screen: AREA_HOME[area] as Screen, postId: null }
}

export function App({ area }: { area: Area }) {
  const initial = useMemo(() => initialState(area), [area])

  const [screen, setScreen] = useState<Screen>(initial.screen)
  const [variant, setVariant] = useState<Variant>('A')
  const [moduleId, setModuleId] = useState('sensory')
  const [postId, setPostId] = useState<string | null>(initial.postId)
  const [memoId, setMemoId] = useState<string | null>(null)
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

  const editPost = useCallback((id: string) => {
    setPostId(id)
    setScreen('postEdit')
  }, [])

  const openMemo = useCallback((id?: string) => {
    setMemoId(id ?? null)
    setScreen('memo')
  }, [])

  const previewPost = useCallback((id: string) => {
    setPostId(id)
    setScreen('postPreview')
  }, [])

  const nav = useMemo<Nav>(
    () => ({
      screen,
      area,
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
      newPost: () => setScreen('postNew'),
      editPost,
      previewPost,
      openMemo,
      memoId,
      toggleVariant: () => {
        setScreen('home')
        setVariant((v) => (v === 'A' ? 'B' : 'A'))
      },
    }),
    [
      screen,
      area,
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
      editPost,
      previewPost,
      openMemo,
      memoId,
    ],
  )

  // Second line of defence: even if some path sets a screen that doesn't
  // belong here, the area refuses to draw it.
  const shown: Screen = screenAllowed(area, screen) ? screen : (AREA_HOME[area] as Screen)

  const body = (
    <div style={{ marginLeft: layout.sidebarClosed }}>
      {shown === 'hours' && <Hours />}
      {shown === 'notes' && <Notes />}
      {shown === 'art' && <DesignSystem />}
      {shown === 'landing' && <Landing />}
      {shown === 'home' && <IndexScreen />}
      {shown === 'module' && <ModuleScreen />}
      {shown === 'article' && <Article />}
      {shown === 'archive' && <Archive />}
      {shown === 'cms' && <Cms />}
      {shown === 'logic' && <Logic />}
      {shown === 'cards' && <Cards />}
      {shown === 'report' && <Report />}
      {shown === 'postNew' && <NewPostWizard />}
      {shown === 'postEdit' && postId && <Editor postId={postId} />}
      {shown === 'postPreview' && postId && <Preview postId={postId} />}
      {shown === 'memo' && <MemoScreen />}
    </div>
  )

  return (
    <SettingsContext.Provider value={settings}>
      <AuthProvider>
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
                {isPrivate(area) ? (
                  <AuthGate>
                    <Sidebar />
                    {body}
                  </AuthGate>
                ) : (
                  <>
                    <Sidebar />
                    {body}
                  </>
                )}
              </div>
            </NavContext.Provider>
          </ModulesProvider>
        </SiteCopyProvider>
      </AuthProvider>
    </SettingsContext.Provider>
  )
}
