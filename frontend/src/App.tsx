import { useCallback, useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ModulesProvider } from './data/useModules'
import { PostAddressProvider, usePostAddresses } from './data/usePostAddresses'
import { SiteCopyProvider, useSiteCopy } from './data/useSiteCopy'
import { ink, layout, paper, sans } from './design/tokens'
import { AuthGate, AuthProvider } from './lib/auth'
import { useIsMobile } from './lib/useIsMobile'
import { AREA_HOME, isPrivate, screenAllowed } from './lib/area'
import { useRoute } from './lib/useRoute'
import { adoptWords } from './lib/routeWords'
import type { CmsTab, Where } from './lib/routes'
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
import { Cms } from './screens/Cms'
import { DesignSystem } from './screens/DesignSystem'
import { Hours } from './screens/Hours'
import { IndexScreen } from './screens/IndexScreen'
import { Landing } from './screens/Landing'
import { Logic } from './screens/Logic'
import { ModuleScreen } from './screens/ModuleScreen'
import { Notes } from './screens/Notes'
import { Templates } from './screens/Templates'

const settings: Settings = { density: 'roomy', showPlates: true }

/**
 * The module a page shows when the address does not name one.
 *
 * Only the module screen reads this, and it always arrives with a module in
 * its address; this is what the value is before anyone has been anywhere.
 */
const FIRST_MODULE = 'sensory'

export function App() {
  const [where, go] = useRoute()
  /*
   * Khu vực là điều chính địa chỉ nói, không phải một câu trả lời thứ hai.
   *
   * Trước đây `main.tsx` tự đoán khu vực từ đường dẫn còn `parsePath` đoán màn
   * hình, và hai bên lệch nhau ngay lần đầu có chuyện lạ: một địa chỉ viết bằng
   * bộ từ cũ đọc ra đúng màn Archive trong khu quản trị, nhưng khu vực vẫn là
   * công khai, nên thanh địa chỉ đúng mà trang vẽ ra là trang chủ.
   */
  const area = where.area

  const onWords = useCallback(() => {
    // `useRoute` đọc lại địa chỉ khi nghe `popstate`; địa chỉ không đổi nhưng
    // nghĩa của nó vừa đổi, nên đọc lại đúng bằng đường ấy.
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      <AuthProvider>
        <SiteCopyProvider>
          <RouteWordsSync onAdopt={onWords} />
          <ModulesProvider>
            <PostAddressProvider area={area}>
              <Routed where={where} go={go} />
            </PostAddressProvider>
          </ModulesProvider>
        </SiteCopyProvider>
      </AuthProvider>
    </SettingsContext.Provider>
  )
}

/** Bộ từ viết địa chỉ, lấy từ hàng cài đặt mà trang nào cũng đã tải sẵn. */
function RouteWordsSync({ onAdopt }: { onAdopt: () => void }) {
  const { overrides, loading } = useSiteCopy()
  const routes = overrides.routes

  useEffect(() => {
    if (loading) return
    if (adoptWords(routes)) onAdopt()
  }, [loading, routes, onAdopt])

  return null
}

/**
 * Which screen is open, read from and written to the address bar.
 *
 * Every `go…` below is a step the browser can walk back through, and every
 * screen has an address that can be pasted into a fresh tab. The screen used
 * to be React state alone, so the address bar never moved off `/` — which is
 * why back left the site and a reload dropped the reader at the front door.
 */
function Routed({ where, go }: { where: Where; go: (next: Where) => void }) {
  const area = where.area
  const posts = usePostAddresses()
  const [variant, setVariant] = useState<Variant>('A')

  const at = useCallback((next: Omit<Where, 'area'>) => go({ ...next, area }), [go, area])

  const moduleId = where.moduleId ?? FIRST_MODULE
  // The address carries the post's slug; the screens below work in ids.
  const postId = where.slug ? posts.idOf(where.slug) : null
  const articleFrom: Origin = where.from ?? 'admin'

  const openModule = useCallback((id: string) => at({ screen: 'module', moduleId: id }), [at])

  const openArticle = useCallback(
    (id?: string, from: Origin = 'admin') =>
      at({ screen: 'article', slug: id ? posts.slugOf(id) : undefined, from }),
    [at, posts],
  )

  const editPost = useCallback((id: string) => at({ screen: 'postEdit', slug: posts.slugOf(id) }), [at, posts])
  const previewPost = useCallback((id: string) => at({ screen: 'postPreview', slug: posts.slugOf(id) }), [at, posts])
  const openTemplate = useCallback(
    (id: string | null) => at({ screen: 'templates', templateId: id ?? undefined }),
    [at],
  )

  const nav = useMemo<Nav>(
    () => ({
      screen: where.screen,
      area,
      variant,
      moduleId,
      postId,
      articleFrom,
      templateId: where.templateId ?? null,
      cmsTab: where.tab ?? 'posts',
      goArt: () => at({ screen: 'art' }),
      goLanding: () => at({ screen: 'landing' }),
      goHome: () => at({ screen: 'home' }),
      goArchive: () => at({ screen: 'archive' }),
      goHours: () => at({ screen: 'hours' }),
      goNotes: () => at({ screen: 'notes' }),
      goCms: (tab?: CmsTab) => at({ screen: 'cms', tab }),
      goLogic: () => at({ screen: 'logic' }),
      openModule,
      openArticle,
      newPost: () => at({ screen: 'postNew' }),
      editPost,
      previewPost,
      goTemplates: () => at({ screen: 'templates' }),
      openTemplate,
      toggleVariant: () => {
        at({ screen: 'home' })
        setVariant((v) => (v === 'A' ? 'B' : 'A'))
      },
    }),
    [where, area, variant, moduleId, postId, articleFrom, at, openModule, openArticle, editPost, previewPost, openTemplate],
  )

  // Second line of defence: even if some path sets a screen that doesn't
  // belong here, the area refuses to draw it.
  const shown: Screen = screenAllowed(area, where.screen) ? where.screen : (AREA_HOME[area] as Screen)
  const mobile = useIsMobile()

  const body = (
    /*
     * Trên mobile không có rail bên trái để tránh, mà có thanh dưới để tránh.
     * `paddingBottom` là bắt buộc: thiếu nó thì đoạn cuối mỗi trang chui xuống
     * dưới thanh và không cuộn tới được.
     */
    <div style={mobile ? { marginLeft: 0, paddingBottom: layout.barMobile } : { marginLeft: layout.sidebarClosed }}>
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
      {shown === 'postNew' && <NewPostWizard />}
      {shown === 'postEdit' && postId && <Editor postId={postId} />}
      {shown === 'postPreview' && postId && <Preview postId={postId} />}
      {shown === 'templates' && <Templates />}
    </div>
  )

  return (
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
  )
}
